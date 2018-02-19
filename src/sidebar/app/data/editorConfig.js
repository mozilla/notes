const config = {
  'heading': {
    'options': [
      { modelElement: 'heading1', viewElement: 'h1', title: browser.i18n.getMessage('title1'), class: 'ck-heading_heading1' },
      { modelElement: 'heading2', viewElement: 'h2', title: browser.i18n.getMessage('title2'), class: 'ck-heading_heading2' },
      { modelElement: 'heading3', viewElement: 'h3', title: browser.i18n.getMessage('title3'), class: 'ck-heading_heading3' },
      { modelElement: 'paragraph', title: browser.i18n.getMessage('paragraph'), class: 'ck-heading_paragraph' }
    ]
  },
  'toolbar': [
    'headings',
    'bold',
    'italic',
    'strike',
    'bulletedList',
    'numberedList'
  ]
};

export default config;
