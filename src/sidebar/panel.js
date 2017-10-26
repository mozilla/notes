const formats = [
  'link',
  'bold',
  'font',
  'italic',
  'size',
  'strike',
  'indent',
  'list',
  'direction',
  'align'
];
const UI_LANG = browser.i18n.getUILanguage();
const RTL_LANGS = ['ar', 'fa', 'he'];
const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';
const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

// Additional keyboard shortcuts for non-default toolbar buttons
const bindings = {
  strike: {           // ⌘/Ctrl+Shift+X
    key: 'X',
    shiftKey: true,
    shortKey: true,
    handler: function(range) {
      if (this.quill.getFormat(range).strike === true)
        this.quill.formatText(range, 'strike', false);
      else
        this.quill.formatText(range, 'strike', true);
    }
  }, ordered: {       // ⌘/Ctrl+Shift+1
    key: '1',
    shiftKey: true,
    shortKey: true,
    handler: function(range) {
      if (this.quill.getFormat(range).list === 'ordered')
        this.quill.formatLine(range, {'list': false}, true);
      else
        this.quill.formatLine(range, {'list': 'ordered'}, true);
    }
  }, bullet: {        // ⌘/Ctrl+Shift+2
    key: '2',
    shiftKey: true,
    shortKey: true,
    handler: function(range) {
      if (this.quill.getFormat(range).list === 'bullet')
        this.quill.formatLine(range, {'list': false}, true);
      else
        this.quill.formatLine(range, {'list': 'bullet'}, true);
    }
  }
};

const Block = Quill.import('blots/block');
Block.tagName = 'DIV';
Quill.register(Block, true);

const fontSizeStyle = Quill.import('attributors/style/size');
fontSizeStyle.whitelist = ['12px', '14px', '16px', '18px', '20px'];
Quill.register(fontSizeStyle, true);

// add text direction icon to toolbar if RTL
const qlDirection = document.getElementById('ql-direction');
if (LANG_DIR === 'rtl') {
  qlDirection.innerHTML = '<button class="ql-direction" value="rtl"></button>';
}

const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: browser.i18n.getMessage('emptyPlaceHolder'),
  modules: {
    keyboard: {
      bindings: bindings
    },
    toolbar: '#toolbar'
  },
  formats: formats // enabled formats, see https://github.com/quilljs/quill/issues/1108
});

function isWhitespace(ch) {
  let whiteSpace = false;
  if ((ch === ' ') || (ch === '\t') || (ch === '\n')) {
    whiteSpace = true;
  }
  return whiteSpace;
}

// recognizes typed urls and create links from those urls
quill.on('text-change', function(delta) {
  const regex = /https?:\/\/[^\s]+$/;
  if (delta.ops.length === 2 && delta.ops[0].retain ) {
    let endRetain = delta.ops[0].retain;
    if ('insert' in delta.ops[1]) {
      endRetain += 1;
    }
    const text = quill.getText().substr(0, endRetain);
    const format = quill.getFormat(text);
    const match = text.match(regex);

    if (match !== null) {
      const url = match[0];

      let ops = [];
      if (endRetain > url.length) {
        ops.push({ retain: endRetain - url.length });
      }

      const formats = {};
      // apply any previous formatting options to the attributes object
      Object.keys(format).forEach(function(key) {
        formats[key] = format[key];
      });
      formats.link = url;

      ops = ops.concat([
        { delete: url.length },
        { insert: url, attributes: formats }
      ]);

      quill.updateContents({
        ops: ops
      });
    }
  }
});

// recognizes pasted urls and create links from those urls
quill.clipboard.addMatcher(Node.TEXT_NODE, function(node, delta) {
  let formatsAtIndex = {};

  const range = quill.getSelection(true);
  if (range) {
    if (range.length === 0) {
      formatsAtIndex = quill.getFormat(range.index);
    }
  }

  const regex = /https?:\/\/[^\s]+/;
  if (typeof(node.data) !== 'string')
    return;
  const matches = node.data.match(regex);

  if (matches === null) {
    const ops = [];
    const str = node.data;

    ops.push({ insert: str, attributes: formatsAtIndex });
    delta.ops = ops;
  }

  if (matches && matches.length > 0) {
    const ops = [];
    let str = node.data;

    matches.forEach(function(match) {
      const split = str.split(match);
      const beforeLink = split.shift();
      ops.push({ insert: beforeLink });
      
      formatsAtIndex.link = match;
      
      ops.push({ insert: match, attributes: formatsAtIndex });
      str = split.join(match);
    });

    ops.push({ insert: str });
    delta.ops = ops;
  }

  return delta;
});

function containsAnchor(el) {
  if (el.tagName === 'A')
    return el;

  while (el.parentElement) {
    el = el.parentElement;

    if (el.tagName === 'A')
      return el;
  }
}

// adds an eventListener to every <a> element which opens their respective
// href link in a new tab when clicked
document.querySelector('#editor').addEventListener('click', function(e) {
  let el = e.target;
  el = containsAnchor(el);

  if (el === undefined)
    return;
  else if (el !== null && el.tagName === 'A') {
    browser.runtime.sendMessage({
      action: 'link-clicked',
      context: getPadStats()
    });
    browser.tabs.create({
      active: true,
      url: el.href
    });
  }
});

// makes getting out of link-editing format easier by escaping whitespace characters
quill.on('text-change', function(delta) {
  if (delta.ops.length === 2 && 'insert' in delta.ops[1] &&
      isWhitespace(delta.ops[1].insert)) {
    const format = quill.getFormat(delta.ops[0].retain, 1);
    if ('link' in format)
      quill.formatText(delta.ops[0].retain, 1, 'link', false);
  }
  // delta match when [Space] is used before link at beginning of document, fixes #273
  else if (delta.ops.length === 1 && 'insert' in delta.ops[0]) {
    if (isWhitespace(delta.ops[0].insert)) {
      quill.formatText(0, 1, 'link', false);
    }
  }
  // delta match when [Tab] is used before link at beginning of document, fixes #273
  else if (delta.ops.length === 2 && 'insert' in delta.ops[0]) {
    quill.formatText(0, delta.ops[1].retain + 1, 'link', false);
  } else
    return;
});

let userOSKey;

if (navigator.appVersion.indexOf('Mac') !== -1)
  userOSKey = '⌘';
else
  userOSKey = 'Ctrl';

const size = document.getElementsByClassName('ql-size')[0],
      bold = document.getElementsByClassName('ql-bold')[0],
      italic = document.getElementsByClassName('ql-italic')[0],
      strike = document.getElementsByClassName('ql-strike')[0],
      ordered = document.getElementsByClassName('ql-list')[0],
      bullet = document.getElementsByClassName('ql-list')[1];

// Setting button titles in place of tooltips
size.title = browser.i18n.getMessage('fontSizeTitle');
bold.title = browser.i18n.getMessage('boldTitle') + ' (' + userOSKey + '+B)';
italic.title = browser.i18n.getMessage('italicTitle') + ' (' + userOSKey + '+I)';
strike.title = browser.i18n.getMessage('strikethroughTitle') + ' (' + userOSKey + '+Shift+' + bindings.strike.key + ')';
ordered.title = browser.i18n.getMessage('numberedListTitle') + ' (' + userOSKey + '+Shift+' + bindings.ordered.key + ')';
bullet.title = browser.i18n.getMessage('bulletedListTitle') + ' (' + userOSKey + '+Shift+' + bindings.bullet.key + ')';
qlDirection.title = browser.i18n.getMessage('textDirectionTitle');

const INITIAL_CONTENT = {
  ops: [
    { attributes: { size: 'large', bold: true }, insert: browser.i18n.getMessage('welcomeTitle2') },
    { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }},
    {
      attributes: { size: 'large' },
      insert:
      browser.i18n.getMessage('welcomeText2')
    },
    { insert: '\n\n', attributes: { direction: LANG_DIR, align: TEXT_ALIGN_DIR }}
  ]
};

function handleLocalContent(content) {
  if (!content) {
    quill.setContents(INITIAL_CONTENT);
    browser.storage.local.set({contentWasSynced: true });
  } else {
    if (JSON.stringify(quill.getContents()) !== JSON.stringify(content)) {
      quill.setContents(content);
    }
  }
}

function loadContent() {
  chrome.runtime.sendMessage({
    action: 'kinto-load'
  });
}

loadContent();

// Sidebar and background already know about that change.
let ignoreNextLoadEvent = false;
quill.on('text-change', () => {
  const content = quill.getContents();
  if (!ignoreNextLoadEvent) {
    // Debounce this second event
    chrome.runtime.sendMessage({
      action: 'kinto-save',
      content
    });

    // Debounce this second event
    chrome.runtime.sendMessage({
      action: 'metrics-changed',
      context: getPadStats()
    });
  } else {
    ignoreNextLoadEvent = false;
  }
});

const footerButtons = document.getElementById('footer-buttons');
const enableSync = document.getElementById('enable-sync');
const giveFeedbackButton = document.getElementById('give-feedback-button');
const noteDiv = document.getElementById('sync-note');
const syncNoteBody = document.getElementById('sync-note-dialog');
const closeButton = document.getElementById('close-button');
enableSync.setAttribute('title', browser.i18n.getMessage('syncNotes'));
syncNoteBody.textContent = browser.i18n.getMessage('syncNotReady2');

giveFeedbackButton.setAttribute('title', browser.i18n.getMessage('feedback'));
giveFeedbackButton.addEventListener('click', () => {
  if (footerButtons.classList.contains('savingLayout')) {
    browser.tabs.create({
      active: true,
      url: SURVEY_PATH
    });
  }
});

const savingIndicator = document.getElementById('saving-indicator');
savingIndicator.textContent = browser.i18n.getMessage('changesSaved');

const giveFeedback = document.getElementById('give-feedback');
giveFeedback.textContent = browser.i18n.getMessage('feedback');
giveFeedback.addEventListener('click', () => {
  browser.tabs.create({
    active: true,
    url: SURVEY_PATH
  });
});

const disconnectSync = document.getElementById('disconnect-from-sync');
disconnectSync.style.display = 'none';
disconnectSync.textContent = browser.i18n.getMessage('disableSync');
disconnectSync.addEventListener('click', () => {
  disconnectSync.style.display = 'none';
  setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
  setTimeout(() => {
    savingIndicator.textContent = browser.i18n.getMessage('disconnected');
  }, 200);
  setTimeout(() => {
    getLastSyncedTime();
  }, 2000);
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'disconnected'
  });
});

closeButton.addEventListener('click', () => {
  noteDiv.classList.toggle('visible');
});

/**
 * Set animation on footerButtons toolbar
 * @param {Boolean} animateSyncIcon Start looping animation on sync icon
 * @param {Boolean} syncingLayout   if true, animate to syncingLayout (sync icon on right)
 *                                  if false, animate to savingLayout (sync icon on left)
 * @param {Boolean} warning         Apply yellow warning styling on toolbar
 */
function setAnimation( animateSyncIcon = true, syncingLayout, warning ) { // animateSyncIcon, syncingLayout, warning

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
}

let loginTimeout;
let editingInProcess = false;
enableSync.onclick = () => {
  if (editingInProcess || footerButtons.classList.contains('syncingLayout')) {
    return;
  }
  setAnimation(true, true, false);  // animateSyncIcon, syncingLayout, warning

  setTimeout(() => {
    savingIndicator.textContent = browser.i18n.getMessage('openingLogin');
  }, 200); // Delay text for smooth animation

  loginTimeout = setTimeout(() => {
    setAnimation(false, true, true); // animateSyncIcon, syncingLayout, warning
    savingIndicator.textContent = browser.i18n.getMessage('pleaseLogin');
    disconnectSync.style.display = 'block';
  }, 5000);

  browser.runtime.sendMessage({
    action: 'authenticate',
    context: getPadStats()
  });
};

// gets the user-selected theme from local storage and applies respective CSS
// file to the document
function getThemeFromStorage() {
  const getting = browser.storage.local.get(['theme']);
  getting.then(function applyTheme(data) {
    if (data.theme === 'dark') {
      if (! document.getElementById('dark-styles')) {
        const darkSS = document.createElement('link');
        darkSS.id = 'dark-styles';
        darkSS.type = 'text/css';
        darkSS.rel = 'stylesheet';
        darkSS.href = 'styles-dark.css';
        document.getElementsByTagName('head')[0].appendChild(darkSS);
      } else
        return;
    } else if (data.theme === 'default' || data.theme === undefined) {
      if (document.getElementById('dark-styles')) {
        const darkSS = document.getElementById('dark-styles');
        darkSS.parentElement.removeChild(darkSS);
      } else
        return;
    }
  });
}

function getLastSyncedTime() {
  const getting = browser.storage.local.get(['last_modified', 'credentials']);
  getting.then(data => {
    if (data.hasOwnProperty('credentials')) {
      const time = new Date(data.last_modified).toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('syncComplete', time);
      disconnectSync.style.display = 'block';
      // Timeout stop animation 2s later to temporary fix a bug on editing.
      setTimeout(() =>  setAnimation(false, true), 2000); // animateSyncIcon, syncingLayout, warning
    } else {
      const time = new Date().toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('savedComplete', time);
    }
  });
}

document.addEventListener('DOMContentLoaded', getThemeFromStorage);
document.addEventListener('DOMContentLoaded', getLastSyncedTime);

chrome.runtime.onMessage.addListener(eventData => {
  let time;
  let content;
  switch (eventData.action) {
    case 'sync-authenticated':
      setAnimation(true, true, false); // animateSyncIcon, syncingLayout, warning
      savingIndicator.textContent = browser.i18n.getMessage('syncProgress');
      chrome.runtime.sendMessage({
          action: 'kinto-load'
        });
      break;
    case 'kinto-loaded':
    clearTimeout(loginTimeout);
    console.log('kinto-loaded', eventData);
      content = eventData.data;
      getLastSyncedTime();
      setTimeout(() => {
        handleLocalContent(content);
        document.getElementById('loading').style.display = 'none';
      }, 10);
      break;
    case 'text-change':
      ignoreNextLoadEvent = true;
      loadContent();
      break;
    case 'text-syncing':
      setAnimation(true); // animateSyncIcon, syncingLayout, warning
      savingIndicator.textContent = browser.i18n.getMessage('syncProgress');
      break;
    case 'text-editing':
      savingIndicator.textContent = browser.i18n.getMessage('savingChanges');
      // Disable sync-action
      editingInProcess = true;
      break;
    case 'text-synced':
      browser.storage.local.set({ last_modified: eventData.last_modified})
        .then(() => {
          getLastSyncedTime();
          chrome.runtime.sendMessage('notes@mozilla.com', {
            action: 'text-change'
          });
        });
      break;
    case 'text-saved':
      time = new Date().toLocaleTimeString();
      savingIndicator.textContent = browser.i18n.getMessage('savedComplete', time);
      // Enable sync-action
      editingInProcess = false;
      break;
    case 'theme-changed':
      getThemeFromStorage();
      break;
    case 'disconnected':
      disconnectSync.style.display = 'none';
      setAnimation(false, false, false); // animateSyncIcon, syncingLayout, warning
      getLastSyncedTime();
      break;
  }
});

// disable drop of links and images into notes
const qlEditor = document.querySelectorAll('.ql-editor');

document.addEventListener('dragover', () => {
  qlEditor[0].classList.add('forbid-cursor');
  browser.runtime.sendMessage({
    action: 'metrics-drag-n-drop',
    context: getPadStats()
  });
  return true;
});

document.addEventListener('dragleave', () => {
  qlEditor[0].classList.remove('forbid-cursor');
  return true;
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  qlEditor[0].classList.remove('forbid-cursor');
  return false;
});

function getPadStats() {
  const content = quill.getContents();
  const text = quill.getText();
  const styles = {
    size: false,
    bold: false,

    italic: false,
    strike: false,
    list: false
  };

  content.forEach(node => {
    if (node.hasOwnProperty('attributes')) {
      Object.keys(node.attributes).forEach(key => {
        if (styles.hasOwnProperty(key)) {
          styles[key] = true;
        }
      });
    }
  });

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

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();


// Disable right clicks
// Refs: https://stackoverflow.com/a/737043/186202
document.getElementById('toolbar').addEventListener('contextmenu', e => {
  e.preventDefault();
});

document.getElementById('footer-buttons').addEventListener('contextmenu', e => {
  e.preventDefault();
});
