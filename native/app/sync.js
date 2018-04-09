import {
  kintoLoad
} from './actions';
import store from './store';

const fxaUtils = require('./vendor/fxa-utils');
const fxaCryptoRelier = require('./vendor/fxa-crypto-relier');
// TODO WARNING: `jose` is not in the official release in the crypto-relier
const jose = fxaCryptoRelier.OAuthUtils.__util.jose;

const browser = {
  runtime: {
    sendMessage: () => {
      console.log('sendMessage', arguments);
    }
  }
};

let syncDebounce = null;

function encrypt(key, content) {
  const jwkKey = {
    kty: key.kty,
    k: key.k,
    kid: key.kid
  };

  // TODO: THIS HAS NOT BEEN TESTED
  return jose.JWK.asKey(jwkKey).then((k) => {

    return jose.JWE.createEncrypt(k.keystore)
      .update(JSON.stringify(content))
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
        return record;
      }
      throw new Error('No ciphertext: nothing to decrypt?');
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
function syncKinto(client, loginDetails) {
  // Get credentials and lastmodified
  let collection, credential;
  return Promise.resolve()
    .then(() => {
      return fxaUtils.fxaRenewCredential(loginDetails)
        .then((loginDetails) => {
          const key = loginDetails.keys['https://identity.mozilla.com/apps/notes'];
          const credential = {
            accessToken: loginDetails.oauthResponse.accessToken,
            refreshToken: loginDetails.oauthResponse.refreshToken,
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
              resolution.content =
                `${resolution.content}<p>${mergeWarning}</p>${conflict.local.content}`;
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
            sendMetrics('handle-conflict'); // eslint-disable-line no-undef
          }
          return collection.resolve(conflict, resolution);
        }))
          .then(() => {
            return syncKinto(client, credentials);
          });
      } else if (syncResult === undefined) {
        throw new Error('syncResult is undefined.');
      }
    })
    .catch(error => {
      // TODO: WORK IN PROGRESS
      console.log('errr', error);
      // if (error.response && error.response.status === 401) {
      //   // In case of 401 log the user out.
      //   // FIXME: Fetch a new token and retry?
      //   return reconnectSync(credentials);
      // } else if (error instanceof ServerKeyNewerError) {
      //   // If the key date is greater than current one, log the user out.
      //   console.error(error); // eslint-disable-line no-console
      //   return reconnectSync(credentials);
      // } else if (error instanceof ServerKeyOlderError) {
      //   // If the key date is older than the current one, we can't help
      //   // because there is no way we get the previous key.
      //   // Flush the server because whatever was there is wrong.
      //   console.error(error); // eslint-disable-line no-console
      //   const kintoHttp = client.api;
      //   return kintoHttp.bucket('default').deleteCollection('notes', {
      //     headers: { Authorization: `Bearer ${credential.accessToken}` }
      //   }).then(() => collection.resetSyncStatus())
      //     .then(() => syncKinto(client, credentials));
      // } else if (error.message.includes('flushed')) {
      //   return collection.resetSyncStatus()
      //     .then(() => {
      //       return syncKinto(client, credentials);
      //     });
      // } else if (error.message.includes('syncResult is undefined')) {
      //   return Promise.resolve(null);
      // } else if (error.message === 'Failed to renew token') {
      //   // cannot refresh the access token, log the user out.
      //   return reconnectSync(credentials);
      // } else if (error.response
      //   && error.response.status === 507
      //   && error.message.includes('Insufficient Storage')) {
      //
      //   // cannot refresh the access token, log the user out.
      //   browser.runtime.sendMessage('notes@mozilla.com', {
      //     action: 'error',
      //     message: browser.i18n.getMessage('insufficientStorage')
      //   });
      //   return Promise.reject(error);
      // }
      // console.error(error); // eslint-disable-line no-console
      // reconnectSync(credentials);
      return Promise.reject(error);
    });
}

function reconnectSync(credentials) {
  credentials.clear();
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'reconnect'
  });
}

function retrieveNote(client) {
  return client
    .collection('notes', { idSchema: notesIdSchema })
    .list({})
    .then((list) => {
      // We delete all notes retrieved from server and not properly deleted
      Object.keys(deletedNotesStillOnServer).forEach((id) => {
        client.collection('notes', { idSchema: notesIdSchema }).deleteAny(id);
      });

      return list;
    });
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
    .then(() => retrieveNote(client), () => retrieveNote(client))
    .then(result => {
      store.dispatch(kintoLoad(result && result.data));
    })
    .catch((e) => {
      store.dispatch(kintoLoad());
      return new Promise((resolve) => resolve());
    });
}

function saveToKinto(client, credentials, note, fromWindowId) { // eslint-disable-line no-unused-vars
  let resolve;
  // We do not store empty notes on server side.
  if (note.content === '') { return Promise.resolve(); }

  const promise = new Promise(thisResolve => {
    resolve = thisResolve;
  });

  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    syncDebounce = null;
    const notes = client.collection('notes', { idSchema: notesIdSchema });
    return notes.upsert(note)
      .then((res) => {
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-saved',
          note: res ? res.data : undefined,
          from: fromWindowId
        });
        client.conflict = false;
        return syncKinto(client, credentials);
      })
      .then(() => retrieveNote(client), () => retrieveNote(client))
      .then(result => {
        // Set the status to synced
        return browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          note: result.data.find((n) => n.id === note.id),
          conflict: client.conflict,
          from: fromWindowId
        });
      })
      .then(() => {
        resolve();
      })
      .catch(result => {
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          note: undefined,
          conflict: client.conflict,
          from: fromWindowId
        });
        resolve();
      });
  };

  clearTimeout(syncDebounce);
  syncDebounce = setTimeout(later, 400);
  return promise;
}

function createNote(client, note) { // eslint-disable-line no-unused-vars
  return client
    .collection('notes', { idSchema: notesIdSchema })
    .create(note, { useRecordId: true });
}

function deleteNote(client, id) { // eslint-disable-line no-unused-vars
  return client.collection('notes', { idSchema: notesIdSchema }).deleteAny(id);
}

function disconnectFromKinto(client) { // eslint-disable-line no-unused-vars
  const notes = client.collection('notes', { idSchema: notesIdSchema });
  return notes.resetSyncStatus();
}

module.exports = {
  createNote,
  deleteNote,
  disconnectFromKinto,
  loadFromKinto,
  retrieveNote,
  reconnectSync,
  saveToKinto,
};
