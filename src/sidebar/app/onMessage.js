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
         CREATE_NOTE,
         PROPAGATE_REDUX } from './utils/constants';
         // Actions
import { authenticate,
         disconnect,
         saved,
         createNote,
         synced,
         syncing,
         saving,
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
          console.error('Loading SHOULD always return notes');
          // browser.storage.local.get('notes2').then(data => {
          //   if (!data.hasOwnProperty('notes2')) {
          //     store.dispatch(textChange(INITIAL_CONTENT));
          //   } else {
          //     store.dispatch(textChange(data.notes2));
          //     chrome.runtime
          //       .sendMessage({
          //         action: 'kinto-save',
          //         content: data.notes2
          //       })
          //       .then(() => {
          //         // Clean-up
          //         browser.storage.local.remove('notes2');
          //       });
          //   }
          // });
        } else {
          store.dispatch(kintoLoad(eventData.notes));
        }
        break;
      case TEXT_CHANGE:
        browser.runtime.sendMessage({
          action: 'kinto-load'
        });
        break;
      case TEXT_SYNCING:
        store.dispatch(syncing());
        break;
      case TEXT_EDITING:
        store.dispatch(saving());
        break;
      case TEXT_SYNCED:
        if (store.getState().sync.email) {
          store.dispatch(synced(eventData.last_modified));
        }
        break;
      case TEXT_SAVED:
        store.dispatch(saved());
        break;
      case CREATE_NOTE:
        store.dispatch(createNote(eventData.id));
        break;
      case RECONNECT_SYNC:
        store.dispatch(reconnectSync());
        break;
      case DISCONNECTED:
        if (store.getState().sync.email) {
          store.dispatch(disconnect());
        }
        break;
      case SEND_TO_NOTES:
        store.dispatch(sendToNote(eventData.text));
        break;
      case PROPAGATE_REDUX:
        store.dispatch(popagateRedux(eventData.state, eventData.id));
        break;
    }
});
