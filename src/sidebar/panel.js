const formats = [
  'bold',
  'font',
  'italic',
  'size',
  'strike',
  'header',
  'indent',
  'list',
  'direction',
  'align'
];
const UI_LANG = browser.i18n.getUILanguage();
const RTL_LANGS = ['ar', 'fa', 'he'];
const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';


const fontSizeStyle = Quill.import('attributors/style/size');
fontSizeStyle.whitelist = ['12px', '14px', '16px', '18px', '20px'];
Quill.register(fontSizeStyle, true);

// add text direction icon to toolbar if RTL
const qlDirection = document.getElementById('ql-direction');
if (LANG_DIR === 'rtl') {
  qlDirection.innerHTML = '<button class="ql-direction" value="rtl"></button>';
}

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
        { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }},
        {
          attributes: { size: 'large' },
          insert:
            browser.i18n.getMessage('welcomeText')
        },
        { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }}
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
const syncNoteBody = document.getElementById('sync-note-dialogue');
const closeButton = document.getElementById('close-button');
enableSync.textContent = browser.i18n.getMessage('syncNotes');
syncNoteBody.textContent = browser.i18n.getMessage('syncNotReady');

closeButton.addEventListener('click', () => {
  noteDiv.classList.toggle('visible');
});

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
