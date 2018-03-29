import {
  createStore,
  applyMiddleware
} from 'redux';
import thunkMiddleware from 'redux-thunk';
import notesApp from './reducers';

const storeState = store => next => action => {
  // On every state event, we store new state in local storage to
  // have a fast load on sidebar opening.
  browser.storage.local.set({
    redux: JSON.stringify(store.getState())
  });

  // We send to background.js our current sync status used for metrics cd10
  chrome.runtime.sendMessage({
    action: 'redux',
    sync: store.getState().sync
  });

  return next(action);
};

const store = createStore(
  notesApp,
  applyMiddleware(
    storeState,
    thunkMiddleware
  )
);

export default store;
