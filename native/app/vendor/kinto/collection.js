"use strict";

import BaseAdapter from "./adapters/base";
import IDB from "./adapters/IDB";
import { waterfall, deepEqual } from "./utils";
import { v4 as uuid4 } from "uuid";
import { isUUID, omitKeys } from "./utils";

const RECORD_FIELDS_TO_CLEAN = ["_status"];
const AVAILABLE_HOOKS = ["incoming-changes"];

/**
 * Compare two records omitting local fields and synchronization
 * attributes (like _status and last_modified)
 * @param {Object} a    A record to compare.
 * @param {Object} b    A record to compare.
 * @param {Array} localFields Additional fields to ignore during the comparison
 * @return {boolean}
 */
export function recordsEqual(a, b, localFields = []) {
  const fieldsToClean = RECORD_FIELDS_TO_CLEAN.concat(["last_modified"]).concat(
    localFields
  );
  const cleanLocal = r => omitKeys(r, fieldsToClean);
  return deepEqual(cleanLocal(a), cleanLocal(b));
}

/**
 * Synchronization result object.
 */
export class SyncResultObject {
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
      resolved: [],
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
      const existing = acc.filter(
        r => (cur.id && r.id ? cur.id != r.id : true)
      );
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

function createUUIDSchema() {
  return {
    generate() {
      return uuid4();
    },

    validate(id) {
      return isUUID(id);
    },
  };
}

function markStatus(record, status) {
  return { ...record, _status: status };
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
  const synced = { ...local, ...markSynced(remote) };
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
    if (
      local.last_modified !== undefined &&
      local.last_modified === remote.last_modified
    ) {
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
      data: { type: "incoming", local: local, remote: remote },
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
export default class Collection {
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

    const DBAdapter = options.adapter || IDB;
    if (!DBAdapter) {
      throw new Error("No adapter provided");
    }
    const dbPrefix = options.dbPrefix || "";
    const db = new DBAdapter(
      `${dbPrefix}${bucket}/${name}`,
      options.adapterOptions
    );
    if (!(db instanceof BaseAdapter)) {
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
    this.remoteTransformers = this._validateRemoteTransformers(
      options.remoteTransformers
    );
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
      MANUAL: "manual",
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
      if (!AVAILABLE_HOOKS.includes(hook)) {
        throw new Error(
          "The hook should be one of " + AVAILABLE_HOOKS.join(", ")
        );
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
  async clear() {
    await this.db.clear();
    await this.db.saveLastModified(null);
    return { data: [], permissions: {} };
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
    return waterfall(
      this[`${type}Transformers`].map(transformer => {
        return record => transformer.encode(record);
      }),
      record
    );
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
    return waterfall(
      this[`${type}Transformers`].reverse().map(transformer => {
        return record => transformer.decode(record);
      }),
      record
    );
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
    if (
      (options.synced || options.useRecordId) &&
      !record.hasOwnProperty("id")
    ) {
      return reject(
        "Missing required Id; synced and useRecordId options require one"
      );
    }
    if (
      !options.synced &&
      !options.useRecordId &&
      record.hasOwnProperty("id")
    ) {
      return reject("Extraneous Id; can't create a record having one set.");
    }
    const newRecord = {
      ...record,
      id:
        options.synced || options.useRecordId
          ? record.id
          : this.idSchema.generate(record),
      _status: options.synced ? "synced" : "created",
    };
    if (!this.idSchema.validate(newRecord.id)) {
      return reject(`Invalid Id: ${newRecord.id}`);
    }
    return this.execute(txn => txn.create(newRecord), {
      preloadIds: [newRecord.id],
    }).catch(err => {
      if (options.useRecordId) {
        throw new Error(
          "Couldn't create record. It may have been virtually deleted."
        );
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
      preloadIds: [record.id],
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
    return this.execute(
      transaction => {
        return transaction.delete(id, options);
      },
      { preloadIds: [id] }
    );
  }

  /**
   * Same as {@link Collection#deleteAll}, but wrapped in its own transaction, execulding the parameter.
   *
   * @return {Promise}
   */
  async deleteAll() {
    const { data } = await this.list({}, { includeDeleted: false });
    const recordIds = data.map(record => record.id);
    return this.execute(
      transaction => {
        return transaction.deleteAll(recordIds);
      },
      { preloadIds: recordIds }
    );
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
  async list(params = {}, options = { includeDeleted: false }) {
    params = { order: "-last_modified", filters: {}, ...params };
    const results = await this.db.list(params);
    let data = results;
    if (!options.includeDeleted) {
      data = results.filter(record => record._status !== "deleted");
    }
    return { data, permissions: {} };
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
  async importChanges(
    syncResultObject,
    decodedChanges,
    strategy = Collection.strategy.MANUAL
  ) {
    // Retrieve records matching change ids.
    try {
      const { imports, resolved } = await this.db.execute(
        transaction => {
          const imports = decodedChanges.map(remote => {
            // Store remote change into local database.
            return importChange(transaction, remote, this.localFields);
          });
          const conflicts = imports
            .filter(i => i.type === "conflicts")
            .map(i => i.data);
          const resolved = this._handleConflicts(
            transaction,
            conflicts,
            strategy
          );
          return { imports, resolved };
        },
        { preload: decodedChanges.map(record => record.id) }
      );

      // Lists of created/updated/deleted records
      imports.forEach(({ type, data }) => syncResultObject.add(type, data));

      // Automatically resolved conflicts (if not manual)
      if (resolved.length > 0) {
        syncResultObject.reset("conflicts").add("resolved", resolved);
      }
    } catch (err) {
      const data = {
        type: "incoming",
        message: err.message,
        stack: err.stack,
      };
      // XXX one error of the whole transaction instead of per atomic op
      syncResultObject.add("errors", data);
    }

    return syncResultObject;
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
  async _applyPushedResults(
    syncResultObject,
    toApplyLocally,
    conflicts,
    strategy = Collection.strategy.MANUAL
  ) {
    const toDeleteLocally = toApplyLocally.filter(r => r.deleted);
    const toUpdateLocally = toApplyLocally.filter(r => !r.deleted);

    const { published, resolved } = await this.db.execute(transaction => {
      const updated = toUpdateLocally.map(record => {
        const synced = markSynced(record);
        transaction.update(synced);
        return synced;
      });
      const deleted = toDeleteLocally.map(record => {
        transaction.delete(record.id);
        // Amend result data with the deleted attribute set
        return { id: record.id, deleted: true };
      });
      const published = updated.concat(deleted);
      // Handle conflicts, if any
      const resolved = this._handleConflicts(transaction, conflicts, strategy);
      return { published, resolved };
    });

    syncResultObject.add("published", published);

    if (resolved.length > 0) {
      syncResultObject
        .reset("conflicts")
        .reset("resolved")
        .add("resolved", resolved);
    }
    return syncResultObject;
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
      const resolution =
        strategy === Collection.strategy.CLIENT_WINS
          ? conflict.local
          : conflict.remote;
      const rejected =
        strategy === Collection.strategy.CLIENT_WINS
          ? conflict.remote
          : conflict.local;
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

    return this.db.execute(
      transaction => {
        const txn = new CollectionTransaction(this, transaction);
        const result = doOperations(txn);
        txn.emitEvents();
        return result;
      },
      { preload: preloadIds }
    );
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
  async resetSyncStatus() {
    const unsynced = await this.list(
      { filters: { _status: ["deleted", "synced"] }, order: "" },
      { includeDeleted: true }
    );
    await this.db.execute(transaction => {
      unsynced.data.forEach(record => {
        if (record._status === "deleted") {
          // Garbage collect deleted records.
          transaction.delete(record.id);
        } else {
          // Records that were synced become «created».
          transaction.update({
            ...record,
            last_modified: undefined,
            _status: "created",
          });
        }
      });
    });
    this._lastModified = null;
    await this.db.saveLastModified(null);
    return unsynced.data.length;
  }

  /**
   * Returns an object containing two lists:
   *
   * - `toDelete`: unsynced deleted records we can safely delete;
   * - `toSync`: local updates to send to the server.
   *
   * @return {Promise}
   */
  async gatherLocalChanges() {
    const unsynced = await this.list({
      filters: { _status: ["created", "updated"] },
      order: "",
    });
    const deleted = await this.list(
      { filters: { _status: "deleted" }, order: "" },
      { includeDeleted: true }
    );

    return await Promise.all(
      unsynced.data
        .concat(deleted.data)
        .map(this._encodeRecord.bind(this, "remote"))
    );
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
  async pullChanges(client, syncResultObject, options = {}) {
    if (!syncResultObject.ok) {
      return syncResultObject;
    }

    const since = this.lastModified
      ? this.lastModified
      : await this.db.getLastModified();

    options = {
      strategy: Collection.strategy.MANUAL,
      lastModified: since,
      headers: {},
      ...options,
    };

    // Optionally ignore some records when pulling for changes.
    // (avoid redownloading our own changes on last step of #sync())
    let filters;
    if (options.exclude) {
      // Limit the list of excluded records to the first 50 records in order
      // to remain under de-facto URL size limit (~2000 chars).
      // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers/417184#417184
      const exclude_id = options.exclude
        .slice(0, 50)
        .map(r => r.id)
        .join(",");
      filters = { exclude_id };
    }
    // First fetch remote changes from the server
    const { data, last_modified } = await client.listRecords({
      // Since should be ETag (see https://github.com/Kinto/kinto.js/issues/356)
      since: options.lastModified ? `${options.lastModified}` : undefined,
      headers: options.headers,
      retry: options.retry,
      // Fetch every page by default (FIXME: option to limit pages, see #277)
      pages: Infinity,
      filters,
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
    const decodedChanges = await Promise.all(
      data.map(change => {
        return this._decodeRecord("remote", change);
      })
    );
    // Hook receives decoded records.
    const payload = { lastModified: unquoted, changes: decodedChanges };
    const afterHooks = await this.applyHook("incoming-changes", payload);

    // No change, nothing to import.
    if (afterHooks.changes.length > 0) {
      // Reflect these changes locally
      await this.importChanges(
        syncResultObject,
        afterHooks.changes,
        options.strategy
      );
    }
    return syncResultObject;
  }

  applyHook(hookName, payload) {
    if (typeof this.hooks[hookName] == "undefined") {
      return Promise.resolve(payload);
    }
    return waterfall(
      this.hooks[hookName].map(hook => {
        return record => {
          const result = hook(payload, this);
          const resultThenable = result && typeof result.then === "function";
          const resultChanges = result && result.hasOwnProperty("changes");
          if (!(resultThenable || resultChanges)) {
            throw new Error(
              `Invalid return value for hook: ${JSON.stringify(
                result
              )} has no 'then()' or 'changes' properties`
            );
          }
          return result;
        };
      }),
      payload
    );
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
  async pushChanges(client, changes, syncResultObject, options = {}) {
    if (!syncResultObject.ok) {
      return syncResultObject;
    }
    const safe =
      !options.strategy || options.strategy !== Collection.CLIENT_WINS;
    const toDelete = changes.filter(r => r._status == "deleted");
    const toSync = changes.filter(r => r._status != "deleted");

    // Perform a batch request with every changes.
    const synced = await client.batch(
      batch => {
        toDelete.forEach(r => {
          // never published locally deleted records should not be pusblished
          if (r.last_modified) {
            batch.deleteRecord(r);
          }
        });
        toSync.forEach(r => {
          // Clean local fields (like _status) before sending to server.
          const published = this.cleanLocalFields(r);
          if (r._status === "created") {
            batch.createRecord(published);
          } else {
            batch.updateRecord(published);
          }
        });
      },
      {
        headers: options.headers,
        retry: options.retry,
        safe,
        aggregate: true,
      }
    );

    // Store outgoing errors into sync result object
    syncResultObject.add(
      "errors",
      synced.errors.map(e => ({ ...e, type: "outgoing" }))
    );

    // Store outgoing conflicts into sync result object
    const conflicts = [];
    for (const { type, local, remote } of synced.conflicts) {
      // Note: we ensure that local data are actually available, as they may
      // be missing in the case of a published deletion.
      const safeLocal = (local && local.data) || { id: remote.id };
      const realLocal = await this._decodeRecord("remote", safeLocal);
      // We can get "null" from the remote side if we got a conflict
      // and there is no remote version available; see kinto-http.js
      // batch.js:aggregate.
      const realRemote = remote && (await this._decodeRecord("remote", remote));
      const conflict = { type, local: realLocal, remote: realRemote };
      conflicts.push(conflict);
    }
    syncResultObject.add("conflicts", conflicts);

    // Records that must be deleted are either deletions that were pushed
    // to server (published) or deleted records that were never pushed (skipped).
    const missingRemotely = synced.skipped.map(r => ({ ...r, deleted: true }));

    // For created and updated records, the last_modified coming from server
    // will be stored locally.
    // Reflect publication results locally using the response from
    // the batch request.
    const published = synced.published.map(c => c.data);
    const toApplyLocally = published.concat(missingRemotely);

    // Apply the decode transformers, if any
    const decoded = await Promise.all(
      toApplyLocally.map(record => {
        return this._decodeRecord("remote", record);
      })
    );

    // We have to update the local records with the responses of the server
    // (eg. last_modified values etc.).
    if (decoded.length > 0 || conflicts.length > 0) {
      await this._applyPushedResults(
        syncResultObject,
        decoded,
        conflicts,
        options.strategy
      );
    }

    return syncResultObject;
  }

  /**
   * Return a copy of the specified record without the local fields.
   *
   * @param  {Object} record  A record with potential local fields.
   * @return {Object}
   */
  cleanLocalFields(record) {
    const localKeys = RECORD_FIELDS_TO_CLEAN.concat(this.localFields);
    return omitKeys(record, localKeys);
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
    const resolved = {
      ...resolution,
      // Ensure local record has the latest authoritative timestamp
      last_modified: conflict.remote && conflict.remote.last_modified,
    };
    // If the resolution object is strictly equal to the
    // remote record, then we can mark it as synced locally.
    // Otherwise, mark it as updated (so that the resolution is pushed).
    const synced = deepEqual(resolved, conflict.remote);
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
  async sync(
    options = {
      strategy: Collection.strategy.MANUAL,
      headers: {},
      retry: 1,
      ignoreBackoff: false,
      bucket: null,
      collection: null,
      remote: null,
    }
  ) {
    options = {
      ...options,
      bucket: options.bucket || this.bucket,
      collection: options.collection || this.name,
    };

    const previousRemote = this.api.remote;
    if (options.remote) {
      // Note: setting the remote ensures it's valid, throws when invalid.
      this.api.remote = options.remote;
    }
    if (!options.ignoreBackoff && this.api.backoff > 0) {
      const seconds = Math.ceil(this.api.backoff / 1000);
      return Promise.reject(
        new Error(
          `Server is asking clients to back off; retry in ${seconds}s or use the ignoreBackoff option.`
        )
      );
    }

    const client = this.api
      .bucket(options.bucket)
      .collection(options.collection);

    const result = new SyncResultObject();
    try {
      // Fetch last changes from the server.
      await this.pullChanges(client, result, options);
      const { lastModified } = result;

      // Fetch local changes
      const toSync = await this.gatherLocalChanges();

      // Publish local changes and pull local resolutions
      await this.pushChanges(client, toSync, result, options);

      // Publish local resolution of push conflicts to server (on CLIENT_WINS)
      const resolvedUnsynced = result.resolved.filter(
        r => r._status !== "synced"
      );
      if (resolvedUnsynced.length > 0) {
        const resolvedEncoded = await Promise.all(
          resolvedUnsynced.map(resolution => {
            let record = resolution.accepted;
            if (record === null) {
              record = { id: resolution.id, _status: resolution._status };
            }
            return this._encodeRecord("remote", record);
          })
        );
        await this.pushChanges(client, resolvedEncoded, result, options);
      }
      // Perform a last pull to catch changes that occured after the last pull,
      // while local changes were pushed. Do not do it nothing was pushed.
      if (result.published.length > 0) {
        // Avoid redownloading our own changes during the last pull.
        const pullOpts = {
          ...options,
          lastModified,
          exclude: result.published,
        };
        await this.pullChanges(client, result, pullOpts);
      }

      // Don't persist lastModified value if any conflict or error occured
      if (result.ok) {
        // No conflict occured, persist collection's lastModified value
        this._lastModified = await this.db.saveLastModified(
          result.lastModified
        );
      }
    } catch (e) {
      this.events.emit("sync:error", { ...options, error: e });
      throw e;
    } finally {
      // Ensure API default remote is reverted if a custom one's been used
      this.api.remote = previousRemote;
    }
    this.events.emit("sync:success", { ...options, result });
    return result;
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
  async loadDump(records) {
    if (!Array.isArray(records)) {
      throw new Error("Records is not an array.");
    }

    for (const record of records) {
      if (!record.hasOwnProperty("id") || !this.idSchema.validate(record.id)) {
        throw new Error("Record has invalid ID: " + JSON.stringify(record));
      }

      if (!record.last_modified) {
        throw new Error(
          "Record has no last_modified value: " + JSON.stringify(record)
        );
      }
    }

    // Fetch all existing records from local database,
    // and skip those who are newer or not marked as synced.

    // XXX filter by status / ids in records

    const { data } = await this.list({}, { includeDeleted: true });
    const existingById = data.reduce((acc, record) => {
      acc[record.id] = record;
      return acc;
    }, {});

    const newRecords = records.filter(record => {
      const localRecord = existingById[record.id];
      const shouldKeep =
        // No local record with this id.
        localRecord === undefined ||
        // Or local record is synced
        (localRecord._status === "synced" &&
          // And was synced from server
          localRecord.last_modified !== undefined &&
          // And is older than imported one.
          record.last_modified > localRecord.last_modified);
      return shouldKeep;
    });

    return await this.db.loadDump(newRecords.map(markSynced));
  }
}

/**
 * A Collection-oriented wrapper for an adapter's transaction.
 *
 * This defines the high-level functions available on a collection.
 * The collection itself offers functions of the same name. These will
 * perform just one operation in its own transaction.
 */
export class CollectionTransaction {
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
    for (const { action, payload } of this._events) {
      this.collection.events.emit(action, payload);
    }
    if (this._events.length > 0) {
      const targets = this._events.map(({ action, payload }) => ({
        action,
        ...payload,
      }));
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
    if (
      !res.data ||
      (!options.includeDeleted && res.data._status === "deleted")
    ) {
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
    if (!existing || (alreadyDeleted && options.virtual)) {
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
   * Soft delete all records from the local database.
   *
   * @param  {Array} ids        Array of non-deleted Record Ids.
   * @return {Object}
   */
  deleteAll(ids) {
    const existingRecords = [];
    ids.forEach(id => {
      existingRecords.push(this.adapterTransaction.get(id));
      this.delete(id);
    });

    this._queueEvent("deleteAll", { data: existingRecords });
    return { data: existingRecords, permissions: {} };
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
    return { data: { id, ...existing }, deleted: !!existing, permissions: {} };
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
    const newRecord = options.patch ? { ...oldRecord, ...record } : record;
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
    const updated = { ...newRecord };
    // Make sure to never loose the existing timestamp.
    if (oldRecord && oldRecord.last_modified && !updated.last_modified) {
      updated.last_modified = oldRecord.last_modified;
    }
    // If only local fields have changed, then keep record as synced.
    // If status is created, keep record as created.
    // If status is deleted, mark as updated.
    const isIdentical =
      oldRecord && recordsEqual(oldRecord, updated, this.localFields);
    const keepSynced = isIdentical && oldRecord._status == "synced";
    const neverSynced =
      !oldRecord || (oldRecord && oldRecord._status == "created");
    const newStatus =
      keepSynced || synced ? "synced" : neverSynced ? "created" : "updated";
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
