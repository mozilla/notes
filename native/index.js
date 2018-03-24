import React from 'react';
import { AppRegistry, View, Text, Button } from 'react-native';
import { StackNavigator } from 'react-navigation';

import { authorize } from 'react-native-app-auth';
const config = {
  serviceConfiguration: {
    //authorizationEndpoint: 'https://oauth.accounts.firefox.com/v1/authorization',
    authorizationEndpoint: 'https://oauth-featurebox.dev.lcip.org/v1/authorization',
    //tokenEndpoint: 'https://oauth.accounts.firefox.com/v1/token',
    tokenEndpoint: 'https://oauth-featurebox.dev.lcip.org/v1/token'
  },
  additionalParameters: {
    keys_jwk: 'eyJrdHkiOiJFQyIsImtpZCI6InRDU1FwejNIQTNSUkNVQldMVUhiS3lNTHRLX3FKZFVFV2I0cThBamNzZDQiLCJjcnYiOiJQLTI1NiIsIngiOiI0TUlDM2tMaVQyZmhxel9fMkFPWTlaNEFJT2VlVFFUQlJkZ3JfdW9kbEhvIiwieSI6Ijlwb0dOWDF3Ti1PX3ZwWVJvMW44bE9KeXhMOGJqU3hXNEpRbEM1TmZzYzgifQ'
  },
  clientId: 'b7d74070a481bc11',
  redirectUrl: 'testpilot-notes://redirect.android',
  scopes: ['profile', 'https://identity.mozilla.com/apps/notes']
};


function onAuth () {
  console.log('Wow debugk')
  const result = authorize(config).then(
    (r) => {
      console.log('r', r);
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
        <Text>Login Screen</Text>
        <Button
          onPress={onAuth}
          title="Sync your Notes"
          color="#841584"
          accessibilityLabel="Sync your Notes using your Firefox Account"
        />
      </View>
    );
  }
}

const Notes = StackNavigator(
  {
    Home: {
      screen: DetailsScreen,
    },
    Details: {
      screen: DetailsScreen,
    },
  },
  {
    initialRouteName: 'Home',
  }
);
//
// import App from './src/App';
//
// import SecondScreen from './src/SecondScreen';
//
// const reactNavigationSample = props => {
//   return <App navigation={props.navigation} />;
// };
//
// const NotesApp = StackNavigator({
//   Home: { screen: reactNavigationSample },
//   SecondScreen: { screen: SecondScreen, title: 'Second Screen' }
// });

AppRegistry.registerComponent('Notes', () => Notes);