const client = new KintoClient('https://kinto.dev.mozaws.net/v1');

const LOAD_FROM_KINTO_SECONDS_FREQUENCY = 60;
const STORE_TO_KINTO_SECONDS_FREQUENCY = 10;

const formats = [
  'bold',
  'font',
  'italic',
  'size',
  'strike',
  'header',
  'indent',
  'list'
];

const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar'
  },
  formats: formats // enabled formats, see https://github.com/quilljs/quill/issues/1108
});

const cryptographer = new Jose.WebCryptographer();
cryptographer.setKeyEncryptionAlgorithm('A256KW');
cryptographer.setContentEncryptionAlgorithm('A256GCM');

// Shared Key
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

function handleLocalContent(data) {
  if (!data.hasOwnProperty('notes')) {
    console.log('No local content. Loading default content.');
    quill.setContents({
      ops: [
        { attributes: { size: 'large', bold: true }, insert: 'Welcome!' },
        { insert: '\n\n' },
        {
          attributes: { size: 'large' },
          insert:
            'This is a simple one-page notepad built in to Firefox that helps you get the most out of the web.'
        },
        { insert: '\n\n' },
        { attributes: { size: 'large' }, insert: 'You can: ' },
        { insert: '\n\n' },
        { attributes: { size: 'large' }, insert: 'Format your notes' },
        { attributes: { list: 'ordered' }, insert: '\n' },
        {
          attributes: { size: 'large' },
          insert: 'Sync notes securely to your Firefox Account'
        },
        { attributes: { list: 'ordered' }, insert: '\n' },
        {
          attributes: { size: 'large' },
          insert: 'Sync them to our Android app: http://mzl.la/notes'
        },
        { attributes: { list: 'ordered' }, insert: '\n' }
      ]
    });
    // We don't want to merge the intro content.
    return browser.storage.local.set({ contentWasSynced: true });
  } else {
    if (JSON.stringify(quill.getContents()) !== JSON.stringify(data.notes)) {
      quill.setContents(data.notes);
      return browser.storage.local.set({ contentWasSynced: false });
    }
  }
}

function handleConflictsMerge(
  contentWasSynced,
  local,
  remote,
  remoteLastModified
) {
  console.log('Content', local, remote);
  if (
    local &&
    !contentWasSynced &&
    JSON.stringify(local) !== JSON.stringify(remote)
  ) {
    // Merge conflict
    console.log('Merge conflict');
    let newContent = JSON.parse(JSON.stringify(remote));
    newContent.ops.push({ insert: '\n==========\n\n' });
    newContent = newContent.ops.concat(local.ops);
    console.log('Merge conflict', newContent);
    // Set new content
    return browser.storage.local
      .set({ notes: newContent, lastModified: null, contentWasSynced: false })
      .then(() => {
        quill.setContents(newContent);
      });
  } else {
    return browser.storage.local
      .set({
        notes: remote,
        lastModified: remoteLastModified,
        contentWasSynced: true
      })
      .then(() => {
        if (JSON.stringify(quill.getContents()) !== JSON.stringify(remote)) {
          quill.setContents(remote);
        }
      });
  }
}

let lastRemoteLoad = -1;

function loadContent() {
  return browser.storage.local.get(
    ['bearer', 'keys', 'contentWasSynced', 'notes'],
    data => {
      // If we have a bearer, we try to save the content.
      console.log('Loading content.');
      if (
        data.hasOwnProperty('bearer') &&
        typeof data.bearer === 'string' &&
        lastRemoteLoad < Date.now() - LOAD_FROM_KINTO_SECONDS_FREQUENCY * 1000
      ) {
        console.log('Loading from Kinto');
        const bearer = data.bearer;
        const keys = data.keys;
        return client
          .bucket('default')
          .collection('notes')
          .getData({
            headers: { Authorization: `Bearer ${bearer}` }
          })
          .then(result => {
            lastRemoteLoad = Date.now();
            if (!result.hasOwnProperty('content')) {
              console.log('No remote content. Loading local content.');
              return browser.storage.local
                .set({ lastModified: result.last_modified })
                .then(() => {
                  return handleLocalContent(data);
                });
            } else {
              console.log('Encrypted Content:', result['content']);
              return decrypt(keys, result['content'])
                .then(content => {
                  handleConflictsMerge(
                    data.contentWasSynced,
                    data.notes,
                    content,
                    result.last_modified
                  );
                })
                .catch(err => {
                  console.error(err);
                  Promise.resolve(
                    browser.storage.local
                      .set({ lastModified: result.last_modified })
                      .then(() => {
                        return handleLocalContent(data);
                      })
                  );
                });
            }
          })
          .catch(err => {
            console.error(err);
            return handleLocalContent(data).then(() => {
              // Load local content and disconnect the user
              if (/HTTP 401/.test(err.message)) {
                return browser.storage.local
                  .remove(['data', 'bearer', 'lastModified'])
                  .then(() => {
                    return browser.storage.local.set({
                      contentWasSynced: false
                    });
                  });
              }
            });
          });
      } else {
        return handleLocalContent(data);
      }
    }
  );
}

loadContent();

let storageTimeout;

function storeToKinto(bearer, keys, content, lastModified) {
  const later = function() {
    // Tells other sidebar to avoid syncing
    chrome.runtime.sendMessage('notes@mozilla.com', { action: 'syncing' });
    storageTimeout = null;
    console.log('calling the client. Content: ', content);

    // Load the Key
    encrypt(keys, content)
      .then(encrypted => {
        console.log('Encrypted content:', encrypted);
        return client.bucket('default').collection('notes').setData(
          { content: encrypted, last_modified: lastModified },
          {
            headers: { Authorization: `Bearer ${bearer}` },
            safe: lastModified !== null
          }
        );
      })
      .then(() => {
        return browser.storage.local.set({ contentWasSynced: true });
      })
      .catch(err => {
        console.error(err);
        if (/HTTP 412/.test(err.message)) {
          // We need to reload the content and handle conflicts.
          lastRemoteLoad = -1;
          return loadContent();
        } else if (/HTTP 401/.test(err.message)) {
          // Remove old login credentials.
          browser.storage.local
            .remove(['data', 'bearer', 'lastModified'])
            .then(() => {
              return browser.storage.local.set({ contentWasSynced: false });
            });
        }
      });
  };
  // Debounce
  clearTimeout(storageTimeout);
  storageTimeout = setTimeout(later, STORE_TO_KINTO_SECONDS_FREQUENCY * 1000);
}

let ignoreNextLoadEvent = false;
quill.on('text-change', () => {
  const content = quill.getContents();
  browser.storage.local.set({ notes: content }).then(() => {
    // Notify other sidebars
    if (!ignoreNextLoadEvent) {
      chrome.runtime.sendMessage('notes@mozilla.com', {
        action: 'text-change'
      });
    }
    ignoreNextLoadEvent = false;
    browser.storage.local.get(['bearer', 'keys', 'lastModified'], data => {
      // If we have a bearer, we try to save the content.
      if (data.hasOwnProperty('bearer') && typeof data.bearer === 'string') {
        return storeToKinto(data.bearer, data.keys, content, data.lastModified);
      }
    });
  });
});

const enableSync = document.getElementById('enable-sync');
const noteDiv = document.getElementById('sync-note');

enableSync.onclick = () => {
  noteDiv.classList.add('visible');
  browser.runtime.sendMessage({ action: 'authenticate' });
};

chrome.runtime.onMessage.addListener(eventData => {
  switch (eventData.action) {
    case 'syncing':
      // Remove calls from other sidebar, only one needs to sync.
      clearTimeout(storageTimeout);
      break;
    case 'text-change':
      ignoreNextLoadEvent = true;
      loadContent();
      break;
    case 'authenticated':
      // Load new content and update quill with it.
      browser.storage.local.get(
        ['bearer', 'keys', 'contentWasSynced', 'notes'],
        data => {
          // If we have a bearer, we try to save the content.
          if (
            data.hasOwnProperty('bearer') &&
            typeof data.bearer === 'string'
          ) {
            console.log('Loading remote content');
            const bearer = data.bearer;
            const keys = data.keys;
            client
              .bucket('default')
              .collection('notes')
              .getData({
                headers: { Authorization: `Bearer ${bearer}` }
              })
              .then(result => {
                if (result.hasOwnProperty('content')) {
                  console.log('Encrypted content:', result['content']);
                  return decrypt(keys, result['content']).then(content => {
                    return handleConflictsMerge(
                      data.contentWasSynced,
                      data.notes,
                      content,
                      result.last_modified
                    );
                  });
                }
              });
          }
        }
      );
      break;
  }
});
