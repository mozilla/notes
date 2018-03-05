import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Panel from './components/Panel';

import './utils/theme.js'; // Initialize theming
import './onMessage.js'; // Initialize chrome.runtime.onMessage.addListener
import '../static/scss/styles.scss';

ReactDOM.render(
  <Provider store={store}>
      <Panel />
  </Provider>,
  document.getElementById('notes')
);
