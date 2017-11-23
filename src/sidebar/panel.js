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
const savingIndicator = document.getElementById('saving-indicator');
savingIndicator.textContent = browser.i18n.getMessage('changesSaved');

const disconnectSync = document.getElementById('disconnect-from-sync');
disconnectSync.style.display = 'none';
disconnectSync.textContent = browser.i18n.getMessage('disableSync');

let isAuthenticated = false;
let loginTimeout;
let editingInProcess = false;

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

      customizeEditor(editor);

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
                  handleLocalContent(editor, content);
                  document.getElementById('loading').style.display = 'none';
                }, 10);
              });
            break;
          case 'text-change':
            ignoreNextLoadEvent = true;
            loadContent(editor);
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

function disconnectFromSync () {
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
}

disconnectSync.addEventListener('click', disconnectFromSync);

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

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();
