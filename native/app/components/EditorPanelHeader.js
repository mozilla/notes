import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions, StatusBar } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE } from '../utils/constants';
import MoreMenu from './MoreMenu';

class EditorPanelHeader extends Component {

  constructor(props) {
    super(props);

    this.state = {
      content: this._setNoteStatus(props)
    };
  }

  _setNoteStatus = (props) => {
    if (props.state.sync.isConnected === false) {
      return 'Offline';
    } else if (props.state.sync.isSyncing) {
      return 'Syncing...';
    } else {
      return 'Synced'
    }
  };

  componentWillReceiveProps(newProps) {
    this.setState({
      content: this._setNoteStatus(newProps)
    });
  }

  render() {
    const { navigation } = this.props;
    return (
      <Toolbar style={ styles.toolbar }>
        <MaterialIcons name="chevron-left"
           style={ styles.backButton }
           size={30}
           color={ COLOR_NOTES_BLUE }
           onPress={() => { navigation.goBack() }} />
        <ToolbarContent
          title={ this.state.content }
          titleStyle={{ fontSize: 14, textAlign: 'center', color: COLOR_NOTES_BLUE }}
          />
        <MoreMenu navigation={ navigation } />
      </Toolbar>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: 'white',
    padding: 0,
    opacity: 0.9,
    shadowOpacity: 0,
    elevation: 0,
    paddingTop: StatusBar.currentHeight,
  },
  backButton: {
    padding: 10
  }
});

EditorPanelHeader.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(EditorPanelHeader)
