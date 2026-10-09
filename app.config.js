const { existsSync } = require('node:fs');

/**
 * Estende o app.json. O google-services.json (Firebase, necessário para o push dos círculos) não
 * fica no repositório: o CI o grava a partir de um secret (ver docs/push-setup.md). Se o arquivo
 * não existir, o app compila normalmente, só sem push remoto.
 */
const GOOGLE_SERVICES_FILE = './google-services.json';

/** @param {{ config: import('expo/config').ExpoConfig }} context */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(existsSync(GOOGLE_SERVICES_FILE) ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
  },
});
