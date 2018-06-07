import fxaUtils from '../vendor/fxa-utils';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { StackActions, NavigationActions } from 'react-navigation';

import { View, Text, ToastAndroid, Image, NetInfo } from 'react-native';

import { KINTO_LOADED } from '../utils/constants';
import browser from '../browser';
import { authenticate, kintoLoad, setNetInfo } from '../actions';


class SplashPanel extends React.Component {

  // Reset history from StackNavigator and redirect to `destination` param
  resetAndRedirect = (destination) => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: destination })],
    });
    this.props.navigation.dispatch(resetAction);
  };

  componentDidMount() {
    fxaUtils.fxaGetCredential().then((loginDetails) => {
      if (loginDetails && loginDetails.profile) {
        this.props.dispatch(authenticate(loginDetails));

        // On opening the app, we check network stratus
        NetInfo.isConnected.fetch().then(isConnected => {
          this.props.dispatch(setNetInfo(isConnected));
          if (isConnected) this.props.dispatch(kintoLoad());
          this.resetAndRedirect('ListPanel');
        }).catch(() => {
          this.resetAndRedirect('ListPanel');
        });
      } else {
        this.resetAndRedirect('LoginPanel');
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
