# Firefox Notes

[![CircleCI](https://circleci.com/gh/mozilla/notes/tree/master.svg?style=svg)](https://circleci.com/gh/mozilla/notes/tree/master)
[![Available on Test Pilot](https://img.shields.io/badge/available_on-Test_Pilot-0996F8.svg)](https://testpilot.firefox.com/experiments/notes)

## What it does

Open a notepad in the Firefox toolbar to store notes about your browsing.


## How to use it
Step 1: Make sure you fork and clone [notes](https://github.com/mozilla/notes).
```
$ git clone https://github.com/[yourusername]/notes.git
```
Step 2: Install its dependencies
Navigate to the root of the directory you cloned and run:
> Make sure to use Node.js 6+.

| Command | Description |
|---------|-------------|
| `npm install`   | Installs required Node.js dependencies.
| `npm run build` | Builds the application as a Web Extension.
| `npm start`     | Launches Firefox with the Web Extension.

NOTE: if you are running on Windows, and experience a build error use `$ npm build`

Step 3:Load about:debugging#addons in the Firefox address bar.

Step 4:Select a Firefox .xpi file or Manifest file under the src folder and click open afterwards



## Localization

Firefox Notes localization is managed via [Pontoon](https://pontoon.mozilla.org/projects/test-pilot-notes/), not direct pull requests to the repository. If you want to fix a typo, add a new language, or simply know more about localization, please get in touch with the [existing localization team](https://pontoon.mozilla.org/teams/) for your language, or Mozilla’s [l10n-drivers](https://wiki.mozilla.org/L10n:Mozilla_Team#Mozilla_Corporation) for guidance.

## Licenses

[Mozilla Public License Version 2.0](LICENSE)

[Quill Rich Text Editor License](https://github.com/quilljs/quill/blob/develop/LICENSE)

## Other

Design for reference https://mozilla.invisionapp.com/share/6VBUYHMRB#/235284916_Desktop_Sidebar

![Notes Screenshot](https://i.imgur.com/kHwBN2f.png)
