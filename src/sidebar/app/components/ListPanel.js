import React from 'react';

import { Link } from 'react-router-dom';


class ListPanel extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h1>List panel</h1>
        <Link to="/note">Go to note editor</Link>
      </div>
    );
  }
}


export default ListPanel;
