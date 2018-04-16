import kintoClient from './vendor/kinto-client';

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
import fxaUtils from './vendor/fxa-utils';
import { deleteNote, createNote, saveToKinto } from './utils/sync';

import { v4 as uuid4 } from 'uuid';

export function actionPleaseLogin() {
  return { type: PLEASE_LOGIN };
}

export function actionKintoLoad(notes) {
  return { type: KINTO_LOADED, notes };
}

export function actionAuthenticate(email, avatar, displayName) {
  return { type: SYNC_AUTHENTICATED, email, avatar, displayName };
}

export function actionCreateNote(content = '') {
  const id = uuid4();
  // Return id to callback using promises
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: CREATE_NOTE, id, content });
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        createNote(kintoClient, loginDetails, { id, content }).then(() => {
          dispatch({ type: CREATE_NOTE, isSyncing: false });
          resolve(id);
        });
      });
    });
  };
}

export function actionUpdateNote(id, content, lastModified) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: UPDATE_NOTE, id, content, lastModified });
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        saveToKinto(kintoClient, loginDetails, { id, content, lastModified }).then(() => {
          dispatch({ type: UPDATE_NOTE, isSyncing: false });
          resolve();
        });
      });
    });
  };
}

export function actionDeleteNote(id) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: DELETE_NOTE, id, isSyncing: true });
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        deleteNote(kintoClient, loginDetails, id).then(() => {
          dispatch({ type: DELETE_NOTE, isSyncing: false });
          resolve(id);
        });
      });
    });
  };
}
