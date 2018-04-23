import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import ListItem from './ListItem';
import PropTypes from 'prop-types';
import React from 'react';
import store from "../store";
import sync from "../utils/sync";
import { connect } from 'react-redux';
import { FAB, Snackbar } from 'react-native-paper';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import { COLOR_DARK_SYNC, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE, KINTO_LOADED } from '../utils/constants';
import { kintoLoad } from "../actions";
import browser from "../browser";

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

      browser.runtime.sendMessage({
        action: KINTO_LOADED
      });
    }
  }

  componentWillReceiveProps(newProps) {
    if (!newProps.state.sync.isSyncing) {
      // We do not display snackbar on sync if triggered from other than pullRefresh
      if (this.state.refreshing && this.props.state.sync.isSyncing) {
        this.setState({
          snackbarSyncedvisible: true,
          refreshing: false
        });
      } else {
        this.setState({
          refreshing: false
        });
      }
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
    return this.props.navigation.navigate('EditorPanel', { note: null });
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
