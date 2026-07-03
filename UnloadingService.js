const RECEIVING_HEADERS = [
  'ReceivingID',
  'ReceivedAt',
  'Branch',
  'Mode',
  'Route',
  'User',
  'Truck',
  'TripID',
  'OrderID',
  'Title',
  'ExpectedPieces',
  'ReceivedPieces',
  'MissingPieces',
  'ReceivedCountPieces',
  'MissingCountPieces',
  'Status',
  'ClosedAt',
];

const MISSING_HEADERS = [
  'MissingID',
  'DetectedAt',
  'Branch',
  'User',
  'TripID',
  'OrderID',
  'Title',
  'PieceNumber',
  'IssueType',
  'Note',
  'Status',
];

function getUnloadingTrips(contextKey) {
  var config = getUnloadingConfig_(contextKey);
  ensureUnloadingSupportSheets_(config);

  var sheet = getRequiredSheet_(config.sheets.tripReports);
  var lastRow = sheet.getLastRow();
  var map = {};
  var closedTrips = getClosedTripMap_(config);

  if (lastRow < 2) {
    return {
      context: publicConfig_(config),
      trips: [],
    };
  }

  var values = sheet.getRange(2, 1, lastRow - 1, TRIP_REPORT_HEADERS.length).getValues();

  values.forEach(function(row) {
    var tripId = String(row[0] || '');
    var route = String(row[3] || '');

    if (!tripId || route !== config.route) return;
    if (closedTrips[tripId]) return;

    if (!map[tripId]) {
      map[tripId] = {
        tripId: tripId,
        generatedAt: formatDateTime_(row[1]),
        sourceBranch: row[2] || '',
        route: route,
        truck: row[5] || '',
        orders: 0,
        expectedPieces: 0,
      };
    }

    map[tripId].orders += 1;
    map[tripId].expectedPieces += Math.max(0, toNumber_(row[13]));
  });

  return {
    context: publicConfig_(config),
    trips: Object.keys(map)
      .map(function(tripId) {
        return map[tripId];
      })
      .sort(function(a, b) {
        return String(b.tripId).localeCompare(String(a.tripId));
      }),
  };
}

function getUnloadingTrip(contextKey, tripId) {
  var config = getUnloadingConfig_(contextKey);
  ensureUnloadingSupportSheets_(config);

  var sheet = getRequiredSheet_(config.sheets.tripReports);
  var lastRow = sheet.getLastRow();
  var orders = [];
  var meta = null;

  if (lastRow < 2) {
    throw new Error('TripReports is empty.');
  }

  var values = sheet.getRange(2, 1, lastRow - 1, TRIP_REPORT_HEADERS.length).getValues();

  values.forEach(function(row) {
    if (String(row[0] || '') !== String(tripId)) return;
    if (String(row[3] || '') !== config.route) return;

    if (!meta) {
      meta = {
        tripId: String(row[0]),
        generatedAt: formatDateTime_(row[1]),
        sourceBranch: row[2] || '',
        route: row[3] || '',
        truck: row[5] || '',
      };
    }

    orders.push({
      orderId: String(row[6] || ''),
      title: row[7] || '',
      expectedPieces: Math.max(0, toNumber_(row[13])),
      expectedCountPieces: parsePieceList_(row[16]),
      receivedPieces: [],
    });
  });

  if (!meta) {
    throw new Error('Trip not found for this unloading workflow: ' + tripId);
  }

  return {
    context: publicConfig_(config),
    trip: meta,
    orders: orders,
  };
}

function closeUnloadingTrip(contextKey, payload) {
  var config = getUnloadingConfig_(contextKey);
  ensureUnloadingSupportSheets_(config);

  payload = payload || {};
  assertUserAccess_(payload.username || '', contextKey);

  if (!payload.tripId) {
    throw new Error('TripID is required.');
  }

  if (isTripAlreadyClosed_(config, payload.tripId)) {
    throw new Error('Trip is already closed: ' + payload.tripId);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    if (isTripAlreadyClosed_(config, payload.tripId)) {
      throw new Error('Trip is already closed: ' + payload.tripId);
    }

  var details = getUnloadingTrip(contextKey, payload.tripId);
  var orderState = payload.orders || {};
  var now = new Date();
  var receivedAt = formatDateTime_(now);
  var receivingId = config.tripPrefix + '-' + Utilities.formatDate(now, APP_TIMEZONE, 'yyMMdd-HHmm');
  var receivingRows = [];
  var missingRows = [];

  details.orders.forEach(function(order) {
    var state = orderState[order.orderId] || {};
    var receivedPieces = normalizePieceNumbers_(state.receivedPieces);
    var expectedCountPieces = order.expectedCountPieces && order.expectedCountPieces.length
      ? order.expectedCountPieces
      : buildPieceRange_(order.expectedPieces);
    var receivedMap = {};

    receivedPieces.forEach(function(pieceNumber) {
      receivedMap[pieceNumber] = true;
    });

    var missingPieces = expectedCountPieces.filter(function(pieceNumber) {
      return !receivedMap[pieceNumber];
    });
    var expectedPieces = order.expectedPieces;
    var status = missingPieces.length > 0
      ? 'Missing'
      : receivedPieces.length >= expectedPieces
        ? 'Received'
        : 'Partially received';

    receivingRows.push([
      receivingId,
      receivedAt,
      config.branch,
      config.mode,
      config.route,
      payload.username || '',
      payload.truck || details.trip.truck || '',
      payload.tripId,
      order.orderId,
      order.title,
      expectedPieces,
      receivedPieces.length,
      missingPieces.length,
      receivedPieces.join(','),
      missingPieces.join(','),
      status,
      receivedAt,
    ]);

    missingPieces.forEach(function(pieceNumber) {
      missingRows.push([
        receivingId + '-' + order.orderId + '-' + pieceNumber,
        receivedAt,
        config.branch,
        payload.username || '',
        payload.tripId,
        order.orderId,
        order.title,
        pieceNumber,
        'Missing',
        '',
        'Open',
      ]);
    });
  });

  appendRows_(config.sheets.receiving, RECEIVING_HEADERS, receivingRows);
  appendRows_(config.sheets.missing, MISSING_HEADERS, missingRows);

  return {
    success: true,
    receivingId: receivingId,
    tripId: payload.tripId,
    branch: config.branch,
    mode: config.mode,
    route: config.route,
    user: payload.username || '',
    truck: payload.truck || details.trip.truck || '',
    orders: receivingRows.length,
    missing: missingRows.length,
    closedAt: receivedAt,
  };
  } finally {
    lock.releaseLock();
  }
}

function getUnloadingConfig_(contextKey) {
  var config = getConfig_(contextKey);
  if (config.mode !== 'unloading') {
    throw new Error('Workflow is not an unloading workflow: ' + contextKey);
  }

  return config;
}

function ensureUnloadingSupportSheets_(config) {
  ensureSheetWithHeaders_(config.sheets.receiving, RECEIVING_HEADERS);
  ensureSheetWithHeaders_(config.sheets.missing, MISSING_HEADERS);
  ensureTripReportsSheet_(config.sheets.tripReports);
}

function isTripAlreadyClosed_(config, tripId) {
  return Boolean(getClosedTripMap_(config)[String(tripId)]);
}

function getClosedTripMap_(config) {
  var sheet = getRequiredSheet_(config.sheets.receiving);
  var lastRow = sheet.getLastRow();
  var map = {};

  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, RECEIVING_HEADERS.length).getValues();

  for (var i = 0; i < values.length; i++) {
    if (
      String(values[i][2]) === config.branch &&
      String(values[i][4]) === config.route &&
      String(values[i][7] || '')
    ) {
      map[String(values[i][7])] = true;
    }
  }

  return map;
}

function parsePieceList_(value) {
  return String(value || '')
    .split(',')
    .map(function(item) {
      return Number(String(item).trim());
    })
    .filter(function(item) {
      return Number.isInteger(item) && item > 0;
    });
}

function normalizePieceNumbers_(value) {
  if (!Array.isArray(value)) return [];

  var map = {};
  value.forEach(function(item) {
    var number = Number(item);
    if (Number.isInteger(number) && number > 0) {
      map[number] = true;
    }
  });

  return Object.keys(map)
    .map(function(item) {
      return Number(item);
    })
    .sort(function(a, b) {
      return a - b;
    });
}

function buildPieceRange_(total) {
  var pieces = [];
  var count = Math.max(0, Number(total) || 0);

  for (var i = 1; i <= count; i++) {
    pieces.push(i);
  }

  return pieces;
}
