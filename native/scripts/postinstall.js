#! /usr/bin/env node

const { copySync } = require('fs-extra');

const files = [
  copySync('node_modules/fxa-crypto-relier/dist/fxa-crypto-relier/fxa-crypto-relier.js', 'app/vendor/fxa-crypto-relier.js'),
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
