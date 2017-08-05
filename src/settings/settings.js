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
document.getElementById('save').addEventListener('click', save);
