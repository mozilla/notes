const config = require('../config.json');

const { writeFileSync, lstatSync, readdirSync } = require('fs');
const { join } = require('path');

const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => {
  return readdirSync(source).map(name => join(source, name)).filter(isDirectory).map(i => i.split('/')[2]);
};

config['SENTRY_DSN'] = process.env.SENTRY_DSN;

config['SUPPORTED_LOCALES'] = getDirectories('app/_locales');

writeFileSync('config.json', JSON.stringify(config, null, 2));
