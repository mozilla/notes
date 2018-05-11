import kintoClient from './vendor/kinto-client';
import fxaUtils from './vendor/fxa-utils';
import { trackEvent } from './utils/metrics';

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
 import { store, persistor } from './store';
 import sync from './utils/sync';

browser.runtime.onMessage.addListener(eventData => {
  switch(eventData.action) {
    case CREATE_NOTE:
      sync.createNote(kintoClient, store.getState().sync.loginDetails,
        { id: eventData.id, content: eventData.content, lastModified: eventData.lastModified }).then(() => {
        store.dispatch({ type: TEXT_SYNCED });
      });
      break;
    case UPDATE_NOTE:
      sync.saveToKinto(kintoClient, store.getState().sync.loginDetails,
        { id: eventData.id, content: eventData.content, lastModified: eventData.lastModified }).then(() => {
        store.dispatch({ type: TEXT_SYNCED });
      });
      break;
    case DELETE_NOTE:
      sync.deleteNotes(kintoClient, store.getState().sync.loginDetails, eventData.ids).then(() => {
        store.dispatch({ type: TEXT_SYNCED });
      });
      break;
    case DISCONNECTED:
      sync.clearKinto(kintoClient);
      persistor.purge();
      break;
    case TEXT_SYNCING:
      store.dispatch({ type: TEXT_SYNCING });
      break;
    case ERROR:
      store.dispatch({ type: ERROR, message: eventData.message });
      break;
    case RECONNECT_SYNC:
      trackEvent('reconnect-sync');
      store.dispatch({ type: ERROR, message: 'Reconnect to Sync' });
    default:
      break;
  }
});

export default {};
