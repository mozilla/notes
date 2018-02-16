/**
 * Module that provides utils for Firefox Accounts
 */

/**
 *
 * @param {String} FXA_PROFILE_SERVER - profile server
 * @param {String} token - bearer token
 * @returns {Promise} Promise that resolves to an {object} of an FxA profile
 */
function fxaFetchProfile(FXA_PROFILE_SERVER, token) { // eslint-disable-line no-unused-vars
  const headers = new Headers({
    'Authorization': `Bearer ${token}`
  });
  const request = new Request(`${FXA_PROFILE_SERVER}/profile`, {
    method: 'GET',
    headers
  });

  return fetch(request).then((resp) => {
    if (resp.status === 200) {
      return resp.json();
    }
    throw new Error('Failed to fetch profile');
  });
}

// eslint-disable-next-line no-unused-vars
function fxaRenewCredential(credential) {
  const fxaOAuthServer = credential.metadata.server;
  const clientId = credential.metadata.client_id;
  const scope = credential.metadata.scope;
  const accessToken = credential.access_token;
  const refreshToken = credential.refresh_token;
  const headers = new Headers();

  headers.append('Content-Type', 'application/json');

  const accessTokenVerifyRequest = new Request(`${fxaOAuthServer}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token: accessToken,
    })
  });

  const refreshTokenRequest = new Request(`${fxaOAuthServer}/token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      // eslint-disable camelcase
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      // eslint-enable camelcase
      scope: scope.join(' ')
    })
  });

  return fetch(accessTokenVerifyRequest)
    .then((resp) => {
      // if 200 then token is valid, no need to review
      if (resp.status !== 200) {
        // if error attempt to renew access token
        return fetch(refreshTokenRequest);
      }
      throw new Error('Failed to verify token');
    }, () => {
      throw new Error('Failed to verify token');
    }).then((resp) => {
      if (!resp) {
        // no response means we never made the request
        return null;
      } else if (resp.status === 200) {
        return resp.json();
      }
      // if failed to renew then throw
      throw new Error('Failed to renew token');
    }, () => {
      throw new Error('Failed to renew token');
    }).then((renewResp) => {
      if (renewResp) {
        // if a renew response then update credential
        credential.access_token = renewResp.access_token;
      }
      return credential;
    });
}
