import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { getPadStats, customizeEditor } from '../utils/editor';

import INITIAL_CONFIG from '../data/editorConfig';

import { updateNote, createNote, deleteNote, setFocusedNote } from '../actions';

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
};

class Editor extends React.Component {
  constructor(props, context) {
    super(props);
    this.props = props;
    this.editor = null; // Editor object
    this.ignoreChange = false;
    this.delayUpdateNote = null;
  }

  componentDidMount() {
    ClassicEditor.create(this.node, INITIAL_CONFIG)
      .then(editor => {
        this.editor = editor;
        customizeEditor(editor);

        // Focus the text editor
        this.editor.editing.view.focus();

        editor.document.on('change', (eventInfo, name) => {
          // Cache update event in case of multi-change event (copy pasting trigger many).
          clearTimeout(this.delayUpdateNote);
          this.delayUpdateNote = setTimeout(() => {

            const isFocused = document
              .querySelector('.ck-editor__editable')
              .classList.contains('ck-focused');
            // Only use the focused editor or handle 'rename' events to set the data into storage.
            if (isFocused || name === 'rename' || name === 'insert') {
                const content = editor.getData();

                if (!this.ignoreChange) {
                  if (!this.props.note.id) {
                    this.props.dispatch(createNote(content)).then(id => {
                      this.props.dispatch(setFocusedNote(id));
                    });
                  } else if (this.props.note.id && (content === '' || content === '<p>&nbsp;</p>')) {
                    this.props.dispatch(deleteNote(this.props.note.id));
                  } else {
                    this.props.dispatch(updateNote(this.props.note.id, content));
                  }
                }
                this.ignoreChange = false;

                chrome.runtime.sendMessage({
                  action: 'metrics-changed',
                  context: getPadStats(editor)
                });
            }
            this.delayUpdateNote = null;
          }, 50);
        });
      })
      .catch(error => {
        console.error(error); // eslint-disable-line no-console
      });
  }

  // This is triggered when redux update state.
  componentWillReceiveProps(nextProps) {
    if (this.editor && this.props.note &&
        this.editor.getData() !== nextProps.note.content) {
      if (nextProps.note.id !== this.props.note.id) {
        this.ignoreChange = true;
      }
      if (!this.delayUpdateNote) { // If no delay waiting, we apply modification
        this.ignoreChange = true;
        this.editor.setData(nextProps.note.content || '<p></p>');
        this.editor.editing.view.focus();
      }
    }
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  render() {
    return (
      <div style={styles.container}>
        <div className="editorWrapper">
          <div
            id="editor"
            ref={node => {
              this.node = node;
            }}
            dangerouslySetInnerHTML={{ __html: this.props.note ? this.props.note.content : '' }}>
          </div>
        </div>

      </div>
    );
  }
}

// We can reuse notification in editorWrapper using the following :
// <div id="sync-note">
//   <button onClick={this.closeNotification}><CloseIcon /></button>
//   <p>{ browser.i18n.getMessage('maximumPadSizeExceeded') }</p>
// </div>

function mapStateToProps(state) {
  return {
    state
  };
}

Editor.propTypes = {
    state: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    note: PropTypes.object,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(Editor);
