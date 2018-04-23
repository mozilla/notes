import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import ListItem from './ListItem';
import PropTypes from 'prop-types';
import React from 'react';
import store from "../store";
import sync from "../utils/sync";
import { connect } from 'react-redux';
import { FAB, Snackbar } from 'react-native-paper';
import { View, FlatList, Text, StyleSheet, RefreshControl, ProgressBarAndroid } from 'react-native';
import { COLOR_DARK_SYNC, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE } from '../utils/constants';
import { kintoLoad } from "../actions";

class ListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      refreshing: false,
      snackbarSyncedvisible: false
    }

    this._onRefresh = () => {
      this.setState({ refreshing: true });

      return sync.loadFromKinto(kintoClient, props.state.sync.loginDetails).then(() => {
        this.setState({ refreshing: false });
        this.setState({ snackbarSyncedvisible: true })
      });
    }
  }

  _keyExtractor = (item, index) => item.id;

  render() {

    return (
      <View style={{ flex: 1 }}>
        { this.renderList() }

        <Snackbar
          style={{
            backgroundColor: COLOR_DARK_SYNC
          }}
          visible={this.state.snackbarSyncedvisible}
          onDismiss={() => this.setState({ snackbarSyncedvisible: false })}
          duration={3000}
        >
          Notes synced!
        </Snackbar>

        { this.props.state.kinto.isLoaded ?
        <FAB
          small
          color={COLOR_NOTES_WHITE}
          style={styles.fab}
          icon="add"
          onPress={() => this.newNote()}
        /> : null }
      </View>
    );
  }

  newNote() {
    return this.props.navigation.navigate('EditorPanel', { note: null });
  }

  renderList() {
    const { navigate } = this.props.navigation;
    if (!this.props.state.kinto.isLoaded) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ProgressBarAndroid color={COLOR_NOTES_BLUE} styleAttr="Inverse" />
        </View>
      )
    } else if (! this.props.state.notes || this.props.state.notes.length <= 0) {
      return (
        <View>
          <Text>No Notes</Text>
        </View>
      )
    } else {
      return (
        <FlatList
          contentContainerStyle={{marginBottom:90}}
          data={this.props.state.notes.sort((a, b) => { return a.lastModified <= b.lastModified ? 1 : -1 })}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              colors={[ COLOR_NOTES_BLUE ]}
              onRefresh={this._onRefresh.bind(this)}
            />
          }
          ListHeaderComponent={() => {
            return (
              <View style={{ backgroundColor: 'white', height: 10}}></View>
            )
          }}
          keyExtractor={this._keyExtractor}
          renderItem={({item}) => {
            return (
              <ListItem
                note={item}
                navigate={navigate}
              />
            )
          }}
          ListFooterComponent={() => {
            return (
              <View style={{
                height: 1,
                backgroundColor: '#F9F9FA',
                overflow: 'visible',
                marginBottom: 90,
                elevation: 1,
                shadowColor: '#000',
                shadowOpacity: 0.24,
                shadowOffset: { width: 0, height: 0.75},
                shadowRadius: 1.5}}>
              </View>
            )
          }}
        />
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
