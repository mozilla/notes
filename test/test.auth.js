describe('Authorization', function() {
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
      return syncKinto(client, credentials).then(
        () => {},
        msg => chai.assert(false, msg.toString())
      );
    });
  });
});
