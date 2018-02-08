const INITIAL_CONTENT = `
  <h2>${browser.i18n.getMessage('welcomeTitle3')}</h2>
  <p>${browser.i18n.getMessage('welcomeSubtitle')}</p>
  <p><strong>${browser.i18n.getMessage('welcomeOpenNotes')}</strong></p>
  <ul>
    <li>${browser.i18n.getMessage('welcomeWindowsLinuxShortcut', '<code>Alt+Shift+W</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeMacShortcut', '<code>Opt+Shift+W</code>')}</li>
  </ul>
  <p><strong>${browser.i18n.getMessage('welcomeAccessNotes')}</strong></p>
  <ul>
    <li>
      ${browser.i18n.getMessage('welcomeSyncInfo', '<strong>' + browser.i18n.getMessage('syncNotes') + '</strong>')}
    </li>
  </ul>
  <p>${browser.i18n.getMessage('welcomeFormatText')}</p>
  <ul>
    <li>${browser.i18n.getMessage('welcomeHeading').replace(/ `/g, ' <code>').replace(/`/g, '</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeBold').replace(/ `/g, ' <code>').replace(/`/g, '</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeItalics').replace(/ `/g, ' <code>').replace(/`/g, '</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeBulleted').replace(/ `/g, ' <code>').replace(/`/g, '</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeNumbered').replace(/ `/g, ' <code>').replace(/`/g, '</code>')}</li>
    <li>${browser.i18n.getMessage('welcomeCode').replace(/ ``/g, ' <code>`').replace(/``/g, '`</code>')}</li>
  </ul>
  <p><strong>${browser.i18n.getMessage('welcomeSuggestion')}</strong></p>
  <ul>
    <li>${browser.i18n.getMessage('welcomeGiveFeedback', '<strong>' + browser.i18n.getMessage('feedback') + '</strong>')}</li>
  </ul>
  <p>${browser.i18n.getMessage('welcomeThatsIt')}</p>
`;

export default INITIAL_CONTENT;
