import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import MoreIcon from './icons/MoreIcon';
import WarningIcon from './icons/WarningIcon';

import { formatFooterTime } from '../utils/utils';

import { disconnect, openLogin, pleaseLogin, authenticate, exportHTML } from '../actions';
const expiredDate = new Date('2020/10/21');
const now = new Date();
const serversActive = now < expiredDate;

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
      ERROR: {
        yellowBackground: true,
        isClickable: false
      },
      SYNCING: {
        animateSyncIcon: true,
        text: () => browser.i18n.getMessage('syncProgress')
      },
      SYNCED: {
        isClickable: true,
        text: () => browser.i18n.getMessage('syncComplete3', formatFooterTime(this.props.state.sync.lastSynced))
      }
    };

    this.getFooterState = (state) => {
      let res;
      if (state.sync.email) { // If user is authenticated
        if (state.sync.error) {
          res = this.STATES.ERROR;
          res.text = () => state.sync.error;
        } else if (state.sync.isSyncing) {
          res = this.STATES.SYNCING;
        } else {
          res = this.STATES.SYNCED;
        }
      } else {
        if (state.sync.isOpeningLogin) { // eslint-disable-line no-lonely-if
          res = this.STATES.OPENINGLOGIN;
        } else if (state.sync.isPleaseLogin) {
          res = this.STATES.VERIFYACCOUNT;
        } else if (state.sync.isReconnectSync) {
          res = this.STATES.RECONNECTSYNC;
        } else {
          res = this.STATES.SIGNIN;
        }
      }
      return res;
    };

    this.currentState = this.getFooterState(props.state); // contain current state from this.STATES

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
      // Blur `this.contextMenuBtn` when context menu closes - fixes #770
      this.contextMenuBtn.blur();
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

    // Handles "Export All Notes" functionality
    this.exportAll = () => {
      let output = '';
      for (const note of this.props.state.notes) {
        output += note.content;
        output += '<br/><hr/><br/>';
      }
      exportHTML(output);
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
  // Not a big fan of all those if.
  componentWillReceiveProps(nextProps) {
    this.currentState = this.getFooterState(nextProps.state);
  }

  componentDidMount() {
    if (!serversActive && (!this.currentState.isSignInState || this.currentState.isReconnectState)) {
      // needs a delay before disconnecting
      setTimeout(() => {
        this.props.dispatch(disconnect());
      }, 2000);
    }
  }

  render() {

    if (!this.props.state.kinto.isLoaded) return '';

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

        <div id="footerButtons">

        { serversActive && (this.currentState.isSignInState || this.currentState.yellowBackground) ?
          <button
            className="fullWidth"
            title={ this.currentState.tooltip ? this.currentState.tooltip() : '' }
            onClick={(e) => this.enableSyncAction(e)}>
            { this.currentState.yellowBackground ?
              <WarningIcon /> : <SyncIcon />} <span>{ this.currentState.text() }</span>
          </button>
          : <div className="fullWidth"></div> }

        { serversActive && (!this.currentState.isSignInState && !this.currentState.yellowBackground) ?
          <div className={this.currentState.isClickable ? 'isClickable btnWrapper' : 'btnWrapper'}>
            <button
              id="enable-sync"
              disabled={!this.currentState.isClickable}
              onClick={(e) => this.enableSyncAction(e)}
              title={browser.i18n.getMessage('syncToMail', this.props.state.sync.email)}
              className="iconBtn">
              <SyncIcon/>
            </button>
              <p className={this.currentState.yellowBackground ? 'alignLeft' : null}>{this.currentState.text()}</p>
          </div>
          : <div className="fullWidth"></div> }

          <div className="photon-menu close top left" ref={menu => this.menu = menu }>
            <button
              ref={contextMenuBtn => this.contextMenuBtn = contextMenuBtn}
              className="iconBtn"
              onClick={(e) => this.toggleMenu(e)}>
              <MoreIcon />
            </button>
            <div className="wrapper">
              <ul role="menu" >
                <li>
                  { !this.currentState.isSignInState ?
                    <button
                    role="menuitem"
                    onKeyDown={this.handleKeyPress}
                    ref={btn => btn ? this.buttons.push(btn) : null }
                    title={browser.i18n.getMessage(this.props.state.sync.email ? 'disableSync' : 'cancelSetup')}
                    onClick={ this.disconnectFromSync }>
                    { !this.props.state.sync.email ? browser.i18n.getMessage('cancelSetup') : '' }
                    { this.props.state.sync.email && this.currentState.isReconnectState ? browser.i18n.getMessage('removeAccount') : '' }
                    { this.props.state.sync.email && !this.currentState.isReconnectState ? browser.i18n.getMessage('disableSync') : '' }
                  </button> : null }
                  <button
                    role="menuitem"
                    onKeyDown={this.exportAll}
                    ref={btn => btn ? this.buttons.push(btn) : null }
                    title="Export All Notes"
                    onClick={ this.exportAll }> Export All Notes
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        { serversActive && <div className="serverAlert">
          Notes syncing will be disabled on <a href='https://support.mozilla.org/en-US/kb/notes-status'>November 1, 2020</a>
        </div>}
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
