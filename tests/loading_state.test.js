const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'LoadingService.js'), 'utf8'), context);

const headerMap = {
  orderId: 0,
  colorCode: 1,
  loadedPieces: 2,
};

const orderWithStaleRowCount = context.buildOrder_(
  ['ORDER-1', 1, 1],
  2,
  headerMap,
  {},
  {}
);

assert.strictEqual(orderWithStaleRowCount.loadedPieces, 0);
assert.strictEqual(orderWithStaleRowCount.status, 'Requires Pieces');

const orderWithKeyedPieces = context.buildOrder_(
  ['ORDER-1', 1, 99],
  2,
  headerMap,
  {
    'ORDER-1': [
      { pieceNumber: 1, loaded: true },
      { pieceNumber: 2, loaded: true },
    ],
  },
  {}
);

assert.strictEqual(orderWithKeyedPieces.loadedPieces, 2);
assert.deepStrictEqual(Array.from(orderWithKeyedPieces.loadedPieceNumbers), [1, 2]);

const orderWithStableTotal = context.buildOrder_(
  ['ORDER-1', 1, 99],
  8,
  { orderId: 0, colorCode: 1, piecesTotal: 2 },
  {},
  {},
  { 'ORDER-1': 3 }
);

assert.strictEqual(orderWithStableTotal.piecesTotal, 3);
assert.strictEqual(orderWithStableTotal.piecesInput, 3);

const orderWithExplicitlyClearedTotal = context.buildOrder_(
  ['ORDER-1', 1, 99],
  12,
  { orderId: 0, colorCode: 1, piecesTotal: 2 },
  {},
  {},
  { 'ORDER-1': 0 }
);

assert.strictEqual(orderWithExplicitlyClearedTotal.piecesTotal, null);
assert.strictEqual(orderWithExplicitlyClearedTotal.piecesInput, '');

const legacyOrderWithoutStableState = context.buildOrder_(
  ['ORDER-1', 1, 4],
  14,
  { orderId: 0, colorCode: 1, piecesTotal: 2 },
  {},
  {},
  {}
);

assert.strictEqual(legacyOrderWithoutStableState.piecesTotal, 4);

let saved = null;
context.getOrderPiecesMap_ = () => ({
  OLD: [{ pieceNumber: 1, loaded: true }],
});
context.saveLoadedPieceUpdates_ = (config, updates, username) => {
  saved = { updates, username };
};

context.saveUnknownLoadedUpdates_(
  {},
  [
    { orderId: 'NEW', loadedPieces: 3 },
    { orderId: 'OLD', loadedPieces: 0 },
  ],
  'Admin'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(saved.updates)),
  [
    { orderId: 'NEW', pieceNumber: 1, loaded: true },
    { orderId: 'NEW', pieceNumber: 2, loaded: true },
    { orderId: 'NEW', pieceNumber: 3, loaded: true },
    { orderId: 'OLD', pieceNumber: 1, loaded: false },
  ]
);
assert.strictEqual(saved.username, 'Admin');

let savedStateRows = null;
let ensuredPieces = null;
const ordersSheet = { name: 'Orders_NY' };
const stateSheet = {
  getLastRow: () => 1,
  getRange: () => ({
    setValues: rows => {
      savedStateRows = rows;
    },
  }),
};

context.getRequiredSheet_ = sheetName => sheetName === 'Orders_NY' ? ordersSheet : stateSheet;
context.readOrders_ = sheet => {
  assert.strictEqual(sheet, ordersSheet);
  return {
    headerMap: { orderId: 0 },
    rows: [['ORDER-1'], ['ORDER-2']],
  };
};
context.formatDateTime_ = () => '09/24/2026 10:00:00';
context.ensurePiecesForOrder_ = (config, orderId, piecesTotal) => {
  ensuredPieces = { orderId, piecesTotal };
};

context.savePiecesTotalUpdates_(
  {
    branch: 'NY',
    sheets: {
      orders: 'Orders_NY',
      orderLoadingState: 'OrderLoadingState',
    },
  },
  [{ orderId: 'ORDER-1', row: 999, pieces: 3 }],
  'Admin'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(savedStateRows)),
  [['NY', 'ORDER-1', 3, '09/24/2026 10:00:00', 'Admin']]
);
assert.deepStrictEqual(ensuredPieces, { orderId: 'ORDER-1', piecesTotal: 3 });
assert.throws(
  () => context.savePiecesTotalUpdates_(
    {
      branch: 'NY',
      sheets: {
        orders: 'Orders_NY',
        orderLoadingState: 'OrderLoadingState',
      },
    },
    [{ orderId: 'REMOVED-ORDER', row: 2, pieces: 1 }],
    'Admin'
  ),
  /Order changed or no longer exists/
);

console.log('loading_state.test.js: all assertions passed');
