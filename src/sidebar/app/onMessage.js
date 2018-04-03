import { SYNC_AUTHENTICATED,
         KINTO_LOADED,
         TEXT_SAVED,
         TEXT_SYNCED,
         CREATE_NOTE,
         DELETE_NOTE,
         RECONNECT_SYNC,
         DISCONNECTED,
         ERROR,
         SEND_TO_NOTES } from './utils/constants';
         // Actions
import { authenticate,
         disconnect,
         createNote,
         createdNote,
         updatedNote,
         deletedNote,
         saved,
         synced,
         reconnectSync,
         kintoLoad,
         updateNote,
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
      case SEND_TO_NOTES: {
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
          if (windowInfo.id === eventData.windowId) {
            const focusedNoteId = store.getState().sync.focusedNoteId;
            // If a note is focused/open, we add content at the end.
            if (focusedNoteId) {
              const note = store.getState().notes.find((note) => {
                return note.id === focusedNoteId;
              });
              if (note) {
                if (note.content === '<p>&nbsp;</p>') note.content = '';
                note.content = note.content + `<p>${eventData.text}</p>`;
                store.dispatch(updateNote(note.id, note.content));
              } else {
                console.error('FocusedNote not in redux state.'); // eslint-disable-line no-console
              }
            } else {
              store.dispatch(createNote(`<p>${ eventData.text }</p>`)).then(() => {
                store.dispatch(synced());
              });
            }
          }
        });
        break;
      }
    }
});

