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
  av: '1.6.0'  // XXX: Change version on release
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
      browser.storage.local.set({'asked-for-syncing': true})
      .then(() => {
          sendMetrics('sync-started', eventData.context);
        });
      break;
    case 'metrics-changed':
      sendMetrics('changed', eventData.context);
      break;
    case 'metrics-drag-n-drop':
      sendMetrics('drag-n-drop', eventData.context);
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


//function listener(changes) {
//  if (changes.theme.oldValue.theme !== changes.theme.newValue.theme)
//    // update sidebar to show new theme
//}
//browser.storage.onChanged.addListener(listener);  // listen for changes made to storage
