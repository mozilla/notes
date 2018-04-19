
import { SYNC_AUTHENTICATED,
  KINTO_LOADED,
  TEXT_SAVED,
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

import browser from './browser';
import { v4 as uuid4 } from 'uuid';

export function pleaseLogin() {
  return { type: PLEASE_LOGIN };
}

export function kintoLoad(notes) {
  return { type: KINTO_LOADED, notes };
}

export function authenticate(email, avatar, displayName) {
  return { type: SYNC_AUTHENTICATED, email, avatar, displayName };
}

export function createNote(content = '') {
  // Return id to callback using promises
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {

      const id = uuid4();

      // If note is not a paragraph, we force creation but editor should also
      // trigger an update with <p> in it to double check
      if (!content.startsWith('<p>')) {
        content = `<p>${content}</p>`;
      }

      dispatch({ type: CREATE_NOTE, id, content });

      browser.runtime.sendMessage({
        action: CREATE_NOTE,
        id,
        content
      });
      resolve({ id, content });
    });
  };
}

export function updateNote(id, content, lastModified) {
  browser.runtime.sendMessage({
    action: UPDATE_NOTE,
    id,
    content,
    lastModified
  });
  return { type: UPDATE_NOTE, id, content, lastModified };
}

export function deleteNote(id) {
  browser.runtime.sendMessage({
    action: DELETE_NOTE,
    id
  });
  return { type: DELETE_NOTE, id, isSyncing: true };
}

export function error(message) {
  return { type: ERROR, message};
}
