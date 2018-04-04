import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import { authenticate, kintoLoad, requestWelcomeNote } from './actions';

import Router from './router';
import Footer from './components/Footer';

import './utils/theme.js'; // addListener theming
import '../static/scss/styles.scss';

// AddListener on chrome.runtime.onMessage
import './onMessage.js';

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
};

// We load store saved by store.js on all events
browser.storage.local.get().then(result => {

  // If no redux, it means user never used the app before.
  // we display initial content to introduce Note
  if (!result.redux) {
    store.dispatch(requestWelcomeNote());
  }

  const state = JSON.parse(result.redux || '{}');

  // We use stored state to propagate actions and avoid keeping
  if (result.hasOwnProperty('credentials')) {
    if (state.sync && state.sync.email) {
      store.dispatch(authenticate(state.sync.email));
    } else {
      store.dispatch(authenticate('...'));
      // Fetch email using credentials
      browser.runtime.sendMessage({
        action: 'fetch-email'
      });
    }
  }

  store.dispatch(kintoLoad(state.notes ? state.notes : []));

  // Render root DOM element
  ReactDOM.render((
    <Provider store={store}>
      <div style={styles.container}>
        <Router />
        <Footer />
      </div>
    </Provider>
  ), document.getElementById('notes'));
});

// Request sync kinto
chrome.runtime.sendMessage({
  action: 'kinto-sync'
});
