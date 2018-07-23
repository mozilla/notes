package com.notes.fxaclient;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.notes.FxaLoginActivity;

import org.jetbrains.annotations.Nullable;
import org.json.JSONException;
import org.json.JSONObject;

import mozilla.components.service.fxa.Config;
import mozilla.components.service.fxa.FirefoxAccount;
import mozilla.components.service.fxa.FxaResult;
import mozilla.components.service.fxa.OAuthInfo;
import mozilla.components.service.fxa.Profile;

import static android.support.v4.content.ContextCompat.startActivity;


public class FxaClientModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final String CLIENT_ID = "7f368c6886429f19";
    private static final String REDIRECT_URL = "https://mozilla.github.io/notes/fxa/android-redirect.html";
    private static final String CONFIG_URL = "https://accounts.firefox.com";
    private static final String FXA_STATE_PREFS_KEY = "fxaAppState";
    private static final String FXA_STATE_KEY = "fxaState";

    private static final String[] scopes = new String[]{ "profile", "https://identity.mozilla.com/apps/notes" };
    private static final Boolean wantsKeys = true;
    private FirefoxAccount account;

    public static final String REACT_CLASS = "FxaClient";
    public ReactContext REACT_CONTEXT;

    private Callback mSuccessCallback;

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

    @ReactMethod
    public void show(String message) {
        Toast.makeText(getReactApplicationContext(), message, Toast.LENGTH_LONG).show();
    }

    @ReactMethod
    public void begin(final Callback successCallback,
                      final Callback errorCallback) {
        this.mSuccessCallback = successCallback;
        String code = "";
        String state = "";
        final Context context = getReactApplicationContext();
        final Intent intent = new Intent(context, FxaLoginActivity.class);

        Config.Companion.custom(CONFIG_URL).then(new FxaResult.OnValueListener<Config, String>() {
            public FxaResult<String> onValue(Config config) {
                account = new FirefoxAccount(config, CLIENT_ID, REDIRECT_URL);
                return account.beginOAuthFlow(scopes, wantsKeys);
            }
        }, new FxaResult.OnExceptionListener<String>() {
            public FxaResult<String> onException(Exception e) {
                errorCallback.invoke();
                return null;
            }
        }).then(new FxaResult.OnValueListener<String, Void>() {
            public FxaResult<Void> onValue(String s) {
                // spawn the webview, return a code and a state somewhere;
                intent.putExtra("authUrl", s);
                intent.putExtra("redirectUrl", REDIRECT_URL);
                Log.e("notes", "starting webview");
                getCurrentActivity().startActivityForResult(intent, 2);
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
        final JSONObject loginDetails = new JSONObject();
        final JSONObject oauthResponse = new JSONObject();

        String code = data.getStringExtra("code");
        String state = data.getStringExtra("state");

        account.completeOAuthFlow(code, state).then(new FxaResult.OnValueListener<OAuthInfo, Profile>() {
            public FxaResult<Profile> onValue(OAuthInfo oAuthInfo) {
                try {
                    oauthResponse.put("accessToken", oAuthInfo.accessToken);
                    loginDetails.put("keys", oAuthInfo.keys);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return account.getProfile();
            }
        }, null).then(new FxaResult.OnValueListener<Profile, Void>() {
            public FxaResult<Void> onValue(Profile profile) {
                try {
                    loginDetails.put("oauthResponse", oauthResponse.toString());
                    loginDetails.put("profile", profile);
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                Log.e("notes", loginDetails.toString());
                mSuccessCallback.invoke(loginDetails.toString());
                return null;
            }
        }, null);
    }

    @Override
    public void onNewIntent(Intent intent) {

    }
}