/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';


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

  function sendMetrics(event, context = {}) {
    const gaEvent = {
      cm1: context.characters,
      cm2: context.lineBreaks,
      cm3: null,
      cd1: context.syncEnabled,
      cd2: null, // changed size of text
      cd3: context.usesBold,
      cd4: context.usesItalics,
      cd5: context.usesStrikethrough,
      cd6: context.usesList,
      cd7: null, // Firefox UI used to open, close notepad
      cd8: null, // reason editing session ended
    };
    console.log(event, context, gaEvent);
    sendEvent({object: event, method: 'click'});
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


