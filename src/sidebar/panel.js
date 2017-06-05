const client = new KintoClient("https://kinto.dev.mozaws.net/v1");

var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar',
  }
});

// Encryption layer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const ivLen = 16;
function joinIvAndData(iv, data) {
  const buf = new Uint8Array(iv.length + data.length);
  iv.forEach((byte, i) => {
    buf[i] = byte;
  });
  data.forEach((byte, i) => {
    buf[ivLen + i] = byte;
  });
  return buf;
}

function encrypt(key, content) {
  // Unique random generated IV
  const initVector = new Uint8Array(ivLen);
  crypto.getRandomValues(initVector);

  // Prepare content
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(content));
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: key.kty,
      k: key.k.replace(/=/, "")
    },
    "AES-GCM",
    true,
    ["encrypt"]
  ).then(encryptionKey => {
    return crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: initVector
      },
      encryptionKey,
      data
    );
  }).then(encryptedData => {
    const encryptedContent = joinIvAndData(initVector, new Uint8Array(encryptedData));
    const encrypted = arrayBufferToBase64(encryptedContent);
    return encrypted;
  });
}

function separateIvFromData(buf) {
  const iv = new Uint8Array(ivLen);
  const data = new Uint8Array(buf.length - ivLen);

  buf.forEach((byte, i) => {
    if (i < ivLen) {
      iv[i] = byte;
    } else {
      data[i - ivLen] = byte;
    }
  });
  return { iv, data };
}

function decrypt(key, encryptedContent) {
  const encryptedData = base64ToArrayBuffer(encryptedContent);
  let parts;
  try {
    parts = separateIvFromData(encryptedData);
  } catch (err) {
    return Promise.resolve('Reset previously malformed saved pad');
  }
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: key.kty,
      k: key.k.replace(/=/, "")
    },
    "AES-GCM",
    true,
    ["decrypt"]
  ).then(decryptionKey => {
    return crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: parts.iv
      },
      decryptionKey,
      parts.data
    );
  }).then(decryptedArrayBuffer => {
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedArrayBuffer));
  })
  .catch(err => {
    console.error(err);
  });
}


function handleLocalContent(data) {
  if(!data.hasOwnProperty("notes")) {
    console.log("No local content. Loading default content.");
    quill.setContents({
      "ops": [
        {"attributes": {"size": "large", "bold":true}, "insert": "Welcome!"},
        {"insert": "\n\n"},
        {"attributes": {"size": "large"},
         "insert": "This is a simple one-page notepad built in to Firefox that helps you get the most out of the web."},{"insert": "\n\n"},
        {"attributes": {"size": "large"}, "insert": "You can: "},
        {"insert": "\n\n"},
        {"attributes": {"size": "large"}, "insert": "Format your notes"},
        {"attributes": {"list": "ordered"}, "insert": "\n"},
        {"attributes": {"size": "large"}, "insert": "Sync notes securely to your Firefox Account"},
        {"attributes": {"list": "ordered"}, "insert": "\n"},
        {"attributes": {"size": "large"},
         "insert": "Sync them to our Android app: http://mzl.la/notes"},
        {"attributes": {"list": "ordered"}, "insert": "\n"}]});
  } else {
    console.log("Content:", data["notes"]);
    quill.setContents(data["notes"]);
  }
}

browser.storage.local.get(["bearer", "keys", "notes"], function(data) {
  // If we have a bearer, we try to save the content.
  console.log("Loading remote content.");
  if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
    const bearer = data.bearer;
    const keys = data.keys;
    client.bucket('default').collection('notes').getData({
      headers: {
        Authorization: `Bearer ${bearer}`
      }
    })
      .then(result => {
        if (!result.hasOwnProperty("content")) {
          console.log("No remote content. Loading local content.");
          handleLocalContent(data);
        } else {
          console.log("Encrypted Content:", result["content"]);
          return decrypt(keys, result["content"])
            .then(content => {
              console.log("Content", content);
              browser.storage.local.set({notes: content}).then(() => {
                quill.setContents(content);
              });
            })
            .catch(err => {
              console.error(err);
            });
        }
      });
  } else {
    handleLocalContent(data);
  }
});

let storageTimeout;
function storeToKinto(bearer, keys, content) {
  var later = function() {
    storageTimeout = null;
    console.log("calling the client. Content: ", content);

    // Load the Key
    encrypt(keys, content)
      .then(encrypted => {
        console.log("Encrypted content:", encrypted);
        client.bucket('default').collection('notes').setData({content: encrypted}, {
          headers: {
            Authorization: `Bearer ${bearer}`
          }
        });
      })
      .catch(err => {
        console.error(err);
      });
  };
  // Debounce
  clearTimeout(storageTimeout);
  storageTimeout = setTimeout(later, 800);
}

quill.on("text-change", (delta, oldDelta, source) => {
  var content = quill.getContents();
  browser.storage.local.set({notes: content}).then(() => {
    browser.storage.local.get(["bearer", "keys"], function(data) {
      // If we have a bearer, we try to save the content.
      if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
        return storeToKinto(data.bearer, data.keys, content);
      }
    });
  });
});

const enableSync = document.getElementById('enableSync');
enableSync.onclick = () => {
  browser.runtime.sendMessage({ action: 'authenticate' });
};

chrome.runtime.onMessage.addListener(function (eventData) {
      switch (eventData.action) {
        case 'authenticated':
          // Load new content and update quill with it.
          browser.storage.local.get(["bearer", "keys", "notes"], function(data) {
            // If we have a bearer, we try to save the content.
            if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
              console.log("Loading remote content");
              const bearer = data.bearer;
              const keys = data.keys;
              client.bucket('default').collection('notes').getData({
                headers: {
                  Authorization: `Bearer ${bearer}`
                }
              })
                .then(result => {
                  if (result.hasOwnProperty("content")) {
                    console.log("Encrypted content:", result["content"]);
                    return decrypt(keys, result["content"])
                      .then(content => {
                        console.log("Content", content);
                        browser.storage.local.set({notes: content}).then(() => {
                          quill.setContents(content);
                        });
                      });
                  }
                });
            }
          });
          break;
      }
});
