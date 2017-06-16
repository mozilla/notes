const client = new KintoClient('https://kinto.dev.mozaws.net/v1');

const SYNC_BROWSER_SIDEBARS_CONTENT_SECONDS_FREQUENCY = 1.5;
const LOAD_FROM_KINTO_SECONDS_FREQUENCY = 60;
const STORE_TO_KINTO_SECONDS_FREQUENCY = 30;

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

// Encryption layer
function base64URLencode(binary) {
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/\=+$/m, '');
}

function base64URLdecode(base64URL) {
  // Handle base64URL characters
  let base64 = base64URL.replace(/\-/g, '+').replace(/_/g, '/');
  // Handle padding
  const expectedLength = base64.length + (4 - base64.length % 4) % 4;
  const padLength = expectedLength - base64.length;
  for (let i = 0; i < padLength; i++) {
    base64 += '=';
  }
  return window.atob(base64);
}

function base64URLToArrayBuffer(base64) {
  const binary_string = base64URLdecode(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64URL(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64URLencode(binary);
}

function buildJWE(iv, data) {
  const ivBuf = new Uint8Array(iv.length);
  iv.forEach((byte, i) => {
    ivBuf[i] = byte;
  });

  const ciphertextBuf = new Uint8Array(data.length);
  data.forEach((byte, i) => {
    ciphertextBuf[i] = byte;
  });

  return JSON.stringify({
    protected: base64URLencode(JSON.stringify({ enc: 'A256GCM' })),
    iv: arrayBufferToBase64URL(ivBuf),
    ciphertext: arrayBufferToBase64URL(ciphertextBuf)
  });
}

const ivLen = 16;
function encrypt(key, content) {
  // Unique random generated IV
  const initVector = new Uint8Array(ivLen);
  crypto.getRandomValues(initVector);

  // Prepare content
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(content));
  return crypto.subtle
    .importKey(
      'jwk',
      {
        kty: key.kty,
        k: key.k.replace(/=/, '')
      },
      'AES-GCM',
      true,
      ['encrypt']
    )
    .then(encryptionKey => {
      return crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: initVector
        },
        encryptionKey,
        data
      );
    })
    .then(encryptedData => {
      const jwe = buildJWE(initVector, new Uint8Array(encryptedData));
      return jwe;
    });
}

function parseJWE(jwe) {
  const data = JSON.parse(jwe);
  return {
    iv: base64URLToArrayBuffer(data.iv),
    ciphertext: base64URLToArrayBuffer(data.ciphertext)
  };
}

function decrypt(key, jwe) {
  let parts;
  try {
    parts = parseJWE(jwe);
  } catch (err) {
    return Promise.reject('Reset previously malformed saved pad');
  }
  return crypto.subtle
    .importKey(
      'jwk',
      {
        kty: key.kty,
        k: key.k.replace(/=/, '')
      },
      'AES-GCM',
      true,
      ['decrypt']
    )
    .then(decryptionKey => {
      return crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: parts.iv
        },
        decryptionKey,
        parts.ciphertext
      );
    })
    .then(decryptedArrayBuffer => {
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedArrayBuffer));
    })
    .catch(err => {
      console.error(err);
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
    debounceLoadContent();
    // We don't want to merge the intro content.
    return browser.storage.local.set({ contentWasSynced: true });
  } else {
    if (JSON.stringify(quill.getContents()) !== JSON.stringify(data.notes)) {
      quill.setContents(data.notes);
      debounceLoadContent();
      return browser.storage.local.set({ contentWasSynced: false });
    }
  }
  // Refresh content later.
  debounceLoadContent();
}

function handleConflictsMerge(contentWasSynced, local, remote) {
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
    return browser.storage.local.set({ notes: newContent }).then(() => {
      quill.setContents(newContent);
      debounceLoadContent();
    });
  } else {
    return browser.storage.local
      .set({ notes: remote })
      .then(() => {
        if (JSON.stringify(quill.getContents()) !== JSON.stringify(remote)) {
          quill.setContents(remote);
        }
        debounceLoadContent();
      })
      .then(() => {
        return browser.storage.local.set({ contentWasSynced: true });
      });
  }
}

let loadContentTimeout;
let lastRemoteLoad = -1;

function loadContent() {
  loadContentTimeout = null;
  browser.storage.local.get(
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
        client
          .bucket('default')
          .collection('notes')
          .getData({
            headers: { Authorization: `Bearer ${bearer}` }
          })
          .then(result => {
            lastRemoteLoad = Date.now();
            if (!result.hasOwnProperty('content')) {
              console.log('No remote content. Loading local content.');
              handleLocalContent(data);
            } else {
              console.log('Encrypted Content:', result['content']);
              return decrypt(keys, result['content'])
                .then(content => {
                  handleConflictsMerge(
                    data.contentWasSynced,
                    data.notes,
                    content
                  );
                })
                .catch(err => {
                  handleLocalContent(data);
                  console.error(err);
                });
            }
          })
          .catch(err => {
            console.error(err);
            handleLocalContent(data);
            // Load local content and disconnect the user
            browser.storage.local.remove(['data', 'bearer']).then(() => {
              return browser.storage.local.set({ contentWasSynced: false });
            });
          });
      } else {
        handleLocalContent(data);
      }
    }
  );
}

function debounceLoadContent() {
  // Debounce
  clearTimeout(loadContentTimeout);
  loadContentTimeout = setTimeout(
    loadContent,
    SYNC_BROWSER_SIDEBARS_CONTENT_SECONDS_FREQUENCY * 1000
  );
}

loadContent();

let storageTimeout;

function storeToKinto(bearer, keys, content) {
  debounceLoadContent();
  const later = function() {
    storageTimeout = null;
    console.log('calling the client. Content: ', content);

    // Load the Key
    encrypt(keys, content)
      .then(encrypted => {
        console.log('Encrypted content:', encrypted);
        return client
          .bucket('default')
          .collection('notes')
          .setData(
            { content: encrypted },
            { headers: { Authorization: `Bearer ${bearer}` } }
          );
      })
      .then(() => {
        return browser.storage.local.set({ contentWasSynced: true });
      })
      .catch(err => {
        console.error(err);
        // Remove old login credentials.
        browser.storage.local.remove(['data', 'bearer']).then(() => {
          return browser.storage.local.set({ contentWasSynced: false });
        });
      });
  };
  // Debounce
  clearTimeout(storageTimeout);
  storageTimeout = setTimeout(later, STORE_TO_KINTO_SECONDS_FREQUENCY * 1000);
}

quill.on('text-change', () => {
  const content = quill.getContents();
  browser.storage.local.set({ notes: content }).then(() => {
    browser.storage.local.get(['bearer', 'keys'], data => {
      // If we have a bearer, we try to save the content.
      if (data.hasOwnProperty('bearer') && typeof data.bearer === 'string') {
        return storeToKinto(data.bearer, data.keys, content);
      }
    });
  });
});

quill.on('editor-change', () => {
  debounceLoadContent();
});

const enableSync = document.getElementById('enable-sync');
const noteDiv = document.getElementById('sync-note');

enableSync.onclick = () => {
  noteDiv.classList.add('visible');
  browser.runtime.sendMessage({ action: 'authenticate' });
};

chrome.runtime.onMessage.addListener(eventData => {
  switch (eventData.action) {
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
                    handleConflictsMerge(
                      data.contentWasSynced,
                      data.notes,
                      content
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
