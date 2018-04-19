import { combineReducers } from 'redux';
import {
  SYNC_AUTHENTICATED,
  DISCONNECTED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  KINTO_LOADED,
  OPENING_LOGIN,
  RECONNECT_SYNC,
  CREATE_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  PLEASE_LOGIN,
  FOCUS_NOTE,
  ERROR,
  REQUEST_WELCOME_PAGE
} from './utils/constants';

function profile(profile = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, profile, {
        email: action.loginDetails.profile.email,
        avatar: action.loginDetails.profile.avatar,
        avatarDefault: action.loginDetails.profile.avatarDefault,
        displayName: action.loginDetails.profile.displayName,
        locale: action.loginDetails.profile.locale
      });
    case DISCONNECTED:
      return Object.assign({}, profile, {
        email: null,
        avatar: null,
        avatarDefault: null,
        displayName: null,
        locale: null
      });
    default:
      return profile;
  }
}

function sync(sync = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, sync, {
        loginDetails: action.loginDetails,
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
        lastSynced: new Date(),
        isSyncing: true,
        error: null,
      });
    case DISCONNECTED:
      return Object.assign({}, sync, {
        loginDetails: null,
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
        error: null
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
        error: null
      });
    case RECONNECT_SYNC:
      return Object.assign({}, sync, {
        loginDetails: null,
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: true,
        error: null
      });
    case DELETE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: true,
        focusedNoteId: sync.focusedNoteId === action.id ? null : sync.focusedNoteId,
        error: null
      });
    case UPDATE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: true,
        error: null
      });
    case TEXT_SAVED:
      return Object.assign({}, sync, {
        isSyncing: sync.email ? sync.isSyncing : false
      });
    case TEXT_SYNCING:
      return Object.assign({}, sync, {
        isSyncing: true
      });
    case TEXT_SYNCED:
      return Object.assign({}, sync, {
        isSyncing: false,
        lastSynced: new Date()
      });
    case KINTO_LOADED:
      return Object.assign({}, sync, {
        isSyncing: false,
        lastSynced: new Date()
      });
    case FOCUS_NOTE:
      return Object.assign({}, sync, {
        focusedNoteId: action.id
      });
    // REQUEST_WELCOME_PAGE is triggered on start if redux has never been init.
    case REQUEST_WELCOME_PAGE:
      return Object.assign({}, sync, {
        welcomePage: true
      });
    case CREATE_NOTE:
      return Object.assign({}, sync, {
        welcomePage: false
      });
    case ERROR:
      return Object.assign({}, sync, {
        error: action.message
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

function notes(notes = [], action) {
  switch (action.type) {
    case KINTO_LOADED: {
      if (action.notes) {
        const list = Array.from(action.notes);
        list.map((note) => {
          note.firstLine = note.content;
          note.secondLine = note.content;
          if (!(note.lastModified instanceof Date)) {
            note.lastModified = note.lastModified ? new Date(note.lastModified) : new Date();
          }
        });
        return list;
      }
      return notes;
    }
    case TEXT_SYNCED: {

      if (!action.notes) return notes;

      const res = [];

      action.notes.forEach((note) => {
        res.push({
          id: note.id,
          content: note.content,
          firstLine: note.content,
          secondLine: note.content,
          lastModified: note.lastModified instanceof Date ? note.lastModified : new Date(note.lastModified)
        });
      });

      return res;
    }
    case CREATE_NOTE: {
      const list = Array.from(notes).filter((note) => note.id !== action.id);
      if (action.id) {
        list.push({
          id: action.id,
          content: action.content,
          firstLine: action.content,
          secondLine: action.content,
          lastModified: action.lastModified || new Date()
        });
      }
      return list;
    }
    case DELETE_NOTE:
      return Array.from(notes).filter((note) => note.id !== action.id);
    case UPDATE_NOTE: {
      const list = Array.from(notes);
      const note = list.find((note) => note.id === action.id);
      if (note) {
        note.content = action.content;
        note.firstLine = (action.content);
        note.secondLine = (action.content);
        note.lastModified = new Date(action.lastModified);
      } else if (action.id) {
        list.push({
          id: action.id,
          content: action.content,
          firstLine: (action.content),
          secondLine: (action.content),
          lastModified: new Date(action.lastModified)
        });
      }
      return list;
    }
    case DISCONNECTED:
      return [];
    default:
      return notes;
  }
}

const noteApp = combineReducers({
  profile,
  sync,
  kinto,
  notes
});

export default noteApp;
