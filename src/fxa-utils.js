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
    headers: headers
  });

  return fetch(request).then((resp) => {
    if (resp.status === 200) {
      return resp.json();
    } else {
      throw new Error('Failed to fetch profile');
    }
  });
}
