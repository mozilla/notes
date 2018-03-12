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
      this.timer = setTimeout(this.refreshTime, 45000);
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
        <Link to="/note"
          className="btn fullWidth borderBottom"
          title="New note">
          <NewIcon /> <span>{ browser.i18n.getMessage('newNote') }</span>
        </Link>
        <ul>
          { this.props.state.note.firstLine && this.props.state.note.lastModified ?
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>{ this.props.state.note.firstLine }</strong></p>
              <p><span>{ moment(this.props.state.note.lastModified).fromNow() }</span> { this.props.state.note.secondLine }</p>
            </Link>
          </li> : null }
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Mattress Shopping</strong></p>
              <p><span>1 min ago</span> Casper $899 Endy $999 Casper $899 Endy $999 Casper $899 Endy $999</p>
            </Link>
          </li>
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Paris Sightseeing</strong></p>
              <p><span>5 min ago</span> Crêpe Donaire Pâtisserie and other friend ...</p>
            </Link>
          </li>
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Final</strong></p>
              <p><span>30 d ago</span> Lecture Notes</p>
            </Link>
          </li>
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
