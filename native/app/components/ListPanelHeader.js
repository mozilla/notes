import color from 'color';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions, StatusBar } from 'react-native';
import { resetSelect } from "../actions";

import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE } from '../utils/constants';

class ListPanelHeader extends Component {

  constructor(props) {
    super(props);

    this._resetSelection =  () => {
      props.dispatch(resetSelect());
    };

    this._deleteSelection = () => {

    }
  }

  render() {
    const { navigation } = this.props;
    if (this.props.state.sync.selected) {
      return (
        <Toolbar style={styles.toolbarSelected}>
          <ToolbarAction
            size={20}
            style={{ paddingTop: 4 }}
            color='white'
            icon='clear'
            onPress={() => this._resetSelection()} />
          <ToolbarContent
            style={{ paddingLeft: 0,  }}
            titleStyle={{ fontSize: 18, color: 'white' }}
            title={ `${this.props.state.sync.selected.length} selected`} />
          <ToolbarAction
            size={20}
            style={{ paddingTop: 4 }}
            color='white'
            icon='delete'
            onPress={() => this._deleteSelection()} />
        </Toolbar>
      );
    }

    return (
      <Toolbar style={styles.toolbar}>
        <ToolbarAction
          size={20}
          style={{ paddingTop: 4 }}
          color='#4173CE'
          icon='menu'
          onPress={() => navigation.openDrawer()} />
        <ToolbarContent
          style={{ paddingLeft: 0,  }}
          titleStyle={{ fontSize: 18, color: COLOR_NOTES_BLUE }}
          title='Notes' />
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
    backgroundColor: COLOR_APP_BAR,
    paddingTop: StatusBar.currentHeight
  },
  toolbarSelected: {
    backgroundColor: COLOR_NOTES_BLUE,
    paddingTop: StatusBar.currentHeight
  }
});

ListPanelHeader.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanelHeader)
