import { combineReducers } from 'redux';
import {
  TEXT_CHANGE,
  SYNC_AUTHENTICATED,
  DISCONNECTED,
  TEXT_SYNCED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_EDITING,
  KINTO_LOADED,
  SEND_TO_NOTES,
  OPENING_LOGIN,
  RECONNECT_SYNC,
  PLEASE_LOGIN
} from './utils/constants';


import { getFirstLineFromContent, getSecondLineFromContent } from './utils/utils';

function sync(sync = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, sync, {
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
        email: action.email
      });
    case DISCONNECTED:
      return Object.assign({}, sync, {
        email: null,
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
      });
    case OPENING_LOGIN:
      return Object.assign({}, sync, {
        isOpeningLogin: true,
        isPleaseLogin: false,
        isReconnectSync: false,
      });
    case PLEASE_LOGIN:
      return Object.assign({}, sync, {
        isOpeningLogin: false,
        isPleaseLogin: true,
        isReconnectSync: false,
      });
    case RECONNECT_SYNC:
      return Object.assign({}, sync, {
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: true,
      });
    default:
      return sync;
  }
}

function kinto(kinto = {}, action) {
  switch (action.type) {
    case KINTO_LOADED:
      return Object.assign({}, kinto, {
        isLoaded: true
      });
    default:
      return kinto;
  }
}

function note(note = {content: ''}, action) {
  switch (action.type) {
    case TEXT_CHANGE:
      return Object.assign({}, note, {
        content: action.content,
        firstLine: getFirstLineFromContent(action.content),
        secondLine: getSecondLineFromContent(action.content),
        lastModified: new Date(),
        isSaving: !action.isInitialContent,
        isSyncing: !action.isInitialContent
      });
    case TEXT_SYNCED:
      return Object.assign({}, note, {
        lastSynced: action.date,
        isSyncing: false
      });
    case TEXT_SAVED:
      return Object.assign({}, note, {
        lastSaved: new Date(),
        isSaving: false
      });
    case TEXT_SYNCING:
      return Object.assign({}, note, {
        isSyncing: true
      });
    case TEXT_EDITING:
      return Object.assign({}, note, {
        isSaving: true
      });
    case SEND_TO_NOTES:
      return Object.assign({}, note, {
        content: note.content + '<p>' + action.content.replace(/\n\n/g, '</p><p>') + '</p>'
      });
    case SYNC_AUTHENTICATED:
      return Object.assign({}, note, {
        isSyncing: true
      });
    default:
      return note;
  }
}

const noteApp = combineReducers({
  sync,
  kinto,
  note
});

export default noteApp;
