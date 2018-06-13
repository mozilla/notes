import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'react-native-paper';
import { NavigationActions, StackActions } from 'react-navigation';
import { View, Text, ProgressBarAndroid, ToastAndroid, Image, StyleSheet } from 'react-native';

import fxaUtils from '../vendor/fxa-utils';
import { authenticate, kintoLoad } from '../actions';
import { COLOR_NOTES_BLUE } from '../utils/constants';
import i18nGetMessage from '../utils/i18n';
import { trackEvent } from '../utils/metrics';

class LoadingPanel extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {

    return fxaUtils.launchOAuthKeyFlow()
    .then((loginDetails) => {
      trackEvent('login-success');
      this.props.dispatch(authenticate(loginDetails));
      ToastAndroid.show('Logged in as ' + loginDetails.profile.email, ToastAndroid.LONG);

      this.props.dispatch(kintoLoad());

      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'ListPanel' })],
      });
      this.props.navigation.dispatch(resetAction);
      return Promise.resolve();
    }).catch((err) => {
      console.log('onAuth', err);
      ToastAndroid.show('Something went wrong. ' + err, ToastAndroid.LONG);
      trackEvent('login-failed');
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LoginPanel' })],
      });
      setTimeout(() => {
        this.props.navigation.dispatch(resetAction);
      }, 1000);
    });
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 150, height: 150 }}
          source={require('../assets/notes-1024.png')}
        />
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
