/**
 * Module that provides utils for Firefox Accounts
 */

import * as Keychain from 'react-native-keychain';
import { authorize, refresh } from 'react-native-app-auth';
import {
  FXA_PROFILE_SERVER,
  FXA_OAUTH_SERVER,
  FXA_CONTENT_SERVER,
  FXA_OAUTH_CLIENT_ID,
  FXA_OAUTH_REDIRECT,
  FXA_OAUTH_SCOPES,
  FXA_OAUTH_ACCESS_TYPE,
} from '../utils/constants';
import FxaClient from '../components/FxaClient'

/**
 * FxA OAuth Scoped Key flow
 *
 * - Logs in to FxA
 * - Gets the scoped keys
 * - Saves information into the Android keychain
 * @returns {*}
 */
function launchOAuthKeyFlow() {
  var loginDetails = {};

  return new Promise((resolve, reject) => {
    return FxaClient.begin((response) => {
      resolve(response)
    }, (err) => {
      if (! err) {
        err = new Error('Failed to authenticate');
      }
      reject(err);
    })
  }).then((responseString) => {
    loginDetails = JSON.parse(responseString);
    if (! loginDetails.oauthResponse.accessToken) {
      throw new Error('Login Failed. Error: FXA-BAD_TOKEN');
    }
    if (! loginDetails.keys) {
      throw new Error('Login Failed. Error: FXA-BAD_KEY');
    }

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

  return new Promise((resolve, reject) => {
    return FxaClient.renewToken(loginDetails.state, 
      (response) => {
        resolve(response)
      } , (err) => {
        if (! err) {
          err = new Error('Failed to renew token')
        }
        reject(err)
      });
  }).then((newAccessToken) => {
    // do not block on update, proceed with known info
    updateAccessToken(newAccessToken);
    loginDetails.oauthResponse.accessToken = newAccessToken;
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
      // Hope this never happens... if it does that user has to login to the app all the time
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
