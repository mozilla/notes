import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native'

import {
  Title,
  Subheading } from 'react-native-paper';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE, COLOR_NOTES_BLUE_LIGHT, COLOR_DARK_EMPTY_TEXT } from '../utils/constants';
import moment from 'moment';
import browser from '../browser';
import { toggleSelect } from '../actions';

function formatLastModified(date = new Date()) {

  var m = moment(date);

  if (m.isSame(new Date(), 'day')) {
    return m.format('LT');
  } else {
    return m.format('ll');
  }
}

class ListItem extends React.Component {

  constructor (props) {
    super(props);
    this.state = {
      isSelected: false
    };

    this._navigateToNote = () => {
      if (this.props.state.sync.selected) {
        this._toggleSelect();
      } else {
        props.navigate('EditorPanel', { id: props.note.id });
      }
    }

    this._toggleSelect = () => {
      props.dispatch(toggleSelect(props.note));
    }
  }

  componentWillReceiveProps(newProps) {
    const selected = newProps.state.sync.selected;
    if (selected && selected.includes(newProps.note.id)) {
      this.setState({ isSelected: true });
    } else {
      this.setState({ isSelected: false });
    }
  }

  render() {
    const {
      note, state
    } = this.props;

    let itemStyle = [styles.wrapper];
    if (this.state.isSelected) itemStyle.push(styles.selected);

    return (
      <TouchableOpacity onLongPress={this._toggleSelect} onPress={this._navigateToNote} >
        <View style={ itemStyle } >
          <Text style={ styles.selector } onPress={this._toggleSelect}  onLongPress={this._toggleSelect}>
            <MaterialIcons
              name={ this.state.isSelected ? "done" : "remove" }
              style={{ color: COLOR_NOTES_BLUE }}
              size={22}
            />
          </Text>
          <View style={ styles.content }>
            { note.firstLine ?
              <Text numberOfLines={1} style={styles.title}>{note.firstLine}</Text>
              :
              <Text numberOfLines={1} style={styles.emptyTitle}>{ browser.i18n.getMessage('emptyPlaceHolder') }</Text>
            }
            { note.secondLine ?
              <Text numberOfLines={1} style={styles.subtitle}>{note.secondLine}</Text>
              : null }
          </View>
          <Text style={styles.time}>{ formatLastModified(note.lastModified) }</Text>
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 10,
    backgroundColor: COLOR_APP_BAR,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selected: {
    backgroundColor: COLOR_NOTES_BLUE_LIGHT
  },
  selector: {
    flexShrink: 0,
    paddingTop: 8,
    paddingBottom: 8,
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
  emptyTitle: {
    color: COLOR_DARK_EMPTY_TEXT
  },
  time: {
    flexShrink: 0,
    color: undefined,
    fontSize: 11,
    paddingLeft: 10,
    paddingRight: 5
  }
});

function mapStateToProps(state) {
  return {
    state
  };
}

ListItem.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListItem);
