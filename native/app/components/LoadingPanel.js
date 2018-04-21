import PropTypes from 'prop-types';
import React from 'react';
import { COLOR_NOTES_BLUE } from '../utils/constants';
import { connect } from 'react-redux';
import { View, Text, ProgressBarAndroid, Image } from 'react-native';

class LoadingPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 150, height: 150 }}
          source={require('../assets/notes-1024.png')}
        />
        <Text style={{ fontWeight: 'bold', fontSize: 22, padding: 20 }}>Decrypting your notes...</Text>
        <ProgressBarAndroid color={COLOR_NOTES_BLUE} styleAttr="Inverse" />
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

LoadingPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(LoadingPanel)
