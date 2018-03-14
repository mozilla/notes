import { MAXIMUM_PAD_SIZE,
         SYNC_AUTHENTICATED,
         KINTO_LOADED,
         TEXT_CHANGE,
         TEXT_SYNCING,
         TEXT_EDITING,
         TEXT_SYNCED,
         TEXT_SAVED,
         RECONNECT_SYNC,
         DISCONNECTED,
         SEND_TO_NOTES,
         EXPORT_HTML,
         CREATE_NOTE,
         DELETE_NOTE,
         PLEASE_LOGIN,
         OPENING_LOGIN } from './utils/constants';

import INITIAL_CONTENT from './data/initialContent';

import { getFirstNonEmptyElement, formatFilename } from './utils/utils';
/*
 * action creators
 */
export function textChange(id, content) {
  let isInitialContent = false;
  const lastModified = new Date();
  if (content.replace(/&nbsp;/g, '\xa0') !== INITIAL_CONTENT.replace(/\s\s+/g, ' ')) {
    chrome.runtime.sendMessage({
      action: 'kinto-save',
      note: {
        id, content, lastModified
      }
    });
    if (content.length > MAXIMUM_PAD_SIZE) {
      console.error( // eslint-disable-line no-console
        'Maximum notepad size reached:', content.length
      );
      browser.runtime.sendMessage({
        action: 'metrics-limit-reached'
      });
    }
  } else {
    isInitialContent = true;
  }
  return { type: TEXT_CHANGE, id, content, lastModified, isInitialContent };
}

export function authenticate(email) {
  localStorage.setItem('userEmail', email);
  browser.runtime.sendMessage({
    action: 'kinto-sync'
  });
  return { type: SYNC_AUTHENTICATED, email };
}

export function syncing() {
  return { type: TEXT_SYNCING };
}

export function saving() {
  return { type: TEXT_EDITING };
}

export function synced(last_modified) {
  return { type: TEXT_SYNCED, last_modified };
}

export function saved() {
  return { type: TEXT_SAVED };
}

export function kintoLoad(notes) {
  return { type: KINTO_LOADED, notes };
}

export function disconnect() {
  localStorage.removeItem('userEmail');
  browser.runtime.sendMessage({
    action: 'disconnected'
  });
  return { type: DISCONNECTED };
}

// LOGIN PROCESS
export function openLogin() {
  browser.runtime.sendMessage({
    action: 'authenticate'
  });
  return { type: OPENING_LOGIN };
}

export function pleaseLogin() {
  return { type: PLEASE_LOGIN };
}

export function reconnectSync() {
  chrome.runtime.sendMessage({
    action: 'metrics-reconnect-sync'
  });
  return { type: RECONNECT_SYNC };
}

export function createNote(id) {
  if (!id) {
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'create-note'
      });
    }, 300);
  }
  return { type: CREATE_NOTE, id };
}

export function deleteNote(id) {
  chrome.runtime.sendMessage({
    action: 'delete-note',
    id
  });
  return { type: DELETE_NOTE, id };
}

// EXPORT HTML
export function exportHTML(content) {

  // get Notes content
  const notesContent = content;
  // assign contents to container element for later parsing
  const parentElement = document.createElement('div');
  parentElement.innerHTML = notesContent; // eslint-disable-line no-unsanitized/property

  let exportFileName = 'blank.html';
  // get the first child element with text
  const nonEmptyChildElement = getFirstNonEmptyElement(parentElement);

  // if non-empty child element exists, set the filename to the element's `textContent`
  if (nonEmptyChildElement) {
    exportFileName = formatFilename(nonEmptyChildElement.textContent);
  }

  const exportFileType = 'text/html';
  const data = new Blob([`
    <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Notes</title>
        </head>
      <body>${notesContent}</body>
    </html>`.trim()], {'type': exportFileType});

  const exportFilePath = window.URL.createObjectURL(data);
  browser.downloads.download({
    url: exportFilePath,
    filename: exportFileName,
    saveAs: true // always open file chooser, fixes #733
  });

  chrome.runtime.sendMessage({
    action: 'metrics-export-html'
  });
  return { type: EXPORT_HTML, content };
}

export function sendToNote(content) {
  browser.runtime.sendMessage({
    action: 'metrics-context-menu'
  });
  return { type: SEND_TO_NOTES, content };
}

