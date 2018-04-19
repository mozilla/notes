import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions } from 'react-native';
import { RichTextEditor } from 'react-native-zss-rich-text-editor';
import { createNote, updateNote, deleteNote, setFocusedNote } from '../actions';
import { COLOR_APP_BAR } from '../utils/constants';

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
    this.note = this.props.navigation.state.params.note;
    if (this.note) {
      this.props.dispatch(setFocusedNote(this.note.id));
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

  componentDidMount() {
    this.richtext.registerContentChangeListener((e) => {
      if (!this.note && e !== '') {
        this.richtext.setParagraph();
        this.note = { content: e }
        this.props.dispatch(createNote(e)).then((note) => {
          this.note.id = note.id;
          this.props.dispatch(setFocusedNote(note.id));
        });
      } else if (this.note && e === '') {
        this.props.dispatch(deleteNote(this.note.id));
        this.note = null;
        this.props.dispatch(setFocusedNote());
      } else if (this.note && e !== '') {
        this.props.dispatch(updateNote(this.note.id, e, new Date()));
      }
    });
  }

  onEditorInitialized(e) {
    if (!this.note) {
      // set height if totally empty, helps with keyboard pull up
      const { height } = Dimensions.get('window');
      this.richtext._sendAction('SET_EDITOR_HEIGHT', height - 300);
    }
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
