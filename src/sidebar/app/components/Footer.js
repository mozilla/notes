import React from 'react';

const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

/**
 * Formats time for the Notes footer
 * @param time
 * @returns {string}
 */
function formatFooterTime(date) {
  date = date || Date.now();
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Set animation on footerButtons toolbar
 *
 *
 * @param {Boolean} animateSyncIcon Start looping animation on sync icon
 * @param {Boolean} syncingLayout   if true, animate to syncingLayout (sync icon on right)
 *                                  if false, animate to savingLayout (sync icon on left)
 * @param {Boolean} warning         Apply yellow warning styling on toolbar
 */
function setAnimation(animateSyncIcon = true, syncingLayout, warning) {
  // animateSyncIcon, syncingLayout, warning
  const footerButtons = document.getElementById('footer-buttons');
  const enableSync = document.getElementById('enable-sync');
  const savingIndicator = document.getElementById('saving-indicator');

  if (
    animateSyncIcon === true &&
    !footerButtons.classList.contains('animateSyncIcon')
  ) {
    footerButtons.classList.add('animateSyncIcon');
  } else if (
    animateSyncIcon === false &&
    footerButtons.classList.contains('animateSyncIcon')
  ) {
    footerButtons.classList.remove('animateSyncIcon');
  }

  if (
    syncingLayout === true &&
    footerButtons.classList.contains('savingLayout')
  ) {
    footerButtons.classList.replace('savingLayout', 'syncingLayout');
    enableSync.style.backgroundColor = 'transparent';
    // Start blink animation on saving-indicator
    savingIndicator.classList.add('blink');
    // Reset CSS animation by removing class
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
  } else if (
    syncingLayout === false &&
    footerButtons.classList.contains('syncingLayout')
  ) {
    // Animate savingIndicator text
    savingIndicator.classList.add('blink');
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
    setTimeout(() => {
      enableSync.style.backgroundColor = null;
    }, 400);
    //
    footerButtons.classList.replace('syncingLayout', 'savingLayout');
  }

  if (warning === true && !footerButtons.classList.contains('warning')) {
    footerButtons.classList.add('warning');
  } else if (warning === false && footerButtons.classList.contains('warning')) {
    footerButtons.classList.remove('warning');
  }
}

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      savingIndicatorText: '',
      waitingToReconnect: false,
      isAuthenticated: false,
      lastModified: Date.now()
    };
    this.loginTimeout = null;

    this.events = eventData => {
      const footerButtons = document.getElementById('footer-buttons');
      // let content;
      switch (eventData.action) {
        case 'sync-authenticated':
          setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning
          clearTimeout(this.loginTimeout);

          this.setState({
            isAuthenticated: true,
            waitingToReconnect: false,
            savingIndicatorText: browser.i18n.getMessage('syncProgress')
          });

          // set title attr of footer to the currently logged in account
          footerButtons.title = eventData.profile && eventData.profile.email;

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
          setAnimation(true); // animateSyncIcon, syncingLayout, warning
          this.setState({
            savingIndicatorText: browser.i18n.getMessage('syncProgress'),
            syncingInProcess: true
          });
          // Disable sync-action
          break;
        case 'text-editing':
          if (this.state.isAuthenticated) {
            setAnimation(true); // animateSyncIcon, syncingLayout, warning
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

          setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning

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
        setAnimation(false, true);
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
      setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
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

      const footerButtons = document.getElementById('footer-buttons');

      if (
        this.state.isAuthenticated &&
        footerButtons.classList.contains('syncingLayout')
      ) {
        // Trigger manual sync
        setAnimation(true);
        browser.runtime.sendMessage({
          action: 'kinto-sync'
        });
      } else if (
        !this.state.isAuthenticated &&
        (footerButtons.classList.contains('savingLayout') ||
          this.state.waitingToReconnect)
      ) {
        // Login
        setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning

        // enable disable sync button
        // disconnectSync.style.display = 'block';

        const that = this;
        setTimeout(() => {
          that.setState({
            savingIndicatorText: browser.i18n.getMessage('openingLogin')
          });
        }, 200); // Delay text for smooth animation

        this.loginTimeout = setTimeout(() => {
          setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning
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
    return (
      <footer>
        <div id="sync-note">
          <img
            src="static/svg/close.svg"
            alt="Close button"
            id="close-button"
          />
          <p id="sync-note-dialog" />
        </div>

        <div id="footer-buttons" className="savingLayout">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 16 16"
              >
                <path
                  fill="context-fill"
                  d="M14 1a1 1 0 0 0-1 1v1.146A6.948 6.948 0 0 0 1.227 6.307a1 1 0 1 0 1.94.484A4.983 4.983 0 0 1 8 3a4.919 4.919 0 0 1 3.967 2H10a1 1 0 0 0 0 2h4a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm.046 7.481a1 1 0 0 0-1.213.728A4.983 4.983 0 0 1 8 13a4.919 4.919 0 0 1-3.967-2H6a1 1 0 0 0 0-2H2a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-1.146a6.948 6.948 0 0 0 11.773-3.161 1 1 0 0 0-.727-1.212z"
                />
              </svg>
            </button>
          </div>
          <a
            id="give-feedback-button"
            title={browser.i18n.getMessage('feedback')}
            href={SURVEY_PATH}
          >
            <svg
              id="Layer_1"
              width="20"
              height="20"
              data-name="Layer 1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
            >
              <defs>
                <style>
                  .cls-1{'{'}fill:none;stroke:#333;stroke-miterlimit:10{'}'}{' '}
                  .cls-2{'{'}fill:#333{'}'}
                </style>
              </defs>
              <path
                className="cls-1"
                d="M14.32 10.58A5.27 5.27 0 0 0 15 8c0-3.31-3.13-6-7-6S1 4.69 1 8s3.13 6 7 6a7.72 7.72 0 0 0 4.37-1.32L15 14z"
              />
              <circle className="cls-2" cx="8" cy="8" r="1" />
              <circle className="cls-2" cx="4" cy="8" r="1" />
              <circle className="cls-2" cx="12" cy="8" r="1" />
            </svg>
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
