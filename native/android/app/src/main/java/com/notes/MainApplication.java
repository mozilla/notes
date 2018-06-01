package org.mozilla.testpilot.notes;

import android.app.Application;

import com.facebook.react.ReactApplication;
import dog.craftz.sqlite_2.RNSqlite2Package;
import com.idehub.GoogleAnalyticsBridge.GoogleAnalyticsBridgePackage;
import io.sentry.RNSentryPackage;

import com.notes.advancedwebview.AdvancedWebviewPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.oblador.keychain.KeychainPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.reactlibrary.RNAppAuthPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new RNSqlite2Package(),
            new GoogleAnalyticsBridgePackage(),
            new RNSentryPackage(MainApplication.this),
            new VectorIconsPackage(),
            new KeychainPackage(),
            new RandomBytesPackage(),
            new RNAppAuthPackage(),
            new AdvancedWebviewPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
