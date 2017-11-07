const UI_LANG = browser.i18n.getUILanguage();
const RTL_LANGS = ['ar', 'fa', 'he'];
const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

ClassicEditor.create(document.querySelector('#editor'), {
  toolbar: ['headings', 'bold', 'italic', 'blockQuote', '|',  'link', '|', 'bulletedList', 'numberedList'],
}).then( editor => {
  console.log( 'Editor was initialized', editor );
}).catch( error => {
  console.error( error.stack );
});

// function handleLocalContent(data) {
//   if (!data.hasOwnProperty('notes')) {
//     quill.setContents({
//       ops: [
//         { attributes: { size: 'large', bold: true }, insert: browser.i18n.getMessage('welcomeTitle2') },
//         { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }},
//         {
//           attributes: { size: 'large' },
//           insert:
//             browser.i18n.getMessage('welcomeText2')
//         },
//         { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }}
//       ]
//     });
//   } else {
//     if (JSON.stringify(quill.getContents()) !== JSON.stringify(data.notes)) {
//       quill.setContents(data.notes);
//     }
//   }
//   quill.focus();
// }

// function loadContent() {
//   return new Promise((resolve) => {
//     browser.storage.local.get(['notes'], data => {
//       // If we have a bearer, we try to save the content.
//       handleLocalContent(data);
//       resolve();
//     });
//   });
// }

// loadContent()
//   .then(() => {
//     document.getElementById('loading').style.display = 'none';
//   });

// let ignoreNextLoadEvent = false;
// quill.on('text-change', () => {
//   const content = quill.getContents();
//   browser.storage.local.set({ notes: content }).then(() => {
//     // Notify other sidebars
//     if (!ignoreNextLoadEvent) {
//       chrome.runtime.sendMessage('notes@mozilla.com', {
//         action: 'text-change'
//       });

//       updateSavingIndicator();
//       // Debounce this second event
//       chrome.runtime.sendMessage({
//         action: 'metrics-changed',
//         context: getPadStats()
//       });
//     } else {
//       ignoreNextLoadEvent = false;
//     }
//   });
// });

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

enableSync.onclick = () => {
  noteDiv.classList.toggle('visible');
  browser.runtime.sendMessage({
    action: 'authenticate',
    context: getPadStats()
  });
};

// chrome.runtime.onMessage.addListener(eventData => {
//   switch (eventData.action) {
//     case 'text-change':
//       ignoreNextLoadEvent = true;
//       loadContent();
//       break;
//   }
// });

// function getPadStats() {
//   const content = quill.getContents();
//   const text = quill.getText();
//   const styles = {
//     size: false,
//     bold: false,
//     italic: false,
//     strike: false,
//     list: false
//   };

//   content.forEach(node => {
//     if (node.hasOwnProperty('attributes')) {
//       Object.keys(node.attributes).forEach(key => {
//         if (styles.hasOwnProperty(key)) {
//           styles[key] = true;
//         }
//       });
//     }
//   });

//   return {
//     syncEnabled: false,
//     characters: text.length,
//     lineBreaks: (text.match(/\n/g) || []).length,
//     usesSize: styles.size,
//     usesBold: styles.bold,
//     usesItalics: styles.italic,
//     usesStrikethrough: styles.strike,
//     usesList: styles.list
//   };
// }

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();


// // Disable right clicks
// // Refs: https://stackoverflow.com/a/737043/186202
// document.getElementById('toolbar').addEventListener('contextmenu', e => {
//   e.preventDefault();
// });

// document.getElementById('footer-buttons').addEventListener('contextmenu', e => {
//   e.preventDefault();
// });
