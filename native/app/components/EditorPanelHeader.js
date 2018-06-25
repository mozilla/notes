import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions, StatusBar, Animated } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE, COLOR_DARK_WARNING } from '../utils/constants';
import MoreMenu from './MoreMenu';
import browser from '../browser';

class EditorPanelHeader extends Component {

  constructor(props) {
    super(props);
    this.timer = null;

    let content = '';
    let color = COLOR_NOTES_BLUE;

    if (props.state.sync.isConnected === false) {
      content = browser.i18n.getMessage('editorLabelOffline');
    } else if (props.state.sync.error) {
      content = props.state.sync.error;
      color = COLOR_DARK_WARNING;
    } else {
      const note = props.state.notes.find((note) => props.state.sync.focusedNoteId === note.id);
      content = note ? note.firstLine : '';
    }

    this.state = {
      transition: new Animated.Value(0),
      toolbarContentIndex: 0,
      content1: content,
      color1: color,
      content2: '',
      color2: COLOR_NOTES_BLUE
    };
  }

  _setToolbarContent = (content, color = COLOR_NOTES_BLUE) => {

    if (this.state.toolbarContentIndex === 0 && content !== this.state.content2) {
      this.setState({
        content2: content,
        color2: color,
        toolbarContentIndex: 1
      });

      Animated.timing(this.state.transition, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    } else if (this.state.toolbarContentIndex === 1 && content !== this.state.content1) {

      this.setState({
        content1: content,
        color1: color,
        toolbarContentIndex: 0
      });

      Animated.timing(this.state.transition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  componentWillReceiveProps(newProps) {

    clearTimeout(this.timer);

    if (newProps.state.sync.isConnected === false) {
      this._setToolbarContent(browser.i18n.getMessage('editorLabelOffline'));
    } else if (newProps.state.sync.error) {
      this._setToolbarContent(newProps.state.sync.error, COLOR_DARK_WARNING);
    } else if (newProps.state.sync.isSyncing) {
      this._setToolbarContent(browser.i18n.getMessage('editorLabelSyncing'));
    } else if (this.props.state.sync.isSyncing && !newProps.state.sync.isSyncing) {
      this._setToolbarContent(browser.i18n.getMessage('editorLabelSynced'));
      this.timer = setTimeout(() => {
        const note = newProps.state.notes.find((note) => newProps.state.sync.focusedNoteId === note.id);
        this.timer = this._setToolbarContent(note ? note.firstLine : '');
      }, 3000);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
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
        <View style={{ flex: 1, position: 'relative' }}>
          <Animated.View style={[ styles.toolbarContent, {
            opacity: this.state.transition.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0]
            })
          }]}>
            <ToolbarContent
              title={ this.state.content1 }
              style={{ justifyContent: 'center' }}
              titleStyle={{ fontSize: 14, textAlign: 'center', color: this.state.color1 }}
              />
          </Animated.View>
          <Animated.View style={[ styles.toolbarContent, {
            opacity: this.state.transition.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1]
            })
          }]}>
            <ToolbarContent
              title={ this.state.content2 }
              style={{ justifyContent: 'center' }}
              titleStyle={{ fontSize: 14, textAlign: 'center', color: this.state.color2 }}
              />
          </Animated.View>
        </View>
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
    paddingTop: StatusBar.currentHeight
  },
  toolbarContent: {
    flex: 1,
    position: 'absolute',
    top: -10,
    right: 0,
    left: 0
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
