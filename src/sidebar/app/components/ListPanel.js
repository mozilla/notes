import React from 'react';

import { Link } from 'react-router-dom';

import NewIcon from './icons/NewIcon';


class ListPanel extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="listView">
        <Link to="/note"
          className="btn fullWidth borderBottom"
          title="New note">
          <NewIcon /> <span>New Note</span>
        </Link>
        <ul>
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Mattress Shopping</strong><br/>
              <span>1 min ago</span> Casper $899 Endy $999 Casper $899 Endy $999 Casper $899 Endy $999</p>
            </Link>
          </li>
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Paris Sightseeing</strong><br/>
              <span>5 min ago</span> Crêpe Donaire Pâtisserie and other friend ...</p>
            </Link>
          </li>
          <li>
            <Link to="/note"
              className="btn fullWidth borderBottom"
              title="New note">
              <p><strong>Final</strong><br/>
              <span>30 d ago</span> Lecture Notes</p>
            </Link>
          </li>
        </ul>
      </div>
    );
  }
}


export default ListPanel;
