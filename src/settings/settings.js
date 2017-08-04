let themeRadioBtn = document.getElementsByName('theme');

function loadSavedData(data) {
  console.log(data.theme.theme);
  
  let theme = data.theme.theme;
  
  if (theme === 'default')
    themeRadioBtn[0].checked = true;
  else if (theme === 'dark')
    themeRadioBtn[1].checked = true;
}

document.addEventListener('DOMContentLoaded', function() {
  let savedData = browser.storage.local.get(['theme']);
  
  savedData.then(loadSavedData);
});

function getTheme() {
  let theme = '';
  
  for (var i = 0; i < themeRadioBtn.length; i++) {
  	if (themeRadioBtn[i].checked)
    	theme = themeRadioBtn[i].value;
    else
    	continue;
  }
  
  let selectedTheme = {
    theme: theme
  }
  
  return selectedTheme;
}

function save() {
  let theme = getTheme();
  console.log(theme);
  
  browser.storage.local.set({
    theme
  });
}
document.getElementById('save').addEventListener('click', save);
