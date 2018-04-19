// Send message
async function sendMessage(...args) {
  if (args.length >= 2 && args[0] instanceof String && args[0] === 'notes@mozilla.com') {
    browser.runtime.onMessage.dispatch(args[1]);
  } else {
    browser.runtime.onMessage.dispatch(args[0]);
  }
}

const browser = {
  i18n: {
    getMessage: () => {
      return '';
    }
  },
  runtime: {
    sendMessage,
    onMessage: {
      _listeners: [],
      addListener: (listener) => {
        browser.runtime.onMessage._listeners.push(listener);
      },
      removeListener: (listener) => {
        // Never tested
        browser.runtime.onMessage._listeners = browser.runtime.onMessage._listeners.filter(
          (item) => item !== listener
        );
      },
      dispatch: (event) => {
        browser.runtime.onMessage._listeners.map(listener => listener(event));
      }
    }
  }
};


export default browser;
