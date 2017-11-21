#! /usr/bin/env node

const { copySync } = require('fs-extra');

const files = [
  copySync('node_modules/testpilot-ga/dist/index.js', 'src/vendor/testpilot-ga.js'),
  copySync('node_modules/@ckeditor/ckeditor5-build-classic/LICENSE.md', 'src/sidebar/vendor/ckeditor.LICENSE'),
  // Remove quill after migration
  copySync('node_modules/quill/LICENSE', 'src/sidebar/vendor/quill.LICENSE'),
  copySync('node_modules/quill/dist/quill.min.js', 'src/sidebar/vendor/quill.js')
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
