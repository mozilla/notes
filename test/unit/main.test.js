'use strict';
var chai = require('chai');
var sinon = require('sinon');
var chaiAsPromised = require('chai-as-promised');
var fetchMock = require('fetch-mock');

chai.use(chaiAsPromised);

// Many of these are "functional" tests that are run using Karma, and
// so "unit" tests from the browser perspective (not including browser interaction).
describe('Authorization', function() {
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
    const promiseCredential = Promise.resolve({
      key: {
        kid: 20171005,
        kty: "kty",
      },
      access_token: "access_token"
    });
    const client = new Kinto();

    let credentials;
    beforeEach(function() {
      fetchMock.mock('*', {
        status: 401,
        body: "outh",
        headers: {"Content-Type": "application/json"},
      });
      credentials = {
        get: sinon.mock().returns(promiseCredential),
        clear: sinon.mock()
      };
    });

    afterEach(function() {
      fetchMock.reset();
    });

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
    const kid = 20171005;
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
      chai.expect(new JWETransformer(key).decode({content: "encrypted content", kid: 20171001})).rejectedWith(ServerKeyOlderError);
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
});
