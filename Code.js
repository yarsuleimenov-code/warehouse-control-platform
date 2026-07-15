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

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
