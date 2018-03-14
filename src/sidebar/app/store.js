import { createStore, applyMiddleware } from 'redux';
import notesApp from './reducers';

const propagate = store => next => action => {
  return next(action);
};

const store = createStore(
    notesApp,
    applyMiddleware(propagate)
);

export default store;
