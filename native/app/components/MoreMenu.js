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
import browser from '../browser';
const UIManager = NativeModules.UIManager;

/**
 * Details: https://github.com/react-navigation/react-navigation/issues/1212
 */
class MoreMenu extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
  }

  onMenuPressed = (labels) => {
    if (!this.state.isOpen) {
      const { navigation } = this.props;
      this.setState({ isOpen: true });
      UIManager.showPopupMenu(
        findNodeHandle(this.menu),
        labels, // actions
        () => this.setState({ isOpen: false }), // onError
        (result, index) => { //onSuccess
          this.setState({ isOpen: false });
          switch (index) {
            case 0:
            if (this.props.state.sync.focusedNoteId) {
              const deletedNote = this.props.state.notes.find((note) => {
                return note.id === this.props.state.sync.focusedNoteId
              });
              if (deletedNote) {
                this.props.dispatch(deleteNotes([ deletedNote.id ], 'in-note'));
              }
              navigation.navigate('ListPanel', { deletedNote: [ deletedNote ] });
            } else {
              navigation.navigate('ListPanel');
            }
            break;
          }
        },
      );

    }
  };

  render() {
    const labels = [browser.i18n.getMessage('editorMenuDelete')];

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
            style={[{ paddingRight: 10, paddingLeft: 10, color: '#737373' }]}
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
