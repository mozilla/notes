import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import CloseIcon from './icons/CloseIcon';

import { getPadStats, customizeEditor } from '../utils/editor';

import INITIAL_CONFIG from '../data/editorConfig';
import INITIAL_CONTENT from '../data/initialContent';

import { MAXIMUM_PAD_SIZE } from '../utils/constants';
import { textChange } from '../actions';

class Editor extends React.Component {
  constructor(props, context) {
    super(props);
    this.props = props;
    this.editor = null; // Editor object
    this.state = {
      hideNotification: false // Notification when reaching MAXIMUM_PAD_SIZE
    };

    // Function to manually remove MAXIMUM_PAD_SIZE notification
    this.closeNotification = () => this.setState({ hideNotification: true });
  }

  componentDidMount() {
    ClassicEditor.create(this.node, INITIAL_CONFIG)
      .then(editor => {
        this.editor = editor;
        customizeEditor(editor);
        // Send message to background.js stating editor has been initialized
        // and is ready to receive content
        chrome.runtime.sendMessage({action: 'editor-ready'});

        editor.document.on('change', (eventInfo, name) => {
          const isFocused = document
            .querySelector('.ck-editor__editable')
            .classList.contains('ck-focused');
          // Only use the focused editor or handle 'rename' events to set the data into storage.
          if (isFocused || name === 'rename' || name === 'insert') {
            const content = editor.getData();
            if (content !== undefined &&
                content.replace(/&nbsp;/g, '\xa0') !== INITIAL_CONTENT.replace(/\s\s+/g, ' ')) {

              this.setState({ hideNotification: false });
              this.props.dispatch(textChange(this.props.note.id, content));

              chrome.runtime.sendMessage({
                action: 'metrics-changed',
                context: getPadStats(editor)
              });
            }
          }

        });
      })
      .catch(error => {
        console.error(error); // eslint-disable-line no-console
      });
  }

  // This is triggered when redux update state.
  componentWillReceiveProps(nextProps) {
    if (this.editor && nextProps.note.content && this.editor.getData() !== nextProps.note.content) {
      this.editor.setData(nextProps.note.content);
    }
  }

  render() {
    return (
      <div className="editorWrapper">
        <div
          id="editor"
          ref={node => {
            this.node = node;
          }}
          dangerouslySetInnerHTML={{ __html: this.props.note.content }}
        >
        </div>
        { !this.state.hideNotification && this.props.note.content && this.props.note.content.length > MAXIMUM_PAD_SIZE ?
        <div id="sync-note" style={{display: 'block'}}>
          <button onClick={this.closeNotification}><CloseIcon /></button>
          <p>{ browser.i18n.getMessage('maximumPadSizeExceeded') }</p>
        </div> : null }
      </div>
    );
  }
}

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
