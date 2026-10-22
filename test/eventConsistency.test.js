import assert from 'assert';
import fs from 'node:fs';
import path from 'node:path';
import adminHandler from '../api/admin.js';

async function request(payload) {
  const response = {
    statusCode: 200,
    setHeader() {},
    end(body) {
      this.body = body;
    },
  };
  await adminHandler({ method: 'POST', body: payload }, response);
  assert.strictEqual(response.statusCode, 200, `Admin API request failed with status ${response.statusCode}`);
  return JSON.parse(response.body);
}

if (!process.env.VITE_ADMIN_GAS_URL) {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const gasUrlLine = fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => /^\s*VITE_ADMIN_GAS_URL\s*=/.test(line));
    if (gasUrlLine) {
      process.env.VITE_ADMIN_GAS_URL = gasUrlLine
        .slice(gasUrlLine.indexOf('=') + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const eventParticipantsPath = path.resolve('src', 'components', 'EventParticipants.jsx');
const fileContent = fs.readFileSync(eventParticipantsPath, 'utf-8');
const scheduleMatch = fileContent.match(/const EVENT_SCHEDULE = \{([\s\S]*?)\};/);
assert(scheduleMatch, 'EVENT_SCHEDULE not found in EventParticipants.jsx');
const scheduleObjectString = scheduleMatch[1];
// Extract keys using regex
const frontendIds = [];
scheduleObjectString.replace(/'([^']+)'\s*:/g, (_, id) => { frontendIds.push(id); return ''; });

(async () => {
  console.log('=== Event ID Consistency Tests ===');
  // 1. Login to obtain session token (credentials from env)
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || !process.env.VITE_ADMIN_GAS_URL) {
    console.log('Skipping backend integration tests: set ADMIN_USERNAME, ADMIN_PASSWORD, and VITE_ADMIN_GAS_URL');
    return;
  }
  const loginRes = await request({ requestType: 'login', username, password });
  assert.strictEqual(loginRes.status, 'success', 'Login failed: ' + loginRes.message);
  const token = loginRes.sessionToken;

  // 2. Get listEventIds from backend
  const listRes = await request({ requestType: 'listEventIds', sessionToken: token });
  assert.strictEqual(listRes.status, 'success', 'listEventIds failed: ' + listRes.message);
  const { scheduleIds, registeredIds } = listRes.data;

  // 3. Verify that frontend and backend schedule IDs match exactly
  const backendIds = scheduleIds.sort();
  const frontendSorted = frontendIds.sort();
  assert.deepStrictEqual(backendIds, frontendSorted, 'Mismatch between backend and frontend schedule IDs');
  console.log('✔ Frontend and backend schedule IDs match');

  // 4. Verify that backend returns error for unknown event ID
  const invalidRes = await request({ requestType: 'getEventParticipants', sessionToken: token, eventId: 'unknown_event' });
  assert.strictEqual(invalidRes.status, 'error', 'Invalid event ID should return error');
  console.log('✔ Invalid event ID correctly rejected');

  // 5. Optionally, verify that registered IDs are a subset of schedule IDs
  const unknownRegistered = registeredIds.filter(id => !backendIds.includes(id));
  assert.strictEqual(unknownRegistered.length, 0, `Found registered IDs not in schedule: ${unknownRegistered.join(', ')}`);
  console.log('✔ All registered IDs are known schedule IDs');

  console.log('All consistency tests passed');
})();
