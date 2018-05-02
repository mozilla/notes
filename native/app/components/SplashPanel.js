import fxaUtils from '../vendor/fxa-utils';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { StackActions, NavigationActions } from 'react-navigation';

import { View, Text, ToastAndroid, Image } from 'react-native';

import { KINTO_LOADED } from '../utils/constants';
import browser from '../browser';
import { authenticate, kintoLoad } from '../actions';

class SplashPanel extends React.Component {
  componentDidMount() {
    fxaUtils.fxaGetCredential().then((loginDetails) => {
      if (loginDetails && loginDetails.profile) {
        this.props.dispatch(authenticate(loginDetails));
        this.props.dispatch(kintoLoad());
        const resetAction = StackActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'ListPanel' })],
        });
        this.props.navigation.dispatch(resetAction);
      } else {
        const resetAction = StackActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'LoginPanel' })],
        });
        this.props.navigation.dispatch(resetAction);
      }
    });
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
