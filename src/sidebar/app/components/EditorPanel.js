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
    if (props.match.params.id !== 'new') {
      this.note = props.state.notes.find((note) => {
        return note.id === props.match.params.id;
      });
      this.props.dispatch(setFocusedNote(props.match.params.id));
    } else {
      // We initialize our note and request to kinto an ID.
      props.dispatch(createNote());
    }

    this.onNewNoteEvent = () => {
      this.note = {};
      this.props.dispatch(createNote());
    };
  }

  componentDidMount() {
    // Create a connection with the background script to handle open and
    // close events.
    browser.runtime.connect();
  }

  // This is triggered when redux update state.
  componentWillReceiveProps(nextProps) {
    if (nextProps.state && !this.note.id) {
      this.note = nextProps.state.notes.find((note) => {
        return !note.id;
      });
    } else if (this.note.id && nextProps.state.sync.focusedNoteId !== this.note.id) {
      this.props.dispatch(setFocusedNote(this.note.id));
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
