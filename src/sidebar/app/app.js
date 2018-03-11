import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter, Route } from 'react-router-dom';

import store from './store';

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
}

const root = (
  <Provider store={store}>
    <div style={styles.container}>
      <HashRouter>
        <div style={styles.container}>
          <Route exact path="/" component={ListPanel} />
          <Route path="/note" component={EditorPanel} />
        </div>
      </HashRouter>
      <Footer />
    </div>
  </Provider>
);

ReactDOM.render(root
, document.getElementById('notes'));


// Request sync kinto
chrome.runtime.sendMessage({
  action: 'kinto-sync'
});
