import { combineReducers } from 'redux';
import { firstLine, secondLine } from './utils/utils';

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
  NET_INFO,
  TOGGLE_SELECT,
  RESET_SELECT,
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
        selected: null
      });
    case DISCONNECTED:
      return Object.assign({}, sync, {
        loginDetails: null,
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
        error: null,
        selected: null,
        isConnected: true
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
        isSyncingFrom: 'deleteNote',
        focusedNoteId: action.ids.includes(sync.focusedNoteId) ? null : sync.focusedNoteId,
        error: null,
        selected: null
      });
    case UPDATE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: false,
        isSyncingFrom: null,
        error: null
      });
    case TEXT_SAVED:
      return Object.assign({}, sync, {
        isSyncing: sync.email ? sync.isSyncing : false
      });
    case TEXT_SYNCING:
      return Object.assign({}, sync, {
        isSyncing: true,
        isSyncingFrom: sync.isSyncingFrom || action.from,
        error: null
      });
    case TEXT_SYNCED:
      return Object.assign({}, sync, {
        isSyncing: false,
        isSyncingFrom: null,
        lastSynced: new Date()
      });
    case KINTO_LOADED:
      return Object.assign({}, sync, {
        isSyncing: false,
        isSyncingFrom: null,
        lastSynced: new Date()
      });
    case FOCUS_NOTE:
      return Object.assign({}, sync, {
        focusedNoteId: action.id
      });
    case CREATE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: false
      });
    case ERROR:
      return Object.assign({}, sync, {
        error: action.message
      });
    case NET_INFO:
      return Object.assign({}, sync, {
        isConnected: action.isConnected
      });
    case TOGGLE_SELECT:
      const selected = Array.from(sync.selected || []);
      if (selected.includes(action.note.id)) {
        selected = selected.filter((note) => note !== action.note.id);
        if (selected.length === 0) selected = null;
      } else {
        selected.push(action.note.id);
      }
      return Object.assign({}, sync, {
        selected: selected
      });
    case RESET_SELECT:
      return Object.assign({}, sync, {
        selected: null
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
    case DISCONNECTED:
      return Object.assign({}, kinto, {
        isLoaded: false
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
          note.firstLine = firstLine(note.content);
          note.secondLine = secondLine(note.content);
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
          firstLine: firstLine(note.content),
          secondLine: secondLine(note.content),
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
          firstLine: firstLine(action.content),
          secondLine: secondLine(action.content),
          lastModified: action.lastModified || new Date()
        });
      }
      return list;
    }
    case DELETE_NOTE:
      return Array.from(notes).filter((note) => !action.ids.includes(note.id));
    case UPDATE_NOTE: {
      const list = Array.from(notes);
      const note = list.find((note) => note.id === action.id);
      if (note) {
        note.content = action.content;
        note.firstLine = firstLine(action.content);
        note.secondLine = secondLine(action.content);
        note.lastModified = new Date(action.lastModified);
      } else if (action.id) {
        list.push({
          id: action.id,
          content: action.content,
          firstLine: firstLine(action.content),
          secondLine: secondLine(action.content),
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
