/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

/* eslint-env node */

const path = require('path');

module.exports = {
  devtool: 'source-map',

  entry: [
    path.resolve(__dirname, 'src', 'sidebar', 'app', 'panel.js'),
  ],

  output: {
    // build to the extension src vendor directory
    path: path.resolve(__dirname, 'build', 'sidebar'),
    filename: 'app.js',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader?presets[]=env&presets[]=react&presets[]=stage-2&sourceMaps=true'],
      },
    ]
  }
};
