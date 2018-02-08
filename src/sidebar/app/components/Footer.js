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
      syncingLayout: false
    };
    this.loginTimeout = null;

    /**
     * Set animation on footerButtons toolbar
     *
     *
     * @param {Boolean} animateSyncIcon Start looping animation on sync icon
     * @param {Boolean} syncingLayout   if true, animate to syncingLayout (sync icon on right)
     *                                  if false, animate to savingLayout (sync icon on left)
     * @param {Boolean} warning         Apply yellow warning styling on toolbar
     */
    this.setAnimation = (animateSyncIcon = true, syncingLayout, warning) => {
      // animateSyncIcon, syncingLayout, warning
      const enableSync = document.getElementById('enable-sync');
      const savingIndicator = document.getElementById('saving-indicator');

      if (syncingLayout === true && !this.state.syncingLayout) {

        enableSync.style.backgroundColor = 'transparent';

        // enableSync.style.backgroundColor = 'transparent';
        // Start blink animation on saving-indicator
        savingIndicator.classList.add('blink');
        // Reset CSS animation by removing class
        setTimeout(() => savingIndicator.classList.remove('blink'), 400);

      } else if (syncingLayout === false && this.state.syncingLayout) {
        // Animate savingIndicator text
        savingIndicator.classList.add('blink');

        setTimeout(() => savingIndicator.classList.remove('blink'), 400);

        setTimeout(() => {
          enableSync.style.backgroundColor = null;
        }, 400);
        //
      }

      this.setState({
        animateSyncIcon,
        syncingLayout,
        warning
      });

    };

    this.events = eventData => {
      // let content;
      switch (eventData.action) {
        case 'sync-authenticated':
          this.setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning
          clearTimeout(this.loginTimeout);

          this.setState({
            isAuthenticated: true,
            waitingToReconnect: false,
            savingIndicatorText: browser.i18n.getMessage('syncProgress')
          });

          // set title attr of footer to the currently logged in account
          this.footerButtons.title = eventData.profile && eventData.profile.email;

          browser.runtime.sendMessage({
            action: 'kinto-sync'
          });
          break;
        case 'kinto-loaded':
          clearTimeout(this.loginTimeout);
          // Switch to Date.now() to show when we pulled notes instead of 'eventData.last_modified'
          this.setState({
            lastModified: Date.now()
          });
          this.getLastSyncedTime();
          // TODO Implement optimistic UI
          // document.getElementById('loading').style.display = 'none';
          break;
        case 'text-change':
          this.setState({
            ignoreNextLoadEvent: true
          });
          browser.runtime.sendMessage({
            action: 'kinto-load'
          });
          break;
        case 'text-syncing':
          this.setAnimation(true); // animateSyncIcon, syncingLayout, warning
          this.setState({
            savingIndicatorText: browser.i18n.getMessage('syncProgress'),
            syncingInProcess: true
          });
          // Disable sync-action
          break;
        case 'text-editing':
          if (this.state.isAuthenticated) {
            this.setAnimation(true); // animateSyncIcon, syncingLayout, warning
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
            ignoreTextSynced: false,
            syncingInProcess: false
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
            editingInProcess: false
          });
          break;
        case 'reconnect':
          clearTimeout(this.loginTimeout);

          this.setState({
            waitingToReconnect: true,
            isAuthenticated: false,
            savingIndicatorText: browser.i18n.getMessage('reconnectSync'),
            syncingInProcess: false
          });

          this.setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning

          chrome.runtime.sendMessage({
            action: 'metrics-reconnect-sync'
          });
          // Enable sync-action
          break;
        case 'disconnected':
          // disconnectSync.style.display = 'none';
          // footerButtons.title = null; // remove profile email from title attribute
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
          savingIndicatorText: browser.i18n.getMessage(
            'syncComplete2',
            formatFooterTime(this.state.lastModified)
          ),
          isAuthenticated: true
        });
        this.setAnimation(false, true);
        // disconnectSync.style.display = 'block';
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
        isAuthenticated: false
      });
      // disconnectSync.style.display = 'none';
      this.setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
      setTimeout(() => {
        this.setState({
          savingIndicatorText: browser.i18n.getMessage('disconnected')
        });
      }, 200);
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

      if (
        this.state.isAuthenticated && this.state.syncingLayout
      ) {
        // Trigger manual sync
        this.setAnimation(true);
        browser.runtime.sendMessage({
          action: 'kinto-sync'
        });
      } else if (
        !this.state.isAuthenticated && (!this.state.syncingLayout ||
          this.state.waitingToReconnect)
      ) {
        // Login
        this.setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning

        // enable disable sync button
        // disconnectSync.style.display = 'block';

        const that = this;
        setTimeout(() => {
          that.setState({
            savingIndicatorText: browser.i18n.getMessage('openingLogin')
          });
        }, 200); // Delay text for smooth animation

        this.loginTimeout = setTimeout(() => {
          this.setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning
          that.setState({
            savingIndicatorText: browser.i18n.getMessage('pleaseLogin'),
            waitingToReconnect: true
          });
        }, 5000);

        // Problem not having editor in Footer Component
        browser.runtime.sendMessage({
          action: 'authenticate',
          context: null // getPadStats(editor)
        });
      }

      this.setState({
        waitingToReconnect: false
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
    // Those classes define animation state on #footer-buttons
    const footerClass = classNames({
       savingLayout: !this.state.syncingLayout,
       syncingLayout: this.state.syncingLayout,
       warning: this.state.warning,
       animateSyncIcon: this.state.animateSyncIcon
    });

    return (
      <footer>
        <div id="footer-buttons"
          ref={footerButtons => this.footerButtons = footerButtons}
          className={footerClass}>
          <div>
            <button
              id="saving-indicator"
              style={{
                background: 'none',
                paddingBottom: '12px',
                color: 'inherit'
              }}
              onClick={() => this.enableSyncAction()}
            >
              {this.state.savingIndicatorText}
            </button>
            <button
              id="enable-sync"
              onClick={() => this.enableSyncAction()}
              className="notsyncing"
            >
              <SyncIcon />
            </button>
          </div>
          <a
            id="give-feedback-button"
            title={browser.i18n.getMessage('feedback')}
            href={SURVEY_PATH}
          >
            <FeedbackIcon />
          </a>
          <div className="wrapper">
            <button id="context-menu-button" className="mdl-js-button" />
            <ul
              className="mdl-menu mdl-menu--top-right mdl-js-menu context-menu"
              data-mdl-for="context-menu-button"
            >
              <li>
                <button
                  id="disconnect-from-sync"
                  className="mdl-menu__item context-menu-item"
                  style={{ width: '100%' }}
                  onClick={() => this.disconnectFromSync()}
                >
                  {browser.i18n.getMessage('disableSync')}
                </button>
              </li>
              <li>
                <a
                  id="give-feedback"
                  className="mdl-menu__item context-menu-item"
                  title={browser.i18n.getMessage('feedback')}
                  href={SURVEY_PATH}
                >
                  {browser.i18n.getMessage('feedback')}
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
