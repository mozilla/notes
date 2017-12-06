/* exported loadFromKinto */
/* exported saveToKinto */
/* exported BrowserStorageCredentials */

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

class JWETransformer {
  constructor(key) {
    this.key = key;
  }

  async encode(record) {
    // FIXME: should we try to obfuscate the record ID?
    const ciphertext = await encrypt(this.key, record);
    // Copy over the _status field, so that we handle concurrency
    // headers (If-Match, If-None-Match) correctly.
    // DON'T copy over "deleted" status, because then we'd leak
    // plaintext deletes.
    const status = record._status && (record._status === 'deleted' ? 'updated' : record._status);
    const encryptedResult = {
      content: ciphertext,
      id: record.id,
      _status: status,
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

    let decoded = await decrypt(this.key, record.content);
    if (!decoded.hasOwnProperty('id')) {
      // Old-style encrypted notes aren't true Kinto records --
      // they're just the content field.
      decoded = {
        content: decoded,
        id: 'singleNote',
      };
    }
    if (record.hasOwnProperty('last_modified')) {
      decoded.last_modified = record.last_modified;
    }

    // _status: deleted records were deleted on a client, but
    // uploaded as an encrypted blob so we don't leak deletions.
    // If we get such a record, flag it as deleted.
    if (decoded._status === 'deleted') {
      decoded.deleted = true;
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

// class BrowserStorageCredentials extends Credentials {
//   constructor(storage) {
//     super();
//     this.storage = storage;
//   }
//
//   async get() {
//     const data = await this.storage.getItem('credentials');
//     return data.credentials;
//   }
//
//   async set(credentials) {
//     return this.storage.setItem('credentials', credentials);
//   }
//
//   async clear() {
//     return this.storage.remove('credentials');
//   }
// }

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
  credential = JSON.parse(window.localStorage.getItem('credentials'));

  if (!credential) return;

  return fxaRenewCredential(credential)
    .then((renewedCred) => {
      credential = renewedCred;
      window.localStorage.setItem('credentials', JSON.stringify(renewedCred));
    })
    .then(() => {
      console.log('cred555', JSON.stringify(credential))

// An "id schema" used to validate Kinto IDs and generate new ones.
      const notesIdSchema = {
        // FIXME: Maybe this should generate IDs?
        generate() {
          throw new Error('cannot generate IDs');
        },

        validate() {
          // FIXME: verify that at least this matches Kinto server ID format
          return true;
        },
      };
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
        });
    })
    .then(syncResult => {
      console.log('syncResult', syncResult)
      console.log('syncResult', JSON.stringify(syncResult))
      // FIXME: Do we need to do anything with errors, published,
      // updated, etc.?
      if (syncResult && syncResult.conflicts.length > 0) {
        return Promise.all(syncResult.conflicts.map(conflict => {
          console.log('Handling conflict', conflict);
          let totalOps = conflict.remote.content.ops.slice();
          totalOps.push({ insert: '\n====== On this computer: ======\n\n' });
          totalOps = totalOps.concat(conflict.local.content.ops);
          const resolution = {
            id: conflict.remote.id,
            content: {ops: totalOps},
          };
          return collection.resolve(conflict, resolution);
        }))
          .then(() => syncKinto(client, credentials));
      }
    })
    .catch(error => {
      console.log('syncResultError', JSON.stringify(error))
      console.log('syncResultError', error.name)
      console.log('syncResultError', error.message)
      if (error.response && error.response.status === 401) {
        // In case of 401 log the user out.
        // FIXME: Fetch a new token and retry?
        return credentials.clear();
      } else if (error instanceof ServerKeyNewerError) {
        // If the key date is greater than current one, log the user out.
        console.error(error);
        return credentials.clear();
      } else if (error instanceof ServerKeyOlderError) {
        // If the key date is older than the current one, we can't help
        // because there is no way we get the previous key.
        // Flush the server because whatever was there is wrong.
        console.error(error);
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
        return credentials.clear();
      } else {
        console.error(error);
        return Promise.reject(error);
      }
    });
}

function retrieveNote(client) {

// An "id schema" used to validate Kinto IDs and generate new ones.
  const notesIdSchema = {
    // FIXME: Maybe this should generate IDs?
    generate() {
      throw new Error('cannot generate IDs');
    },

    validate() {
      // FIXME: verify that at least this matches Kinto server ID format
      return true;
    },
  };

  return client.collection('notes', {
    idSchema: notesIdSchema,
  }).getAny('singleNote');
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
function loadFromKinto(client, credentials) {
  return syncKinto(client, credentials)
  // Ignore failure of syncKinto by retrieving note even when promise rejected
    .then(() => retrieveNote(client), () => retrieveNote(client))
    .then(result => {
      //console.log('Collection had record', result);
      //alert(JSON.stringify(result))
      //alert(JSON.stringify(result.data))
      return result.data
      //alert(result.data)
    }).catch((err) => {
      console.log('errrr', JSON.stringify(err));
      console.log('errrr', err.message);
      console.log('errrr', err.name);
    })
}

function saveToKinto(client, credentials, content) {
  let resolve;
  const promise = new Promise(thisResolve => {
    resolve = thisResolve;
  });

  // XXX: Debounce the call and set the status to Editing
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    syncDebounce = null;

// An "id schema" used to validate Kinto IDs and generate new ones.
    const notesIdSchema = {
      // FIXME: Maybe this should generate IDs?
      generate() {
        throw new Error('cannot generate IDs');
      },

      validate() {
        // FIXME: verify that at least this matches Kinto server ID format
        return true;
      },
    };
    const notes = client.collection('notes', {
      idSchema: notesIdSchema,
    });
    return notes.upsert({ id: 'singleNote', content })
      .then(() => {
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-saved'
        });
        return syncKinto(client, credentials);
      })
      .then(() => retrieveNote(client), () => retrieveNote(client))
      .then(result => {
        // Set the status to synced
        return browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          last_modified: result.data.last_modified,
        });
      })
      .then(() => {
        resolve();
      });
  };

  clearTimeout(syncDebounce);
  syncDebounce = setTimeout(later, 1000);
  return promise;
}


/* exported sendMetrics */
/**
 * Google Analytics / TestPilot Metrics
 */
const TRACKING_ID = 'UA-35433268-79';

const KINTO_SERVER = 'https://kinto-testpilot.stage.mozaws.net/v1';
// XXX: Read this from Kinto fxa-params
const FXA_CLIENT_ID = 'a3dbd8c5a6fd93e2';
const FXA_OAUTH_SERVER = 'https://oauth.accounts.firefox.com/v1';
const FXA_PROFILE_SERVER = 'https://profile.accounts.firefox.com/v1';
const FXA_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
const timeouts = {};

// Kinto sync and encryption

const client = new Kinto({remote: KINTO_SERVER, bucket: 'default'});

function authenticate() {
  const fxaKeysUtil = new fxaCryptoRelier.OAuthUtils({
    oauthServer: FXA_OAUTH_SERVER
  });
  // chrome.runtime.sendMessage({
  //   action: 'sync-opening'
  // });
  const browserApiCordova = {
    identity: {
      launchWebAuthFlow: function (options) {
        return new Promise(function (resolve) {
          const authWindow = window.open(options.url, '_blank', 'location=no,toolbar=no');
          authWindow.addEventListener('loadstart', function (e) {
            const url = e.url;
            const code = /code=(.+)$/.exec(url);
            const error = /error=(.+)$/.exec(url);

            if (code || error) {
              authWindow.close();
              resolve(url);
            }
          });
        });
      }
    }
  };

  fxaKeysUtil.launchWebExtensionKeyFlow(FXA_CLIENT_ID, {
    browserApi: browserApiCordova,
    redirectUri: 'https://dee85c67bd72f3de1f0a0fb62a8fe9b9b1a166d7.extensions.allizom.org',
    scopes: FXA_SCOPES,
  }).then((loginDetails) => {
    const key = loginDetails.keys['https://identity.mozilla.com/apps/notes'];
    //alert(JSON.stringify(key))
    //alert(JSON.stringify(loginDetails))
    const creds = {
      access_token: loginDetails.access_token,
      refresh_token: loginDetails.refresh_token,
      key,
      metadata: {
        server: FXA_OAUTH_SERVER,
        client_id: FXA_CLIENT_ID,
        scope: FXA_SCOPES
      }
    };
    console.log('Login succeeded', creds);

    fxaFetchProfile(FXA_PROFILE_SERVER, creds.access_token).then((profile) => {
      console.log(profile);
      //alert(JSON.stringify(profile));
      try {
        window.localStorage.setItem('credentials', JSON.stringify(creds));

        loadFromKinto(client, creds).then((data) => {
          document.querySelector('.ck-editor__main').innerHTML = data.content;
        });

        //loadFromKinto(client, credentials);
      } catch (e) {
        alert('sad');
        console.log(e)
        console.log(e.name)
        console.log(e.message)
      }
      // browser.storage.local.set({credentials}).then(() => {
      //   chrome.runtime.sendMessage({
      //     action: 'sync-authenticated',
      //     credentials,
      //     profile
      //   });
      // });
    });
  }, (err) => {
    alert(JSON.stringify(err))
    console.error('login failed', err);
    // chrome.runtime.sendMessage({
    //   action: 'authenticated',
    //   err: err
    // });
    throw err;
  });
}
// browser.runtime.onMessage.addListener(function(eventData) {
//   const credentials = new BrowserStorageCredentials(browser.storage.local);
//   switch (eventData.action) {
//     case 'authenticate':
//       credentials.get()
//         .then(result => {
//           if (!result) {
//             sendMetrics('webext-button-authenticate', eventData.context);
//             authenticate();
//           } else {
//             chrome.runtime.sendMessage({
//               action: 'text-syncing'
//             });
//             loadFromKinto(client, credentials);
//           }
//         });
//       break;
//     case 'disconnected':
//       sendMetrics('webext-button-disconnect', eventData.context);
//       credentials.clear();
//       break;
//     case 'kinto-load':
//       loadFromKinto(client, credentials);
//       break;
//     case 'kinto-save':
//       saveToKinto(client, credentials, eventData.content);
//       break;
//     case 'metrics-changed':
//       sendMetrics('changed', eventData.context);
//       break;
//     case 'metrics-drag-n-drop':
//       sendMetrics('drag-n-drop', eventData.context);
//       break;
//     case 'metrics-migrated':
//       sendMetrics('metrics-migrated', eventData.context);
//       break;
//     case 'metrics-migrated-before':
//       sendMetrics('metrics-migrated-before', eventData.context);
//       break;
//     case 'theme-changed':
//       sendMetrics('theme-changed', eventData.content);
//       browser.runtime.sendMessage({
//         action: 'theme-changed'
//       });
//       break;
//   }
// });


// Handle opening and closing the add-on.
function connected(p) {
  sendMetrics('open');

  p.onDisconnect.addListener(() => {
    sendMetrics('close');
  });
}
// browser.runtime.onConnect.addListener(connected);


const defaultTheme = {
  theme: 'default'
};
//
// browser.storage.local.get()
//   .then((storedSettings) => {
//     // if no theme setting exists...
//     if (!storedSettings.theme)
//     // set defaultTheme as initial theme in local storage
//       browser.storage.local.set(defaultTheme);
//   });
//

const enableSync = document.getElementById('enable-sync');
const exit = document.getElementById('give-feedback-button');

enableSync.onclick = () => {
  const creds = window.localStorage.getItem('credentials');
  if (creds) {
    loadFromKinto(client, JSON.parse(creds)).then((data) => {
      document.querySelector('.ck-editor__main').innerHTML = data.content;
    });
  } else {
    authenticate();
  }
};

var refreshy = function () {
  var creds = window.localStorage.getItem('credentials');
  if (creds) {
    loadFromKinto(client, JSON.parse(creds)).then((data) => {
      document.querySelector('.ck-editor__main').innerHTML = data.content;
    });
  }
  setTimeout(refreshy, 10000);
};

refreshy();


exit.onclick = () => {
  window.localStorage.removeItem('credentials')
  document.querySelector('.ck-editor__main').innerHTML = '';
  alert('Disconnected')
};
