const KINTO_SERVER = 'https://testpilot.settings.services.mozilla.com/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'c6d74070a481bc10';
const FXA_CONTENT_SERVER = 'http://127.0.0.1:3030';
const FXA_OAUTH_SERVER = 'http://127.0.0.1:9010/v1';
const FXA_PROFILE_SERVER = 'http://127.0.0.1:1111/v1';
const FXA_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
let isEditorReady = false;
let editorConnectedDeferred;
let isEditorConnected = new Promise(resolve => { editorConnectedDeferred = {resolve}; });

// Kinto sync and encryption
const client = new Kinto({remote: KINTO_SERVER, bucket: 'default'});
// Used by sync to load only changes from lastModified timestamp.
let lastSyncTimestamp = null; // eslint-disable-line no-unused-vars

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
  const fxaKeysUtil = new fxaCryptoRelier.OAuthUtils({
    contentServer: FXA_CONTENT_SERVER,
    oauthServer: FXA_OAUTH_SERVER
  });
    chrome.runtime.sendMessage({
      action: 'sync-opening'
    });
  fxaKeysUtil.launchWebExtensionKeyFlow(FXA_CLIENT_ID, {
    redirectUri: browser.identity.getRedirectURL(),
    scopes: FXA_SCOPES,
  }).then((loginDetails) => {
    lastSyncTimestamp = null;
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
  });
}
browser.runtime.onMessage.addListener(function(eventData) {
  const credentials = new BrowserStorageCredentials(browser.storage.local);

  switch (eventData.action) {
    case 'authenticate':
      credentials.get()
        .then(result => {
          if (!result) {
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
        // nothing to do here
      });
      break;
    case 'kinto-sync':
      loadFromKinto(client, credentials);
      break;
    case 'editor-ready':
      isEditorReady = true;
      break;
    case 'create-note':
      // We create a note, and send id with note-created nessage
      createNote(client, credentials, {
        id: eventData.id,
        content: eventData.content,
        lastModified: eventData.lastModified
      }).then(() => {
        browser.runtime.sendMessage({
          action: 'create-note',
          id: eventData.id
        });
      });
      break;
    case 'update-note':
      saveToKinto(client, credentials, eventData.note, eventData.from);
      break;
    case 'delete-note':
      // We create a note, and send id with note-created nessage
      deleteNote(client, credentials, eventData.id).then(() => {
        // loadFromKinto(client, credentials);
        browser.runtime.sendMessage({
          action: 'delete-note',
          id: eventData.id
        });
      });
      break;
    case 'theme-changed':
      browser.runtime.sendMessage({
        action: 'theme-changed'
      });
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
    }
  );

  editorConnectedDeferred.resolve();

  p.onDisconnect.addListener(() => {
    // sidebar closed, therefore editor is not ready to receive any content
    isEditorConnected = new Promise(resolve => { editorConnectedDeferred = {resolve}; });
    isEditorReady = false;
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
