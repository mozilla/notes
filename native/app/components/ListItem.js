import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native'

const striptags = require('striptags');

export default class ListItem extends React.Component {
  render() {
    const {
      content,
      navigate,
      rowId
    } = this.props;


    return (
      <TouchableOpacity onPress={() =>
        // TODO: Fix navigation here to go the the selected note using note uuid?
        navigate('EditorPanel', {rowId: rowId})
      }>
        <View>
          <View style={{ padding: 10 }} >
            <Text>
              {striptags(content).substr(0, 50)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
}
