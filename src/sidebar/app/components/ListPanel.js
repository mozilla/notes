import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import moment from 'moment';

import { Link } from 'react-router-dom';

import NewIcon from './icons/NewIcon';
import { deleteNote, setFocusedNote, createNote } from '../actions';


class ListPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
    this.timer = null;

    this.refreshTime = () => {
      clearTimeout(this.timer);
      this.setState({});
      this.timer = setTimeout(this.refreshTime, 1000);
    };

    this.requestNewNote = () => {
      // Request not id from background.
      this.props.dispatch(createNote()).then(id => {
        props.history.push(`/note/${id}`);
      });
    };
  }

  componentWillMount() {
    // We delete notes with no content
    const listOfEmptyNote = this.props.state.notes.filter((n) => !n.firstLine ).map((n) => n.id);
    listOfEmptyNote.forEach((id) => this.props.dispatch(deleteNote(id)));

    // Set no focused Note to create new note on send note event.
    this.props.dispatch(setFocusedNote());
  }

  componentDidMount() {
    this.refreshTime();
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    return (
      <div className="listView">
        <button
          className="btn fullWidth borderBottom"
          onClick={this.requestNewNote}
          title="New note">
          <NewIcon /> <span>{ browser.i18n.getMessage('newNote') }</span>
        </button>
        <ul>
          { this.props.state.notes.filter((note) => note.firstLine ).sort((a, b) => {
            if (a.lastModified.getTime() !== b.lastModified.getTime()) {
              return a.lastModified.getTime() < b.lastModified.getTime() ? 1 : -1;
            }
            return a.firstLine < b.firstLine ? 1 : -1;
          }).map((note) => {
            return (
              <li key={note.id}>
                <Link to={`/note/${note.id}`}
                  className="btn fullWidth borderBottom"
                  title="New note">
                  <p><strong>{ note.firstLine }</strong></p>
                  <p><span>{ moment(note.lastModified).fromNow() }</span> { note.secondLine }</p>
                </Link>
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
