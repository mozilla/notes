// crypto shim loaded before anything else
import './shim.js'

import React from 'react';
import { AppRegistry } from 'react-native';
import { StackNavigator } from 'react-navigation';
import { Provider } from 'react-redux';
import store from './app/store';

import LoginPanel from './app/components/LoginPanel';
import ListPanel from './app/components/ListPanel';
import LoadingPanel from './app/components/LoadingPanel';

const AppNavigator = StackNavigator(
  {
    Login: {
      screen: LoginPanel,
    },
    LoadingPanel: {
      screen: LoadingPanel,
    },
    ListPanel: {
      screen: ListPanel,
    },
  },
  {
    initialRouteName: 'Login',
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
