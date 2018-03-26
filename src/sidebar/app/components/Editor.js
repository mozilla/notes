import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { getPadStats, customizeEditor } from '../utils/editor';

import INITIAL_CONFIG from '../data/editorConfig';
import INITIAL_CONTENT from '../data/initialContent';

import { updateNote } from '../actions';

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
                if (content !== undefined &&
                    content.replace(/&nbsp;/g, '\xa0') !== INITIAL_CONTENT.replace(/\s\s+/g, ' ')) {
                }

                if (!this.ignoreChange) {
                  this.props.dispatch(updateNote(this.props.note.id, content));
                }
                this.ignoreChange = false;

                chrome.runtime.sendMessage({
                  action: 'metrics-changed',
                  context: getPadStats(editor)
                });
            }
          }, 200);
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
        this.editor.setData(nextProps.note.content || '<p></p>');
      }
    }
  }

  componentWillUnmount() {
    this.editor.destroy();
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
            dangerouslySetInnerHTML={{ __html: this.props.note.content || '' }}>
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
    note: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(Editor);
