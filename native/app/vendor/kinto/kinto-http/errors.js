/**
 * Kinto server error code descriptors.
 * @type {Object}
 */
const ERROR_CODES = {
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
  999: "Internal Server Error",
};

export default ERROR_CODES;

class NetworkTimeoutError extends Error {
  constructor(url, options) {
    super(
      `Timeout while trying to access ${url} with ${JSON.stringify(options)}`
    );

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkTimeoutError);
    }

    this.url = url;
    this.options = options;
  }
}

class UnparseableResponseError extends Error {
  constructor(response, body, error) {
    const { status } = response;

    super(
      `Response from server unparseable (HTTP ${status ||
        0}; ${error}): ${body}`
    );

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnparseableResponseError);
    }

    this.status = status;
    this.response = response;
    this.stack = error.stack;
    this.error = error;
  }
}

/**
 * "Error" subclass representing a >=400 response from the server.
 *
 * Whether or not this is an error depends on your application.
 *
 * The `json` field can be undefined if the server responded with an
 * empty response body. This shouldn't generally happen. Most "bad"
 * responses come with a JSON error description, or (if they're
 * fronted by a CDN or nginx or something) occasionally non-JSON
 * responses (which become UnparseableResponseErrors, above).
 */
class ServerResponse extends Error {
  constructor(response, json) {
    const { status } = response;
    let { statusText } = response;
    let errnoMsg;

    if (json) {
      // Try to fill in information from the JSON error.
      statusText = json.error || statusText;

      // Take errnoMsg from either ERROR_CODES or json.message.
      if (json.errno && json.errno in ERROR_CODES) {
        errnoMsg = ERROR_CODES[json.errno];
      } else if (json.message) {
        errnoMsg = json.message;
      }

      // If we had both ERROR_CODES and json.message, and they differ,
      // combine them.
      if (errnoMsg && json.message && json.message !== errnoMsg) {
        errnoMsg += ` (${json.message})`;
      }
    }

    let message = `HTTP ${status} ${statusText}`;
    if (errnoMsg) {
      message += `: ${errnoMsg}`;
    }

    super(message.trim());
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerResponse);
    }

    this.response = response;
    this.data = json;
  }
}

export { NetworkTimeoutError, ServerResponse, UnparseableResponseError };
