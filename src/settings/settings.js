// getting elements that have text displayed and setting localized text
const themeLegend = document.getElementById('themeTitle');
const defaultThemeLabel = document.getElementById('default_label');
const darkThemeLabel = document.getElementById('dark_label');

const locationLegend = document.getElementById('locationTitle');
const defaultLocationLabel = document.getElementById('location_default_label');
const tabLocationLabel = document.getElementById('location_tab_label');

themeLegend.textContent = browser.i18n.getMessage('themeLegend');
defaultThemeLabel.textContent = browser.i18n.getMessage('defaultThemeTitle');
darkThemeLabel.textContent = browser.i18n.getMessage('darkThemeTitle');

locationLegend.textContent = browser.i18n.getMessage('locationLegend');
defaultLocationLabel.textContent = browser.i18n.getMessage('defaultLocationLabel');
tabLocationLabel.textContent = browser.i18n.getMessage('tabLocationLabel');

const themeRadioBtn = document.getElementsByName('theme');
const locationRadioBtn = document.getElementsByName('location');

function loadSavedData(data) {
  const theme = data.theme;
  const location = data.location;

  if (theme === 'default')
    themeRadioBtn[0].checked = true;
  else if (theme === 'dark')
    themeRadioBtn[1].checked = true;

  if (location === 'sidebar')
    locationRadioBtn[0].checked = true;
  else if (location === 'new_tab')
    locationRadioBtn[1].checked = true;
}

document.addEventListener('DOMContentLoaded', function() {
  const savedData = browser.storage.local.get(['theme', 'location']);
  savedData.then(loadSavedData);
});

function getSetting(settingOption) {
  let selectedSetting = {};
  switch (settingOption) {
    case 'location': {
      let location = '';
      for (let i = 0; i < locationRadioBtn.length; i++) {
        if (locationRadioBtn[i].checked)
          location = locationRadioBtn[i].value;
        else
          continue;
      }
      selectedSetting = { location };
      break;
    }
    case 'theme': {
      let theme = '';
      for (let i = 0; i < themeRadioBtn.length; i++) {
        if (themeRadioBtn[i].checked)
          theme = themeRadioBtn[i].value;
        else
          continue;
      }
      selectedSetting = { theme };
      break;
    }
  }
  return selectedSetting;
}

for (let i = 0; i < themeRadioBtn.length; i++) {
  themeRadioBtn[i].onclick = function() {
    const theme = getSetting('theme');
    browser.storage.local.set(theme);
    // notify background.js that theme settings have changed
    browser.runtime.sendMessage({
      action: 'theme-changed',
      context: theme
    });
  };
}

for (let i = 0; i < locationRadioBtn.length; i++) {
  locationRadioBtn[i].onclick = function() {
    const location = getSetting('location');
    browser.storage.local.set(location);
    // notify background.js that location settings have changed
    browser.runtime.sendMessage({
      action: 'location-changed',
      context: location
    });
  };
}
