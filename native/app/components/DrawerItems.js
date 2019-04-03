import * as React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { NavigationActions, StackActions, DrawerActions } from 'react-navigation';
import { Title, Text, TouchableRipple } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { View, ScrollView, StyleSheet, Image, Linking, Modal, Animated, Easing,
  StatusBar, ToastAndroid } from 'react-native';
import moment from 'moment';

import { COLOR_DARK_BACKGROUND,
         COLOR_DARK_TEXT,
         COLOR_DARK_SUBTEXT,
         COLOR_DARK_WARNING,
         COLOR_DARK_SYNC,
         COLOR_NOTES_BLUE,
         KINTO_LOADED,
         DISCONNECTED } from '../utils/constants';

import { DrawerItem, DrawerSection, Colors } from 'react-native-paper';
import fxaUtils from '../vendor/fxa-utils';
import { store } from '../store';
import browser from '../browser';
import { disconnect, kintoLoad, authenticate, syncing, reconnectSync, openingLogin } from '../actions';

// Url to open to give feedback
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=android';

function navigateToLogin (props) {

  const resetAction = StackActions.reset({
    index: 0,
    actions: [NavigationActions.navigate({ routeName: 'LoginPanel' })],
  });
  props.navigation.dispatch(resetAction);
}

class DrawerItems extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      rotation: new Animated.Value(1),
      isOpeningLogin: false
    };
    // DrawerItemsData store our drawer button list
    this.drawerItemsData = [
      {
        label: browser.i18n.getMessage('drawerBtnLogOut'),
        action: () => {
          navigateToLogin(props);
          // We delay disconnect event to avoid empty UI while drawer is closing
          setTimeout(() => {
            props.dispatch(disconnect());
          }, 500);
        }
      },
      {
        label: browser.i18n.getMessage('drawerBtnFeedback'),
        action: () => {
          return Linking.openURL(SURVEY_PATH);
        }
      }
    ];

    this._startAnimation = () => {
      this.state.rotation.setValue(1);
      Animated.timing(this.state.rotation, {
        toValue: 0,
        duration: 1000,
        easing: Easing.linear
      }).start(() => {
        if (this.props.state.sync.isSyncing) {
          this._startAnimation()
        }
      });
    };

    // I don't think this is working.
    this._stopAnimation = () => {
      Animated.timing(
        this.state.rotation
      ).stop();
    };

    this._requestSync = () => {

      if (this.props.state.sync.isConnected === false) {
        if (this.props.navigation.state.isDrawerOpen) {
          props.navigation.dispatch(DrawerActions.closeDrawer());
          ToastAndroid.show(browser.i18n.getMessage('toastOffline'), ToastAndroid.LONG);
        }
      } else if (!this.props.state.sync.loginDetails) {
        this._requestReconnect();
      } else {
        if (this.props.state.sync.isSyncing) {
          props.navigation.dispatch(DrawerActions.closeDrawer());
        } else {
          props.dispatch(kintoLoad('drawer')).then(_ => {
            // If load succeed, we close drawer
            props.navigation.dispatch(DrawerActions.closeDrawer());
          });
        }

      }
    };

    this._requestReconnect = () => {
      if (!this.props.state.sync.loginDetails && !this.props.state.sync.isOpeningLogin) {
        this.setState({ isOpeningLogin: true });
        this.props.dispatch(openingLogin());
        return Promise.resolve()
        .then(() => fxaUtils.launchOAuthKeyFlow())
        .then((loginDetails) => {
          this.setState({ isOpeningLogin: false });
          this.props.dispatch(authenticate(loginDetails));
          this.props.dispatch(kintoLoad()).then(() => {
            props.navigation.dispatch(DrawerActions.closeDrawer());
          });
        }).catch((exception) => {
          this.setState({ isOpeningLogin: false });
          this.props.dispatch(reconnectSync());
        });
      }
    };
  }

  componentWillReceiveProps(newProps) {
    if (newProps.state.sync.isSyncing && !this.props.state.sync.isSyncing) {
      this._startAnimation();
    } else if (this.props.state.sync.isSyncing && !newProps.state.sync.isSyncing) {
      this._stopAnimation();
    }
  }

  componentWillUnmount() {
    this._stopAnimation();
  }

  render() {
    let statusLabel;

    if (this.props.state.sync.isConnected === false) {
      statusLabel = browser.i18n.getMessage('statusLabelOfflineDrawer');
    } else if (this.props.state.sync.isSyncing) {
      statusLabel = browser.i18n.getMessage('statusLabelSyncingDrawer');
    } else {
      let time = moment(this.props.state.sync.lastSynced).format('LT');
      statusLabel = browser.i18n.getMessage('statusLabelTimeDrawer', time);
    }

    return (
      <View style={styles.drawerContent}>
        <View style={{ paddingTop: 55, marginLeft: 30, paddingBottom: 30, borderBottomColor: '#4A4A4F', borderBottomWidth: 1 }}>
          <Image
            style={{width: 75, height: 75, marginBottom: 4 }}
            borderRadius={100}
            borderColor='#FFFFFF'
            borderWidth={2}
            resizeMode='cover'
            source={{uri: this.props.state.profile.avatar}}
          />
          <Title style={{ color: COLOR_DARK_TEXT }}>{this.props.state.profile.displayName}</Title>
          <Text style={{ color: COLOR_DARK_SUBTEXT }}>{this.props.state.profile.email}</Text>
        </View>
        <ScrollView style={styles.drawerSection}>
        {this.drawerItemsData.map((item, index) => (
          <TouchableRipple key={index} style={styles.wrapper} onPress={() => item.action()}>
            <Text style={{ color: COLOR_DARK_TEXT, paddingLeft: 14 }}>{ item.label }</Text>
          </TouchableRipple>
        ))}
        </ScrollView>
        { this.props.state.sync.error ?
          <TouchableRipple style={styles.footer} onPress={this._requestReconnect}>
            <View style={styles.footerWrapper}>
              <Text style={{ color: COLOR_DARK_WARNING, fontSize: 13 }}>{ this.props.state.sync.isOpeningLogin ? browser.i18n.getMessage('statusLabelOpeningLoginDrawer') : this.props.state.sync.error }</Text>
              <MaterialIcons
                name='warning'
                style={{ color: COLOR_DARK_WARNING }}
                size={20}
              />
            </View>
          </TouchableRipple>
          :
          <TouchableRipple style={styles.footer} onPress={ () => this._requestSync() }>
            <View style={styles.footerWrapper}>
              <Text style={{ color: COLOR_DARK_SYNC, fontSize: 13 }}>{ statusLabel }</Text>
              <Animated.View
                style={{
                  ...this.props.style,
                  transform: [{
                    rotate: this.state.rotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg']
                    })
                  }]
                }} >
                <MaterialIcons
                  name='sync'
                  style={{ color: COLOR_DARK_SYNC }}
                  size={20}
                />
              </Animated.View>
            </View>
          </TouchableRipple>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: COLOR_DARK_BACKGROUND,
    paddingTop: StatusBar.currentHeight
  },
  drawerSection: {
    flexGrow: 1,
    paddingTop: 15
  },
  footer: {
    flexGrow: 0
  },
  footerWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexGrow: 0,
    paddingTop: 15,
    paddingBottom: 14,
    paddingLeft: 28,
    paddingRight: 20
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 48,
  }
});

function mapStateToProps(state) {
  return {
    state
  };
}

DrawerItems.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(DrawerItems)
