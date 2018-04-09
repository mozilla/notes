import * as Keychain from 'react-native-keychain';
import * as React from 'react';
import fxaUtils from "../vendor/fxa-utils";
import store from "../store";
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';
import { Title, Text } from 'react-native-paper';
import { View, StyleSheet, Image, Linking } from 'react-native';
import {COLOR_NOTES_BLUE} from "../utils/constants";
import {DrawerItem, DrawerSection, Colors } from 'react-native-paper';
import {trackEvent} from "../utils/metrics";

// Url to open to give feedback
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=android';
const DrawerItemsData = [
  { label: 'Notes', icon: 'folder', key: 0 },
  { label: 'Give Feedback', icon: 'message', key: 1 },
  { label: 'Log out', icon: 'exit-to-app', key: 2 },
];

class DrawerItems extends React.Component {
  state = {
    open: false,
    drawerItemIndex: 0,
    profileAvatar: null,
    profileEmail: null,
    profileDisplayName: null,
  };

  _setDrawerItem = (index, key) => {
    const routeName = this.props.navigation.state.routeName;

    this.setState({ drawerItemIndex: index });
    // TODO: Refactor this to use something else other than keys?
    if (key === 0) {
      return this.props.navigation.navigate('DrawerClose');
    }

    if (key === 1) {
      return Linking.openURL(SURVEY_PATH);
    }

    if (key === 2) {
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
    return fxaUtils.fxaGetCredential().then((loginDetails) => {
      const profile = loginDetails.profile;
      if (profile && profile.avatar) {
        this.setState({
          profileAvatar: profile.avatar,
          profileEmail: profile.email,
          profileDisplayName: profile.displayName,
        });
      }
    });
  }

  render() {
    return (
      <View style={[styles.drawerContent]}>
        <View style={{ paddingTop: 55, paddingLeft: 10, paddingBottom: 10, backgroundColor: COLOR_NOTES_BLUE }}>
        <Image
          style={{width: 75, height: 75 }}
          borderRadius={100}
          borderColor='#FFFFFF'
          borderWidth={2}
          resizeMode='cover'
          source={{uri: this.state.profileAvatar}}
        />
        <Title style={{ color: '#FFFFFF' }}>{this.state.profileDisplayName}</Title>
        <Text style={{ color: '#FFFFFF' }}>{this.state.profileEmail}</Text>
        </View>
        <DrawerSection>
          {DrawerItemsData.map((props, index) => (
            <DrawerItem
              {...props}
              key={props.key}
              color={props.key === 3 ? Colors.tealA200 : undefined}
              //active={this.state.drawerItemIndex === index}
              onPress={() => this._setDrawerItem(index, props.key)}
            />
          ))}
        </DrawerSection>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
});

// export default withTheme(DrawerItems);


function mapStateToProps(state) {
  return {
    state
  };
}

// DrawerItems.propTypes = {
//   state: PropTypes.object.isRequired,
//   dispatch: PropTypes.func.isRequired
// };

export default connect(mapStateToProps)(DrawerItems)
