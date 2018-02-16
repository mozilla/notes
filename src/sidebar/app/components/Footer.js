import React from 'react';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import FeedbackIcon from './icons/FeedbackIcon';

import { formatFooterTime } from '../utils';
import { SURVEY_PATH } from '../constants';

const STATES = {
  SAVING: {
    savingLayout: true,
    animateSyncIcon: true,
    leftText: () => browser.i18n.getMessage('savingChanges')
  },
  SAVED: {
    savingLayout: true,
    isClickable: true,
    leftText: () => browser.i18n.getMessage('changesSaved')
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
    rightText: () => browser.i18n.getMessage('syncProgress')
  },
  SYNCED: {
    isClickable: true,
    rightText: (date) => browser.i18n.getMessage('syncComplete3', formatFooterTime(date))
  },
  DISCONNECTED: {
    savingLayout: true,
    rightText: () => browser.i18n.getMessage('disconnected')
  }
};

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      lastModified: Date.now(),
      isKintoLoaded: false,
      state: {}
    };
    this.loginTimeout = null;

    this.events = eventData => {
      // let content;
      switch (eventData.action) {
        case 'sync-authenticated':
          clearTimeout(this.loginTimeout);

          this.setState({
            state: STATES.SYNCING,
            isAuthenticated: true
          });
          // set title attr of footer to the currently logged in account
          if (eventData.profile) {
            this.footerbuttons.title = `${browser.i18n.getMessage('syncToMail', eventData.profile.email)}`;
          }
          browser.runtime.sendMessage({
            action: 'kinto-sync'
          });
          break;
        case 'kinto-loaded':
          clearTimeout(this.loginTimeout);
          // Switch to Date.now() to show when we pulled notes instead of 'eventData.last_modified'
          this.setState({
            lastModified: Date.now(),
            isKintoLoaded: true
          });

          // Force refresh on Material Design Lite library to activate mdl-menu
          componentHandler.upgradeAllRegistered(); // eslint-disable-line no-undef

          this.getLastSyncedTime();
          break;
        case 'text-change':
          browser.runtime.sendMessage({
            action: 'kinto-load'
          });
          break;
        case 'text-syncing':
          this.setState({
            state: STATES.SYNCING
          });
          // Disable sync-action
          break;
        case 'text-editing':
          this.setState({
            state: this.state.isAuthenticated ? STATES.SYNCING : STATES.SAVING
          });
          break;
        case 'text-synced':
          // Enable sync-action
          this.setState({
            lastModified: eventData.last_modified
          });
          this.getLastSyncedTime();
          break;
        case 'text-saved':
          if (!this.state.state.ignoreChange && !this.state.isAuthenticated) {
            // persist reconnect warning, do not override with the 'saved at'
            this.setState({
              state: STATES.SAVED
            });
          }
          break;
        case 'reconnect':
          clearTimeout(this.loginTimeout);
          this.setState({
            state: STATES.RECONNECTSYNC
          });

          chrome.runtime.sendMessage({
            action: 'metrics-reconnect-sync'
          });
          break;
        case 'disconnected':
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
          state: this.state.isAuthenticated ? STATES.SYNCED : STATES.SAVED
        });
      }
    };

    this.exportAsHTML = () => {
      const notesContent = this.editor.getData();
      const exportedFileName = 'notes.html';
      const exportFileType = 'text/html';

      const data = new Blob([notesContent], {'type': exportFileType});
      const exportFilePath = window.URL.createObjectURL(data);
      const downloading = browser.downloads.download({
        url: exportFilePath,
        filename: exportedFileName
      });
    };

    this.disconnectFromSync = () => {
      this.setState({
        state: STATES.DISCONNECTED
      });

      setTimeout(() => {
        this.getLastSyncedTime();
      }, 2000);

      browser.runtime.sendMessage('notes@mozilla.com', {
        action: 'disconnected'
      });
    };

    this.enableSyncAction = () => {
      // persist reconnect warning, do not override with the 'saved at'
      if (this.state.state.ignoreChange) return;

      if (this.state.isAuthenticated) {
        // Trigger manual sync
        this.setState({
          state: STATES.SYNCING
        });
        browser.runtime.sendMessage({
          action: 'kinto-sync'
        });

      } else if (!this.state.isAuthenticated) {
        // Login
        this.setState({
          state: STATES.OPENINGLOGIN
        });

        const that = this;
        this.loginTimeout = setTimeout(() => {
          that.setState({
            state:  STATES.PLEASELOGIN
          });
        }, 5000);

        // Problem not having editor in Footer Component
        browser.runtime.sendMessage({
          action: 'authenticate'
        });
      }
    };

    this.giveFeedbackCallback = (e) => {
      e.preventDefault();
      browser.tabs.create({
        url: SURVEY_PATH
      });
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
       savingLayout: this.state.state.savingLayout,
       syncingLayout: !this.state.state.savingLayout,
       warning: this.state.state.yellowBackground,
       animateSyncIcon: this.state.state.animateSyncIcon
    });

    // We need to cache both text to allow opacity transition between state switch
    // On every rendering it will update text based on state
    if (this.state.state.rightText) {
      this.rightText = this.state.state.rightText(this.state.lastModified);
    } else if (this.state.state.leftText) {
      this.leftText = this.state.state.leftText(this.state.lastModified);
    }

    return (
      <footer>
        <div id="footer-buttons"
          ref={footerbuttons => this.footerbuttons = footerbuttons}
          className={footerClass}>
          <div className={this.state.state.isClickable ? 'isClickable' : ''}>
            <p id="saving-indicator">{this.leftText}</p>
            <button
              id="enable-sync"
              onClick={() => this.enableSyncAction()}
              className="notsyncing">
              <SyncIcon />
            </button>
            <button
              id="syncing-indicator"
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
                   style={{ width: '100%' }}
                   onClick={ this.exportAsHTML }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
        </li> {
          this.state.isAuthenticated ?
              <li>
                <button
                  className="mdl-menu__item context-menu-item"
                  style={{ width: '100%' }}
                  onClick={ this.disconnectFromSync }
                >
                  {browser.i18n.getMessage('disableSync')}
                </button>
            </li> : null
        }<li>
                <a className="mdl-menu__item context-menu-item"
                   title={browser.i18n.getMessage('feedback')}
                   onClick={ this.giveFeedbackCallback }
                   href={ SURVEY_PATH }>
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

export default Footer;
