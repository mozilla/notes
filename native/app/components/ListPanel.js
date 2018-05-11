import fxaUtils from '../vendor/fxa-utils';
import kintoClient from '../vendor/kinto-client';
import ListItem from './ListItem';
import PropTypes from 'prop-types';
import React from 'react';
import { store, persistor } from "../store";
import sync from "../utils/sync";
import { connect } from 'react-redux';
import { FAB } from 'react-native-paper';
import { View, FlatList, StyleSheet, RefreshControl, AppState, Animated, NetInfo, ToastAndroid } from 'react-native';
import { COLOR_DARK_SYNC, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE, KINTO_LOADED } from '../utils/constants';
import { kintoLoad, createNote, setNetInfo } from "../actions";
import browser from '../browser';
import { trackEvent } from '../utils/metrics';

import ListPanelEmpty from './ListPanelEmpty';
import ListPanelLoading from './ListPanelLoading';
import Snackbar from './Snackbar';

const SNACKBAR_ANIMATION_DURATION = 250;
const SNACKBAR_HEIGHT = 48;

const SYNCED_SNACKBAR = {
  text: 'Notes synced!',
  color: COLOR_DARK_SYNC,
  action: null,
  duration: 3000
};

class ListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      refreshing: false,
      appState: AppState.currentState,
      deletedNote: null,
      yPosition: new Animated.Value(SNACKBAR_HEIGHT),
      snackbarVisible: false,
      snackbar: null
    }

    this._onRefresh = () => {
      if (this.props.state.sync.isConnected === false) {
        ToastAndroid.show('You are offline.', ToastAndroid.LONG);
      } else {
        trackEvent('webext-button-authenticate');
        this.setState({ refreshing: true });
        props.dispatch(kintoLoad()).then(() => {
          this.setState({ refreshing: false });
        });
      }
    }

    this._handleAppStateChange = (nextAppState) => {
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        trackEvent('open');
        // On opening the app, we check network stratus
        NetInfo.isConnected.fetch().then(isConnected => {
          props.dispatch(setNetInfo(isConnected));
          if (props.state.profile.email) {
            props.dispatch(kintoLoad()).then(() => {
              this.setState({ refreshing: false });
            })
          }
        });
      } else {
        trackEvent('close', { state: nextAppState });
        persistor.flush();
      }
      this.setState({ appState: nextAppState });
    }

    this._handleNetworkStateChange = (connectionInfo) => {
      const wasConnected = this.props.state.sync.isConnected;
      props.dispatch(setNetInfo(connectionInfo.type !== 'none'));
      // if network is back, we trigger a sync
      if (wasConnected === false && this.props.state.sync.isConnected !== false) {
        props.dispatch(kintoLoad());
      }
    };

    this._showSnackbar = (snackbar) => {
      if (!this.state.snackbar) {
        this.setState({
          snackbar,
          snackbarVisible: true,
        });

        Animated.timing(this.state.yPosition, {
          toValue: 0, // this.state.height,
          duration: SNACKBAR_ANIMATION_DURATION,
          useNativeDriver: true,
        }).start();
      }
    };

    this._hideSnackbar = () => {

      this.setState({
        snackbarVisible: false,
        deletedNote: null
      });

      Animated.timing(this.state.yPosition, {
        toValue: SNACKBAR_HEIGHT,
        duration: SNACKBAR_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        this.setState({
          snackbar: null
        });
      });

    };

    this._undoDelete = () => {
      this._hideSnackbar();
      props.dispatch(createNote(this.state.deletedNote));
    };
  }

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
    NetInfo.addEventListener('connectionChange', this._handleNetworkStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    NetInfo.removeEventListener('connectionChange', this._handleNetworkStateChange);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.navigation.isFocused()) {

      // Display sycned note snackbar
      if (this.props.state.sync.isSyncing &&
          !newProps.state.sync.isSyncing &&
          !newProps.state.sync.error &&
          newProps.state.sync.isConnected &&
          this.state.appState === 'active' &&
          newProps.state.profile.email) {
        if (this.props.state.sync.isSyncingFrom === 'drawer') {
          setTimeout(() => this._showSnackbar(SYNCED_SNACKBAR), 400);
        } else {
          this._showSnackbar(SYNCED_SNACKBAR);
        }
      }

      // Display deleted note snackbar
      if (newProps.navigation.getParam('deletedNote')) {
        // We store deletedNote to be able to recreate it if user click undo
        const deletedNote = newProps.navigation.getParam('deletedNote');
        this.setState({ deletedNote });

        // Erase params for future componentWillReceiveProps events
        newProps.navigation.setParams({ deletedNote: null });

        // Show snackbar
        this._showSnackbar({
          text: 'Note deleted!',
          color: COLOR_NOTES_BLUE,
          action: {
            text: 'UNDO',
            onPress: () => {
              this._undoDelete();
            }
          },
          duration: 6000
        });
      }
    }
  }

  render() {
    return (
      <View style={{ flex: 1, position: 'relative' }}>
        { this.renderList() }

        <Snackbar
          style={{
            backgroundColor: this.state.snackbar ? this.state.snackbar.color : COLOR_DARK_SYNC,
            transform: [
              {
                translateY: this.state.yPosition,
              },
            ],
          }}
          visible={ this.state.snackbarVisible }
          action={ this.state.snackbar ? this.state.snackbar.action : null }
          theme={{ colors: { accent: 'white' }}}
          onDismiss={() => {
            this._hideSnackbar();
          }}
          duration={ this.state.snackbar ? this.state.snackbar.duration : 3000 }
        >
          { this.state.snackbar ? this.state.snackbar.text : '' }
        </Snackbar>

        { this.props.state.kinto.isLoaded ?
          <Animated.View style={[
            {
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 84,
              height: 84,
            },
            {
              transform: [
                {
                  translateY: this.state.yPosition.interpolate({
                    inputRange: [0, SNACKBAR_HEIGHT],
                    outputRange: [-1 * SNACKBAR_HEIGHT, 0]
                  }),
                },
              ],
            }]}>
            <FAB
              small
              color={COLOR_NOTES_WHITE}
              style={styles.fab}
              icon="add"
              onPress={() => this.props.navigation.navigate('EditorPanel', { note: null }) }
            />
          </Animated.View> : null }
      </View>
    );
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
          keyExtractor={ (item) => item.id }
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
    width: 56,
    height: 56,
    borderRadius: 30,
    backgroundColor: COLOR_NOTES_BLUE,
    position: 'absolute',
    bottom: 24,
    right: 24,
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
