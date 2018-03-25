//const KINTO_SERVER = 'https://testpilot.settings.services.mozilla.com/v1/buckets/default/collections/notes';
//const KINTO_SERVER = 'http://192.168.1.41:8888/v1/buckets/default/collections/notes';
const KINTO_SERVER = 'http://kinto-notes5.lcip.org/v1/buckets/default/collections/notes';

const fxaCryptoRelier = require('./fxa-crypto-relier');
// TODO WARNING: `jose` is not in the official release in the crypto-relier
const jose = fxaCryptoRelier.OAuthUtils.__util.jose;

function fetchRecords(token) { // eslint-disable-line no-unused-vars
  const headers = new Headers({
    'Authorization': `Bearer ${token}`
  });
  const request = new Request(`${KINTO_SERVER}/records?_sort=-last_modified`, {
    method: 'GET',
    headers
  });

  return fetch(request).then((resp) => {
    console.log('resp', resp);
    if (resp.status === 200) {
      return resp.json();
    }
    throw new Error('Failed to fetch kinto notes');
  });
}

function decrypt(key, content) {
  const jwkKey = {
    kty: key.kty,
    k: key.k,
    kid: key.kid
  };

  return jose.JWK.asKey(jwkKey).then((k) => {
    console.log('key', k.keystore);

    return jose.JWE.createDecrypt(k.keystore)
      .decrypt(content)
      .then(function(result) {
        console.log('much notes', result.payload.toString());
        return JSON.parse(result.payload.toString());
      });
  });
}

function decryptRecords(records, key) {
  const notesKey = key['https://identity.mozilla.com/apps/notes'];

  const promises = [];
  records.data.forEach((record) => {
    promises.push(decrypt(notesKey, record.content));
  });

  return Promise.all(promises);
}

module.exports = {
  fetchRecords: fetchRecords,
  decryptRecords: decryptRecords,
};