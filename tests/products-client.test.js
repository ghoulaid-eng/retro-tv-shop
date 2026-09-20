const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function createResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    async json() { return body; }
  };
}

test('ShopData.updateOrderPayment emits normalized orders for admin subscribers', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'products.js'), 'utf8');
  const emissions = [];

  const sandbox = {
    console,
    FormData,
    Headers,
    fetch: async (url) => {
      if (String(url).startsWith('/api/admin/payments/')) {
        return createResponse({
          orders: [{
            id: 'order-1',
            fullName: 'Order Ghoul',
            username: 'order-ghoul',
            contactMethod: 'email',
            contactInfo: 'order@example.com',
            description: 'A test order',
            paymentMethod: 'paypal',
            paymentStatus: 'Paid',
            paymentAmount: 42,
            paymentReference: 'TEST-ORDER-42',
            paymentReceivedAt: '2026-09-20T00:00:00.000Z',
            status: 'Pending',
            createdAt: '2026-09-20T00:00:00.000Z',
            updatedAt: '2026-09-20T00:00:00.000Z'
          }]
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    },
    window: {
      crypto: {
        getRandomValues(values) {
          crypto.webcrypto.getRandomValues(values);
          return values;
        }
      }
    },
    performance: { now: () => 1 },
    CustomEvent: class CustomEvent {
      constructor(name, options) {
        this.name = name;
        this.detail = options?.detail;
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  sandbox.window.ShopData.subscribe('orders', orders => emissions.push(orders));
  const orders = await sandbox.window.ShopData.updateOrderPayment('order-1', {
    paymentMethod: 'paypal',
    paymentStatus: 'Paid',
    paymentAmount: 42,
    paymentReference: 'TEST-ORDER-42'
  });

  assert.equal(orders[0].paymentStatus, 'Paid');
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0][0].paymentReference, 'TEST-ORDER-42');
  assert.ok(emissions[0][0].paymentReceivedAt);
});
