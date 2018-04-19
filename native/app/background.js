import kintoClient from './vendor/kinto-client';
import fxaUtils from './vendor/fxa-utils';

import { SYNC_AUTHENTICATED,
  KINTO_LOADED,
  SYNCING,
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

 import browser from './browser';
 import store from './store';
 import sync from './utils/sync';

browser.runtime.onMessage.addListener(eventData => {
  switch(eventData.type) {
    case KINTO_LOADED:
      store.dispatch({ type: TEXT_SYNCING });
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        sync.loadFromKinto(kintoClient, loginDetails).then(result => {
          if (result && result.data) {
            store.dispatch({ type: KINTO_LOADED, notes: result.data });
          }
        });
      });
      break;
    case CREATE_NOTE:
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        sync.createNote(kintoClient, loginDetails,
          { id: eventData.id, content: eventData.content, lastModified: new Date() }).then(() => {
          store.dispatch({ type: TEXT_SYNCED });
        });
      });
      break;
    case UPDATE_NOTE:
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        sync.saveToKinto(kintoClient, loginDetails,
          { id: eventData.id, content: eventData.content, lastModified: eventData.lastModified }).then(() => {
          store.dispatch({ type: TEXT_SYNCED });
        });
      });
      break;
    case DELETE_NOTE:
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        sync.deleteNote(kintoClient, loginDetails, eventData.id).then(() => {
          store.dispatch({ type: TEXT_SYNCED });
        });
      });
      break;
    default:
      break;
  }
});

export default {};
