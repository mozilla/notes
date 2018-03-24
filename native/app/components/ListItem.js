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
    } = this.props;

    return (
      <TouchableOpacity>
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
