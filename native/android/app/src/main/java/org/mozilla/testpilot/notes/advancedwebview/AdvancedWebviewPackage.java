package org.mozilla.testpilot.notes.advancedwebview;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class AdvancedWebviewPackage implements ReactPackage {
    private AdvancedWebviewManager manager;
    private AdvancedWebviewModule module;

    public List<Class<? extends JavaScriptModule>> createJSModules() {
        return Collections.emptyList();
    }

    @Override public List createViewManagers(ReactApplicationContext reactContext) {
        manager = new AdvancedWebviewManager();
        manager.setPackage(this);
        return Arrays.<ViewManager>asList(manager);
    }

    @Override public List createNativeModules( ReactApplicationContext reactContext) {
        List modules = new ArrayList<>();
        module = new AdvancedWebviewModule(reactContext);
        module.setPackage(this);
        modules.add(module);
        return modules;
    }

    public AdvancedWebviewManager getManager(){
        return manager;
    }

    public AdvancedWebviewModule getModule(){
        return module;
    }
}
