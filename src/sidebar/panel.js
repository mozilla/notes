const formats = [
  'bold',
  'font',
  'italic',
  'size',
  'strike',
  'header',
  'indent',
  'list'
];

const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar'
  },
  formats: formats // enabled formats, see https://github.com/quilljs/quill/issues/1108
});

function handleLocalContent(data) {
  if (!data.hasOwnProperty('notes')) {
    quill.setContents({
      ops: [
        { attributes: { size: 'large', bold: true }, insert: 'Welcome!' },
        { insert: '\n\n' },
        {
          attributes: { size: 'large' },
          insert:
            'This is a simple one-page notepad built in to Firefox that helps you get the most out of the web.'
        },
        { insert: '\n\n' },
        { attributes: { size: 'large' }, insert: 'You can: ' },
        { insert: '\n\n' },
        { attributes: { size: 'large' }, insert: 'Format your notes' },
        { attributes: { list: 'ordered' }, insert: '\n' },
        {
          attributes: { size: 'large' },
          insert: 'Sync notes securely to your Firefox Account'
        },
        { attributes: { list: 'ordered' }, insert: '\n' },
        {
          attributes: { size: 'large' },
          insert: 'Sync them to our Android app: http://mzl.la/notes'
        },
        { attributes: { list: 'ordered' }, insert: '\n' }
      ]
    });
  } else {
    if (JSON.stringify(quill.getContents()) !== JSON.stringify(data.notes)) {
      quill.setContents(data.notes);
    }
  }
}

function loadContent() {
  browser.storage.local.get(['notes'], data => {
    // If we have a bearer, we try to save the content.
    handleLocalContent(data);
  });
}

loadContent();

let ignoreNextLoadEvent = false;
quill.on('text-change', () => {
  const content = quill.getContents();
  browser.storage.local.set({ notes: content }).then(() => {
    // Notify other sidebars
    if (!ignoreNextLoadEvent) {
      chrome.runtime.sendMessage('notes@mozilla.com', {
        action: 'text-change'
      });
    }
    ignoreNextLoadEvent = false;
  });
});

const enableSync = document.getElementById('enable-sync');
const noteDiv = document.getElementById('sync-note');

enableSync.onclick = () => {
  noteDiv.classList.toggle('visible');
};

chrome.runtime.onMessage.addListener(eventData => {
  switch (eventData.action) {
    case 'text-change':
      ignoreNextLoadEvent = true;
      loadContent();
      break;
  }
});
