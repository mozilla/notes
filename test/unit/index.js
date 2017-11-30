browser = require('sinon-chrome/webextensions/index');
// Provide something static that the background script can load
// without choking.
browser.storage.local.get.resolves({});
browser.runtime = {
  getManifest: function () {
    return {
      version: 'tests'
    };
  },
  onMessage: {
    addListener: function () {}
  },
  onConnect: {
    addListener: function () {}
  },
  sendMessage: function () {
  }
};

require('./main.test');
