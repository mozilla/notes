'use strict';
var chai = require('chai');
var sinon = require('sinon');
var chaiAsPromised = require('chai-as-promised');
var fetchMock = require('fetch-mock');

const recordsPath = '/v1/buckets/default/collections/notes/records';
chai.use(chaiAsPromised);

// Many of these are "functional" tests that are run using Karma, and
// so "unit" tests from the browser perspective (not including browser interaction).
describe('Authorization', function() {
  this.timeout(8000);
  const staticCredential = {
    key: {
      kid: "20171005",
      kty: "kty",
    },
    access_token: "access_token"
  };

  let sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
    browser.flush();
  });

  it('should define syncKinto', function() {
    chai.expect(syncKinto).not.eql(undefined);
  });

  describe('401s', function() {
    const client = new Kinto();

    let credentials;
    beforeEach(function() {
      fetchMock.mock('*', {
        status: 401,
        body: "outh",
        headers: {"Content-Type": "application/json"},
      });
      credentials = {
        get: sinon.stub().resolves(staticCredential),
        clear: sinon.stub()
      };
    });

    afterEach(fetchMock.restore);

    it('should respond to 401s by deleting the token', function() {
      return syncKinto(client, credentials).then(() => {
        chai.assert(credentials.clear.calledOnce);
      });
    });

    it('should not reject the promise', function() {
      return chai.expect(syncKinto(client, credentials)).fulfilled;
    });
  });

  describe("remote transformer", function() {
    const kid = "20171005";
    const key = {kid: kid, kty: "kty"};
    it("should return whatever decrypt returns", function() {
      const decryptedResult = { content: [{ insert: "Test message" }] };
      const decryptMock = sandbox.stub(global, 'decrypt');
      decryptMock.returns(decryptedResult);
      chai.expect(new JWETransformer(key).decode({content: "encrypted content", kid: kid})).eventually.eql({
        content: [{insert: "Test message"}],
      });
    });

    it("should throw if kid is different", function() {
      chai.expect(new JWETransformer(key).decode({content: "encrypted content", kid: "20171001"})).rejectedWith(ServerKeyOlderError);
    });

    it("should be backwards compatible with the old style of Kinto record", function() {
      const oldRecordStyle = [
        { insert: "Test message" },
      ];
      const decryptMock = sandbox.stub(global, 'decrypt');
      decryptMock.returns(oldRecordStyle);
      chai.expect(new JWETransformer(key).decode({content: "encrypted content", kid: kid})).eventually.eql({
        content: [{insert: "Test message"}],
      });
    });
  });

  describe('syncKinto', function() {
    let client, collection, credentials, decryptMock, encryptMock;

    // Install an "encrypted record" to be found when the client
    // requests new records.
    //
    // This record will only be served once; if you need it more than
    // once, call it twice.
    function installEncryptedRecord() {
      fetchMock.once(new RegExp(recordsPath + '\\?_sort=-last_modified$'), {
        body: {
          data: [{
            id: "singleNote",
            content: "encrypted content",
            kid: staticCredential.key.kid,
            last_modified: 1234,
          }]
        },
        headers: {Etag: '"1234"'},
      });
    }

    beforeEach(() => {
      fetchMock.mock('end:/v1/', {
        settings: {
          batch_max_requests: 25,
          readonly: false
        }
      });

      installEncryptedRecord();

      decryptMock = sandbox.stub(global, 'decrypt');
      decryptMock.withArgs(staticCredential.key, "encrypted content").resolves({
        id: "singleNote",
        content: {ops: [{insert: "Hi there"}]},
      });

      // sync() tries to gather local changes, even when a conflict
      // has already been detected.
      encryptMock = sandbox.stub(global, 'encrypt');
      encryptMock.resolves("encrypted local");

      credentials = {
        get: sinon.stub().resolves(staticCredential),
        clear: sinon.stub()
      };

      client = new Kinto({remote: 'https://example.com/v1', bucket: 'default'});
      collection = client.collection('notes', {
        idSchema: notesIdSchema
      });
    });

    afterEach(() => {
      fetchMock.restore();
      return collection.clear();
    });

    it('should handle a conflict', () => {
      // We don't try to cover every single scenario where a conflict
      // is possible, since kinto.js already has a set of tests for
      // that. Instead, we just cover the easiest possible scenario
      // that generates a conflict (pulling the same record ID from
      // the server) and assume that kinto.js will treat other
      // conflicts comparably.

      // After resolving the conflict, it will try to retrieve new
      // changes
      installEncryptedRecord();
      // Then it will try to push changes
      fetchMock.post(new RegExp('/v1/batch$'), {
        responses: [{
          status: 201,
          body: {
            data: {
              id: "singleNote",
              content: "encrypted resolution",
              kid: staticCredential.key.kid,
              last_modified: 1238
            }
          }
        }]
      });
      // Then it will try to pull changes that happened while it was
      // pushing -- see e.g. https://github.com/Kinto/kinto.js/issues/555
      fetchMock.mock(new RegExp(recordsPath + '\\?exclude_id=singleNote&_sort=-last_modified&_since=1234$'), {
        data: []
      });
      decryptMock.withArgs(staticCredential.key, "encrypted resolution").resolves({
        id: "singleNote",
        content: {ops: [{insert: "Resolution"}]},
      });

      return collection.upsert({id: "singleNote", content: {ops: [{insert: "Local"}]}})
        .then(() => syncKinto(client, credentials))
        .then(() => collection.getAny('singleNote'))
        .then(result => {
          chai.expect(result.data.content).eql(
            {ops: [
              {insert: "Resolution"}
            ]});
          const expectedContent = {
            ops: [
              {insert: "Hi there"},
              {insert: "\n====== On this computer: ======\n\n"},
              {insert: "Local"},
            ]};
          const expectedResolution = {
            id: "singleNote",
            content: expectedContent,
            last_modified: 1234,
            _status: "updated"
          };
          chai.assert(encryptMock.calledWith(staticCredential.key, expectedResolution),
                      "Never encrypted expected resolution");
        });
    });


    it('should handle old keys correctly', () => {
      // Setup record with older kid that will be fetched after the
      // first successful sync.
      fetchMock.mock(new RegExp(recordsPath + '\\?_sort=-last_modified&_since=1234$'), {
        data: [{
          id: "singleNote",
          content: "encrypted content",
          kid: "20171001",
          last_modified: 1236,
        }],
      });

      // Once we've wiped the server, we'll try to refetch from zero.
      fetchMock.mock(new RegExp(recordsPath + '\\?_sort=-last_modified$'), {
        body: {
          data: []
        },
      });
      // We'll also push what we have.
      fetchMock.post(new RegExp('/v1/batch$'), {
        responses: [{
          status: 201,
          body: {
            data: {
              id: 'singleNote',
              content: "encrypted content",
              kid: staticCredential.key.kid,
              last_modified: 1239,
            }
          }
        }]
      });
      // And again, try to fetch stuff apart from what we just pushed.
      fetchMock.mock(new RegExp(recordsPath + '\\?exclude_id=singleNote&_sort=-last_modified$'), {
        body: {
          data: []
        },
      });

      let deleted = false;
      fetchMock.delete(new RegExp('/v1/buckets/default/collections/notes$'), () => {
        deleted = true;
        return {};
      });

      const defaultBucket = {
        deleteCollection: sandbox.spy()
      };

      // Get the "Hi there" note from the server
      return syncKinto(client, credentials)
        .then(() => collection.getAny('singleNote'))
        .then(result => {
          chai.expect(result.data._status).eql("synced");
          chai.expect(result.data.content).eql({
            ops: [
              {insert: "Hi there"}
            ]});

          // This sync will try to retrieve the record after 1234,
          // which has an older kid.
          return syncKinto(client, credentials);
        })
        .then(() => {
          // Verify that the notes collection was deleted.
          console.log(JSON.stringify(fetchMock.calls()));
          chai.assert(deleted);
          return collection.getAny('singleNote');
        }).then(result => {
          // Record now needs to be synced again.
          chai.expect(result.data._status).eql("synced");
        });
    });
  });

  describe('loadKinto', function() {
    let collection, client;
    beforeEach(() => {
      collection = {
        getAny: sandbox.stub(),
      };
      client = {
        collection: sandbox.stub().returns(collection)
      };
    });

    it('should fire a kinto-loaded message even if nothing in kinto', () => {
      const syncKinto = sandbox.stub(global, 'syncKinto').resolves(undefined);
      collection.getAny.resolves(undefined);
      return loadFromKinto(client, undefined)
        .then(() => {
          chai.assert(browser.runtime.sendMessage.calledOnce);
          chai.expect(browser.runtime.sendMessage.getCall(0).args[0]).eql({
            action: 'kinto-loaded',
            data: null,
            last_modified: null,
          });
        });
    });

    it('should not fail if syncKinto rejects', () => {
      const syncKinto = sandbox.stub(global, 'syncKinto').rejects('server busy playing Minesweeper');
      collection.getAny.resolves({data: {last_modified: 'abc', content: 'def'}});
      return loadFromKinto(client, undefined)
        .then(() => {
          chai.assert(browser.runtime.sendMessage.calledOnce);
          chai.expect(browser.runtime.sendMessage.getCall(0).args[0]).eql({
            action: 'kinto-loaded',
            data: 'def',
            last_modified: 'abc',
          });
        });
    });
  });

  describe('saveToKinto', function() {
    let collection, client;
    beforeEach(() => {
      collection = {
        upsert: sandbox.stub().resolves(undefined),
        getAny: sandbox.stub(),
      };
      client = {
        collection: sandbox.stub().returns(collection)
      };
    });

    it('should not fail if syncKinto rejects', () => {
      const syncKinto = sandbox.stub(global, 'syncKinto').rejects('server busy playing Minesweeper');
      collection.getAny.resolves({data: {last_modified: 'abc', content: 'def'}});
      return saveToKinto(client, undefined, 'imaginary content')
        .then(() => {
          chai.assert(browser.runtime.sendMessage.calledThrice);
          chai.expect(browser.runtime.sendMessage.getCall(0).args[0]).eql('notes@mozilla.com');
          chai.expect(browser.runtime.sendMessage.getCall(0).args[1]).eql({
            action: 'text-editing',
          });
          chai.expect(browser.runtime.sendMessage.getCall(1).args[0]).eql('notes@mozilla.com');
          chai.expect(browser.runtime.sendMessage.getCall(1).args[1]).eql({
            action: 'text-saved',
          });
          chai.expect(browser.runtime.sendMessage.getCall(2).args[0]).eql('notes@mozilla.com');
          chai.expect(browser.runtime.sendMessage.getCall(2).args[1]).eql({
            action: 'text-synced',
            last_modified: 'abc',
          });
        });
    });
  });
});
