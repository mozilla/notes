import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Route } from 'react-router-dom';

import ListPanel from './components/ListPanel';
import EditorPanel from './components/EditorPanel';

import Footer from './components/Footer';

import '../static/scss/styles.scss';

// Initialize theming
import './utils/theme.js';

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
}

const root = (
  <div style={styles.container}>
    <HashRouter>
      <div style={styles.container}>
        <Route exact path="/" component={ListPanel} />
        <Route path="/note" component={EditorPanel} />
      </div>
    </HashRouter>
    <Footer />
  </div>
);

ReactDOM.render(root
, document.getElementById('notes'));
