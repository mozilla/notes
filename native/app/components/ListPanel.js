import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import ListItem from './ListItem';
import PropTypes from 'prop-types';
import React from 'react';
import { store } from "../store";
import sync from "../utils/sync";
import { connect } from 'react-redux';
import { FAB, Snackbar } from 'react-native-paper';
import { View, FlatList, Text, StyleSheet, RefreshControl, ProgressBarAndroid, AppState } from 'react-native';
import { COLOR_DARK_SYNC, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE, KINTO_LOADED } from '../utils/constants';
import { kintoLoad } from "../actions";
import browser from '../browser';

class ListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      refreshing: false,
      snackbarSyncedvisible: false,
      appState: AppState.currentState
    }

    this._onRefresh = () => {
      this.setState({ refreshing: true });
      props.dispatch(kintoLoad());
    }

    this._handleAppStateChange = (nextAppState) => {
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        props.dispatch(kintoLoad());
      }
      this.setState({ appState: nextAppState });
    }

    this._keyExtractor = (item, index) => item.id;

    this._triggerSnackbar = () => {
      this.setState({
        refreshing: false,
        snackbarSyncedvisible: props.navigation.isFocused()
      });
    };
  }

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  componentWillReceiveProps(newProps) {
    if (this.props.state.sync.isSyncing && !newProps.state.sync.isSyncing) {
      if (this.props.state.sync.isSyncingFrom === 'drawer') {
        setTimeout(this._triggerSnackbar, 400);
      } else {
        this._triggerSnackbar();
      }
    }
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        { this.renderList() }

        <Snackbar
          style={{
            backgroundColor: COLOR_DARK_SYNC
          }}
          visible={this.state.snackbarSyncedvisible}
          onDismiss={() => {
            this.setState({
              snackbarSyncedvisible: false
            });
          }}
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
          ListEmptyComponent={() => {
            return (
              <View>
                <Text>No Notes</Text>
              </View>
            )
          }}
          ListHeaderComponent={() => {
            return this.props.state.notes && this.props.state.notes.length > 0 ?
              (
                <View style={{ backgroundColor: 'white', height: 10}}></View>
              )
              : null;
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
            return this.props.state.notes && this.props.state.notes.length > 0 ?
              (
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
              : null;
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
