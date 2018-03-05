
import { createStore, applyMiddleware } from 'redux';
import notesApp from './reducers';

// On every change we send new state to background.
const propagate = store => next => action => {
  const result = next(action);
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'propagate-redux',
    state: store.getState()
  });
  return result;
};

const store = createStore(
    notesApp,
    applyMiddleware(propagate)
);

export default store;
