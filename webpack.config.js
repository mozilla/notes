'use strict';

/* eslint-env node */

const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'source-map',

  entry: {
    sidebar: path.resolve(__dirname, 'src', 'sidebar', 'app', 'app.js'),
    background: path.resolve(__dirname, 'src', 'background.js')
  },
  // [
  //   path.resolve(__dirname, 'src', 'sidebar', 'app', 'app.js'),
  // ],

  output: {
    // build to the extension src vendor directory
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },
  // output: {
  //   path: __dirname + '/dist'
  //   filename: '[name].js',
  // }

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
          path.join('background.js'),
          path.join('sync.js'),
          path.join('fxa-utils.js'),
          path.join('utils.js'),
          path.join('sidebar', 'src', '**', '*'),
          path.join('sidebar', 'app', '**', '*'),
          path.join('sidebar', 'static', 'scss', '**', '*')
      ],
    }),
  ],

  module: {
    rules: [
      {
        test: /\.js$/, // Babel-loader compile jsx syntax to javascript
        exclude: /node_modules/,
        use: ['babel-loader?presets[]=env&presets[]=react&presets[]=stage-2&sourceMaps=true'],
      },
      {
          test: /\.scss$/,
          use: [{
              loader: 'style-loader' // creates style nodes from JS strings
          }, {
              loader: 'css-loader' // translates CSS into CommonJS
          }, {
              loader: 'sass-loader' // compiles Sass to CSS
          }]
      },
      {
        test: /\.(jpe?g|png|gif|svg|eot|woff|ttf|svg|woff2)$/,
        options: {
          name: '[path][name].[ext]',
          context: 'src',
          publicPath: '../'
        },
        loader: 'file-loader'
      }
    ]
  }
};
