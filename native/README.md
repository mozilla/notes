# Notes for Android

## Contributing

* Use node 8 and run `npm install`
* Plugin an Android phone (or use a device from Android AVD) and make sure it is visible via `adb devices`
* Run `npm start`

## Useful commands

`npm run dm` - when the app is open this opens the debug menu

Use `npx` (from npm 5) to run commands for `react-native`

`npx react-native upgrade` - regenerates Android files from React Native
`npx react-native start --reset-cache` - resets app cache

`adb logcat *:S ReactNative:V ReactNativeJS:V` - Logger from Android LogCat
