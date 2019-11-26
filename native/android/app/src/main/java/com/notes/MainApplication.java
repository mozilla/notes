package org.mozilla.testpilot.notes;

import android.app.Application;

import com.facebook.react.ReactApplication;
import dog.craftz.sqlite_2.RNSqlite2Package;
import io.sentry.RNSentryPackage;

import org.mozilla.testpilot.notes.advancedwebview.AdvancedWebviewPackage;
import org.mozilla.testpilot.notes.fxaclient.FxaClientPackage;

import com.facebook.react.PackageList;
import com.facebook.hermes.reactexecutor.HermesExecutorFactory;
import com.facebook.react.bridge.JavaScriptExecutorFactory;
import com.oblador.vectoricons.VectorIconsPackage;
import com.oblador.keychain.KeychainPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.rnappauth.RNAppAuthPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      List<ReactPackage> packages = new PackageList(this).getPackages();
      packages.add(new RNSqlite2Package());
      packages.add(new RNSentryPackage());
      packages.add(new VectorIconsPackage());
      packages.add(new KeychainPackage());
      packages.add(new RandomBytesPackage());
      packages.add(new RNAppAuthPackage());
      packages.add(new AdvancedWebviewPackage());
      packages.add(new FxaClientPackage());

      return packages;
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
