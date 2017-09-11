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


function loadFromKinto(client) {
  // Get credentials and lastmodified
  browser.storage.local.get(['credentials', 'contentWasSynced', 'last_modified'])
    .then((data) => {
      // XXX: Ask for an refresh token
      // Query Kinto with the Bearer Token
      if (!data.hasOwnProperty('credentials')) return;

      client
        .bucket('default')
        .collection('notes')
        .getRecord('singleNote', {
          headers: { Authorization: `Bearer ${data.credentials.access_token}` }
        })
        .then(result => {
          if (!data.hasOwnProperty('last_modified') ||
              result.data.last_modified > data.last_modified) {
            // If there is something in Kinto send unencrypted content to the sidebar
            return decrypt(data.credentials.key, result['data']['content'])
              .then(content => {
                browser.runtime.sendMessage({
                  action: 'kinto-loaded',
                  data: content,
                  contentWasSynced: !!data.contentWasSynced,
                  last_modified: data.last_modified
                });
              })
              .catch(() => {
                // In case we cannot decrypt the message
                if (data.credentials.key.kid < result.data.kid) {
                  // If the key date is greater than current one, log the user out.
                  return browser.storage.local.remove('credentials');
                } else {
                  // If the key date is older than the current one, we can't help
                  // because there is no way we get the previous key.
                  // Flush the server ALA sync
                  return client
                    .bucket('default')
                    .collection('notes')
                    .deleteRecord('singleNote', {
                      headers: { Authorization: `Bearer ${data.credentials.access_token}` }
                    });
                }
              });
          }
        })
        .catch(error => {
          if (/HTTP 404/.test(error.message)) {
            // If there is nothing in Kinto send null to the sidebar
            console.log('Kinto is emtpy');
            browser.runtime.sendMessage({
              action: 'kinto-loaded',
              data: null
            });
          } else if (/HTTP 401/.test(error.message)) {
            // In case of 401 log the user out.
            return browser.storage.local.remove('credentials');
          } else {
            console.error(error);
          }
        });
    });
}

function saveToKinto(client) {
  // XXX: Debounce the call and set the status to Editing
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    timeouts['saveToKinto'] = null;

    browser.storage.local.get(['credentials', 'notes', 'contentWasSynced'])
      .then(data => {
        if (!data.contentWasSynced && data.hasOwnProperty('credentials')) {
          return encrypt(data.credentials.key, data.notes)
            .then(encrypted => {
              return client
                .bucket('default')
                .collection('notes')
                .updateRecord(
                  { id: 'singleNote', content: encrypted, kid: data.credentials.key.kid },
                  { headers: { Authorization: `Bearer ${data.credentials.access_token}` } }
                );
            })
            .then((body) => {
              console.log('Content was synced at ' + body.data.last_modified);
              return browser.storage.local.set({ contentWasSynced: true,
                                                 last_modified: body.data.last_modified })
                .then(() => {
                  browser.runtime.sendMessage('notes@mozilla.com', {
                    action: 'text-synced',
                    last_modified: body.data.last_modified,
                  });
                });
            })
            .catch(error => {
              if (/HTTP 401/.test(error.message)) {
                // In case of 401 log the user out.
                return   browser.storage.local.remove(['credentials']).then(() => {
                  return browser.storage.local.set({ contentWasSynced: false });
                });
              } else {
                console.error(error);
              }
            });
        } else {
          browser.runtime.sendMessage('notes@mozilla.com', {
            action: 'text-saved'
          });
        }
      });
  };

  clearTimeout(timeouts['saveToKinto']);
  timeouts['saveToKinto'] = setTimeout(later, 1000);
  // XXX: Set the status to syncing
  // XXX: Try to save the new content with the previous last_modified value
  // XXX: If it succeed set the status to Synced...
  // XXX: If it failed loadFromKinto and handle merge
}
