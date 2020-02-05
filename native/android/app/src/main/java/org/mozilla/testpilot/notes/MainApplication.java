package org.mozilla.testpilot.notes;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import dog.craftz.sqlite_2.RNSqlite2Package;
import io.sentry.RNSentryPackage;

import org.mozilla.testpilot.notes.advancedwebview.AdvancedWebviewPackage;
import org.mozilla.testpilot.notes.fxaclient.FxaClientPackage;

import com.oblador.vectoricons.VectorIconsPackage;
import com.oblador.keychain.KeychainPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.rnappauth.RNAppAuthPackage;
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
            new NetInfoPackage(),
            new RNSqlite2Package(),
            new RNSentryPackage(),
            new VectorIconsPackage(),
            new KeychainPackage(),
            new RandomBytesPackage(),
            new RNAppAuthPackage(),
            new AdvancedWebviewPackage(),
            new FxaClientPackage()
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
