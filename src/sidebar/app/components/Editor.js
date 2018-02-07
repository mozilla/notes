import React from 'react';

import { getPadStats, customizeEditor } from '../editor.js';

const INITIAL_CONTENT = `<h2>${browser.i18n.getMessage(
  'welcomeTitle2'
)}</h2><p>${browser.i18n.getMessage('welcomeText2')}</p>`;

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ignoreNextLoadEvent: false,
      ignoreTextSynced: false
    };
    this.editor = null;
  }

  componentDidMount() {
    ClassicEditor.create(this.node, {
      heading: {
        options: [
          {
            modelElement: 'paragraph',
            title: 'P',
            class: 'ck-heading_paragraph'
          },
          {
            modelElement: 'heading3',
            viewElement: 'h3',
            title: 'H3',
            class: 'ck-heading_heading3'
          },
          {
            modelElement: 'heading2',
            viewElement: 'h2',
            title: 'H2',
            class: 'ck-heading_heading2'
          },
          {
            modelElement: 'heading1',
            viewElement: 'h1',
            title: 'H1',
            class: 'ck-heading_heading1'
          }
        ]
      },
      toolbar: [
        'headings',
        'bold',
        'italic',
        'strike',
        'bulletedList',
        'numberedList'
      ]
    })
      .then(editor => {
        this.editor = editor;

        customizeEditor(editor);
        this.loadContent();

        chrome.runtime.onMessage.addListener(this.events);

        editor.document.on('change', (eventInfo, name) => {
          const isFocused = document
            .querySelector('.ck-editor__editable')
            .classList.contains('ck-focused');
          // Only use the focused editor or handle 'rename' events to set the data into storage.
          if (isFocused || name === 'rename' || name === 'insert') {
            const content = editor.getData();
            if (
              !this.state.ignoreNextLoadEvent &&
              content !== undefined &&
              content.replace('&nbsp;', ' ') !== INITIAL_CONTENT
            ) {
              this.setState({
                ignoreTextSynced: true
              });

              chrome.runtime.sendMessage({
                action: 'kinto-save',
                content
              });

              chrome.runtime.sendMessage({
                action: 'metrics-changed',
                context: getPadStats(editor)
              });
            }
          }
          this.setState({
            ignoreNextLoadEvent: false
          });
        });
      })
      .catch(error => {
        console.error(error); // eslint-disable-line no-console
      });
  }

  componentWillUnmount() {
    chrome.runtime.onMessage.removeListener(this.events);
  }

  // Process events from chrome runtime onMessage
  events(eventData) {
    let content;
    switch (eventData.action) {
      case 'kinto-loaded':
        content = eventData.data;
        this.handleLocalContent(this.editor, content);
        break;
      case 'text-change':
        this.setState({
          ignoreNextLoadEvent: true
        });
        browser.runtime.sendMessage({
          action: 'kinto-load'
        });
        break;
      case 'text-synced':
        if (!this.state.ignoreTextSynced || eventData.conflict) {
          this.handleLocalContent(this.editor, eventData.content);
        }

        this.setState({
          ignoreTextSynced: false
        });
        break;
    }
  }

  handleLocalContent(editor, content) {
    if (!content) {
      browser.storage.local.get('notes2').then(data => {
        if (!data.hasOwnProperty('notes2')) {
          this.editor.setData(INITIAL_CONTENT);
          this.setState({
            ignoreNextLoadEvent: true
          });
        } else {
          this.editor.setData(data.notes2);
          chrome.runtime
            .sendMessage({
              action: 'kinto-save',
              content: data.notes2
            })
            .then(() => {
              // Clean-up
              browser.storage.local.remove('notes2');
            });
        }
      });
    } else {
      if (this.editor.getData() !== content) {
        this.editor.setData(content);
      }
    }
  }

  loadContent() {
    browser.storage.local.get('credentials').then(data => {
      if (data.hasOwnProperty('credentials')) {
        this.setState({
          isAuthenticated: true
        });
      }
    });
    this.setState({
      ignoreNextLoadEvent: true
    });
    chrome.runtime.sendMessage({
      action: 'kinto-sync'
    });
  }

  render() {
    return (
      <div
        ref={node => {
          this.node = node;
        }}
        id="editor"
      />
    );
  }
}

export default Editor;
