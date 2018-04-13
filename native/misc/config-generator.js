const config = require('../config.json');
const { writeFileSync } = require('fs');

config['SENTRY_DSN'] = process.env.SENTRY_DSN;

writeFileSync('config.json', JSON.stringify(config, null, 2));
