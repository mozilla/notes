import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import PropTypes from 'prop-types';
import React from 'react';
import sync from '../sync';
import { Button } from 'react-native-paper';
import { COLOR_NOTES_BLUE } from '../utils/constants';
import { connect } from 'react-redux';
import { trackEvent } from '../utils/metrics';
import { View, Text, ToastAndroid, Image } from 'react-native';

const FXA_OAUTH_SERVER = 'https://oauth-featurebox.dev.lcip.org/v1';
const OAUTH_CLIENT_ID = 'b7d74070a481bc11';
const OAUTH_REDIRECT = 'https://mozilla-lockbox.github.io/fxa/ios-redirect.html';
const OAUTH_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];

const refreshConfig = {
  serviceConfiguration: {
    authorizationEndpoint: `${FXA_OAUTH_SERVER}/authorization`,
    tokenEndpoint: `${FXA_OAUTH_SERVER}/token`
  },
  clientId: OAUTH_CLIENT_ID,
  redirectUrl: OAUTH_REDIRECT,
  scopes: OAUTH_SCOPES
};

class LoginPanel extends React.Component {
  onAuth (options={}) {
    this.props.navigation.navigate('LoadingPanel');

    return Promise.resolve().then(() => {
      return fxaUtils.launchOAuthKeyFlow();
    }).then((loginDetails) => {
      trackEvent('login-success');

      ToastAndroid.show('Logged in as ' + loginDetails.profile.email, ToastAndroid.SHORT);
      return sync.loadFromKinto(kintoClient, loginDetails);
    }).then(() => {
      this.props.navigation.navigate('ListPanel');
    }).catch((err) => {
      this.props.navigation.navigate('LoginPanel');
      console.log('onAuth', err);
      ToastAndroid.show('Something went wrong: ' + err, ToastAndroid.SHORT);
      trackEvent('login-failed');
    })
  }

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 150, height: 150 }}
          source={require('../assets/notes-1024.png')}
        />
        <Text style={{ fontWeight: 'bold', fontSize: 22, padding: 10 }}>Welcome to Notes</Text>
        <Text style={{ fontSize: 16, padding: 10 }}>Access your Test Pilot Notes</Text>
        <Button raised onPress={this.onAuth.bind(this)} color={COLOR_NOTES_BLUE}>SIGN IN</Button>
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

LoginPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(LoginPanel)
