const KINTO_URL = "https://kinto.dev.mozaws.net/v1/";
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
    quill.setContents(data["notes"]);
  }
}

browser.storage.local.get(["bearer", "keys", "notes"], function(data) {
  // If we have a bearer, we try to save the content.
  if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
    const bearer = data.bearer;
    const keys = data.keys;
    client.bucket('default').collection('notes').getData({
      headers: {
        Authorization: `Bearer ${bearer}`
      }
    })
      .then(result => {
        if (!result.hasOwnProperty("notes")) {
          handleLocalContent(data);
        } else {
          browser.storage.local.set({notes: result["notes"]}).then(() => {
            quill.setContents(result["notes"]);
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
      console.log(data);
      // If we have a bearer, we try to save the content.
      if(data.hasOwnProperty('bearer') && typeof data.bearer == "string") {
        const bearer = data.bearer;
        const keys = data.keys;
        console.log("calling the client.");
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
