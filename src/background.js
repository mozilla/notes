const REDIRECT_URL = browser.identity.getRedirectURL();
const CLIENT_ID = '3a7d05df0d8db810';
const SCOPES = ['profile keys'];
const AUTH_URL =
  `https://oauth-oauth-keys-prototype.dev.lcip.org/v1/authorization
?client_id=${CLIENT_ID}
&state=state
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}
&scope=${encodeURIComponent(SCOPES.join(' '))}`;
const TOKEN_URL = `https://oauth-oauth-keys-prototype.dev.lcip.org/v1/token`;
const KEYS_URL = `https://oauth-oauth-keys-prototype.dev.lcip.org/v1/keys`;

// TODO: move to server
const CLIENT_SECRET = 'aaf992e3ccf3a8932c8c1aa4e7cce475a6059c73656cda0c9d91873d19a84f31';

function createKeyPair () {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: "SHA-256"},
    },
    true, // extractable key
    ["encrypt", "decrypt"]
  ).then(function(keys) {
    let exportPrivateKey;
    return window.crypto.subtle.exportKey("jwk", keys.privateKey)
      .then(function (pk) {
        exportPrivateKey = pk;
        return window.crypto.subtle.exportKey("jwk", keys.publicKey);
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

  var a = [];
  for (var i = 0, len = str.length; i < len; i+=2) {
    a.push(parseInt(str.substr(i,2),16));
  }

  return new Uint8Array(a);
}

function extractAccessToken(redirectUri) {
  let m = redirectUri.match(/[#\?](.*)/);
  if (!m || m.length < 1)
    return null;
  let params = new URLSearchParams(m[1].split('#')[0]);
  return params.get('code');
}

function getBearerToken(code) {
  var myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  return fetch(new Request(TOKEN_URL, {
    method: 'POST',
    headers: myHeaders,
    body: JSON.stringify({
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  }))
    .then(function(response) {
      if(response.status == 200) return response.json();
      else throw new Error('Something went wrong on api server!');
    })
    .catch(function(error) {
      console.error(error);
    });
}

function getDerivedKeys(bearerToken) {
  var myHeaders = new Headers();
  myHeaders.append('Authorization', 'Bearer ' + bearerToken.access_token);

  return fetch(new Request(KEYS_URL, {
    method: 'POST',
    headers: myHeaders
  }))
    .then(function(response) {
      if(response.status == 200) return response.json();
      else throw new Error('Something went wrong on api server!');
    })
    .catch(function(error) {
      console.error(error);
    });
}

function handleMaybeInt(maybeString) {
  const maybeInt = parseInt(maybeString, 10);
  if (Number.isNaN(maybeInt)) {
    return null;
  }
  return maybeInt;
}

function handleAuthentication() {
  // chrome.tabs.create({ 'url': authenticateURL }, function () {
  //   chrome.tabs.onUpdated.addListener(tabCallback);
  // });
  let privateKey;
  let bearerToken;
  return createKeyPair()
    .then(function (keyMaterial) {
      const publicKey = JSON.stringify(keyMaterial.exportPublicKey);
      privateKey = keyMaterial.exportPrivateKey;
      return browser.identity.launchWebAuthFlow({
        interactive: true,
        url: `${AUTH_URL}&jwk=${publicKey}`
      });
    }).then(function (redirectURL) {
      const code = extractAccessToken(redirectURL);

      return getBearerToken(code);
    }).then(function (bearer) {
      console.log('bearer', bearer);

      return getDerivedKeys(bearer).then(function (keys) {
        return {
          bearer: bearer,
          keys: keys
        };
      });
    }).then(function (creds) {
      const keys = creds.keys;
      console.log('keys', keys);

      return window.crypto.subtle.importKey("jwk", privateKey,
        {
          name: "RSA-OAEP",
          hash: {name: "SHA-256"},
        },
        false,
        ["decrypt"]
      ).then(function (importPk) {
        return window.crypto.subtle.decrypt(
          {
            name: "RSA-OAEP",
          },
          importPk,
          hexStringToByte(keys.bundle)
        );
      })

    })
    .then(function(decrypted){
      // TODO: ignore this
      const filtered = new Uint8Array(decrypted).filter(function(el, index) {
        return index % 2 === 0;
      });
      const decryptedKeys = JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(filtered)))
      console.log('decryptedKeys', decryptedKeys)

      chrome.storage.local.set({bearer: bearerToken, keys: decryptedKeys}, function() {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          chrome.runtime.sendMessage({ action: 'error', error: chrome.runtime.lastError });
        } else {
          chrome.runtime.sendMessage({ action: 'authenticated', bearer: bearerToken, keys: decryptedKeys });
        }
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
