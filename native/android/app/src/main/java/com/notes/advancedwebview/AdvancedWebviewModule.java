package org.mozilla.testpilot.notes.advancedwebview;

import android.app.Activity;
import android.content.Intent;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.common.annotations.VisibleForTesting;

public class AdvancedWebviewModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private ValueCallback mUploadMessage;

    @VisibleForTesting
    public static final String REACT_CLASS = "AdvancedWebview";
    public ReactContext REACT_CONTEXT;

    public AdvancedWebviewModule(ReactApplicationContext context){

        super(context);
        REACT_CONTEXT = context;
        context.addActivityEventListener(this);
    }

    private AdvancedWebviewPackage aPackage;

    public void setPackage(AdvancedWebviewPackage aPackage) {
        this.aPackage = aPackage;
    }

    public AdvancedWebviewPackage getPackage() {
        return this.aPackage;
    }

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

    @ReactMethod
    public void getUrl(Callback errorCallback,
                       final Callback successCallback) {
        try {
            final WebView view = getPackage().getManager().webview;

            if(getPackage().getManager().webview != null) {
                view.post(new Runnable() {
                    @Override
                    public void run() {
                        successCallback.invoke(view.getUrl());
                    }
                });
            }else{
                successCallback.invoke("");
            }
        }catch(Exception e){
            errorCallback.invoke(e.getMessage());
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    }

    @Override
    public void onNewIntent(Intent intent) {

    }

}
