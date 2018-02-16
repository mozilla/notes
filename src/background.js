/**
 * Google Analytics / TestPilot Metrics
 */

const TRACKING_ID = 'UA-35433268-79';

const KINTO_SERVER = 'https://testpilot.settings.services.mozilla.com/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'a3dbd8c5a6fd93e2';
const FXA_OAUTH_SERVER = 'https://oauth.accounts.firefox.com/v1';
const FXA_PROFILE_SERVER = 'https://profile.accounts.firefox.com/v1';
const FXA_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
const timeouts = {};
let closeUI = null;
let isEditorReady = false;

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

    let metrics = {};

    if (event === 'open') {
      metrics.cd9 = context.loaded !== false;
    } else if (event === 'close') {
      metrics.cd7 = context.closeUI;
      metrics.cd8 = null; // reason editing session ended
    } else if (event === 'changed' || event === 'drag-n-drop') { // Editing
      metrics = {
        cm1: context.characters,
        cm2: context.lineBreaks,
        cm3: null,  // Size of the change
        cd1: context.syncEnabled,
        cd2: context.usesSize,
        cd3: context.usesBold,
        cd4: context.usesItalics,
        cd5: context.usesStrikethrough,
        cd6: context.usesList,
      };
    }

    return analytics.sendEvent('notes', event, metrics);
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
    sendMetrics('login-success');
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
    console.error('FxA login failed', err); // eslint-disable-line no-console
    chrome.runtime.sendMessage({
      action: 'reconnect'
    });
    sendMetrics('login-failed');
  });
}

browser.runtime.onMessage.addListener(function(eventData) {
  const credentials = new BrowserStorageCredentials(browser.storage.local);

  switch (eventData.action) {
    case 'authenticate':
      credentials.get()
        .then(result => {
          if (!result) {
            sendMetrics('webext-button-authenticate');
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
      disconnectFromKinto(client).then(() => {
        sendMetrics('webext-button-disconnect', eventData.context);
        credentials.clear();
        chrome.runtime.sendMessage({
          action: 'disconnected'
        });
      });
      break;
    case 'kinto-load':
      retrieveNote(client).then((result) => {
        browser.runtime.sendMessage({
          action: 'kinto-loaded',
          data: result && typeof result.data !== 'undefined' ? result.data.content : null,
          last_modified: result && typeof result.data !== 'undefined' && typeof result.data.last_modified !== 'undefined' ? result.data.last_modified : null,
        });
      }).catch(() => {
        sendMetrics('open', {loaded: false});
      });
      break;
    case 'kinto-sync':
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
      sendMetrics('metrics-migrated-before');
      break;
    case 'metrics-reconnect-sync':
      sendMetrics('reconnect-sync', eventData.context);
      break;
    case 'metrics-limit-reached':
      sendMetrics('limit-reached', eventData.context);
      break;
    case 'metrics-context-menu':
      sendMetrics('context-menu', eventData.context);
      break;
    case 'editor-ready':
      isEditorReady = true;
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
  sendMetrics('open', {loaded: true});
  closeUI = 'closeButton';

  p.onDisconnect.addListener(() => {
    // sidebar closed, therefore editor is not ready to receive any content
    isEditorReady = false;
    sendMetrics('close', {'closeUI': closeUI});
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

// Handle onClick event for the toolbar button
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.open();
});

// context menu for 'Send to Notes'
browser.contextMenus.create({
  id: 'send-to-notes',
  title: browser.i18n.getMessage('sendToNotes'),
  contexts: ['selection']
});

browser.contextMenus.onClicked.addListener((info) => {
  // open sidebar which will trigger `isEditorReady`...
  browser.sidebarAction.open();
  // then send selection text to Editor.js once editor instance is initialized and ready
  sendSelectionText(info.selectionText);
});

function sendSelectionText(text) {
  // if editor ready, go ahead and send selected text to be pasted in Notes,
  // otherwise wait half a second before trying again
  if (isEditorReady) {
    chrome.runtime.sendMessage({
      action: 'send-to-notes',
      text: text
    });
  } else {
    setTimeout(() => {
      sendSelectionText(text);
    }, 500);
  }
}
