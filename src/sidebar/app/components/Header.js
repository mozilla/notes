import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import ArrowLeftIcon from './icons/ArrowLeftIcon';
import MoreIcon from './icons/MoreIcon';

import { SURVEY_PATH } from '../utils/constants';

import { exportHTML, deleteNote } from '../actions';

class Header extends React.Component {
  constructor(props) {
    super(props);

    this.props = props;

    browser.runtime.getBrowserInfo().then((info) => {
      this.surveyPath = `${SURVEY_PATH}&ver=${browser.runtime.getManifest().version}&release=${info.version}`;
    });

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

    this.exportAsHTML = () => props.dispatch(exportHTML(this.props.note.content));

    this.giveFeedbackCallback = (e) => {
      e.preventDefault();
      browser.tabs.create({
        url: this.surveyPath
      });
    };

    this.onDelete = () => {
      props.dispatch(deleteNote(this.props.note.id));
      this.props.history.push('/');
    };
  }

  render() {

    // List of menu used for keyboard navigation
    this.buttons = [];

    return (
      <header ref={headerbuttons => this.headerbuttons = headerbuttons}>

        <div className="btnWrapper">
          <Link
            to="/"
            className="btn iconBtn">
            <ArrowLeftIcon />
          </Link>
          <p>{ this.props.note.firstLine || browser.i18n.getMessage('newNote') }</p>
        </div>

        <div className="photon-menu close bottom left" ref={menu => this.menu = menu }>
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
                  title={ browser.i18n.getMessage('newNote') }
                  onClick={ () => this.props.onNewNoteEvent() }>
                  { browser.i18n.getMessage('newNote') }
                </button>
              </li>
              <hr/>
              <li>
                <button
                  role="menuitem"
                  disabled
                  title={ browser.i18n.getMessage('makePlainText') }
                  onClick={ () => console.log('not available yet') }>
                  { browser.i18n.getMessage('makePlainText') }
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
                  ref={ btn => btn ? this.buttons.push(btn) : null }
                  title={ browser.i18n.getMessage('exportAsHTML') }
                  onClick={ this.exportAsHTML }>
                  { browser.i18n.getMessage('exportAsHTML') }
                </button>
              </li>
              <li>
                <button
                  role="menuitem"
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
    note: PropTypes.object.isRequired,
    onNewNoteEvent: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired
};

export default connect(mapStateToProps)(Header);
