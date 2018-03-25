import React from 'react';
import { View, Text, ProgressBarAndroid, Image } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

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
        <ProgressBarAndroid styleAttr="Inverse" />
        <Text style={{ fontWeight: 'bold', fontSize: 22, padding: 20 }}>Decrypting your notes...</Text>
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
