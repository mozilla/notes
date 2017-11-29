/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
  // Application Constructor
  initialize: function() {
      document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  },

  // deviceready Event Handler
  //
  // Bind any cordova events here. Common events are:
  // 'pause', 'resume', etc.
  onDeviceReady: function() {
      window.ga.startTrackerWithId('UA-XXXX-YY', 30)
      this.storage = window.localStorage;
      window.open = cordova.InAppBrowser.open;

      this.setupDOM();
  },
  loadContent: function() {
    const content = this.storage.getItem('notes2');
    return JSON.parse(content);
  },
  handleLocalContent: function(editor, content) {
    if (!content) {
      const data = this.storage.getItem('notes2')
        if (!data) {
          editor.setData(`<h2>Welcome</h2>`);
        } else {
          console.log('got notes2');
        }
    } else {
      if (editor.getData() !== content) {
        editor.setData(content);
      }
    }
  },
  saveContent: function (content) {
      this.storage.setItem('notes2', JSON.stringify(content));
      return;
  },
  setupQuill: function() {
    debugger
    ClassicEditor.create(document.querySelector('#editor'), {
      heading: {
        options: [
          { modelElement: 'paragraph', title: 'P', class: 'ck-heading_paragraph' },
          { modelElement: 'heading1', viewElement: 'h1', title: 'H1', class: 'ck-heading_heading1' },
          { modelElement: 'heading2', viewElement: 'h2', title: 'H2', class: 'ck-heading_heading2' },
          { modelElement: 'heading3', viewElement: 'h3', title: 'H3', class: 'ck-heading_heading3' }
        ]
      },
      toolbar: ['headings', 'bold', 'italic', 'strike', 'bulletedList', 'numberedList'],
    }).then(editor => {
        editor.document.on('change', (eventInfo, name) => {

        });
        const localContent = this.loadContent();
        this.handleLocalContent(editor, localContent);
        document.getElementById('p2').style.display = 'none';
        document.getElementById('editor').style.display = 'block';

    }).catch(error => {
      console.error(error);
    });
  },
  setupDOM: function() {
    const self = this;
    const signInLink = document.getElementById('signin');
    const signoutLink = document.getElementById('signout');

    signoutLink.addEventListener('click', signout);
    signInLink.addEventListener('click', function(event) {

      event.preventDefault();
      document.getElementById('onboarding').style.display = 'none';
      document.getElementById('editor-container').style.display = 'block';
      setTimeout(function() {
        self.setupQuill();
      }, 2000);
    });

    if (this.storage.getItem('loginDetails')) {
      // if signed in skip onboarding page
      document.getElementById('onboarding').style.display = 'none';
      document.getElementById('editor-container').style.display = 'block';
      document.getElementById('signout').style.display = 'block';
    }

    // this is weird because it sets sign in credentials on sync
    // should move that out
    const sync = document.getElementById('sync');
    sync.addEventListener('click', signin);
  }
};

app.initialize();

function signin(event) {
  event.preventDefault();
  const browserApiCordova = {
    identity: {
      launchWebAuthFlow: function (options) {
        return new Promise(function (resolve) {
          const authWindow = window.open(options.url, '_blank', 'location=no,toolbar=no');
          authWindow.addEventListener('loadstart', function(e) {
            const url = e.url;
            const code = /code=(.+)$/.exec(url);
            const error = /error=(.+)$/.exec(url);

            if (code || error) {
              authWindow.close();
              resolve(url);
            }
          });
        });
      }
    }
  };

  const FXA_CLIENT_ID = 'c6d74070a481bc10';
  const FXA_OAUTH_SERVER = 'https://oauth-scoped-keys.dev.lcip.org/v1';

  const fxaKeysUtil = new FxaCrypto.relier.OAuthUtils();
  fxaKeysUtil.launchFxaScopedKeyFlow({
    client_id: FXA_CLIENT_ID,
    oauth_uri: FXA_OAUTH_SERVER,
    pkce: true,
    redirect_uri: 'https://dee85c67bd72f3de1f0a0fb62a8fe9b9b1a166d7.extensions.allizom.org/',
    scopes: ['profile', 'https://identity.mozilla.org/apps/notes'],
    browserApi: browserApiCordova
  })
  .then(function (loginDetails) {
    this.localStorage.setItem('loginDetails', JSON.stringify(loginDetails));
    this.setSignedInState();
  }.bind(this))
  .catch(function (err) {
    console.log('it didnt work', err);
  });
}

function signout(event) {
  event.preventDefault();
  this.window.storage.removeItem('loginDetails');
  document.getElementById('signout').style.display = 'none';
}
