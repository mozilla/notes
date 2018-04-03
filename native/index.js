// crypto shim loaded before anything else
import './shim.js'

import React from 'react';
import { AppRegistry, Button } from 'react-native';
import { StackNavigator } from 'react-navigation';
import { Provider } from 'react-redux';
import store from './app/store';

import LoginPanel from './app/components/LoginPanel';
import ListPanel from './app/components/ListPanel';
import LoadingPanel from './app/components/LoadingPanel';
import EditorPanel from './app/components/EditorPanel';

const k = require('react-native-rust-jose-c');
console.log('k: ' + new k())
console.log('jose version is: ' + k.getVersion())
const editorPanelNavOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;

  return {
    headerRight: (<Button handleSubmit={params.handleSubmit} title="Save"/>)
  };
};

const AppNavigator = StackNavigator(
  {
    LoginPanel: {
      screen: LoginPanel,
      navigationOptions: {
        title: 'Sign in to Notes'
      }
    },
    LoadingPanel: {
      screen: LoadingPanel,
    },
    ListPanel: {
      screen: ListPanel,
    },
    EditorPanel: {
      screen: EditorPanel,
      navigationOptions: editorPanelNavOptions
    },
  },
  {
    initialRouteName: 'LoginPanel',
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
