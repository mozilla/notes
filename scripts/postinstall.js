#! /usr/bin/env node

const { copySync } = require('fs-extra');

const files = [
  copySync('node_modules/testpilot-ga/dist/index.js', 'src/vendor/testpilot-ga.js'),
  copySync('node_modules/quill/dist/quill.min.js', 'src/sidebar/vendor/quill.js'),
  copySync('node_modules/quill/dist/quill.snow.css', 'src/sidebar/vendor/quill.snow.css'),
  copySync('node_modules/quill/LICENSE', 'src/sidebar/vendor/quill.LICENSE'),
  copySync('node_modules/material-design-lite/material.min.js', 'src/sidebar/vendor/material.js'),
  copySync('node_modules/material-design-lite/material.min.css', 'src/sidebar/vendor/material.css')
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
