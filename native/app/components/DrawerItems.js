import * as Keychain from 'react-native-keychain';
import * as React from 'react';
import { connect } from 'react-redux';
import { NavigationActions } from 'react-navigation';
import { Title, Text } from 'react-native-paper';
import { View, StyleSheet, Image, Linking } from 'react-native';
import {
  DrawerItem,
  DrawerSection,
  Switch,
  TouchableRipple,
  Paragraph,
  Colors,
} from 'react-native-paper';
import {trackEvent} from "../utils/metrics";
import {COLOR_NOTES_BLUE} from "../utils/constants";

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

  render() {
    return (
      <View style={[styles.drawerContent]}>
        <View style={{ paddingTop: 55, backgroundColor: COLOR_NOTES_BLUE }}>
        <Image
          style={{width: 75, height: 75 }}
          borderRadius={100}
          resizeMode='cover'
          source={require('../assets/notes-1024.png')}
        />
        <Title>Display Name</Title>
        <Text>vlad2@restmail.net</Text>
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
