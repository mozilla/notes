#! /usr/bin/env node

const { copySync } = require('fs-extra');

const files = [
  copySync('node_modules/testpilot-ga/dist/index.js', 'src/vendor/testpilot-ga.js'),
  copySync('node_modules/kinto-http/dist/kinto-http.min.js', 'src/vendor/kinto-http.js'),
  copySync('node_modules/kinto-http/LICENSE', 'src/vendor/kinto-http.LICENSE'),
  copySync('node_modules/kinto/dist/kinto.noshim.js', 'src/vendor/kinto.js'),
  copySync('node_modules/kinto/LICENSE', 'src/vendor/kinto.LICENSE'),
  copySync('node_modules/jose-jwe-jws/dist/jose.min.js', 'src/vendor/jose.js'),
  copySync('node_modules/jose-jwe-jws/LICENSE', 'src/vendor/jose.LICENCE'),
  copySync('node_modules/fxa-crypto-relier/dist/fxa-crypto-relier/fxa-crypto-relier.js', 'src/vendor/fxa-crypto-relier/fxa-crypto-relier.js'),
  copySync('node_modules/material-design-lite/material.min.js', 'src/sidebar/vendor/material.js'),
  copySync('node_modules/material-design-lite/LICENSE', 'src/sidebar/vendor/material.LICENSE'),
  copySync('node_modules/@ckeditor/ckeditor5-build-classic/LICENSE.md', 'src/sidebar/vendor/ckeditor.LICENSE'),
  copySync('node_modules/turndown/lib/turndown.umd.js', 'src/sidebar/vendor/turndown.js'),
  copySync('node_modules/turndown/LICENSE', 'src/sidebar/vendor/turndown.LICENSE'),
  // Remove quill after migration
  copySync('node_modules/quill/LICENSE', 'src/sidebar/vendor/quill.LICENSE'),
  copySync('node_modules/quill/dist/quill.min.js', 'src/sidebar/vendor/quill.js')
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
