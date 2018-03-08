import React from 'react';

import ArrowLeftIcon from './icons/ArrowLeftIcon';
import MoreIcon from './icons/MoreIcon';

import { getFirstNonEmptyElement, formatFilename } from '../utils/utils';

import { SURVEY_PATH } from '../utils/constants';
import INITIAL_CONTENT from '../data/initialContent';

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };

    browser.runtime.getBrowserInfo().then((info) => {
      this.surveyPath = `${SURVEY_PATH}&ver=${browser.runtime.getManifest().version}&release=${info.version}`;
    });

    // Event used on window.addEventListener
    this.onCloseListener = (event) => {
      this.indexFocusedButton = null;
      this.menu.classList.replace('open', 'close');
    };

    // Open and close menu
    this.toggleMenu = (e) => {
      if (this.menu.classList.contains('close')) {
        this.menu.classList.replace('close', 'open');
        setTimeout(() => {
          window.addEventListener('click', this.onCloseListener, { once: true });
        }, 10);
        this.indexFocusedButton = null; // index of focused button in this.buttons
        e.target.focus(); // Give focus on menu button to enable keyboard navigation
      } else {
        window.removeEventListener('click', this.onCloseListener);
        this.menu.classList.replace('open', 'close');
      }
    };

    this.events = eventData => {
      // let content;
      switch (eventData.action) {
        case 'kinto-loaded':
          this.setState({
            lastModified: Date.now(),
            content: eventData.data || INITIAL_CONTENT
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
    };

    this.giveFeedbackCallback = (e) => {
      e.preventDefault();
      browser.tabs.create({
        url: this.surveyPath
      });
    };
  }

  componentDidMount() {
    chrome.runtime.onMessage.addListener(this.events);
  }

  componentWillUnmount() {
    chrome.runtime.onMessage.removeListener(this.events);
  }

  render() {

    // List of menu used for keyboard navigation
    this.buttons = [];

    return (
      <header ref={headerbuttons => this.headerbuttons = headerbuttons}>

        <div className="btnWrapper">
          <a
            href="/"
            id="enable-sync"
            onClick={(e) => this.enableSyncAction(e)}
            className="btn iconBtn">
            <ArrowLeftIcon />
          </a>
          <p>Notes</p>
        </div>

        <div className="photon-menu close bottom left" ref={menu => this.menu = menu }>
          <button
            id="context-menu-button"
            className="iconBtn"
            onClick={(e) => this.toggleMenu(e)}
            onKeyDown={this.handleKeyPress}>
            <MoreIcon />
          </button>
          <div className="wrapper">
            <ul role="menu" >
              <li>
                <button
                  role="menuitem"
                  onKeyDown={ this.handleKeyPress }
                  ref={ btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('exportAsHTML') }
                  onClick={ this.exportAsHTML }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
                  onKeyDown={ this.handleKeyPress }
                  ref={btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('feedback') }
                  onClick={ this.giveFeedbackCallback }>
                  { browser.i18n.getMessage('feedback') }
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>
    );
  }
}


export default Header;
