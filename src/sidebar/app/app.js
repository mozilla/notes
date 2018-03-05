import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Panel from './components/Panel';

import './onMessage.js'; // addListener chrome.runtime.onMessage
import './utils/theme.js'; // addListener theming
import '../static/scss/styles.scss';

ReactDOM.render(
  <Provider store={store}>
      <Panel />
  </Provider>,
  document.getElementById('notes')
);
