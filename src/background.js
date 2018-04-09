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
let editorConnectedDeferred;
let isEditorConnected = new Promise(resolve => { editorConnectedDeferred = {resolve}; });

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

// This object is updated onMessage 'redux', sended by sidebar store.js on every change.
// We need to keep it to generate `cd10`
let reduxState = {};

function sendMetrics(event, context = {}, state = reduxState) {

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
    } else if (event === 'export') {
      metrics.el = 'html';
    } else if (event === 'new-note') {
      metrics.el = context.origin;
    } else if (event === 'delete-note') {
      metrics.el = context.origin;
    }

    // Generate cd10 based on footer.js rules
    if (state.sync && ['open', 'close', 'changed', 'drag-n-drop', 'new-note', 'export',
        'delete-note', 'give-feedback', 'limit-reached'].includes(event)) {
      if (state.sync.email) { // If user is authenticated
        if (state.sync.error) {
          metrics.cd10 = 'error';
        } else if (state.sync.isSyncing) {
          metrics.cd10 = 'isSyncing';
        } else {
          metrics.cd10 = 'synced';
        }
      } else {
        if (state.sync.isOpeningLogin) { // eslint-disable-line no-lonely-if
          metrics.cd10 = 'openLogin';
        } else if (state.sync.isPleaseLogin) {
          metrics.cd10 = 'verifyAccount';
        } else if (state.sync.isReconnectSync) {
          metrics.cd10 = 'reconnectSync';
        } else {
          metrics.cd10 = 'signIn';
        }
      }
    }

    if (state.notes) {
      metrics.cd11 = state.notes.length;
    }

    return analytics.sendEvent('notes', event, metrics);
  };
  clearTimeout(timeouts[event]);
  timeouts[event] = setTimeout(later, 20000);
}

function fetchProfile(credentials) {
  return fxaFetchProfile(FXA_PROFILE_SERVER, credentials.access_token).then((profile) => {
    browser.storage.local.set({credentials}).then(() => {
      chrome.runtime.sendMessage({
        action: 'sync-authenticated',
        credentials,
        profile
      });
    });
  });
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

    fetchProfile(credentials);

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
          notes: result.notes
        });
      }).catch((e) => {
        sendMetrics('open', {loaded: false});
      });
      break;
    case 'kinto-sync':
      loadFromKinto(client, credentials);
      break;
    case 'metrics-changed':
      sendMetrics('changed', eventData.context);
      break;
    case 'metrics-drag-n-drop':
      sendMetrics('drag-n-drop', eventData.context);
      break;
    case 'metrics-reconnect-sync':
      sendMetrics('reconnect-sync', eventData.context);
      break;
    case 'metrics-limit-reached':
      sendMetrics('limit-reached', eventData.context);
      break;
    case 'metrics-export':
      sendMetrics('export');
      break;
    case 'metrics-give-feedback':
      sendMetrics('give-feedback');
      break;
    case 'editor-ready':
      isEditorReady = true;
      break;
    case 'create-note':
      sendMetrics('new-note', { origin: eventData.origin });
      // We create a note, and send id with note-created nessage
      createNote(client, {
        id: eventData.id,
        content: eventData.content,
        lastModified: eventData.lastModified
      }).then((result) => {
        browser.runtime.sendMessage({
          action: 'create-note',
          id: result.data.id,
          content: result.data.content,
          lastModified: result.data.lastModified
        });
      });
      break;
    case 'update-note':
      saveToKinto(client, credentials, eventData.note, eventData.from);
      break;
    case 'delete-note':
      sendMetrics('delete-note', { origin: eventData.origin });
      // We create a note, and send id with note-created nessage
      deleteNote(client, eventData.id).then(() => {
        // loadFromKinto(client, credentials);
        browser.runtime.sendMessage({
          action: 'delete-note',
          id: eventData.id
        });
      });
      break;
    case 'theme-changed':
      sendMetrics('theme-changed', eventData.content);
      browser.runtime.sendMessage({
        action: 'theme-changed'
      });
      break;
    case 'redux':
      reduxState = eventData.state;
      break;
    case 'fetch-email':
      credentials.get().then(received => {
        fetchProfile(received).catch(e => {
          chrome.runtime.sendMessage({
            action: 'reconnect'
          });
        });
      });
      break;
  }
});

// Handle opening and closing the add-on.
function connected(p) {
  checkIndexedDbHealth().then(() => {},
    (idbError) => {
      console.warn('idbError', idbError); // eslint-disable-line no-console
      sendMetrics('idb-fail');
    }
  );

  sendMetrics('open', {loaded: true});
  closeUI = 'closeButton';
  editorConnectedDeferred.resolve();

  p.onDisconnect.addListener(() => {
    // sidebar closed, therefore editor is not ready to receive any content
    isEditorConnected = new Promise(resolve => { editorConnectedDeferred = {resolve}; });
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
  // open sidebar which will trigger `isEditorReady`...
  if (!isEditorReady) {
    browser.sidebarAction.open();
  }
});

// context menu for 'Send to Notes'
browser.contextMenus.create({
  id: 'send-to-notes',
  title: browser.i18n.getMessage('sendToNotes'),
  contexts: ['selection'],
  // disables context menu item for Notes' `index.html` page
  documentUrlPatterns: ['<all_urls>']
});

browser.contextMenus.onClicked.addListener((info, tab) => {

  sendMetrics('metrics-context-menu');

  // open sidebar which will trigger `isEditorReady`...
  if (!isEditorReady) {
    browser.sidebarAction.open();
  }
  // then send selection text to Editor.js once editor instance is initialized and ready
  sendSelectionText(info.selectionText, tab.windowId);
});

// We receive this ... GREAT
async function sendSelectionText(selectionText, windowId) {
  // if editor ready, go ahead and send selected text to be pasted in Notes,
  // otherwise wait half a second before trying again
  await isEditorConnected;
  chrome.runtime.sendMessage({
    action: 'send-to-notes',
    windowId,
    text: selectionText
  });
}
