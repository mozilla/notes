import { createStore, applyMiddleware } from 'redux';
import notesApp from './reducers';
// import { PROPAGATE_REDUX, TEXT_CHANGE } from './utils/constants';
/**
 * `Propage` function insure data sync between multiple instance of Notes
 */

// let id = 0;

const propagate = store => next => action => {
  // let result = null;
  // if (action.type === PROPAGATE_REDUX) {
  //   if (action.id <= id) {
  //     id = action.id;
  //   } else {
  //     // Override state
  //     id = action.id;
  //     result = next(action);
  //   }
  // } else {
  //   result = next(action);
  //   id = id + 1; // Avoid infinite loop

  //   if (action.type === TEXT_CHANGE) {
  //     chrome.runtime.sendMessage({
  //       action: PROPAGATE_REDUX,
  //       id,
  //       state: store.getState()
  //     });
  //   }
  // }
  // if (result) {
  //   return result;
  // }

  return next(action);
};

const store = createStore(
    notesApp,
    applyMiddleware(propagate)
);

export default store;
