import { combineReducers } from 'redux';
import {
  SYNC_AUTHENTICATED,
  DISCONNECTED,
  TEXT_SYNCED,
  KINTO_LOADED,
  OPENING_LOGIN,
  RECONNECT_SYNC,
  CREATE_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  PLEASE_LOGIN,
  FOCUS_NOTE,
  SEND_TO_NOTES,
  ERROR,
  REQUEST_WELCOME_PAGE
} from './utils/constants';

import { getFirstLineFromContent, stripHtmlWithoutFirstLine } from './utils/utils';

function sync(sync = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, sync, {
        isOpeningLogin: false,
        isPleaseLogin: false,
        isReconnectSync: false,
        email: action.email,
        lastSynced: new Date(),
        isSyncing: true,
        error: null
      });
    case DISCONNECTED:
      return Object.assign({}, sync, {
        email: null,
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
        email: null,
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
          note.firstLine = getFirstLineFromContent(note.content);
          note.secondLine = stripHtmlWithoutFirstLine(note.content);
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
          firstLine: getFirstLineFromContent(note.content),
          secondLine: stripHtmlWithoutFirstLine(note.content),
          lastModified: note.lastModified instanceof Date ? note.lastModified : new Date(note.lastModified)
        });
      });

      return res;
    }
    case CREATE_NOTE: {
      const list = Array.from(notes);
      list.push({
        id: action.id,
        content: action.content,
        firstLine: getFirstLineFromContent(action.content),
        secondLine: stripHtmlWithoutFirstLine(action.content),
        lastModified: new Date()
      });
      return list;
    }
    case DELETE_NOTE:
      return Array.from(notes).filter((note) => note.id !== action.id);
    case UPDATE_NOTE: {
      const list = Array.from(notes);
      const note = list.find((note) => {
        return note.id === action.id;
      });
      if (note) {
        note.content = action.content;
        note.firstLine = getFirstLineFromContent(action.content);
        note.secondLine = stripHtmlWithoutFirstLine(action.content);
        note.lastModified = new Date(action.lastModified);
      }
      return list;
    }
    case SEND_TO_NOTES: {
      const list = Array.from(notes);
      const note = list.find((note) => {
        return note.id === action.id;
      });
      if (note) {
        if (note.content === '<p>&nbsp;</p>') note.content = '';
        note.content = note.content + `<p>${action.content}</p>`;
        note.lastModified = new Date();
      }
      return list;
    }
    default:
      return notes;
  }
}

const noteApp = combineReducers({
  sync,
  kinto,
  notes
});

export default noteApp;
