import React, { Component } from 'react';
import { View, StyleSheet, NativeModules, findNodeHandle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  COLOR_NOTES_BLUE
} from '../utils/constants';

const UIManager = NativeModules.UIManager;

/**
 * Details: https://github.com/react-navigation/react-navigation/issues/1212
 */
export default class ToolbarDropdown extends Component {
  onMenuPressed = (labels) => {
    const { onPress } = this.props;

    UIManager.showPopupMenu(
      findNodeHandle(this.menu),
      labels,
      () => {},
      (result, index) => {
        if (onPress) {
          onPress({action: 'menu', result, index});
        }
      },
    );
  };

  render() {
    const labels = ['Delete'];

    return (
      <View style={{flexDirection: 'row'}}>
        <View>
          <View
            ref={c => this.menu = c}
            style={{
              backgroundColor: 'transparent',
              width: 1,
            }}
          />
          <MaterialIcons
            name="more-vert"
            onPress={() => this.onMenuPressed(labels)}
            style={{ marginRight: 10, color: COLOR_NOTES_BLUE }}
            size={30}
          />
        </View>
      </View>
    )
  }
}
