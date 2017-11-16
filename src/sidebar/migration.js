/**
 * Migration Script to move users from Quill to CKEditor.
 *
 * @param editor
 * @returns {Promise}
 */

const migrationNote = document.getElementById('migration-note');
const migrationBody = document.getElementById('migration-note-dialog');
const migrationCloseButton = document.getElementById('migration-close-button');
migrationBody.textContent = browser.i18n.getMessage('migratedEditor');
migrationCloseButton.addEventListener('click', () => {
  migrationNote.classList.toggle('visible');
});

function migrationCheck (editor) {
  console.log('Editor migration started...');
  const quill = new Quill('#migrationPlaceholder', {});

  // get the old data from Quill storage
  return browser.storage.local.get(['notes']).then((data) => {
    if (data && data.notes) {
      // if there is old data we want to clear it
      browser.storage.local.set({ notes: null });
      // backup old notes, just in case...
      browser.storage.local.set({ notesQuillBackup: data.notes });
    } else {
      // if there is no old data then nothing to do
      console.log('Already migrated.');

      chrome.runtime.sendMessage({
        action: 'metrics-migrated-before'
      });
      return;
    }

    quill.on('text-change', () => {
      // event triggered by `setContents` below.
      const oldNoteDataHtml = quill.container.firstChild.innerHTML;
      // set CKEditor contents
      editor.setData(oldNoteDataHtml);

      // get the new data as Markdown
      const newData = editor.getData();

      // place into CKEditor storage
      return browser.storage.local.set({ notes2: newData }).then(() => {
        // call setData again to remove spacing issues, force re-render
        editor.setData(newData);

        chrome.runtime.sendMessage({
          action: 'metrics-migrated'
        });

        migrationNote.classList.toggle('visible');
        console.log('Editor migration complete.');
      });

    });

    // render contents of quill to make HTML export possible
    quill.setContents(data.notes);
  });
}
