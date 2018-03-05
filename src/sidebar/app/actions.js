/*
 * action types
 */

import { MAXIMUM_PAD_SIZE } from './utils/constants';

// FOR LEGACY PURPOSE, THOSE STRING MATCH THE ONE USED IN BACKGROUND.js
export const SYNC_AUTHENTICATED = 'sync-authenticated';
export const KINTO_LOADED = 'kinto-loaded';
export const TEXT_CHANGE = 'text-change';
export const TEXT_SYNCING = 'text-syncing';
export const TEXT_EDITING = 'text-editing';
export const TEXT_SYNCED = 'text-synced';
export const TEXT_SAVED = 'text-saved';
export const RECONNECT = 'reconnect';
export const DISCONNECTED = 'disconnected';
export const SEND_TO_NOTES = 'send-to-notes';
// END OF LEGACY NAMING

export const OPENING_LOGIN = 'opening-login';
export const PLEASE_LOGIN = 'please-login';

export const UPDATE_REDUX = 'update-redux';

/*
 * action creators
 */
export function textChange(content) {

  chrome.runtime.sendMessage({
    action: 'kinto-save',
    content
  });
  if (content.length > MAXIMUM_PAD_SIZE) {
    console.error( // eslint-disable-line no-console
      'Maximum notepad size reached:', content.length
    );
    browser.runtime.sendMessage({
      action: 'metrics-limit-reached'
    });
  }
  return { type: TEXT_CHANGE, content };
}

export function authenticate(email) {
  browser.runtime.sendMessage({
    action: 'kinto-sync'
  });
  return { type: SYNC_AUTHENTICATED, email };
}

export function syncing() {
  return { type: TEXT_SYNCING };
}

export function saving() {
  return { type: TEXT_EDITING };
}

export function synced(last_modified) {
  return { type: TEXT_SYNCED, last_modified };
}

export function saved() {
  return { type: TEXT_SAVED };
}

export function reconnect() {
  chrome.runtime.sendMessage({
    action: 'metrics-reconnect-sync'
  });
  return { type: RECONNECT };
}

export function loaded(content) {
  return { type: KINTO_LOADED, content };
}

export function sendToNote(content) {
  browser.runtime.sendMessage({
    action: 'metrics-context-menu'
  });
  return { type: SEND_TO_NOTES, content };
}

export function disconnect() {
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'disconnected'
  });
  return { type: DISCONNECTED };
}
