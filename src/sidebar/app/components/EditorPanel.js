/* eslint-disable react/jsx-key */
import React from 'react';

import Header from './Header';
import Editor from './Editor';

class EditorPanel extends React.Component {

  componentDidMount() {
    // Create a connection with the background script to handle open and
    // close events.
    browser.runtime.connect();
  }

  render() {
    return [
      <Header />,
      <Editor />
    ];
  }
}

export default EditorPanel;
