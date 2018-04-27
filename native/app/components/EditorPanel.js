import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions } from 'react-native';
import { RichTextEditor } from 'react-native-zss-rich-text-editor';
import { createNote, updateNote, deleteNote, setFocusedNote } from '../actions';
import { COLOR_APP_BAR, KINTO_LOADED } from '../utils/constants';

import browser from '../browser';

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
    this.paragraphHasBeenInjected = false; // catch setParagraph Callback on creation
    this.note = props.state.notes.find((note) => note.id === props.navigation.state.params.id);
    if (this.note && this.note.id) {
      this.props.dispatch(setFocusedNote(this.note.id));
    }
  }

  componentDidMount() {
    this.richtext.registerContentChangeListener((e) => {
      if (!this.note && !this.paragraphHasBeenInjected) { // new note never paragraphed, not in redux
        // Because .setParagraph() trigger and update, we use paragraphHasBeenInjected to handle its
        // callback and avoid a non expected dispatch(updateNote())
        this.paragraphHasBeenInjected = true;
        this.richtext.setParagraph();
      } else if (!this.note) { // new note has been paragraphed, we push on redux
        this.paragraphHasBeenInjected = false;
        this.note = { content: e };
        this.props.dispatch(createNote(e)).then((note) => {
          this.note.id = note.id;
          this.props.dispatch(setFocusedNote(note.id));
        });
      } else if (this.note && e === '') { // if we delete all caracters from a note
        this.props.dispatch(deleteNote(this.note.id));
        this.note = null;
        this.props.dispatch(setFocusedNote());
      } else if (this.note && e !== '') { // default case, on modification we save
        this.props.dispatch(updateNote(this.note.id, e, new Date()));
      }
    });

    // Listen to KintoLoad event to update UI if current note has changed.
    this._onLoadEvent = (eventData) => {
      switch(eventData.action) {
        case KINTO_LOADED:
          if (this.note && this.props.navigation.isFocused()) {
            newNote = this.props.state.notes.find((note) => note.id === this.note.id);
            if (newNote) {
              this.note = newNote;
              this.richtext.setContentHTML(this.note.content);
            } else {
              this.props.navigation.goBack();
            }
          }
          break;
      }
    };
    browser.runtime.onMessage.addListener(this._onLoadEvent);
  }

  componentWillUnmount() {
    this.props.dispatch(setFocusedNote());
    browser.runtime.onMessage.removeListener(this._onLoadEvent);
  }

  onEditorInitialized() {
    if (!this.note) {
      // set height if totally empty, helps with keyboard pull up
      const { height } = Dimensions.get('window');
      this.richtext._sendAction('SET_EDITOR_HEIGHT', height - 300);
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <RichTextEditor
          ref={(r) => this.richtext = r}
          style={styles.richText}
          hiddenTitle={true}
          // at first initialContentHTML must be `''` otherwise we would get undefined
          initialContentHTML={this.note ? escapeHtml(this.note.content) : ''}
          enableOnChange={true}
          customCSS="p:first-child { margin-top: 0; }"
          contentPlaceholder='Take a note...'
          editorInitializedCallback={() => this.onEditorInitialized()}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white'
  },
  richText: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  }
});

function mapStateToProps(state) {
  return {
    state
  };
}

RichTextExample.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(RichTextExample)

