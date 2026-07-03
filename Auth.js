const USERS_HEADERS = ['Username', 'Password', 'Access', 'Active'];

function login(username, password) {
  ensureUsersSheet_();

  var normalizedUsername = String(username || '').trim();
  var normalizedPassword = String(password || '').trim();

  if (!normalizedUsername || !normalizedPassword) {
    throw new Error('Username and password are required.');
  }

  var user = findUser_(normalizedUsername);
  if (!user) {
    throw new Error('User not found.');
  }

  if (!user.active) {
    throw new Error('User is inactive.');
  }

  if (user.password !== normalizedPassword) {
    throw new Error('Invalid password.');
  }

  var availableWorkflows = getAllowedConfigs_(user.access);
  if (!availableWorkflows.length) {
    throw new Error('No workflows are available for this user.');
  }

  return {
    username: user.username,
    access: user.access,
    workflows: availableWorkflows,
  };
}

function ensureUsersSheet_() {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(SHEETS.users);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEETS.users);
  }

  var headerRange = sheet.getRange(1, 1, 1, USERS_HEADERS.length);
  var existingHeaders = headerRange.getValues()[0];
  var hasHeaders = existingHeaders.some(function(value) {
    return String(value || '').trim() !== '';
  });

  if (!hasHeaders) {
    headerRange.setValues([USERS_HEADERS]);
  }

  sheet.getRange(1, 2, sheet.getMaxRows(), 1).setNumberFormat('@');
}

function findUser_(username) {
  var sheet = getSpreadsheet_().getSheetByName(SHEETS.users);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, USERS_HEADERS.length).getValues();
  var normalizedUsername = String(username || '').trim().toLowerCase();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowUsername = String(row[0] || '').trim();

    if (rowUsername.toLowerCase() === normalizedUsername) {
      return {
        username: rowUsername,
        password: String(row[1] || '').trim(),
        access: parseAccess_(row[2]),
        active: parseBoolean_(row[3]),
      };
    }
  }

  return null;
}

function parseAccess_(value) {
  return String(value || '')
    .split(',')
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);
}

function parseBoolean_(value) {
  if (value === true) return true;

  var normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function getAllowedConfigs_(access) {
  return access
    .filter(function(contextKey) {
      return Boolean(APP_CONFIGS[contextKey]);
    })
    .map(function(contextKey) {
      var config = APP_CONFIGS[contextKey];

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
    });
}
