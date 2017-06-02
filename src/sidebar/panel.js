const client = new KintoClient("https://kinto.dev.mozaws.net/v1");

var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar',
  }
});

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
          console.log("Content:", result["content"]);
          browser.storage.local.set({notes: result["content"]}).then(() => {
            quill.setContents(result["content"]);
          });
        }
      });
  } else {
    handleLocalContent(data);
  }
});

quill.on("text-change", (delta, oldDelta, source) => {
  var content = quill.getContents();
  browser.storage.local.set({notes: content}).then(() => {
    browser.storage.local.get(["bearer", "keys"], function(data) {
      // If we have a bearer, we try to save the content.
      if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
        const bearer = data.bearer;
        const keys = data.keys;
        console.log("calling the client. Content: ", content);
        return client.bucket('default').collection('notes').setData({content: content}, {
          headers: {
            Authorization: `Bearer ${bearer}`
          }
        });
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
                    console.log("Content:", result["content"]);
                    browser.storage.local.set({notes: result["content"]}).then(() => {
                      quill.setContents(result["content"]);
                    });
                  }
                });
            }
          });
          break;
      }
});
