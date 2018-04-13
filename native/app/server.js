import store from './store';
import kintoClient from './vendor/kinto-client';
import fxaUtils from './vendor/fxa-utils';

import {
  actionDeleteNote, actionDeletedNote
} from './actions';

import {
  deleteNote
} from './utils/sync.js';

class Server {
  constructor() {
    super();
  }

  load() {
    return Promise.resolve();
  }

  create(note) {

  }

  delete(note) {
    return new Promise((resolve) => {
      store.dispatch(actionDeleteNote(note.id);
      fxaUtils.fxaGetCredential().then((loginDetails) => {
        deleteNote(kintoClient, loginDetails, note.id).then(() => {
          store.dispatch(actionDeletedNote(note.id));
          resolve();
        });
      });
    });
  }

  update(note) {

  }
}

const server = new Server();

export default server;
