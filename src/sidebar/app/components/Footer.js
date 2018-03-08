import React from 'react';
import classNames from 'classnames';

import SyncIcon from './SyncIcon';

import { formatFooterTime, getFirstNonEmptyElement, formatFilename } from '../utils/utils';
import { SURVEY_PATH } from '../utils/constants';
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
        tooltip: () => this.state.email ? browser.i18n.getMessage('syncToMail', this.state.email) : ''
      },
      SYNCED: {
        isClickable: true,
        rightText: () => browser.i18n.getMessage('syncComplete3', formatFooterTime(this.state.lastModified)),
        tooltip: () => this.state.email ? browser.i18n.getMessage('syncToMail', this.state.email) : ''
      },
      DISCONNECTED: {
        savingLayout: true,
        rightText: () => browser.i18n.getMessage('disconnected')
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
            state: this.STATES.SYNCING
          });
          // Disable sync-action
          break;
        case 'text-editing':
          this.setState({
            state: this.state.isAuthenticated ? this.STATES.SYNCING : this.STATES.SAVING
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
              state: this.STATES.SAVED
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
          state: this.state.isAuthenticated ? this.STATES.SYNCED : this.STATES.SAVED
        });
      }
    };

    this.exportAsHTML = () => {
      // get Notes content
      const notesContent = this.state.content;
      // assign contents to container element for later parsing
      const parentElement = document.createElement('div');
      parentElement.innerHTML = notesContent; // eslint-disable-line no-unsanitized/property

      let exportFileName = 'blank.html';
      // get the first child element with text
      const nonEmptyChildElement = getFirstNonEmptyElement(parentElement);

      // if non-empty child element exists, set the filename to the element's `textContent`
      if (nonEmptyChildElement) {
        exportFileName = formatFilename(nonEmptyChildElement.textContent);
      }

      const exportFileType = 'text/html';
      const data = new Blob([`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Notes</title></head><body>${notesContent}</body></html>`], {'type': exportFileType});
      const exportFilePath = window.URL.createObjectURL(data);
      browser.downloads.download({
        url: exportFilePath,
        filename: exportFileName,
        saveAs: true // always open file chooser, fixes #733
      });

      chrome.runtime.sendMessage({
        action: 'metrics-export-html'
      });
    };

    this.disconnectFromSync = () => {
      this.setState({
        state: this.STATES.DISCONNECTED
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
            state: this.STATES.PLEASELOGIN
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
        url: this.surveyPath
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
      this.rightText = this.state.state.rightText();
    } else if (this.state.state.leftText) {
      this.leftText = this.state.state.leftText();
    }
    this.tooltip = this.state.state.tooltip ? this.state.state.tooltip() : '';

    return (
      <footer>
        <div id="footer-buttons"
          ref={footerbuttons => this.footerbuttons = footerbuttons}
          className={footerClass}>
          <div className={this.state.state.isClickable ? 'isClickable' : ''}>
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
                   onClick={ this.exportAsHTML }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
        </li> {
          !this.state.state.savingLayout && !this.state.state.ignoreChange ?
              <li>
                <button className="mdl-menu__item context-menu-item"
                  title={browser.i18n.getMessage('disableSync')}
                  style={{ width: '100%' }}
                  onClick={ this.disconnectFromSync }
                >
                  {browser.i18n.getMessage('disableSync')}
                </button>
            </li> : null
        }<li>
              <button className="mdl-menu__item context-menu-item"
                 title={browser.i18n.getMessage('feedback')}
                 style={{ width: '100%' }}
                 onClick={ this.giveFeedbackCallback }>
                  { browser.i18n.getMessage('feedback') }
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    );
  }
}

export default Footer;
