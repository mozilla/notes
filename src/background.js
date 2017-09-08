/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const KINTO_SERVER = 'https://kinto.dev.mozaws.net/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'c6d74070a481bc10';
const FXA_OAUTH_SERVER = 'https://oauth-scoped-keys.dev.lcip.org/v1';

const timeouts = {};


// Kinto sync and encryption

const client = new KintoClient(KINTO_SERVER);

const cryptographer = new Jose.WebCryptographer();
cryptographer.setKeyEncryptionAlgorithm('A256KW');
cryptographer.setContentEncryptionAlgorithm('A256GCM');

function shared_key(key) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, k: key.k.replace(/=/, '') },
    'AES-KW',
    true,
    ['wrapKey', 'unwrapKey']
  );
}

function encrypt(key, content) {
  const encrypter = new JoseJWE.Encrypter(cryptographer, shared_key(key));
  return encrypter.encrypt(JSON.stringify(content));
}

function decrypt(key, encrypted) {
  const decrypter = new JoseJWE.Decrypter(cryptographer, shared_key(key));
  return decrypter.decrypt(encrypted).then(result => {
    return JSON.parse(result);
  });
}

// Analytics

const analytics = new TestPilotGA({
  tid: TRACKING_ID,
  ds: 'addon',
  an: 'Notes Experiment',
  aid: 'notes@mozilla.com',
  av: '1.8.0dev'  // XXX: Change version on release
});

function sendMetrics(event, context = {}) {
  // This function debounce sending metrics.
  const later = function() {
    timeouts[event] = null;

    return analytics.sendEvent('notes', event, {
      cm1: context.characters,
      cm2: context.lineBreaks,
      cm3: null,  // Size of the change
      cd1: context.syncEnabled,
      cd2: context.usesSize,
      cd3: context.usesBold,
      cd4: context.usesItalics,
      cd5: context.usesStrikethrough,
      cd6: context.usesList,
      cd7: null, // Firefox UI used to open, close notepad
      cd8: null, // reason editing session ended
    });
  };
  clearTimeout(timeouts[event]);
  timeouts[event] = setTimeout(later, 20000);
}

function authenticate() {
  const fxaKeysUtil = new fxaCryptoRelier.OAuthUtils();
    chrome.runtime.sendMessage({
      action: 'sync-opening'
    });
  fxaKeysUtil.launchFxaScopedKeyFlow({
    client_id: FXA_CLIENT_ID,
    oauth_uri: FXA_OAUTH_SERVER,
    pkce: true,
    redirect_uri: browser.identity.getRedirectURL(),
    scopes: ['profile', 'https://identity.mozilla.org/apps/notes'],
  }).then((loginDetails) => {
    console.log('access token + keys', loginDetails);
    const credentials = {
      access_token: loginDetails.access_token,
      refresh_token: loginDetails.refresh_token,
      key: loginDetails.keys['https://identity.mozilla.org/apps/notes']
    };
    browser.storage.local.set({credentials}).then(() => {
      chrome.runtime.sendMessage({
        action: 'sync-authenticated',
        credentials
      });
    });
  }, (err) => {
    console.log('login failed', err);
    chrome.runtime.sendMessage({
      action: 'authenticated',
      err: err
    });
    throw err;
  });
}

let lastRemoteLoad = -1;

function loadFromKinto() {
  // Get credentials and lastmodified
  browser.storage.local.get(['credentials', 'contentWasSynced']).then((data) => {
    // XXX: Ask for an refresh token
    // Query Kinto with the Bearer Token
    if (! data.hasOwnProperty('credentials')) return;

    client
      .bucket('default')
      .collection('notes')
      .getRecord("singleNote", {
        headers: { Authorization: `Bearer ${data.credentials.access_token}` }
      })
      .then(result => {
        lastRemoteLoad = Date.now();
        console.log(data, result);
        // If there is something in Kinto send unencrypted content to the sidebar
        return decrypt(data.credentials.key, result["data"]['content'])
          .then(content => {
            browser.runtime.sendMessage({
              action: 'kinto-loaded',
              data: content,
              contentWasSynced: data.contentWasSynced,
            });
          })
          .catch(err => {
            // In case we cannot decrypt the message
            if (data.credentials.key.kid < result.data.kid) {
              // If the key date is greater than current one, log the user out.
              return browser.storage.local.remove("credentials");
            } else {
              // If the key date is older than the current one, we can't help
              // because there is no way we get the previous key.
              // Flush the server ALA sync
              return client
                .bucket('default')
                .collection('notes')
                .deleteRecord("singleNote", {
                  headers: { Authorization: `Bearer ${data.credentials.access_token}` }
                });
            }
          });
      })
      .catch(error => {
        if (/HTTP 404/.test(error.message)) {
          // If there is nothing in Kinto send null to the sidebar
          console.log("First time syncing");
          browser.runtime.sendMessage({
            action: 'kinto-loaded',
            data: null
          });
        } else if (/HTTP 401/.test(error.message)) {
          // In case of 401 log the user out.
          return browser.storage.local.remove("credentials");
        } else {
          console.error(error);
        }
      });
  });
}

function saveToKinto(content) {
  // XXX: Debounce the call and set the status to Editing
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    timeouts['saveToKinto'] = null;

    browser.storage.local.get(['credentials', 'notes', 'contentWasSynced'])
      .then(data => {
        if (!data.contentWasSynced && data.hasOwnProperty('credentials')) {
          console.log("New content");
          return encrypt(data.credentials.key, data.notes)
            .then(encrypted => {
              console.log('Encrypted content:', encrypted);
              return client
                .bucket('default')
                .collection('notes')
                .updateRecord(
                  { id: "singleNote", content: encrypted, kid: data.credentials.key.kid },
                  { headers: { Authorization: `Bearer ${data.credentials.access_token}` } }
                );
            })
            .then(() => {
              console.log("Content was synced: true");
              return browser.storage.local.set({ contentWasSynced: true })
                .then(() => {
                  browser.runtime.sendMessage('notes@mozilla.com', {
                    action: 'text-synced'
                  });
                });
            })
            .catch(error => {
              if (/HTTP 401/.test(error.message)) {
                // In case of 401 log the user out.
                return   browser.storage.local.remove(['credentials']).then(() => {
                  return browser.storage.local.set({ contentWasSynced: false });
                });
              } else {
                console.error(error);
              }
            });
        } else {
          browser.runtime.sendMessage('notes@mozilla.com', {
            action: 'text-saved'
          });
        }
      });
  };

  clearTimeout(timeouts["saveToKinto"]);
  timeouts["saveToKinto"] = setTimeout(later, 1000);
  // XXX: Set the status to syncing
  // XXX: Try to save the new content with the previous last_modified value
  // XXX: If it succeed set the status to Synced...
  // XXX: If it failed loadFromKinto and handle merge
}

browser.runtime.onMessage.addListener(function(eventData) {
  switch (eventData.action) {
    case 'authenticate':
      sendMetrics('webext-button-authenticate', eventData.context);
      authenticate();
      break;
    case 'disconnected':
      sendMetrics('webext-button-disconnect', eventData.context);
      browser.storage.local.remove(['credentials']);
      break;
    case 'kinto-load':
      loadFromKinto();
      break;
    case 'kinto-save':
      saveToKinto(eventData.content);
      break;
    case 'metrics-changed':
      sendMetrics('changed', eventData.context);
      break;
    case 'metrics-drag-n-drop':
      sendMetrics('drag-n-drop', eventData.context);
      break;
    case 'theme-changed':
      sendMetrics('theme-changed', eventData.content);
      browser.runtime.sendMessage({
        action: 'theme-changed'
      });
      break;
  }
});


// Handle opening and closing the add-on.
function connected(p) {
  sendMetrics('open');

  p.onDisconnect.addListener(() => {
    sendMetrics('close');
  });
}
browser.runtime.onConnect.addListener(connected);


const defaultTheme = {
  theme: 'default'
};

browser.storage.local.get()
  .then((storedSettings) => {
    // if no theme setting exists...
    if (!storedSettings.theme)
      // set defaultTheme as initial theme in local storage
      browser.storage.local.set(defaultTheme);
});
