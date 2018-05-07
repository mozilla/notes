import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { deleteNote } from '../actions';
import { View, StyleSheet, NativeModules, findNodeHandle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  COLOR_NOTES_BLUE
} from '../utils/constants';

const UIManager = NativeModules.UIManager;

/**
 * Details: https://github.com/react-navigation/react-navigation/issues/1212
 */
class MoreMenu extends Component {
  onMenuPressed = (labels) => {
    const { navigation } = this.props;
    UIManager.showPopupMenu(
      findNodeHandle(this.menu),
      labels, // actions
      () => {}, // onError
      (result, index) => { //onSuccess
        switch (index) {
          case 0:
            if (this.props.state.sync.focusedNoteId) {
              this.props.dispatch(deleteNote(this.props.state.sync.focusedNoteId, 'in-note'));
            }
            navigation.navigate('ListPanel');
            break;
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

function mapStateToProps(state) {
  return {
    state
  };
}

MoreMenu.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(MoreMenu)
