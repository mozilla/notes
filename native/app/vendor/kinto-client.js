import { KINTO_SERVER_URL } from '../utils/constants';

// IndexedDB shim begins
// See https://github.com/axemclion/IndexedDBShim/issues/313#issuecomment-361593309

// Make indexeddbshim happy with React Native's environment
if (global.window.navigator.userAgent === undefined) {
  global.window.navigator = { ...global.window.navigator, userAgent: '' };
}

// Import native SQLite
const SQLite = require('react-native-sqlite-2').default;

global.window.openDatabase = SQLite.openDatabase;

const setGlobalVars = require('indexeddbshim');
setGlobalVars({
  win: SQLite
}, { checkOrigin: false });

//global.shimIndexedDB.__setConfig({ checkOrigin: false });

const Kinto = require('./kinto');
const client = new Kinto({
  remote: KINTO_SERVER_URL,
  bucket: 'default',
});

export default client;
