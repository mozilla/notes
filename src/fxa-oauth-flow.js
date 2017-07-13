function getAuthenticationURL(params) { 
  var queryParams = {
    client_id: params.client_id,
    state: params.state,
    scope: params.scope,
    response_type: 'code',
    code_challenge_method: 'S256',
    code_challenge: params.code_challenge,
    redirect_url: browser.identity.getRedirectURL()
  };
  return params.oauth_uri + '/authorization' + objectToQueryString(queryParams);
}


function createRandomString(length) {
  if (length <= 0) {
    return '';
  }
  var _state = '';
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (var i = 0; i < length; i++) {
    _state += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return _state;
}

function sha256(str) {
  var buffer = new TextEncoder("utf-8").encode(str);
  return crypto.subtle.digest("SHA-256", buffer)
    .then(digest => {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    });
}

/**
 * Create a query parameter string from a key and value
 *
 * @method createQueryParam
 * @param {String} key
 * @param {Variant} value
 * @returns {String}
 * URL safe serialized query parameter
 */
function createQueryParam(key, value) {
  return encodeURIComponent(key) + '=' + encodeURIComponent(value);
}

/**
 * Create a query string out of an object.
 * @method objectToQueryString
 * @param {Object} obj
 * Object to create query string from
 * @returns {String}
 * URL safe query string
 */
function objectToQueryString(obj) {
  var queryParams = [];

  for (var key in obj) {
    queryParams.push(createQueryParam(key, obj[key]));
  }

  return '?' + queryParams.join('&');
}
