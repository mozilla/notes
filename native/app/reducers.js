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
  REQUEST_WELCOME_PAGE
} from './utils/constants';


function notes(notes = [], action) {
  switch (action.type) {
    case CREATE_NOTE: {
      const list = Array.from(notes);
      list.push({
        id: action.id,
        content: action.content,
        firstLine: action.content,
        secondLine: action.content,
        lastModified: new Date()
      });
      return list;
    }
    default:
      return notes;
  }
}

const noteApp = combineReducers({
  notes
});

export default noteApp;
