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
  PROPAGATE_REDUX
} from './utils/constants';

function sync(sync = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, sync, {
        email: action.email
      });
    case DISCONNECTED:
      return Object.assign({}, sync, {
        email: null
      });
    case PROPAGATE_REDUX:
      return Object.assign({}, sync, action.state.sync);
    default:
      return sync;
  }
}

function kinto(kinto = {}, action) {
  switch (action.type) {
    case KINTO_LOADED:
      return Object.assign({}, kinto, {
        loaded: true
      });
    case PROPAGATE_REDUX:
      return Object.assign({}, kinto, action.state.kinto);
    default:
      return kinto;
  }
}

function note(note = {content: ''}, action) {
  switch (action.type) {
    case TEXT_CHANGE:
      return Object.assign({}, note, {
        content: action.content,
        lastModified: new Date()
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
    case PROPAGATE_REDUX:
      return Object.assign({}, note, action.state.note);
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
