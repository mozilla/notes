'use strict';

/* eslint-env node */

const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'source-map',

  entry: [
    path.resolve(__dirname, 'src', 'sidebar', 'app', 'app.js'),
  ],

  output: {
    // build to the extension src vendor directory
    path: path.resolve(__dirname, 'build'),
    filename: path.join('sidebar', 'app.js'),
  },

  plugins: [
    // cleanup build folder
    new CleanWebpackPlugin([
      'build'
    ]),
    // Moves files
    new CopyWebpackPlugin([
      { from: path.join('src') }
    ], {
      ignore: [
          path.join('sidebar', 'app', '**', '*')
      ],
    }),
  ],

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
