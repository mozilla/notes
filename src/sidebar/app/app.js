import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter, Route } from 'react-router-dom';

import * as moment from 'moment';
moment.locale(browser.i18n.getUILanguage());

import store from './store';
import { authenticate, kintoLoad } from './actions';

import ListPanel from './components/ListPanel';
import EditorPanel from './components/EditorPanel';
import Footer from './components/Footer';

import './utils/theme.js'; // addListener theming
import '../static/scss/styles.scss';

// AddListener on chrome.runtime.onMessage
import './onMessage.js';

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
};

const root = (
  <Provider store={store}>
    <div style={styles.container}>
      <HashRouter>
        <div style={styles.container}>
          <Route exact path="/" component={ListPanel} />
          <Route exact path="/note/:id" component={EditorPanel} />
        </div>
      </HashRouter>
      <Footer />
    </div>
  </Provider>
);

// We load store saved by store.js on all events
browser.storage.local.get().then(result => {
  const state = JSON.parse(result.redux || '{}');
  // We use stored state to propagate actions and avoid keeping
  result.hasOwnProperty('credentials') && state.sync.email ? store.dispatch(authenticate(state.sync.email)) : null;
  store.dispatch(kintoLoad(state.notes ? state.notes : []));

  // ONlny when store is populated we render our app
  ReactDOM.render(root, document.getElementById('notes'));
});

// Request sync kinto
chrome.runtime.sendMessage({
  action: 'kinto-sync'
});
