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
import { COLOR_DARK_SYNC, COLOR_DARK_WARNING, COLOR_NOTES_BLUE, COLOR_NOTES_WHITE, KINTO_LOADED } from '../utils/constants';
import { kintoLoad, createNote, setNetInfo, authenticate, reconnectSync, openingLogin } from "../actions";
import browser from '../browser';
import { trackEvent } from '../utils/metrics';

import ListPanelEmpty from './ListPanelEmpty';
import ListPanelLoading from './ListPanelLoading';

var _ = require('lodash')

class ListPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      refreshing: false,
      appState: AppState.currentState,
      deletedNote: null,
      hideFab: false,
      fabPositionAnimation: new Animated.Value(0),
      fabOpacityAnimation: new Animated.Value(1),
      snackbarVisible: false,
      snackbar: null
    };
    this.snackbarList = [];

    this._onRefresh = () => {
      if (this.props.state.sync.isConnected === false) {
        ToastAndroid.show(browser.i18n.getMessage('toastOffline'), ToastAndroid.LONG);
      } else {
        trackEvent('webext-button-authenticate');
        if (!this.props.state.refreshing) {
          this.setState({refreshing: true});
          this.setState({refreshing: false});
        }
        props.dispatch(kintoLoad()).then(() => {
          this.setState({ refreshing: false });
        }).catch(() => {
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
          if (this.props.state.sync.loginDetails) {
            props.dispatch(kintoLoad()).then(() => {
              this.setState({ refreshing: false });
            }).catch(() => {
              this.setState({ refreshing: false });
            });
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
      if (wasConnected === false &&
          this.props.state.sync.isConnected !== false &&
          this.props.state.sync.loginDetails) {
        props.dispatch(kintoLoad());
      }
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

  shouldComponentUpdate(nextProps) {
    let shouldUpdate = false;

    const changedProps = _.reduce(this.props.state, function (result, value, key) {
      return _.isEqual(value, nextProps.state[key])
        ? result
        : result.concat(key)
    }, []);

    // only render when notes collection changes
    if (changedProps.length > 0 && _.intersection(changedProps, ['notes', 'appUpdates', 'kinto']).length > 0) {
      shouldUpdate = true;
    }

    return shouldUpdate;
  }

  componentWillReceiveProps(newProps) {

  }

  render() {
    return this.renderList();
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
          data={this.props.state.notes.sort((a, b) => {
            const aStamp = new Date(a.lastModified).getTime();
            const bStamp = new Date(b.lastModified).getTime();
            return aStamp <= bStamp ? 1 : -1
          })}
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
