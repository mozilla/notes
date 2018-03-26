import TestPilotGA from 'testpilot-ga';
/**
 * Check IndexedDB Health
 */
function checkIndexedDbHealth() { // eslint-disable-line no-unused-vars
  return new Promise((resolve, reject) => {
    try {
      // Use version 1 always, we don't care about IDB schema upgrades.
      const req = indexedDB.open('dbHealth', 1);
      req.onsuccess = function(evt) {
        const db = req.result;
        db.close();
        resolve('works');
      };

      req.onerror = function(evt) {
        reject('DB Open Error');
        evt.preventDefault();
        evt.stopPropagation();
      };
    } catch (ex) {
      reject(ex);
    }
  });
}

// ANALYTICS send metrics
const timeouts = {};
const analytics = new TestPilotGA({
  tid: TRACKING_ID,
  ds: 'addon',
  an: 'Notes Experiment',
  aid: 'notes@mozilla.com',
  av: browser.runtime.getManifest().version
});
const TRACKING_ID = 'UA-35433268-79'; // Google Analytics / TestPilot Metrics

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

export { checkIndexedDbHealth, sendMetrics };
