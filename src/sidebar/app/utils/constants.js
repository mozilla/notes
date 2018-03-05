// Display notification when note.length > MAXIMUM_PAD_SIZE
export const MAXIMUM_PAD_SIZE = 15000;
// Url to open in firefox to give feedback
export const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

// Actions
// FOR LEGACY, THOSE STRING MATCH THE ONE USED IN BACKGROUND.js
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
export const EXPORT_HTML = 'export-html';
export const OPENING_LOGIN = 'opening-login';
export const PLEASE_LOGIN = 'please-login';

// Internal action to sync redux state between all instances
export const PROPAGATE_REDUX = 'propagate-redux';
