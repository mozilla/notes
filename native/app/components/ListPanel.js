import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import ListItem from './ListItem';
import PropTypes from 'prop-types';
import React from 'react';
import { store } from "../store";
import sync from "../utils/sync";
import { connect } from 'react-redux';
import { FAB, Snackbar } from 'react-native-paper';
import { View, FlatList, StyleSheet, RefreshControl, AppState } from 'react-native';
import { COLOR_DARK_SYNC, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE, KINTO_LOADED } from '../utils/constants';
import { kintoLoad, createNote } from "../actions";
import browser from '../browser';

import ListPanelEmpty from './ListPanelEmpty';
import ListPanelLoading from './ListPanelLoading';

class ListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      refreshing: false,
      snackbarSyncedvisible: false,
      appState: AppState.currentState,
      deletedNote: null
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
        deletedNote: null,
        snackbarSyncedvisible: props.navigation.isFocused()
      });
    };

    this._undoDelete = () => {
      props.dispatch(createNote(this.state.deletedNote)).then(() => {
        this.setState({
          deletedNote: null,
          snackbarSyncedvisible: false
        });
      }).catch(e => console.error(e));
    };
  }

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.navigation.isFocused()) {
      // Display sycned note snackbar
      if (this.props.state.sync.isSyncing && !newProps.state.sync.isSyncing) {
        if (this.props.state.sync.isSyncingFrom === 'drawer') {
          setTimeout(this._triggerSnackbar, 400);
        } else {
          this._triggerSnackbar();
        }
      }
      // Display deleted note snackbar
      if (newProps.navigation.getParam('deletedNote')) {
          const deletedNote = newProps.navigation.getParam('deletedNote');
          newProps.navigation.setParams({ deletedNote: null });
          this.setState({ deletedNote, snackbarSyncedvisible: false });
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
          visible={ this.state.snackbarSyncedvisible && !this.state.deletedNote }
          onDismiss={() => {
            this.setState({
              deletedNote: null,
              snackbarSyncedvisible: false
            });
          }}
          duration={3000}
        >
          Notes synced!
        </Snackbar>

        <Snackbar
          style={{
            backgroundColor: COLOR_NOTES_BLUE
          }}
          visible={ !this.state.snackbarSyncedvisible && this.state.deletedNote }
          onDismiss={() => {
            this.setState({
              deletedNote: null,
              snackbarSyncedvisible: false
            });
          }}
          duration={3000}
          theme={{ colors: { accent: 'white' }}}
          action={{
            text: 'undo',
            onPress: () => {
              this._undoDelete();
            }
          }}
        >
          Deleted Note !
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
        <ListPanelLoading></ListPanelLoading>
      )
    } else {
      let styleList = {};
      if (this.props.state.notes.length === 0) {
        styleList = {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 40,
          paddingLeft: 40
        };
      } else {
        styleList = { marginBottom:90 };
      }


      return (
        <FlatList
          contentContainerStyle={styleList}
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
              <ListPanelEmpty></ListPanelEmpty>
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
  }
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
