var quill = new Quill('#editor', {theme: 'snow', placeholder: 'Take a note...',});

chrome.storage.local.get("notes", function(data) {
  quill.setContents(data["notes"]);
});

quill.on("text-change", (delta, oldDelta, source) => {
  chrome.storage.local.set({notes: quill.getContents()});
});
