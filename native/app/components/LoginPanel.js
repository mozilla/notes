import React from 'react';
import { View, Text, ToastAndroid, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import store from '../store';

import { authorize, refresh } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';

import { createNote } from '../actions';

const base64url = require('../vendor/base64url');
const fxaCryptoRelier = require('../vendor/fxa-crypto-relier');
const fxaUtils = require('../vendor/fxa-utils');
const kintoUtils = require('../vendor/kinto-utils');

const FXA_PROFILE_SERVER = 'https://featurebox.dev.lcip.org/profile/v1';
const FXA_OAUTH_SERVER = 'https://oauth-featurebox.dev.lcip.org/v1';
const OAUTH_CLIENT_ID = 'b7d74070a481bc11';
const OAUTH_REDIRECT = 'https://mozilla-lockbox.github.io/fxa/ios-redirect.html';
const OAUTH_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];

const refreshConfig = {
  serviceConfiguration: {
    //authorizationEndpoint: 'https://oauth.accounts.firefox.com/v1/authorization',
    authorizationEndpoint: `${FXA_OAUTH_SERVER}/authorization`,
    //tokenEndpoint: 'https://oauth.accounts.firefox.com/v1/token',
    tokenEndpoint: `${FXA_OAUTH_SERVER}/token`
  },
  clientId: OAUTH_CLIENT_ID,
  redirectUrl: OAUTH_REDIRECT,
  scopes: OAUTH_SCOPES
};

const fxaKeyUtils = new fxaCryptoRelier.KeyUtils();


class LoginPanel extends React.Component {
  onAuth (options={}) {
    this.props.navigation.navigate('LoadingPanel');

    let oauthResponse;
    let scopedKeys;

    return Promise.resolve().then(() => {
      if (options.oauthResponse) {
        console.log('Using oauthResponse:', options.oauthResponse);

        return options.oauthResponse;
      } else {
        return fxaKeyUtils.createApplicationKeyPair().then((keyTypes) => {
          const base64JwkPublicKey = base64url.encode(JSON.stringify(keyTypes.jwkPublicKey), 'utf8');
          const config = {
            serviceConfiguration: {
              //authorizationEndpoint: 'https://oauth.accounts.firefox.com/v1/authorization',
              authorizationEndpoint: `${FXA_OAUTH_SERVER}/authorization`,
              //tokenEndpoint: 'https://oauth.accounts.firefox.com/v1/token',
              tokenEndpoint: `${FXA_OAUTH_SERVER}/token`
            },
            additionalParameters: {
              keys_jwk: base64JwkPublicKey,
              access_type: 'offline'
            },
            clientId: OAUTH_CLIENT_ID,
            redirectUrl: OAUTH_REDIRECT,
            scopes: OAUTH_SCOPES
          };

          return authorize(config);
        });
      }
    }).then((response) => {
      oauthResponse = response;
      const bundle = oauthResponse.additionalParameters.keys_jwe;
      console.log('oauthResponse', oauthResponse);
      console.log('keys_jwe', bundle);

      return fxaKeyUtils.decryptBundle(bundle);
    }).then((keys) => {
      scopedKeys = keys;
      return fxaUtils.fxaFetchProfile(FXA_PROFILE_SERVER, oauthResponse.accessToken);
    }).then((profile) => {
      console.log('profile', profile);
      Keychain.setGenericPassword(profile.uid, JSON.stringify({
        profile: profile,
        oauthResponse: oauthResponse
      }));
      ToastAndroid.show('Logged in as ' + profile.email, ToastAndroid.SHORT);

      return kintoUtils.fetchRecords(oauthResponse.accessToken)
    }).then((records) => {
      console.log('kinto records', records);
      return kintoUtils.decryptRecords(records, scopedKeys)
    }).then((dec) => {
      console.log('decrypted records', dec);

      const newNotes = [];
      dec.forEach((note) => {
        newNotes.push(store.dispatch(createNote(note.content)));
      });

      return Promise.all(newNotes);
    }).then(() => {
      this.props.navigation.navigate('ListPanel');

      return refresh(refreshConfig, {
        refreshToken: oauthResponse.refreshToken
      });
    }).then((refreshResult) => {
      console.log('refreshResult', refreshResult);
    }).catch((err) => {
      this.props.navigation.navigate('LoginPanel');
      console.log('onAuth', err);
      ToastAndroid.show('Something went wrong: ' + err, ToastAndroid.SHORT);
    })
  }

  render() {
    try {
      // Retrieve the credentials
      Keychain.getGenericPassword().then((credentials) => {
        if (credentials) {
          console.log('Credentials successfully loaded for user ' + credentials.username);
          const oauthResponse = JSON.parse(credentials.password).oauthResponse;
          console.log(oauthResponse);
          // return this.onAuth({
          //   oauthResponse: oauthResponse
          // });
        } else {
          console.log('No credentials stored')
        }

      });
    } catch (error) {
      // TODO: What on earth do we do here?
      console.log('Keychain cannot be accessed!', error);
    }

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 150, height: 150 }}
          source={require('../assets/notes-1024.png')}
        />
        <Text style={{ fontWeight: 'bold', fontSize: 22, padding: 10 }}>Welcome to Notes</Text>
        <Text style={{ fontSize: 16, padding: 10 }}>Access your Test Pilot Notes</Text>
        <Button raised onPress={this.onAuth.bind(this)} color="#008AF8">SIGN IN</Button>
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
