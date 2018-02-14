browser = require('sinon-chrome/webextensions/index');
var sinon = require('sinon');
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
  sendMessage: sinon.spy(function () {
  })
};
browser.i18n = {
  getMessage: function () {
    return 'localized string';
  }
};

require('./main.test');
