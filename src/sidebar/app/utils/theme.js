// gets the user-selected theme from local storage and applies respective CSS
// file to the document
//
function getThemeFromStorage() {
  const getting = browser.storage.local.get(['theme']);
  getting.then(function applyTheme(data) {
    if (data.theme === 'dark') {

      if (document.getElementsByTagName('body').classList) {
        document.getElementsByTagName('body').classList.remove('lightTheme');
        document.getElementsByTagName('body').classList.add('darkTheme');
      }

      if (!document.getElementById('dark-styles')) {
        const darkSS = document.createElement('link');
        darkSS.id = 'dark-styles';
        darkSS.type = 'text/css';
        darkSS.rel = 'stylesheet';
        darkSS.href = 'static/css/styles-dark.css';
        document.getElementsByTagName('head')[0].appendChild(darkSS);
      }
    } else if (data.theme === 'default' || data.theme === undefined) {

      if (document.getElementsByTagName('body').classList) {
        document.getElementsByTagName('body').classList.remove('darkTheme');
        document.getElementsByTagName('body').classList.add('lightTheme');
      }

      if (document.getElementById('dark-styles')) {
        const darkSS = document.getElementById('dark-styles');
        darkSS.parentElement.removeChild(darkSS);
      }
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
