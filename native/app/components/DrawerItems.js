import * as Keychain from 'react-native-keychain';
import * as React from 'react';
import fxaUtils from "../vendor/fxa-utils";
import PropTypes from 'prop-types';
import store from "../store";
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';
import { Title, Text, TouchableRipple } from 'react-native-paper';

import { View, ScrollView, StyleSheet, Image, Linking, Modal } from 'react-native';

import {COLOR_NOTES_BLUE} from "../utils/constants";
import {DrawerItem, DrawerSection, Colors } from 'react-native-paper';
import {trackEvent} from "../utils/metrics";


import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Url to open to give feedback
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=android';
const DrawerItemsData = [
  { label: 'Give Feedback', key: 0 },
  { label: 'Log out', key: 1 },
];

class DrawerItems extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
  }

  state = {
    open: false,
    drawerItemIndex: 0
  };

  _setDrawerItem = (index, key) => {
    const routeName = this.props.navigation.state.routeName;

    this.setState({ drawerItemIndex: index });
    // TODO: Refactor this to use something else other than keys?
    // if (key === 0) {
    //   return this.props.navigation.navigate('DrawerClose');
    // }

    if (key === 0) {
      return Linking.openURL(SURVEY_PATH);
    }

    if (key === 1) {
      function navigateToLogin () {
        // Reset back button nav. See https://reactnavigation.org/docs/navigation-actions.html#reset
        const resetAction = NavigationActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'LoginPanel' })],
        });
        this.props.navigation.dispatch(resetAction);
        trackEvent('webext-button-disconnect');
      }

      return Keychain.resetGenericPassword().then(navigateToLogin.bind(this), navigateToLogin.bind(this));
    }
  };

  componentWillMount() {
  }

  render() {
    return (
      <View style={styles.drawerContent}>
        <View style={{ paddingTop: 55, paddingLeft: 30, paddingBottom: 20, backgroundColor: COLOR_NOTES_BLUE }}>
          <Image
            style={{width: 75, height: 75 }}
            borderRadius={100}
            borderColor='#FFFFFF'
            borderWidth={2}
            resizeMode='cover'
            source={{uri: this.props.state.sync.avatar}}
          />
          <Title style={{ color: '#FFFFFF' }}>{this.props.state.sync.displayName}</Title>
          <Text style={{ color: '#FFFFFF' }}>{this.props.state.sync.email}</Text>
        </View>
        <ScrollView style={styles.drawerSection}>
          <DrawerSection>
            {DrawerItemsData.map((props, index) => (
              <DrawerItem
                {...props}
                style={{ paddingLeft: 14 }}
                key={props.key}
                color={props.key === 3 ? Colors.tealA200 : undefined}
                //active={this.state.drawerItemIndex === index}
                onPress={() => this._setDrawerItem(index, props.key)}
              />
            ))}
          </DrawerSection>

        </ScrollView>
        <TouchableRipple style={styles.footer} onPress={() => console.log('was pressed')}>
          <View style={styles.footerWrapper}>
              <Text style={{ color: undefined, fontSize: 13 }}>Last synced 9:31 AM</Text>
              <MaterialIcons
                name="sync"
                style={{ marginRight: 10, color: undefined }}
                size={20}
              />
          </View>
        </TouchableRipple>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerSection: {
    flexGrow: 1,
    paddingTop: 10
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
    paddingRight: 10
  }
});

// export default withTheme(DrawerItems);


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
