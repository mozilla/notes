import './shim.js'

import React from 'react';
import { AppRegistry, View, Text, Button, ToastAndroid, Image } from 'react-native';
import { StackNavigator } from 'react-navigation';
import ListPanel from './app/components/ListPanel';
import LoadingPanel from './app/components/LoadingPanel';
import { Provider } from 'react-redux';
import store from './app/store';

//var crypto = require('crypto');
var base64url = require('./base64url');
var fxaCryptoRelier = require('./fxa-crypto-relier');
var fxaUtils = require('./vendor/fxa-utils');
var kintoUtils = require('./vendor/kinto-utils');

const FXA_PROFILE_SERVER = 'https://featurebox.dev.lcip.org/profile/v1';

var fxaKeyUtils = new fxaCryptoRelier.KeyUtils();

import { authorize } from 'react-native-app-auth';
import {createNote} from './app/actions';

function onAuth () {
  this.props.navigation.navigate('LoadingPanel');
  fxaKeyUtils.createApplicationKeyPair().then(
    (keyTypes) => {
      const base64JwkPublicKey = base64url.encode(JSON.stringify(keyTypes.jwkPublicKey), 'utf8');

      console.log('keyTypes.base64JwkPublicKey', base64JwkPublicKey);
      const config = {
        serviceConfiguration: {
          //authorizationEndpoint: 'https://oauth.accounts.firefox.com/v1/authorization',
          authorizationEndpoint: 'https://oauth-featurebox.dev.lcip.org/v1/authorization',
          //tokenEndpoint: 'https://oauth.accounts.firefox.com/v1/token',
          tokenEndpoint: 'https://oauth-featurebox.dev.lcip.org/v1/token'
        },
        additionalParameters: {
          keys_jwk: base64JwkPublicKey
        },
        clientId: 'b7d74070a481bc11',
        redirectUrl: 'testpilot-notes://redirect.android',
        scopes: ['profile', 'https://identity.mozilla.com/apps/notes']
      };

      authorize(config).then(
        (response) => {
          console.log('response', response)
          const bundle = response.additionalParameters.keys_jwe;
          console.log('bundle', bundle);

          return fxaKeyUtils.decryptBundle(bundle)
            .then((keys) => {
              return fxaUtils.fxaFetchProfile(FXA_PROFILE_SERVER, response.accessToken).then((profile) => {
                console.log(profile);
                ToastAndroid.show('Logged in as ' + profile.email, ToastAndroid.SHORT);

                return kintoUtils.fetchRecords(response.accessToken).then((records) => {
                  console.log('records', records)
                  //var data = records.data[0];
                  console.log('kinto data', records);

                  return kintoUtils.decryptRecords(records, keys).then((dec) => {
                    console.log('decrypted', dec);

                    const newNotes = [];
                    dec.forEach((note) => {
                      newNotes.push(store.dispatch(createNote(note.content)));
                    });

                    return Promise.all(newNotes).then((res) => {
                      this.props.navigation.navigate('ListPanel');
                    }, (err) => {
                      console.log('e', err);
                    });

                  }, (err) => {
                    console.log('e', err);
                  })
                }, (err) => {
                  console.log('records err', err)
                })
              }, (err) => {
                console.log('profile', err)
              });

            })
        },
        (e) => {
          console.log('e', e);
        }
      );
    },
    (e) => {
      console.log('e', e);
    }
  );
}

class DetailsScreen extends React.Component {
  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          style={{width: 250, height: 250 }}
          source={require('./assets/notes-1024.png')}
        />
        <Text style={{ fontWeight: 'bold', fontSize: 22, padding: 20 }}>Get your notes from Firefox</Text>
        <Button
          onPress={onAuth.bind(this)}
          title="Sign In"
          color="#008AF8"
          accessibilityLabel="Sync your Notes using your Firefox Account"
        />
      </View>
    );
  }
}

const AppNavigator = StackNavigator(
  {
    Home: {
      screen: DetailsScreen,
    },
    LoadingPanel: {
      screen: LoadingPanel,
    },
    ListPanel: {
      screen: ListPanel,
    },
  },
  {
    initialRouteName: 'Home',
  }
);

class Notes extends React.Component {
  render () {
    return (
      <Provider store={store}>
        <AppNavigator/>
      </Provider>
    )
  }
}

AppRegistry.registerComponent('Notes', () => Notes);