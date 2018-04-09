/**
 * Module that provides utils for Firefox Accounts
 */

import * as Keychain from 'react-native-keychain';
import { authorize, refresh } from 'react-native-app-auth';
import {
  FXA_PROFILE_SERVER,
  FXA_OAUTH_SERVER,
  FXA_OAUTH_CLIENT_ID,
  FXA_OAUTH_REDIRECT,
  FXA_OAUTH_SCOPES,
  FXA_OAUTH_ACCESS_TYPE,
} from '../utils/constants';

const base64url = require('./base64url');
const fxaCryptoRelier = require('./fxa-crypto-relier');

/**
 * FxA OAuth Scoped Key flow
 *
 * - Logs in to FxA
 * - Gets the scoped keys
 * - Saves information into the Android keychain
 * @returns {*}
 */
function launchOAuthKeyFlow() {
  const fxaKeyUtils = new fxaCryptoRelier.KeyUtils();
  const loginDetails = {};

  return fxaKeyUtils.createApplicationKeyPair().then((keyTypes) => {
    const base64JwkPublicKey = base64url.encode(JSON.stringify(keyTypes.jwkPublicKey), 'utf8');
    const config = {
      serviceConfiguration: {
        authorizationEndpoint: `${FXA_OAUTH_SERVER}/authorization`,
        tokenEndpoint: `${FXA_OAUTH_SERVER}/token`
      },
      additionalParameters: {
        keys_jwk: base64JwkPublicKey,
        access_type: FXA_OAUTH_ACCESS_TYPE,
      },
      clientId: FXA_OAUTH_CLIENT_ID,
      redirectUrl: FXA_OAUTH_REDIRECT,
      scopes: FXA_OAUTH_SCOPES
    };

    return authorize(config);
  }).then((response) => {
    if (response && response.additionalParameters && response.additionalParameters.keys_jwe) {
      loginDetails.oauthResponse = response;

      return fxaKeyUtils.decryptBundle(response.additionalParameters.keys_jwe);
    } else {
      throw new Error('Login Failed. Error: FXA-BAD_RESPONSE');
    }
  }).then((keys) => {
    if (! keys) {
      throw new Error('Login Failed. Error: FXA-BAD_KEY');
    }

    loginDetails.keys = keys;

    return fxaFetchProfile(loginDetails.oauthResponse.accessToken);
  }).then((profile) => {
    if (! profile) {
      throw new Error('Login Failed. Error: FXA-BAD_PROFILE');
    }

    loginDetails.profile = profile;

    // store loginDetails in the Android keychain
    return storeCredentials(loginDetails);
  }).then(() => {
    return loginDetails;
  });
}

/**
 *
 * @param {String} token - bearer token
 * @returns {Promise} Promise that resolves to an {object} of an FxA profile
 */
function fxaFetchProfile(token) { // eslint-disable-line no-unused-vars
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

function fxaRenewCredential(loginDetails) {
  if (! loginDetails) {
    throw new Error('No login details');
  }

  const accessToken = loginDetails.oauthResponse.accessToken;
  const refreshToken = loginDetails.oauthResponse.refreshToken;
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');

  const accessTokenVerifyRequest = new Request(`${FXA_OAUTH_SERVER}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token: accessToken,
    })
  });

  const refreshConfig = {
    serviceConfiguration: {
      authorizationEndpoint: `${FXA_OAUTH_SERVER}/authorization`,
      tokenEndpoint: `${FXA_OAUTH_SERVER}/token`
    },
    clientId: FXA_OAUTH_CLIENT_ID,
    redirectUrl: FXA_OAUTH_REDIRECT,
    scopes: FXA_OAUTH_SCOPES
  };

  return fetch(accessTokenVerifyRequest)
    .then((resp) => {
      // if 200 then token is valid, no need to review
      if (resp.status !== 2041) {
        // if error attempt to renew access token
        return refresh(refreshConfig, {
          refreshToken: refreshToken
        });
      }
    }, () => {
      throw new Error('Failed to verify token');
    }).then((resp) => {
      if (!resp) {
        // no response means we never made the request
        return null;
      } else if (resp.accessToken) {
        return resp.accessToken;
      }
      // if failed to renew then throw
      throw new Error('Failed to renew token');
    }, () => {
      throw new Error('Failed to renew token');
    }).then((newAccessToken) => {
      if (newAccessToken) {
        // do not block on update, proceed with known info
        updateAccessToken(newAccessToken);
        // if a renew response then update credential
        loginDetails.oauthResponse.accessToken = newAccessToken;
      }
      return loginDetails;
    });
}

/**
 * Get creds from Android Keystore
 * @returns {Promise}
 */
function fxaGetCredential() {
    // Retrieve the credentials
    return Keychain.getGenericPassword().then((credentials) => {
      if (credentials && credentials.password) {
        // TODO: might need to refactor this to exit out if empty
        const creds = JSON.parse(credentials.password);
        return creds;
      } else {
        return {};
      }
    }).catch((error) => {
      // TODO: What on earth do we do here?
      console.log('Keychain cannot be accessed!', error);
      return {};
    });
}

function updateAccessToken(newAccessToken) {
  return fxaGetCredential().then((oldLoginDetails) => {
    const newLoginDetails = oldLoginDetails;
    newLoginDetails.oauthResponse.accessToken = newAccessToken;
    return storeCredentials(newLoginDetails)
  });
}

function storeCredentials(loginDetails) {
  return Keychain.setGenericPassword(loginDetails.profile.uid, JSON.stringify(loginDetails))
    .catch((e) => {
      // TODO: Hope this never happens... if it does that user has to login to the app all the time
      console.log('Keychain failed', e);
      throw new Error('Login Failed. Error: FXA-KEYCHAIN_FAILED');
    });
}

module.exports = {
  launchOAuthKeyFlow,
  fxaFetchProfile,
  fxaRenewCredential,
  fxaGetCredential,
};