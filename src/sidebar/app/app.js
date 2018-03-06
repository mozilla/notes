import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Panel from './components/Panel';

import './utils/theme.js'; // addListener theming
import '../static/scss/styles.scss';

// AddListener on chrome.runtime.onMessage
import './onMessage.js';

ReactDOM.render(
  <Provider store={store}>
      <Panel />
  </Provider>,
  document.getElementById('notes')
);

// Request sync kinto
chrome.runtime.sendMessage({
  action: 'kinto-sync'
});
