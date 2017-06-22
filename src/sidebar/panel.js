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
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar'
  },
  formats: formats // enabled formats, see https://github.com/quilljs/quill/issues/1108
});

// Get pad stats
function getPadStats() {
  const content = quill.getContents();
  const text = quill.getText();
  const styles = {
    size: false,
    bold: false,
    italic: false,
    strike: false,
    list: false
  };

  content.forEach(node => {
    if (node.hasOwnProperty('attributes')) {
      Object.keys(node.attributes).forEach(key => {
        if (styles.hasOwnProperty(key)) {
          styles.key = true;
        }
      });
    }
  });

  return {
    syncEnabled: false,
    characters: text.length,
    lineBreaks: (text.match(/\n/g) || []).length,
    usesBold: styles.bold,
    usesItalics: styles.italic,
    usesStrikethrough: styles.strike,
    usesList: styles.list
  };
}

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
