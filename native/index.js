// crypto shim loaded before anything else
import './shim.js'

import React from 'react';
import { AppRegistry, Button, StatusBar } from 'react-native';
import { StackNavigator, DrawerNavigator } from 'react-navigation';
import { Toolbar,
  ToolbarContent,
  ToolbarAction,
  ToolbarBackAction,
} from 'react-native-paper';
import { Provider } from 'react-redux';
import store from './app/store';

import LoginPanel from './app/components/LoginPanel';
import ListPanel from './app/components/ListPanel';
import LoadingPanel from './app/components/LoadingPanel';
import EditorPanel from './app/components/EditorPanel';
import DrawerItems from './app/components/DrawerItems';
import MoreMenu from './app/components/MoreMenu';

const editorPanelNavOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;

  return {
    header: (
      <Toolbar>
        <ToolbarAction
          icon="menu"
          onPress={() => navigation.navigate('DrawerOpen')}
        />
        <ToolbarContent title="Notes" />
        <MoreMenu />
      </Toolbar>
    )
  };
};


const AppNavigator = StackNavigator(
  {
    LoginPanel: {
      screen: LoginPanel,
      navigationOptions: {
        header: null,
        drawerLockMode: 'locked-closed',
      }
    },
    LoadingPanel: {
      screen: LoadingPanel,
      navigationOptions: {
        header: null,
        drawerLockMode: 'locked-closed',
      }
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
    initialRouteName: 'ListPanel',
    navigationOptions: editorPanelNavOptions
  }
);

const App = DrawerNavigator(
  { Home: { screen: AppNavigator } },
  {
    contentComponent: (props) => (
      <DrawerItems {...props} />
    ),
  }
);

class Notes extends React.Component {
  render () {
    return (
      <Provider store={store}>
        <App/>
      </Provider>
    )
  }
}

AppRegistry.registerComponent('Notes', () => Notes);
