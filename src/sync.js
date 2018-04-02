let syncDebounce = null;

const cryptographer = new Jose.WebCryptographer();
cryptographer.setKeyEncryptionAlgorithm('A256KW');
cryptographer.setContentEncryptionAlgorithm('A256GCM');

function shared_key(key) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, k: key.k.replace(/=/, '') },
    'AES-KW',
    true,
    ['wrapKey', 'unwrapKey']
  );
}

function encrypt(key, content) {
  const encrypter = new JoseJWE.Encrypter(cryptographer, shared_key(key));
  return encrypter.encrypt(JSON.stringify(content));
}

function decrypt(key, encrypted) {
  const decrypter = new JoseJWE.Decrypter(cryptographer, shared_key(key));
  return decrypter.decrypt(encrypted).then(result => {
    return JSON.parse(result);
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
function syncKinto(client, credentials) {
  // Get credentials and lastmodified
  let collection, credential;
  return credentials.get()
    .then(received => {
      credential = received;

      if (!received) return;

      return fxaRenewCredential(credential)
        .then((renewedCred) => {
          credential = renewedCred;
          return credentials.set(renewedCred);
        })
        .then(() => {
          // Query Kinto with the Bearer Token
          collection = client
            .collection('notes', {
              idSchema: notesIdSchema,
              remoteTransformers: [new JWETransformer(credential.key)],
            });
          return collection
            .sync({
              headers: {Authorization: `Bearer ${credential.access_token}`},
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
      if (error.response && error.response.status === 401) {
        // In case of 401 log the user out.
        // FIXME: Fetch a new token and retry?
        return reconnectSync(credentials);
      } else if (error instanceof ServerKeyNewerError) {
        // If the key date is greater than current one, log the user out.
        console.error(error); // eslint-disable-line no-console
        return reconnectSync(credentials);
      } else if (error instanceof ServerKeyOlderError) {
        // If the key date is older than the current one, we can't help
        // because there is no way we get the previous key.
        // Flush the server because whatever was there is wrong.
        console.error(error); // eslint-disable-line no-console
        const kintoHttp = client.api;
        return kintoHttp.bucket('default').deleteCollection('notes', {
          headers: { Authorization: `Bearer ${credential.access_token}` }
        }).then(() => collection.resetSyncStatus())
          .then(() => syncKinto(client, credentials));
      } else if (error.message.includes('flushed')) {
        return collection.resetSyncStatus()
          .then(() => {
            return syncKinto(client, credentials);
          });
      } else if (error.message.includes('syncResult is undefined')) {
        return Promise.resolve(null);
      } else if (error.message === 'Failed to renew token') {
        // cannot refresh the access token, log the user out.
        return reconnectSync(credentials);
      } else if (error.response
                && error.response.status === 507
                && error.message.includes('Insufficient Storage')) {

        // cannot refresh the access token, log the user out.
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'error',
          message: browser.i18n.getMessage('insufficientStorage')
        });
        return Promise.reject(error);
      }
      console.error(error); // eslint-disable-line no-console
      reconnectSync(credentials);
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
        sendMetrics('delete-deleted-notes'); // eslint-disable-line no-undef
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
function loadFromKinto(client, credentials) { // eslint-disable-line no-unused-vars
  return syncKinto(client, credentials)
    // Ignore failure of syncKinto by retrieving note even when promise rejected
    .then(() => retrieveNote(client), () => retrieveNote(client))
    .then(result => {
      browser.runtime.sendMessage({
        action: 'kinto-loaded',
        notes: result.data,
        last_modified: null
      });
    })
    .catch((e) => {
      browser.runtime.sendMessage({
        action: 'kinto-loaded',
        notes: null,
        last_modified: null
      });
      return new Promise((resolve) => resolve());
    });
}

function saveToKinto(client, credentials, note) { // eslint-disable-line no-unused-vars
  let resolve;

  // We do not store empty notes on server side.
  // They will be auotmatically deleted by listPanel component
  if (note.content === '') { return Promise.resolve(); }

  const promise = new Promise(thisResolve => {
    resolve = thisResolve;
  });

  // XXX: Debounce the call and set the status to Editing
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    syncDebounce = null;
    const notes = client.collection('notes', { idSchema: notesIdSchema });
    return notes.upsert(note)
      .then((res) => {

        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-saved'
        });
        client.conflict = false;
        return syncKinto(client, credentials);
      })
      .then(() => retrieveNote(client), () => retrieveNote(client))
      .then(result => {

        // Set the status to synced
        return browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          notes: result.data,
          conflict: client.conflict
        });
      })
      .then(() => {
        resolve();
      })
      .catch(result => {
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          notes: result.data,
          conflict: client.conflict
        });
        resolve();
      });
  };

  clearTimeout(syncDebounce);
  syncDebounce = setTimeout(later, 1000);
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

