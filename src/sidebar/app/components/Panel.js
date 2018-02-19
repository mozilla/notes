/* eslint-disable react/jsx-key */
import React from 'react';

import Editor from './Editor';
import Footer from './Footer';

class Panel extends React.Component {

  componentDidMount() {
    // Create a connection with the background script to handle open and
    // close events.
    browser.runtime.connect();
  }

  render() {
    return [
      <Editor />,
      <Footer />
    ];
  }
}

export default Panel;
