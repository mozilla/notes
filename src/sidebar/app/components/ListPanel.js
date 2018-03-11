import React from 'react';

import { Link } from 'react-router-dom';

import NewIcon from './icons/NewIcon';

const styles = {

};

class ListPanel extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Link to="/note"
          className="btn fullWidth borderBottom"
          title="New note">
          <NewIcon /> <span>New Note</span>
        </Link>
        <h1>List panel</h1>
        <Link to="/note">Go to note editor</Link>
      </div>
    );
  }
}


export default ListPanel;
