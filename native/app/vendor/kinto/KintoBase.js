"use strict";

import Collection from "./collection";
import BaseAdapter from "./adapters/base";

const DEFAULT_BUCKET_NAME = "default";
const DEFAULT_REMOTE = "http://localhost:8888/v1";
const DEFAULT_RETRY = 1;

/**
 * KintoBase class.
 */
export default class KintoBase {
  /**
   * Provides a public access to the base adapter class. Users can create a
   * custom DB adapter by extending {@link BaseAdapter}.
   *
   * @type {Object}
   */
  static get adapters() {
    return {
      BaseAdapter: BaseAdapter,
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
    return Collection.strategy;
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
      retry: DEFAULT_RETRY,
    };
    this._options = { ...defaults, ...options };
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
      timeout,
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
      timeout,
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
   * @param  {Object} [options.localFields]        Array<Field> (default: `[]`])
   * @return {Collection}
   */
  collection(collName, options = {}) {
    if (!collName) {
      throw new Error("missing collection name");
    }
    const { bucket, events, adapter, adapterOptions, dbPrefix } = {
      ...this._options,
      ...options,
    };
    const { idSchema, remoteTransformers, hooks, localFields } = options;

    return new Collection(bucket, collName, this.api, {
      events,
      adapter,
      adapterOptions,
      dbPrefix,
      idSchema,
      remoteTransformers,
      hooks,
      localFields,
    });
  }
}
