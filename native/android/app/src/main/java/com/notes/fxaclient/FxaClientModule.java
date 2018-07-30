package com.notes.fxaclient;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.notes.FxaLoginActivity;

import org.json.JSONException;
import org.json.JSONObject;

import mozilla.components.service.fxa.Config;
import mozilla.components.service.fxa.FirefoxAccount;
import mozilla.components.service.fxa.FxaResult;
import mozilla.components.service.fxa.OAuthInfo;
import mozilla.components.service.fxa.Profile;


public class FxaClientModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final String CLIENT_ID = "7f368c6886429f19";
    private static final String REDIRECT_URL = "https://mozilla.github.io/notes/fxa/android-redirect.html";
    private static final String CONFIG_URL = "https://accounts.firefox.com";

    private static final String[] scopes = new String[]{ "profile", "https://identity.mozilla.com/apps/notes" };
    private static final Boolean wantsKeys = true;
    private FirefoxAccount account;

    public static final String REACT_CLASS = "FxaClient";
    public ReactContext REACT_CONTEXT;

    private Callback mSuccessCallback;
    private Callback mErrorCallback;

    @Override
    public String getName(){
        return REACT_CLASS;
    }

    @SuppressWarnings("unused")
    public Activity getActivity() {
        return getCurrentActivity();
    }

    public ReactContext getReactContext(){
        return REACT_CONTEXT;
    }

    public FxaClientModule(ReactApplicationContext reactContext) {
        super(reactContext);
        REACT_CONTEXT = reactContext;
        reactContext.addActivityEventListener(this);
    }

    /**
     * Lazy getter for the account object.
     */
    private FxaResult<FirefoxAccount> getAccount() {
        if (account != null) {
            return FxaResult.Companion.fromValue(account);
        } else {
            return Config.Companion.custom(CONFIG_URL).then(new FxaResult.OnValueListener<Config, FirefoxAccount>() {
                public FxaResult<FirefoxAccount> onValue(Config config) {
                    account = new FirefoxAccount(config, CLIENT_ID, REDIRECT_URL);
                    return FxaResult.Companion.fromValue(account);
                }
            }, new FxaResult.OnExceptionListener<FirefoxAccount>() {
                public FxaResult<FirefoxAccount> onException(Exception e) {
                    mErrorCallback.invoke();
                    return null;
                }
            });
        }
    }
    @ReactMethod
    public void begin(final Callback successCallback,
                      final Callback errorCallback) {
        this.mSuccessCallback = successCallback;
        this.mErrorCallback = errorCallback;
        final Context context = getReactApplicationContext();
        final Intent intent = new Intent(context, FxaLoginActivity.class);

        getAccount().then(new FxaResult.OnValueListener<FirefoxAccount, String>() {
            public FxaResult<String> onValue(FirefoxAccount account) {
                return account.beginOAuthFlow(scopes, wantsKeys);
            }
        }, new FxaResult.OnExceptionListener<String>() {
            public FxaResult<String> onException(Exception e) {
                errorCallback.invoke();
                return null;
            }
        }).then(new FxaResult.OnValueListener<String, Void>() {
            public FxaResult<Void> onValue(String authUrl) {
                intent.putExtra("authUrl", authUrl);
                intent.putExtra("redirectUrl", REDIRECT_URL);
                try {
                    getCurrentActivity().startActivityForResult(intent, 2);
                } catch (Exception e) {
                    errorCallback.invoke();
                }
                return null;
            }
        }, new FxaResult.OnExceptionListener<Void>() {
            public FxaResult<Void> onException(Exception e) {
                errorCallback.invoke();
                return null;
            }
        });
    }

    @ReactMethod
    public void renewToken(String state, final Callback successCallback,
                           final Callback errorCallback) {
        FxaResult<FirefoxAccount> account;
        if (this.account != null) {
            account = FxaResult.Companion.fromValue(this.account);
        } else if (state != null) {
            account = FirefoxAccount.Companion.fromJSONString(state);
        } else {
            errorCallback.invoke();
            return;
        }

        account.then(new FxaResult.OnValueListener<FirefoxAccount, OAuthInfo>() {
            public FxaResult<OAuthInfo> onValue(FirefoxAccount account) {
                return account.getOAuthToken(scopes);
            }
        }, new FxaResult.OnExceptionListener<OAuthInfo>() {
            public FxaResult<OAuthInfo> onException(Exception e) {
                errorCallback.invoke();
                return null;
            }
        }).then(new FxaResult.OnValueListener<OAuthInfo, Void>() {
            public FxaResult<Void> onValue(OAuthInfo response) {
                successCallback.invoke(response.accessToken);
                return null;
            }
        }, new FxaResult.OnExceptionListener<Void>() {
            public FxaResult<Void> onException(Exception e) {
                errorCallback.invoke();
                return null;
            }
        });
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (data == null) {
            mErrorCallback.invoke();
            return;
        }

        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread thread, Throwable e) {
                e.printStackTrace();
                if (mErrorCallback != null) {
                    mErrorCallback.invoke();
                }
            }
        });

        final JSONObject loginDetails = new JSONObject();
        final JSONObject oauthResponse = new JSONObject();

        String code = data.getStringExtra("code");
        String state = data.getStringExtra("state");

        account.completeOAuthFlow(code, state).then(new FxaResult.OnValueListener<OAuthInfo, Profile>() {
            public FxaResult<Profile> onValue(OAuthInfo oAuthInfo) {
                try {
                    oauthResponse.put("accessToken", oAuthInfo.accessToken);
                    loginDetails.put("keys", new JSONObject(oAuthInfo.keys));
                    loginDetails.put("oauthResponse", oauthResponse);
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                return account.getProfile();
            }
        }, new FxaResult.OnExceptionListener<Profile>() {
            public FxaResult<Profile> onException(Exception e) {
                mErrorCallback.invoke();
                return null;
            }
        }).then(new FxaResult.OnValueListener<Profile, Void>() {
            public FxaResult<Void> onValue(Profile profile) {
                try {
                    // Save the state as a raw string
                    loginDetails.put("state", account.toJSONString());
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                mSuccessCallback.invoke(loginDetails.toString());
                return null;
            }
        }, new FxaResult.OnExceptionListener<Void>() {
            public FxaResult<Void> onException(Exception e) {
                mErrorCallback.invoke();
                return null;
            }
        });
    }

    @Override
    public void onNewIntent(Intent intent) {

    }
}
