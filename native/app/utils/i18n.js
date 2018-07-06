import { NativeModules } from 'react-native';

const OS_LOCALE = NativeModules.I18nManager.localeIdentifier;
// Have to define a require for each known file
// Ref: https://github.com/facebook/react-native/issues/6391
const LOCALE_FILES = {
  'ast': require('../_locales/ast/messages'),
  'az': require('../_locales/az/messages'),
  'bn_BD': require('../_locales/bn_BD/messages'),
  'bs': require('../_locales/bs/messages'),
  'cak': require('../_locales/cak/messages'),
  'cs': require('../_locales/cs/messages'),
  'de': require('../_locales/de/messages'),
  'dsb': require('../_locales/dsb/messages'),
  'el': require('../_locales/el/messages'),
  'en_US': require('../_locales/en_US/messages'),
  'es_AR': require('../_locales/es_AR/messages'),
  'es_CL': require('../_locales/es_CL/messages'),
  'es_ES': require('../_locales/es_ES/messages'),
  'es_MX': require('../_locales/es_MX/messages'),
  'fa': require('../_locales/fa/messages'),
  'fr': require('../_locales/fr/messages'),
  'fy_NL': require('../_locales/fy_NL/messages'),
  'he': require('../_locales/he/messages'),
  'hi_IN': require('../_locales/hi_IN/messages'),
  'hsb': require('../_locales/hsb/messages'),
  'hu': require('../_locales/hu/messages'),
  'id': require('../_locales/id/messages'),
  'it': require('../_locales/it/messages'),
  'ja': require('../_locales/ja/messages'),
  'ka': require('../_locales/ka/messages'),
  'kab': require('../_locales/kab/messages'),
  'ko': require('../_locales/ko/messages'),
  'ms': require('../_locales/ms/messages'),
  'nb_NO': require('../_locales/nb_NO/messages'),
  'nl': require('../_locales/nl/messages'),
  'nn_NO': require('../_locales/nn_NO/messages'),
  'pa_IN': require('../_locales/pa_IN/messages'),
  'pt_BR': require('../_locales/pt_BR/messages'),
  'pt_PT': require('../_locales/pt_PT/messages'),
  'ro': require('../_locales/ro/messages'),
  'ru': require('../_locales/ru/messages'),
  'sk': require('../_locales/sk/messages'),
  'sl': require('../_locales/sl/messages'),
  'sq': require('../_locales/sq/messages'),
  'sr': require('../_locales/sr/messages'),
  'sv_SE': require('../_locales/sv_SE/messages'),
  'te': require('../_locales/te/messages'),
  'tl': require('../_locales/tl/messages'),
  'tr': require('../_locales/tr/messages'),
  'uk': require('../_locales/uk/messages')
};

let localeName = OS_LOCALE;
let localeStrings = LOCALE_FILES[localeName];

if (! localeStrings) {
  localeName = OS_LOCALE.split('_')[0];
  localeStrings = LOCALE_FILES[localeName];
}

if (! localeStrings) {
  localeName = 'en_US';
  localeStrings = LOCALE_FILES[localeName];
}

function getMessage(messageName, content) {
  const msg = localeStrings[messageName] || LOCALE_FILES['en_US'][messageName] || {
    message: messageName
  };
  const translated = Object.assign({}, msg);

  if (translated.placeholders) {
    translated.message = translated.message.replace(/\$.*\$/g, content);
  }

  return translated.message;
}

export default getMessage;
