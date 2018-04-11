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
  const id = uuid4();
  // Return id to callback using promises
  const fct = (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: CREATE_NOTE, id, content });
      resolve(id);
    });
  };

  return fct;
}
