import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native'

const striptags = require('striptags');

function formatLastModified(date) {

  if (new Date().getDate() === date.getDate()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default class ListItem extends React.Component {
  render() {
    const {
      content,
      navigate,
      rowId,
      lastModified
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
            <Text>
              {formatLastModified(lastModified)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
}
