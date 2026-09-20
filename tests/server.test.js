const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3107;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-tv-shop-test-'));

let serverProcess;

function parseSetCookie(headers) {
  const setCookie = headers.get('set-cookie');
  return setCookie ? setCookie.split(';', 1)[0] : '';
}

async function request(pathname, options = {}, cookie = '') {
  const headers = new Headers(options.headers || {});
  if (cookie) {
    headers.set('Cookie', cookie);
  }
  const response = await fetch(`${BASE_URL}${pathname}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body, cookie: parseSetCookie(response.headers) };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Server did not start in time.');
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      BASE_URL,
      DATA_DIR,
      ADMIN_EMAIL: 'admin@test.local',
      ADMIN_PASSWORD: 'AdminPass123!',
      ADMIN_NAME: 'Admin Test'
    },
    stdio: 'ignore'
  });
  await waitForServer();
});

test.after(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('public bootstrap returns products and settings', async () => {
  const { response, body } = await request('/api/bootstrap/public');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.products));
  assert.ok(body.products.length > 0);
  assert.equal(body.settings.shopName, 'Sip of Ghoulaid Shop');
});

test('customer signup persists synced wishlist and cart', async () => {
  const signup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Ghoul',
      username: 'test-ghoul',
      email: 'test@example.com',
      password: 'Password123!',
      contactMethod: 'email',
      contactInfo: 'test@example.com'
    })
  });
  assert.equal(signup.response.status, 201);
  assert.equal(signup.body.user.email, 'test@example.com');
  assert.match(signup.body.verificationPreviewUrl, /verify-email/);

  const cookie = signup.cookie;
  const wishlistSave = await request('/api/account/wishlist', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: ['gift-boxes'] })
  }, cookie);
  assert.equal(wishlistSave.response.status, 200);

  const cartSave = await request('/api/account/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ productId: 'gift-boxes', variant: 'Mini Box', quantity: 2 }] })
  }, cookie);
  assert.equal(cartSave.response.status, 200);

  const accountBootstrap = await request('/api/bootstrap/account', {}, cookie);
  assert.equal(accountBootstrap.response.status, 200);
  assert.equal(accountBootstrap.body.user.username, 'test-ghoul');
  assert.deepEqual(accountBootstrap.body.wishlist.productIds, ['gift-boxes']);
  assert.equal(accountBootstrap.body.cart.items[0].quantity, 2);
});

test('admin can review orders and update payments', async () => {
  const guestOrder = await request('/api/orders/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Order Ghoul',
      username: 'order-ghoul',
      contactMethod: 'email',
      contactInfo: 'order@example.com',
      customizationLevel: 'minimal',
      description: 'A launch test order',
      paymentMethod: 'paypal'
    })
  });
  assert.equal(guestOrder.response.status, 201);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password: 'AdminPass123!' })
  });
  assert.equal(login.response.status, 200);
  const adminCookie = login.cookie;

  const bootstrap = await request('/api/bootstrap/admin', {}, adminCookie);
  assert.equal(bootstrap.response.status, 200);
  assert.ok(Array.isArray(bootstrap.body.orders));
  const orderId = bootstrap.body.orders[0].id;

  const paymentUpdate = await request(`/api/admin/payments/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentMethod: 'paypal',
      paymentStatus: 'Paid',
      paymentAmount: 42,
      paymentReference: 'TEST-ORDER-42'
    })
  }, adminCookie);
  assert.equal(paymentUpdate.response.status, 200);
  assert.equal(paymentUpdate.body.orders[0].paymentStatus, 'Paid');
  assert.equal(paymentUpdate.body.orders[0].paymentReference, 'TEST-ORDER-42');
  assert.ok(paymentUpdate.body.orders[0].paymentReceivedAt);

  const refreshedBootstrap = await request('/api/bootstrap/admin', {}, adminCookie);
  assert.equal(refreshedBootstrap.response.status, 200);
  const matchingEvent = refreshedBootstrap.body.paymentEvents.find(event => event.order_id === orderId && event.reference === 'TEST-ORDER-42');
  assert.ok(matchingEvent);
  assert.equal(matchingEvent.status, 'Paid');

  const clearedPaymentUpdate = await request(`/api/admin/payments/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentMethod: 'paypal',
      paymentStatus: 'Awaiting Payment',
      paymentAmount: 0,
      paymentReference: '',
      paymentNotes: ''
    })
  }, adminCookie);
  assert.equal(clearedPaymentUpdate.response.status, 200);
  assert.equal(clearedPaymentUpdate.body.orders[0].paymentAmount, 0);
  assert.equal(clearedPaymentUpdate.body.orders[0].paymentReference, '');
  assert.equal(clearedPaymentUpdate.body.orders[0].paymentNotes, '');
});

test('admin endpoints reject unauthenticated access', async () => {
  const bootstrap = await request('/api/bootstrap/admin');
  assert.equal(bootstrap.response.status, 401);

  const paymentUpdate = await request('/api/admin/payments/example-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentMethod: 'paypal',
      paymentStatus: 'Paid',
      paymentAmount: 10,
      paymentReference: 'DENIED'
    })
  });
  assert.equal(paymentUpdate.response.status, 401);
});
