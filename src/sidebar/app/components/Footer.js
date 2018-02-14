import React from 'react';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import FeedbackIcon from './icons/FeedbackIcon';


import { formatFooterTime } from '../utils';

import { SURVEY_PATH } from '../constants';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      savingIndicatorText: '',
      syncingIndicatorText: '',
      waitingToReconnect: false,
      isAuthenticated: false,
      lastModified: Date.now(),
      isKintoLoaded: false
    };
    this.loginTimeout = null;

    this.events = eventData => {
      // let content;
      switch (eventData.action) {
        case 'sync-authenticated':
          clearTimeout(this.loginTimeout);

          this.setState({
            isAuthenticated: true,
            waitingToReconnect: false,
            syncingInProcess: true,
            syncingIndicatorText: browser.i18n.getMessage('syncProgress')
          });

          // set title attr of footer to the currently logged in account
          this.footerbuttons.title = eventData.profile && eventData.profile.email;

          browser.runtime.sendMessage({
            action: 'kinto-sync'
          });
          break;
        case 'kinto-loaded':
          clearTimeout(this.loginTimeout);
          // Switch to Date.now() to show when we pulled notes instead of 'eventData.last_modified'
          this.setState({
            lastModified: Date.now(),
            syncingInProcess: false,
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
            syncingIndicatorText: browser.i18n.getMessage('syncProgress'),
            syncingInProcess: true
          });
          // Disable sync-action
          break;
        case 'text-editing':
          if (this.state.isAuthenticated) {
            this.setState({
              syncingInProcess: true
            });
          }
          if (!this.state.waitingToReconnect) {
            this.setState({
              savingIndicatorText: browser.i18n.getMessage('savingChanges')
            });
          }
          // Disable sync-action
          this.setState({
            editingInProcess: true
          });
          break;
        case 'text-synced':
          // Enable sync-action
          this.setState({
            lastModified: eventData.last_modified,
            syncingInProcess: false,
            isLoggingIn: false
          });
          this.getLastSyncedTime();
          break;
        case 'text-saved':
          if (!this.state.waitingToReconnect) {
            // persist reconnect warning, do not override with the 'saved at'
            this.setState({
              savingIndicatorText: browser.i18n.getMessage(
                'savedComplete2',
                formatFooterTime()
              )
            });
          }
          // Enable sync-action
          this.setState({
            editingInProcess: false,
            syncingInProcess: false
          });
          break;
        case 'reconnect':
          clearTimeout(this.loginTimeout);

          this.setState({
            waitingToReconnect: true,
            isAuthenticated: false,
            syncingIndicatorText: browser.i18n.getMessage('reconnectSync'),
            syncingInProcess: false
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
      if (this.state.waitingToReconnect) {
        // persist reconnect warning, do not override with the 'saved at'
        return;
      }

      if (this.state.isAuthenticated) {
        this.setState({
          syncingIndicatorText: browser.i18n.getMessage(
            'syncComplete2',
            formatFooterTime(this.state.lastModified)
          ),
          isAuthenticated: true
        });

      } else {
        this.setState({
          savingIndicatorText: browser.i18n.getMessage(
            'savedComplete2',
            formatFooterTime(this.state.lastModified)
          )
        });
      }
    };

    this.disconnectFromSync = () => {
      this.setState({
        waitingToReconnect: false,
        isAuthenticated: false,
        isLoggingIn: false,
        syncingIndicatorText: browser.i18n.getMessage('disconnected')
      });

      setTimeout(() => {
        this.getLastSyncedTime();
      }, 2000);

      browser.runtime.sendMessage('notes@mozilla.com', {
        action: 'disconnected'
      });
    };

    this.enableSyncAction = () => {
      if (this.state.editingInProcess || this.state.syncingInProcess) {
        return;
      }

      if (this.state.isAuthenticated) {
        // Trigger manual sync
        this.setState({
          syncingInProcess: true
        });
        browser.runtime.sendMessage({
          action: 'kinto-sync'
        });

      } else if (!this.state.isAuthenticated || this.state.waitingToReconnect) {
        // Login
        this.setState({
          isLoggingIn: true,
          syncingIndicatorText: browser.i18n.getMessage('openingLogin')
        });

        const that = this;
        this.loginTimeout = setTimeout(() => {
          that.setState({
            syncingIndicatorText: browser.i18n.getMessage('pleaseLogin'),
            waitingToReconnect: true,
            isLoggingIn: false
          });
        }, 5000);

        // Problem not having editor in Footer Component
        browser.runtime.sendMessage({
          action: 'authenticate'
        });
      }

      this.setState({
        waitingToReconnect: false
      });
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

    if (!this.state.isKintoLoaded) {
      return '';
    }

    const isSyncing = this.state.waitingToReconnect || this.state.isAuthenticated || this.state.isLoggingIn;
    // Those classes define animation state on #footer-buttons
    const footerClass = classNames({
       savingLayout: !isSyncing,
       syncingLayout: isSyncing,
       warning: this.state.waitingToReconnect,
       animateSyncIcon: (this.state.isLoggingIn || this.state.syncingInProcess) && !this.state.waitingToReconnect
    });

    return (
      <footer>
        <div id="footer-buttons"
          ref={footerbuttons => this.footerbuttons = footerbuttons}
          className={footerClass}>
          <div>
            <p id="saving-indicator">{this.state.savingIndicatorText}</p>
            <button
              id="enable-sync"
              onClick={() => this.enableSyncAction()}
              className="notsyncing">
              <SyncIcon />
            </button>
            <button
              id="syncing-indicator"
              onClick={() => this.enableSyncAction()}>
              {this.state.syncingIndicatorText}
            </button>
          </div>
          <a id="give-feedback-button"
            title={browser.i18n.getMessage('feedback')}
            onClick={ this.giveFeedbackCallback }
            href={ SURVEY_PATH }>
            <FeedbackIcon />
          </a>
          <div className="wrapper">
            <button id="context-menu-button"
              className="mdl-js-button" />
            <ul
              className="mdl-menu mdl-menu--top-right mdl-js-menu context-menu"
              data-mdl-for="context-menu-button">
              <li>
                <button
                  className="mdl-menu__item context-menu-item"
                  style={{ width: '100%' }}
                  onClick={() => this.disconnectFromSync()}
                >
                  {browser.i18n.getMessage('disableSync')}
                </button>
              </li>
              <li>
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
