import React from 'react';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import MoreIcon from './icons/MoreIcon';
import WarningIcon from './icons/WarningIcon';

import { formatFooterTime } from '../utils/utils';
import INITIAL_CONTENT from '../data/initialContent';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      lastModified: Date.now(),
      content: INITIAL_CONTENT,
      isKintoLoaded: false,
      state: {}
    };
    this.loginTimeout = null;

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
        text: () => browser.i18n.getMessage('syncComplete2', formatFooterTime(this.state.lastModified))
      }
    };

    this.events = eventData => {
      // let content;
      switch (eventData.action) {
        case 'sync-authenticated':
          clearTimeout(this.loginTimeout);

          this.setState({
            state: this.STATES.SYNCING,
            isAuthenticated: true,
            email: eventData.profile ? eventData.profile.email : null
          });
          browser.runtime.sendMessage({
            action: 'kinto-sync'
          });
          break;
        case 'kinto-loaded':
          clearTimeout(this.loginTimeout);
          // Switch to Date.now() to show when we pulled notes instead of 'eventData.last_modified'
          this.setState({
            lastModified: Date.now(),
            content: eventData.data || INITIAL_CONTENT,
            isKintoLoaded: true
          });
          this.getLastSyncedTime();
          break;
        case 'text-change':
          browser.runtime.sendMessage({
            action: 'kinto-load'
          });
          break;
        case 'text-syncing':
          this.setState({
            state: this.STATES.SYNCING
          });
          // Disable sync-action
          break;
        case 'text-editing':
          this.setState({
            state: this.state.isAuthenticated ? this.STATES.SYNCING : this.STATES.SIGNIN
          });
          break;
        case 'text-synced':
          // Enable sync-action
          this.setState({
            lastModified: eventData.last_modified,
            content: eventData.content || INITIAL_CONTENT
          });
          this.getLastSyncedTime();
          break;
        case 'text-saved':
          if (!this.state.state.ignoreChange && !this.state.isAuthenticated) {
            // persist reconnect warning, do not override with the 'saved at'
            this.setState({
              state: this.STATES.SIGNIN
            });
          }
          break;
        case 'reconnect':
          clearTimeout(this.loginTimeout);
          this.setState({
            state: this.STATES.RECONNECTSYNC
          });

          chrome.runtime.sendMessage({
            action: 'metrics-reconnect-sync'
          });
          break;
        case 'disconnected':
          clearTimeout(this.loginTimeout);
          this.setState({
            isAuthenticated: false
          });
          this.getLastSyncedTime();
          break;
      }
    };

    this.getLastSyncedTime = () => {
      if (!this.state.state.ignoreChange) {
        this.setState({
          state: this.state.isAuthenticated ? this.STATES.SYNCED : this.STATES.SIGNIN
        });
      }
    };

    // Event used on window.addEventListener
    this.onCloseListener = () => {
      this.menu.classList.replace('open', 'close');
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

    this.disconnectFromSync = () => {
      browser.runtime.sendMessage('notes@mozilla.com', {
        action: 'disconnected'
      });
    };

    this.enableSyncAction = () => {
      // persist reconnect warning, do not override with the 'saved at'
      if (!this.state.state.isClickable) return;

      if (this.state.isAuthenticated) {
        // Trigger manual sync
        this.setState({
          state: this.STATES.SYNCING
        });
        browser.runtime.sendMessage({
          action: 'kinto-sync'
        });

      } else if (!this.state.isAuthenticated) {
        // Login
        this.setState({
          state: this.STATES.OPENINGLOGIN
        });

        const that = this;
        this.loginTimeout = setTimeout(() => {
          that.setState({
            state:  this.STATES.VERIFYACCOUNT
          });
        }, 5000);

        // Problem not having editor in Footer Component
        browser.runtime.sendMessage({
          action: 'authenticate'
        });
      }
    };
  }

  componentDidMount() {
    browser.storage.local.get('credentials').then(data => {
      if (data.hasOwnProperty('credentials')) {
        this.setState({
          isAuthenticated: true
        });
      }
    });

    this.getLastSyncedTime();
    chrome.runtime.onMessage.addListener(this.events);
  }

  componentWillUnmount() {
    chrome.runtime.onMessage.removeListener(this.events);
  }

  render() {

    if (!this.state.isKintoLoaded) return '';

    // Those classes define animation state on #footer-buttons
    const footerClass = classNames({
       warning: this.state.state.yellowBackground,
       animateSyncIcon: this.state.state.animateSyncIcon
    });

    // List of menu used for keyboard navigation
    this.buttons = [];

    return (
      <footer
        id="footer-buttons"
        ref={footerbuttons => this.footerbuttons = footerbuttons}
        className={footerClass}>

        { this.state.state.isSignInState || this.state.state.yellowBackground ?
        <button
          className="fullWidth"
          title={ this.state.state.tooltip ? this.state.state.tooltip() : '' }
          onClick={(e) => this.enableSyncAction(e)}>
          { this.state.state.yellowBackground ?
          <WarningIcon /> : <SyncIcon />} <span>{ this.state.state.text() }</span>
        </button>
        : null }

        { !this.state.state.isSignInState && !this.state.state.yellowBackground ?
        <div className={this.state.state.isClickable ? 'isClickable btnWrapper' : 'btnWrapper'}>
          <button
            id="enable-sync"
            disabled={!this.state.state.isClickable}
            onClick={(e) => this.enableSyncAction(e)}
            className="iconBtn">
            <SyncIcon />
          </button>
          <p>{ browser.i18n.getMessage('syncToMail', this.state.email) }</p>
          <p className={ this.state.state.yellowBackground ? 'alignLeft' : null}>{ this.state.state.text() }</p>
        </div>
        : null }

        { !this.state.state.isSignInState ?
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
                  title={browser.i18n.getMessage(this.state.isAuthenticated ? 'disableSync' : 'cancelSetup')}
                  onClick={ this.disconnectFromSync }>
                  { !this.state.isAuthenticated ? browser.i18n.getMessage('cancelSetup') : '' }
                  { this.state.isAuthenticated && this.state.state.isReconnectState ? browser.i18n.getMessage('removeAccount') : '' }
                  { this.state.isAuthenticated && !this.state.state.isReconnectState ? browser.i18n.getMessage('disableSync') : '' }
                </button>
              </li>
            </ul>
          </div>
        </div> : null }
      </footer>
    );
  }
}

export default Footer;
