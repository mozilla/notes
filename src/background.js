/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const timeouts = {};

browser.storage.local.get('UID').then((data) => {
  let UID;
  // Read the previous UID value or create a new one
  if (!data.hasOwnProperty('UID')) {
    UID = window.crypto.getRandomValues(new Uint32Array(1)).toString();
    browser.storage.local.set({UID});  // Save it for next time
  } else {
    UID = data.UID;
  }

  function sendMetrics(event, context = {}) {
    const later = function() {
      timeouts[event] = null;
      const gaEvent = {
        // Global information
        v: 1,
        tid: TRACKING_ID,
        cid: UID,
        aip: 1,  // Anonymize IP address
        ds: 'addon',
        z: Date.now() / 1000 | 0,  // Unix timestamp
        ua: navigator.userAgent,
        ul: navigator.language,
        an: '@notes',
        aid: 'notes@mozilla.com',
        av: '1.5.0',
        aiid: 'testpilot',
        // Event specific information
        t: 'event',
        ec: 'notes',
        ea: event,
        cm1: context.characters,
        cm2: context.lineBreaks,
        cm3: undefined,  // Size of the change
        cd1: context.syncEnabled,
        cd2: context.usesSize,
        cd3: context.usesBold,
        cd4: context.usesItalics,
        cd5: context.usesStrikethrough,
        cd6: context.usesList,
        cd7: undefined, // Firefox UI used to open, close notepad
        cd8: undefined, // reason editing session ended
      };
      console.log(event, context, gaEvent);

      let formBody = [];

      for (const k in gaEvent) {
        const encodedKey = encodeURIComponent(k);
        const encodedValue = encodeURIComponent(gaEvent[k]);
        formBody.push(encodedKey + '=' + encodedValue);
      }
      formBody = formBody.join('&');

      const request = {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: formBody
      };

      if (navigator.doNotTrack === 'unspecified') {
        return fetch('https://www.google-analytics.com/collect', request);
      } else {
        console.log('Do not track activated, not sending anything.');
        return Promise.resolve();
      }
    };
    clearTimeout(timeouts[event]);
    timeouts[event] = setTimeout(later, 20000);
  }

  browser.runtime.onMessage.addListener(function(eventData) {
  switch (eventData.action) {
    case 'authenticate':
      browser.storage.local.set({'asked-for-syncing': true})
      .then(() => {
          sendMetrics('sync-started', eventData.context);
        });
      break;
    case 'metrics-open':
      sendMetrics('open', eventData.context);
      break;
    case 'metrics-close':
      sendMetrics('close', eventData.context);
      break;
    case 'metrics-changed':
      sendMetrics('changed', eventData.context);
      break;
  }
  });

});


