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
  const fxaKeysUtil = new FxaCrypto.relier.OAuthUtils();
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
    chrome.runtime.sendMessage({
      action: 'sync-authenticated',
      bearer: loginDetails.access_token,
      keys: loginDetails.keys
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

browser.runtime.onMessage.addListener(function(eventData) {
  switch (eventData.action) {
    case 'authenticate':
      sendMetrics('webext-button-authenticate', eventData.context);
      authenticate();
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
