/**
 * Handle Firefox Account Authentication
 */
/**
 * Handle the end of the OAuth flow
 */
function tabCallback(redirectURL) {
  return function(tabId, changeInfo, updatedTab) {
    if (changeInfo.status === 'complete' && updatedTab.url.indexOf(redirectURL) === 0) {
      chrome.tabs.remove(tabId);
      var params = getURLParams(updatedTab.url, redirectURL);
      chrome.storage.local.set(params, function() {
        chrome.runtime.sendMessage({ ...params, action: 'authenticated' });
      });
    }
  };
}

function getURLParams(updatedTabURL, redirectURL) {
  console.log('getURLParams', updatedTabURL, redirectURL);
  let parts = {};
  const params = updatedTabURL.split(redirectURL)[1];
  if (params.indexOf('&') !== -1) {
    const queryparams = params.split('&');
    for (var param in queryparams) {
      const pairs = param.split('=', 1);
      parts[pairs[0]] = pairs[1];
    }
  } else {
    // Previous FxA version that doesn't return keys.
    console.error('keys are missing');
    parts.bearer = params;
  }
  console.log('OAuth flow params', parts);
  return parts;
}

/**
 * Start the login flow
 */

function handleAuthentication(kinto_server, redirectURL, client_id) {
  // Get params
  fetch(`${kinto_server}/fxa-oauth/params`).then(response => {
    return response.json().then(body => {
      // Build authentication URL
      const {oauth_uri, client_id, scope} = body;
      const state = createRandomString(16);
      const code_verifier = createRandomString(32);
      browser.storage.local.set({fxa: {client_id, state, code_verifier}})
        .then(() => {
          sha256(code_verifier).then(code_challenge => {
            const params = {oauth_uri, client_id, scope, state, code_challenge};
            const authenticateURL = getAuthenticationURL(params);
            console.log("Starting auth.");
            chrome.tabs.create({ 'url': authenticateURL }, function () {
              chrome.tabs.onUpdated.addListener(tabCallback(redirectURL));
            });
          });
        });
    });
  });
}
