/**
 * Chunks an array into n pieces.
 *
 * @private
 * @param  {Array}  array
 * @param  {Number} n
 * @return {Array}
 */
export function partition(array, n) {
  if (n <= 0) {
    return array;
  }
  return array.reduce((acc, x, i) => {
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
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
export async function pMap(list, fn) {
  let results = [];
  await list.reduce(async function(promise, entry) {
    await promise;
    results = results.concat(await fn(entry));
  }, Promise.resolve());
  return results;
}

/**
 * Takes an object and returns a copy of it with the provided keys omitted.
 *
 * @private
 * @param  {Object}    obj  The source object.
 * @param  {...String} keys The keys to omit.
 * @return {Object}
 */
export function omit(obj, ...keys) {
  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) {
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
export function toDataBody(resource) {
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
export function qsify(obj) {
  const encode = v =>
    encodeURIComponent(typeof v === "boolean" ? String(v) : v);
  const stripUndefined = o => JSON.parse(JSON.stringify(o));
  const stripped = stripUndefined(obj);
  return Object.keys(stripped)
    .map(k => {
      const ks = encode(k) + "=";
      if (Array.isArray(stripped[k])) {
        return ks + stripped[k].map(v => encode(v)).join(",");
      } else {
        return ks + encode(stripped[k]);
      }
    })
    .join("&");
}

/**
 * Checks if a version is within the provided range.
 *
 * @param  {String} version    The version to check.
 * @param  {String} minVersion The minimum supported version (inclusive).
 * @param  {String} maxVersion The minimum supported version (exclusive).
 * @throws {Error} If the version is outside of the provided range.
 */
export function checkVersion(version, minVersion, maxVersion) {
  const extract = str => str.split(".").map(x => parseInt(x, 10));
  const [verMajor, verMinor] = extract(version);
  const [minMajor, minMinor] = extract(minVersion);
  const [maxMajor, maxMinor] = extract(maxVersion);
  const checks = [
    verMajor < minMajor,
    verMajor === minMajor && verMinor < minMinor,
    verMajor > maxMajor,
    verMajor === maxMajor && verMinor >= maxMinor,
  ];
  if (checks.some(x => x)) {
    throw new Error(
      `Version ${version} doesn't satisfy ${minVersion} <= x < ${maxVersion}`
    );
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
export function support(min, max) {
  return function(target, key, descriptor) {
    const fn = descriptor.value;
    return {
      configurable: true,
      get() {
        const wrappedMethod = (...args) => {
          // "this" is the current instance which its method is decorated.
          const client = "client" in this ? this.client : this;
          return client
            .fetchHTTPApiVersion()
            .then(version => checkVersion(version, min, max))
            .then(() => fn.apply(this, args));
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true,
        });
        return wrappedMethod;
      },
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
export function capable(capabilities) {
  return function(target, key, descriptor) {
    const fn = descriptor.value;
    return {
      configurable: true,
      get() {
        const wrappedMethod = (...args) => {
          // "this" is the current instance which its method is decorated.
          const client = "client" in this ? this.client : this;
          return client
            .fetchServerCapabilities()
            .then(available => {
              const missing = capabilities.filter(c => !(c in available));
              if (missing.length > 0) {
                const missingStr = missing.join(", ");
                throw new Error(
                  `Required capabilities ${missingStr} not present on server`
                );
              }
            })
            .then(() => fn.apply(this, args));
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true,
        });
        return wrappedMethod;
      },
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
export function nobatch(message) {
  return function(target, key, descriptor) {
    const fn = descriptor.value;
    return {
      configurable: true,
      get() {
        const wrappedMethod = (...args) => {
          // "this" is the current instance which its method is decorated.
          if (this._isBatch) {
            throw new Error(message);
          }
          return fn.apply(this, args);
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true,
        });
        return wrappedMethod;
      },
    };
  };
}

/**
 * Returns true if the specified value is an object (i.e. not an array nor null).
 * @param  {Object} thing The value to inspect.
 * @return {bool}
 */
export function isObject(thing) {
  return typeof thing === "object" && thing !== null && !Array.isArray(thing);
}

/**
 * Parses a data url.
 * @param  {String} dataURL The data url.
 * @return {Object}
 */
export function parseDataURL(dataURL) {
  const regex = /^data:(.*);base64,(.*)/;
  const match = dataURL.match(regex);
  if (!match) {
    throw new Error(`Invalid data-url: ${String(dataURL).substr(0, 32)}...`);
  }
  const props = match[1];
  const base64 = match[2];
  const [type, ...rawParams] = props.split(";");
  const params = rawParams.reduce((acc, param) => {
    const [key, value] = param.split("=");
    return { ...acc, [key]: value };
  }, {});
  return { ...params, type, base64 };
}

/**
 * Extracts file information from a data url.
 * @param  {String} dataURL The data url.
 * @return {Object}
 */
export function extractFileInfo(dataURL) {
  const { name, type, base64 } = parseDataURL(dataURL);
  const binary = atob(base64);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  const blob = new Blob([new Uint8Array(array)], { type });
  return { blob, name };
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
export function createFormData(dataURL, body, options = {}) {
  const { filename = "untitled" } = options;
  const { blob, name } = extractFileInfo(dataURL);
  const formData = new FormData();
  formData.append("attachment", blob, name || filename);
  for (const property in body) {
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
export function cleanUndefinedProperties(obj) {
  const result = {};
  for (const key in obj) {
    if (typeof obj[key] !== "undefined") {
      result[key] = obj[key];
    }
  }
  return result;
}
