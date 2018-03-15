const config = {
  'heading': {
    'options': [
      { model: 'heading1', view: 'h1', title: browser.i18n.getMessage('title1'), class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: browser.i18n.getMessage('title2'), class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: browser.i18n.getMessage('title3'), class: 'ck-heading_heading3' },
      { model: 'paragraph', title: browser.i18n.getMessage('paragraph'), class: 'ck-heading_paragraph' }
    ]
  },
  toolbar: [
    'heading',
    'bold',
    'italic',
    'strikethrough',
    'bulletedList',
    'numberedList'
  ]
};

export default config;
