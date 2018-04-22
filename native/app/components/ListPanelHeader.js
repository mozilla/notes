import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, View, Dimensions, StatusBar } from 'react-native';

import { Toolbar, ToolbarContent, ToolbarAction } from 'react-native-paper';
import { COLOR_APP_BAR, COLOR_NOTES_BLUE } from '../utils/constants';

class ListPanelHeader extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { navigation } = this.props;
    return (
      <Toolbar style={styles.toolbar}>
        <ToolbarAction
          size={20}
          style={{ paddingTop: 4 }}
          icon='menu'
          onPress={() => navigation.navigate('DrawerOpen')} />
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
  }
});

ListPanelHeader.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanelHeader)
