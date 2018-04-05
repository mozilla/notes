import { connect } from 'react-redux';

import PropTypes from 'prop-types';


import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform
} from 'react-native';
import {RichTextEditor, RichTextToolbar} from 'react-native-zss-rich-text-editor';


function escapeHtml(unsafe) {
  return unsafe
    // .replace(/&/g, "&amp;")
    // .replace(/</g, "&lt;")
    // .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


class RichTextExample extends Component {

  constructor(props) {
    super(props);
    this.getHTML = this.getHTML.bind(this);
    this.setFocusHandlers = this.setFocusHandlers.bind(this);
    console.log('this.props', this.props);
  }

  render() {
    // TODO: probably there is a better way to do it
    const navigationId = this.props.navigation.state.params.rowId;
    const firstNote = this.props.state.notes[navigationId].content;
    //const firstNote = '<h2>Kinto Self-hosted</h2><p><br data-cke-filler="true"></p><p>This kinto instance has some issues:</p><ul><li>It is over HTTP</li><li>It deletes the Notes when Vlad restarts the docker thing</li></ul><p><br data-cke-filler="true"></p><p></p><p><br data-cke-filler="true"></p><p><strong>Yay!</strong></p>';

    return (
      <View style={styles.container}>
        <RichTextEditor
          ref={(r)=>this.richtext = r}
          style={styles.richText}
          hiddenTitle={true}
          // need to call `escapeHtml` here because otherwise the editor will fail if strings have ` ' ` in them. :(
          initialContentHTML={escapeHtml(firstNote)}
          editorInitializedCallback={() => this.onEditorInitialized()}
        />
      </View>
    );

  }

  onEditorInitialized() {
    this.setFocusHandlers();
    this.getHTML();
  }

  async getHTML() {
    const titleHtml = await this.richtext.getTitleHtml();
    const contentHtml = await this.richtext.getContentHtml();
    //alert(titleHtml + ' ' + contentHtml)
  }

  setFocusHandlers() {
    this.richtext.setTitleFocusHandler(() => {
      //alert('title focus');
    });
    this.richtext.setContentFocusHandler(() => {
      //alert('content focus');
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 40
  },
  richText: {
    alignItems:'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});



function mapStateToProps(state) {
  return {
    state
  };
}


export default connect(mapStateToProps)(RichTextExample)
