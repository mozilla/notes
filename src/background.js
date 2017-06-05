const KINTO_URL = 'https://kinto.dev.mozaws.net/v1/';
const REDIRECT_URL = browser.identity.getRedirectURL();
const CLIENT_ID = 'c6d74070a481bc10';
const AUTH_PARAMS =
`client_id=${CLIENT_ID}
&state=state
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`;

// TODO: get rid of it at some point because it is not a secret
const CLIENT_SECRET = 'd914ea58d579ec907a1a40b19fb3f3a631461fe00e494521d41c0496f49d288f';

function createKeyPair () {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: 'SHA-256'},
    },
    true, // extractable key
    ['encrypt', 'decrypt']
  ).then(function(keys) {
    let exportPrivateKey;
    return window.crypto.subtle.exportKey('jwk', keys.privateKey)
      .then(function (pk) {
        exportPrivateKey = pk;
        return window.crypto.subtle.exportKey('jwk', keys.publicKey);
      })
      .then(function (exportPublicKey) {
        return {
          keys: keys,
          exportPrivateKey: exportPrivateKey,
          exportPublicKey: exportPublicKey
        };
      });
  });
}

function hexStringToByte(str) {
  if (!str) {
    return new Uint8Array();
  }

  const a = [];
  for (let i = 0, len = str.length; i < len; i+=2) {
    a.push(parseInt(str.substr(i,2),16));
  }

  return new Uint8Array(a);
}

function extractAccessToken(redirectUri) {
  const m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  const params = new URLSearchParams(m[1].split('#')[0]);
  return params.get('code');
}

function getKintoFxAConfig(kinto_url) {
  return fetch(kinto_url + '/fxa-oauth/params')
    .then(function(response) {
      if(response.status === 200) return response.json();
      else throw new Error('Something went wrong on api server!');
    })
    .catch(function(error) {
      console.error(error);
    });
}

function getBearerToken(oauth_url, code) {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  return fetch(new Request(oauth_url + '/token', {
    method: 'POST',
    headers: myHeaders,
    body: JSON.stringify({
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  }))
    .then(function(response) {
      if(response.status === 200) return response.json();
      else throw new Error('Something went wrong on api server!');
    })
    .catch(function(error) {
      console.error(error);
    });
}

function getDerivedKeys(oauth_url, bearerToken) {
  const myHeaders = new Headers();
  myHeaders.append('Authorization', 'Bearer ' + bearerToken.access_token);

  return fetch(new Request(oauth_url + '/keys', {
    method: 'POST',
    headers: myHeaders
  }))
    .then(function(response) {
      if(response.status === 200) return response.json();
      else throw new Error('Something went wrong on api server!');
    })
    .catch(function(error) {
      console.error(error);
    });
}

function handleAuthentication() {
  // chrome.tabs.create({ 'url': authenticateURL }, function () {
  //   chrome.tabs.onUpdated.addListener(tabCallback);
  // });
  let privateKey;
  let bearerToken;
  let oauth_url;
  return createKeyPair()
    .then(function (keyMaterial) {
      privateKey = keyMaterial.exportPrivateKey;
      return JSON.stringify(keyMaterial.exportPublicKey);
    })
    .then(function(publicKey) {
      return getKintoFxAConfig(KINTO_URL)
        .then(function(params) {
          oauth_url = params.oauth_uri;
          const scope = params.scope;
          return browser.identity.launchWebAuthFlow({
            interactive: true,
            url: `${oauth_url}/authorization?` +
              `${AUTH_PARAMS}&scope=${scope}+profile+keys&jwk=${publicKey}`
          });
        });
    }).then(function (redirectURL) {
      const code = extractAccessToken(redirectURL);

      return getBearerToken(oauth_url, code);
    }).then(function (bearer) {
      console.log('bearer', bearer);

      return getDerivedKeys(oauth_url, bearer).then(function (keys) {
        return {
          bearer: bearer,
          keys: keys
        };
      });
    }).then(function (creds) {
      bearerToken = creds.bearer.access_token;
      const keys = creds.keys;
      console.log('keys', keys);

      return window.crypto.subtle.importKey('jwk', privateKey,
        {
          name: 'RSA-OAEP',
          hash: {name: 'SHA-256'},
        },
        false,
        ['decrypt']
      ).then(function (importPk) {
        return window.crypto.subtle.decrypt(
          {
            name: 'RSA-OAEP',
          },
          importPk,
          hexStringToByte(keys.bundle)
        );
      });

    })
    .then(function(decrypted){
      // TODO: ignore this
      const filtered = new Uint8Array(decrypted).filter(function(el, index) {
        return index % 2 === 0;
      });
      const decryptedKeys = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(filtered)));
      console.log('decryptedKeys', decryptedKeys);

      chrome.storage.local.set({bearer: bearerToken, keys: decryptedKeys}, function() {
        chrome.runtime.sendMessage({ action: 'authenticated', bearer: bearerToken, keys: decryptedKeys });
      });

    })
    .catch(function (err) {
      console.error(err);
      throw err;
    });
}

chrome.runtime.onMessage.addListener(function (eventData) {
  switch (eventData.action) {
  case 'authenticate':
    handleAuthentication();
    break;
  }
});
