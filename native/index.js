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
import SplashPanel from './app/components/SplashPanel';

const appMainNavOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;

  return {
    header: (
      <Toolbar style={styles.toolbar}>
        <ToolbarAction
          size={20}
          style={{ paddingTop: 4 }}
          icon='menu'
          onPress={() => navigation.navigate('DrawerOpen')} />
        <ToolbarContent
          style={{ paddingLeft: 0,  }}
          titleStyle={{ fontSize: 18, color: COLOR_NOTES_BLUE }}
          title='Notes' />
      </Toolbar>
    )
  };
};

const editorPanelOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;

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
        <MoreMenu navigation={navigation} />
      </Toolbar>
    )
  };
};

const fade = (props) => {
  const {position, scene} = props

  const index = scene.index

  const translateX = 0
  const translateY = 0

  const opacity = position.interpolate({
    inputRange: [index - 0.7, index, index + 0.7],
    outputRange: [0.3, 1, 0.3]
  })

  return {
    opacity,
    transform: [{translateX}, {translateY}]
  }
}

const AppNavigator = StackNavigator(
  {
    SplashPanel: {
      screen: SplashPanel,
      navigationOptions: {
        header: null,
        drawerLockMode: 'locked-closed',
      }
    },
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
    initialRouteName: 'SplashPanel',
    navigationOptions: appMainNavOptions,
    transitionConfig: () => ({
      screenInterpolator: (props) => {
        return fade(props)
      }
    })
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
