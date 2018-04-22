// Servers
export const KINTO_SERVER_URL = 'https://testpilot.settings.services.mozilla.com/v1';
export const FXA_PROFILE_SERVER = 'https://profile.accounts.firefox.com/v1';
export const FXA_OAUTH_SERVER = 'https://oauth.accounts.firefox.com/v1';
export const FXA_OAUTH_CLIENT_ID = '7f368c6886429f19';
export const FXA_OAUTH_REDIRECT = 'https://mozilla.github.io/notes/fxa/android-redirect.html';
export const FXA_OAUTH_SCOPES = ['profile', 'https://identity.mozilla.com/apps/notes'];
export const FXA_OAUTH_ACCESS_TYPE = 'offline';

// Colors
export const COLOR_NOTES_BLUE = '#4173CE';
export const COLOR_NOTES_WHITE = '#F9F9FA';
export const COLOR_DARK_BACKGROUND = '#38383D';
export const COLOR_DARK_TEXT = '#FFFFFF';
export const COLOR_DARK_SUBTEXT = '#bbbbbf';
export const COLOR_DARK_WARNING = '#ef6b6b';
export const COLOR_DARK_SYNC = '#3FD4B4';
export const COLOR_STATUS_BAR = '#F9F9FA';
export const COLOR_APP_BAR = '#FFFFFF';

// Actions
// FOR LEGACY, THOSE STRING MATCH THE ONE USED IN BACKGROUND.js
export const SYNC_AUTHENTICATED = 'sync-authenticated';
export const KINTO_LOADED = 'kinto-loaded';
export const TEXT_SAVED = 'text-saved';
export const TEXT_SYNCING = 'text-syncing';
export const TEXT_SYNCED = 'text-synced';
export const OPENING_LOGIN = 'opening-login';
export const PLEASE_LOGIN = 'please-login';
export const RECONNECT_SYNC = 'reconnect';
export const DISCONNECTED = 'disconnected';
export const SEND_TO_NOTES = 'send-to-notes';
export const EXPORT_HTML = 'export-html';

// CRUD actions on note
export const CREATE_NOTE = 'create-note';
export const UPDATE_NOTE = 'update-note';
export const DELETE_NOTE = 'delete-note';

export const FOCUS_NOTE = 'focus-note';
export const ERROR = 'error';
export const REQUEST_WELCOME_PAGE = 'request-welcome-page';

export const FROM_IN_NOTE = 'in-note';
export const FROM_LIST_VIEW = 'list-view';
export const FROM_BLANK_NOTE = 'blank-note';
export const FROM_SEND_TO_NOTE = 'send-to-note';


