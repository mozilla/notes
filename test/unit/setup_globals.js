browser = chrome;
// Provide something static that the background script can load
// without choking.
browser.storage.local.get.resolves({});
