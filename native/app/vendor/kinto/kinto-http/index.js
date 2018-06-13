"use strict";

import { EventEmitter } from "events";

import KintoClientBase from "./base";

export default class KintoClient extends KintoClientBase {
  constructor(remote, options = {}) {
    const events = options.events || new EventEmitter();

    super(remote, Object.assign({ events }, options));
  }
}

// This is a hack to avoid Browserify to expose the above class
// at `new KintoClient()` instead of `new KintoClient.default()`.
// See https://github.com/Kinto/kinto-http.js/issues/77
if (typeof module === "object") {
  module.exports = KintoClient;
}
