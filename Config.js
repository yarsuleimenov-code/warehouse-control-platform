const SPREADSHEET_ID = '13gYc73705Q-HVUQxDWwLKdGU4ij6i0OUbdBiKoJnWuQ';
const APP_TIMEZONE = 'America/New_York';
const APP_VERSION = 'stage4-warehouse-directions-2026-07-15';

const SHEETS = {
  users: 'Users',
};

const TRUCKS = [
  'Truck 1 (26 ft)',
  'Truck 2 (16 ft)',
  'Extra 26 ft',
];

const APP_CONFIGS = {
  NY_LOADING: {
    key: 'NY_LOADING',
    label: 'NY Loading',
    branch: 'NY',
    mode: 'loading',
    departureWarehouse: 'NY',
    destinationWarehouse: 'CA',
    route: 'NY to CA',
    tripPrefix: 'NY-L',
    storageNamespace: 'warehouse-control:v1:ny:loading',
    sheets: {
      orders: 'Orders_NY',
      orderPieces: 'OrderPieces_NY',
      tripReports: 'TripReports',
    },
    trucks: TRUCKS,
  },

  CA_LOADING: {
    key: 'CA_LOADING',
    label: 'CA Loading',
    branch: 'CA',
    mode: 'loading',
    departureWarehouse: 'CA',
    destinationWarehouse: 'NY',
    route: 'CA to NY',
    tripPrefix: 'CA-L',
    storageNamespace: 'warehouse-control:v1:ca:loading',
    sheets: {
      orders: 'Orders_CA',
      orderPieces: 'OrderPieces_CA',
      tripReports: 'TripReports',
    },
    trucks: TRUCKS,
  },

  NY_UNLOADING: {
    key: 'NY_UNLOADING',
    label: 'NY Unloading',
    branch: 'NY',
    mode: 'unloading',
    departureWarehouse: 'CA',
    destinationWarehouse: 'NY',
    route: 'CA to NY',
    tripPrefix: 'NY-U',
    storageNamespace: 'warehouse-control:v1:ny:unloading',
    sheets: {
      tripReports: 'TripReports',
      receiving: 'Receiving',
      missing: 'Missing',
    },
    trucks: TRUCKS,
  },

  CA_UNLOADING: {
    key: 'CA_UNLOADING',
    label: 'CA Unloading',
    branch: 'CA',
    mode: 'unloading',
    departureWarehouse: 'NY',
    destinationWarehouse: 'CA',
    route: 'NY to CA',
    tripPrefix: 'CA-U',
    storageNamespace: 'warehouse-control:v1:ca:unloading',
    sheets: {
      tripReports: 'TripReports',
      receiving: 'Receiving',
      missing: 'Missing',
    },
    trucks: TRUCKS,
  },
};

function getPublicConfigs_() {
  return Object.keys(APP_CONFIGS).map(function(key) {
    var config = APP_CONFIGS[key];

    return {
      key: config.key,
      label: config.label,
      branch: config.branch,
      mode: config.mode,
      departureWarehouse: config.departureWarehouse,
      destinationWarehouse: config.destinationWarehouse,
      route: config.route,
      tripPrefix: config.tripPrefix,
      storageNamespace: config.storageNamespace,
      trucks: config.trucks,
    };
  });
}

function getConfig_(contextKey) {
  var config = APP_CONFIGS[contextKey];
  if (!config) {
    throw new Error('Unknown workflow: ' + contextKey);
  }

  return config;
}
