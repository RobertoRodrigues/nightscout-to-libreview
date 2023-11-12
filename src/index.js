const dayjs = require('dayjs');
const uuid = require('uuid');
const colors = require('colors');
const prompt = require('prompt');
const fs = require('fs');
const i18n = require('i18n');

require('dotenv').config({ path: __dirname + '/../config.env' });

const libre = require('./functions/libre');
const nightscout = require('./functions/nightscout');

const CONFIG_NAME = 'config.json';
const DEFAULT_CONFIG = {
};

if (!fs.existsSync(CONFIG_NAME)) {
  fs.writeFileSync(CONFIG_NAME, JSON.stringify(DEFAULT_CONFIG));
}

const rawConfig = fs.readFileSync(CONFIG_NAME);
let config = JSON.parse(rawConfig);

i18n.configure({
    locales:['en', 'pt'],
    directory: __dirname + '/locales'
});

let setLocale = 'pt';

async function runPrompt() {
  return new Promise((resolve, reject) => {
    prompt.get([{
      name: 'locale',
      description: 'Escolha o idioma, para portugues aperte enter. For English, type en and press enter.',
      required: false,
      default: setLocale
    }], function (err, result) {
      if (err) {
        reject(err);
      }

      if (result.locale !== 'pt') {
        setLocale = 'en';
        console.log(i18n.__('Language set to English.').blue);
      } else {
        console.log(i18n.__('Idioma definido Portugês').grey);
      }

      i18n.setLocale(setLocale);

      prompt.get([{
        name: 'nightscoutUrl',
        description: i18n.__('enter_nightscout_url'),
        required: true,
        default: config.nightscoutUrl
      }, {
        name: 'nightscoutToken',
        description: i18n.__('enter_nightscout_token'),
        required: false,
        default: config.nightscoutToken
      }, {
        name: 'libreUsername',
        description: i18n.__('enter_libreview_username'),
        required: true,
        default: config.libreUsername
      }, {
        name: 'librePassword',
        description: i18n.__('enter_libreview_password'),
        required: true,
        default: config.librePassword
      }, {
        name: 'year',
        description: i18n.__('enter_year_transfer_libreview'),
        required: true,
        type: 'number',
        default: new Date().getFullYear()
      }, {
        name: 'month',
        description: i18n.__('enter_month_transfer_libreview'),
        required: true,
        type: 'number',
        default: new Date().getMonth()
      }, {
        name: 'libreResetDevice',
        description: i18n.__('recreate_device_id'),
        required: true,
        type: 'boolean',
        default: false
      }], function (err, result) {
        if (err) {
          reject(err);
        }

        config = Object.assign({}, config, {
          nightscoutUrl: result.nightscoutUrl,
          nightscoutToken: result.nightscoutToken,
          libreUsername: result.libreUsername,
          librePassword: result.librePassword,
          libreDevice: (result.libreResetDevice || !!!config.libreDevice) ? uuid.v4().toUpperCase() : config.libreDevice
        });

        fs.writeFileSync(CONFIG_NAME, JSON.stringify(config));

        resolve(result);
      });
    });
  });
}

(async () => {
  const result = await runPrompt();

  const fromDate = dayjs(`${result.year}-${result.month}-01`).format('YYYY-MM-DD');
  const toDate = dayjs(`${result.year}-${result.month + 1}-01`).format('YYYY-MM-DD');

  console.log(i18n.__('transfer_time_span'), fromDate.gray, toDate.gray);

  const glucoseEntries = await nightscout.getNightscoutGlucoseEntries(config.nightscoutUrl, config.nightscoutToken, fromDate, toDate, i18n);
  const foodEntries = await nightscout.getNightscoutFoodEntries(config.nightscoutUrl, config.nightscoutToken, fromDate, toDate, i18n);
  const insulinEntries = await nightscout.getNightscoutInsulinEntries(config.nightscoutUrl, config.nightscoutToken, fromDate, toDate, i18n);

  if (glucoseEntries.length > 0 || foodEntries.length > 0 || insulinEntries.length > 0) {
    const auth = await libre.authLibreView(config.libreUsername, config.librePassword, config.libreDevice, result.libreResetDevice, i18n);
    if (!!!auth) {
      console.log(i18n.__('libre_auth_failed').red);

      return;
    }

    await libre.transferLibreView(config.libreDevice, auth, glucoseEntries, foodEntries, insulinEntries, i18n);
  }
})();
