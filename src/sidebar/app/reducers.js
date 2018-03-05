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

function sync(state = {}, action) {
  switch (action.type) {
    case SYNC_AUTHENTICATED:
      return Object.assign({}, state, {
        email: action.email
      });
    case DISCONNECTED:
      return Object.assign({}, state, {
        email: null
      });
    case PROPAGATE_REDUX:
      return Object.assign({}, state, action.state.sync);
    default:
      return state;
  }
}

function kinto(state = {}, action) {
  switch (action.type) {
    case KINTO_LOADED:
      return Object.assign({}, state, {
        loaded: true
      });
    case PROPAGATE_REDUX:
      return Object.assign({}, state, action.state.kinto);
    default:
      return state;
  }
}

function note(state = {content: ''}, action) {
  switch (action.type) {
    case TEXT_CHANGE:
      return Object.assign({}, state, {
        content: action.content,
        lastModified: new Date()
      });
    case TEXT_SYNCED:
      return Object.assign({}, state, {
        lastSynced: action.date,
        isSyncing: false
      });
    case TEXT_SAVED:
      return Object.assign({}, state, {
        lastSaved: new Date(),
        isSaving: false
      });
    case TEXT_SYNCING:
      return Object.assign({}, state, {
        isSyncing: true
      });
    case TEXT_EDITING:
      return Object.assign({}, state, {
        isSaving: true
      });
    case SEND_TO_NOTES:
      return Object.assign({}, state, {
        content: state.content + '<p>' + action.content.replace(/\n\n/g, '</p><p>') + '</p>'
      });
    case PROPAGATE_REDUX:
      return Object.assign({}, state, action.state.note);
    default:
      return state;
  }
}

const noteApp = combineReducers({
  sync,
  kinto,
  note
});

export default noteApp;
