# Localization

## When should you localize strings?

Any time you add human-readable text to the add-on, whether it is plain text, labels, or text only available to screen-readers, you should localize those strings.

## How to update localized strings

If you just are fixing a typo in an existing English string, you can go ahead and make the change in `locales/en-US/strings.properties`. If you are changing the *meaning* of an existing string such that other translations need to be re-done, you should also change the *id* of that string in order to invalidate it in other languages. (see [this guide](https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_content_best_practices#Changing_existing_strings) for more info).

## How to localize strings

First, add the new string to `locales/en-US/strings.properties`. You do NOT need to add strings to other language files. Try to use an id that is descriptive of the function/role in the application, and consider adding comments for localizers when necessary. See [this guide](https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_content_best_practices
) for more tips on localization best practices.

Note that you must **re-build the add-on** every time you add new strings (npm run build).

On the add-on, you can access strings directly using browser.i18n and the id of the string you want.
```javascript
browser.i18n.getMessage('idOfStringFromStringPropertiesFile')
```

## Building the add-on with a different set of languages

You can build the add on with a different locale by using the --pref argument to [web-ext](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/web-ext_command_reference#--pref)
```WEB_EXT_PREF=general.useragent.locale=locale_to_test npm start```

## Testing with right to left
You can test right to left locales by building with a locale that uses RTL text direction. (e.g ar)
```WEB_EXT_PREF=general.useragent.locale=ar npm start```
