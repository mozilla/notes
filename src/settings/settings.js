// getting elements that have text displayed and setting localized text
const appearance = document.getElementById('appearanceTitle'),
      themeLegend = document.getElementById('themeTitle'),
      lightThemeLabel = document.getElementById('light_label'),
      darkThemeLabel = document.getElementById('dark_label'),
      saveButton = document.getElementById('save');

appearance.innerHTML = browser.i18n.getMessage('appearanceSectionTitle');
themeLegend.innerHTML = browser.i18n.getMessage('themeLegend');
lightThemeLabel.innerHTML = browser.i18n.getMessage('lightThemeTitle');
darkThemeLabel.innerHTML = browser.i18n.getMessage('darkThemeTitle');
saveButton.textContent = browser.i18n.getMessage('saveButton');

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

function save() {
  const theme = getTheme();
  
  browser.storage.local.set(theme);
  
  // notify background.js that theme settings have changed
  browser.runtime.sendMessage({
    action: 'theme-changed'
  });
}
saveButton.addEventListener('click', save);
