import { GoogleAnalyticsTracker } from "react-native-google-analytics-bridge";

// See https://github.com/mozilla/notes/blob/master/docs/metrics.md for details
const tracker = new GoogleAnalyticsTracker('UA-101177676-1');
const EVENT_CATEGORY = 'notes';

export const trackEvent = (action) => {
  tracker.trackEvent(EVENT_CATEGORY, action);
};
