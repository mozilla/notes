/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const timeouts = {};

const analytics = new TestPilotGA({
  tid: TRACKING_ID,
  cid: UID,
  ds: 'addon',
  an: 'Notes Experiment',
  aid: 'notes@mozilla.com',
  av: '1.5.0'
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

// Skip the first changed event.
let first = true;
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
      if (first) {
        first = false;
      } else {
        sendMetrics('changed', eventData.context);
      }
      break;
    case 'metrics-drag-n-drop':
      sendMetrics('drag-n-drop', eventData.context);
      break;
  }
});
