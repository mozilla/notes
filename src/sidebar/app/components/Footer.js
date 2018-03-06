import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SyncIcon from './SyncIcon';

import { formatFooterTime } from '../utils/utils';
import { SURVEY_PATH } from '../utils/constants';

import { disconnect, exportHTML, openLogin, pleaseLogin, authenticate } from '../actions';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;

    this.currentState = {}; // contain current state from this.STATES

    browser.runtime.getBrowserInfo().then((info) => {
      this.surveyPath = `${SURVEY_PATH}&ver=${browser.runtime.getManifest().version}&release=${info.version}`;
    });

    this.STATES = {
      SAVING: {
        savingLayout: true,
        animateSyncIcon: false,
        leftText: () => browser.i18n.getMessage('savingChanges')
      },
      SAVED: {
        savingLayout: true,
        isClickable: true,
        leftText: () => browser.i18n.getMessage('changesSaved'),
        tooltip: () => browser.i18n.getMessage('syncNotes')
      },
      OPENINGLOGIN: {
        ignoreChange: true,
        animateSyncIcon: true,
        rightText: () => browser.i18n.getMessage('openingLogin')
      },
      PLEASELOGIN: {
        ignoreChange: true,
        yellowBackground: true,
        rightText: () => browser.i18n.getMessage('pleaseLogin')
      },
      RECONNECTSYNC: {
        yellowBackground: true,
        isClickable: true,
        rightText: () => browser.i18n.getMessage('reconnectSync')
      },
      SYNCING: {
        animateSyncIcon: true,
        rightText: () => browser.i18n.getMessage('syncProgress'),
        tooltip: () => this.props.state.sync.email ? browser.i18n.getMessage('syncToMail', this.props.state.sync.email) : ''
      },
      SYNCED: {
        isClickable: true,
        rightText: () => browser.i18n.getMessage('syncComplete3', formatFooterTime(this.props.state.note.lastSynced)),
        tooltip: () => this.props.state.sync.email ? browser.i18n.getMessage('syncToMail', this.props.state.sync.email) : ''
      },
      DISCONNECTED: {
        savingLayout: true,
        rightText: () => browser.i18n.getMessage('disconnected')
      }
    };

    this.exportAsHTML = () => props.dispatch(exportHTML(this.props.state.note.content));

    this.disconnectFromSync = () => {
      this.setState({
        state: this.STATES.DISCONNECTED
      });
      props.dispatch(disconnect());
    };

    this.enableSyncAction = () => {
      if (!this.currentState.isClickable) return;
      if (this.props.state.sync.email) {
        props.dispatch(authenticate(this.props.state.sync.email));
      } else {
        setTimeout(() => props.dispatch(pleaseLogin()), 5000);
        props.dispatch(openLogin());
      }
    };

    this.giveFeedbackCallback = (e) => {
      e.preventDefault();
      browser.tabs.create({
        url: this.surveyPath
      });
    };
  }

  componentDidMount() {
    browser.storage.local.get('credentials').then(data => {
      if (data.hasOwnProperty('credentials')) {
        this.props.dispatch(authenticate(''));
      }
    });
  }

  // Not a big fan of all those if.
  componentWillReceiveProps(nextProps) {
    const state = nextProps.state;
    if (state.sync.email) { // If user is authenticated
        if (state.note.isSyncing) {
          this.currentState = this.STATES.SYNCING;
        } else {
          this.currentState = this.STATES.SYNCED;
        }
    } else {
      if (state.sync.isOpeningLogin) { // eslint-disable-line no-lonely-if
        this.currentState = this.STATES.OPENINGLOGIN;
      } else if (state.sync.isPleaseLogin) {
        this.currentState = this.STATES.PLEASELOGIN;
      } else if (state.sync.isReconnectSync) {
        this.currentState = this.STATES.RECONNECTSYNC;
      } else if (state.note.isSaving) {
        this.currentState = this.STATES.SAVING;
      } else {
        this.currentState = this.STATES.SAVED;
      }
    }
  }

  componentDidUpdate() {
    if (this.footerbuttons) {
      componentHandler.upgradeAllRegistered(); // eslint-disable-line no-undef
    }
  }

  render() {

    if (!this.props.state.kinto.isLoaded) return '';

    // Those classes define animation state on #footer-buttons
    const footerClass = classNames({
       savingLayout: this.currentState.savingLayout,
       syncingLayout: !this.currentState.savingLayout,
       warning: this.currentState.yellowBackground,
       animateSyncIcon: this.currentState.animateSyncIcon
    });

    // We need to cache both text to allow opacity transition between state switch
    // On every rendering it will update text based on state
    if (this.currentState.rightText) {
      this.rightText = this.currentState.rightText();
    } else if (this.currentState.leftText) {
      this.leftText = this.currentState.leftText();
    }
    this.tooltip = this.currentState.tooltip ? this.currentState.tooltip() : '';

    return (
      <footer>
        <div id="footer-buttons"
          ref={footerbuttons => this.footerbuttons = footerbuttons}
          className={footerClass}>
          <div className={this.currentState.isClickable ? 'isClickable' : ''}>
            <p id="saving-indicator">{this.leftText}</p>
            <button
              id="enable-sync"
              title={ this.tooltip }
              onClick={() => this.enableSyncAction()}
              className="notsyncing">
              <SyncIcon />
            </button>
            <button
              id="syncing-indicator"
              title={ this.tooltip }
              onClick={() => this.enableSyncAction()}>
              {this.rightText}
            </button>
          </div>
          <div className="wrapper">
            <button id="context-menu-button"
              className="mdl-js-button" />
            <ul
              className="mdl-menu mdl-menu--top-right mdl-js-menu context-menu"
              data-mdl-for="context-menu-button">
              <li>
                <button className="mdl-menu__item context-menu-item"
                   title={browser.i18n.getMessage('exportAsHTML')}
                   style={{ width: '100%' }}
                   onClick={ () => this.exportAsHTML() }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
              </li>
              { !this.currentState.savingLayout && !this.currentState.ignoreChange ?
              <li>
                <button className="mdl-menu__item context-menu-item"
                  title={browser.i18n.getMessage('disableSync')}
                  style={{ width: '100%' }}
                  onClick={ this.disconnectFromSync }
                >
                  {browser.i18n.getMessage('disableSync')}
                </button>
              </li> : null
              }
              <li>
                <a className="mdl-menu__item context-menu-item"
                   title={browser.i18n.getMessage('feedback')}
                   onClick={ this.giveFeedbackCallback }
                   href={ this.surveyPath }>
                  { browser.i18n.getMessage('feedback') }
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    );
  }
}

function mapStateToProps(state) {
  return {
    state
  };
}

Footer.propTypes = {
    state: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(Footer);
