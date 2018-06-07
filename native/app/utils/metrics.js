import { GoogleAnalyticsTracker } from "react-native-google-analytics-bridge";
import { store } from '../store';

// See https://github.com/mozilla/notes/blob/master/docs/metrics.md for details
const tracker = new GoogleAnalyticsTracker('UA-35433268-79');
const EVENT_CATEGORY = 'notes';

export const trackEvent = (action, optionalValues = {}) => {

	const state = store.getState();

  if (action === 'changed') {
    optionalValues.cd1 = state.profile.email !== null;
  }

	if (action === 'close') {
		// See about appState : https://facebook.github.io/react-native/docs/appstate.html
		if (optionalValues.state === 'inactive') {
			optionalValues.cd7 = 'appInactive';
		} else if (optionalValues.state === 'background') {
			optionalValues.cd7 = 'appBackground';
		}
	}

	optionalValues.cd9 = optionalValues.cd9 || 'true'; // if panel is loaded
	// Generate cd10 based on footer.js rules. Same in webext.
  if (state.sync && ['open', 'close', 'changed', 'drag-n-drop', 'new-note', 'export',
      'delete-note', 'give-feedback', 'limit-reached'].includes(action)) {
    if (state.sync.email) { // If user is authenticated
      if (state.sync.error) {
        optionalValues.cd10 = 'error';
      } else if (state.sync.isSyncing) {
        optionalValues.cd10 = 'isSyncing';
      } else {
        optionalValues.cd10 = 'synced';
      }
    } else {
      if (state.sync.isOpeningLogin) { // eslint-disable-line no-lonely-if
        optionalValues.cd10 = 'openLogin';
      } else if (state.sync.isPleaseLogin) {
        optionalValues.cd10 = 'verifyAccount';
      } else if (state.sync.isReconnectSync) {
        optionalValues.cd10 = 'reconnectSync';
      } else {
        optionalValues.cd10 = 'signIn';
      }
    }
  }

	optionalValues.cd11 = state.notes.length;
	tracker.trackEvent(EVENT_CATEGORY, action, optionalValues);
};
