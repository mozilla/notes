import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions } from 'react-native';
import { RichTextEditor } from '../react-native-zss-rich-text-editor/index';
import { createNote, updateNote, deleteNotes, setFocusedNote } from '../actions';
import { KINTO_LOADED } from '../utils/constants';

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
    this.note = props.state.notes.find((note) => note.id === props.navigation.state.params.id);
    if (this.note && this.note.id) {
      this.props.dispatch(setFocusedNote(this.note.id));
    }
  }

  componentDidMount() {
    this.richtext.registerContentChangeListener((e) => {
      if (!this.note && e !== '<p>&nbsp;</p>') { // new note has been paragraphed, we push on redux
        this.note = { content: e };
        this.props.dispatch(createNote(this.note)).then((note) => {
          this.note.id = note.id;
          this.props.dispatch(setFocusedNote(note.id));
        });
      } else if (this.note && (e === '' || e === '<p>&nbsp;</p>')) { // if we delete all caracters from a note
        this.props.dispatch(deleteNotes([ this.note.id ], 'blank-note'));
        this.note = null;
        this.props.dispatch(setFocusedNote());
      } else if (this.note && (e !== '' || e !== '<p>&nbsp;</p>')) { // default case, on modification we save
        this.props.dispatch(updateNote(this.note.id, e, new Date()));
      }
    });

    // Listen to KintoLoad event to update UI if current note has changed.
    this._onLoadEvent = (eventData) => {
      switch(eventData.action) {
        case KINTO_LOADED:
          if (this.note && this.props.navigation.isFocused()) {
            let newNote = this.props.state.notes.find((note) => note.id === this.note.id);
            // only force update content if content is different
            if (newNote) {
              this.note = newNote;

              if(newNote.content !== this.note.content) {
                this.richtext.setContentHTML(this.note.content);
              }
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
  }

  shouldComponentUpdate(nextProps) {
    let shouldUpdate = false;

    return shouldUpdate;
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
          focusKeyboard={this.note ? false : true}
          customCSS="p:first-child { margin-top: 0; }"
          contentPlaceholder={ browser.i18n.getMessage('emptyPlaceHolder') }
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

