import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE } from '../utils/constants';
import MoreMenu from './MoreMenu';

class EditorPanelHeader extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { navigation } = this.props;
    return (
      <Toolbar style={ styles.toolbar }>
        <MaterialIcons name="chevron-left"
           size={30}
           color={ COLOR_NOTES_BLUE }
           onPress={() => { navigation.goBack() }} />
        <ToolbarContent
          title='Saved'
          titleStyle={{ fontSize: 14, textAlign: 'center', color: COLOR_NOTES_BLUE }}
          />
        <MoreMenu navigation={ navigation } />
      </Toolbar>
    );
  }

  componentDidMount() {
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: COLOR_APP_BAR,
  }
});

EditorPanelHeader.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(EditorPanelHeader)
