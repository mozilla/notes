import { SYNC_AUTHENTICATED,
         KINTO_LOADED,
         TEXT_SAVED,
         TEXT_SYNCING,
         TEXT_SYNCED,
         RECONNECT_SYNC,
         DISCONNECTED,
         EXPORT_HTML,
         CREATE_NOTE,
         UPDATE_NOTE,
         DELETE_NOTE,
         PLEASE_LOGIN,
         OPENING_LOGIN,
         FOCUS_NOTE,
         ERROR,
         REQUEST_WELCOME_PAGE } from './utils/constants';

import INITIAL_CONTENT from './data/initialContent';
import { getFirstNonEmptyElement, formatFilename } from './utils/utils';
import { v4 as uuid4 } from 'uuid';
import * as FileSaver from 'file-saver';

/*
 * action creators
 */
export function updatedNote(id, content, lastModified) {
  return { type: UPDATE_NOTE, id, content, lastModified };
}
export function updateNote(id, content) {
  const lastModified = new Date();
  if (content.replace(/&nbsp;/g, '\xa0') !== INITIAL_CONTENT.replace(/\s\s+/g, ' ')) {
    browser.windows.getCurrent({populate: true}).then((windowInfo) => {
      chrome.runtime.sendMessage({
        action: UPDATE_NOTE,
        from: windowInfo.id,
        note: {
          id, content, lastModified
        }
      });
    });
  }
  return { type: UPDATE_NOTE, id, content, lastModified };
}

export function authenticate(email) {
  localStorage.setItem('userEmail', email);
  browser.runtime.sendMessage({
    action: 'kinto-sync'
  });
  return { type: SYNC_AUTHENTICATED, email };
}

export function saved(id, content, lastModified) {
  return { type: TEXT_SAVED, id, content, lastModified };
}

export function syncing() {
   return { type: TEXT_SYNCING };
}

export function synced(notes) {
  return { type: TEXT_SYNCED, notes };
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

export function createdNote(id, content, lastModified) {
  return { type: CREATE_NOTE, isSyncing: false };
}
export function createNote(content = '', origin) {

  const id = uuid4();

  // Send create request to kinto with uuid4 id
  chrome.runtime.sendMessage({
    action: 'create-note',
    id,
    content,
    origin,
    lastModified: new Date()
  });

  // Return id to callback using promises
  const fct = (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: CREATE_NOTE, id, content });
      resolve(id);
    });
  };

  return fct;
}

export function deletedNote(id) {
  return { type: DELETE_NOTE, id, isSyncing: false };
}

export function deleteNote(id, origin) {
  chrome.runtime.sendMessage({ action: 'delete-note', id, origin});
  return { type: DELETE_NOTE, id, isSyncing: true };
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

  FileSaver.saveAs(data, exportFileName);

  chrome.runtime.sendMessage({
    action: 'metrics-export'
  });
  return { type: EXPORT_HTML, content };
}

export function setFocusedNote(id) {
  return { type: FOCUS_NOTE, id };
}

export function requestWelcomeNote() {
  return { type: REQUEST_WELCOME_PAGE };
}

export function error(message) {
  return { type: ERROR, message};
}
