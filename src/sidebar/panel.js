var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Take a note...',
  modules: {
    toolbar: '#toolbar',
  }
});

chrome.storage.local.get("notes", function(data) {
  quill.setContents(data["notes"]);
});

quill.on("text-change", (delta, oldDelta, source) => {
  chrome.storage.local.set({notes: quill.getContents()});
});

const enableSync = document.getElementById('enableSync');
enableSync.onclick = () => {
  chrome.runtime.sendMessage({ action: 'authenticate' });
};
