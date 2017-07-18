/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const timeouts = {};

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

browser.runtime.onMessage.addListener(function(eventData) {
  switch (eventData.action) {
    case 'authenticate':
      sendEvent({
        object: 'webext-button-authenticate',
        method: 'click'
      });

      const fxaKeysUtil = new FxaCrypto.relier.OAuthUtils();

      fxaKeysUtil.launchFxaScopedKeyFlow({
        client_id: 'c6d74070a481bc10',
        oauth_uri: 'http://127.0.0.1:9010/v1',
            //oauth_uri: 'https://oauth-scoped-keys.dev.lcip.org/v1',
        pkce: true,
        redirect_uri: browser.identity.getRedirectURL(),
        scopes: ['profile', 'https://identity.mozilla.org/apps/notes'],
      }).then((loginDetails) => {
        console.log('access token + keys', loginDetails);
        chrome.runtime.sendMessage({
          action: 'authenticated',
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
