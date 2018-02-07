// gets the user-selected theme from local storage and applies respective CSS
// file to the document
function getThemeFromStorage() {
  const getting = browser.storage.local.get(['theme']);
  getting.then(function applyTheme(data) {
    if (data.theme === 'dark') {
      if (!document.getElementById('dark-styles')) {
        const darkSS = document.createElement('link');
        darkSS.id = 'dark-styles';
        darkSS.type = 'text/css';
        darkSS.rel = 'stylesheet';
        darkSS.href = 'static/css/styles-dark.css';
        document.getElementsByTagName('head')[0].appendChild(darkSS);
      } else return;
    } else if (data.theme === 'default' || data.theme === undefined) {
      if (document.getElementById('dark-styles')) {
        const darkSS = document.getElementById('dark-styles');
        darkSS.parentElement.removeChild(darkSS);
      } else return;
    }
  });
}
document.addEventListener('DOMContentLoaded', getThemeFromStorage);

chrome.runtime.onMessage.addListener(eventData => {
  switch (eventData.action) {
    case 'theme-changed':
      getThemeFromStorage();
  }
});
