"use strict";

import { EventEmitter } from "events";

// babel-polyfill can only be imported once
if (!global._babelPolyfill) {
  require("babel-polyfill");
}

import Api from "./kinto-http";
import BaseAdapter from "./adapters/base";
import IDB from "./adapters/IDB";
import KintoBase from "./KintoBase";

export default class Kinto extends KintoBase {
  /**
   * Provides a public access to the base adapter classes. Users can create
   * a custom DB adapter by extending BaseAdapter.
   *
   * @type {Object}
   */
  static get adapters() {
    return {
      BaseAdapter,
      IDB,
    };
  }

  constructor(options = {}) {
    const defaults = {
      adapter: Kinto.adapters.IDB,
      events: new EventEmitter(),
      ApiClass: Api,
    };

    super({ ...defaults, ...options });
  }
}

// This fixes compatibility with CommonJS required by browserify.
// See http://stackoverflow.com/questions/33505992/babel-6-changes-how-it-exports-default/33683495#33683495
if (typeof module === "object") {
  module.exports = Kinto;
}
