/* exported TEXT_ALIGN_DIR */
const UI_LANG = browser.i18n.getUILanguage();
const RTL_LANGS = ['ar', 'fa', 'he'];
const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

const savingIndicator = document.getElementById('saving-indicator');
const enableSync = document.getElementById('enable-sync');
const giveFeedback = document.getElementById('give-feedback');
const noteDiv = document.getElementById('sync-note');
const syncNoteBody = document.getElementById('sync-note-dialog');
const closeButton = document.getElementById('close-button');
savingIndicator.textContent = browser.i18n.getMessage('changesSaved');
enableSync.setAttribute('title', browser.i18n.getMessage('syncNotes'));
syncNoteBody.textContent = browser.i18n.getMessage('syncNotReady2');
giveFeedback.setAttribute('title', browser.i18n.getMessage('giveFeedback'));
giveFeedback.setAttribute('href', SURVEY_PATH);

ClassicEditor.create(document.querySelector('#editor'), {
  heading: {
    options: [
      { modelElement: 'paragraph', title: 'P', class: 'ck-heading_paragraph' },
      { modelElement: 'heading1', viewElement: 'h1', title: 'H1', class: 'ck-heading_heading1' },
      { modelElement: 'heading2', viewElement: 'h2', title: 'H2', class: 'ck-heading_heading2' },
      { modelElement: 'heading3', viewElement: 'h3', title: 'H3', class: 'ck-heading_heading3' }
    ]
  },
  toolbar: ['headings', 'bold', 'italic', 'strike', 'bulletedList', 'numberedList'],
}).then(editor => {
  return migrationCheck(editor)
    .then(() => {
      let ignoreNextLoadEvent = false;

      editor.document.on('change', () => {
        const content = editor.getData();
        browser.storage.local.set({ notes2: content }).then(() => {
          // Notify other sidebars
          if (!ignoreNextLoadEvent) {
            chrome.runtime.sendMessage('notes@mozilla.com', {
              action: 'text-change'
            });

            updateSavingIndicator();
            // Debounce this second event
            chrome.runtime.sendMessage({
              action: 'metrics-changed',
              context: getPadStats(editor)
            });
          } else {
            ignoreNextLoadEvent = false;
          }
        });

      });

      enableSync.onclick = () => {
        noteDiv.classList.toggle('visible');
        browser.runtime.sendMessage({
          action: 'authenticate',
          context: getPadStats(editor)
        });
      };

      loadContent(editor)
        .then(() => {
          document.getElementById('loading').style.display = 'none';
        });

      chrome.runtime.onMessage.addListener(eventData => {
        switch (eventData.action) {
          case 'text-change':
            ignoreNextLoadEvent = true;
            loadContent(editor);
            break;
        }
      });
      // Disable right clicks
      // Refs: https://stackoverflow.com/a/737043/186202
      document.querySelectorAll('.ck-toolbar, #footer-buttons').forEach((sel) => {
        sel.addEventListener('contextmenu', e => {
          e.preventDefault();
        });
      });

      // Convert tooltips to titles. Fixes: https://github.com/mozilla/notes/issues/410
      document.querySelectorAll('.ck-toolbar .ck-tooltip__text').forEach((sel) => {
        sel.parentNode.parentNode.title = sel.innerHTML;
        sel.remove();
      });

    });

}).catch(error => {
  console.error(error);
});



function handleLocalContent(editor, data) {
  if (!data.hasOwnProperty('notes2')) {
    editor.setData(`## ${browser.i18n.getMessage('welcomeTitle2')}\n\n${browser.i18n.getMessage('welcomeText2')}`);
  } else {
    if (JSON.stringify(editor.getData()) !== JSON.stringify(data.notes2)) {
      editor.setData(data.notes2);
    }
  }
}

function loadContent(editor) {
  return new Promise((resolve) => {
    browser.storage.local.get(['notes2'], data => {
      // If we have a bearer, we try to save the content.
      handleLocalContent(editor, data);
      resolve();
    });
  });
}

let savingIndicatorTimeout;
function updateSavingIndicator() {
  savingIndicator.textContent = browser.i18n.getMessage('savingChanges');
  const later = function() {
    savingIndicatorTimeout = null;
    savingIndicator.textContent = browser.i18n.getMessage('changesSaved');
  };
  clearTimeout(savingIndicatorTimeout);
  savingIndicatorTimeout = setTimeout(later, 300);
}


closeButton.addEventListener('click', () => {
  noteDiv.classList.toggle('visible');
});

function getPadStats(editor) {
  // const content = quill.getContents();
  const text = editor.getData();
  const styles = {
    size: false,
    bold: false,
    italic: false,
    strike: false,
    list: false,
    list_bulleted: false,
    list_numbered: false
  };

  const range = ClassicEditor.imports.range.createIn( editor.document.getRoot() );

  for ( const value of range ) {
    if (value.type === 'text') {
      // Bold
      if (value.item.textNode._attrs.get('bold')) {
        styles.bold = true;
      }
      // Italic
      if (value.item.textNode._attrs.get('italic')) {
        styles.italic = true;
      }
    }

    if (value.type === 'elementStart') {
      // Size
      if (value.item.name.indexOf('heading') === 0) {
        styles.size = true;
      }

      // List
      if (value.item.name === 'listItem') {
        styles.list = true;
        if (value.item._attrs.get('type') === 'bulleted') {
          styles.list_bulleted = true;
        } else if (value.item._attrs.get('type') === 'numbered') {
          styles.list_numbered = true;
        }
      }
    }
  }

  return {
    syncEnabled: false,
    characters: text.length,
    lineBreaks: (text.match(/\n/g) || []).length,
    usesSize: styles.size,
    usesBold: styles.bold,
    usesItalics: styles.italic,
    usesStrikethrough: styles.strike,
    usesList: styles.list
  };
}

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();

