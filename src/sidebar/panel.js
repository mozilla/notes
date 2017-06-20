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

const fontSizeStyle = Quill.import('attributors/style/size');
fontSizeStyle.whitelist = ['12px', '14px', '16px', '18px', '20px'];
Quill.register(fontSizeStyle, true);

const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: browser.i18n.getMessage('emptyPlaceHolder'),
  modules: {
    toolbar: '#toolbar'
  },
  formats: formats // enabled formats, see https://github.com/quilljs/quill/issues/1108
});

function handleLocalContent(data) {
  if (!data.hasOwnProperty('notes')) {
    quill.setContents({
      ops: [
        { attributes: { size: 'large', bold: true }, insert: browser.i18n.getMessage('welcomeTitle') },
        { insert: '\n\n' },
        {
          attributes: { size: 'large' },
          insert:
            browser.i18n.getMessage('welcomeText')
        },
        { insert: '\n\n' }
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
enableSync.textContent = browser.i18n.getMessage('syncNotes');
noteDiv.textContent = browser.i18n.getMessage('syncNotReady');


enableSync.onclick = () => {
  noteDiv.classList.toggle('visible');
  browser.runtime.sendMessage({ action: 'authenticate' });
};

chrome.runtime.onMessage.addListener(eventData => {
  switch (eventData.action) {
    case 'text-change':
      ignoreNextLoadEvent = true;
      loadContent();
      break;
  }
});
