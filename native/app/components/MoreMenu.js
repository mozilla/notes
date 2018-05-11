import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { deleteNotes } from '../actions';
import { View, StyleSheet, NativeModules, findNodeHandle } from 'react-native';
import { NavigationActions } from 'react-navigation';
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
            const deletedNote = this.props.state.notes.find((note) => {
              return note.id === this.props.state.sync.focusedNoteId
            });
            if (deletedNote) {
              this.props.dispatch(deleteNotes([ deletedNote.id ], 'in-note'));
            }
            navigation.navigate('ListPanel', { deletedNote: [ deletedNote ] });
            break;
        }
      },
    );
  };

  render() {
    const labels = ['Delete'];

    return (
      <View style={{ flexDirection: 'row' }}>
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
            style={[{ paddingRight: 10, paddingLeft: 10, color: COLOR_NOTES_BLUE }]}
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
