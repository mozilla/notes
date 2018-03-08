import React from 'react';

import CloseIcon from './icons/CloseIcon';

import { getPadStats, customizeEditor, insertSelectedText } from '../utils/editor';

import INITIAL_CONFIG from '../data/editorConfig';
import INITIAL_CONTENT from '../data/initialContent';

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ignoreNextLoadEvent: false,
      ignoreTextSynced: false,
      wasLimitReached: false,
      isKintoLoaded: false,
      content: null
    };
    this.editor = null;

    // Process events from chrome runtime onMessage
    this.events = eventData => {
      let content;
      switch (eventData.action) {
        case 'kinto-loaded':
          content = eventData.data;
          this.handleLocalContent(this.editor, content);
          this.setState({
            isKintoLoaded: true
          });
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
        case 'send-to-notes':
          // insert eventData.text in editor
          insertSelectedText(this.editor, eventData.text);
          break;
      }
    };

    this.handleLocalContent = function(editor, content) {
      if (!content) {
        browser.storage.local.get('notes2').then(data => {

          if (!data.hasOwnProperty('notes2')) {
            this.init(INITIAL_CONTENT);
            this.setState({
              ignoreNextLoadEvent: true
            });
          } else {
            this.init(data.notes2);
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
      } else if (!this.editor || this.editor.getData() !== content) {
        this.init(content);
      }
    };

    this.loadContent = () => {
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
    };

    this.closeNotification = () => {
      this.setState({
        wasLimitReached: false
      });
    };

    this.init = (content) => {
      this.setState({
        content
      });
      if (this.editor) {
        this.editor.setData(content);
      } else {
        ClassicEditor.create(this.node, INITIAL_CONFIG)
          .then(editor => {
            this.editor = editor;

            customizeEditor(editor);

            // Send message to background.js stating editor has been initialized
            // and is ready to receive content
            chrome.runtime.sendMessage({action: 'editor-ready'});

            // this.loadContent();

            // chrome.runtime.onMessage.addListener(this.events);

            editor.document.on('change', (eventInfo, name) => {
              const isFocused = document
                .querySelector('.ck-editor__editable')
                .classList.contains('ck-focused');
              // Only use the focused editor or handle 'rename' events to set the data into storage.
              if (isFocused || name === 'rename' || name === 'insert') {
                const content = editor.getData();
                if (!this.state.ignoreNextLoadEvent && content !== undefined &&
                    content.replace(/&nbsp;/g, '\xa0') !== INITIAL_CONTENT.replace(/\s\s+/g, ' ')) {
                  this.setState({
                    ignoreTextSynced: true
                  });
                  if (content.length > 15000) {
                    console.error('Maximum notepad size reached:', content.length); // eslint-disable-line no-console
                    // TODO: display 'maximumPadSizeExceeded' notification
                    this.setState({
                      wasLimitReached: true,
                    });
                    browser.runtime.sendMessage({
                      action: 'metrics-limit-reached',
                      context: getPadStats(editor)
                    });
                  } else {
                    this.setState({
                      wasLimitReached: false,
                    });
                  }

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
    };
  }

  componentDidMount() {
    chrome.runtime.onMessage.addListener(this.events);
    this.loadContent();
  }

  componentWillUnmount() {
    chrome.runtime.onMessage.removeListener(this.events);
  }

  render() {

    return (
      <div className="editorWrapper">
        <div
          id="editor"
          ref={node => {
            this.node = node;
          }}
          dangerouslySetInnerHTML={{ __html: this.state.content }}
        >
        </div>
        { this.state.wasLimitReached ?
        <div id="sync-note" style={{display: 'block'}}>
          <button onClick={this.closeNotification}><CloseIcon /></button>
          <p>{ browser.i18n.getMessage('maximumPadSizeExceeded') }</p>
        </div> : null }
      </div>
    );
  }
}

export default Editor;
