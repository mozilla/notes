import React from 'react';

import Editor from './Editor';
import Footer from './Footer';

class Panel extends React.Component {

  componentDidMount() {
    // Create a connection with the background script to handle open and
    // close events.
    browser.runtime.connect();
  }

  componentWillUnmount() {

  }

  render() {
    return [
      <Editor key="editor" />,
      <Footer key="footer" />
    ];
  }
}

export default Panel;
