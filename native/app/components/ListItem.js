import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native'

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
              {content.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
}
