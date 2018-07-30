import {
  kintoLoad,
  textSynced
} from '../actions';
import { store } from '../store';
import browser from '../browser';
import { trackEvent } from './metrics';
import striptags from 'striptags';

const fxaUtils = require('../vendor/fxa-utils');
const fxaCryptoRelier = require('../vendor/fxa-crypto-relier');

import {
  RECONNECT_SYNC,
  TEXT_SYNCING,
  ERROR as ERROR_MSG } from './constants';

const jose = fxaCryptoRelier.OAuthUtils.__util.jose;

let syncDebounce = null;

function encrypt(key, content) {
  const jwkKey = {
    kty: key.kty,
    k: key.k,
    kid: key.kid
  };
  return jose.JWK.asKey(jwkKey).then((k) => {
    return jose.JWE.createEncrypt({ format: 'compact' }, jwkKey)
      .update(JSON.stringify(content), 'utf-8')
      .final()
      .then(function(result) {
        return result;
      });
  });
}

function decrypt(key, encrypted) {
  const jwkKey = {
    kty: key.kty,
    k: key.k,
    kid: key.kid
  };

  return jose.JWK.asKey(jwkKey).then((k) => {
    return jose.JWE.createDecrypt(k.keystore)
      .decrypt(encrypted)
      .then(function(result) {
        return JSON.parse(result.payload.toString());
      });
  });
}

// An "id schema" used to validate Kinto IDs and generate new ones.
const notesIdSchema = { // eslint-disable-line no-unused-vars
                        // We do not generate ID to keep retrocompatibility with single note version.
  generate() {
    throw new Error('cannot generate IDs');
  },

  validate() {
    return true;
  },
};

class ServerKeyNewerError extends Error {
  constructor() {
    super('key used to encrypt the record appears to be newer than our key');
  }
}

class ServerKeyOlderError extends Error {
  constructor() {
    super('key used to encrypt the record appears to be older than our key');
  }
}

const deletedNotesStillOnServer = {};

class JWETransformer {
  constructor(key) {
    this.key = key;
  }

  async encode(record) {
    // FIXME: should we try to obfuscate the record ID?
    const ciphertext = await encrypt(this.key, record);
    // Copy over the _status field, so that we handle concurrency
    // headers (If-Match, If-None-Match) correctly.
    const encryptedResult = {
      content: ciphertext,
      id: record.id,
      _status: record._status,
      kid: this.key.kid,
    };
    if (record.hasOwnProperty('last_modified')) {
      encryptedResult.last_modified = record.last_modified;
    }

    return encryptedResult;
  }

  async decode(record) {
    if (!record.content) {
      // This can happen for tombstones if a record is deleted.
      if (record.deleted) {
        record.last_modified = Date.now();
        record.lastModified = new Date(record.last_modified);
        return record;
      }

      record.content = '';
      //throw new Error('No ciphertext: nothing to decrypt?');
    }

    if (record.kid !== this.key.kid) {
      if (this.key.kid < record.kid) {
        throw new ServerKeyNewerError();
      } else {
        throw new ServerKeyOlderError();
      }
    }

    const decoded = await decrypt(this.key, record.content);
    if (record.hasOwnProperty('last_modified')) {
      decoded.last_modified = record.last_modified;
    }

    // If note has no lastModified (like singleNote from v3), we use kinto last_modified value.
    // kinto last_modified is a timestamp
    if (!decoded.lastModified && decoded.last_modified) {
      decoded.lastModified = new Date(decoded.last_modified);
    }

    if (!decoded.last_modified) {
      decoded.last_modified = Date.now();
      decoded.lastModified = new Date(decoded.last_modified);
    }

    // _status: deleted records were deleted on a client, but
    // uploaded as an encrypted blob so we don't leak deletions.
    // If we get such a record, flag it as deleted.
    if (decoded._status === 'deleted') {
      decoded.deleted = true;
      // On decode, we flag notes with _status deleted but still on server.
      // We automatically will request deletion for those.
      // (This is due to singleNote replacing 'deleted' state by 'updated')
      // Should be deleted when every user who tried beta runned it once.
      // (see metrics deleteDeleted)
      deletedNotesStillOnServer[decoded.id] = decoded;
    }
    return decoded;
  }
}

/**
 * Interface describing a mechanism to fetch credentials.
 */
class Credentials {
  async get() {
    return Promise.reject('Implement me');
  }

  /**
   * Call this if, for example, credentials were invalid.
   */
  async clear() {
    return Promise.reject('Implement me');
  }
}

class BrowserStorageCredentials extends Credentials { // eslint-disable-line no-unused-vars
  constructor(storage) {
    super();
    this.storage = storage;
  }

  async get() {
    const data = await this.storage.get(['credentials']);
    return data.credentials;
  }

  async set(credentials) {
    return this.storage.set({credentials});
  }

  async clear() {
    return this.storage.remove('credentials');
  }
}


/**
 * Try to sync our data against the Kinto server.
 *
 * Returns a promise. The promise can reject in case of sync failure
 * or any other reason. This is so that programming errors can be
 * caught more easily in testing. Since this application is
 * offline-first, sync failure should not be a failure for callers.
 */
let lastSyncTimestamp = null;

function syncKinto(client, loginDetails) {
  // If device is offline, we skip syncing.
  if (store.getState().sync.isConnected === false) return Promise.resolve();

  if (!loginDetails) { return Promise.reject(); }

  browser.runtime.sendMessage({
    action: TEXT_SYNCING
  });

  // Get credentials and lastmodified
  let collection, credential;
  return Promise.resolve()
    .then(() => {
      return fxaUtils.fxaRenewCredential(loginDetails)
        .then((loginDetails) => {
          const key = loginDetails.keys['https://identity.mozilla.com/apps/notes'];
          credential = {
            accessToken: loginDetails.oauthResponse.accessToken,
            key
          };
          // Query Kinto with the Bearer Token
          collection = client
            .collection('notes', {
              idSchema: notesIdSchema,
              remoteTransformers: [new JWETransformer(credential.key)],
            });
          return collection
            .sync({
              headers: {Authorization: `Bearer ${credential.accessToken}`},
              strategy: 'manual',
              lastModified: lastSyncTimestamp // eslint-disable-line no-undef
            })
            .catch((error) => {
              if (error.response && error.response.status === 500) {
                // issue #827
                return Promise.resolve({
                  conflicts: []
                });
              }
              throw error;
            });
      });
    })
    .then(syncResult => {
      store.dispatch(textSynced());

      lastSyncTimestamp = new Date().getTime(); // eslint-disable-line no-undef

      // FIXME: Do we need to do anything with errors, published,
      // updated, etc.?
      if (syncResult && syncResult.conflicts.length > 0) {
        return Promise.all(syncResult.conflicts.map(conflict => {
          let resolution;
          // If we receive conflict with singleNote, we update
          if (conflict.remote === null) {
            resolution = {
              id: conflict.local.id,
              content: conflict.local.content,
              lastModified: conflict.local.lastModified
            };
          } else {
            resolution = {
              id: conflict.remote.id,
              content: conflict.remote.content
            };

            // If content is different we merge both.
            // Could be difference on lastModified Date.
            if (conflict.remote.content !== conflict.local.content) {
              const mergeWarning = browser.i18n.getMessage('mergeWarning');
              if (resolution.content === undefined) {
                resolution.content = conflict.local.content;
              } else {
                resolution.content = `${resolution.content}<p>${mergeWarning}</p>${conflict.local.content}`;
              }
            }

            // We get earlier date for resolved conflict.
            if (conflict.local.lastModified > conflict.remote.lastModified) {
              resolution.lastModified = conflict.local.lastModified;
            } else {
              resolution.lastModified = conflict.remote.lastModified;
            }

            // If they both got deleted we remove them.
            if (conflict.remote.deleted && conflict.local.deleted) {
              resolution.deleted = true;
            }
            client.conflict = true;
            trackEvent('handle-conflict'); // eslint-disable-line no-undef
          }
          return collection.resolve(conflict, resolution);
        }))
        .then(() => {
          return syncKinto(client, loginDetails);
        });
      } else if (syncResult === undefined) {
        throw new Error('syncResult is undefined.');
      }
    })
    .catch(error => {
      if (error.response && error.response.status === 401) {
        // In case of 401 log the user out.
        // FIXME: Fetch a new token and retry?
        return reconnectSync(loginDetails, client);

        // NOTE: we cannot use `instanceof ServerKeyNewerError` below in React Native
      } else if (error.message === 'key used to encrypt the record appears to be newer than our key') {
        // If the key date is greater than current one, log the user out.
        //console.error(error); // eslint-disable-line no-console
        return reconnectSync(loginDetails, client);
      } else if (error.message === 'key used to encrypt the record appears to be older than our key') {
        // If the key date is older than the current one, we can't help
        // because there is no way we get the previous key.
        // Flush the server because whatever was there is wrong.
        //console.error(error); // eslint-disable-line no-console
        lastSyncTimestamp = null; // eslint-disable-line no-undef
        const kintoHttp = client.api;
        return kintoHttp.bucket('default').deleteCollection('notes', {
          headers: { Authorization: `Bearer ${credential.accessToken}` }
        }).then(() => collection.resetSyncStatus())
          .then(() => syncKinto(client, loginDetails));
      } else if (error.message.includes('flushed')) {
        lastSyncTimestamp = null; // eslint-disable-line no-undef
        return collection.resetSyncStatus()
          .then(() => {
            return syncKinto(client, loginDetails);
          });
      } else if (error.message.includes('syncResult is undefined')) {
        return Promise.resolve(null);
      } else if (error.message === 'Failed to renew token') {
        // cannot refresh the access token, log the user out.
        return reconnectSync(loginDetails, client);
      } else if (error.response
                && error.response.status === 507
                && error.message.includes('Insufficient Storage')) {

        // cannot refresh the access token, log the user out.
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: ERROR_MSG,
          message: browser.i18n.getMessage('insufficientStorage')
        });
        return Promise.reject(error);
      } else if (error.message.includes('Network request failed')) {
        reconnectSync(loginDetails, client);
        return Promise.reject(error);
      }
      console.error(error); // eslint-disable-line no-console
      reconnectSync(loginDetails, client);
      return Promise.reject(error);
    });
}

function reconnectSync(loginDetails, client) {
  // credentials.clear();
  lastSyncTimestamp = null; // eslint-disable-line no-undef

  const notes = client.collection('notes', { idSchema: notesIdSchema });
  notes.resetSyncStatus();

  browser.runtime.sendMessage('notes@mozilla.com', {
    action: RECONNECT_SYNC
  });
}

function retrieveNote(client) {
  return client
    .collection('notes', { idSchema: notesIdSchema })
    .list();
}

/**
 * Try to sync against the Kinto server, and retrieve the current note
 * contents.
 *
 * On completion, a 'kinto-loaded' event will be fired with the
 * following structure:
 *
 * {
 *   action: 'kinto-loaded',
 *   data: the "content" that was previously saved to Kinto, or null
 *     if nothing was previously saved to Kinto (for example, a new
 *     FxA account, or if syncing failed on a fresh profile)
 *   last_modified: the timestamp of the sync, or null
 * }
 */
function loadFromKinto(client, loginDetails) { // eslint-disable-line no-unused-vars
  return syncKinto(client, loginDetails)
    // Ignore failure of syncKinto by retrieving note even when promise rejected
    .then(() => retrieveNote(client));
}

function saveToKinto(client, loginDetails, note) { // eslint-disable-line no-unused-vars

  // We do not store empty notes on server side.
  if (note.content === '') { return Promise.resolve(); }

  let resolve, reject;

  const promise = new Promise((thisResolve, thisReject) => {
    resolve = thisResolve;
    reject = thisReject;
  });

  const notes = client.collection('notes', { idSchema: notesIdSchema });
  notes.upsert(note).then(() => {

    const later = function() {
      browser.runtime.sendMessage('notes@mozilla.com', {
        action: TEXT_SYNCING
      });

      trackEvent('changed', {
        cm1: striptags(note.content).length,
        cm2: (striptags(note.content.replace(/<\/p>|<\/li>/gi, '\n')).match(/\n/g) || []).length,
        cm3: null, // Size of change
      });

      client.conflict = false;
      syncDebounce = null;
      return syncKinto(client, loginDetails)
        .then(() => retrieveNote(client))
        .then((result) => {
          resolve(result.data.find((n) => n.id === note.id), client.conflict);
        })
        .catch((error) => {
          reject(error)
        });
    };
    clearTimeout(syncDebounce);
    syncDebounce = setTimeout(later, 2000);
  });

  return promise;
}

function createNote(client, loginDetails, note) { // eslint-disable-line no-unused-vars
  return client
    .collection('notes', { idSchema: notesIdSchema })
    .create(note, { useRecordId: true })
    .then(() => {
      clearTimeout(syncDebounce);
      syncDebounce = setTimeout(() => {
        syncKinto(client, loginDetails).catch(() => {
          return Promise.resolve();
        })
      }, 2000);
      return Promise.resolve();
    })
    .catch((error) => {
      // syncKinto handle errors by sending an ERROR message to background
      return Promise.resolve();
    });
}

function deleteNotes(client, loginDetails, ids, origin) { // eslint-disable-line no-unused-vars

  const promises = [];

  ids.forEach((id) => {
    promises.push(client.collection('notes', { idSchema: notesIdSchema }).delete(id).then(() => {
      trackEvent('delete-note', {
        el: origin
      });
    }));
  });

  return Promise.all(promises).then(() => {
    return syncKinto(client, loginDetails);
  }).catch(() => {
    return Promise.resolve();
  });
}

function clearKinto(client) {
  lastSyncTimestamp = null;
  const notes = client.collection('notes', { idSchema: notesIdSchema });
  return notes.clear().then(() => {
      return notes.resetSyncStatus();
    });
}

module.exports = {
  createNote,
  deleteNotes,
  loadFromKinto,
  retrieveNote,
  reconnectSync,
  saveToKinto,
  clearKinto
};
