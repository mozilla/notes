import * as Keychain from 'react-native-keychain';
import * as React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';
import { Title, Text, TouchableRipple } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { View, ScrollView, StyleSheet, Image, Linking, Modal, Animated, Easing } from 'react-native';
import moment from 'moment';

import { COLOR_DARK_BACKGROUND,
         COLOR_DARK_TEXT,
         COLOR_DARK_SUBTEXT,
         COLOR_DARK_WARNING,
         COLOR_DARK_SYNC,
         COLOR_NOTES_BLUE,
         KINTO_LOADED } from '../utils/constants';

import { DrawerItem, DrawerSection, Colors } from 'react-native-paper';
import { trackEvent } from '../utils/metrics';
import fxaUtils from '../vendor/fxa-utils';
import store from '../store';
import browser from '../browser';

// Url to open to give feedback
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=android';


class DrawerItems extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      rotation: new Animated.Value(1)
    };
    // DrawerItemsData store our drawer button list
    this.drawerItemsData = [
      {
        label  : 'Give Feedback',
        action : () => {
          return Linking.openURL(SURVEY_PATH);
        }
      },
      {
        label : 'Log out',
        action: () => {
          function navigateToLogin () {
            // Reset back button nav. See https://reactnavigation.org/docs/navigation-actions.html#reset
            const resetAction = NavigationActions.reset({
              index: 0,
              actions: [ NavigationActions.navigate({ routeName: 'LoginPanel' }) ],
            });
            this.props.navigation.dispatch(resetAction);
            trackEvent('webext-button-disconnect');
          }
          return Keychain.resetGenericPassword().then(navigateToLogin.bind(this), navigateToLogin.bind(this));
        }
      }
    ];

    this._startAnimation = () => {
      this.state.rotation.setValue(1);
      Animated.timing(this.state.rotation, {
        toValue: 0,
        duration: 2000,
        easing: Easing.linear
      }).start(() => {
        if (this.props.state.sync.isSyncing) {
          this._startAnimation()
        }
      });
    };

    this._stopAnimation = () => {
      Animated.timing(
        this.state.rotation
      ).stop();
    };

    this._requestSync = () => {
      browser.runtime.sendMessage({
        type: KINTO_LOADED
      });
    }

  }

  componentDidMount() {
  }

  componentWillReceiveProps(newProps) {
    if (newProps.state.sync.isSyncing && !this.props.state.sync.isSyncing) {
      this._startAnimation();
    } else if (!newProps.state.sync.isSyncing) {
      this._stopAnimation();
    }
  }

  componentWillUnmount() {
    this._stopAnimation();
  }

  render() {
    return (
      <View style={styles.drawerContent}>
        <View style={{ paddingTop: 55, marginLeft: 30, paddingBottom: 30, borderBottomColor: '#4A4A4F', borderBottomWidth: 1 }}>
          <Image
            style={{width: 75, height: 75, marginBottom: 4 }}
            borderRadius={100}
            borderColor='#FFFFFF'
            borderWidth={2}
            resizeMode='cover'
            source={{uri: this.props.state.sync.avatar}}
          />
          <Title style={{ color: COLOR_DARK_TEXT }}>{this.props.state.sync.displayName}</Title>
          <Text style={{ color: COLOR_DARK_SUBTEXT }}>{this.props.state.sync.email}</Text>
        </View>
        <ScrollView style={styles.drawerSection}>

          {this.drawerItemsData.map((item, index) => (
            <TouchableRipple key={index} style={styles.wrapper} onPress={() => item.action()}>
              <Text style={{ color: COLOR_DARK_TEXT, paddingLeft: 14 }}>{ item.label }</Text>
            </TouchableRipple>
          ))}

        </ScrollView>
        <TouchableRipple style={styles.footer} onPress={ () => this._requestSync() }>
          <View style={styles.footerWrapper}>
              <Text style={{ color: COLOR_DARK_SYNC, fontSize: 13 }}>Last synced { moment(this.props.state.sync.lastSynced).format('LT') }</Text>
              <Animated.View                 // Special animatable View
                style={{
                  ...this.props.style,
                  transform: [{
                    rotate: this.state.rotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
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
      </View>
    );
  }
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: COLOR_DARK_BACKGROUND
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
