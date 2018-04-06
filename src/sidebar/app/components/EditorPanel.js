/* eslint-disable react/jsx-key */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Header from './Header';
import Editor from './Editor';

import { setFocusedNote } from '../actions';

class EditorPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;

    this.origin = 'list-view'; // used while sending 'new-note' metric

    this.note = {}; // Note should be reference to state.
    if (props.match.params.id) {
      this.note = props.state.notes.find((note) => {
        return note.id === props.match.params.id;
      });
      this.props.dispatch(setFocusedNote(props.match.params.id));
    }

    this.onNewNoteEvent = () => {
      this.origin = 'in-note';
      this.props.dispatch(setFocusedNote());
      props.history.push('/note');
    };
  }

  // This is triggered when redux update state.
  componentWillReceiveProps(nextProps) {
    if (this.props.state.sync.focusedNoteId !== nextProps.state.sync.focusedNoteId) {
      this.note = nextProps.state.notes.find((note) => {
        return note.id === nextProps.state.sync.focusedNoteId;
      });
      this.props.dispatch(setFocusedNote(nextProps.state.sync.focusedNoteId));
    } else if (!this.props.state.sync.isSyncing) {
      this.note = nextProps.state.notes.find((note) => {
        return note.id === nextProps.state.sync.focusedNoteId;
      });
    }

    if (!this.note) {
      this.note = {};
    }
  }

  render() {
    return [
      <Header key="header" history={this.props.history} note={this.note} onNewNoteEvent={this.onNewNoteEvent} />,
      <Editor key="editor" history={this.props.history} note={this.note} origin={this.origin} />
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
