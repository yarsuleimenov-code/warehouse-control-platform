const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const context = { console: { log: console.log, error() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'LoadingService.js'), 'utf8'), context);

context.InterstateBol = {
  enqueueInterstateBolTrip(tripId, route) {
    return { ok: true, queued: true, tripId, route, status: 'PENDING' };
  }
};

const queued = context.notifyInterstateBol_('NY-L-260812-1203', 'NY to CA');
assert.strictEqual(queued.ok, true);
assert.strictEqual(queued.queued, true);
assert.strictEqual(queued.status, 'PENDING');

context.InterstateBol.enqueueInterstateBolTrip = () => {
  throw new Error('temporary library failure');
};

const failed = context.notifyInterstateBol_('NY-L-260812-1204', 'NY to CA');
assert.strictEqual(failed.ok, false);
assert.strictEqual(failed.queued, false);
assert.strictEqual(failed.status, 'NOTIFICATION_FAILED');
assert.match(failed.error, /temporary library failure/);

console.log('bol_notification.test.js: all assertions passed');
