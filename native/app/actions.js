import * as Keychain from 'react-native-keychain';
import kintoClient from './vendor/kinto-client';

import { SYNC_AUTHENTICATED,
  KINTO_LOADED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  DISCONNECTED,
  CREATE_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  FOCUS_NOTE,
  ERROR,
  NET_INFO,
  TOGGLE_SELECT } from './utils/constants';

import browser from './browser';
import { v4 as uuid4 } from 'uuid';
import { trackEvent } from './utils/metrics';
import sync from './utils/sync';

export function pleaseLogin() {
  return { type: PLEASE_LOGIN };
}

export function syncing() {
   return { type: TEXT_SYNCING };
}

export function kintoLoad(origin) {
  // Return id to callback using promises
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: TEXT_SYNCING, from: origin });
      sync.loadFromKinto(kintoClient, getState().sync.loginDetails).then(result => {
        if (result && result.data) {
          dispatch({ type: KINTO_LOADED, notes: result.data });
          browser.runtime.sendMessage({
            action: KINTO_LOADED
          });
        }
        resolve();
      }).catch(_ => {
        reject();
      });
    });
  };
}

export function authenticate(loginDetails) {
  return { type: SYNC_AUTHENTICATED, loginDetails };
}

export function createNote(note = {}) {
  // Return id to callback using promises
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {

      trackEvent('new-note', {
        el: 'list-view'
      });

      note.id = uuid4();
      if (!note.lastModified) note.lastModified = new Date();

      // If note is not a paragraph, we force creation but editor should also
      // trigger an update with <p> in it to double check
      if (note.content && !note.content.startsWith('<p>')) {
        note.content = `<p>${note.content}</p>`;
      }

      dispatch({
        type: CREATE_NOTE,
        id: note.id,
        content: note.content,
        lastModified: note.lastModified
      });

      browser.runtime.sendMessage({
        action: CREATE_NOTE,
        id: note.id,
        content: note.content,
        lastModified: note.lastModified
      });
      resolve({ id: note.id, content: note.content, lastModified: note.lastModified });
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

export function deleteNote(id, origin) {
  trackEvent('new-note', {
    el: origin
  });

  browser.runtime.sendMessage({
    action: DELETE_NOTE,
    id
  });
  return { type: DELETE_NOTE, id, isSyncing: true };
}

export function setFocusedNote(id) {
  return { type: FOCUS_NOTE, id };
}

export function setNetInfo(isConnected) {
  return {
    type: NET_INFO,
    isConnected
  };
}

export function error(message) {
  return { type: ERROR, message};
}

export function disconnect() {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        action: DISCONNECTED
      });
      dispatch({ type: DISCONNECTED });
      Keychain.resetGenericPassword().then(resolve, reject);
    });
  };
}

export function toggleSelect(note) {
  return { type: TOGGLE_SELECT, note};
}

