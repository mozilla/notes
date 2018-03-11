import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import MoreIcon from './icons/MoreIcon';
import WarningIcon from './icons/WarningIcon';

import { formatFooterTime } from '../utils/utils';
import { SURVEY_PATH } from '../utils/constants';

import { disconnect, exportHTML, openLogin, pleaseLogin, authenticate } from '../actions';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;

    this.STATES = {
      SIGNIN: {
        isClickable: true,
        isSignInState: true,
        text: () => browser.i18n.getMessage('signInToSync'),
        tooltip: () => browser.i18n.getMessage('syncNotes')
      },
      OPENINGLOGIN: {
        cancelSetup: true,
        animateSyncIcon: true,
        text: () => browser.i18n.getMessage('openingLoginWindow')
      },
      VERIFYACCOUNT: {
        ignoreChange: true,
        yellowBackground: true,
        text: () => browser.i18n.getMessage('pleaseLogin')
      },
      RECONNECTSYNC: {
        yellowBackground: true,
        isClickable: true,
        isReconnectState: true,
        text: () => browser.i18n.getMessage('reconnectSync')
      },
      SYNCING: {
        animateSyncIcon: true,
        text: () => browser.i18n.getMessage('syncProgress')
      },
      SYNCED: {
        isClickable: true,
        text: () => browser.i18n.getMessage('syncComplete3', formatFooterTime(this.state.lastModified))
      }
    };

    this.currentState = this.STATES.SIGNIN; // contain current state from this.STATES

    this.exportAsHTML = () => props.dispatch(exportHTML(this.props.state.note.content));

    this.disconnectFromSync = () => {
      props.dispatch(disconnect());
    };

    this.getLastSyncedTime = () => {
      if (!this.currentState.ignoreChange) {
        this.currentState = this.props.state.sync.email ? this.STATES.SYNCED : this.STATES.SIGNIN;
      }
    };

    // Event used on window.addEventListener
    this.onCloseListener = () => {
      if (this.menu) {
        this.menu.classList.replace('open', 'close');
      }
      window.removeEventListener('keydown', this.handleKeyPress);
    };

    // Open and close menu
    this.toggleMenu = (e) => {
      if (this.menu.classList.contains('close')) {
        this.menu.classList.replace('close', 'open');
        setTimeout(() => {
          window.addEventListener('click', this.onCloseListener, { once: true });
          window.addEventListener('keydown', this.handleKeyPress);
        }, 10);
        this.indexFocusedButton = null; // index of focused button in this.buttons
      } else {
        this.onCloseListener();
        window.removeEventListener('click', this.onCloseListener);
      }
    };

    // Handle keyboard navigation on menu
    this.handleKeyPress = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          if (this.indexFocusedButton === null) {
            this.indexFocusedButton = this.buttons.length - 1;
          } else {
            this.indexFocusedButton = (this.indexFocusedButton - 1) % this.buttons.length;
            if (this.indexFocusedButton < 0) {
              this.indexFocusedButton = this.buttons.length - 1;
            }
          }
          this.buttons[this.indexFocusedButton].focus();
          break;
        case 'ArrowDown':
          if (this.indexFocusedButton === null) {
            this.indexFocusedButton = 0;
          } else {
            this.indexFocusedButton = (this.indexFocusedButton + 1) % this.buttons.length;
          }
          this.buttons[this.indexFocusedButton].focus();
          break;
        case 'Escape':
          if (this.menu.classList.contains('open')) {
            this.toggleMenu(event);
          }
          break;
      }
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
  }

  componentDidMount() {
    browser.storage.local.get('credentials').then(data => {
      if (data.hasOwnProperty('credentials')) {
        this.props.dispatch(authenticate(localStorage.getItem('userEmail')));
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
        this.currentState = this.STATES.VERIFYACCOUNT;
      } else if (state.sync.isReconnectSync) {
        this.currentState = this.STATES.RECONNECTSYNC;
      } else {
        this.currentState = this.STATES.SIGNIN;
      }
    }
  }

  render() {

    // Those classes define animation state on #footer-buttons
    const footerClass = classNames({
       warning: this.currentState.yellowBackground,
       animateSyncIcon: this.currentState.animateSyncIcon
    });

    // List of menu used for keyboard navigation
    this.buttons = [];

    return (
      <footer
        id="footer-buttons"
        ref={footerbuttons => this.footerbuttons = footerbuttons}
        className={footerClass}>

        { this.currentState.isSignInState || this.currentState.yellowBackground ?
        <button
          className="fullWidth"
          title={ this.currentState.tooltip ? this.currentState.tooltip() : '' }
          onClick={(e) => this.enableSyncAction(e)}>
          { this.currentState.yellowBackground ?
          <WarningIcon /> : <SyncIcon />} <span>{ this.currentState.text() }</span>
        </button>
        : null }

        { !this.currentState.isSignInState && !this.currentState.yellowBackground ?
        <div className={this.currentState.isClickable ? 'isClickable btnWrapper' : 'btnWrapper'}>
          <button
            id="enable-sync"
            disabled={!this.currentState.isClickable}
            onClick={(e) => this.enableSyncAction(e)}
            className="iconBtn">
            <SyncIcon />
          </button>
          <p>{ browser.i18n.getMessage('syncToMail', this.props.state.sync.email) }</p>
          <p className={ this.currentState.yellowBackground ? 'alignLeft' : null}>{ this.currentState.text() }</p>
        </div>
        : null }

        { !this.currentState.isSignInState ?
        <div className="photon-menu close top left" ref={menu => this.menu = menu }>
          <button
            id="context-menu-button"
            className="iconBtn"
            onClick={(e) => this.toggleMenu(e)}>
            <MoreIcon />
          </button>
          <div className="wrapper">
            <ul role="menu" >
              <li>
                <button
                  role="menuitem"
                  onKeyDown={this.handleKeyPress}
                  ref={btn => btn ? this.buttons.push(btn) : null }
                  title={browser.i18n.getMessage(this.props.state.sync.email ? 'disableSync' : 'cancelSetup')}
                  onClick={ this.disconnectFromSync }>
                  { !this.props.state.sync.email ? browser.i18n.getMessage('cancelSetup') : '' }
                  { this.props.state.sync.email && this.currentState.isReconnectState ? browser.i18n.getMessage('removeAccount') : '' }
                  { this.props.state.sync.email && !this.currentState.isReconnectState ? browser.i18n.getMessage('disableSync') : '' }
                </button>
              </li>
            </ul>
          </div>
        </div> : null }
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
