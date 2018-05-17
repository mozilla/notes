// crypto shim loaded before anything else
import './shim.js'
// setup crash tracking
import { Sentry } from 'react-native-sentry';
// TODO: change this to prod vars later on
const SENTRY_DSN = require('./config').SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.config(SENTRY_DSN, {
    maxBreadcrumbs: 5,
    autoBreadcrumbs: {
      'xhr': false, // XMLHttpRequest
      'console': false, // console logging
      'dom': false, // DOM interactions, i.e. clicks/typing
      'location': false, // url changes, including pushState/popState
      'sentry': true // sentry events
    }
  }).install();
}

import React from 'react';
import { AppRegistry, StyleSheet, StatusBar } from 'react-native';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'
import { createStackNavigator, createDrawerNavigator } from 'react-navigation';
import { Provider as PaperProvider } from 'react-native-paper';

import { COLOR_APP_BAR, COLOR_STATUS_BAR } from './app/utils/constants';
import { store, persistor } from './app/store';

import { trackEvent } from './app/utils/metrics';

import DrawerItems from './app/components/DrawerItems';
import EditorPanel from './app/components/EditorPanel';
import EditorPanelHeader from './app/components/EditorPanelHeader';
import ListPanel from './app/components/ListPanel';
import ListPanelHeader from './app/components/ListPanelHeader';
import LoadingPanel from './app/components/LoadingPanel';
import LoginPanel from './app/components/LoginPanel';
import SplashPanel from './app/components/SplashPanel';

import background from './app/background';

const appMainNavOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;
  return {
    header: (
      <ListPanelHeader navigation={navigation}></ListPanelHeader>
    )
  };
};

const editorPanelOptions = ({ navigation }) => {
  const { params = {} } = navigation.state;
  const routeName = navigation.state.routeName;

  return {
    header: (
      <EditorPanelHeader navigation={navigation}>
      </EditorPanelHeader>
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

const routeConfigMap = {
  SplashPanel: {
    screen: SplashPanel,
    navigationOptions: {
      header: null,
      drawerLockMode: 'locked-closed'
    }
  },
  LoginPanel: {
    screen: LoginPanel,
    navigationOptions: {
      header: null,
      drawerLockMode: 'locked-closed'
    }
  },
  LoadingPanel: {
    screen: LoadingPanel,
    navigationOptions: {
      header: null,
      drawerLockMode: 'locked-closed'
    }
  },
  ListPanel: {
    screen: (props) => {
      return <PaperProvider><ListPanel {...props} /></PaperProvider>
    }
  },
  EditorPanel: {
    screen: EditorPanel,
    navigationOptions: editorPanelOptions
  },
};

const stackConfig = {
  initialRouteName: 'SplashPanel',
  navigationOptions: appMainNavOptions,
  transitionConfig: () => ({
    screenInterpolator: (props) => {
      return fade(props)
    }
  })
};

const App = createDrawerNavigator(
  { Home: {
      screen: createStackNavigator(routeConfigMap, stackConfig),
      navigationOptions: ({ navigation, navigationOptions }) => {
        // react-navigation since v2 no longer reach navigationOptions on stack tree,
        // To disable drawerLockMode on some screen we need to manually reach this value.
        const routes = navigation.state.routes;
        const routeName = routes[routes.length - 1].routeName;
        if (Object.keys(routeConfigMap).includes(routeName) &&
            routeConfigMap[routeName].navigationOptions &&
            routeConfigMap[routeName].navigationOptions.drawerLockMode) {
          navigationOptions.drawerLockMode = routeConfigMap[routeName].navigationOptions.drawerLockMode;
        }
        return navigationOptions;
      }
    }
  },
  {
    contentComponent: (props) => (
      <DrawerItems {...props} />
    ),
  }
);

class Notes extends React.Component {
  componentDidMount() {
    StatusBar.setBackgroundColor('rgba(249, 249, 250, 0.3)');
    StatusBar.setTranslucent(true);
    StatusBar.setBarStyle('dark-content');
    trackEvent('open');
  }

  render () {
    return (
      <StoreProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PaperProvider>
            <App/>
          </PaperProvider>
        </PersistGate>
      </StoreProvider>
    )
  }
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: COLOR_APP_BAR,
  }
});

AppRegistry.registerComponent('Notes', () => Notes);
