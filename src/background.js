/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const KINTO_SERVER = 'https://kinto.dev.mozaws.net/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'a3dbd8c5a6fd93e2';
const FXA_OAUTH_SERVER = 'https://oauth.accounts.firefox.com/v1';
const FXA_PROFILE_SERVER = 'https://profile.accounts.firefox.com/v1';
const FXA_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
const timeouts = {};

// Kinto sync and encryption

const client = new Kinto({remote: KINTO_SERVER, bucket: 'default'});

// Analytics

const analytics = new TestPilotGA({
  tid: TRACKING_ID,
  ds: 'addon',
  an: 'Notes Experiment',
  aid: 'notes@mozilla.com',
  av: browser.runtime.getManifest().version
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
  fxaKeysUtil.launchWebExtensionKeyFlow(FXA_CLIENT_ID, {
    redirectUri: browser.identity.getRedirectURL(),
    scopes: FXA_SCOPES,
  }).then((loginDetails) => {
    const key = loginDetails.keys['https://identity.mozilla.com/apps/notes'];
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
      browser.storage.local.set({credentials}).then(() => {
        chrome.runtime.sendMessage({
          action: 'sync-authenticated',
          credentials,
          profile
        });
      });
    });
  }, (err) => {
    console.error('login failed', err);
    chrome.runtime.sendMessage({
      action: 'authenticated',
      err: err
    });
    throw err;
  });
}
browser.runtime.onMessage.addListener(function(eventData) {
  const credentials = new BrowserStorageCredentials(browser.storage.local);
  switch (eventData.action) {
    case 'authenticate':
      credentials.get()
        .then(result => {
          if (!result) {
            sendMetrics('webext-button-authenticate', eventData.context);
            authenticate();
          } else {
            chrome.runtime.sendMessage({
              action: 'text-syncing'
            });
            loadFromKinto(client, credentials);
          }
        });
      break;
    case 'disconnected':
      sendMetrics('webext-button-disconnect', eventData.context);
      credentials.clear();
      break;
    case 'kinto-load':
      loadFromKinto(client, credentials);
      break;
    case 'kinto-save':
      saveToKinto(client, credentials, eventData.content);
      break;
    case 'metrics-changed':
      sendMetrics('changed', eventData.context);
      break;
    case 'metrics-drag-n-drop':
      sendMetrics('drag-n-drop', eventData.context);
      break;
    case 'metrics-migrated':
      sendMetrics('metrics-migrated', eventData.context);
      break;
    case 'metrics-migrated-before':
      sendMetrics('metrics-migrated-before', eventData.context);
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
