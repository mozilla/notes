package com.notes.fxaclient;

import android.widget.Toast;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.jetbrains.annotations.Nullable;

import mozilla.components.service.fxa.FirefoxAccount;
import mozilla.components.service.fxa.Config;
import mozilla.components.service.fxa.FxaResult;
import mozilla.components.service.fxa.OAuthInfo;

import java.util.List;
import java.util.Map;
import java.util.HashMap;


public class FxaClientModule extends ReactContextBaseJavaModule {

    private static final String DURATION_SHORT_KEY = "SHORT";
    private static final String DURATION_LONG_KEY = "LONG";

    private static final String CLIENT_ID = "7f368c6886429f19";
    private static final String REDIRECT_URL = "https://mozilla.github.io/notes/fxa/android-redirect.html";
    private static final String CONFIG_URL = "https://accounts.firefox.com";
    private static final String FXA_STATE_PREFS_KEY = "fxaAppState";
    private static final String FXA_STATE_KEY = "fxaState";

    private static final String[] scopes = new String[]{ "profile", "https://identity.mozilla.com/apps/notes" };
    private static final Boolean wantsKeys = true;
    private FirefoxAccount account;
            
    public FxaClientModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ToastExample";
    }
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put(DURATION_SHORT_KEY, Toast.LENGTH_SHORT);
        constants.put(DURATION_LONG_KEY, Toast.LENGTH_LONG);
        return constants;
    }

    @ReactMethod
    public void show(String message, int duration) {
        Toast.makeText(getReactApplicationContext(), message, duration).show();
    }

    @ReactMethod
    public void begin(String message, int duration) {
        String code = "";
        String state = "";

        Config.Companion.custom(CONFIG_URL).then(new FxaResult.OnValueListener<Config, String>() {
            public FxaResult<String> onValue(Config config) {
                account = new FirefoxAccount(config, CLIENT_ID, REDIRECT_URL);
                return account.beginOAuthFlow(scopes, wantsKeys);
            }
        }, null).then(new FxaResult.OnValueListener<String, Void>() {
            public FxaResult<Void> onValue(String s) {
                // spawn the webview, return a code and a state somewhere

                return null;
            }
        }, null);

        account.completeOAuthFlow(code, state).then(new FxaResult.OnValueListener<OAuthInfo, Void>() {
            public FxaResult<Void> onValue(OAuthInfo oAuthInfo) {
                return null;
            }
        }, null);

        // Toast.makeText(getReactApplicationContext(), message, duration).show();
    }
}