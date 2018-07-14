import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import INITIAL_CONTENT from '../data/initialContent';
import { SEND_TO_NOTES, FROM_SEND_TO_NOTE, FROM_LIST_VIEW } from '../utils/constants';

import NewIcon from './icons/NewIcon';
import { setFocusedNote, createNote } from '../actions';
import { formatLastModified } from '../utils/utils';


class ListPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;

    this.requestNewNote = () => {
      props.dispatch(setFocusedNote());
      props.history.push('/note');
    };

    this.sendToNoteListener = (eventData) => {
      if (eventData.action === SEND_TO_NOTES) {
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
          if (windowInfo.id === eventData.windowId) {
            this.props.dispatch(createNote(`<p>${eventData.text}</p>`, FROM_SEND_TO_NOTE));
          }
        });
      }
    };

    this.checkInitialContent = (state) => {
      if (state.sync.welcomePage && state.kinto.isLoaded && state.notes.length === 0) {
        this.props.dispatch(createNote(INITIAL_CONTENT, FROM_LIST_VIEW, 'initialNote')).then(id => {
          this.props.history.push(`/note/${id}`);
        });
      }
    };
    this.handleKeyPress = (event) => {
      if (this.noteButtons.length > 0) {
        switch (event.key) {
          case 'ArrowUp':
            if (this.indexFocusedNote === null) {
              this.indexFocusedNote = 0;
            } else {
              this.indexFocusedNote = (this.indexFocusedNote - 1) % this.noteButtons.length;
              if (this.indexFocusedNote < 0) {
                this.indexFocusedNote = 0;
              }
            }
            this.noteButtons[this.indexFocusedNote].focus();
            break;
          case 'ArrowDown':
            if (this.indexFocusedNote === null) {
              this.indexFocusedNote = 0;
            } else {
              this.indexFocusedNote = (this.indexFocusedNote + 1) % this.noteButtons.length;
            }
            this.noteButtons[this.indexFocusedNote].focus();
            break;
        }
      }
    };
  }

  componentWillMount() {

    chrome.runtime.onMessage.addListener(this.sendToNoteListener);

    // If user is not logged, and has no notes, we create initial content for him
    // and redirect to it.
    this.checkInitialContent(this.props.state);

    this.props.dispatch(setFocusedNote());

  }

  componentDidMount() {
    // Disable right clicks
    // Refs: https://stackoverflow.com/a/737043/186202
    window.addEventListener('keydown', this.handleKeyPress);
    this.indexFocusedNote = null; // index of focused note in this.props.state.notes
    document.querySelectorAll('.listView').forEach(sel => {
      sel.addEventListener('contextmenu', e => {
        e.preventDefault();
      });
    });

    // Send message to background.js stating editor has been initialized
    // and is ready to receive content
    chrome.runtime.sendMessage({action: 'editor-ready'});
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress);
    chrome.runtime.onMessage.removeListener(this.sendToNoteListener);
    clearTimeout(this.timer);
  }

  componentWillReceiveProps(nextProps) {
    // If user is not logged, and has no notes, we create initial content for him
    // and redirect to it.
    this.checkInitialContent(nextProps.state);
  }

  render() {
    this.noteButtons = [];
    if (!this.props.state.kinto.isLoaded) return '';

    return (
      <div className="listView">
        <button
          className="btn fullWidth borderBottom newNoteBtn"
          onClick={this.requestNewNote}>
          <NewIcon /> <span>{ browser.i18n.getMessage('newNote') }</span>
        </button>
        <ul>
          { this.props.state.notes.sort((a, b) => {
            if (a.lastModified.getTime() !== b.lastModified.getTime()) {
              return a.lastModified.getTime() < b.lastModified.getTime() ? 1 : -1;
            }
            return a.firstLine < b.firstLine ? 1 : -1;
          }).map((note) => {
            return (
              <li key={note.id}>
                <button
                  ref={btn => btn ? this.noteButtons.push(btn) : null }
                  onClick={ () => this.props.history.push(`/note/${note.id}`) }
                  className="btn fullWidth borderBottom">
                  { note.firstLine ?
                  <div>
                    <p><strong>{ note.firstLine }</strong></p>
                    <p><span>{ formatLastModified(note.lastModified) }</span> { note.secondLine }</p>
                  </div>
                  :
                  <div style={{ opacity: '0.4' }}>
                    <p><strong>{ browser.i18n.getMessage('emptyPlaceHolder') }</strong></p>
                    <p><span>{ formatLastModified(note.lastModified) }</span></p>
                  </div>
                  }
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}


ListPanel.propTypes = {
    state: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanel);
