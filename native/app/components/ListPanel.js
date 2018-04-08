import React from 'react';
import { View, ListView, Text, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { connect } from 'react-redux';

import ListItem from './ListItem';
import PropTypes from 'prop-types';
import {
  COLOR_NOTES_BLUE,
  COLOR_NOTES_WHITE
} from '../utils/constants';

class ListPanel extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
  }

  render() {
    return (
      <View style={{ flex: 1}}>
        { this.renderList() }

        <FAB
          small
          color={COLOR_NOTES_WHITE}
          style={styles.fab}
          icon="add"
          onPress={() => this.newNote()}
        />
      </View>
    );
  }

  newNote() {
    return this.props.navigation.navigate('EditorPanel', {rowId: null});
  }

  renderList() {
    const { navigate } = this.props.navigation;

    if (! this.props.state.notes || this.props.state.notes.length <= 0) {
      return (
        <View>
          <Text>No Notes</Text>

        </View>
      )
    } else {
      const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
      const dataSource = ds.cloneWithRows(this.props.state.notes) || [];
      return (
        <View>
          <ListView
            dataSource={dataSource}
            renderRow={(note, sectionId, rowId) => {
              return (
                <ListItem
                  content={note.content}
                  id={note.id}
                  rowId={rowId}
                  navigate={navigate}
                />
              )
            }}
          />
        </View>
      )
    }
  }
}

const styles = StyleSheet.create({
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLOR_NOTES_BLUE,
    position: 'absolute',
    bottom: 20,
    right: 10,
  },
});

function mapStateToProps(state) {
  return {
    state
  };
}

ListPanel.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(ListPanel)
