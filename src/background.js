/**
 * Kinto configuration
 */
const KINTO_SERVER = "https://kinto-ota.dev.mozaws.net/v1";
const REDIRECT_URL = browser.identity.getRedirectURL();
const CLIENT_ID = 'c6d74070a481bc10';


/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-101177676-1';

browser.storage.local.get('UID').then((data) => {
  let UID;
  // Read the previous UID value or create a new one
  if (!data.hasOwnProperty('UID')) {
    UID = window.crypto.getRandomValues(new Uint32Array(1)).toString();
    browser.storage.local.set({UID});  // Save it for next time
  } else {
    UID = data.UID;
  }
  const { sendEvent } = new Metrics({
    id: 'notes@mozilla.com',
    version: '1.3.0',
    tid: TRACKING_ID,
    uid: UID
  });

  sendEvent({ object: 'webext-loaded', method: 'click' });
  
  browser.runtime.onMessage.addListener(function(eventData) {
  switch (eventData.action) {
    case 'authenticate':
      browser.storage.local.set({'asked-for-syncing': true})
      .then(() => {
        sendEvent({
          object: 'webext-button-authenticate',
          method: 'click'
        });
        handleAuthentication(KINTO_SERVER, REDIRECT_URL, CLIENT_ID);
      });
      break;
    }
  });
});
