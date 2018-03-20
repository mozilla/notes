import { SYNC_AUTHENTICATED,
         KINTO_LOADED,
         TEXT_CHANGE,
         TEXT_SYNCING,
         TEXT_EDITING,
         TEXT_SYNCED,
         TEXT_SAVED,
         RECONNECT_SYNC,
         DISCONNECTED,
         SEND_TO_NOTES,
         PROPAGATE_REDUX } from './utils/constants';
         // Actions
import { authenticate,
         disconnect,
         saved,
         createNote,
         synced,
         reconnectSync,
         sendToNote,
         popagateRedux,
         kintoLoad } from './actions';
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
        } else {
          store.dispatch(kintoLoad(eventData.notes));
        }
        break;
      case TEXT_CHANGE:
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
      case TEXT_SAVED:
        store.dispatch(saved());
        break;
      case RECONNECT_SYNC:
        store.dispatch(reconnectSync());
        break;
      case DISCONNECTED:
        if (store.getState().sync.email) {
          store.dispatch(disconnect());
        }
        break;
      case SEND_TO_NOTES: {
          const focusedNoteId = store.getState().sync.focusedNoteId;
          if (focusedNoteId) {
            store.dispatch(sendToNote(focusedNoteId, eventData.text));
          } else {
            store.dispatch(createNote(`<p>${ eventData.text }</p>`));
          }
        }
        break;
      case PROPAGATE_REDUX:
        store.dispatch(popagateRedux(eventData.state, eventData.id));
        break;
    }
});
