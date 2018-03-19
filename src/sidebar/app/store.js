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
