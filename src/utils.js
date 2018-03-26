/**
 * Module that provides utils for background work of Notes
 */

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

export { checkIndexedDbHealth };
