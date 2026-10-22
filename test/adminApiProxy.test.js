import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler from '../api/admin.js';

const originalFetch = globalThis.fetch;
const originalGasUrl = process.env.VITE_ADMIN_GAS_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalGasUrl === undefined) {
    delete process.env.VITE_ADMIN_GAS_URL;
  } else {
    process.env.VITE_ADMIN_GAS_URL = originalGasUrl;
  }
});

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

test('proxies JSON to GAS and returns its response', async () => {
  process.env.VITE_ADMIN_GAS_URL = 'https://script.google.com/macros/s/example/exec';
  let upstreamRequest;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url, options };
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid credentials' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const req = {
    method: 'POST',
    body: { requestType: 'login', username: 'test-user', password: 'test-password' },
  };
  const res = createResponse();
  await handler(req, res);

  assert.equal(upstreamRequest.url.href, process.env.VITE_ADMIN_GAS_URL);
  assert.equal(upstreamRequest.options.method, 'POST');
  assert.equal(upstreamRequest.options.redirect, 'follow');
  assert.deepEqual(JSON.parse(upstreamRequest.options.body), req.body);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { status: 'error', message: 'Invalid credentials' });
});

test('rejects methods other than POST', async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
  };

  const res = createResponse();
  await handler({ method: 'GET' }, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
  assert.equal(fetchCalled, false);
});

test('reports missing GAS configuration without forwarding credentials', async () => {
  delete process.env.VITE_ADMIN_GAS_URL;

  const res = createResponse();
  await handler({ method: 'POST', body: { requestType: 'login' } }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), {
    status: 'error',
    message: 'Admin backend is not configured.',
  });
});
