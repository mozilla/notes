import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions } from 'react-native';
import { RichTextEditor } from 'react-native-zss-rich-text-editor';
import { createNote, updateNote, deleteNote } from '../actions';

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
  }

  render() {
    return (
      <View style={styles.container}>
        <RichTextEditor
          ref={(r) => this.richtext = r}
          style={styles.richText}
          hiddenTitle={true}
          // at first initialContentHTML must be `''` otherwise we would get undefined
          initialContentHTML=''
          enableOnChange={true}
          contentPlaceholder='Take a note...'
          editorInitializedCallback={() => this.onEditorInitialized()}
        />
      </View>
    );
  }

  componentDidMount() {
    this.richtext.registerContentChangeListener((e) => {
      if (!this.note && e !== '') {
        this.note = { content: e }
        this.props.dispatch(createNote(e)).then((id) => {
          this.note.id = id;
        });
      } else if (this.note && e === '') {
        this.props.dispatch(deleteNote(this.note.id));
        this.note = null;
      } else if (this.note && e !== '') {
        this.props.dispatch(updateNote(this.note.id, e, new Date()));
      }
    });
  }

  onEditorInitialized(e) {
    if (this.note) {
      // need to call `escapeHtml` here because otherwise the editor will fail if strings have ` ' ` in them. :(
      this.richtext._sendAction('SET_CONTENT_HTML', escapeHtml(this.note.content));
    } else {
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
    backgroundColor: 'transparent'
  },
  richText: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
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
