import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import ArrowLeftIcon from './icons/ArrowLeftIcon';
import MoreIcon from './icons/MoreIcon';

import { SURVEY_PATH } from '../utils/constants';

import { exportHTML, otherExport, deleteNote } from '../actions';

// FIXME: need to get from props, and from background somehow
const EXPORTS = [{
  name: "email-tabs",
  title: "Export via Gmail",
  extensionId: "email-tabs@mozilla.org",
}];

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;

    // Event used on window.addEventListener
    this.onCloseListener = () => {
      if (this.menu) {
        this.menu.classList.replace('open', 'close');
      }
      window.removeEventListener('keydown', this.handleKeyPress);
    };

    // Open and close menu
    this.toggleMenu = (e) => {
      if (this.menu && this.menu.classList.contains('close')) {
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
          if (this.menu && this.menu.classList.contains('open')) {
            this.toggleMenu(event);
          }
          break;
      }
    };

    this.exportAsHTML = () => props.dispatch(exportHTML(this.props.note.content));

    this.otherExport = (exportOption) => props.dispatch(otherExport(exportOption, this.props.note.content))

    this.giveFeedbackCallback = (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({
        action: 'metrics-give-feedback'
      });
      browser.runtime.getBrowserInfo().then((info) => {
        browser.tabs.create({
          url: `${SURVEY_PATH}&ver=${browser.runtime.getManifest().version}&release=${info.version}`
        });
      });
    };

    this.onDelete = () => {
      props.dispatch(deleteNote(this.props.note.id, 'in-note'));
      this.props.history.push('/');
    };
  }

  render() {

    // List of menu used for keyboard navigation
    this.buttons = [];
    const hasContent = !!this.props.note.content && this.props.note.content.length > 0;

    let otherExports = [];
    for (let exportOption of EXPORTS) {
      otherExports.push(
        <li key={exportOption.name}>
          <button
            role="menuitem"
            disabled={!hasContent}
            ref={ btn => btn ? this.buttons.push(btn) : null }
            title={ exportOption.title }
            onClick={ this.otherExport.bind(this, exportOption) }>
            { exportOption.title }
          </button>
        </li>
      );
    }

    return (
      <header ref={headerbuttons => this.headerbuttons = headerbuttons}>
        <button
          onClick={() => this.props.history.push('/')}
          title={ browser.i18n.getMessage('backToAllNotes') }
          className="btn iconBtn">
          <ArrowLeftIcon />
        </button>
        { this.props.note ?
        <p>{ this.props.note.firstLine || browser.i18n.getMessage('newNote') }</p> :
        '' }
        <div className="photon-menu close bottom left" ref={menu => this.menu = menu }>
          <button
            className="iconBtn"
            onClick={(e) => this.toggleMenu(e)}>
            <MoreIcon />
          </button>
          <div className="wrapper">
            <ul role="menu" >
              <li>
                <button
                  role="menuitem"
                  ref={btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('newNote') }
                  onClick={ () => this.props.onNewNoteEvent() }>
                  { browser.i18n.getMessage('newNote') }
                </button>
              </li>
              <hr/>
              <li>
                <button
                  role="menuitem"
                  disabled={!hasContent}
                  ref={ btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('exportAsHTML') }
                  onClick={ this.exportAsHTML }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
              </li>
              { otherExports }
              <li>
                <button
                  role="menuitem"
                  ref={btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('deleteNote') }
                  onClick={ this.onDelete }>
                  { browser.i18n.getMessage('deleteNote') }
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
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

function mapStateToProps(state) {
  return {
    state
  };
}

Header.propTypes = {
    state: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    note: PropTypes.object,
    onNewNoteEvent: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(Header);
