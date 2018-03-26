#! /usr/bin/env node

const { copySync } = require('fs-extra');

const files = [
  copySync('node_modules/testpilot-ga/dist/index.js', 'src/vendor/testpilot-ga.js'),
  copySync('node_modules/jose-jwe-jws/dist/jose.min.js', 'src/vendor/jose.js'),
  copySync('node_modules/jose-jwe-jws/LICENSE', 'src/vendor/jose.LICENCE'),
  copySync('node_modules/fxa-crypto-relier/dist/fxa-crypto-relier/fxa-crypto-relier.js', 'src/vendor/fxa-crypto-relier/fxa-crypto-relier.js'),
  copySync('node_modules/@ckeditor/ckeditor5-build-classic/LICENSE.md', 'src/sidebar/vendor/ckeditor.LICENSE')
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
