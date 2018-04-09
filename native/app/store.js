import {
  createStore,
  applyMiddleware
} from 'redux';
import thunkMiddleware from 'redux-thunk';
import notesApp from './reducers';

const storeState = store => next => action => {
  return next(action);
};

const store = createStore(
  notesApp,
  applyMiddleware(
    storeState,
    thunkMiddleware,
  )
);

export default store;
