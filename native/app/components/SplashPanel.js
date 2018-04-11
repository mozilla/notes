import fxaUtils from '../vendor/fxa-utils';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';
import { View, Text, ToastAndroid, Image } from 'react-native';

import { authenticate } from '../actions';

class SplashPanel extends React.Component {
  componentDidMount() {
    fxaUtils.fxaGetCredential().then((loginDetails) => {
      if (loginDetails && loginDetails.profile) {
        this.props.dispatch(
          authenticate(
            loginDetails.profile.email,
            loginDetails.profile.avatar,
            loginDetails.profile.displayName
          )
        );
        this.props.navigation.dispatch(NavigationActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'ListPanel' })],
        }));
      } else {
        this.props.navigation.dispatch(NavigationActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'LoginPanel' })],
        }));
      }
    }).catch((e) => console.error(e));
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 150, height: 150 }}
          source={require('../assets/notes-1024.png')}
        />
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

SplashPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(SplashPanel)
