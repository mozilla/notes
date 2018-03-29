import { SYNC_AUTHENTICATED,
         KINTO_LOADED,
         UPDATE_NOTE,
         TEXT_SYNCED,
         RECONNECT_SYNC,
         DISCONNECTED,
         ERROR,
         SEND_TO_NOTES } from './utils/constants';
         // Actions
import { authenticate,
         disconnect,
         createNote,
         synced,
         reconnectSync,
         sendToNote,
         kintoLoad,
         error } from './actions';
import store from './store';
/**
 * For each event, action on redux to update UI. No longer any event from chrome in components
 * Share state between instances ... update-redux?
 * No idea if this is a good idea or not.
 */

chrome.runtime.onMessage.addListener(eventData => {
    switch (eventData.action) {
      //
      // FOOTER EVENTS
      //
      case SYNC_AUTHENTICATED:
        if (eventData.profile && eventData.profile.email) {
            store.dispatch(authenticate(eventData.profile.email));
        }
        break;
      case KINTO_LOADED:
        if (!eventData.notes) {
          // As seen in units, kinto_laoded should return empty list if no entries
          console.error('eventData.notes is empty');
          store.dispatch(kintoLoad());
        } else {
          store.dispatch(kintoLoad(eventData.notes));
        }
        break;
      case UPDATE_NOTE:
        browser.runtime.sendMessage({
          action: 'kinto-load'
        });
        break;
      case TEXT_SYNCED:
        // sync.isSyncing being true means this instance triggered syncing
        // so content should be up to date.
        if (!store.getState().sync.isSyncing) {
          store.dispatch(synced(eventData.notes));
        } else {
          store.dispatch(synced());
        }
        break;
      case RECONNECT_SYNC:
        store.dispatch(reconnectSync());
        break;
      case ERROR:
        store.dispatch(error(eventData.message));
        break;
      case DISCONNECTED:
        if (store.getState().sync.email) {
          store.dispatch(disconnect());
        }
        break;
      case SEND_TO_NOTES: {
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
          if (windowInfo.id === eventData.windowId) {
            const focusedNoteId = store.getState().sync.focusedNoteId;
            if (focusedNoteId) {
              store.dispatch(sendToNote(focusedNoteId, eventData.text));
            } else {
              store.dispatch(createNote(`<p>${ eventData.text }</p>`));
            }
            browser.runtime.sendMessage({
              action: 'kinto-sync'
            });
          }
        });
        break;
      }
    }
});

