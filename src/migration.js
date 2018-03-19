// Migrate from singleNote to multiNotes

// Load notes collection with NOP id generator to access 'singleNote'
const notes = client.collection('notes', { // eslint-disable-line no-undef
  idSchema: {
    generate: _ => { throw new Error('cannot generate IDs'); },
    validate: _ => true
  }
});

// Migrate singleNote to MultiNote.
// Is called on load (end of this file), but also on sync to migrate remote data.
function migrateSingleNote() {

  return new Promise((resolve, reject) => {
    notes.getAny('singleNote').then(res => {
      if (res.data && res.data.id === 'singleNote' && res.data._status !== 'deleted') {
        // We send metrucs during sync
        notes.deleteAny('singleNote');
        createNote(client, { // eslint-disable-line no-undef
          content: res.data.content, wasSingleNote: true
        });
      }
      resolve();
    }).catch((exception) => {
      console.error(exception);
      resolve();
    });
  });

}

// Migrate local onload.
migrateSingleNote();
