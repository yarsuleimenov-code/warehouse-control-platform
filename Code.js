function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Warehouse Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInitialData() {
  ensurePlatformSetup();

  return {
    appName: 'Warehouse Control',
    version: APP_VERSION,
    timezone: APP_TIMEZONE,
    workflows: getPublicConfigs_(),
    trucks: TRUCKS,
  };
}

function ensurePlatformSetup() {
  ensureUsersSheet_();
  ensureLoadingSupportSheets_(getConfig_('NY_LOADING'));
  ensureLoadingSupportSheets_(getConfig_('CA_LOADING'));
  ensureUnloadingSupportSheets_(getConfig_('NY_UNLOADING'));
  ensureUnloadingSupportSheets_(getConfig_('CA_UNLOADING'));

  return {
    ok: true,
  };
}

function getDashboardContext(contextKey) {
  var config = getConfig_(contextKey);

  return {
    key: config.key,
    label: config.label,
    branch: config.branch,
    mode: config.mode,
    route: config.route,
    tripPrefix: config.tripPrefix,
    storageNamespace: config.storageNamespace,
    trucks: config.trucks,
  };
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
