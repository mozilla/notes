import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native'

import {
  Title,
  Subheading,
  TouchableRipple } from 'react-native-paper';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLOR_NOTES_BLUE } from '../utils/constants';


const striptags = require('striptags');

function formatLastModified(date) {

  if (new Date().getDate() === date.getDate()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (new Date().getYear() === date.getYear()) {

    return date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric'
    });
  } else {

    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

}

export default class ListItem extends React.Component {

  constructor (props) {
    super(props);

    this._navigateToNote = () => {
      props.navigate('EditorPanel', { rowId: props.rowId, note: props.note });
    }
  }


  render() {
    const {
      content,
      lastModified
    } = this.props;

    // FIXME: not perfect, need to be properly done but is good for testing.
    const firstLine = striptags(content.replace('&nbsp;', ' ').split('</')[0]).substr(0, 150);
    const secondLine = striptags(content.replace('&nbsp;', ' ').replace(firstLine, '')).substr(0, 150);

    return (
      <TouchableRipple onPress={this._navigateToNote} >
        <View style={styles.wrapper} >
          <Text style={ styles.selector } >
            <MaterialIcons
              name="remove"
              style={{ color: COLOR_NOTES_BLUE }}
              size={22}

            />
          </Text>
          <View style={ styles.content }>
            <Text numberOfLines={1} style={styles.title}>{firstLine}</Text>
            { styles.subtitle ?
              <Text numberOfLines={1} style={styles.subtitle}>{secondLine}</Text>
              : '' }
          </View>
          <Text style={styles.time}>{formatLastModified(lastModified)}</Text>
        </View>
      </TouchableRipple>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 10,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selector: {
    flexShrink: 0,
    paddingLeft: 18,
    paddingRight: 18
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 4,
    paddingRight: 10
  },
  title: {
    color: 'black',
    fontWeight: '400'
  },
  subtitle: {
    color: undefined
  },
  time: {
    flexShrink: 0,
    color: undefined,
    fontSize: 11,
    paddingLeft: 10,
    paddingRight: 5
  }
});
