import { SYNC_AUTHENTICATED,
         KINTO_LOADED,
         TEXT_SAVED,
         TEXT_SYNCED,
         CREATE_NOTE,
         DELETE_NOTE,
         RECONNECT_SYNC,
         DISCONNECTED,
         ERROR } from './utils/constants';
         // Actions
import { authenticate,
         disconnect,
         createdNote,
         deletedNote,
         saved,
         synced,
         reconnectSync,
         kintoLoad,
         updatedNote,
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
          store.dispatch(kintoLoad());
        } else {
          store.dispatch(kintoLoad(eventData.notes));
        }
        break;
      case CREATE_NOTE:
        store.dispatch(createdNote(eventData.id, eventData.content, eventData.lastModified));
        store.dispatch(synced()); // stop syncing animation
        break;
      case DELETE_NOTE:
        store.dispatch(deletedNote(eventData.id));
        store.dispatch(synced()); // stop syncing animation
        break;
      case TEXT_SAVED:
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
          if (eventData.from !== windowInfo.id) {
            store.dispatch(saved(
              eventData.note.id,
              eventData.note.content,
              eventData.note.lastModified
            ));
          }
        });
        break;
      case TEXT_SYNCED:
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
          if (eventData.from !== windowInfo.id && !eventData.conflict) {
            // sync.isSyncing being true means this instance triggered syncing
            // so content should be up to date.
            if (eventData.note) {
              store.dispatch(updatedNote(
                eventData.note.id,
                eventData.note.content,
                eventData.note.lastModified
              ));
              store.dispatch(synced());
            }
          }
        });
        store.dispatch(synced());
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
    }
});

