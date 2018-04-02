import React from 'react';

import { HashRouter, Route } from 'react-router-dom';

import ListPanel from './components/ListPanel';
import EditorPanel from './components/EditorPanel';

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
};

class Router extends React.Component {
  render() {
    return (
      <HashRouter>
        <div style={styles.container}>
          <Route exact path="/" component={ListPanel} />
          <Route exact path="/note" component={EditorPanel} />
          <Route exact path="/note/:id" component={EditorPanel} />
        </div>
      </HashRouter>
    );
  }
}

export default Router;
