/* eslint-disable react/jsx-key */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Header from './Header';
import Editor from './Editor';

import { createNote, setFocusedNote } from '../actions';

class EditorPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;

    this.note = {}; // Note should be reference to state.
    this.note = props.state.notes.find((note) => {
      return note.id === props.match.params.id;
    });
    this.props.dispatch(setFocusedNote(props.match.params.id));

    this.onNewNoteEvent = () => {
      // Request new id and redirec to new note
      this.props.dispatch(createNote()).then(id => {
        props.history.push(`/note/${id}`);
      });
    };
  }

  componentDidMount() {
    // Create a connection with the background script to handle open and
    // close events.
    browser.runtime.connect();
  }

  // This is triggered when redux update state.
  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.id !== this.props.match.params.id) {
      this.note = nextProps.state.notes.find((note) => {
        return note.id === nextProps.match.params.id;
      });
      this.props.dispatch(setFocusedNote(nextProps.match.params.id));
    } else {
      if (!this.props.state.sync.isSyncing) {
        this.note = nextProps.state.notes.find((note) => {
          return note.id === nextProps.match.params.id;
        });
      }
    }
  }

  render() {
    return [
      <Header key="header" history={this.props.history} note={this.note} onNewNoteEvent={this.onNewNoteEvent} />,
      <Editor key="editor" note={this.note} />
    ];
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

EditorPanel.propTypes = {
    state: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(EditorPanel);
