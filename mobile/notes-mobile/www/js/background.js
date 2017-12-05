/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const KINTO_SERVER = 'https://kinto.dev.mozaws.net/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'c6d74070a481bc10';
const FXA_OAUTH_SERVER = 'https://oauth-latest-keys.dev.lcip.org/v1';
const FXA_PROFILE_SERVER = 'https://latest-keys.dev.lcip.org/profile/v1';
const FXA_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
const timeouts = {};

// Kinto sync and encryption

const client = new Kinto({remote: KINTO_SERVER, bucket: 'default'});

function authenticate() {
  const fxaKeysUtil = new fxaCryptoRelier.OAuthUtils({
    oauthServer: FXA_OAUTH_SERVER
  });
  // chrome.runtime.sendMessage({
  //   action: 'sync-opening'
  // });
  const browserApiCordova = {
    identity: {
      launchWebAuthFlow: function (options) {
        return new Promise(function (resolve) {
          const authWindow = window.open(options.url, '_blank', 'location=no,toolbar=no');
          authWindow.addEventListener('loadstart', function (e) {
            const url = e.url;
            const code = /code=(.+)$/.exec(url);
            const error = /error=(.+)$/.exec(url);

            if (code || error) {
              authWindow.close();
              resolve(url);
            }
          });
        });
      }
    }
  };

  fxaKeysUtil.launchWebExtensionKeyFlow(FXA_CLIENT_ID, {
    browserApi: browserApiCordova,
    redirectUri: 'https://dee85c67bd72f3de1f0a0fb62a8fe9b9b1a166d7.extensions.allizom.org',
    scopes: FXA_SCOPES,
  }).then((loginDetails) => {
    const key = loginDetails.keys['https://identity.mozilla.com/apps/notes'];
    alert(JSON.stringify(key))
    alert(JSON.stringify(loginDetails))
    const credentials = {
      access_token: loginDetails.access_token,
      refresh_token: loginDetails.refresh_token,
      key,
      metadata: {
        server: FXA_OAUTH_SERVER,
        client_id: FXA_CLIENT_ID,
        scope: FXA_SCOPES
      }
    };
    console.log('Login succeeded', credentials);

    fxaFetchProfile(FXA_PROFILE_SERVER, credentials.access_token).then((profile) => {
      console.log(profile);
      alert(JSON.stringify(profile));
      loadFromKinto(client, credentials);
      // browser.storage.local.set({credentials}).then(() => {
      //   chrome.runtime.sendMessage({
      //     action: 'sync-authenticated',
      //     credentials,
      //     profile
      //   });
      // });
    });
  }, (err) => {
    alert(JSON.stringify(err))
    console.error('login failed', err);
    // chrome.runtime.sendMessage({
    //   action: 'authenticated',
    //   err: err
    // });
    throw err;
  });
}
// browser.runtime.onMessage.addListener(function(eventData) {
//   const credentials = new BrowserStorageCredentials(browser.storage.local);
//   switch (eventData.action) {
//     case 'authenticate':
//       credentials.get()
//         .then(result => {
//           if (!result) {
//             sendMetrics('webext-button-authenticate', eventData.context);
//             authenticate();
//           } else {
//             chrome.runtime.sendMessage({
//               action: 'text-syncing'
//             });
//             loadFromKinto(client, credentials);
//           }
//         });
//       break;
//     case 'disconnected':
//       sendMetrics('webext-button-disconnect', eventData.context);
//       credentials.clear();
//       break;
//     case 'kinto-load':
//       loadFromKinto(client, credentials);
//       break;
//     case 'kinto-save':
//       saveToKinto(client, credentials, eventData.content);
//       break;
//     case 'metrics-changed':
//       sendMetrics('changed', eventData.context);
//       break;
//     case 'metrics-drag-n-drop':
//       sendMetrics('drag-n-drop', eventData.context);
//       break;
//     case 'metrics-migrated':
//       sendMetrics('metrics-migrated', eventData.context);
//       break;
//     case 'metrics-migrated-before':
//       sendMetrics('metrics-migrated-before', eventData.context);
//       break;
//     case 'theme-changed':
//       sendMetrics('theme-changed', eventData.content);
//       browser.runtime.sendMessage({
//         action: 'theme-changed'
//       });
//       break;
//   }
// });


// Handle opening and closing the add-on.
function connected(p) {
  sendMetrics('open');

  p.onDisconnect.addListener(() => {
    sendMetrics('close');
  });
}
// browser.runtime.onConnect.addListener(connected);


const defaultTheme = {
  theme: 'default'
};
//
// browser.storage.local.get()
//   .then((storedSettings) => {
//     // if no theme setting exists...
//     if (!storedSettings.theme)
//     // set defaultTheme as initial theme in local storage
//       browser.storage.local.set(defaultTheme);
//   });
//
