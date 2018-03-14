import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import moment from 'moment';

import { Link } from 'react-router-dom';

import NewIcon from './icons/NewIcon';


class ListPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
    this.timer = null;

    this.refreshTime = () => {
      clearTimeout(this.timer);
      this.setState({});
      this.timer = setTimeout(this.refreshTime, 60000);
    };
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
        <Link to="/note/new"
          className="btn fullWidth borderBottom"
          title="New note">
          <NewIcon /> <span>{ browser.i18n.getMessage('newNote') }</span>
        </Link>
        <ul>
          { this.props.state.notes.map((note) => {
            return (
              <li>
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
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanel);
