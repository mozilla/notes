# Firefox Notes

A notepad for Firefox

[![CircleCI](https://circleci.com/gh/mozilla/notes/tree/master.svg?style=svg)](https://circleci.com/gh/mozilla/notes/tree/master)
[![Available on Test Pilot](https://img.shields.io/badge/available_on-Test_Pilot-0996F8.svg)](https://testpilot.firefox.com/experiments/notes)
[![Waffle.io - Bug Triage](https://badge.waffle.io/mozilla/notes.svg?columns=all)](https://waffle.io/mozilla/notes)

> Discussion Forum: [https://discourse.mozilla.org/c/test-pilot/notes](https://discourse.mozilla.org/c/test-pilot/notes)


## Contribute

* Step 0: If you plan on sending a pull-request, you should fork the repository.
* Step 1: Clone the [notes](https://github.com/mozilla/notes) repository or your fork.
```
git clone https://github.com/mozilla/notes.git
# or
git clone https://github.com/[yourusername]/notes.git
```
* Step 2: Navigate to the root of the directory you cloned and run:
> Make sure to use Node.js 6+.

| Command         | Description                               |
|-----------------|-------------------------------------------|
| `npm install`   | Installs required Node.js dependencies.   |
| `npm run build` | Builds the application as a Web Extension.|
| `npm start`     | Launches Firefox with the Web Extension.  |

You can also open the `test/index.html` file in your browser to run the automated tests.

## Release 

See [RELEASE.md](https://github.com/mozilla/notes/blob/master/RELEASE.md) for release steps.

### Localization

Firefox Notes localization is managed via [Pontoon](https://pontoon.mozilla.org/projects/test-pilot-notes/), not direct pull requests to the repository. If you want to fix a typo, add a new language, or simply know more about localization, please get in touch with the [existing localization team](https://pontoon.mozilla.org/teams/) for your language, or Mozilla’s [l10n-drivers](https://wiki.mozilla.org/L10n:Mozilla_Team#Mozilla_Corporation) for guidance.

## Licenses

* [Mozilla Public License Version 2.0](LICENSE)

* [Quill Rich Text Editor License](https://github.com/quilljs/quill/blob/develop/LICENSE)
* [CKEditor Text Editor License](https://github.com/ckeditor/ckeditor5/blob/master/LICENSE.md) used under MPL licence
* [Material Design Components in HTML/CSS/JS License](https://github.com/google/material-design-lite/blob/mdl-1.x/LICENSE)

## Design

* Design for reference: https://mozilla.invisionapp.com/share/6VBUYHMRB#/281041484_Firefox_Notes
