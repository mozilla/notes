import {
  createStore,
  applyMiddleware
} from 'redux';

import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web and AsyncStorage for react-native

import thunkMiddleware from 'redux-thunk';
import rootReducer from './reducers';

const storeState = store => next => action => {
  return next(action);
};

const persistConfig = {
  key: 'root',
  storage,
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

let store = createStore(
  persistedReducer,
  applyMiddleware(
    storeState,
    thunkMiddleware,
  )
);
let persistor = persistStore(store);

export { store, persistor };
