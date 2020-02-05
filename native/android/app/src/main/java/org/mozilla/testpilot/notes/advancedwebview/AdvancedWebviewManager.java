package org.mozilla.testpilot.notes.advancedwebview;

import android.webkit.WebView;

import javax.annotation.Nullable;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.views.webview.ReactWebViewManager;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Locale;

public class AdvancedWebviewManager extends ReactWebViewManager {
    public WebView webview = null;

    public static final String REACT_CLASS = "AdvancedWebview";

    private AdvancedWebviewPackage aPackage;
    public String getName() {
        return REACT_CLASS;
    }

    @ReactProp(name = "sourceFocus")
    public void setSource(WebView view, @Nullable ReadableMap source) {
        if (source != null) {
            if (source.hasKey("html")) {
                String html = source.getString("html");
                if (source.hasKey("baseUrl")) {
                    view.loadDataWithBaseURL(
                            source.getString("baseUrl"), html, HTML_MIME_TYPE, HTML_ENCODING, null);
                } else {
                    view.loadData(html, HTML_MIME_TYPE, HTML_ENCODING);
                }
                return;
            }
            if (source.hasKey("uri")) {
                String url = source.getString("uri");
                String focusKeyboard = source.getString("focusKeyboard");
                String previousUrl = view.getUrl();
                if (previousUrl != null && previousUrl.equals(url)) {
                    return;
                }
                if (source.hasKey("method")) {
                    String method = source.getString("method");
                    if (method.equals(HTTP_METHOD_POST)) {
                        byte[] postData = null;
                        if (source.hasKey("body")) {
                            String body = source.getString("body");
                            try {
                                postData = body.getBytes("UTF-8");
                            } catch (UnsupportedEncodingException e) {
                                postData = body.getBytes();
                            }
                        }
                        if (postData == null) {
                            postData = new byte[0];
                        }
                        view.postUrl(url, postData);
                        return;
                    }
                }
                HashMap<String, String> headerMap = new HashMap<>();
                if (source.hasKey("headers")) {
                    ReadableMap headers = source.getMap("headers");
                    ReadableMapKeySetIterator iter = headers.keySetIterator();
                    while (iter.hasNextKey()) {
                        String key = iter.nextKey();
                        if ("user-agent".equals(key.toLowerCase(Locale.ENGLISH))) {
                            if (view.getSettings() != null) {
                                view.getSettings().setUserAgentString(headers.getString(key));
                            }
                        } else {
                            headerMap.put(key, headers.getString(key));
                        }
                    }
                }
                view.loadUrl(url, headerMap);
                if (focusKeyboard.equals("focus")) {
                    view.requestFocus();
                }
                return;
            }
        }
        view.loadUrl(BLANK_URL);
    }


    public void setPackage(AdvancedWebviewPackage aPackage){
        this.aPackage = aPackage;
    }

    public AdvancedWebviewPackage getPackage(){
        return this.aPackage;
    }
}
