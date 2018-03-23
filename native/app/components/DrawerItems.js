import * as React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { Title, Text } from 'react-native-paper';
import * as Keychain from 'react-native-keychain';
import { connect } from 'react-redux';

import {
  DrawerItem,
  DrawerSection,
  Switch,
  TouchableRipple,
  Paragraph,
  Colors,
} from 'react-native-paper';

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
    this.setState({ drawerItemIndex: index });
    // TODO: Refactor this to use something else other than keys?
    if (key === 2) {
      // TODO: Can this fail? if it fails can we go to LoginPanel and assume creds are empty?
      Keychain.resetGenericPassword().then(() => {
        this.props.navigation.navigate('LoginPanel');
      });
    }
  };

  render() {
    return (
      <View style={[styles.drawerContent]}>
        <View style={{ paddingTop: 55, backgroundColor: '#008AF8'}}>
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
              active={this.state.drawerItemIndex === index}
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
