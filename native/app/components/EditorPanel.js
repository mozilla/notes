import React from 'react';
import { WebView } from 'react-native';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

class EditorPanel extends React.Component {

  render() {
    return (
      <WebView source={{ html: "<h1>Hello</h1>" }} />
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

EditorPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(EditorPanel)
