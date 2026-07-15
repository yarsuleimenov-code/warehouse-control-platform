const ORDER_HEADER_ALIASES = {
  orderId: ['OrderID', 'ID'],
  title: ['Title'],
  excl: ['Excl'],
  zone: ['DeliveryZone', 'Delivery Zone', 'Zone'],
  volume: ['Volume'],
  deliveryDate: ['DeliveryDate', 'Delivery date', 'Date'],
  count: ['Count'],
  colorCode: ['ColorCode', 'Color'],
  weight: ['Weight'],
  loaded: ['Loaded'],
  piecesTotal: ['PiecesTotal', 'Pieces'],
  loadedPieces: ['LoadedPieces'],
};

const ORDER_PIECES_HEADERS = [
  'Branch',
  'OrderID',
  'PieceNumber',
  'Loaded',
  'LoadedAt',
  'UpdatedAt',
  'LoadedBy',
  'TripID',
];

const TRIP_REPORT_HEADERS = [
  'TripID',
  'GeneratedAt',
  'Branch',
  'Route',
  'User',
  'Truck',
  'OrderID',
  'Title',
  'Weight',
  'Volume',
  'LoadingDate',
  'DeliveryDate',
  'PiecesTotal',
  'LoadedPieces',
  'RemainingPieces',
  'Status',
  'CountPieces',
  'RemainingCountPieces',
  'Departure Warehouse',
  'Destination Warehouse',
];

const COLOR_MAP = {
  1: 'red',
  2: 'yellow',
  3: 'green',
  red: 'red',
  yellow: 'yellow',
  green: 'green',
};

const BRANCH_COLORS = {
  NY: '#d9ead3',
  CA: '#cfe2f3',
};

function getLoadingData(contextKey) {
  var config = getLoadingConfig_(contextKey);
  ensureLoadingSupportSheets_(config);

  var ordersSheet = getRequiredSheet_(config.sheets.orders);
  var orderRead = readOrders_(ordersSheet);
  var piecesMap = getOrderPiecesMap_(config);
  var tripStateMap = getTripStateMap_(config);
  var orders = [];

  for (var i = 0; i < orderRead.rows.length; i++) {
    var row = orderRead.rows[i];
    var order = buildOrder_(row, i + 2, orderRead.headerMap, piecesMap, tripStateMap);
    if (order) orders.push(order);
  }

  return {
    context: publicConfig_(config),
    orders: orders,
    stats: buildLoadingStats_(orders),
    diagnostics: {
      orders: orders.length,
      piecesRows: countSheetRows_(config.sheets.orderPieces),
    },
  };
}

function getLoadingPieces(contextKey, orderId) {
  var config = getLoadingConfig_(contextKey);
  ensureLoadingSupportSheets_(config);

  var order = findOrderById_(config, orderId);
  if (!order) {
    throw new Error('Order not found: ' + orderId);
  }

  if (!order.piecesTotal) {
    return {
      orderId: String(orderId),
      piecesTotal: null,
      pieces: [],
    };
  }

  ensurePiecesForOrder_(config, order.orderId, order.piecesTotal);

  return {
    orderId: order.orderId,
    piecesTotal: order.piecesTotal,
    pieces: getPiecesForOrder_(config, order.orderId)
      .filter(function(piece) {
        return piece.pieceNumber <= order.piecesTotal || piece.loaded;
      })
      .sort(function(a, b) {
        return a.pieceNumber - b.pieceNumber;
      }),
  };
}

function saveLoadingChanges(contextKey, payload) {
  var config = getLoadingConfig_(contextKey);
  ensureLoadingSupportSheets_(config);

  payload = payload || {};
  assertUserAccess_(payload.username || '', contextKey);

  savePiecesTotalUpdates_(config, payload.piecesInputs || []);
  saveUnknownLoadedUpdates_(config, payload.unknownUpdates || []);
  saveLoadedPieceUpdates_(config, payload.pieceUpdates || [], payload.username || '');

  return {
    success: true,
    savedAt: formatDateTime_(new Date()),
  };
}

function generateLoadingTrip(contextKey, truck, username) {
  var config = getLoadingConfig_(contextKey);
  assertUserAccess_(username || '', contextKey);

  if (!truck) {
    throw new Error('Truck is required.');
  }

  ensureLoadingSupportSheets_(config);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var data = getLoadingData(contextKey);
    var reportedMap = getReportedLoadedPiecesMap_(config);
    var tripId = config.tripPrefix + '-' + Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyMMdd-HHmm');
    var generatedAt = formatDateTime_(new Date());
    var tripRows = [];

    data.orders.forEach(function(order) {
      var reported = reportedMap[order.orderId] || { loadedPieces: 0, pieceNumbers: {} };
      var countPieces = getNewCountPieces_(order, reported);
      var loadedPieces = countPieces
        ? countPieces.split(',').filter(Boolean).length
        : Math.max(0, order.loadedPieces - reported.loadedPieces);

      if (loadedPieces <= 0) return;

      var totalReported = reported.loadedPieces + loadedPieces;
      var remainingPieces = order.piecesTotal
        ? Math.max(0, order.piecesTotal - totalReported)
        : '';
      var status = order.piecesTotal && remainingPieces === 0 ? 'Completed' : 'Started';
      var remainingCountPieces = getRemainingCountPieces_(order, reported, countPieces);
      var row = buildTripRow_(config, tripId, generatedAt, username, truck, order, loadedPieces, remainingPieces, status, countPieces, remainingCountPieces);

      tripRows.push(row);
    });

    if (!tripRows.length) {
      throw new Error('No newly loaded pieces to generate trip.');
    }

    appendRows_(config.sheets.tripReports, TRIP_REPORT_HEADERS, tripRows);

    return {
      success: true,
      tripId: tripId,
      generatedAt: generatedAt,
      branch: config.branch,
      route: config.route,
      departureWarehouse: config.departureWarehouse || '',
      destinationWarehouse: config.destinationWarehouse || '',
      user: username || '',
      truck: truck,
      rows: tripRows.length,
    };
  } finally {
    lock.releaseLock();
  }
}

function getLoadingConfig_(contextKey) {
  var config = getConfig_(contextKey);
  if (config.mode !== 'loading') {
    throw new Error('Workflow is not a loading workflow: ' + contextKey);
  }

  return config;
}

function ensureLoadingSupportSheets_(config) {
  ensureSheetWithHeaders_(config.sheets.orderPieces, ORDER_PIECES_HEADERS);
  ensureTripReportsSheet_(config.sheets.tripReports);
}

function readOrders_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return {
      headerMap: {},
      rows: [],
    };
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var headerMap = buildOrderHeaderMap_(headers);
  var rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return {
    headerMap: headerMap,
    rows: rows,
  };
}

function buildOrderHeaderMap_(headers) {
  var map = {};

  Object.keys(ORDER_HEADER_ALIASES).forEach(function(key) {
    var aliases = ORDER_HEADER_ALIASES[key];

    for (var i = 0; i < aliases.length; i++) {
      var index = findHeaderIndex_(headers, aliases[i]);
      if (index !== -1) {
        map[key] = index;
        return;
      }
    }
  });

  return map;
}

function buildOrder_(row, rowNumber, headerMap, piecesMap, tripStateMap) {
  var orderId = getCell_(row, headerMap.orderId);
  if (!orderId) return null;

  var color = normalizeColor_(getCell_(row, headerMap.colorCode));
  if (!color) return null;

  var piecesTotal = normalizePositiveInt_(getCell_(row, headerMap.piecesTotal));
  var loadedPieceNumbers = [];
  var loadedPieces = 0;

  if (piecesTotal) {
    loadedPieceNumbers = (piecesMap[String(orderId)] || [])
      .filter(function(piece) {
        return piece.loaded;
      })
      .map(function(piece) {
        return piece.pieceNumber;
      })
      .sort(function(a, b) {
        return a - b;
      });
    loadedPieces = loadedPieceNumbers.length;
  } else {
    loadedPieces = Math.max(0, toNumber_(getCell_(row, headerMap.loadedPieces)));
  }

  return {
    row: rowNumber,
    orderId: String(orderId),
    title: getCell_(row, headerMap.title) || '',
    zone: getCell_(row, headerMap.zone) || '',
    volume: toNumber_(getCell_(row, headerMap.volume)),
    deliveryDate: formatDate_(getCell_(row, headerMap.deliveryDate)),
    loadingDate: '',
    color: color,
    weight: toNumber_(getCell_(row, headerMap.weight)),
    piecesTotal: piecesTotal,
    piecesInput: getCell_(row, headerMap.piecesTotal) || '',
    loadedPieces: loadedPieces,
    loadedPieceNumbers: loadedPieceNumbers,
    status: getLoadingStatus_(piecesTotal, loadedPieces),
    tripState: tripStateMap[String(orderId)] || { inTrip: false, remaining: false },
  };
}

function findOrderById_(config, orderId) {
  var sheet = getRequiredSheet_(config.sheets.orders);
  var read = readOrders_(sheet);
  var piecesMap = getOrderPiecesMap_(config);

  for (var i = 0; i < read.rows.length; i++) {
    var order = buildOrder_(read.rows[i], i + 2, read.headerMap, piecesMap, {});
    if (order && order.orderId === String(orderId)) {
      return order;
    }
  }

  return null;
}

function getOrderPiecesMap_(config) {
  var sheet = getRequiredSheet_(config.sheets.orderPieces);
  var lastRow = sheet.getLastRow();
  var map = {};

  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, ORDER_PIECES_HEADERS.length).getValues();

  values.forEach(function(row) {
    if (String(row[0]) !== config.branch) return;

    var orderId = String(row[1] || '');
    if (!orderId) return;

    if (!map[orderId]) map[orderId] = [];

    map[orderId].push({
      branch: row[0],
      orderId: orderId,
      pieceNumber: Number(row[2]),
      loaded: row[3] === true,
      loadedAt: formatDateTime_(row[4]),
      updatedAt: formatDateTime_(row[5]),
      loadedBy: row[6] || '',
      tripId: row[7] || '',
    });
  });

  return map;
}

function getPiecesForOrder_(config, orderId) {
  return getOrderPiecesMap_(config)[String(orderId)] || [];
}

function ensurePiecesForOrder_(config, orderId, piecesTotal) {
  var total = Number(piecesTotal);
  if (!orderId || !Number.isFinite(total) || total < 1) return;

  var sheet = getRequiredSheet_(config.sheets.orderPieces);
  var existing = {};
  var lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, ORDER_PIECES_HEADERS.length).getValues();
    values.forEach(function(row) {
      if (String(row[0]) === config.branch && String(row[1]) === String(orderId)) {
        existing[Number(row[2])] = true;
      }
    });
  }

  var newRows = [];
  for (var pieceNumber = 1; pieceNumber <= total; pieceNumber++) {
    if (!existing[pieceNumber]) {
      newRows.push([config.branch, String(orderId), pieceNumber, false, '', formatDateTime_(new Date()), '', '']);
    }
  }

  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, ORDER_PIECES_HEADERS.length).setValues(newRows);
  }
}

function savePiecesTotalUpdates_(config, updates) {
  if (!Array.isArray(updates) || !updates.length) return;

  var sheet = getRequiredSheet_(config.sheets.orders);
  var read = readOrders_(sheet);
  if (read.headerMap.piecesTotal === undefined) {
    throw new Error('Pieces column not found in ' + config.sheets.orders);
  }

  updates.forEach(function(update) {
    var rowNumber = Number(update.row);
    if (!Number.isFinite(rowNumber) || rowNumber < 2) return;

    var value = update.pieces === '' || update.pieces === null || update.pieces === undefined
      ? ''
      : Math.max(0, Math.floor(Number(update.pieces) || 0));

    sheet.getRange(rowNumber, read.headerMap.piecesTotal + 1).setValue(value || '');

    if (value > 0) {
      ensurePiecesForOrder_(config, update.orderId, value);
    }
  });
}

function saveUnknownLoadedUpdates_(config, updates) {
  if (!Array.isArray(updates) || !updates.length) return;

  var sheet = getRequiredSheet_(config.sheets.orders);
  var read = readOrders_(sheet);
  if (read.headerMap.loadedPieces === undefined) {
    throw new Error('LoadedPieces column not found in ' + config.sheets.orders);
  }

  updates.forEach(function(update) {
    var rowNumber = Number(update.row);
    if (!Number.isFinite(rowNumber) || rowNumber < 2) return;

    sheet.getRange(rowNumber, read.headerMap.loadedPieces + 1).setValue(Math.max(0, Math.floor(Number(update.loadedPieces) || 0)));
  });
}

function saveLoadedPieceUpdates_(config, updates, username) {
  if (!Array.isArray(updates) || !updates.length) return;

  var sheet = getRequiredSheet_(config.sheets.orderPieces);
  var lastRow = sheet.getLastRow();
  var values = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, ORDER_PIECES_HEADERS.length).getValues()
    : [];
  var rowByKey = {};

  values.forEach(function(row, index) {
    rowByKey[String(row[0]) + '::' + String(row[1]) + '::' + Number(row[2])] = index;
  });

  updates.forEach(function(update) {
    var key = config.branch + '::' + String(update.orderId) + '::' + Number(update.pieceNumber);
    var index = rowByKey[key];
    var loaded = update.loaded === true;

    if (index === undefined) {
      values.push([
        config.branch,
        String(update.orderId),
        Number(update.pieceNumber),
        loaded,
        loaded ? formatDateTime_(new Date()) : '',
        formatDateTime_(new Date()),
        username || '',
        '',
      ]);
      rowByKey[key] = values.length - 1;
      return;
    }

    values[index][3] = loaded;
    values[index][4] = loaded ? values[index][4] || formatDateTime_(new Date()) : '';
    values[index][5] = formatDateTime_(new Date());
    values[index][6] = username || '';
  });

  if (values.length) {
    sheet.getRange(2, 1, values.length, ORDER_PIECES_HEADERS.length).setValues(values);
  }
}

function getTripStateMap_(config) {
  var sheet = getRequiredSheet_(config.sheets.tripReports);
  var lastRow = sheet.getLastRow();
  var map = {};

  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, TRIP_REPORT_HEADERS.length).getValues();
  values.forEach(function(row) {
    if (String(row[2]) !== config.branch || String(row[3]) !== config.route) return;

    var orderId = String(row[6] || '');
    if (!orderId) return;

    map[orderId] = {
      inTrip: true,
      remaining: toNumber_(row[14]) > 0,
    };
  });

  return map;
}

function getReportedLoadedPiecesMap_(config) {
  var sheet = getRequiredSheet_(config.sheets.tripReports);
  var lastRow = sheet.getLastRow();
  var map = {};

  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, TRIP_REPORT_HEADERS.length).getValues();

  values.forEach(function(row) {
    if (String(row[2]) !== config.branch || String(row[3]) !== config.route) return;

    var orderId = String(row[6] || '');
    var loadedPieces = toNumber_(row[13]);
    if (!orderId || loadedPieces <= 0) return;

    if (!map[orderId]) {
      map[orderId] = { loadedPieces: 0, pieceNumbers: {} };
    }

    map[orderId].loadedPieces += loadedPieces;
    String(row[16] || '')
      .split(',')
      .map(function(value) {
        return Number(String(value).trim());
      })
      .filter(function(value) {
        return Number.isInteger(value) && value > 0;
      })
      .forEach(function(pieceNumber) {
        map[orderId].pieceNumbers[pieceNumber] = true;
      });
  });

  return map;
}

function getNewCountPieces_(order, reported) {
  if (!order.piecesTotal || !Array.isArray(order.loadedPieceNumbers)) return '';

  var reportedPieces = reported.pieceNumbers || {};
  var newPieces = order.loadedPieceNumbers.filter(function(pieceNumber) {
    return !reportedPieces[pieceNumber];
  });

  if (Object.keys(reportedPieces).length === 0 && reported.loadedPieces > 0) {
    newPieces = newPieces.slice(reported.loadedPieces);
  }

  return newPieces.join(',');
}

function getRemainingCountPieces_(order, reported, countPieces) {
  if (!order.piecesTotal) return '';

  var reportedPieces = reported.pieceNumbers || {};
  var shippedNow = {};

  String(countPieces || '')
    .split(',')
    .map(function(value) {
      return Number(String(value).trim());
    })
    .filter(function(value) {
      return Number.isInteger(value) && value > 0;
    })
    .forEach(function(pieceNumber) {
      shippedNow[pieceNumber] = true;
    });

  var remaining = [];
  for (var pieceNumber = 1; pieceNumber <= order.piecesTotal; pieceNumber++) {
    if (!reportedPieces[pieceNumber] && !shippedNow[pieceNumber]) {
      remaining.push(pieceNumber);
    }
  }

  return remaining.join(',');
}

function buildTripRow_(config, tripId, generatedAt, username, truck, order, loadedPieces, remainingPieces, status, countPieces, remainingCountPieces) {
  return [
    tripId,
    generatedAt,
    config.branch,
    config.route,
    username || '',
    truck,
    order.orderId,
    order.title,
    order.weight,
    order.volume,
    order.loadingDate || '',
    order.deliveryDate,
    order.piecesTotal || '',
    loadedPieces,
    remainingPieces,
    status,
    countPieces || '',
    remainingCountPieces || '',
    config.departureWarehouse || '',
    config.destinationWarehouse || '',
  ];
}

function appendRows_(sheetName, headers, rows) {
  if (!rows.length) return;

  var sheet = ensureSheetWithHeaders_(sheetName, headers);
  var startRow = sheet.getLastRow() + 1;
  var branchIndex = headers.indexOf('Branch') + 1;
  var textIndexes = getTextColumnIndexes_(headers);

  textIndexes.forEach(function(columnIndex) {
    sheet.getRange(startRow, columnIndex, rows.length, 1).setNumberFormat('@');
  });

  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);

  if (branchIndex > 0) {
    applyBranchColors_(sheet, startRow, branchIndex, rows);
  }
}

function applyBranchColors_(sheet, startRow, branchIndex, rows) {
  var branchValues = rows.map(function(row) {
    return String(row[branchIndex - 1] || '').trim().toUpperCase();
  });
  var backgrounds = branchValues.map(function(branch) {
    return [BRANCH_COLORS[branch] || '#ffffff'];
  });

  sheet.getRange(startRow, branchIndex, rows.length, 1).setBackgrounds(backgrounds);
}

function applyExistingBranchColors_(sheet, headers) {
  var branchIndex = headers.indexOf('Branch') + 1;
  var lastRow = sheet.getLastRow();

  if (branchIndex < 1 || lastRow < 2) return;

  var values = sheet.getRange(2, branchIndex, lastRow - 1, 1).getValues();
  var backgrounds = values.map(function(row) {
    var branch = String(row[0] || '').trim().toUpperCase();
    return [BRANCH_COLORS[branch] || '#ffffff'];
  });

  sheet.getRange(2, branchIndex, backgrounds.length, 1).setBackgrounds(backgrounds);
}

function repaintTripReportsBranchColors() {
  var sheet = ensureTripReportsSheet_(APP_CONFIGS.NY_LOADING.sheets.tripReports);
  applyExistingBranchColors_(sheet, TRIP_REPORT_HEADERS);

  return {
    ok: true,
    sheet: APP_CONFIGS.NY_LOADING.sheets.tripReports,
  };
}

function getTextColumnIndexes_(headers) {
  var indexes = [];

  headers.forEach(function(header, index) {
    var normalized = normalizeHeader_(header);

    if (
      normalized.indexOf('countpieces') !== -1 ||
      normalized === 'tripid' ||
      normalized === 'receivingid' ||
      normalized === 'missingid'
    ) {
      indexes.push(index + 1);
    }
  });

  return indexes;
}

function ensureSheetWithHeaders_(sheetName, headers) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var needsHeaders = false;

  for (var i = 0; i < headers.length; i++) {
    if (current[i] !== headers[i]) {
      needsHeaders = true;
      break;
    }
  }

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function ensureTripReportsSheet_(sheetName) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), TRIP_REPORT_HEADERS.length);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var modeColumn = headers.findIndex(function(header) {
    return normalizeHeader_(header) === 'mode';
  });

  if (modeColumn !== -1) {
    sheet.deleteColumn(modeColumn + 1);
  }

  sheet = ensureSheetWithHeaders_(sheetName, TRIP_REPORT_HEADERS);
  applyExistingBranchColors_(sheet, TRIP_REPORT_HEADERS);

  return sheet;
}

function getRequiredSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  return sheet;
}

function findHeaderIndex_(headers, expected) {
  var normalizedExpected = normalizeHeader_(expected);

  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === normalizedExpected) return i;
  }

  return -1;
}

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function getCell_(row, index) {
  return index === undefined || index === -1 ? '' : row[index];
}

function normalizeColor_(value) {
  return COLOR_MAP[String(value || '').trim().toLowerCase()] || COLOR_MAP[Number(value)] || '';
}

function normalizePositiveInt_(value) {
  var number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function toNumber_(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  var normalized = String(value || '').replace(',', '.');
  var number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_TIMEZONE, 'MM/dd');
  }

  return String(value);
}

function formatDateTime_(value) {
  var date = value;
  if (!date) return '';
  if (!(Object.prototype.toString.call(date) === '[object Date]') || isNaN(date.getTime())) {
    return String(value);
  }

  return Utilities.formatDate(date, APP_TIMEZONE, 'MM/dd/yyyy HH:mm:ss');
}

function getLoadingStatus_(piecesTotal, loadedPieces) {
  if (loadedPieces <= 0) return piecesTotal ? 'Not Started' : 'Requires Pieces';
  if (piecesTotal && loadedPieces >= piecesTotal) return 'Completed';
  return 'Started';
}

function buildLoadingStats_(orders) {
  var statsMap = {
    red: createLoadingStat_('red'),
    yellow: createLoadingStat_('yellow'),
    green: createLoadingStat_('green'),
    Total: createLoadingStat_('Total'),
  };

  orders.forEach(function(order) {
    var loaded = order.loadedPieces > 0;
    updateLoadingStat_(statsMap[order.color], order.weight, order.volume, loaded);
    updateLoadingStat_(statsMap.Total, order.weight, order.volume, loaded);
  });

  return [
    finalizeLoadingStat_(statsMap.red),
    finalizeLoadingStat_(statsMap.yellow),
    finalizeLoadingStat_(statsMap.green),
    finalizeLoadingStat_(statsMap.Total),
  ];
}

function createLoadingStat_(type) {
  return {
    type: type,
    initialWeight: 0,
    loadedWeight: 0,
    remainedWeight: 0,
    initialVolume: 0,
    loadedVolume: 0,
    remainedVolume: 0,
  };
}

function updateLoadingStat_(stat, weight, volume, loaded) {
  if (!stat) return;

  stat.initialWeight += weight;
  stat.initialVolume += volume;

  if (loaded) {
    stat.loadedWeight += weight;
    stat.loadedVolume += volume;
  }
}

function finalizeLoadingStat_(stat) {
  stat.initialWeight = round1_(stat.initialWeight);
  stat.loadedWeight = round1_(stat.loadedWeight);
  stat.remainedWeight = round1_(stat.initialWeight - stat.loadedWeight);
  stat.initialVolume = round1_(stat.initialVolume);
  stat.loadedVolume = round1_(stat.loadedVolume);
  stat.remainedVolume = round1_(stat.initialVolume - stat.loadedVolume);

  return stat;
}

function round1_(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function countSheetRows_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function publicConfig_(config) {
  return {
    key: config.key,
    label: config.label,
    branch: config.branch,
    mode: config.mode,
    departureWarehouse: config.departureWarehouse,
    destinationWarehouse: config.destinationWarehouse,
    route: config.route,
    storageNamespace: config.storageNamespace,
  };
}
