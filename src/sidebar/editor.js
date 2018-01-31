/* exported customizeEditor, getPadStats, localizeEditorButtons, setAnimation, formatFooterTime */
function customizeEditor(editor) {
  const mainEditor = document.querySelector('.ck-editor__main');

  // Disable right clicks
  // Refs: https://stackoverflow.com/a/737043/186202
  document.querySelectorAll('.ck-toolbar, #footer-buttons').forEach((sel) => {
    sel.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
  });

  // Fixes an issue with CKEditor and keeping multiple Firefox windows in sync
  // Ref: https://github.com/mozilla/notes/issues/424
  document.querySelectorAll('.ck-heading-dropdown .ck-list__item').forEach((btn) => {
    btn.addEventListener('click', () => {
      editor.fire('changesDone');
    });
  });
  
  document.addEventListener('dragover', () => {
    mainEditor.classList.add('drag-n-drop-focus');
  });

  document.addEventListener('dragleave', () => {
    mainEditor.classList.remove('drag-n-drop-focus');
  });

  document.addEventListener('drop', () => {
    editor.fire('changesDone');
    mainEditor.classList.remove('drag-n-drop-focus');
    browser.runtime.sendMessage({
      action: 'metrics-drag-n-drop',
      context: getPadStats(editor)
    });
  });

  localizeEditorButtons();
}

function localizeEditorButtons () {
  // Clear CKEditor tooltips. Fixes: https://github.com/mozilla/notes/issues/410
  document.querySelectorAll('.ck-toolbar .ck-tooltip__text').forEach((sel) => {
    sel.remove();
  });

  let userOSKey;

  if (navigator.appVersion.indexOf('Mac') !== -1)
    userOSKey = '⌘';
  else
    userOSKey = 'Ctrl';

  const size = document.querySelector('button.ck-button:nth-child(1)'),
    // Need to target buttons by index. Ref: https://github.com/ckeditor/ckeditor5-basic-styles/issues/59
    bold = document.querySelector('button.ck-button:nth-child(2)'),
    italic = document.querySelector('button.ck-button:nth-child(3)'),
    strike = document.querySelector('button.ck-button:nth-child(4)'),
    bullet = document.querySelector('button.ck-button:nth-child(5)'),
    ordered = document.querySelector('button.ck-button:nth-child(6)');

// Setting button titles in place of tooltips
  size.title = browser.i18n.getMessage('fontSizeTitle');
  bold.title = browser.i18n.getMessage('boldTitle') + ' (' + userOSKey + '+B)';
  italic.title = browser.i18n.getMessage('italicTitle') + ' (' + userOSKey + '+I)';
  strike.title = browser.i18n.getMessage('strikethroughTitle');
  ordered.title = browser.i18n.getMessage('numberedListTitle');
  bullet.title = browser.i18n.getMessage('bulletedListTitle');
}

function getPadStats(editor) {
  const text = editor.getData();

  const styles = {
    size: false,
    bold: false,
    italic: false,
    strike: false,
    list: false,
    list_bulleted: false,
    list_numbered: false
  };

  const range = ClassicEditor.imports.range.createIn( editor.document.getRoot() );

  for ( const value of range ) {
    if (value.type === 'text') {
      // Bold
      if (value.item.textNode._attrs.get('bold')) {
        styles.bold = true;
      }
      // Italic
      if (value.item.textNode._attrs.get('italic')) {
        styles.italic = true;
      }
      // Strikethrough
      if (value.item.textNode._attrs.get('strike')) {
        styles.strike = true;
      }
    }

    if (value.type === 'elementStart') {
      // Size
      if (value.item.name.indexOf('heading') === 0) {
        styles.size = true;
      }

      // List
      if (value.item.name === 'listItem') {
        styles.list = true;
        if (value.item._attrs.get('type') === 'bulleted') {
          styles.list_bulleted = true;
        } else if (value.item._attrs.get('type') === 'numbered') {
          styles.list_numbered = true;
        }
      }
    }
  }

  return {
    syncEnabled: false,
    characters: text.length,
    lineBreaks: (text.match(/\n/g) || []).length,
    usesSize: styles.size,
    usesBold: styles.bold,
    usesItalics: styles.italic,
    usesStrikethrough: styles.strike,
    usesList: styles.list
  };
}

/**
 * Set animation on footerButtons toolbar
 * @param {Boolean} animateSyncIcon Start looping animation on sync icon
 * @param {Boolean} syncingLayout   if true, animate to syncingLayout (sync icon on right)
 *                                  if false, animate to savingLayout (sync icon on left)
 * @param {Boolean} warning         Apply yellow warning styling on toolbar
 */
function setAnimation( animateSyncIcon = true, syncingLayout, warning, syncSuccess ) { // animateSyncIcon, syncingLayout, warning, syncSuccess
  const footerButtons = document.getElementById('footer-buttons');
  const enableSync = document.getElementById('enable-sync');
  const savingIndicator = document.getElementById('saving-indicator');

  if (animateSyncIcon === true && !footerButtons.classList.contains('animateSyncIcon')) {
    footerButtons.classList.add('animateSyncIcon');
  } else if (animateSyncIcon === false && footerButtons.classList.contains('animateSyncIcon')) {
    footerButtons.classList.remove('animateSyncIcon');
  }

  if (syncingLayout === true && footerButtons.classList.contains('savingLayout')) {
    footerButtons.classList.replace('savingLayout', 'syncingLayout');
    enableSync.style.backgroundColor = 'transparent';
    // Start blink animation on saving-indicator
    savingIndicator.classList.add('blink');
    // Reset CSS animation by removeing class
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
  } else if (syncingLayout === false && footerButtons.classList.contains('syncingLayout')) {
    // Animate savingIndicator text
    savingIndicator.classList.add('blink');
    setTimeout(() => savingIndicator.classList.remove('blink'), 400);
    setTimeout(() => {
      enableSync.style.backgroundColor = null;
    }, 400);
    //
    footerButtons.classList.replace('syncingLayout', 'savingLayout');
  }

  if (warning === true && !footerButtons.classList.contains('warning')) {
    footerButtons.classList.add('warning');
  } else if (warning === false && footerButtons.classList.contains('warning')) {
    footerButtons.classList.remove('warning');
  }

  if (syncSuccess === true && !footerButtons.classList.contains('syncSuccess')) {
    footerButtons.classList.add('syncSuccess');
  } else if (footerButtons.classList.contains('syncSuccess')) {
    footerButtons.classList.remove('syncSuccess');
  }
}

/**
 * Formats time for the Notes footer
 * @param time
 * @returns {string}
 */
function formatFooterTime(date) {
  date = date || Date.now();
  return new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
