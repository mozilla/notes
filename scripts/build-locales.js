#! /usr/bin/env node
const spawn = require('cross-spawn');

const locales = '*';

const result = spawn.sync('pontoon-to-webext', ['--dest=src/_locales'], {
  stdio: 'inherit',
  env: Object.assign(
    {},
    process.env,
    { SUPPORTED_LOCALES: locales }
  )
});

if (result.error) {
  console.error(result.error); // eslint-disable-line no-console
  process.exit(1);
}
