// crypto shim loaded before anything else
import './shim.js'
// setup crash tracking
import { Sentry } from 'react-native-sentry';
// TODO: change this to prod vars later on
const SENTRY_DSN = null;

if (SENTRY_DSN) {
  Sentry.config(SENTRY_DSN).install();
}

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import React from 'react';
import { AppRegistry, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { StackNavigator, DrawerNavigator } from 'react-navigation';
import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';

import { COLOR_APP_BAR, COLOR_NOTES_BLUE } from './app/utils/constants';
import store from './app/store';

import DrawerItems from './app/components/DrawerItems';
import EditorPanel from './app/components/EditorPanel';
import ListPanel from './app/components/ListPanel';
import LoadingPanel from './app/components/LoadingPanel';
import LoginPanel from './app/components/LoginPanel';
import MoreMenu from './app/components/MoreMenu';

const appMainNavOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;

  return {
    header: (
      <Toolbar style={styles.toolbar}>
        <ToolbarAction icon='menu' onPress={() => navigation.navigate('DrawerOpen')} />
        <ToolbarContent title='Notes' />
      </Toolbar>
    )
  };
};

const editorPanelOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;

  const onPress = () => {
    navigation.navigate('ListPanel');
  };

  return {
    drawerLockMode: 'locked-closed',
    header: (
      <Toolbar style={styles.toolbar}>
        <MaterialIcons name="chevron-left"
           size={30}
           color={COLOR_NOTES_BLUE}
           onPress={() => { navigation.goBack(); }} />
        <ToolbarContent
          title='Saved'
          titleStyle={{fontSize: 14, textAlign: 'center', color: COLOR_NOTES_BLUE}}
          />
        <MoreMenu onPress={onPress} />
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
      screen: ListPanel
    },
    EditorPanel: {
      screen: EditorPanel,
      navigationOptions: editorPanelOptions
    },
  },
  {
    initialRouteName: 'ListPanel',
    navigationOptions: appMainNavOptions
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

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: COLOR_APP_BAR,
  }
});

AppRegistry.registerComponent('Notes', () => Notes);
