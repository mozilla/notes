// getting elements that have text displayed and setting localized text
const themeLegend = document.getElementById('themeTitle');
const defaultThemeLabel = document.getElementById('default_label');
const darkThemeLabel = document.getElementById('dark_label');

themeLegend.innerHTML = browser.i18n.getMessage('themeLegend');
defaultThemeLabel.innerHTML = browser.i18n.getMessage('defaultThemeTitle');
darkThemeLabel.innerHTML = browser.i18n.getMessage('darkThemeTitle');

const themeRadioBtn = document.getElementsByName('theme');

function loadSavedData(data) {
  const theme = data.theme;
  
  if (theme === 'default')
    themeRadioBtn[0].checked = true;
  else if (theme === 'dark')
    themeRadioBtn[1].checked = true;
}

document.addEventListener('DOMContentLoaded', function() {
  const savedData = browser.storage.local.get('theme');
  savedData.then(loadSavedData);
});

function getTheme() {
  let theme = '';
  
  for (let i = 0; i < themeRadioBtn.length; i++) {
    if (themeRadioBtn[i].checked)
      theme = themeRadioBtn[i].value;
    else
      continue;
  }
  
  const selectedTheme = {
    theme: theme
  };
  
  return selectedTheme;
}

for (let i = 0; i < themeRadioBtn.length; i++) {
  themeRadioBtn[i].onclick = function() {
    const theme = getTheme();
  
    browser.storage.local.set(theme);

    // notify background.js that theme settings have changed
    browser.runtime.sendMessage({
      action: 'theme-changed'
    });
  };
}
