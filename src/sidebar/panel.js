/* exported TEXT_ALIGN_DIR */
const UI_LANG = browser.i18n.getUILanguage();
const RTL_LANGS = ['ar', 'fa', 'he'];
const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

const footerButtons = document.getElementById('footer-buttons');
const enableSync = document.getElementById('enable-sync');
const giveFeedbackButton = document.getElementById('give-feedback-button');
const giveFeedbackMenuItem = document.getElementById('give-feedback');

let isAuthenticated = false;
enableSync.setAttribute('title', browser.i18n.getMessage('syncNotes'));
giveFeedbackButton.setAttribute('title', browser.i18n.getMessage('feedback'));
giveFeedbackMenuItem.text = browser.i18n.getMessage('feedback');
giveFeedbackButton.setAttribute('href', SURVEY_PATH);
giveFeedbackMenuItem.setAttribute('href', SURVEY_PATH);

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

      editor.document.on('change', (eventInfo, name) => {
        const isFocused = document.querySelector('.ck-editor__editable').classList.contains('ck-focused');
        // Only use the focused editor or handle 'rename' events to set the data into storage.
        if (isFocused || name === 'rename') {
          const content = editor.getData();
          browser.storage.local.set({ notes2: content }).then(() => {
            // Notify other sidebars
            if (!ignoreNextLoadEvent) {
              chrome.runtime.sendMessage('notes@mozilla.com', {
                action: 'kinto-save',
                content
              });

              // Debounce this second event
              chrome.runtime.sendMessage({
                action: 'metrics-changed',
                context: getPadStats(editor)
              });
            } else {
              ignoreNextLoadEvent = false;
            }
          });
        }
      });

      enableSync.onclick = () => {
        enableSyncAction(editor);
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

      // Fixes an issue with CKEditor and keeping multiple Firefox windows in sync
      // Ref: https://github.com/mozilla/notes/issues/424
      document.querySelectorAll('.ck-heading-dropdown .ck-list__item').forEach((btn) => {
        btn.addEventListener('click', () => {
          editor.fire('changesDone');
        });
      });

      localizeEditorButtons();
    });

}).catch(error => {
  console.error(error);
});


function handleLocalContent(editor, data) {
  if (!data.hasOwnProperty('notes2')) {
    editor.setData(`<h2>${browser.i18n.getMessage('welcomeTitle2')}</h2><p>${browser.i18n.getMessage('welcomeText2')}</p>`);
  } else {
    if (JSON.stringify(editor.getData()) !== JSON.stringify(data.notes2)) {
      editor.setData(data.notes2);
      browser.runtime.sendMessage({
        action: 'kinto-save',
        content: data.notes
      }).then(() => {
        // Clean-up
        browser.storage.local.remove('notes2');
      });
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

const savingIndicator = document.getElementById('saving-indicator');
savingIndicator.textContent = browser.i18n.getMessage('changesSaved');

const disconnectSync = document.getElementById('disconnect-from-sync');
disconnectSync.style.display = 'none';
disconnectSync.textContent = browser.i18n.getMessage('disableSync');
disconnectSync.addEventListener('click', () => {
  disconnectSync.style.display = 'none';
  isAuthenticated = false;
  setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
  setTimeout(() => {
    savingIndicator.textContent = browser.i18n.getMessage('disconnected');
  }, 200);
  setTimeout(() => {
    getLastSyncedTime();
  }, 2000);
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'disconnected'
  });
});

/**
 * Set animation on footerButtons toolbar
 * @param {Boolean} animateSyncIcon Start looping animation on sync icon
 * @param {Boolean} syncingLayout   if true, animate to syncingLayout (sync icon on right)
 *                                  if false, animate to savingLayout (sync icon on left)
 * @param {Boolean} warning         Apply yellow warning styling on toolbar
 */
function setAnimation( animateSyncIcon = true, syncingLayout, warning ) { // animateSyncIcon, syncingLayout, warning

  if (animateSyncIcon === true && !footerButtons.classList.contains('animateSyncIcon')) {
    footerButtons.classList.add('animateSyncIcon');
  } else if (animateSyncIcon === false && footerButtons.classList.contains('animateSyncIcon')) {
    footerButtons.classList.remove('animateSyncIcon');
  }

  if (syncingLayout === true && footerButtons.classList.contains('savingLayout')) {
    footerButtons.classList.replace('savingLayout', 'syncingLayout');
    enableSync.style.backgroundColor = 'transparent';
    // Start blink animation on saving-indicator
    savingIndicator.classList.add('blink');
    // Reset CSS animation by removeing class
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
  } else if (syncingLayout === false && footerButtons.classList.contains('syncingLayout')) {
    // Animate savingIndicator text
    savingIndicator.classList.add('blink');
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
    setTimeout(() => {
      enableSync.style.backgroundColor = null;
    }, 400);
    //
    footerButtons.classList.replace('syncingLayout', 'savingLayout');
  }

  if (warning === true && !footerButtons.classList.contains('warning')) {
    footerButtons.classList.add('warning');
  } else if (warning === false && footerButtons.classList.contains('warning')) {
    footerButtons.classList.remove('warning');
  }
}

let loginTimeout;
let editingInProcess = false;

function enableSyncAction(editor) {
  if (editingInProcess) {
    return;
  }

  if (isAuthenticated && footerButtons.classList.contains('syncingLayout')) {
    // Trigger manual sync
    setAnimation(true);
    browser.runtime.sendMessage({
        action: 'kinto-load'
      });
  } else if (!isAuthenticated && footerButtons.classList.contains('savingLayout')) {
    // Login
    setAnimation(true, true, false);  // animateSyncIcon, syncingLayout, warning

    setTimeout(() => {
      savingIndicator.textContent = browser.i18n.getMessage('openingLogin');
    }, 200); // Delay text for smooth animation

    loginTimeout = setTimeout(() => {
      setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning
      savingIndicator.textContent = browser.i18n.getMessage('pleaseLogin');
      disconnectSync.style.display = 'block';
    }, 5000);

    browser.runtime.sendMessage({
      action: 'authenticate',
      context: getPadStats(editor)
    });
  }
}

function getLastSyncedTime() {
  const getting = browser.storage.local.get(['last_modified', 'credentials']);
  getting.then(data => {
    if (data.hasOwnProperty('credentials')) {
      const time = new Date(data.last_modified).toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('syncComplete', time);
      disconnectSync.style.display = 'block';
      isAuthenticated = true;
      setAnimation(false, true);
    } else {
      const time = new Date().toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('savedComplete', time);
    }
  });
}

document.addEventListener('DOMContentLoaded', getLastSyncedTime);

chrome.runtime.onMessage.addListener(eventData => {
  let time;
  let content;
  switch (eventData.action) {
    case 'sync-authenticated':
      setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning
      isAuthenticated = true;
      // set title attr of footer to the currently logged in account
      footerButtons.title = eventData.profile && eventData.profile.email;
      savingIndicator.textContent = browser.i18n.getMessage('syncProgress');
      browser.runtime.sendMessage({
          action: 'kinto-load'
        });
      break;
    case 'kinto-loaded':
    clearTimeout(loginTimeout);
    console.log('kinto-loaded', eventData);
      content = eventData.data;
      browser.storage.local.set({ last_modified: eventData.last_modified})
        .then(() => {
          getLastSyncedTime();
          setTimeout(() => {
            handleLocalContent(content);
            document.getElementById('loading').style.display = 'none';
          }, 10);
        });
      break;
    case 'text-change':
      //ignoreNextLoadEvent = true; // XXX: What was this here for?
      loadContent();
      break;
    case 'text-syncing':
      setAnimation(true); // animateSyncIcon, syncingLayout, warning
      savingIndicator.textContent = browser.i18n.getMessage('syncProgress');
      break;
    case 'text-editing':
      savingIndicator.textContent = browser.i18n.getMessage('savingChanges');
      // Disable sync-action
      editingInProcess = true;
      break;
    case 'text-synced':
      browser.storage.local.set({ last_modified: eventData.last_modified})
        .then(() => {
          getLastSyncedTime();
          browser.runtime.sendMessage('notes@mozilla.com', {
            action: 'text-change'
          });
        });
      break;
    case 'text-saved':
      time = new Date().toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('savedComplete', time);
      // Enable sync-action
      editingInProcess = false;
      break;
    case 'disconnected':
      disconnectSync.style.display = 'none';
      footerButtons.title = null; // remove profile email from title attribute
      isAuthenticated = false;
      setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
      getLastSyncedTime();
      break;
  }
});

function getPadStats(editor) {
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

function localizeEditorButtons () {
  // Clear CKEditor tooltips. Fixes: https://github.com/mozilla/notes/issues/410
  document.querySelectorAll('.ck-toolbar .ck-tooltip__text').forEach((sel) => {
    sel.remove();
  });

  let userOSKey;

  if (navigator.appVersion.indexOf('Mac') !== -1)
    userOSKey = '⌘';
  else
    userOSKey = 'Ctrl';

  const size = document.querySelector('button.ck-button:nth-child(1)'),
    // Need to target buttons by index. Ref: https://github.com/ckeditor/ckeditor5-basic-styles/issues/59
    bold = document.querySelector('button.ck-button:nth-child(2)'),
    italic = document.querySelector('button.ck-button:nth-child(3)'),
    strike = document.querySelector('button.ck-button:nth-child(4)'),
    bullet = document.querySelector('button.ck-button:nth-child(5)'),
    ordered = document.querySelector('button.ck-button:nth-child(6)');

// Setting button titles in place of tooltips
  size.title = browser.i18n.getMessage('fontSizeTitle');
  bold.title = browser.i18n.getMessage('boldTitle') + ' (' + userOSKey + '+B)';
  italic.title = browser.i18n.getMessage('italicTitle') + ' (' + userOSKey + '+I)';
  strike.title = browser.i18n.getMessage('strikethroughTitle');
  ordered.title = browser.i18n.getMessage('numberedListTitle');
  bullet.title = browser.i18n.getMessage('bulletedListTitle');
}

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();
