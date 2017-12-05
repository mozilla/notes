(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Kinto = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SUPPORTED_PROTOCOL_VERSION = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _desc, _value, _class;

var _utils = require("./utils");

var _http = require("./http");

var _http2 = _interopRequireDefault(_http);

var _endpoint = require("./endpoint");

var _endpoint2 = _interopRequireDefault(_endpoint);

var _requests = require("./requests");

var requests = _interopRequireWildcard(_requests);

var _batch = require("./batch");

var _bucket = require("./bucket");

var _bucket2 = _interopRequireDefault(_bucket);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

/**
 * Currently supported protocol version.
 * @type {String}
 */
var SUPPORTED_PROTOCOL_VERSION = exports.SUPPORTED_PROTOCOL_VERSION = "v1";

/**
 * High level HTTP client for the Kinto API.
 *
 * @example
 * const client = new KintoClient("https://kinto.dev.mozaws.net/v1");
 * client.bucket("default")
*    .collection("my-blog")
*    .createRecord({title: "First article"})
 *   .then(console.log.bind(console))
 *   .catch(console.error.bind(console));
 */
var KintoClientBase = (_dec = (0, _utils.nobatch)("This operation is not supported within a batch operation."), _dec2 = (0, _utils.nobatch)("This operation is not supported within a batch operation."), _dec3 = (0, _utils.nobatch)("This operation is not supported within a batch operation."), _dec4 = (0, _utils.nobatch)("This operation is not supported within a batch operation."), _dec5 = (0, _utils.nobatch)("Can't use batch within a batch!"), _dec6 = (0, _utils.capable)(["permissions_endpoint"]), _dec7 = (0, _utils.support)("1.4", "2.0"), (_class = function () {
  /**
   * Constructor.
   *
   * @param  {String}       remote  The remote URL.
   * @param  {Object}       [options={}]                  The options object.
   * @param  {Boolean}      [options.safe=true]           Adds concurrency headers to every requests.
   * @param  {EventEmitter} [options.events=EventEmitter] The events handler instance.
   * @param  {Object}       [options.headers={}]          The key-value headers to pass to each request.
   * @param  {Object}       [options.retry=0]             Number of retries when request fails (default: 0)
   * @param  {String}       [options.bucket="default"]    The default bucket to use.
   * @param  {String}       [options.requestMode="cors"]  The HTTP request mode (from ES6 fetch spec).
   * @param  {Number}       [options.timeout=null]        The request timeout in ms, if any.
   */
  function KintoClientBase(remote) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, KintoClientBase);

    if (typeof remote !== "string" || !remote.length) {
      throw new Error("Invalid remote URL: " + remote);
    }
    if (remote[remote.length - 1] === "/") {
      remote = remote.slice(0, -1);
    }
    this._backoffReleaseTime = null;

    this._requests = [];
    this._isBatch = !!options.batch;
    this._retry = options.retry || 0;
    this._safe = !!options.safe;
    this._headers = options.headers || {};

    // public properties
    /**
     * The remote server base URL.
     * @type {String}
     */
    this.remote = remote;
    /**
     * Current server information.
     * @ignore
     * @type {Object|null}
     */
    this.serverInfo = null;
    /**
     * The event emitter instance. Should comply with the `EventEmitter`
     * interface.
     * @ignore
     * @type {Class}
     */
    this.events = options.events;

    var requestMode = options.requestMode,
        timeout = options.timeout;
    /**
     * The HTTP instance.
     * @ignore
     * @type {HTTP}
     */

    this.http = new _http2.default(this.events, { requestMode: requestMode, timeout: timeout });
    this._registerHTTPEvents();
  }

  /**
   * The remote endpoint base URL. Setting the value will also extract and
   * validate the version.
   * @type {String}
   */


  _createClass(KintoClientBase, [{
    key: "_registerHTTPEvents",


    /**
     * Registers HTTP events.
     * @private
     */
    value: function _registerHTTPEvents() {
      var _this = this;

      // Prevent registering event from a batch client instance
      if (!this._isBatch) {
        this.events.on("backoff", function (backoffMs) {
          _this._backoffReleaseTime = backoffMs;
        });
      }
    }

    /**
     * Retrieve a bucket object to perform operations on it.
     *
     * @param  {String}  name              The bucket name.
     * @param  {Object}  [options={}]      The request options.
     * @param  {Boolean} [options.safe]    The resulting safe option.
     * @param  {Number}  [options.retry]   The resulting retry option.
     * @param  {Object}  [options.headers] The extended headers object option.
     * @return {Bucket}
     */

  }, {
    key: "bucket",
    value: function bucket(name) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _bucket2.default(this, name, {
        batch: this._isBatch,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
        retry: this._getRetry(options)
      });
    }

    /**
     * Get the value of "headers" for a given request, merging the
     * per-request headers with our own "default" headers.
     *
     * Note that unlike other options, headers aren't overridden, but
     * merged instead.
     *
     * @private
     * @param {Object} options The options for a request.
     * @returns {Object}
     */

  }, {
    key: "_getHeaders",
    value: function _getHeaders(options) {
      return _extends({}, this._headers, options.headers);
    }

    /**
     * Get the value of "safe" for a given request, using the
     * per-request option if present or falling back to our default
     * otherwise.
     *
     * @private
     * @param {Object} options The options for a request.
     * @returns {Boolean}
     */

  }, {
    key: "_getSafe",
    value: function _getSafe(options) {
      return _extends({ safe: this._safe }, options).safe;
    }

    /**
     * As _getSafe, but for "retry".
     *
     * @private
     */

  }, {
    key: "_getRetry",
    value: function _getRetry(options) {
      return _extends({ retry: this._retry }, options).retry;
    }

    /**
     * Retrieves the server's "hello" endpoint. This endpoint reveals
     * server capabilities and settings as well as telling the client
     * "who they are" according to their given authorization headers.
     *
     * @private
     * @param  {Object}  [options={}] The request options.
     * @param  {Object}  [options.headers={}] Headers to use when making
     *     this request.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "_getHello",
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var path, _ref2, json;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                path = this.remote + (0, _endpoint2.default)("root");
                _context.next = 3;
                return this.http.request(path, { headers: this._getHeaders(options) }, { retry: this._getRetry(options) });

              case 3:
                _ref2 = _context.sent;
                json = _ref2.json;
                return _context.abrupt("return", json);

              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function _getHello() {
        return _ref.apply(this, arguments);
      }

      return _getHello;
    }()

    /**
     * Retrieves server information and persist them locally. This operation is
     * usually performed a single time during the instance lifecycle.
     *
     * @param  {Object}  [options={}] The request options.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "fetchServerInfo",
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.serverInfo) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt("return", this.serverInfo);

              case 2:
                _context2.next = 4;
                return this._getHello({ retry: this._getRetry(options) });

              case 4:
                this.serverInfo = _context2.sent;
                return _context2.abrupt("return", this.serverInfo);

              case 6:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function fetchServerInfo() {
        return _ref3.apply(this, arguments);
      }

      return fetchServerInfo;
    }()

    /**
     * Retrieves Kinto server settings.
     *
     * @param  {Object}  [options={}] The request options.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "fetchServerSettings",
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(options) {
        var _ref5, settings;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.fetchServerInfo(options);

              case 2:
                _ref5 = _context3.sent;
                settings = _ref5.settings;
                return _context3.abrupt("return", settings);

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function fetchServerSettings(_x5) {
        return _ref4.apply(this, arguments);
      }

      return fetchServerSettings;
    }()

    /**
     * Retrieve server capabilities information.
     *
     * @param  {Object}  [options={}] The request options.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "fetchServerCapabilities",
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var _ref7, capabilities;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.fetchServerInfo(options);

              case 2:
                _ref7 = _context4.sent;
                capabilities = _ref7.capabilities;
                return _context4.abrupt("return", capabilities);

              case 5:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function fetchServerCapabilities() {
        return _ref6.apply(this, arguments);
      }

      return fetchServerCapabilities;
    }()

    /**
     * Retrieve authenticated user information.
     *
     * @param  {Object}  [options={}] The request options.
     * @param  {Object}  [options.headers={}] Headers to use when making
     *     this request.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "fetchUser",
    value: function () {
      var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var _ref9, user;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this._getHello(options);

              case 2:
                _ref9 = _context5.sent;
                user = _ref9.user;
                return _context5.abrupt("return", user);

              case 5:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function fetchUser() {
        return _ref8.apply(this, arguments);
      }

      return fetchUser;
    }()

    /**
     * Retrieve authenticated user information.
     *
     * @param  {Object}  [options={}] The request options.
     * @param  {Number}  [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "fetchHTTPApiVersion",
    value: function () {
      var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var _ref11, http_api_version;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.fetchServerInfo(options);

              case 2:
                _ref11 = _context6.sent;
                http_api_version = _ref11.http_api_version;
                return _context6.abrupt("return", http_api_version);

              case 5:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function fetchHTTPApiVersion() {
        return _ref10.apply(this, arguments);
      }

      return fetchHTTPApiVersion;
    }()

    /**
     * Process batch requests, chunking them according to the batch_max_requests
     * server setting when needed.
     *
     * @param  {Array}  requests     The list of batch subrequests to perform.
     * @param  {Object} [options={}] The options object.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "_batchRequests",
    value: function () {
      var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(requests) {
        var _this2 = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var headers, serverSettings, maxRequests, chunks, _ref13, responses;

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                headers = this._getHeaders(options);

                if (requests.length) {
                  _context7.next = 3;
                  break;
                }

                return _context7.abrupt("return", []);

              case 3:
                _context7.next = 5;
                return this.fetchServerSettings({
                  retry: this._getRetry(options)
                });

              case 5:
                serverSettings = _context7.sent;
                maxRequests = serverSettings["batch_max_requests"];

                if (!(maxRequests && requests.length > maxRequests)) {
                  _context7.next = 10;
                  break;
                }

                chunks = (0, _utils.partition)(requests, maxRequests);
                return _context7.abrupt("return", (0, _utils.pMap)(chunks, function (chunk) {
                  return _this2._batchRequests(chunk, options);
                }));

              case 10:
                _context7.next = 12;
                return this.execute({
                  // FIXME: is this really necessary, since it's also present in
                  // the "defaults"?
                  headers: headers,
                  path: (0, _endpoint2.default)("batch"),
                  method: "POST",
                  body: {
                    defaults: { headers: headers },
                    requests: requests
                  }
                }, { retry: this._getRetry(options) });

              case 12:
                _ref13 = _context7.sent;
                responses = _ref13.responses;
                return _context7.abrupt("return", responses);

              case 15:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _batchRequests(_x9) {
        return _ref12.apply(this, arguments);
      }

      return _batchRequests;
    }()

    /**
     * Sends batch requests to the remote server.
     *
     * Note: Reserved for internal use only.
     *
     * @ignore
     * @param  {Function} fn                        The function to use for describing batch ops.
     * @param  {Object}   [options={}]              The options object.
     * @param  {Boolean}  [options.safe]            The safe option.
     * @param  {Number}   [options.retry]           The retry option.
     * @param  {String}   [options.bucket]          The bucket name option.
     * @param  {String}   [options.collection]      The collection name option.
     * @param  {Object}   [options.headers]         The headers object option.
     * @param  {Boolean}  [options.aggregate=false] Produces an aggregated result object.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "batch",
    value: function () {
      var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(fn) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var rootBatch, bucketBatch, collBatch, batchClient, responses;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                rootBatch = new KintoClientBase(this.remote, {
                  events: this.events,
                  batch: true,
                  safe: this._getSafe(options),
                  retry: this._getRetry(options)
                });
                bucketBatch = void 0, collBatch = void 0;

                if (options.bucket) {
                  bucketBatch = rootBatch.bucket(options.bucket);
                  if (options.collection) {
                    collBatch = bucketBatch.collection(options.collection);
                  }
                }
                batchClient = collBatch || bucketBatch || rootBatch;

                fn(batchClient);
                _context8.next = 7;
                return this._batchRequests(rootBatch._requests, options);

              case 7:
                responses = _context8.sent;

                if (!options.aggregate) {
                  _context8.next = 12;
                  break;
                }

                return _context8.abrupt("return", (0, _batch.aggregate)(responses, rootBatch._requests));

              case 12:
                return _context8.abrupt("return", responses);

              case 13:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function batch(_x11) {
        return _ref14.apply(this, arguments);
      }

      return batch;
    }()

    /**
     * Executes an atomic HTTP request.
     *
     * @private
     * @param  {Object}  request             The request object.
     * @param  {String}  request.path        The path to fetch, relative
     *     to the Kinto server root.
     * @param  {String}  [request.method="GET"] The method to use in the
     *     request.
     * @param  {Body}    [request.body]      The request body.
     * @param  {Object}  [request.headers={}] The request headers.
     * @param  {Object}  [options={}]        The options object.
     * @param  {Boolean} [options.raw=false] If true, resolve with full response
     * @param  {Boolean} [options.stringify=true] If true, serialize body data to
     * @param  {Number}  [options.retry=0]   The number of times to
     *     retry a request if the server responds with Retry-After.
     * JSON.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "execute",
    value: function () {
      var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(request) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var _options$raw, raw, _options$stringify, stringify, msg, result;

        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _options$raw = options.raw, raw = _options$raw === undefined ? false : _options$raw, _options$stringify = options.stringify, stringify = _options$stringify === undefined ? true : _options$stringify;
                // If we're within a batch, add the request to the stack to send at once.

                if (!this._isBatch) {
                  _context9.next = 5;
                  break;
                }

                this._requests.push(request);
                // Resolve with a message in case people attempt at consuming the result
                // from within a batch operation.
                msg = "This result is generated from within a batch " + "operation and should not be consumed.";
                return _context9.abrupt("return", raw ? { json: msg, headers: {
                    get: function get() {}
                  } } : msg);

              case 5:
                _context9.next = 7;
                return this.http.request(this.remote + request.path, (0, _utils.cleanUndefinedProperties)({
                  // Limit requests to only those parts that would be allowed in
                  // a batch request -- don't pass through other fancy fetch()
                  // options like integrity, redirect, mode because they will
                  // break on a batch request.  A batch request only allows
                  // headers, method, path (above), and body.
                  method: request.method,
                  headers: request.headers,
                  body: stringify ? JSON.stringify(request.body) : request.body
                }), { retry: this._getRetry(options) });

              case 7:
                result = _context9.sent;
                return _context9.abrupt("return", raw ? result : result.json);

              case 9:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function execute(_x13) {
        return _ref15.apply(this, arguments);
      }

      return execute;
    }()

    /**
     * Fetch some pages from a paginated list, following the `next-page`
     * header automatically until we have fetched the requested number
     * of pages. Return a response with a `.next()` method that can be
     * called to fetch more results.
     *
     * @private
     * @param  {String}  path
     *     The path to make the request to.
     * @param  {Object}  params
     *     The parameters to use when making the request.
     * @param  {String}  [params.sort="-last_modified"]
     *     The sorting order to use when fetching.
     * @param  {Object}  [params.filters={}]
     *     The filters to send in the request.
     * @param  {Number}  [params.limit=undefined]
     *     The limit to send in the request. Undefined means no limit.
     * @param  {Number}  [params.pages=undefined]
     *     The number of pages to fetch. Undefined means one page. Pass
     *     Infinity to fetch everything.
     * @param  {String}  [params.since=undefined]
     *     The ETag from which to start fetching.
     * @param  {Object}  [options={}]
     *     Additional request-level parameters to use in all requests.
     * @param  {Object}  [options.headers={}]
     *     Headers to use during all requests.
     * @param  {Number}  [options.retry=0]
     *     Number of times to retry each request if the server responds
     *     with Retry-After.
     */

  }, {
    key: "paginatedList",
    value: function () {
      var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(path, params) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        var _sort$params, sort, filters, limit, pages, since, querystring, results, current, next, processNextPage, pageResults, handleResponse;

        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                // FIXME: this is called even in batch requests, which doesn't
                // make any sense (since all batch requests get a "dummy"
                // response; see execute() above).
                _sort$params = _extends({
                  sort: "-last_modified"
                }, params), sort = _sort$params.sort, filters = _sort$params.filters, limit = _sort$params.limit, pages = _sort$params.pages, since = _sort$params.since;
                // Safety/Consistency check on ETag value.

                if (!(since && typeof since !== "string")) {
                  _context13.next = 3;
                  break;
                }

                throw new Error("Invalid value for since (" + since + "), should be ETag value.");

              case 3:
                querystring = (0, _utils.qsify)(_extends({}, filters, {
                  _sort: sort,
                  _limit: limit,
                  _since: since
                }));
                results = [], current = 0;

                next = function () {
                  var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(nextPage) {
                    return regeneratorRuntime.wrap(function _callee10$(_context10) {
                      while (1) {
                        switch (_context10.prev = _context10.next) {
                          case 0:
                            if (nextPage) {
                              _context10.next = 2;
                              break;
                            }

                            throw new Error("Pagination exhausted.");

                          case 2:
                            return _context10.abrupt("return", processNextPage(nextPage));

                          case 3:
                          case "end":
                            return _context10.stop();
                        }
                      }
                    }, _callee10, this);
                  }));

                  return function next(_x18) {
                    return _ref17.apply(this, arguments);
                  };
                }();

                processNextPage = function () {
                  var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(nextPage) {
                    var headers;
                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            headers = options.headers;
                            _context11.t0 = handleResponse;
                            _context11.next = 4;
                            return this.http.request(nextPage, { headers: headers });

                          case 4:
                            _context11.t1 = _context11.sent;
                            return _context11.abrupt("return", (0, _context11.t0)(_context11.t1));

                          case 6:
                          case "end":
                            return _context11.stop();
                        }
                      }
                    }, _callee11, this);
                  }));

                  return function (_x19) {
                    return _ref18.apply(this, arguments);
                  };
                }().bind(this);

                pageResults = function pageResults(results, nextPage, etag, totalRecords) {
                  // ETag string is supposed to be opaque and stored «as-is».
                  // ETag header values are quoted (because of * and W/"foo").
                  return {
                    last_modified: etag ? etag.replace(/"/g, "") : etag,
                    data: results,
                    next: next.bind(null, nextPage),
                    hasNextPage: !!nextPage,
                    totalRecords: totalRecords
                  };
                };

                handleResponse = function () {
                  var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(_ref20) {
                    var headers = _ref20.headers,
                        json = _ref20.json;
                    var nextPage, etag, totalRecords;
                    return regeneratorRuntime.wrap(function _callee12$(_context12) {
                      while (1) {
                        switch (_context12.prev = _context12.next) {
                          case 0:
                            nextPage = headers.get("Next-Page");
                            etag = headers.get("ETag");
                            totalRecords = parseInt(headers.get("Total-Records"), 10);

                            if (pages) {
                              _context12.next = 5;
                              break;
                            }

                            return _context12.abrupt("return", pageResults(json.data, nextPage, etag, totalRecords));

                          case 5:
                            // Aggregate new results with previous ones
                            results = results.concat(json.data);
                            current += 1;

                            if (!(current >= pages || !nextPage)) {
                              _context12.next = 9;
                              break;
                            }

                            return _context12.abrupt("return", pageResults(results, nextPage, etag, totalRecords));

                          case 9:
                            return _context12.abrupt("return", processNextPage(nextPage));

                          case 10:
                          case "end":
                            return _context12.stop();
                        }
                      }
                    }, _callee12, this);
                  }));

                  return function handleResponse(_x20) {
                    return _ref19.apply(this, arguments);
                  };
                }();

                _context13.t0 = handleResponse;
                _context13.next = 12;
                return this.execute(
                // N.B.: This doesn't use _getHeaders, because all calls to
                // `paginatedList` are assumed to come from calls that already
                // have headers merged at e.g. the bucket or collection level.
                { headers: options.headers, path: path + "?" + querystring },
                // N.B. This doesn't use _getRetry, because all calls to
                // `paginatedList` are assumed to come from calls that already
                // used `_getRetry` at e.g. the bucket or collection level.
                { raw: true, retry: options.retry || 0 });

              case 12:
                _context13.t1 = _context13.sent;
                return _context13.abrupt("return", (0, _context13.t0)(_context13.t1));

              case 14:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function paginatedList(_x15, _x16) {
        return _ref16.apply(this, arguments);
      }

      return paginatedList;
    }()

    /**
     * Lists all permissions.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers={}] Headers to use when making
     *     this request.
     * @param  {Number} [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object[], Error>}
     */

  }, {
    key: "listPermissions",
    value: function () {
      var _ref21 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path, paginationOptions;
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                path = (0, _endpoint2.default)("permissions");
                // Ensure the default sort parameter is something that exists in permissions
                // entries, as `last_modified` doesn't; here, we pick "id".

                paginationOptions = _extends({ sort: "id" }, options);
                return _context14.abrupt("return", this.paginatedList(path, paginationOptions, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 3:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function listPermissions() {
        return _ref21.apply(this, arguments);
      }

      return listPermissions;
    }()

    /**
     * Retrieves the list of buckets.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers={}] Headers to use when making
     *     this request.
     * @param  {Number} [options.retry=0]    Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object[], Error>}
     */

  }, {
    key: "listBuckets",
    value: function () {
      var _ref22 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                path = (0, _endpoint2.default)("bucket");
                return _context15.abrupt("return", this.paginatedList(path, options, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 2:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function listBuckets() {
        return _ref22.apply(this, arguments);
      }

      return listBuckets;
    }()

    /**
     * Creates a new bucket on the server.
     *
     * @param  {String|null}  id                The bucket name (optional).
     * @param  {Object}       [options={}]      The options object.
     * @param  {Boolean}      [options.data]    The bucket data option.
     * @param  {Boolean}      [options.safe]    The safe option.
     * @param  {Object}       [options.headers] The headers object option.
     * @param  {Number}       [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "createBucket",
    value: function () {
      var _ref23 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(id) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var _options$data, data, permissions, path;

        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                _options$data = options.data, data = _options$data === undefined ? {} : _options$data, permissions = options.permissions;

                if (id != null) {
                  data.id = id;
                }
                path = data.id ? (0, _endpoint2.default)("bucket", data.id) : (0, _endpoint2.default)("bucket");
                return _context16.abrupt("return", this.execute(requests.createRequest(path, { data: data, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                }), { retry: this._getRetry(options) }));

              case 4:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function createBucket(_x23) {
        return _ref23.apply(this, arguments);
      }

      return createBucket;
    }()

    /**
     * Deletes a bucket from the server.
     *
     * @ignore
     * @param  {Object|String} bucket                  The bucket to delete.
     * @param  {Object}        [options={}]            The options object.
     * @param  {Boolean}       [options.safe]          The safe option.
     * @param  {Object}        [options.headers]       The headers object option.
     * @param  {Number}        [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Number}        [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "deleteBucket",
    value: function () {
      var _ref24 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(bucket) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var bucketObj, path, _bucketObj$options, last_modified;

        return regeneratorRuntime.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                bucketObj = (0, _utils.toDataBody)(bucket);

                if (bucketObj.id) {
                  _context17.next = 3;
                  break;
                }

                throw new Error("A bucket id is required.");

              case 3:
                path = (0, _endpoint2.default)("bucket", bucketObj.id);
                _bucketObj$options = _extends({}, bucketObj, options), last_modified = _bucketObj$options.last_modified;
                return _context17.abrupt("return", this.execute(requests.deleteRequest(path, {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                }), { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function deleteBucket(_x25) {
        return _ref24.apply(this, arguments);
      }

      return deleteBucket;
    }()

    /**
     * Deletes all buckets on the server.
     *
     * @ignore
     * @param  {Object}  [options={}]            The options object.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "deleteBuckets",
    value: function () {
      var _ref25 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                path = (0, _endpoint2.default)("bucket");
                return _context18.abrupt("return", this.execute(requests.deleteRequest(path, {
                  last_modified: options.last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                }), { retry: this._getRetry(options) }));

              case 2:
              case "end":
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function deleteBuckets() {
        return _ref25.apply(this, arguments);
      }

      return deleteBuckets;
    }()
  }, {
    key: "remote",
    get: function get() {
      return this._remote;
    }

    /**
     * @ignore
     */
    ,
    set: function set(url) {
      var version = void 0;
      try {
        version = url.match(/\/(v\d+)\/?$/)[1];
      } catch (err) {
        throw new Error("The remote URL must contain the version: " + url);
      }
      if (version !== SUPPORTED_PROTOCOL_VERSION) {
        throw new Error("Unsupported protocol version: " + version);
      }
      this._remote = url;
      this._version = version;
    }

    /**
     * The current server protocol version, eg. `v1`.
     * @type {String}
     */

  }, {
    key: "version",
    get: function get() {
      return this._version;
    }

    /**
     * Backoff remaining time, in milliseconds. Defaults to zero if no backoff is
     * ongoing.
     *
     * @type {Number}
     */

  }, {
    key: "backoff",
    get: function get() {
      var currentTime = new Date().getTime();
      if (this._backoffReleaseTime && currentTime < this._backoffReleaseTime) {
        return this._backoffReleaseTime - currentTime;
      }
      return 0;
    }
  }]);

  return KintoClientBase;
}(), (_applyDecoratedDescriptor(_class.prototype, "fetchServerSettings", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "fetchServerSettings"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "fetchServerCapabilities", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "fetchServerCapabilities"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "fetchUser", [_dec3], Object.getOwnPropertyDescriptor(_class.prototype, "fetchUser"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "fetchHTTPApiVersion", [_dec4], Object.getOwnPropertyDescriptor(_class.prototype, "fetchHTTPApiVersion"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "batch", [_dec5], Object.getOwnPropertyDescriptor(_class.prototype, "batch"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "listPermissions", [_dec6], Object.getOwnPropertyDescriptor(_class.prototype, "listPermissions"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "deleteBuckets", [_dec7], Object.getOwnPropertyDescriptor(_class.prototype, "deleteBuckets"), _class.prototype)), _class));
exports.default = KintoClientBase;
},{"./batch":4,"./bucket":5,"./endpoint":7,"./http":9,"./requests":11,"./utils":12}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.aggregate = aggregate;
/**
 * Exports batch responses as a result object.
 *
 * @private
 * @param  {Array} responses The batch subrequest responses.
 * @param  {Array} requests  The initial issued requests.
 * @return {Object}
 */
function aggregate() {
  var responses = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var requests = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  if (responses.length !== requests.length) {
    throw new Error("Responses length should match requests one.");
  }
  var results = {
    errors: [],
    published: [],
    conflicts: [],
    skipped: []
  };
  return responses.reduce(function (acc, response, index) {
    var status = response.status;

    var request = requests[index];
    if (status >= 200 && status < 400) {
      acc.published.push(response.body);
    } else if (status === 404) {
      // Extract the id manually from request path while waiting for Kinto/kinto#818
      var regex = /(buckets|groups|collections|records)\/([^\/]+)$/;
      var extracts = request.path.match(regex);
      var id = extracts.length === 3 ? extracts[2] : undefined;
      acc.skipped.push({
        id: id,
        path: request.path,
        error: response.body
      });
    } else if (status === 412) {
      acc.conflicts.push({
        // XXX: specifying the type is probably superfluous
        type: "outgoing",
        local: request.body,
        remote: response.body.details && response.body.details.existing || null
      });
    } else {
      acc.errors.push({
        path: request.path,
        sent: request,
        error: response.body
      });
    }
    return acc;
  }, results);
}
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _desc, _value, _class;

var _utils = require("./utils");

var _collection = require("./collection");

var _collection2 = _interopRequireDefault(_collection);

var _requests = require("./requests");

var requests = _interopRequireWildcard(_requests);

var _endpoint = require("./endpoint");

var _endpoint2 = _interopRequireDefault(_endpoint);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

/**
 * Abstract representation of a selected bucket.
 *
 */
var Bucket = (_dec = (0, _utils.capable)(["history"]), (_class = function () {
  /**
   * Constructor.
   *
   * @param  {KintoClient} client            The client instance.
   * @param  {String}      name              The bucket name.
   * @param  {Object}      [options={}]      The headers object option.
   * @param  {Object}      [options.headers] The headers object option.
   * @param  {Boolean}     [options.safe]    The safe option.
   * @param  {Number}      [options.retry]   The retry option.
   */
  function Bucket(client, name) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Bucket);

    /**
     * @ignore
     */
    this.client = client;
    /**
     * The bucket name.
     * @type {String}
     */
    this.name = name;
    /**
     * @ignore
     */
    this._isBatch = !!options.batch;
    /**
     * @ignore
     */
    this._headers = options.headers || {};
    this._retry = options.retry || 0;
    this._safe = !!options.safe;
  }

  /**
   * Get the value of "headers" for a given request, merging the
   * per-request headers with our own "default" headers.
   *
   * @private
   */


  _createClass(Bucket, [{
    key: "_getHeaders",
    value: function _getHeaders(options) {
      return _extends({}, this._headers, options.headers);
    }

    /**
     * Get the value of "safe" for a given request, using the
     * per-request option if present or falling back to our default
     * otherwise.
     *
     * @private
     * @param {Object} options The options for a request.
     * @returns {Boolean}
     */

  }, {
    key: "_getSafe",
    value: function _getSafe(options) {
      return _extends({ safe: this._safe }, options).safe;
    }

    /**
     * As _getSafe, but for "retry".
     *
     * @private
     */

  }, {
    key: "_getRetry",
    value: function _getRetry(options) {
      return _extends({ retry: this._retry }, options).retry;
    }

    /**
     * Selects a collection.
     *
     * @param  {String}  name              The collection name.
     * @param  {Object}  [options={}]      The options object.
     * @param  {Object}  [options.headers] The headers object option.
     * @param  {Boolean} [options.safe]    The safe option.
     * @return {Collection}
     */

  }, {
    key: "collection",
    value: function collection(name) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _collection2.default(this.client, this, name, {
        batch: this._isBatch,
        headers: this._getHeaders(options),
        retry: this._getRetry(options),
        safe: this._getSafe(options)
      });
    }

    /**
     * Retrieves bucket data.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getData",
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var request, _ref2, data;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                request = {
                  headers: this._getHeaders(options),
                  path: (0, _endpoint2.default)("bucket", this.name)
                };
                _context.next = 3;
                return this.client.execute(request, {
                  retry: this._getRetry(options)
                });

              case 3:
                _ref2 = _context.sent;
                data = _ref2.data;
                return _context.abrupt("return", data);

              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getData() {
        return _ref.apply(this, arguments);
      }

      return getData;
    }()

    /**
     * Set bucket data.
     * @param  {Object}  data                    The bucket data object.
     * @param  {Object}  [options={}]            The options object.
     * @param  {Object}  [options.headers={}]    The headers object option.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean} [options.patch]         The patch option.
     * @param  {Number}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "setData",
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(data) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var bucket, bucketId, path, patch, permissions, _data$options, last_modified, request;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if ((0, _utils.isObject)(data)) {
                  _context2.next = 2;
                  break;
                }

                throw new Error("A bucket object is required.");

              case 2:
                bucket = _extends({}, data, { id: this.name });

                // For default bucket, we need to drop the id from the data object.
                // Bug in Kinto < 3.1.1

                bucketId = bucket.id;

                if (bucket.id === "default") {
                  delete bucket.id;
                }

                path = (0, _endpoint2.default)("bucket", bucketId);
                patch = options.patch, permissions = options.permissions;
                _data$options = _extends({}, data, options), last_modified = _data$options.last_modified;
                request = requests.updateRequest(path, { data: bucket, permissions: permissions }, {
                  last_modified: last_modified,
                  patch: patch,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context2.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 10:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function setData(_x4) {
        return _ref3.apply(this, arguments);
      }

      return setData;
    }()

    /**
     * Retrieves the list of history entries in the current bucket.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Array<Object>, Error>}
     */

  }, {
    key: "listHistory",
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                path = (0, _endpoint2.default)("history", this.name);
                return _context3.abrupt("return", this.client.paginatedList(path, options, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 2:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function listHistory() {
        return _ref4.apply(this, arguments);
      }

      return listHistory;
    }()

    /**
     * Retrieves the list of collections in the current bucket.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Array<Object>, Error>}
     */

  }, {
    key: "listCollections",
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                path = (0, _endpoint2.default)("collection", this.name);
                return _context4.abrupt("return", this.client.paginatedList(path, options, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 2:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function listCollections() {
        return _ref5.apply(this, arguments);
      }

      return listCollections;
    }()

    /**
     * Creates a new collection in current bucket.
     *
     * @param  {String|undefined}  id          The collection id.
     * @param  {Object}  [options={}]          The options object.
     * @param  {Boolean} [options.safe]        The safe option.
     * @param  {Object}  [options.headers]     The headers object option.
     * @param  {Number}  [options.retry=0]     Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.permissions] The permissions object.
     * @param  {Object}  [options.data]        The data object.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "createCollection",
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(id) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var permissions, _options$data, data, path, request;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                permissions = options.permissions, _options$data = options.data, data = _options$data === undefined ? {} : _options$data;

                data.id = id;
                path = (0, _endpoint2.default)("collection", this.name, id);
                request = requests.createRequest(path, { data: data, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context5.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 5:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function createCollection(_x8) {
        return _ref6.apply(this, arguments);
      }

      return createCollection;
    }()

    /**
     * Deletes a collection from the current bucket.
     *
     * @param  {Object|String} collection              The collection to delete.
     * @param  {Object}        [options={}]            The options object.
     * @param  {Object}        [options.headers]       The headers object option.
     * @param  {Number}        [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean}       [options.safe]          The safe option.
     * @param  {Number}        [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "deleteCollection",
    value: function () {
      var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(collection) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var collectionObj, id, _collectionObj$option, last_modified, path, request;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                collectionObj = (0, _utils.toDataBody)(collection);

                if (collectionObj.id) {
                  _context6.next = 3;
                  break;
                }

                throw new Error("A collection id is required.");

              case 3:
                id = collectionObj.id;
                _collectionObj$option = _extends({}, collectionObj, options), last_modified = _collectionObj$option.last_modified;
                path = (0, _endpoint2.default)("collection", this.name, id);
                request = requests.deleteRequest(path, {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context6.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 8:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function deleteCollection(_x10) {
        return _ref7.apply(this, arguments);
      }

      return deleteCollection;
    }()

    /**
     * Retrieves the list of groups in the current bucket.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Array<Object>, Error>}
     */

  }, {
    key: "listGroups",
    value: function () {
      var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                path = (0, _endpoint2.default)("group", this.name);
                return _context7.abrupt("return", this.client.paginatedList(path, options, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 2:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function listGroups() {
        return _ref8.apply(this, arguments);
      }

      return listGroups;
    }()

    /**
     * Creates a new group in current bucket.
     *
     * @param  {String} id                The group id.
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getGroup",
    value: function () {
      var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(id) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var request;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                request = {
                  headers: this._getHeaders(options),
                  path: (0, _endpoint2.default)("group", this.name, id)
                };
                return _context8.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 2:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function getGroup(_x13) {
        return _ref9.apply(this, arguments);
      }

      return getGroup;
    }()

    /**
     * Creates a new group in current bucket.
     *
     * @param  {String|undefined}  id                    The group id.
     * @param  {Array<String>}     [members=[]]          The list of principals.
     * @param  {Object}            [options={}]          The options object.
     * @param  {Object}            [options.data]        The data object.
     * @param  {Object}            [options.permissions] The permissions object.
     * @param  {Boolean}           [options.safe]        The safe option.
     * @param  {Object}            [options.headers]     The headers object option.
     * @param  {Number}            [options.retry=0]     Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "createGroup",
    value: function () {
      var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(id) {
        var members = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        var data, path, permissions, request;
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                data = _extends({}, options.data, {
                  id: id,
                  members: members
                });
                path = (0, _endpoint2.default)("group", this.name, id);
                permissions = options.permissions;
                request = requests.createRequest(path, { data: data, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context9.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 5:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function createGroup(_x15) {
        return _ref10.apply(this, arguments);
      }

      return createGroup;
    }()

    /**
     * Updates an existing group in current bucket.
     *
     * @param  {Object}  group                   The group object.
     * @param  {Object}  [options={}]            The options object.
     * @param  {Object}  [options.data]          The data object.
     * @param  {Object}  [options.permissions]   The permissions object.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Number}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "updateGroup",
    value: function () {
      var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(group) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var data, path, patch, permissions, _data$options2, last_modified, request;

        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                if ((0, _utils.isObject)(group)) {
                  _context10.next = 2;
                  break;
                }

                throw new Error("A group object is required.");

              case 2:
                if (group.id) {
                  _context10.next = 4;
                  break;
                }

                throw new Error("A group id is required.");

              case 4:
                data = _extends({}, options.data, group);
                path = (0, _endpoint2.default)("group", this.name, group.id);
                patch = options.patch, permissions = options.permissions;
                _data$options2 = _extends({}, data, options), last_modified = _data$options2.last_modified;
                request = requests.updateRequest(path, { data: data, permissions: permissions }, {
                  last_modified: last_modified,
                  patch: patch,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context10.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 10:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function updateGroup(_x18) {
        return _ref11.apply(this, arguments);
      }

      return updateGroup;
    }()

    /**
     * Deletes a group from the current bucket.
     *
     * @param  {Object|String} group                   The group to delete.
     * @param  {Object}        [options={}]            The options object.
     * @param  {Object}        [options.headers]       The headers object option.
     * @param  {Number}        [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean}       [options.safe]          The safe option.
     * @param  {Number}        [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "deleteGroup",
    value: function () {
      var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(group) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var groupObj, id, _groupObj$options, last_modified, path, request;

        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                groupObj = (0, _utils.toDataBody)(group);
                id = groupObj.id;
                _groupObj$options = _extends({}, groupObj, options), last_modified = _groupObj$options.last_modified;
                path = (0, _endpoint2.default)("group", this.name, id);
                request = requests.deleteRequest(path, {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context11.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function deleteGroup(_x20) {
        return _ref12.apply(this, arguments);
      }

      return deleteGroup;
    }()

    /**
     * Retrieves the list of permissions for this bucket.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getPermissions",
    value: function () {
      var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var request, _ref14, permissions;

        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                request = {
                  headers: this._getHeaders(options),
                  path: (0, _endpoint2.default)("bucket", this.name)
                };
                _context12.next = 3;
                return this.client.execute(request, {
                  retry: this._getRetry(options)
                });

              case 3:
                _ref14 = _context12.sent;
                permissions = _ref14.permissions;
                return _context12.abrupt("return", permissions);

              case 6:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function getPermissions() {
        return _ref13.apply(this, arguments);
      }

      return getPermissions;
    }()

    /**
     * Replaces all existing bucket permissions with the ones provided.
     *
     * @param  {Object}  permissions             The permissions object.
     * @param  {Object}  [options={}]            The options object
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers={}]    The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "setPermissions",
    value: function () {
      var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, last_modified, data, request;
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context13.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("bucket", this.name);
                last_modified = options.last_modified;
                data = { last_modified: last_modified };
                request = requests.updateRequest(path, { data: data, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context13.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 7:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function setPermissions(_x23) {
        return _ref15.apply(this, arguments);
      }

      return setPermissions;
    }()

    /**
     * Append principals to the bucket permissions.
     *
     * @param  {Object}  permissions             The permissions object.
     * @param  {Object}  [options={}]            The options object
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "addPermissions",
    value: function () {
      var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, last_modified, request;
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context14.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("bucket", this.name);
                last_modified = options.last_modified;
                request = requests.jsonPatchPermissionsRequest(path, permissions, "add", {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context14.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function addPermissions(_x25) {
        return _ref16.apply(this, arguments);
      }

      return addPermissions;
    }()

    /**
     * Remove principals from the bucket permissions.
     *
     * @param  {Object}  permissions             The permissions object.
     * @param  {Object}  [options={}]            The options object
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "removePermissions",
    value: function () {
      var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, last_modified, request;
        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context15.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("bucket", this.name);
                last_modified = options.last_modified;
                request = requests.jsonPatchPermissionsRequest(path, permissions, "remove", {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context15.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function removePermissions(_x27) {
        return _ref17.apply(this, arguments);
      }

      return removePermissions;
    }()

    /**
     * Performs batch operations at the current bucket level.
     *
     * @param  {Function} fn                   The batch operation function.
     * @param  {Object}   [options={}]         The options object.
     * @param  {Object}   [options.headers]    The headers object option.
     * @param  {Boolean}  [options.safe]       The safe option.
     * @param  {Number}   [options.retry=0]    The retry option.
     * @param  {Boolean}  [options.aggregate]  Produces a grouped result object.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "batch",
    value: function () {
      var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(fn) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                return _context16.abrupt("return", this.client.batch(fn, {
                  bucket: this.name,
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options),
                  safe: this._getSafe(options),
                  aggregate: !!options.aggregate
                }));

              case 1:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function batch(_x29) {
        return _ref18.apply(this, arguments);
      }

      return batch;
    }()
  }]);

  return Bucket;
}(), (_applyDecoratedDescriptor(_class.prototype, "listHistory", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "listHistory"), _class.prototype)), _class));
exports.default = Bucket;
},{"./collection":6,"./endpoint":7,"./requests":11,"./utils":12}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _dec2, _dec3, _desc, _value, _class;

var _uuid = require("uuid");

var _utils = require("./utils");

var _requests = require("./requests");

var requests = _interopRequireWildcard(_requests);

var _endpoint = require("./endpoint");

var _endpoint2 = _interopRequireDefault(_endpoint);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

/**
 * Abstract representation of a selected collection.
 *
 */
var Collection = (_dec = (0, _utils.capable)(["attachments"]), _dec2 = (0, _utils.capable)(["attachments"]), _dec3 = (0, _utils.capable)(["history"]), (_class = function () {
  /**
   * Constructor.
   *
   * @param  {KintoClient}  client            The client instance.
   * @param  {Bucket}       bucket            The bucket instance.
   * @param  {String}       name              The collection name.
   * @param  {Object}       [options={}]      The options object.
   * @param  {Object}       [options.headers] The headers object option.
   * @param  {Boolean}      [options.safe]    The safe option.
   * @param  {Number}       [options.retry]   The retry option.
   * @param  {Boolean}      [options.batch]   (Private) Whether this
   *     Collection is operating as part of a batch.
   */
  function Collection(client, bucket, name) {
    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    _classCallCheck(this, Collection);

    /**
     * @ignore
     */
    this.client = client;
    /**
     * @ignore
     */
    this.bucket = bucket;
    /**
     * The collection name.
     * @type {String}
     */
    this.name = name;

    /**
     * @ignore
     */
    this._isBatch = !!options.batch;

    /**
     * @ignore
     */
    this._retry = options.retry || 0;
    this._safe = !!options.safe;
    // FIXME: This is kind of ugly; shouldn't the bucket be responsible
    // for doing the merge?
    this._headers = _extends({}, this.bucket._headers, options.headers);
  }

  /**
   * Get the value of "headers" for a given request, merging the
   * per-request headers with our own "default" headers.
   *
   * @private
   */


  _createClass(Collection, [{
    key: "_getHeaders",
    value: function _getHeaders(options) {
      return _extends({}, this._headers, options.headers);
    }

    /**
     * Get the value of "safe" for a given request, using the
     * per-request option if present or falling back to our default
     * otherwise.
     *
     * @private
     * @param {Object} options The options for a request.
     * @returns {Boolean}
     */

  }, {
    key: "_getSafe",
    value: function _getSafe(options) {
      return _extends({ safe: this._safe }, options).safe;
    }

    /**
     * As _getSafe, but for "retry".
     *
     * @private
     */

  }, {
    key: "_getRetry",
    value: function _getRetry(options) {
      return _extends({ retry: this._retry }, options).retry;
    }

    /**
     * Retrieves the total number of records in this collection.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Number, Error>}
     */

  }, {
    key: "getTotalRecords",
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var path, request, _ref2, headers;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name);
                request = {
                  headers: this._getHeaders(options),
                  path: path,
                  method: "HEAD"
                };
                _context.next = 4;
                return this.client.execute(request, {
                  raw: true,
                  retry: this._getRetry(options)
                });

              case 4:
                _ref2 = _context.sent;
                headers = _ref2.headers;
                return _context.abrupt("return", parseInt(headers.get("Total-Records"), 10));

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getTotalRecords() {
        return _ref.apply(this, arguments);
      }

      return getTotalRecords;
    }()

    /**
     * Retrieves collection data.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getData",
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var path, request, _ref4, data;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                request = { headers: this._getHeaders(options), path: path };
                _context2.next = 4;
                return this.client.execute(request, {
                  retry: this._getRetry(options)
                });

              case 4:
                _ref4 = _context2.sent;
                data = _ref4.data;
                return _context2.abrupt("return", data);

              case 7:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getData() {
        return _ref3.apply(this, arguments);
      }

      return getData;
    }()

    /**
     * Set collection data.
     * @param  {Object}   data                    The collection data object.
     * @param  {Object}   [options={}]            The options object.
     * @param  {Object}   [options.headers]       The headers object option.
     * @param  {Number}   [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean}  [options.safe]          The safe option.
     * @param  {Boolean}  [options.patch]         The patch option.
     * @param  {Number}   [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "setData",
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(data) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var patch, permissions, _data$options, last_modified, path, request;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if ((0, _utils.isObject)(data)) {
                  _context3.next = 2;
                  break;
                }

                throw new Error("A collection object is required.");

              case 2:
                patch = options.patch, permissions = options.permissions;
                _data$options = _extends({}, data, options), last_modified = _data$options.last_modified;
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                request = requests.updateRequest(path, { data: data, permissions: permissions }, {
                  last_modified: last_modified,
                  patch: patch,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context3.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 7:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function setData(_x4) {
        return _ref5.apply(this, arguments);
      }

      return setData;
    }()

    /**
     * Retrieves the list of permissions for this collection.
     *
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getPermissions",
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var path, request, _ref7, permissions;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                request = { headers: this._getHeaders(options), path: path };
                _context4.next = 4;
                return this.client.execute(request, {
                  retry: this._getRetry(options)
                });

              case 4:
                _ref7 = _context4.sent;
                permissions = _ref7.permissions;
                return _context4.abrupt("return", permissions);

              case 7:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getPermissions() {
        return _ref6.apply(this, arguments);
      }

      return getPermissions;
    }()

    /**
     * Replaces all existing collection permissions with the ones provided.
     *
     * @param  {Object}   permissions             The permissions object.
     * @param  {Object}   [options={}]            The options object
     * @param  {Object}   [options.headers]       The headers object option.
     * @param  {Number}   [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean}  [options.safe]          The safe option.
     * @param  {Number}   [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "setPermissions",
    value: function () {
      var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, data, request;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context5.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                data = { last_modified: options.last_modified };
                request = requests.updateRequest(path, { data: data, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context5.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function setPermissions(_x7) {
        return _ref8.apply(this, arguments);
      }

      return setPermissions;
    }()

    /**
     * Append principals to the collection permissions.
     *
     * @param  {Object}  permissions             The permissions object.
     * @param  {Object}  [options={}]            The options object
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "addPermissions",
    value: function () {
      var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, last_modified, request;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context6.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                last_modified = options.last_modified;
                request = requests.jsonPatchPermissionsRequest(path, permissions, "add", {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context6.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function addPermissions(_x9) {
        return _ref9.apply(this, arguments);
      }

      return addPermissions;
    }()

    /**
     * Remove principals from the collection permissions.
     *
     * @param  {Object}  permissions             The permissions object.
     * @param  {Object}  [options={}]            The options object
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}  [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "removePermissions",
    value: function () {
      var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(permissions) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, last_modified, request;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if ((0, _utils.isObject)(permissions)) {
                  _context7.next = 2;
                  break;
                }

                throw new Error("A permissions object is required.");

              case 2:
                path = (0, _endpoint2.default)("collection", this.bucket.name, this.name);
                last_modified = options.last_modified;
                request = requests.jsonPatchPermissionsRequest(path, permissions, "remove", {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context7.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 6:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function removePermissions(_x11) {
        return _ref10.apply(this, arguments);
      }

      return removePermissions;
    }()

    /**
     * Creates a record in current collection.
     *
     * @param  {Object}  record                The record to create.
     * @param  {Object}  [options={}]          The options object.
     * @param  {Object}  [options.headers]     The headers object option.
     * @param  {Number}  [options.retry=0]     Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean} [options.safe]        The safe option.
     * @param  {Object}  [options.permissions] The permissions option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "createRecord",
    value: function () {
      var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(record) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var permissions, path, request;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                permissions = options.permissions;
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name, record.id);
                request = requests.createRequest(path, { data: record, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context8.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 4:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function createRecord(_x13) {
        return _ref11.apply(this, arguments);
      }

      return createRecord;
    }()

    /**
     * Adds an attachment to a record, creating the record when it doesn't exist.
     *
     * @param  {String}  dataURL                 The data url.
     * @param  {Object}  [record={}]             The record data.
     * @param  {Object}  [options={}]            The options object.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Number}  [options.last_modified] The last_modified option.
     * @param  {Object}  [options.permissions]   The permissions option.
     * @param  {String}  [options.filename]      Force the attachment filename.
     * @param  {String}  [options.gzipped]       Force the attachment to be gzipped or not.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "addAttachment",
    value: function () {
      var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(dataURI) {
        var record = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        var permissions, id, path, _record$options, last_modified, addAttachmentRequest;

        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                permissions = options.permissions;
                id = record.id || _uuid.v4.v4();
                path = (0, _endpoint2.default)("attachment", this.bucket.name, this.name, id);
                _record$options = _extends({}, record, options), last_modified = _record$options.last_modified;
                addAttachmentRequest = requests.addAttachmentRequest(path, dataURI, { data: record, permissions: permissions }, {
                  last_modified: last_modified,
                  filename: options.filename,
                  gzipped: options.gzipped,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                _context9.next = 7;
                return this.client.execute(addAttachmentRequest, {
                  stringify: false,
                  retry: this._getRetry(options)
                });

              case 7:
                return _context9.abrupt("return", this.getRecord(id));

              case 8:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function addAttachment(_x15) {
        return _ref12.apply(this, arguments);
      }

      return addAttachment;
    }()

    /**
     * Removes an attachment from a given record.
     *
     * @param  {Object}  recordId                The record id.
     * @param  {Object}  [options={}]            The options object.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Number}  [options.last_modified] The last_modified option.
     */

  }, {
    key: "removeAttachment",
    value: function () {
      var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(recordId) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var last_modified, path, request;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                last_modified = options.last_modified;
                path = (0, _endpoint2.default)("attachment", this.bucket.name, this.name, recordId);
                request = requests.deleteRequest(path, {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context10.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 4:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function removeAttachment(_x18) {
        return _ref13.apply(this, arguments);
      }

      return removeAttachment;
    }()

    /**
     * Updates a record in current collection.
     *
     * @param  {Object}  record                  The record to update.
     * @param  {Object}  [options={}]            The options object.
     * @param  {Object}  [options.headers]       The headers object option.
     * @param  {Number}  [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean} [options.safe]          The safe option.
     * @param  {Number}  [options.last_modified] The last_modified option.
     * @param  {Object}  [options.permissions]   The permissions option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "updateRecord",
    value: function () {
      var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(record) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var permissions, _record$options2, last_modified, path, request;

        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                if ((0, _utils.isObject)(record)) {
                  _context11.next = 2;
                  break;
                }

                throw new Error("A record object is required.");

              case 2:
                if (record.id) {
                  _context11.next = 4;
                  break;
                }

                throw new Error("A record id is required.");

              case 4:
                permissions = options.permissions;
                _record$options2 = _extends({}, record, options), last_modified = _record$options2.last_modified;
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name, record.id);
                request = requests.updateRequest(path, { data: record, permissions: permissions }, {
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options),
                  last_modified: last_modified,
                  patch: !!options.patch
                });
                return _context11.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 9:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function updateRecord(_x20) {
        return _ref14.apply(this, arguments);
      }

      return updateRecord;
    }()

    /**
     * Deletes a record from the current collection.
     *
     * @param  {Object|String} record                  The record to delete.
     * @param  {Object}        [options={}]            The options object.
     * @param  {Object}        [options.headers]       The headers object option.
     * @param  {Number}        [options.retry=0]       Number of retries to make
     *     when faced with transient errors.
     * @param  {Boolean}       [options.safe]          The safe option.
     * @param  {Number}        [options.last_modified] The last_modified option.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "deleteRecord",
    value: function () {
      var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(record) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var recordObj, id, _recordObj$options, last_modified, path, request;

        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                recordObj = (0, _utils.toDataBody)(record);

                if (recordObj.id) {
                  _context12.next = 3;
                  break;
                }

                throw new Error("A record id is required.");

              case 3:
                id = recordObj.id;
                _recordObj$options = _extends({}, recordObj, options), last_modified = _recordObj$options.last_modified;
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name, id);
                request = requests.deleteRequest(path, {
                  last_modified: last_modified,
                  headers: this._getHeaders(options),
                  safe: this._getSafe(options)
                });
                return _context12.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 8:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function deleteRecord(_x22) {
        return _ref15.apply(this, arguments);
      }

      return deleteRecord;
    }()

    /**
     * Retrieves a record from the current collection.
     *
     * @param  {String} id                The record id to retrieve.
     * @param  {Object} [options={}]      The options object.
     * @param  {Object} [options.headers] The headers object option.
     * @param  {Number} [options.retry=0] Number of retries to make
     *     when faced with transient errors.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "getRecord",
    value: function () {
      var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(id) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var path, request;
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name, id);
                request = { headers: this._getHeaders(options), path: path };
                return _context13.abrupt("return", this.client.execute(request, { retry: this._getRetry(options) }));

              case 3:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function getRecord(_x24) {
        return _ref16.apply(this, arguments);
      }

      return getRecord;
    }()

    /**
     * Lists records from the current collection.
     *
     * Sorting is done by passing a `sort` string option:
     *
     * - The field to order the results by, prefixed with `-` for descending.
     * Default: `-last_modified`.
     *
     * @see http://kinto.readthedocs.io/en/stable/api/1.x/sorting.html
     *
     * Filtering is done by passing a `filters` option object:
     *
     * - `{fieldname: "value"}`
     * - `{min_fieldname: 4000}`
     * - `{in_fieldname: "1,2,3"}`
     * - `{not_fieldname: 0}`
     * - `{exclude_fieldname: "0,1"}`
     *
     * @see http://kinto.readthedocs.io/en/stable/api/1.x/filtering.html
     *
     * Paginating is done by passing a `limit` option, then calling the `next()`
     * method from the resolved result object to fetch the next page, if any.
     *
     * @param  {Object}   [options={}]                    The options object.
     * @param  {Object}   [options.headers]               The headers object option.
     * @param  {Number}   [options.retry=0]               Number of retries to make
     *     when faced with transient errors.
     * @param  {Object}   [options.filters=[]]            The filters object.
     * @param  {String}   [options.sort="-last_modified"] The sort field.
     * @param  {String}   [options.at]                    The timestamp to get a snapshot at.
     * @param  {String}   [options.limit=null]            The limit field.
     * @param  {String}   [options.pages=1]               The number of result pages to aggregate.
     * @param  {Number}   [options.since=null]            Only retrieve records modified since the provided timestamp.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "listRecords",
    value: function () {
      var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var path;
        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                path = (0, _endpoint2.default)("record", this.bucket.name, this.name);

                if (!options.hasOwnProperty("at")) {
                  _context14.next = 5;
                  break;
                }

                return _context14.abrupt("return", this.getSnapshot(options.at));

              case 5:
                return _context14.abrupt("return", this.client.paginatedList(path, options, {
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options)
                }));

              case 6:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function listRecords() {
        return _ref17.apply(this, arguments);
      }

      return listRecords;
    }()

    /**
     * @private
     */

  }, {
    key: "isHistoryComplete",
    value: function () {
      var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15() {
        var _ref19, _ref19$data, oldestHistoryEntry;

        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return this.bucket.listHistory({
                  limit: 1,
                  filters: {
                    action: "create",
                    resource_name: "collection",
                    collection_id: this.name
                  }
                });

              case 2:
                _ref19 = _context15.sent;
                _ref19$data = _slicedToArray(_ref19.data, 1);
                oldestHistoryEntry = _ref19$data[0];
                return _context15.abrupt("return", !!oldestHistoryEntry);

              case 6:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function isHistoryComplete() {
        return _ref18.apply(this, arguments);
      }

      return isHistoryComplete;
    }()

    /**
     * @private
     */

  }, {
    key: "listChangesBackTo",
    value: function () {
      var _ref20 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(at) {
        var _ref21, changes;

        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                _context16.next = 2;
                return this.isHistoryComplete();

              case 2:
                if (_context16.sent) {
                  _context16.next = 4;
                  break;
                }

                throw new Error("Computing a snapshot is only possible when the full history for a " + "collection is available. Here, the history plugin seems to have " + "been enabled after the creation of the collection.");

              case 4:
                _context16.next = 6;
                return this.bucket.listHistory({
                  pages: Infinity, // all pages up to target timestamp are required
                  sort: "-target.data.last_modified",
                  filters: {
                    resource_name: "record",
                    collection_id: this.name,
                    "max_target.data.last_modified": String(at) }
                });

              case 6:
                _ref21 = _context16.sent;
                changes = _ref21.data;
                return _context16.abrupt("return", changes);

              case 9:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function listChangesBackTo(_x27) {
        return _ref20.apply(this, arguments);
      }

      return listChangesBackTo;
    }()

    /**
     * @private
     */

  }, {
    key: "getSnapshot",
    value: function () {
      var _ref22 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(at) {
        var changes, seenIds, snapshot, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step;

        return regeneratorRuntime.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                if (!(!Number.isInteger(at) || at <= 0)) {
                  _context17.next = 2;
                  break;
                }

                throw new Error("Invalid argument, expected a positive integer.");

              case 2:
                _context17.next = 4;
                return this.listChangesBackTo(at);

              case 4:
                changes = _context17.sent;

                // Replay changes to compute the requested snapshot.
                seenIds = new Set();
                snapshot = [];
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context17.prev = 10;

                _loop = function _loop() {
                  var _ref23 = _step.value;
                  var action = _ref23.action,
                      record = _ref23.target.data;

                  if (action == "delete") {
                    seenIds.add(record.id); // ensure not reprocessing deleted entries
                    snapshot = snapshot.filter(function (r) {
                      return r.id !== record.id;
                    });
                  } else if (!seenIds.has(record.id)) {
                    seenIds.add(record.id);
                    snapshot.push(record);
                  }
                };

                for (_iterator = changes[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  _loop();
                }
                _context17.next = 19;
                break;

              case 15:
                _context17.prev = 15;
                _context17.t0 = _context17["catch"](10);
                _didIteratorError = true;
                _iteratorError = _context17.t0;

              case 19:
                _context17.prev = 19;
                _context17.prev = 20;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 22:
                _context17.prev = 22;

                if (!_didIteratorError) {
                  _context17.next = 25;
                  break;
                }

                throw _iteratorError;

              case 25:
                return _context17.finish(22);

              case 26:
                return _context17.finish(19);

              case 27:
                return _context17.abrupt("return", {
                  last_modified: String(at),
                  data: snapshot.sort(function (a, b) {
                    return b.last_modified - a.last_modified;
                  }),
                  next: function next() {
                    throw new Error("Snapshots don't support pagination");
                  },
                  hasNextPage: false,
                  totalRecords: snapshot.length
                });

              case 28:
              case "end":
                return _context17.stop();
            }
          }
        }, _callee17, this, [[10, 15, 19, 27], [20,, 22, 26]]);
      }));

      function getSnapshot(_x28) {
        return _ref22.apply(this, arguments);
      }

      return getSnapshot;
    }()

    /**
     * Performs batch operations at the current collection level.
     *
     * @param  {Function} fn                   The batch operation function.
     * @param  {Object}   [options={}]         The options object.
     * @param  {Object}   [options.headers]    The headers object option.
     * @param  {Boolean}  [options.safe]       The safe option.
     * @param  {Number}   [options.retry]      The retry option.
     * @param  {Boolean}  [options.aggregate]  Produces a grouped result object.
     * @return {Promise<Object, Error>}
     */

  }, {
    key: "batch",
    value: function () {
      var _ref24 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(fn) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        return regeneratorRuntime.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                return _context18.abrupt("return", this.client.batch(fn, {
                  bucket: this.bucket.name,
                  collection: this.name,
                  headers: this._getHeaders(options),
                  retry: this._getRetry(options),
                  safe: this._getSafe(options),
                  aggregate: !!options.aggregate
                }));

              case 1:
              case "end":
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function batch(_x29) {
        return _ref24.apply(this, arguments);
      }

      return batch;
    }()
  }]);

  return Collection;
}(), (_applyDecoratedDescriptor(_class.prototype, "addAttachment", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "addAttachment"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "removeAttachment", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "removeAttachment"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "getSnapshot", [_dec3], Object.getOwnPropertyDescriptor(_class.prototype, "getSnapshot"), _class.prototype)), _class));
exports.default = Collection;
},{"./endpoint":7,"./requests":11,"./utils":12,"uuid":13}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = endpoint;
/**
 * Endpoints templates.
 * @type {Object}
 */
var ENDPOINTS = {
  root: function root() {
    return "/";
  },
  batch: function batch() {
    return "/batch";
  },
  permissions: function permissions() {
    return "/permissions";
  },
  bucket: function bucket(_bucket) {
    return "/buckets" + (_bucket ? "/" + _bucket : "");
  },
  history: function history(bucket) {
    return ENDPOINTS.bucket(bucket) + "/history";
  },
  collection: function collection(bucket, coll) {
    return ENDPOINTS.bucket(bucket) + "/collections" + (coll ? "/" + coll : "");
  },
  group: function group(bucket, _group) {
    return ENDPOINTS.bucket(bucket) + "/groups" + (_group ? "/" + _group : "");
  },
  record: function record(bucket, coll, id) {
    return ENDPOINTS.collection(bucket, coll) + "/records" + (id ? "/" + id : "");
  },
  attachment: function attachment(bucket, coll, id) {
    return ENDPOINTS.record(bucket, coll, id) + "/attachment";
  }
};

/**
 * Retrieves a server enpoint by its name.
 *
 * @private
 * @param  {String}    name The endpoint name.
 * @param  {...string} args The endpoint parameters.
 * @return {String}
 */
function endpoint(name) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return ENDPOINTS[name].apply(ENDPOINTS, args);
}
},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Kinto server error code descriptors.
 * @type {Object}
 */
exports.default = {
  104: "Missing Authorization Token",
  105: "Invalid Authorization Token",
  106: "Request body was not valid JSON",
  107: "Invalid request parameter",
  108: "Missing request parameter",
  109: "Invalid posted data",
  110: "Invalid Token / id",
  111: "Missing Token / id",
  112: "Content-Length header was not provided",
  113: "Request body too large",
  114: "Resource was created, updated or deleted meanwhile",
  115: "Method not allowed on this end point (hint: server may be readonly)",
  116: "Requested version not available on this server",
  117: "Client has sent too many requests",
  121: "Resource access is forbidden for this user",
  122: "Another resource violates constraint",
  201: "Service Temporary unavailable due to high load",
  202: "Service deprecated",
  999: "Internal Server Error"
};
},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require("./utils");

var _errors = require("./errors");

var _errors2 = _interopRequireDefault(_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Enhanced HTTP client for the Kinto protocol.
 * @private
 */
var HTTP = function () {
  _createClass(HTTP, null, [{
    key: "DEFAULT_REQUEST_HEADERS",

    /**
     * Default HTTP request headers applied to each outgoing request.
     *
     * @type {Object}
     */
    get: function get() {
      return {
        Accept: "application/json",
        "Content-Type": "application/json"
      };
    }

    /**
     * Default options.
     *
     * @type {Object}
     */

  }, {
    key: "defaultOptions",
    get: function get() {
      return { timeout: null, requestMode: "cors" };
    }

    /**
     * Constructor.
     *
     * @param {EventEmitter} events                       The event handler.
     * @param {Object}       [options={}}                 The options object.
     * @param {Number}       [options.timeout=null]       The request timeout in ms, if any (default: `null`).
     * @param {String}       [options.requestMode="cors"] The HTTP request mode (default: `"cors"`).
     */

  }]);

  function HTTP(events) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, HTTP);

    // public properties
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    if (!events) {
      throw new Error("No events handler provided");
    }
    this.events = events;

    /**
     * The request mode.
     * @see  https://fetch.spec.whatwg.org/#requestmode
     * @type {String}
     */
    this.requestMode = options.requestMode || HTTP.defaultOptions.requestMode;

    /**
     * The request timeout.
     * @type {Number}
     */
    this.timeout = options.timeout || HTTP.defaultOptions.timeout;
  }

  /**
   * @private
   */


  _createClass(HTTP, [{
    key: "timedFetch",
    value: function timedFetch(url, options) {
      var _this = this;

      var hasTimedout = false;
      return new Promise(function (resolve, reject) {
        // Detect if a request has timed out.
        var _timeoutId = void 0;
        if (_this.timeout) {
          _timeoutId = setTimeout(function () {
            hasTimedout = true;
            reject(new Error("Request timeout."));
          }, _this.timeout);
        }
        function proceedWithHandler(fn) {
          return function (arg) {
            if (!hasTimedout) {
              if (_timeoutId) {
                clearTimeout(_timeoutId);
              }
              fn(arg);
            }
          };
        }
        fetch(url, options).then(proceedWithHandler(resolve)).catch(proceedWithHandler(reject));
      });
    }

    /**
     * @private
     */

  }, {
    key: "processResponse",
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(response) {
        var status, text, error;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                status = response.status;
                _context.next = 3;
                return response.text();

              case 3:
                text = _context.sent;

                if (!(text.length === 0)) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt("return", this.formatResponse(response, null));

              case 6:
                _context.prev = 6;
                return _context.abrupt("return", this.formatResponse(response, JSON.parse(text)));

              case 10:
                _context.prev = 10;
                _context.t0 = _context["catch"](6);
                error = new Error("HTTP " + (status || 0) + "; " + _context.t0);

                error.response = response;
                error.stack = _context.t0.stack;
                throw error;

              case 16:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[6, 10]]);
      }));

      function processResponse(_x2) {
        return _ref.apply(this, arguments);
      }

      return processResponse;
    }()

    /**
     * @private
     */

  }, {
    key: "formatResponse",
    value: function formatResponse(response, json) {
      var status = response.status,
          statusText = response.statusText,
          headers = response.headers;

      if (json && status >= 400) {
        var message = "HTTP " + status + " " + (json.error || "") + ": ";
        if (json.errno && json.errno in _errors2.default) {
          var errnoMsg = _errors2.default[json.errno];
          message += errnoMsg;
          if (json.message && json.message !== errnoMsg) {
            message += " (" + json.message + ")";
          }
        } else {
          message += statusText || "";
        }
        var error = new Error(message.trim());
        error.response = response;
        error.data = json;
        throw error;
      }
      return { status: status, json: json, headers: headers };
    }

    /**
     * @private
     */

  }, {
    key: "retry",
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(url, retryAfter, request, options) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (0, _utils.delay)(retryAfter);

              case 2:
                return _context2.abrupt("return", this.request(url, request, _extends({}, options, { retry: options.retry - 1 })));

              case 3:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function retry(_x3, _x4, _x5, _x6) {
        return _ref2.apply(this, arguments);
      }

      return retry;
    }()

    /**
     * Performs an HTTP request to the Kinto server.
     *
     * Resolves with an objet containing the following HTTP response properties:
     * - `{Number}  status`  The HTTP status code.
     * - `{Object}  json`    The JSON response body.
     * - `{Headers} headers` The response headers object; see the ES6 fetch() spec.
     *
     * @param  {String} url               The URL.
     * @param  {Object} [request={}]      The request object, passed to
     *     fetch() as its options object.
     * @param  {Object} [request.headers] The request headers object (default: {})
     * @param  {Object} [options={}]      Options for making the
     *     request
     * @param  {Number} [options.retry]   Number of retries (default: 0)
     * @return {Promise}
     */

  }, {
    key: "request",
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(url) {
        var _request = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { headers: {} };

        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { retry: 0 };
        var response, status, headers, retryAfter;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                // Ensure default request headers are always set
                _request.headers = _extends({}, HTTP.DEFAULT_REQUEST_HEADERS, _request.headers);
                // If a multipart body is provided, remove any custom Content-Type header as
                // the fetch() implementation will add the correct one for us.
                if (_request.body && typeof _request.body.append === "function") {
                  delete _request.headers["Content-Type"];
                }
                _request.mode = this.requestMode;

                _context3.next = 5;
                return this.timedFetch(url, _request);

              case 5:
                response = _context3.sent;
                status = response.status, headers = response.headers;


                this._checkForDeprecationHeader(headers);
                this._checkForBackoffHeader(status, headers);

                // Check if the server summons the client to retry after a while.
                retryAfter = this._checkForRetryAfterHeader(status, headers);
                // If number of allowed of retries is not exhausted, retry the same request.

                if (!(retryAfter && options.retry > 0)) {
                  _context3.next = 14;
                  break;
                }

                return _context3.abrupt("return", this.retry(url, retryAfter, _request, options));

              case 14:
                return _context3.abrupt("return", this.processResponse(response));

              case 15:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function request(_x7) {
        return _ref3.apply(this, arguments);
      }

      return request;
    }()
  }, {
    key: "_checkForDeprecationHeader",
    value: function _checkForDeprecationHeader(headers) {
      var alertHeader = headers.get("Alert");
      if (!alertHeader) {
        return;
      }
      var alert = void 0;
      try {
        alert = JSON.parse(alertHeader);
      } catch (err) {
        console.warn("Unable to parse Alert header message", alertHeader);
        return;
      }
      console.warn(alert.message, alert.url);
      this.events.emit("deprecated", alert);
    }
  }, {
    key: "_checkForBackoffHeader",
    value: function _checkForBackoffHeader(status, headers) {
      var backoffMs = void 0;
      var backoffSeconds = parseInt(headers.get("Backoff"), 10);
      if (backoffSeconds > 0) {
        backoffMs = new Date().getTime() + backoffSeconds * 1000;
      } else {
        backoffMs = 0;
      }
      this.events.emit("backoff", backoffMs);
    }
  }, {
    key: "_checkForRetryAfterHeader",
    value: function _checkForRetryAfterHeader(status, headers) {
      var retryAfter = headers.get("Retry-After");
      if (!retryAfter) {
        return;
      }
      var delay = parseInt(retryAfter, 10) * 1000;
      retryAfter = new Date().getTime() + delay;
      this.events.emit("retry-after", retryAfter);
      return delay;
    }
  }]);

  return HTTP;
}();

exports.default = HTTP;
},{"./errors":8,"./utils":12}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

require("babel-polyfill");

var _events = require("events");

var _base = require("./base");

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var KintoClient = function (_KintoClientBase) {
  _inherits(KintoClient, _KintoClientBase);

  function KintoClient(remote) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, KintoClient);

    var events = options.events || new _events.EventEmitter();

    return _possibleConstructorReturn(this, (KintoClient.__proto__ || Object.getPrototypeOf(KintoClient)).call(this, remote, Object.assign({ events: events }, options)));
  }

  return KintoClient;
}(_base2.default);

// This is a hack to avoid Browserify to expose the above class
// at `new KintoClient()` instead of `new KintoClient.default()`.
// See https://github.com/Kinto/kinto-http.js/issues/77


exports.default = KintoClient;
if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === "object") {
  module.exports = KintoClient;
}
},{"./base":3,"babel-polyfill":1,"events":2}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.createRequest = createRequest;
exports.updateRequest = updateRequest;
exports.jsonPatchPermissionsRequest = jsonPatchPermissionsRequest;
exports.deleteRequest = deleteRequest;
exports.addAttachmentRequest = addAttachmentRequest;

var _utils = require("./utils");

var requestDefaults = {
  safe: false,
  // check if we should set default content type here
  headers: {},
  permissions: undefined,
  data: undefined,
  patch: false
};

/**
 * @private
 */
function safeHeader(safe, last_modified) {
  if (!safe) {
    return {};
  }
  if (last_modified) {
    return { "If-Match": "\"" + last_modified + "\"" };
  }
  return { "If-None-Match": "*" };
}

/**
 * @private
 */
function createRequest(path, _ref) {
  var data = _ref.data,
      permissions = _ref.permissions;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _requestDefaults$opti = _extends({}, requestDefaults, options),
      headers = _requestDefaults$opti.headers,
      safe = _requestDefaults$opti.safe;

  return {
    method: data && data.id ? "PUT" : "POST",
    path: path,
    headers: _extends({}, headers, safeHeader(safe)),
    body: { data: data, permissions: permissions }
  };
}

/**
 * @private
 */
function updateRequest(path, _ref2) {
  var data = _ref2.data,
      permissions = _ref2.permissions;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _requestDefaults$opti2 = _extends({}, requestDefaults, options),
      headers = _requestDefaults$opti2.headers,
      safe = _requestDefaults$opti2.safe,
      patch = _requestDefaults$opti2.patch;

  var _data$options = _extends({}, data, options),
      last_modified = _data$options.last_modified;

  if (Object.keys((0, _utils.omit)(data, "id", "last_modified")).length === 0) {
    data = undefined;
  }

  return {
    method: patch ? "PATCH" : "PUT",
    path: path,
    headers: _extends({}, headers, safeHeader(safe, last_modified)),
    body: { data: data, permissions: permissions }
  };
}

/**
 * @private
 */
function jsonPatchPermissionsRequest(path, permissions, opType) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var _requestDefaults$opti3 = _extends({}, requestDefaults, options),
      headers = _requestDefaults$opti3.headers,
      safe = _requestDefaults$opti3.safe,
      last_modified = _requestDefaults$opti3.last_modified;

  var ops = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.entries(permissions)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _step$value = _slicedToArray(_step.value, 2),
          type = _step$value[0],
          principals = _step$value[1];

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = principals[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var principal = _step2.value;

          ops.push({
            op: opType,
            path: "/permissions/" + type + "/" + principal
          });
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return {
    method: "PATCH",
    path: path,
    headers: _extends({}, headers, safeHeader(safe, last_modified), {
      "Content-Type": "application/json-patch+json"
    }),
    body: ops
  };
}

/**
 * @private
 */
function deleteRequest(path) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _requestDefaults$opti4 = _extends({}, requestDefaults, options),
      headers = _requestDefaults$opti4.headers,
      safe = _requestDefaults$opti4.safe,
      last_modified = _requestDefaults$opti4.last_modified;

  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: path,
    headers: _extends({}, headers, safeHeader(safe, last_modified))
  };
}

/**
 * @private
 */
function addAttachmentRequest(path, dataURI) {
  var _ref3 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      data = _ref3.data,
      permissions = _ref3.permissions;

  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var _requestDefaults$opti5 = _extends({}, requestDefaults, options),
      headers = _requestDefaults$opti5.headers,
      safe = _requestDefaults$opti5.safe,
      gzipped = _requestDefaults$opti5.gzipped;

  var _data$options2 = _extends({}, data, options),
      last_modified = _data$options2.last_modified;

  var body = { data: data, permissions: permissions };
  var formData = (0, _utils.createFormData)(dataURI, body, options);

  var customPath = gzipped != null ? customPath = path + "?gzipped=" + (gzipped ? "true" : "false") : path;

  return {
    method: "POST",
    path: customPath,
    headers: _extends({}, headers, safeHeader(safe, last_modified)),
    body: formData
  };
}
},{"./utils":12}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * Maps a list to promises using the provided mapping function, executes them
 * sequentially then returns a Promise resolving with ordered results obtained.
 * Think of this as a sequential Promise.all.
 *
 * @private
 * @param  {Array}    list The list to map.
 * @param  {Function} fn   The mapping function.
 * @return {Promise}
 */
var pMap = exports.pMap = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(list, fn) {
    var results;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            results = [];
            _context2.next = 3;
            return list.reduce(function () {
              var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(promise, entry) {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return promise;

                      case 2:
                        _context.t0 = results;
                        _context.next = 5;
                        return fn(entry);

                      case 5:
                        _context.t1 = _context.sent;
                        results = _context.t0.concat.call(_context.t0, _context.t1);

                      case 7:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee, this);
              }));

              return function (_x3, _x4) {
                return _ref2.apply(this, arguments);
              };
            }(), Promise.resolve());

          case 3:
            return _context2.abrupt("return", results);

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function pMap(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Takes an object and returns a copy of it with the provided keys omitted.
 *
 * @private
 * @param  {Object}    obj  The source object.
 * @param  {...String} keys The keys to omit.
 * @return {Object}
 */


exports.partition = partition;
exports.delay = delay;
exports.omit = omit;
exports.toDataBody = toDataBody;
exports.qsify = qsify;
exports.checkVersion = checkVersion;
exports.support = support;
exports.capable = capable;
exports.nobatch = nobatch;
exports.isObject = isObject;
exports.parseDataURL = parseDataURL;
exports.extractFileInfo = extractFileInfo;
exports.createFormData = createFormData;
exports.cleanUndefinedProperties = cleanUndefinedProperties;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Chunks an array into n pieces.
 *
 * @private
 * @param  {Array}  array
 * @param  {Number} n
 * @return {Array}
 */
function partition(array, n) {
  if (n <= 0) {
    return array;
  }
  return array.reduce(function (acc, x, i) {
    if (i === 0 || i % n === 0) {
      acc.push([x]);
    } else {
      acc[acc.length - 1].push(x);
    }
    return acc;
  }, []);
}

/**
 * Returns a Promise always resolving after the specified amount in milliseconds.
 *
 * @return Promise<void>
 */
function delay(ms) {
  return new Promise(function (resolve) {
    return setTimeout(resolve, ms);
  });
}function omit(obj) {
  for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    keys[_key - 1] = arguments[_key];
  }

  return Object.keys(obj).reduce(function (acc, key) {
    if (keys.indexOf(key) === -1) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

/**
 * Always returns a resource data object from the provided argument.
 *
 * @private
 * @param  {Object|String} resource
 * @return {Object}
 */
function toDataBody(resource) {
  if (isObject(resource)) {
    return resource;
  }
  if (typeof resource === "string") {
    return { id: resource };
  }
  throw new Error("Invalid argument.");
}

/**
 * Transforms an object into an URL query string, stripping out any undefined
 * values.
 *
 * @param  {Object} obj
 * @return {String}
 */
function qsify(obj) {
  var encode = function encode(v) {
    return encodeURIComponent(typeof v === "boolean" ? String(v) : v);
  };
  var stripUndefined = function stripUndefined(o) {
    return JSON.parse(JSON.stringify(o));
  };
  var stripped = stripUndefined(obj);
  return Object.keys(stripped).map(function (k) {
    var ks = encode(k) + "=";
    if (Array.isArray(stripped[k])) {
      return ks + stripped[k].map(function (v) {
        return encode(v);
      }).join(",");
    } else {
      return ks + encode(stripped[k]);
    }
  }).join("&");
}

/**
 * Checks if a version is within the provided range.
 *
 * @param  {String} version    The version to check.
 * @param  {String} minVersion The minimum supported version (inclusive).
 * @param  {String} maxVersion The minimum supported version (exclusive).
 * @throws {Error} If the version is outside of the provided range.
 */
function checkVersion(version, minVersion, maxVersion) {
  var extract = function extract(str) {
    return str.split(".").map(function (x) {
      return parseInt(x, 10);
    });
  };

  var _extract = extract(version),
      _extract2 = _slicedToArray(_extract, 2),
      verMajor = _extract2[0],
      verMinor = _extract2[1];

  var _extract3 = extract(minVersion),
      _extract4 = _slicedToArray(_extract3, 2),
      minMajor = _extract4[0],
      minMinor = _extract4[1];

  var _extract5 = extract(maxVersion),
      _extract6 = _slicedToArray(_extract5, 2),
      maxMajor = _extract6[0],
      maxMinor = _extract6[1];

  var checks = [verMajor < minMajor, verMajor === minMajor && verMinor < minMinor, verMajor > maxMajor, verMajor === maxMajor && verMinor >= maxMinor];
  if (checks.some(function (x) {
    return x;
  })) {
    throw new Error("Version " + version + " doesn't satisfy " + minVersion + " <= x < " + maxVersion);
  }
}

/**
 * Generates a decorator function ensuring a version check is performed against
 * the provided requirements before executing it.
 *
 * @param  {String} min The required min version (inclusive).
 * @param  {String} max The required max version (inclusive).
 * @return {Function}
 */
function support(min, max) {
  return function (target, key, descriptor) {
    var fn = descriptor.value;
    return {
      configurable: true,
      get: function get() {
        var _this = this;

        var wrappedMethod = function wrappedMethod() {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          // "this" is the current instance which its method is decorated.
          var client = "client" in _this ? _this.client : _this;
          return client.fetchHTTPApiVersion().then(function (version) {
            return checkVersion(version, min, max);
          }).then(function () {
            return fn.apply(_this, args);
          });
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true
        });
        return wrappedMethod;
      }
    };
  };
}

/**
 * Generates a decorator function ensuring that the specified capabilities are
 * available on the server before executing it.
 *
 * @param  {Array<String>} capabilities The required capabilities.
 * @return {Function}
 */
function capable(capabilities) {
  return function (target, key, descriptor) {
    var fn = descriptor.value;
    return {
      configurable: true,
      get: function get() {
        var _this2 = this;

        var wrappedMethod = function wrappedMethod() {
          for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
          }

          // "this" is the current instance which its method is decorated.
          var client = "client" in _this2 ? _this2.client : _this2;
          return client.fetchServerCapabilities().then(function (available) {
            var missing = capabilities.filter(function (c) {
              return !(c in available);
            });
            if (missing.length > 0) {
              var missingStr = missing.join(", ");
              throw new Error("Required capabilities " + missingStr + " not present on server");
            }
          }).then(function () {
            return fn.apply(_this2, args);
          });
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true
        });
        return wrappedMethod;
      }
    };
  };
}

/**
 * Generates a decorator function ensuring an operation is not performed from
 * within a batch request.
 *
 * @param  {String} message The error message to throw.
 * @return {Function}
 */
function nobatch(message) {
  return function (target, key, descriptor) {
    var fn = descriptor.value;
    return {
      configurable: true,
      get: function get() {
        var _this3 = this;

        var wrappedMethod = function wrappedMethod() {
          for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            args[_key4] = arguments[_key4];
          }

          // "this" is the current instance which its method is decorated.
          if (_this3._isBatch) {
            throw new Error(message);
          }
          return fn.apply(_this3, args);
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true
        });
        return wrappedMethod;
      }
    };
  };
}

/**
 * Returns true if the specified value is an object (i.e. not an array nor null).
 * @param  {Object} thing The value to inspect.
 * @return {bool}
 */
function isObject(thing) {
  return (typeof thing === "undefined" ? "undefined" : _typeof(thing)) === "object" && thing !== null && !Array.isArray(thing);
}

/**
 * Parses a data url.
 * @param  {String} dataURL The data url.
 * @return {Object}
 */
function parseDataURL(dataURL) {
  var regex = /^data:(.*);base64,(.*)/;
  var match = dataURL.match(regex);
  if (!match) {
    throw new Error("Invalid data-url: " + String(dataURL).substr(0, 32) + "...");
  }
  var props = match[1];
  var base64 = match[2];

  var _props$split = props.split(";"),
      _props$split2 = _toArray(_props$split),
      type = _props$split2[0],
      rawParams = _props$split2.slice(1);

  var params = rawParams.reduce(function (acc, param) {
    var _param$split = param.split("="),
        _param$split2 = _slicedToArray(_param$split, 2),
        key = _param$split2[0],
        value = _param$split2[1];

    return _extends({}, acc, _defineProperty({}, key, value));
  }, {});
  return _extends({}, params, { type: type, base64: base64 });
}

/**
 * Extracts file information from a data url.
 * @param  {String} dataURL The data url.
 * @return {Object}
 */
function extractFileInfo(dataURL) {
  var _parseDataURL = parseDataURL(dataURL),
      name = _parseDataURL.name,
      type = _parseDataURL.type,
      base64 = _parseDataURL.base64;

  var binary = atob(base64);
  var array = [];
  for (var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  var blob = new Blob([new Uint8Array(array)], { type: type });
  return { blob: blob, name: name };
}

/**
 * Creates a FormData instance from a data url and an existing JSON response
 * body.
 * @param  {String} dataURL            The data url.
 * @param  {Object} body               The response body.
 * @param  {Object} [options={}]       The options object.
 * @param  {Object} [options.filename] Force attachment file name.
 * @return {FormData}
 */
function createFormData(dataURL, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options$filename = options.filename,
      filename = _options$filename === undefined ? "untitled" : _options$filename;

  var _extractFileInfo = extractFileInfo(dataURL),
      blob = _extractFileInfo.blob,
      name = _extractFileInfo.name;

  var formData = new FormData();
  formData.append("attachment", blob, name || filename);
  for (var property in body) {
    if (typeof body[property] !== "undefined") {
      formData.append(property, JSON.stringify(body[property]));
    }
  }
  return formData;
}

/**
 * Clones an object with all its undefined keys removed.
 * @private
 */
function cleanUndefinedProperties(obj) {
  var result = {};
  for (var key in obj) {
    if (typeof obj[key] !== "undefined") {
      result[key] = obj[key];
    }
  }
  return result;
}
},{}],13:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":16,"./v4":17}],14:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],15:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":14,"./lib/rng":15}],17:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":14,"./lib/rng":15}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _collection = require("./collection");

var _collection2 = _interopRequireDefault(_collection);

var _base = require("./adapters/base");

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_BUCKET_NAME = "default";
const DEFAULT_REMOTE = "http://localhost:8888/v1";
const DEFAULT_RETRY = 1;

/**
 * KintoBase class.
 */
class KintoBase {
  /**
   * Provides a public access to the base adapter class. Users can create a
   * custom DB adapter by extending {@link BaseAdapter}.
   *
   * @type {Object}
   */
  static get adapters() {
    return {
      BaseAdapter: _base2.default
    };
  }

  /**
   * Synchronization strategies. Available strategies are:
   *
   * - `MANUAL`: Conflicts will be reported in a dedicated array.
   * - `SERVER_WINS`: Conflicts are resolved using remote data.
   * - `CLIENT_WINS`: Conflicts are resolved using local data.
   *
   * @type {Object}
   */
  static get syncStrategy() {
    return _collection2.default.strategy;
  }

  /**
   * Constructor.
   *
   * Options:
   * - `{String}`       `remote`         The server URL to use.
   * - `{String}`       `bucket`         The collection bucket name.
   * - `{EventEmitter}` `events`         Events handler.
   * - `{BaseAdapter}`  `adapter`        The base DB adapter class.
   * - `{Object}`       `adapterOptions` Options given to the adapter.
   * - `{String}`       `dbPrefix`       The DB name prefix.
   * - `{Object}`       `headers`        The HTTP headers to use.
   * - `{Object}`       `retry`          Number of retries when the server fails to process the request (default: `1`)
   * - `{String}`       `requestMode`    The HTTP CORS mode to use.
   * - `{Number}`       `timeout`        The requests timeout in ms (default: `5000`).
   *
   * @param  {Object} options The options object.
   */
  constructor(options = {}) {
    const defaults = {
      bucket: DEFAULT_BUCKET_NAME,
      remote: DEFAULT_REMOTE,
      retry: DEFAULT_RETRY
    };
    this._options = _extends({}, defaults, options);
    if (!this._options.adapter) {
      throw new Error("No adapter provided");
    }

    const {
      ApiClass,
      events,
      headers,
      remote,
      requestMode,
      retry,
      timeout
    } = this._options;

    // public properties

    /**
     * The kinto HTTP client instance.
     * @type {KintoClient}
     */
    this.api = new ApiClass(remote, {
      events,
      headers,
      requestMode,
      retry,
      timeout
    });
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    this.events = this._options.events;
  }

  /**
   * Creates a {@link Collection} instance. The second (optional) parameter
   * will set collection-level options like e.g. `remoteTransformers`.
   *
   * @param  {String} collName The collection name.
   * @param  {Object} [options={}]                 Extra options or override client's options.
   * @param  {Object} [options.idSchema]           IdSchema instance (default: UUID)
   * @param  {Object} [options.remoteTransformers] Array<RemoteTransformer> (default: `[]`])
   * @param  {Object} [options.hooks]              Array<Hook> (default: `[]`])
   * @return {Collection}
   */
  collection(collName, options = {}) {
    if (!collName) {
      throw new Error("missing collection name");
    }
    const { bucket, events, adapter, adapterOptions, dbPrefix } = _extends({}, this._options, options);
    const { idSchema, remoteTransformers, hooks } = options;

    return new _collection2.default(bucket, collName, this.api, {
      events,
      adapter,
      adapterOptions,
      dbPrefix,
      idSchema,
      remoteTransformers,
      hooks
    });
  }
}
exports.default = KintoBase;

},{"./adapters/base":20,"./collection":21}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _base = require("./base.js");

var _base2 = _interopRequireDefault(_base);

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const INDEXED_FIELDS = ["id", "_status", "last_modified"];

/**
 * IDB cursor handlers.
 * @type {Object}
 */
const cursorHandlers = {
  all(filters, done) {
    const results = [];
    return function (event) {
      const cursor = event.target.result;
      if (cursor) {
        if ((0, _utils.filterObject)(filters, cursor.value)) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        done(results);
      }
    };
  },

  in(values, done) {
    if (values.length === 0) {
      return done([]);
    }
    const sortedValues = [].slice.call(values).sort();
    const results = [];
    return function (event) {
      const cursor = event.target.result;
      if (!cursor) {
        done(results);
        return;
      }
      const { key, value } = cursor;
      let i = 0;
      while (key > sortedValues[i]) {
        // The cursor has passed beyond this key. Check next.
        ++i;
        if (i === sortedValues.length) {
          done(results); // There is no next. Stop searching.
          return;
        }
      }
      if (key === sortedValues[i]) {
        results.push(value);
        cursor.continue();
      } else {
        cursor.continue(sortedValues[i]);
      }
    };
  }
};

/**
 * Extract from filters definition the first indexed field. Since indexes were
 * created on single-columns, extracting a single one makes sense.
 *
 * @param  {Object} filters The filters object.
 * @return {String|undefined}
 */
function findIndexedField(filters) {
  const filteredFields = Object.keys(filters);
  const indexedFields = filteredFields.filter(field => {
    return INDEXED_FIELDS.indexOf(field) !== -1;
  });
  return indexedFields[0];
}

/**
 * Creates an IDB request and attach it the appropriate cursor event handler to
 * perform a list query.
 *
 * Multiple matching values are handled by passing an array.
 *
 * @param  {IDBStore}         store      The IDB store.
 * @param  {String|undefined} indexField The indexed field to query, if any.
 * @param  {Any}              value      The value to filter, if any.
 * @param  {Object}           filters    More filters.
 * @param  {Function}         done       The operation completion handler.
 * @return {IDBRequest}
 */
function createListRequest(store, indexField, value, filters, done) {
  if (!indexField) {
    // Get all records.
    const request = store.openCursor();
    request.onsuccess = cursorHandlers.all(filters, done);
    return request;
  }

  // WHERE IN equivalent clause
  if (Array.isArray(value)) {
    const request = store.index(indexField).openCursor();
    request.onsuccess = cursorHandlers.in(value, done);
    return request;
  }

  // WHERE field = value clause
  const request = store.index(indexField).openCursor(IDBKeyRange.only(value));
  request.onsuccess = cursorHandlers.all(filters, done);
  return request;
}

/**
 * IndexedDB adapter.
 *
 * This adapter doesn't support any options.
 */
class IDB extends _base2.default {
  /**
   * Constructor.
   *
   * @param  {String} dbname The database nale.
   */
  constructor(dbname) {
    super();
    this._db = null;
    // public properties
    /**
     * The database name.
     * @type {String}
     */
    this.dbname = dbname;
  }

  _handleError(method, err) {
    const error = new Error(method + "() " + err.message);
    error.stack = err.stack;
    throw error;
  }

  /**
   * Ensures a connection to the IndexedDB database has been opened.
   *
   * @override
   * @return {Promise}
   */
  open() {
    if (this._db) {
      return Promise.resolve(this);
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbname, 1);
      request.onupgradeneeded = event => {
        // DB object
        const db = event.target.result;
        // Main collection store
        const collStore = db.createObjectStore(this.dbname, {
          keyPath: "id"
        });
        // Primary key (generated by IdSchema, UUID by default)
        collStore.createIndex("id", "id", { unique: true });
        // Local record status ("synced", "created", "updated", "deleted")
        collStore.createIndex("_status", "_status");
        // Last modified field
        collStore.createIndex("last_modified", "last_modified");

        // Metadata store
        const metaStore = db.createObjectStore("__meta__", {
          keyPath: "name"
        });
        metaStore.createIndex("name", "name", { unique: true });
      };
      request.onerror = event => reject(event.target.error);
      request.onsuccess = event => {
        this._db = event.target.result;
        resolve(this);
      };
    });
  }

  /**
   * Closes current connection to the database.
   *
   * @override
   * @return {Promise}
   */
  close() {
    if (this._db) {
      this._db.close(); // indexedDB.close is synchronous
      this._db = null;
    }
    return Promise.resolve();
  }

  /**
   * Returns a transaction and a store objects for this collection.
   *
   * To determine if a transaction has completed successfully, we should rather
   * listen to the transaction’s complete event rather than the IDBObjectStore
   * request’s success event, because the transaction may still fail after the
   * success event fires.
   *
   * @param  {String}      mode  Transaction mode ("readwrite" or undefined)
   * @param  {String|null} name  Store name (defaults to coll name)
   * @return {Object}
   */
  prepare(mode = undefined, name = null) {
    const storeName = name || this.dbname;
    // On Safari, calling IDBDatabase.transaction with mode == undefined raises
    // a TypeError.
    const transaction = mode ? this._db.transaction([storeName], mode) : this._db.transaction([storeName]);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  }

  /**
   * Deletes every records in the current collection.
   *
   * @override
   * @return {Promise}
   */
  clear() {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this.open();
        return new Promise(function (resolve, reject) {
          const { transaction, store } = _this.prepare("readwrite");
          store.clear();
          transaction.onerror = function (event) {
            return reject(new Error(event.target.error));
          };
          transaction.oncomplete = function () {
            return resolve();
          };
        });
      } catch (e) {
        _this._handleError("clear", e);
      }
    })();
  }

  /**
   * Executes the set of synchronous CRUD operations described in the provided
   * callback within an IndexedDB transaction, for current db store.
   *
   * The callback will be provided an object exposing the following synchronous
   * CRUD operation methods: get, create, update, delete.
   *
   * Important note: because limitations in IndexedDB implementations, no
   * asynchronous code should be performed within the provided callback; the
   * promise will therefore be rejected if the callback returns a Promise.
   *
   * Options:
   * - {Array} preload: The list of record IDs to fetch and make available to
   *   the transaction object get() method (default: [])
   *
   * @example
   * const db = new IDB("example");
   * db.execute(transaction => {
   *   transaction.create({id: 1, title: "foo"});
   *   transaction.update({id: 2, title: "bar"});
   *   transaction.delete(3);
   *   return "foo";
   * })
   *   .catch(console.error.bind(console));
   *   .then(console.log.bind(console)); // => "foo"
   *
   * @param  {Function} callback The operation description callback.
   * @param  {Object}   options  The options object.
   * @return {Promise}
   */
  execute(callback, options = { preload: [] }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      // Transactions in IndexedDB are autocommited when a callback does not
      // perform any additional operation.
      // The way Promises are implemented in Firefox (see https://bugzilla.mozilla.org/show_bug.cgi?id=1193394)
      // prevents using within an opened transaction.
      // To avoid managing asynchronocity in the specified `callback`, we preload
      // a list of record in order to execute the `callback` synchronously.
      // See also:
      // - http://stackoverflow.com/a/28388805/330911
      // - http://stackoverflow.com/a/10405196
      // - https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
      yield _this2.open();
      return new Promise(function (resolve, reject) {
        // Start transaction.
        const { transaction, store } = _this2.prepare("readwrite");
        // Preload specified records using index.
        const ids = options.preload;
        store.index("id").openCursor().onsuccess = cursorHandlers.in(ids, function (records) {
          // Store obtained records by id.
          const preloaded = records.reduce(function (acc, record) {
            acc[record.id] = record;
            return acc;
          }, {});
          // Expose a consistent API for every adapter instead of raw store methods.
          const proxy = transactionProxy(store, preloaded);
          // The callback is executed synchronously within the same transaction.
          let result;
          try {
            result = callback(proxy);
          } catch (e) {
            transaction.abort();
            reject(e);
          }
          if (result instanceof Promise) {
            // XXX: investigate how to provide documentation details in error.
            reject(new Error("execute() callback should not return a Promise."));
          }
          // XXX unsure if we should manually abort the transaction on error
          transaction.onerror = function (event) {
            return reject(new Error(event.target.error));
          };
          transaction.oncomplete = function (event) {
            return resolve(result);
          };
        });
      });
    })();
  }

  /**
   * Retrieve a record by its primary key from the IndexedDB database.
   *
   * @override
   * @param  {String} id The record id.
   * @return {Promise}
   */
  get(id) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this3.open();
        return new Promise(function (resolve, reject) {
          const { transaction, store } = _this3.prepare();
          const request = store.get(id);
          transaction.onerror = function (event) {
            return reject(new Error(event.target.error));
          };
          transaction.oncomplete = function () {
            return resolve(request.result);
          };
        });
      } catch (e) {
        _this3._handleError("get", e);
      }
    })();
  }

  /**
   * Lists all records from the IndexedDB database.
   *
   * @override
   * @return {Promise}
   */
  list(params = { filters: {} }) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const { filters } = params;
      const indexField = findIndexedField(filters);
      const value = filters[indexField];
      try {
        yield _this4.open();
        const results = yield new Promise(function (resolve, reject) {
          let results = [];
          // If `indexField` was used already, don't filter again.
          const remainingFilters = (0, _utils.omitKeys)(filters, indexField);

          const { transaction, store } = _this4.prepare();
          createListRequest(store, indexField, value, remainingFilters, function (_results) {
            // we have received all requested records, parking them within
            // current scope
            results = _results;
          });
          transaction.onerror = function (event) {
            return reject(new Error(event.target.error));
          };
          transaction.oncomplete = function (event) {
            return resolve(results);
          };
        });

        // The resulting list of records is sorted.
        // XXX: with some efforts, this could be fully implemented using IDB API.
        return params.order ? (0, _utils.sortObjects)(params.order, results) : results;
      } catch (e) {
        _this4._handleError("list", e);
      }
    })();
  }

  /**
   * Store the lastModified value into metadata store.
   *
   * @override
   * @param  {Number}  lastModified
   * @return {Promise}
   */
  saveLastModified(lastModified) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const value = parseInt(lastModified, 10) || null;
      yield _this5.open();
      return new Promise(function (resolve, reject) {
        const { transaction, store } = _this5.prepare("readwrite", "__meta__");
        store.put({ name: "lastModified", value: value });
        transaction.onerror = function (event) {
          return reject(event.target.error);
        };
        transaction.oncomplete = function (event) {
          return resolve(value);
        };
      });
    })();
  }

  /**
   * Retrieve saved lastModified value.
   *
   * @override
   * @return {Promise}
   */
  getLastModified() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      yield _this6.open();
      return new Promise(function (resolve, reject) {
        const { transaction, store } = _this6.prepare(undefined, "__meta__");
        const request = store.get("lastModified");
        transaction.onerror = function (event) {
          return reject(event.target.error);
        };
        transaction.oncomplete = function (event) {
          resolve(request.result && request.result.value || null);
        };
      });
    })();
  }

  /**
   * Reset the sync status of this collection.
   * This is useful when a server has been wiped, for instance.
   *
   * This is a semi-private method that is not part of the Adapter
   * interface. The Firefox storage adapter offers a method
   * like this, but that method resets sync status for *all*
   * collections, which we can't do.
   */
  resetSyncStatus() {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      yield _this7.open();
      const resetLastModified = new Promise(function (resolve, reject) {
        const { transaction, store } = _this7.prepare("readwrite", "__meta__");
        store.delete("lastModified");
        transaction.onerror = function (event) {
          return reject(event.target.error);
        };
        transaction.oncomplete = function (event) {
          return resolve();
        };
      });
      const resetStatuses = new Promise(function (resolve, reject) {
        const { transaction, store } = _this7.prepare("readwrite");
        createListRequest(store, undefined, undefined, {}, function (results) {
          results.forEach(function (record) {
            if (record._status === "deleted") {
              // Garbage collect deleted records.
              store.delete(record.id);
            } else {
              const newRecord = _extends({}, record, {
                _status: "created",
                last_modified: undefined
              });
              store.put(newRecord);
            }
          });
        });
        transaction.onerror = function (event) {
          return reject(new Error(event.target.error));
        };
        transaction.oncomplete = function (event) {
          return resolve();
        };
      });

      return Promise.all([resetLastModified, resetStatuses]);
    })();
  }

  /**
   * Load a dump of records exported from a server.
   *
   * @abstract
   * @return {Promise}
   */
  loadDump(records) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this8.execute(function (transaction) {
          records.forEach(function (record) {
            return transaction.update(record);
          });
        });
        const previousLastModified = yield _this8.getLastModified();
        const lastModified = Math.max(...records.map(function (record) {
          return record.last_modified;
        }));
        if (lastModified > previousLastModified) {
          yield _this8.saveLastModified(lastModified);
        }
        return records;
      } catch (e) {
        _this8._handleError("loadDump", e);
      }
    })();
  }
}

exports.default = IDB; /**
                        * IDB transaction proxy.
                        *
                        * @param  {IDBStore} store     The IndexedDB database store.
                        * @param  {Array}    preloaded The list of records to make available to
                        *                              get() (default: []).
                        * @return {Object}
                        */

function transactionProxy(store, preloaded = []) {
  return {
    create(record) {
      store.add(record);
    },

    update(record) {
      store.put(record);
    },

    delete(id) {
      store.delete(id);
    },

    get(id) {
      return preloaded[id];
    }
  };
}

},{"../utils":23,"./base.js":20}],20:[function(require,module,exports){
"use strict";

/**
 * Base db adapter.
 *
 * @abstract
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
class BaseAdapter {
  /**
   * Deletes every records present in the database.
   *
   * @abstract
   * @return {Promise}
   */
  clear() {
    throw new Error("Not Implemented.");
  }

  /**
   * Executes a batch of operations within a single transaction.
   *
   * @abstract
   * @param  {Function} callback The operation callback.
   * @param  {Object}   options  The options object.
   * @return {Promise}
   */
  execute(callback, options = { preload: [] }) {
    throw new Error("Not Implemented.");
  }

  /**
   * Retrieve a record by its primary key from the database.
   *
   * @abstract
   * @param  {String} id The record id.
   * @return {Promise}
   */
  get(id) {
    throw new Error("Not Implemented.");
  }

  /**
   * Lists all records from the database.
   *
   * @abstract
   * @param  {Object} params  The filters and order to apply to the results.
   * @return {Promise}
   */
  list(params = { filters: {}, order: "" }) {
    throw new Error("Not Implemented.");
  }

  /**
   * Store the lastModified value.
   *
   * @abstract
   * @param  {Number}  lastModified
   * @return {Promise}
   */
  saveLastModified(lastModified) {
    throw new Error("Not Implemented.");
  }

  /**
   * Retrieve saved lastModified value.
   *
   * @abstract
   * @return {Promise}
   */
  getLastModified() {
    throw new Error("Not Implemented.");
  }

  /**
   * Load a dump of records exported from a server.
   *
   * @abstract
   * @return {Promise}
   */
  loadDump(records) {
    throw new Error("Not Implemented.");
  }
}
exports.default = BaseAdapter;

},{}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CollectionTransaction = exports.SyncResultObject = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.recordsEqual = recordsEqual;

var _base = require("./adapters/base");

var _base2 = _interopRequireDefault(_base);

var _IDB = require("./adapters/IDB");

var _IDB2 = _interopRequireDefault(_IDB);

var _utils = require("./utils");

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const RECORD_FIELDS_TO_CLEAN = ["_status"];
const AVAILABLE_HOOKS = ["incoming-changes"];

/**
 * Compare two records omitting local fields and synchronization
 * attributes (like _status and last_modified)
 * @param {Object} a    A record to compare.
 * @param {Object} b    A record to compare.
 * @return {boolean}
 */
function recordsEqual(a, b, localFields = []) {
  const fieldsToClean = RECORD_FIELDS_TO_CLEAN.concat(["last_modified"]).concat(localFields);
  const cleanLocal = r => (0, _utils.omitKeys)(r, fieldsToClean);
  return (0, _utils.deepEqual)(cleanLocal(a), cleanLocal(b));
}

/**
 * Synchronization result object.
 */
class SyncResultObject {
  /**
   * Object default values.
   * @type {Object}
   */
  static get defaults() {
    return {
      ok: true,
      lastModified: null,
      errors: [],
      created: [],
      updated: [],
      deleted: [],
      published: [],
      conflicts: [],
      skipped: [],
      resolved: []
    };
  }

  /**
   * Public constructor.
   */
  constructor() {
    /**
     * Current synchronization result status; becomes `false` when conflicts or
     * errors are registered.
     * @type {Boolean}
     */
    this.ok = true;
    Object.assign(this, SyncResultObject.defaults);
  }

  /**
   * Adds entries for a given result type.
   *
   * @param {String} type    The result type.
   * @param {Array}  entries The result entries.
   * @return {SyncResultObject}
   */
  add(type, entries) {
    if (!Array.isArray(this[type])) {
      return;
    }
    // Deduplicate entries by id. If the values don't have `id` attribute, just
    // keep all.
    const deduplicated = this[type].concat(entries).reduce((acc, cur) => {
      const existing = acc.filter(r => cur.id && r.id ? cur.id != r.id : true);
      return existing.concat(cur);
    }, []);
    this[type] = deduplicated;
    this.ok = this.errors.length + this.conflicts.length === 0;
    return this;
  }

  /**
   * Reinitializes result entries for a given result type.
   *
   * @param  {String} type The result type.
   * @return {SyncResultObject}
   */
  reset(type) {
    this[type] = SyncResultObject.defaults[type];
    this.ok = this.errors.length + this.conflicts.length === 0;
    return this;
  }
}

exports.SyncResultObject = SyncResultObject;
function createUUIDSchema() {
  return {
    generate() {
      return (0, _uuid.v4)();
    },

    validate(id) {
      return (0, _utils.isUUID)(id);
    }
  };
}

function markStatus(record, status) {
  return _extends({}, record, { _status: status });
}

function markDeleted(record) {
  return markStatus(record, "deleted");
}

function markSynced(record) {
  return markStatus(record, "synced");
}

/**
 * Import a remote change into the local database.
 *
 * @param  {IDBTransactionProxy} transaction The transaction handler.
 * @param  {Object}              remote      The remote change object to import.
 * @param  {Array<String>}       localFields The list of fields that remain local.
 * @return {Object}
 */
function importChange(transaction, remote, localFields) {
  const local = transaction.get(remote.id);
  if (!local) {
    // Not found locally but remote change is marked as deleted; skip to
    // avoid recreation.
    if (remote.deleted) {
      return { type: "skipped", data: remote };
    }
    const synced = markSynced(remote);
    transaction.create(synced);
    return { type: "created", data: synced };
  }
  // Compare local and remote, ignoring local fields.
  const isIdentical = recordsEqual(local, remote, localFields);
  // Apply remote changes on local record.
  const synced = _extends({}, local, markSynced(remote));
  // Detect or ignore conflicts if record has also been modified locally.
  if (local._status !== "synced") {
    // Locally deleted, unsynced: scheduled for remote deletion.
    if (local._status === "deleted") {
      return { type: "skipped", data: local };
    }
    if (isIdentical) {
      // If records are identical, import anyway, so we bump the
      // local last_modified value from the server and set record
      // status to "synced".
      transaction.update(synced);
      return { type: "updated", data: { old: local, new: synced } };
    }
    if (local.last_modified !== undefined && local.last_modified === remote.last_modified) {
      // If our local version has the same last_modified as the remote
      // one, this represents an object that corresponds to a resolved
      // conflict. Our local version represents the final output, so
      // we keep that one. (No transaction operation to do.)
      // But if our last_modified is undefined,
      // that means we've created the same object locally as one on
      // the server, which *must* be a conflict.
      return { type: "void" };
    }
    return {
      type: "conflicts",
      data: { type: "incoming", local: local, remote: remote }
    };
  }
  // Local record was synced.
  if (remote.deleted) {
    transaction.delete(remote.id);
    return { type: "deleted", data: local };
  }
  // Import locally.
  transaction.update(synced);
  // if identical, simply exclude it from all SyncResultObject lists
  const type = isIdentical ? "void" : "updated";
  return { type, data: { old: local, new: synced } };
}

/**
 * Abstracts a collection of records stored in the local database, providing
 * CRUD operations and synchronization helpers.
 */
class Collection {
  /**
   * Constructor.
   *
   * Options:
   * - `{BaseAdapter} adapter` The DB adapter (default: `IDB`)
   * - `{String} dbPrefix`     The DB name prefix (default: `""`)
   *
   * @param  {String} bucket  The bucket identifier.
   * @param  {String} name    The collection name.
   * @param  {Api}    api     The Api instance.
   * @param  {Object} options The options object.
   */
  constructor(bucket, name, api, options = {}) {
    this._bucket = bucket;
    this._name = name;
    this._lastModified = null;

    const DBAdapter = options.adapter || _IDB2.default;
    if (!DBAdapter) {
      throw new Error("No adapter provided");
    }
    const dbPrefix = options.dbPrefix || "";
    const db = new DBAdapter(`${dbPrefix}${bucket}/${name}`, options.adapterOptions);
    if (!(db instanceof _base2.default)) {
      throw new Error("Unsupported adapter.");
    }
    // public properties
    /**
     * The db adapter instance
     * @type {BaseAdapter}
     */
    this.db = db;
    /**
     * The Api instance.
     * @type {KintoClient}
     */
    this.api = api;
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    this.events = options.events;
    /**
     * The IdSchema instance.
     * @type {Object}
     */
    this.idSchema = this._validateIdSchema(options.idSchema);
    /**
     * The list of remote transformers.
     * @type {Array}
     */
    this.remoteTransformers = this._validateRemoteTransformers(options.remoteTransformers);
    /**
     * The list of hooks.
     * @type {Object}
     */
    this.hooks = this._validateHooks(options.hooks);
    /**
     * The list of fields names that will remain local.
     * @type {Array}
     */
    this.localFields = options.localFields || [];
  }

  /**
   * The collection name.
   * @type {String}
   */
  get name() {
    return this._name;
  }

  /**
   * The bucket name.
   * @type {String}
   */
  get bucket() {
    return this._bucket;
  }

  /**
   * The last modified timestamp.
   * @type {Number}
   */
  get lastModified() {
    return this._lastModified;
  }

  /**
   * Synchronization strategies. Available strategies are:
   *
   * - `MANUAL`: Conflicts will be reported in a dedicated array.
   * - `SERVER_WINS`: Conflicts are resolved using remote data.
   * - `CLIENT_WINS`: Conflicts are resolved using local data.
   *
   * @type {Object}
   */
  static get strategy() {
    return {
      CLIENT_WINS: "client_wins",
      SERVER_WINS: "server_wins",
      MANUAL: "manual"
    };
  }

  /**
   * Validates an idSchema.
   *
   * @param  {Object|undefined} idSchema
   * @return {Object}
   */
  _validateIdSchema(idSchema) {
    if (typeof idSchema === "undefined") {
      return createUUIDSchema();
    }
    if (typeof idSchema !== "object") {
      throw new Error("idSchema must be an object.");
    } else if (typeof idSchema.generate !== "function") {
      throw new Error("idSchema must provide a generate function.");
    } else if (typeof idSchema.validate !== "function") {
      throw new Error("idSchema must provide a validate function.");
    }
    return idSchema;
  }

  /**
   * Validates a list of remote transformers.
   *
   * @param  {Array|undefined} remoteTransformers
   * @return {Array}
   */
  _validateRemoteTransformers(remoteTransformers) {
    if (typeof remoteTransformers === "undefined") {
      return [];
    }
    if (!Array.isArray(remoteTransformers)) {
      throw new Error("remoteTransformers should be an array.");
    }
    return remoteTransformers.map(transformer => {
      if (typeof transformer !== "object") {
        throw new Error("A transformer must be an object.");
      } else if (typeof transformer.encode !== "function") {
        throw new Error("A transformer must provide an encode function.");
      } else if (typeof transformer.decode !== "function") {
        throw new Error("A transformer must provide a decode function.");
      }
      return transformer;
    });
  }

  /**
   * Validate the passed hook is correct.
   *
   * @param {Array|undefined} hook.
   * @return {Array}
   **/
  _validateHook(hook) {
    if (!Array.isArray(hook)) {
      throw new Error("A hook definition should be an array of functions.");
    }
    return hook.map(fn => {
      if (typeof fn !== "function") {
        throw new Error("A hook definition should be an array of functions.");
      }
      return fn;
    });
  }

  /**
   * Validates a list of hooks.
   *
   * @param  {Object|undefined} hooks
   * @return {Object}
   */
  _validateHooks(hooks) {
    if (typeof hooks === "undefined") {
      return {};
    }
    if (Array.isArray(hooks)) {
      throw new Error("hooks should be an object, not an array.");
    }
    if (typeof hooks !== "object") {
      throw new Error("hooks should be an object.");
    }

    const validatedHooks = {};

    for (const hook in hooks) {
      if (AVAILABLE_HOOKS.indexOf(hook) === -1) {
        throw new Error("The hook should be one of " + AVAILABLE_HOOKS.join(", "));
      }
      validatedHooks[hook] = this._validateHook(hooks[hook]);
    }
    return validatedHooks;
  }

  /**
   * Deletes every records in the current collection and marks the collection as
   * never synced.
   *
   * @return {Promise}
   */
  clear() {
    var _this = this;

    return _asyncToGenerator(function* () {
      yield _this.db.clear();
      yield _this.db.saveLastModified(null);
      return { data: [], permissions: {} };
    })();
  }

  /**
   * Encodes a record.
   *
   * @param  {String} type   Either "remote" or "local".
   * @param  {Object} record The record object to encode.
   * @return {Promise}
   */
  _encodeRecord(type, record) {
    if (!this[`${type}Transformers`].length) {
      return Promise.resolve(record);
    }
    return (0, _utils.waterfall)(this[`${type}Transformers`].map(transformer => {
      return record => transformer.encode(record);
    }), record);
  }

  /**
   * Decodes a record.
   *
   * @param  {String} type   Either "remote" or "local".
   * @param  {Object} record The record object to decode.
   * @return {Promise}
   */
  _decodeRecord(type, record) {
    if (!this[`${type}Transformers`].length) {
      return Promise.resolve(record);
    }
    return (0, _utils.waterfall)(this[`${type}Transformers`].reverse().map(transformer => {
      return record => transformer.decode(record);
    }), record);
  }

  /**
   * Adds a record to the local database, asserting that none
   * already exist with this ID.
   *
   * Note: If either the `useRecordId` or `synced` options are true, then the
   * record object must contain the id field to be validated. If none of these
   * options are true, an id is generated using the current IdSchema; in this
   * case, the record passed must not have an id.
   *
   * Options:
   * - {Boolean} synced       Sets record status to "synced" (default: `false`).
   * - {Boolean} useRecordId  Forces the `id` field from the record to be used,
   *                          instead of one that is generated automatically
   *                          (default: `false`).
   *
   * @param  {Object} record
   * @param  {Object} options
   * @return {Promise}
   */
  create(record, options = { useRecordId: false, synced: false }) {
    // Validate the record and its ID (if any), even though this
    // validation is also done in the CollectionTransaction method,
    // because we need to pass the ID to preloadIds.
    const reject = msg => Promise.reject(new Error(msg));
    if (typeof record !== "object") {
      return reject("Record is not an object.");
    }
    if ((options.synced || options.useRecordId) && !record.hasOwnProperty("id")) {
      return reject("Missing required Id; synced and useRecordId options require one");
    }
    if (!options.synced && !options.useRecordId && record.hasOwnProperty("id")) {
      return reject("Extraneous Id; can't create a record having one set.");
    }
    const newRecord = _extends({}, record, {
      id: options.synced || options.useRecordId ? record.id : this.idSchema.generate(record),
      _status: options.synced ? "synced" : "created"
    });
    if (!this.idSchema.validate(newRecord.id)) {
      return reject(`Invalid Id: ${newRecord.id}`);
    }
    return this.execute(txn => txn.create(newRecord), {
      preloadIds: [newRecord.id]
    }).catch(err => {
      if (options.useRecordId) {
        throw new Error("Couldn't create record. It may have been virtually deleted.");
      }
      throw err;
    });
  }

  /**
   * Like {@link CollectionTransaction#update}, but wrapped in its own transaction.
   *
   * Options:
   * - {Boolean} synced: Sets record status to "synced" (default: false)
   * - {Boolean} patch:  Extends the existing record instead of overwriting it
   *   (default: false)
   *
   * @param  {Object} record
   * @param  {Object} options
   * @return {Promise}
   */
  update(record, options = { synced: false, patch: false }) {
    // Validate the record and its ID, even though this validation is
    // also done in the CollectionTransaction method, because we need
    // to pass the ID to preloadIds.
    if (typeof record !== "object") {
      return Promise.reject(new Error("Record is not an object."));
    }
    if (!record.hasOwnProperty("id")) {
      return Promise.reject(new Error("Cannot update a record missing id."));
    }
    if (!this.idSchema.validate(record.id)) {
      return Promise.reject(new Error(`Invalid Id: ${record.id}`));
    }

    return this.execute(txn => txn.update(record, options), {
      preloadIds: [record.id]
    });
  }

  /**
   * Like {@link CollectionTransaction#upsert}, but wrapped in its own transaction.
   *
   * @param  {Object} record
   * @return {Promise}
   */
  upsert(record) {
    // Validate the record and its ID, even though this validation is
    // also done in the CollectionTransaction method, because we need
    // to pass the ID to preloadIds.
    if (typeof record !== "object") {
      return Promise.reject(new Error("Record is not an object."));
    }
    if (!record.hasOwnProperty("id")) {
      return Promise.reject(new Error("Cannot update a record missing id."));
    }
    if (!this.idSchema.validate(record.id)) {
      return Promise.reject(new Error(`Invalid Id: ${record.id}`));
    }

    return this.execute(txn => txn.upsert(record), { preloadIds: [record.id] });
  }

  /**
   * Like {@link CollectionTransaction#get}, but wrapped in its own transaction.
   *
   * Options:
   * - {Boolean} includeDeleted: Include virtually deleted records.
   *
   * @param  {String} id
   * @param  {Object} options
   * @return {Promise}
   */
  get(id, options = { includeDeleted: false }) {
    return this.execute(txn => txn.get(id, options), { preloadIds: [id] });
  }

  /**
   * Like {@link CollectionTransaction#getAny}, but wrapped in its own transaction.
   *
   * @param  {String} id
   * @return {Promise}
   */
  getAny(id) {
    return this.execute(txn => txn.getAny(id), { preloadIds: [id] });
  }

  /**
   * Same as {@link Collection#delete}, but wrapped in its own transaction.
   *
   * Options:
   * - {Boolean} virtual: When set to `true`, doesn't actually delete the record,
   *   update its `_status` attribute to `deleted` instead (default: true)
   *
   * @param  {String} id       The record's Id.
   * @param  {Object} options  The options object.
   * @return {Promise}
   */
  delete(id, options = { virtual: true }) {
    return this.execute(transaction => {
      return transaction.delete(id, options);
    }, { preloadIds: [id] });
  }

  /**
   * The same as {@link CollectionTransaction#deleteAny}, but wrapped
   * in its own transaction.
   *
   * @param  {String} id       The record's Id.
   * @return {Promise}
   */
  deleteAny(id) {
    return this.execute(txn => txn.deleteAny(id), { preloadIds: [id] });
  }

  /**
   * Lists records from the local database.
   *
   * Params:
   * - {Object} filters Filter the results (default: `{}`).
   * - {String} order   The order to apply   (default: `-last_modified`).
   *
   * Options:
   * - {Boolean} includeDeleted: Include virtually deleted records.
   *
   * @param  {Object} params  The filters and order to apply to the results.
   * @param  {Object} options The options object.
   * @return {Promise}
   */
  list(params = {}, options = { includeDeleted: false }) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      params = _extends({ order: "-last_modified", filters: {} }, params);
      const results = yield _this2.db.list(params);
      let data = results;
      if (!options.includeDeleted) {
        data = results.filter(function (record) {
          return record._status !== "deleted";
        });
      }
      return { data, permissions: {} };
    })();
  }

  /**
   * Imports remote changes into the local database.
   * This method is in charge of detecting the conflicts, and resolve them
   * according to the specified strategy.
   * @param  {SyncResultObject} syncResultObject The sync result object.
   * @param  {Array}            decodedChanges   The list of changes to import in the local database.
   * @param  {String}           strategy         The {@link Collection.strategy} (default: MANUAL)
   * @return {Promise}
   */
  importChanges(syncResultObject, decodedChanges, strategy = Collection.strategy.MANUAL) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // Retrieve records matching change ids.
      try {
        const { imports, resolved } = yield _this3.db.execute(function (transaction) {
          const imports = decodedChanges.map(function (remote) {
            // Store remote change into local database.
            return importChange(transaction, remote, _this3.localFields);
          });
          const conflicts = imports.filter(function (i) {
            return i.type === "conflicts";
          }).map(function (i) {
            return i.data;
          });
          const resolved = _this3._handleConflicts(transaction, conflicts, strategy);
          return { imports, resolved };
        }, { preload: decodedChanges.map(function (record) {
            return record.id;
          }) });

        // Lists of created/updated/deleted records
        imports.forEach(function ({ type, data }) {
          return syncResultObject.add(type, data);
        });

        // Automatically resolved conflicts (if not manual)
        if (resolved.length > 0) {
          syncResultObject.reset("conflicts").add("resolved", resolved);
        }
      } catch (err) {
        const data = {
          type: "incoming",
          message: err.message,
          stack: err.stack
        };
        // XXX one error of the whole transaction instead of per atomic op
        syncResultObject.add("errors", data);
      }

      return syncResultObject;
    })();
  }

  /**
   * Imports the responses of pushed changes into the local database.
   * Basically it stores the timestamp assigned by the server into the local
   * database.
   * @param  {SyncResultObject} syncResultObject The sync result object.
   * @param  {Array}            toApplyLocally   The list of changes to import in the local database.
   * @param  {Array}            conflicts        The list of conflicts that have to be resolved.
   * @param  {String}           strategy         The {@link Collection.strategy}.
   * @return {Promise}
   */
  _applyPushedResults(syncResultObject, toApplyLocally, conflicts, strategy = Collection.strategy.MANUAL) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const toDeleteLocally = toApplyLocally.filter(function (r) {
        return r.deleted;
      });
      const toUpdateLocally = toApplyLocally.filter(function (r) {
        return !r.deleted;
      });

      const { published, resolved } = yield _this4.db.execute(function (transaction) {
        const updated = toUpdateLocally.map(function (record) {
          const synced = markSynced(record);
          transaction.update(synced);
          return synced;
        });
        const deleted = toDeleteLocally.map(function (record) {
          transaction.delete(record.id);
          // Amend result data with the deleted attribute set
          return { id: record.id, deleted: true };
        });
        const published = updated.concat(deleted);
        // Handle conflicts, if any
        const resolved = _this4._handleConflicts(transaction, conflicts, strategy);
        return { published, resolved };
      });

      syncResultObject.add("published", published);

      if (resolved.length > 0) {
        syncResultObject.reset("conflicts").reset("resolved").add("resolved", resolved);
      }
      return syncResultObject;
    })();
  }

  /**
   * Handles synchronization conflicts according to specified strategy.
   *
   * @param  {SyncResultObject} result    The sync result object.
   * @param  {String}           strategy  The {@link Collection.strategy}.
   * @return {Promise<Array<Object>>} The resolved conflicts, as an
   *    array of {accepted, rejected} objects
   */
  _handleConflicts(transaction, conflicts, strategy) {
    if (strategy === Collection.strategy.MANUAL) {
      return [];
    }
    return conflicts.map(conflict => {
      const resolution = strategy === Collection.strategy.CLIENT_WINS ? conflict.local : conflict.remote;
      const rejected = strategy === Collection.strategy.CLIENT_WINS ? conflict.remote : conflict.local;
      let accepted, status, id;
      if (resolution === null) {
        // We "resolved" with the server-side deletion. Delete locally.
        // This only happens during SERVER_WINS because the local
        // version of a record can never be null.
        // We can get "null" from the remote side if we got a conflict
        // and there is no remote version available; see kinto-http.js
        // batch.js:aggregate.
        transaction.delete(conflict.local.id);
        accepted = null;
        // The record was deleted, but that status is "synced" with
        // the server, so we don't need to push the change.
        status = "synced";
        id = conflict.local.id;
      } else {
        const updated = this._resolveRaw(conflict, resolution);
        transaction.update(updated);
        accepted = updated;
        status = updated._status;
        id = updated.id;
      }
      return { rejected, accepted, id, _status: status };
    });
  }

  /**
   * Execute a bunch of operations in a transaction.
   *
   * This transaction should be atomic -- either all of its operations
   * will succeed, or none will.
   *
   * The argument to this function is itself a function which will be
   * called with a {@link CollectionTransaction}. Collection methods
   * are available on this transaction, but instead of returning
   * promises, they are synchronous. execute() returns a Promise whose
   * value will be the return value of the provided function.
   *
   * Most operations will require access to the record itself, which
   * must be preloaded by passing its ID in the preloadIds option.
   *
   * Options:
   * - {Array} preloadIds: list of IDs to fetch at the beginning of
   *   the transaction
   *
   * @return {Promise} Resolves with the result of the given function
   *    when the transaction commits.
   */
  execute(doOperations, { preloadIds = [] } = {}) {
    for (const id of preloadIds) {
      if (!this.idSchema.validate(id)) {
        return Promise.reject(Error(`Invalid Id: ${id}`));
      }
    }

    return this.db.execute(transaction => {
      const txn = new CollectionTransaction(this, transaction);
      const result = doOperations(txn);
      txn.emitEvents();
      return result;
    }, { preload: preloadIds });
  }

  /**
   * Resets the local records as if they were never synced; existing records are
   * marked as newly created, deleted records are dropped.
   *
   * A next call to {@link Collection.sync} will thus republish the whole
   * content of the local collection to the server.
   *
   * @return {Promise} Resolves with the number of processed records.
   */
  resetSyncStatus() {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const unsynced = yield _this5.list({ filters: { _status: ["deleted", "synced"] }, order: "" }, { includeDeleted: true });
      yield _this5.db.execute(function (transaction) {
        unsynced.data.forEach(function (record) {
          if (record._status === "deleted") {
            // Garbage collect deleted records.
            transaction.delete(record.id);
          } else {
            // Records that were synced become «created».
            transaction.update(_extends({}, record, {
              last_modified: undefined,
              _status: "created"
            }));
          }
        });
      });
      _this5._lastModified = null;
      yield _this5.db.saveLastModified(null);
      return unsynced.data.length;
    })();
  }

  /**
   * Returns an object containing two lists:
   *
   * - `toDelete`: unsynced deleted records we can safely delete;
   * - `toSync`: local updates to send to the server.
   *
   * @return {Promise}
   */
  gatherLocalChanges() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const unsynced = yield _this6.list({
        filters: { _status: ["created", "updated"] },
        order: ""
      });
      const deleted = yield _this6.list({ filters: { _status: "deleted" }, order: "" }, { includeDeleted: true });

      return yield Promise.all(unsynced.data.concat(deleted.data).map(_this6._encodeRecord.bind(_this6, "remote")));
    })();
  }

  /**
   * Fetch remote changes, import them to the local database, and handle
   * conflicts according to `options.strategy`. Then, updates the passed
   * {@link SyncResultObject} with import results.
   *
   * Options:
   * - {String} strategy: The selected sync strategy.
   *
   * @param  {KintoClient.Collection} client           Kinto client Collection instance.
   * @param  {SyncResultObject}       syncResultObject The sync result object.
   * @param  {Object}                 options
   * @return {Promise}
   */
  pullChanges(client, syncResultObject, options = {}) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      if (!syncResultObject.ok) {
        return syncResultObject;
      }

      const since = _this7.lastModified ? _this7.lastModified : yield _this7.db.getLastModified();

      options = _extends({
        strategy: Collection.strategy.MANUAL,
        lastModified: since,
        headers: {}
      }, options);

      // Optionally ignore some records when pulling for changes.
      // (avoid redownloading our own changes on last step of #sync())
      let filters;
      if (options.exclude) {
        // Limit the list of excluded records to the first 50 records in order
        // to remain under de-facto URL size limit (~2000 chars).
        // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers/417184#417184
        const exclude_id = options.exclude.slice(0, 50).map(function (r) {
          return r.id;
        }).join(",");
        filters = { exclude_id };
      }
      // First fetch remote changes from the server
      const { data, last_modified } = yield client.listRecords({
        // Since should be ETag (see https://github.com/Kinto/kinto.js/issues/356)
        since: options.lastModified ? `${options.lastModified}` : undefined,
        headers: options.headers,
        retry: options.retry,
        filters
      });
      // last_modified is the ETag header value (string).
      // For retro-compatibility with first kinto.js versions
      // parse it to integer.
      const unquoted = last_modified ? parseInt(last_modified, 10) : undefined;

      // Check if server was flushed.
      // This is relevant for the Kinto demo server
      // (and thus for many new comers).
      const localSynced = options.lastModified;
      const serverChanged = unquoted > options.lastModified;
      const emptyCollection = data.length === 0;
      if (!options.exclude && localSynced && serverChanged && emptyCollection) {
        throw Error("Server has been flushed.");
      }

      syncResultObject.lastModified = unquoted;

      // Decode incoming changes.
      const decodedChanges = yield Promise.all(data.map(function (change) {
        return _this7._decodeRecord("remote", change);
      }));
      // Hook receives decoded records.
      const payload = { lastModified: unquoted, changes: decodedChanges };
      const afterHooks = yield _this7.applyHook("incoming-changes", payload);

      // No change, nothing to import.
      if (afterHooks.changes.length > 0) {
        // Reflect these changes locally
        yield _this7.importChanges(syncResultObject, afterHooks.changes, options.strategy);
      }
      return syncResultObject;
    })();
  }

  applyHook(hookName, payload) {
    if (typeof this.hooks[hookName] == "undefined") {
      return Promise.resolve(payload);
    }
    return (0, _utils.waterfall)(this.hooks[hookName].map(hook => {
      return record => {
        const result = hook(payload, this);
        const resultThenable = result && typeof result.then === "function";
        const resultChanges = result && result.hasOwnProperty("changes");
        if (!(resultThenable || resultChanges)) {
          throw new Error(`Invalid return value for hook: ${JSON.stringify(result)} has no 'then()' or 'changes' properties`);
        }
        return result;
      };
    }), payload);
  }

  /**
   * Publish local changes to the remote server and updates the passed
   * {@link SyncResultObject} with publication results.
   *
   * @param  {KintoClient.Collection} client           Kinto client Collection instance.
   * @param  {SyncResultObject}       syncResultObject The sync result object.
   * @param  {Object}                 changes          The change object.
   * @param  {Array}                  changes.toDelete The list of records to delete.
   * @param  {Array}                  changes.toSync   The list of records to create/update.
   * @param  {Object}                 options          The options object.
   * @return {Promise}
   */
  pushChanges(client, changes, syncResultObject, options = {}) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      if (!syncResultObject.ok) {
        return syncResultObject;
      }
      const safe = !options.strategy || options.strategy !== Collection.CLIENT_WINS;
      const toDelete = changes.filter(function (r) {
        return r._status == "deleted";
      });
      const toSync = changes.filter(function (r) {
        return r._status != "deleted";
      });

      // Perform a batch request with every changes.
      const synced = yield client.batch(function (batch) {
        toDelete.forEach(function (r) {
          // never published locally deleted records should not be pusblished
          if (r.last_modified) {
            batch.deleteRecord(r);
          }
        });
        toSync.forEach(function (r) {
          // Clean local fields (like _status) before sending to server.
          const published = _this8.cleanLocalFields(r);
          if (r._status === "created") {
            batch.createRecord(published);
          } else {
            batch.updateRecord(published);
          }
        });
      }, {
        headers: options.headers,
        retry: options.retry,
        safe,
        aggregate: true
      });

      // Store outgoing errors into sync result object
      syncResultObject.add("errors", synced.errors.map(function (e) {
        return _extends({}, e, { type: "outgoing" });
      }));

      // Store outgoing conflicts into sync result object
      const conflicts = [];
      for (const _ref of synced.conflicts) {
        const { type, local, remote } = _ref;

        // Note: we ensure that local data are actually available, as they may
        // be missing in the case of a published deletion.
        const safeLocal = local && local.data || { id: remote.id };
        const realLocal = yield _this8._decodeRecord("remote", safeLocal);
        // We can get "null" from the remote side if we got a conflict
        // and there is no remote version available; see kinto-http.js
        // batch.js:aggregate.
        const realRemote = remote && (yield _this8._decodeRecord("remote", remote));
        const conflict = { type, local: realLocal, remote: realRemote };
        conflicts.push(conflict);
      }
      syncResultObject.add("conflicts", conflicts);

      // Records that must be deleted are either deletions that were pushed
      // to server (published) or deleted records that were never pushed (skipped).
      const missingRemotely = synced.skipped.map(function (r) {
        return _extends({}, r, { deleted: true });
      });

      // For created and updated records, the last_modified coming from server
      // will be stored locally.
      // Reflect publication results locally using the response from
      // the batch request.
      const published = synced.published.map(function (c) {
        return c.data;
      });
      const toApplyLocally = published.concat(missingRemotely);

      // Apply the decode transformers, if any
      const decoded = yield Promise.all(toApplyLocally.map(function (record) {
        return _this8._decodeRecord("remote", record);
      }));

      // We have to update the local records with the responses of the server
      // (eg. last_modified values etc.).
      if (decoded.length > 0 || conflicts.length > 0) {
        yield _this8._applyPushedResults(syncResultObject, decoded, conflicts, options.strategy);
      }

      return syncResultObject;
    })();
  }

  /**
   * Return a copy of the specified record without the local fields.
   *
   * @param  {Object} record  A record with potential local fields.
   * @return {Object}
   */
  cleanLocalFields(record) {
    const localKeys = RECORD_FIELDS_TO_CLEAN.concat(this.localFields);
    return (0, _utils.omitKeys)(record, localKeys);
  }

  /**
   * Resolves a conflict, updating local record according to proposed
   * resolution — keeping remote record `last_modified` value as a reference for
   * further batch sending.
   *
   * @param  {Object} conflict   The conflict object.
   * @param  {Object} resolution The proposed record.
   * @return {Promise}
   */
  resolve(conflict, resolution) {
    return this.db.execute(transaction => {
      const updated = this._resolveRaw(conflict, resolution);
      transaction.update(updated);
      return { data: updated, permissions: {} };
    });
  }

  /**
   * @private
   */
  _resolveRaw(conflict, resolution) {
    const resolved = _extends({}, resolution, {
      // Ensure local record has the latest authoritative timestamp
      last_modified: conflict.remote && conflict.remote.last_modified
    });
    // If the resolution object is strictly equal to the
    // remote record, then we can mark it as synced locally.
    // Otherwise, mark it as updated (so that the resolution is pushed).
    const synced = (0, _utils.deepEqual)(resolved, conflict.remote);
    return markStatus(resolved, synced ? "synced" : "updated");
  }

  /**
   * Synchronize remote and local data. The promise will resolve with a
   * {@link SyncResultObject}, though will reject:
   *
   * - if the server is currently backed off;
   * - if the server has been detected flushed.
   *
   * Options:
   * - {Object} headers: HTTP headers to attach to outgoing requests.
   * - {Number} retry: Number of retries when server fails to process the request (default: 1).
   * - {Collection.strategy} strategy: See {@link Collection.strategy}.
   * - {Boolean} ignoreBackoff: Force synchronization even if server is currently
   *   backed off.
   * - {String} bucket: The remove bucket id to use (default: null)
   * - {String} collection: The remove collection id to use (default: null)
   * - {String} remote The remote Kinto server endpoint to use (default: null).
   *
   * @param  {Object} options Options.
   * @return {Promise}
   * @throws {Error} If an invalid remote option is passed.
   */
  sync(options = {
    strategy: Collection.strategy.MANUAL,
    headers: {},
    retry: 1,
    ignoreBackoff: false,
    bucket: null,
    collection: null,
    remote: null
  }) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      options = _extends({}, options, {
        bucket: options.bucket || _this9.bucket,
        collection: options.collection || _this9.name
      });

      const previousRemote = _this9.api.remote;
      if (options.remote) {
        // Note: setting the remote ensures it's valid, throws when invalid.
        _this9.api.remote = options.remote;
      }
      if (!options.ignoreBackoff && _this9.api.backoff > 0) {
        const seconds = Math.ceil(_this9.api.backoff / 1000);
        return Promise.reject(new Error(`Server is asking clients to back off; retry in ${seconds}s or use the ignoreBackoff option.`));
      }

      const client = _this9.api.bucket(options.bucket).collection(options.collection);

      const result = new SyncResultObject();
      try {
        // Fetch last changes from the server.
        yield _this9.pullChanges(client, result, options);
        const { lastModified } = result;

        // Fetch local changes
        const toSync = yield _this9.gatherLocalChanges();

        // Publish local changes and pull local resolutions
        yield _this9.pushChanges(client, toSync, result, options);

        // Publish local resolution of push conflicts to server (on CLIENT_WINS)
        const resolvedUnsynced = result.resolved.filter(function (r) {
          return r._status !== "synced";
        });
        if (resolvedUnsynced.length > 0) {
          const resolvedEncoded = yield Promise.all(resolvedUnsynced.map(function (resolution) {
            let record = resolution.accepted;
            if (record === null) {
              record = { id: resolution.id, _status: resolution._status };
            }
            return _this9._encodeRecord("remote", record);
          }));
          yield _this9.pushChanges(client, resolvedEncoded, result, options);
        }
        // Perform a last pull to catch changes that occured after the last pull,
        // while local changes were pushed. Do not do it nothing was pushed.
        if (result.published.length > 0) {
          // Avoid redownloading our own changes during the last pull.
          const pullOpts = _extends({}, options, {
            lastModified,
            exclude: result.published
          });
          yield _this9.pullChanges(client, result, pullOpts);
        }

        // Don't persist lastModified value if any conflict or error occured
        if (result.ok) {
          // No conflict occured, persist collection's lastModified value
          _this9._lastModified = yield _this9.db.saveLastModified(result.lastModified);
        }
      } catch (e) {
        _this9.events.emit("sync:error", _extends({}, options, { error: e }));
        throw e;
      } finally {
        // Ensure API default remote is reverted if a custom one's been used
        _this9.api.remote = previousRemote;
      }
      _this9.events.emit("sync:success", _extends({}, options, { result }));
      return result;
    })();
  }

  /**
   * Load a list of records already synced with the remote server.
   *
   * The local records which are unsynced or whose timestamp is either missing
   * or superior to those being loaded will be ignored.
   *
   * @param  {Array} records The previously exported list of records to load.
   * @return {Promise} with the effectively imported records.
   */
  loadDump(records) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      if (!Array.isArray(records)) {
        throw new Error("Records is not an array.");
      }

      for (const record of records) {
        if (!record.hasOwnProperty("id") || !_this10.idSchema.validate(record.id)) {
          throw new Error("Record has invalid ID: " + JSON.stringify(record));
        }

        if (!record.last_modified) {
          throw new Error("Record has no last_modified value: " + JSON.stringify(record));
        }
      }

      // Fetch all existing records from local database,
      // and skip those who are newer or not marked as synced.

      // XXX filter by status / ids in records

      const { data } = yield _this10.list({}, { includeDeleted: true });
      const existingById = data.reduce(function (acc, record) {
        acc[record.id] = record;
        return acc;
      }, {});

      const newRecords = records.filter(function (record) {
        const localRecord = existingById[record.id];
        const shouldKeep =
        // No local record with this id.
        localRecord === undefined ||
        // Or local record is synced
        localRecord._status === "synced" &&
        // And was synced from server
        localRecord.last_modified !== undefined &&
        // And is older than imported one.
        record.last_modified > localRecord.last_modified;
        return shouldKeep;
      });

      return yield _this10.db.loadDump(newRecords.map(markSynced));
    })();
  }
}

exports.default = Collection; /**
                               * A Collection-oriented wrapper for an adapter's transaction.
                               *
                               * This defines the high-level functions available on a collection.
                               * The collection itself offers functions of the same name. These will
                               * perform just one operation in its own transaction.
                               */

class CollectionTransaction {
  constructor(collection, adapterTransaction) {
    this.collection = collection;
    this.adapterTransaction = adapterTransaction;

    this._events = [];
  }

  _queueEvent(action, payload) {
    this._events.push({ action, payload });
  }

  /**
   * Emit queued events, to be called once every transaction operations have
   * been executed successfully.
   */
  emitEvents() {
    for (const _ref2 of this._events) {
      const { action, payload } = _ref2;

      this.collection.events.emit(action, payload);
    }
    if (this._events.length > 0) {
      const targets = this._events.map(({ action, payload }) => _extends({
        action
      }, payload));
      this.collection.events.emit("change", { targets });
    }
    this._events = [];
  }

  /**
   * Retrieve a record by its id from the local database, or
   * undefined if none exists.
   *
   * This will also return virtually deleted records.
   *
   * @param  {String} id
   * @return {Object}
   */
  getAny(id) {
    const record = this.adapterTransaction.get(id);
    return { data: record, permissions: {} };
  }

  /**
   * Retrieve a record by its id from the local database.
   *
   * Options:
   * - {Boolean} includeDeleted: Include virtually deleted records.
   *
   * @param  {String} id
   * @param  {Object} options
   * @return {Object}
   */
  get(id, options = { includeDeleted: false }) {
    const res = this.getAny(id);
    if (!res.data || !options.includeDeleted && res.data._status === "deleted") {
      throw new Error(`Record with id=${id} not found.`);
    }

    return res;
  }

  /**
   * Deletes a record from the local database.
   *
   * Options:
   * - {Boolean} virtual: When set to `true`, doesn't actually delete the record,
   *   update its `_status` attribute to `deleted` instead (default: true)
   *
   * @param  {String} id       The record's Id.
   * @param  {Object} options  The options object.
   * @return {Object}
   */
  delete(id, options = { virtual: true }) {
    // Ensure the record actually exists.
    const existing = this.adapterTransaction.get(id);
    const alreadyDeleted = existing && existing._status == "deleted";
    if (!existing || alreadyDeleted && options.virtual) {
      throw new Error(`Record with id=${id} not found.`);
    }
    // Virtual updates status.
    if (options.virtual) {
      this.adapterTransaction.update(markDeleted(existing));
    } else {
      // Delete for real.
      this.adapterTransaction.delete(id);
    }
    this._queueEvent("delete", { data: existing });
    return { data: existing, permissions: {} };
  }

  /**
   * Deletes a record from the local database, if any exists.
   * Otherwise, do nothing.
   *
   * @param  {String} id       The record's Id.
   * @return {Object}
   */
  deleteAny(id) {
    const existing = this.adapterTransaction.get(id);
    if (existing) {
      this.adapterTransaction.update(markDeleted(existing));
      this._queueEvent("delete", { data: existing });
    }
    return { data: _extends({ id }, existing), deleted: !!existing, permissions: {} };
  }

  /**
   * Adds a record to the local database, asserting that none
   * already exist with this ID.
   *
   * @param  {Object} record, which must contain an ID
   * @return {Object}
   */
  create(record) {
    if (typeof record !== "object") {
      throw new Error("Record is not an object.");
    }
    if (!record.hasOwnProperty("id")) {
      throw new Error("Cannot create a record missing id");
    }
    if (!this.collection.idSchema.validate(record.id)) {
      throw new Error(`Invalid Id: ${record.id}`);
    }

    this.adapterTransaction.create(record);
    this._queueEvent("create", { data: record });
    return { data: record, permissions: {} };
  }

  /**
   * Updates a record from the local database.
   *
   * Options:
   * - {Boolean} synced: Sets record status to "synced" (default: false)
   * - {Boolean} patch:  Extends the existing record instead of overwriting it
   *   (default: false)
   *
   * @param  {Object} record
   * @param  {Object} options
   * @return {Object}
   */
  update(record, options = { synced: false, patch: false }) {
    if (typeof record !== "object") {
      throw new Error("Record is not an object.");
    }
    if (!record.hasOwnProperty("id")) {
      throw new Error("Cannot update a record missing id.");
    }
    if (!this.collection.idSchema.validate(record.id)) {
      throw new Error(`Invalid Id: ${record.id}`);
    }

    const oldRecord = this.adapterTransaction.get(record.id);
    if (!oldRecord) {
      throw new Error(`Record with id=${record.id} not found.`);
    }
    const newRecord = options.patch ? _extends({}, oldRecord, record) : record;
    const updated = this._updateRaw(oldRecord, newRecord, options);
    this.adapterTransaction.update(updated);
    this._queueEvent("update", { data: updated, oldRecord });
    return { data: updated, oldRecord, permissions: {} };
  }

  /**
   * Lower-level primitive for updating a record while respecting
   * _status and last_modified.
   *
   * @param  {Object} oldRecord: the record retrieved from the DB
   * @param  {Object} newRecord: the record to replace it with
   * @return {Object}
   */
  _updateRaw(oldRecord, newRecord, { synced = false } = {}) {
    const updated = _extends({}, newRecord);
    // Make sure to never loose the existing timestamp.
    if (oldRecord && oldRecord.last_modified && !updated.last_modified) {
      updated.last_modified = oldRecord.last_modified;
    }
    // If only local fields have changed, then keep record as synced.
    // If status is created, keep record as created.
    // If status is deleted, mark as updated.
    const isIdentical = oldRecord && recordsEqual(oldRecord, updated, this.localFields);
    const keepSynced = isIdentical && oldRecord._status == "synced";
    const neverSynced = !oldRecord || oldRecord && oldRecord._status == "created";
    const newStatus = keepSynced || synced ? "synced" : neverSynced ? "created" : "updated";
    return markStatus(updated, newStatus);
  }

  /**
   * Upsert a record into the local database.
   *
   * This record must have an ID.
   *
   * If a record with this ID already exists, it will be replaced.
   * Otherwise, this record will be inserted.
   *
   * @param  {Object} record
   * @return {Object}
   */
  upsert(record) {
    if (typeof record !== "object") {
      throw new Error("Record is not an object.");
    }
    if (!record.hasOwnProperty("id")) {
      throw new Error("Cannot update a record missing id.");
    }
    if (!this.collection.idSchema.validate(record.id)) {
      throw new Error(`Invalid Id: ${record.id}`);
    }
    let oldRecord = this.adapterTransaction.get(record.id);
    const updated = this._updateRaw(oldRecord, record);
    this.adapterTransaction.update(updated);
    // Don't return deleted records -- pretend they are gone
    if (oldRecord && oldRecord._status == "deleted") {
      oldRecord = undefined;
    }
    if (oldRecord) {
      this._queueEvent("update", { data: updated, oldRecord });
    } else {
      this._queueEvent("create", { data: updated });
    }
    return { data: updated, oldRecord, permissions: {} };
  }
}
exports.CollectionTransaction = CollectionTransaction;

},{"./adapters/IDB":19,"./adapters/base":20,"./utils":23,"uuid":13}],22:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _events = require("events");

var _kintoHttp = require("kinto-http");

var _kintoHttp2 = _interopRequireDefault(_kintoHttp);

var _base = require("./adapters/base");

var _base2 = _interopRequireDefault(_base);

var _IDB = require("./adapters/IDB");

var _IDB2 = _interopRequireDefault(_IDB);

var _KintoBase = require("./KintoBase");

var _KintoBase2 = _interopRequireDefault(_KintoBase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// babel-polyfill can only be imported once
if (!global._babelPolyfill) {
  require("babel-polyfill");
}

class Kinto extends _KintoBase2.default {
  /**
   * Provides a public access to the base adapter classes. Users can create
   * a custom DB adapter by extending BaseAdapter.
   *
   * @type {Object}
   */
  static get adapters() {
    return {
      BaseAdapter: _base2.default,
      IDB: _IDB2.default
    };
  }

  constructor(options = {}) {
    const defaults = {
      adapter: Kinto.adapters.IDB,
      events: new _events.EventEmitter(),
      ApiClass: _kintoHttp2.default
    };

    super(_extends({}, defaults, options));
  }
}

exports.default = Kinto; // This fixes compatibility with CommonJS required by browserify.
// See http://stackoverflow.com/questions/33505992/babel-6-changes-how-it-exports-default/33683495#33683495

if (typeof module === "object") {
  module.exports = Kinto;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./KintoBase":18,"./adapters/IDB":19,"./adapters/base":20,"babel-polyfill":1,"events":2,"kinto-http":10}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sortObjects = sortObjects;
exports.filterObject = filterObject;
exports.filterObjects = filterObjects;
exports.isUUID = isUUID;
exports.waterfall = waterfall;
exports.deepEqual = deepEqual;
exports.omitKeys = omitKeys;
const RE_UUID = exports.RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks if a value is undefined.
 * @param  {Any}  value
 * @return {Boolean}
 */
function _isUndefined(value) {
  return typeof value === "undefined";
}

/**
 * Sorts records in a list according to a given ordering.
 *
 * @param  {String} order The ordering, eg. `-last_modified`.
 * @param  {Array}  list  The collection to order.
 * @return {Array}
 */
function sortObjects(order, list) {
  const hasDash = order[0] === "-";
  const field = hasDash ? order.slice(1) : order;
  const direction = hasDash ? -1 : 1;
  return list.slice().sort((a, b) => {
    if (a[field] && _isUndefined(b[field])) {
      return direction;
    }
    if (b[field] && _isUndefined(a[field])) {
      return -direction;
    }
    if (_isUndefined(a[field]) && _isUndefined(b[field])) {
      return 0;
    }
    return a[field] > b[field] ? direction : -direction;
  });
}

/**
 * Test if a single object matches all given filters.
 *
 * @param  {Object} filters  The filters object.
 * @param  {Object} entry    The object to filter.
 * @return {Function}
 */
function filterObject(filters, entry) {
  return Object.keys(filters).every(filter => {
    const value = filters[filter];
    if (Array.isArray(value)) {
      return value.some(candidate => candidate === entry[filter]);
    }
    return entry[filter] === value;
  });
}

/**
 * Filters records in a list matching all given filters.
 *
 * @param  {Object} filters  The filters object.
 * @param  {Array}  list     The collection to filter.
 * @return {Array}
 */
function filterObjects(filters, list) {
  return list.filter(entry => {
    return filterObject(filters, entry);
  });
}

/**
 * Checks if a string is an UUID.
 *
 * @param  {String} uuid The uuid to validate.
 * @return {Boolean}
 */
function isUUID(uuid) {
  return RE_UUID.test(uuid);
}

/**
 * Resolves a list of functions sequentially, which can be sync or async; in
 * case of async, functions must return a promise.
 *
 * @param  {Array} fns  The list of functions.
 * @param  {Any}   init The initial value.
 * @return {Promise}
 */
function waterfall(fns, init) {
  if (!fns.length) {
    return Promise.resolve(init);
  }
  return fns.reduce((promise, nextFn) => {
    return promise.then(nextFn);
  }, Promise.resolve(init));
}

/**
 * Simple deep object comparison function. This only supports comparison of
 * serializable JavaScript objects.
 *
 * @param  {Object} a The source object.
 * @param  {Object} b The compared object.
 * @return {Boolean}
 */
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (!(a && typeof a == "object") || !(b && typeof b == "object")) {
    return false;
  }
  if (Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }
  for (let k in a) {
    if (!deepEqual(a[k], b[k])) {
      return false;
    }
  }
  return true;
}

/**
 * Return an object without the specified keys.
 *
 * @param  {Object} obj        The original object.
 * @param  {Array}  keys       The list of keys to exclude.
 * @return {Object}            A copy without the specified keys.
 */
function omitKeys(obj, keys = []) {
  return Object.keys(obj).reduce((acc, key) => {
    if (keys.indexOf(key) === -1) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

},{}]},{},[22])(22)
});