#!/usr/bin/env node

import crypto from 'node:crypto';
import http from 'node:http';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3100);
const PROXY_PORT = Number(process.env.E2E_PROXY_PORT || 3999);
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;
const HEADLESS = process.env.E2E_HEADLESS !== 'false';
const WAIT_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 30000);
const REQUEST_TIMEOUT_MS = Number(process.env.E2E_REQUEST_TIMEOUT_MS || 10000);
const JWT_SECRET = process.env.REAL_JWT_SECRET || process.env.JWT_SECRET || 'mysawit-secret-key-change-in-production-2026';

const services = {
  identity: {
    target: process.env.REAL_IDENTITY_SERVICE_URL || process.env.IDENTITY_SERVICE_URL || 'http://127.0.0.1:8081',
    proxyPrefix: '/identity',
    healthPath: '/api/auth/health',
    env: 'IDENTITY_SERVICE_URL',
  },
  plantation: {
    target: process.env.REAL_PLANTATION_SERVICE_URL || process.env.PLANTATION_SERVICE_URL || 'http://127.0.0.1:8082',
    proxyPrefix: '/plantation',
    healthPath: '/actuator/health',
    env: 'PLANTATION_SERVICE_URL',
  },
  harvest: {
    target: process.env.REAL_HARVEST_SERVICE_URL || process.env.HARVEST_SERVICE_URL || 'http://127.0.0.1:8083',
    proxyPrefix: '/harvest',
    healthPath: '/actuator/health',
    env: 'HARVEST_SERVICE_URL',
  },
  shipment: {
    target: process.env.REAL_SHIPMENT_SERVICE_URL || process.env.SHIPMENT_SERVICE_URL || 'http://127.0.0.1:8084',
    proxyPrefix: '/shipment',
    healthPath: '/api/shipments/health',
    env: 'SHIPMENT_SERVICE_URL',
  },
  payroll: {
    target: process.env.REAL_PAYROLL_SERVICE_URL || process.env.PAYROLL_SERVICE_URL || 'http://127.0.0.1:8085',
    proxyPrefix: '/payroll',
    healthPath: '/actuator/health',
    env: 'PAYROLL_SERVICE_URL',
  },
};

const roleLabels = {
  BURUH: 'Pekerja Panen',
  MANDOR: 'Mandor',
  SUPIR: 'Supir',
};

const syntheticUsers = {
  ADMIN: {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'real-e2e-admin',
    email: 'real-e2e-admin@mysawit.test',
    role: 'ADMIN',
  },
  MANDOR: {
    id: '00000000-0000-4000-8000-000000000002',
    username: 'real-e2e-mandor',
    email: 'real-e2e-mandor@mysawit.test',
    role: 'MANDOR',
  },
  BURUH: {
    id: '00000000-0000-4000-8000-000000000003',
    username: 'real-e2e-buruh',
    email: 'real-e2e-buruh@mysawit.test',
    role: 'BURUH',
  },
  SUPIR: {
    id: '00000000-0000-4000-8000-000000000004',
    username: 'real-e2e-supir',
    email: 'real-e2e-supir@mysawit.test',
    role: 'SUPIR',
  },
};

const runId = process.env.E2E_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const password = process.env.REAL_E2E_PASSWORD || 'Password123!';
const createdIdentityUsers = [];
let adminAuth = null;

function log(message) {
  console.log(`[real-e2e] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function escapeXPath(value) {
  if (!value.includes("'")) return `'${value}'`;
  return `concat(${value.split("'").map((part) => `'${part}'`).join(', "\"\'\"", ')})`;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(userId, role) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    userId,
    role,
    iat: now,
    exp: now + 60 * 60,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(unsigned)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${unsigned}.${signature}`;
}

function syntheticAuth(role) {
  const user = syntheticUsers[role];
  return {
    ...user,
    token: signJwt(user.id, role),
    refreshToken: `synthetic-refresh-${role.toLowerCase()}`,
    googleLinked: false,
    hasPassword: true,
  };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkBackends() {
  log('checking real backend health endpoints');
  const failures = [];

  for (const [name, service] of Object.entries(services)) {
    const healthUrl = new URL(service.healthPath, ensureTrailingSlash(service.target)).toString();
    try {
      const response = await fetchWithTimeout(healthUrl);
      if (!response.ok) {
        failures.push(`${name} ${healthUrl} -> HTTP ${response.status}`);
        continue;
      }
      log(`${name} UP at ${healthUrl}`);
    } catch (error) {
      failures.push(`${name} ${healthUrl} -> ${error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error([
      'Real backend preflight failed. Start all Spring Boot services or set REAL_*_SERVICE_URL.',
      'This test intentionally fails instead of falling back to mocks.',
      ...failures.map((failure) => `- ${failure}`),
    ].join('\n'));
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function startRecordingProxy() {
  const calls = [];

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const incomingUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    const matched = Object.entries(services).find(([, service]) => (
      incomingUrl.pathname === service.proxyPrefix ||
      incomingUrl.pathname.startsWith(`${service.proxyPrefix}/`)
    ));

    if (!matched) {
      res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No service proxy matches ${incomingUrl.pathname}` }));
      return;
    }

    const [serviceName, service] = matched;
    const requestBody = await readRequestBody(req);
    const upstreamPath = incomingUrl.pathname.slice(service.proxyPrefix.length) || '/';
    const upstreamUrl = new URL(`${upstreamPath}${incomingUrl.search}`, ensureTrailingSlash(service.target)).toString();
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];

    const call = {
      service: serviceName,
      method: req.method,
      path: `${upstreamPath}${incomingUrl.search}`,
      status: null,
      requestBody: requestBody.toString('utf8'),
      responseBody: '',
      upstreamUrl,
    };

    try {
      const upstream = await fetchWithTimeout(upstreamUrl, {
        method: req.method,
        headers,
        body: requestBody.length > 0 ? requestBody : undefined,
      });
      const responseBody = await upstream.arrayBuffer();
      call.status = upstream.status;
      call.responseBody = Buffer.from(responseBody).toString('utf8');
      calls.push(call);

      res.writeHead(upstream.status, {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      });
      res.end(Buffer.from(responseBody));
    } catch (error) {
      call.status = 502;
      call.responseBody = JSON.stringify({ error: error.message });
      calls.push(call);
      res.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(call.responseBody);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PROXY_PORT, '127.0.0.1', () => {
      server.off('error', reject);
      log(`recording proxy listening at ${PROXY_URL}`);
      resolve({
        calls,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      });
    });
  });
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(url);
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError?.message || 'no response'}`);
}

async function startFrontend() {
  const proxyEnv = Object.fromEntries(
    Object.values(services).flatMap((service) => {
      const url = `${PROXY_URL}${service.proxyPrefix}`;
      return [
        [service.env, url],
        [`NEXT_PUBLIC_${service.env}`, url],
      ];
    }),
  );

  const child = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(FRONTEND_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...proxyEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout.on('data', (data) => process.stdout.write(`[next] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[next] ${data}`));

  log(`starting frontend at ${FRONTEND_URL}`);
  await waitForHttp(FRONTEND_URL, 'frontend');

  return {
    close: async () => {
      if (!child.killed) {
        child.kill();
        await delay(500);
      }
    },
  };
}

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

function markCalls(proxy) {
  return proxy.calls.length;
}

function pathMatches(actual, expected) {
  if (expected instanceof RegExp) return expected.test(actual);
  if (expected.includes('?')) return actual === expected;
  return actual.split('?')[0] === expected;
}

async function waitForCall(proxy, afterIndex, expected) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  const statuses = expected.statuses || (expected.status ? [expected.status] : null);

  while (Date.now() < deadline) {
    const match = proxy.calls.slice(afterIndex).find((call) => (
      call.service === expected.service &&
      call.method === expected.method &&
      pathMatches(call.path, expected.path) &&
      (!statuses || statuses.includes(call.status))
    ));

    if (match) return match;
    await delay(100);
  }

  const recent = proxy.calls.slice(Math.max(0, proxy.calls.length - 16))
    .map((call) => `${call.service.padEnd(10)} ${call.method.padEnd(6)} ${String(call.status).padEnd(3)} ${call.path}`)
    .join('\n');
  throw new Error(`Timed out waiting for ${expected.service} ${expected.method} ${expected.path}. Recent calls:\n${recent}`);
}

function responseJson(call) {
  try {
    return JSON.parse(call.responseBody);
  } catch {
    throw new Error(`Expected JSON response for ${call.service} ${call.method} ${call.path}: ${call.responseBody}`);
  }
}

async function findClickable(driver, xpath) {
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_TIMEOUT_MS);
  await driver.wait(until.elementIsEnabled(element), WAIT_TIMEOUT_MS);
  return element;
}

async function clickText(driver, text) {
  const element = await findClickable(driver, `//*[self::button or self::a][contains(normalize-space(.), ${escapeXPath(text)})]`);
  try {
    await element.click();
  } catch {
    await driver.executeScript('arguments[0].click();', element);
  }
}

async function fillByLabel(driver, label, value) {
  const lowerLabel = label.toLowerCase();
  const element = await findClickable(
    driver,
    `(//label[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapeXPath(lowerLabel)})]//*[self::input or self::textarea or self::select][1] | //label[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${escapeXPath(lowerLabel)})]/following::*[self::input or self::textarea or self::select][1])[1]`,
  );
  const tag = await element.getTagName();
  if (tag !== 'select') await element.clear();
  await element.sendKeys(value);
}

async function waitForText(driver, text) {
  const xpath = `//*[contains(normalize-space(.), ${escapeXPath(text)})]`;
  await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
}

async function setAuth(driver, auth) {
  await driver.get(FRONTEND_URL);
  await driver.executeScript(
    `localStorage.clear();
     localStorage.setItem('authToken', arguments[0].token);
     localStorage.setItem('refreshToken', arguments[0].refreshToken || 'real-e2e-refresh');
     localStorage.setItem('userId', String(arguments[0].id));
     localStorage.setItem('username', arguments[0].username);
     localStorage.setItem('userEmail', arguments[0].email);
     localStorage.setItem('userRole', arguments[0].role);
     localStorage.setItem('googleLinked', String(arguments[0].googleLinked ?? false));
     localStorage.setItem('hasPassword', String(arguments[0].hasPassword ?? true));`,
    auth,
  );
}

async function loginWithCredentials(driver, proxy, email, userPassword) {
  await driver.get(`${FRONTEND_URL}/login`);
  await fillByLabel(driver, 'Email', email);
  await fillByLabel(driver, 'Password', userPassword);

  const after = markCalls(proxy);
  await clickText(driver, 'Masuk');
  const loginCall = await waitForCall(proxy, after, {
    service: 'identity',
    method: 'POST',
    path: '/api/auth/login',
    statuses: [200],
  });

  return responseJson(loginCall);
}

async function registerAndLoginRole(driver, proxy, role) {
  const suffix = `${role.toLowerCase()}_${runId}`;
  const user = {
    username: `e2e_${suffix}`,
    email: `e2e_${suffix}@example.test`,
    password,
    role,
  };

  log(`registering ${role} through Identity UI`);
  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel(driver, 'Nama Pengguna', user.username);
  await fillByLabel(driver, 'Daftar Sebagai', roleLabels[role]);
  if (role === 'MANDOR') {
    await fillByLabel(driver, 'Nomor Sertifikasi', `CERT-${runId}`);
  }
  await fillByLabel(driver, 'Email', user.email);
  await fillByLabel(driver, 'Password', user.password);
  await fillByLabel(driver, 'Konfirmasi Password', user.password);

  let after = markCalls(proxy);
  await clickText(driver, 'Daftar');
  const registerCall = await waitForCall(proxy, after, {
    service: 'identity',
    method: 'POST',
    path: '/api/auth/register',
    statuses: [200, 201],
  });
  const registered = responseJson(registerCall);
  createdIdentityUsers.push(registered.id);
  await waitForText(driver, 'Masuk');

  log(`logging in ${role} through Identity UI`);
  const loggedIn = await loginWithCredentials(driver, proxy, user.email, user.password);
  assert(loggedIn.token, `${role} login response did not include token`);
  assert(loggedIn.role === role, `${role} login returned role ${loggedIn.role}`);

  return loggedIn;
}

async function resolveAdminAuth(driver, proxy) {
  if (process.env.REAL_ADMIN_EMAIL && process.env.REAL_ADMIN_PASSWORD) {
    log('logging in real admin from REAL_ADMIN_EMAIL/REAL_ADMIN_PASSWORD');
    const loggedIn = await loginWithCredentials(
      driver,
      proxy,
      process.env.REAL_ADMIN_EMAIL,
      process.env.REAL_ADMIN_PASSWORD,
    );
    assert(loggedIn.role === 'ADMIN', `REAL_ADMIN_EMAIL logged in as ${loggedIn.role}, not ADMIN`);
    return loggedIn;
  }

  log('using signed ADMIN JWT for admin pages; set REAL_ADMIN_EMAIL/REAL_ADMIN_PASSWORD to test real admin login too');
  return syntheticAuth('ADMIN');
}

async function openWithAuth(driver, proxy, auth, path, expectedText, expectedCalls) {
  await setAuth(driver, auth);
  const after = markCalls(proxy);
  await driver.get(`${FRONTEND_URL}${path}`);
  if (expectedText) await waitForText(driver, expectedText);

  for (const expected of expectedCalls) {
    await waitForCall(proxy, after, expected);
  }
}

async function runReadOnlyServiceCoverage(driver, proxy, auths) {
  log('covering worker pages against real harvest, payroll, and shipment services');
  await openWithAuth(driver, proxy, auths.BURUH, '/harvest', 'Catatan Panen Saya', [
    { service: 'harvest', method: 'GET', path: '/harvests/my', statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, auths.BURUH, '/payroll', 'Slip Gaji Saya', [
    { service: 'payroll', method: 'GET', path: /^\/api\/payrolls\?userId=/, statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, auths.SUPIR, '/shipment/active', 'Pengiriman Aktif', [
    { service: 'shipment', method: 'GET', path: /^\/api\/shipments\?supirUserId=/, statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, auths.SUPIR, '/shipment/history', 'Riwayat Pengiriman', [
    { service: 'shipment', method: 'GET', path: /^\/api\/shipments\?supirUserId=/, statuses: [200] },
  ]);

  log('covering mandor pages against real plantation, harvest, shipment, payroll, and identity services');
  await openWithAuth(driver, proxy, auths.MANDOR, '/mandor/plantations', 'Kebun Saya', [
    { service: 'plantation', method: 'GET', path: /^\/api\/plantations\/owner\//, statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, auths.MANDOR, '/mandor/harvest', 'Persetujuan Panen', [
    { service: 'harvest', method: 'GET', path: '/harvests', statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, auths.MANDOR, '/mandor/shipment', 'Pengiriman Panen', [
    { service: 'shipment', method: 'GET', path: '/api/shipments', statuses: [200] },
  ]);
  let after = markCalls(proxy);
  await clickText(driver, '+ Buat Pengiriman');
  await waitForText(driver, 'Tugaskan Pengiriman Baru');
  await waitForCall(proxy, after, {
    service: 'shipment',
    method: 'GET',
    path: '/api/shipments/available-supirs',
    statuses: [200],
  });
  await waitForCall(proxy, after, {
    service: 'harvest',
    method: 'GET',
    path: '/harvests?status=APPROVED',
    statuses: [200],
  });
  await openWithAuth(driver, proxy, auths.MANDOR, '/mandor/payroll', 'Validasi Gaji', [
    { service: 'payroll', method: 'GET', path: '/api/payrolls', statuses: [200] },
    { service: 'identity', method: 'GET', path: '/api/admin/users', statuses: [200] },
  ]);

  log('covering admin pages against real identity, plantation, shipment, and payroll services');
  await openWithAuth(driver, proxy, adminAuth, '/admin/users', 'Name', [
    { service: 'identity', method: 'GET', path: '/api/admin/users', statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, adminAuth, '/admin/plantations', 'Manajemen Kebun', [
    { service: 'plantation', method: 'GET', path: '/api/plantations', statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, adminAuth, '/admin/shipments', 'Pusat Persetujuan Admin', [
    { service: 'shipment', method: 'GET', path: '/api/shipments?status=MANDOR_APPROVED', statuses: [200] },
  ]);
  await openWithAuth(driver, proxy, adminAuth, '/admin/payroll', 'Gaji dan Pembayaran', [
    { service: 'payroll', method: 'GET', path: '/api/payrolls', statuses: [200] },
    { service: 'identity', method: 'GET', path: '/api/admin/users', statuses: [200] },
    { service: 'payroll', method: 'GET', path: '/api/admin/wage-configs', statuses: [200] },
  ]);

  after = markCalls(proxy);
  await driver.get(`${FRONTEND_URL}/admin/dashboard`);
  await waitForText(driver, 'Catatan Panen');
  await waitForCall(proxy, after, { service: 'identity', method: 'GET', path: '/api/admin/users', statuses: [200] });
  await waitForCall(proxy, after, { service: 'plantation', method: 'GET', path: '/api/plantations', statuses: [200] });
  await waitForCall(proxy, after, { service: 'harvest', method: 'GET', path: '/harvests', statuses: [200] });
  await waitForCall(proxy, after, { service: 'shipment', method: 'GET', path: '/api/shipments', statuses: [200] });
}

async function cleanupCreatedUsers() {
  if (!adminAuth || createdIdentityUsers.length === 0) return;
  log('cleaning up Identity users created by real E2E');

  for (const id of [...createdIdentityUsers].reverse()) {
    try {
      const response = await fetchWithTimeout(
        new URL(`/api/admin/users/${id}`, ensureTrailingSlash(services.identity.target)).toString(),
        { method: 'DELETE', headers: { Authorization: `Bearer ${adminAuth.token}` } },
      );
      if (!response.ok && response.status !== 404) {
        log(`cleanup warning: identity delete ${id} -> HTTP ${response.status}`);
      }
    } catch (error) {
      log(`cleanup warning: identity delete ${id} -> ${error.message}`);
    }
  }
}

function printRouteSummary(proxy) {
  const relevant = proxy.calls.filter((call) => call.method !== 'OPTIONS');
  log(`recorded ${relevant.length} real backend calls:`);
  for (const call of relevant) {
    console.log(`  ${call.service.padEnd(10)} ${call.method.padEnd(6)} ${String(call.status).padEnd(3)} ${call.path}`);
  }
}

async function run() {
  let proxy = null;
  let frontend = null;
  let driver = null;

  try {
    await checkBackends();
    proxy = await startRecordingProxy();
    frontend = await startFrontend();
    driver = await buildDriver();

    const auths = {
      BURUH: await registerAndLoginRole(driver, proxy, 'BURUH'),
      MANDOR: await registerAndLoginRole(driver, proxy, 'MANDOR'),
      SUPIR: await registerAndLoginRole(driver, proxy, 'SUPIR'),
    };
    adminAuth = await resolveAdminAuth(driver, proxy);

    await runReadOnlyServiceCoverage(driver, proxy, auths);
    printRouteSummary(proxy);
    log('real frontend/backend Selenium integration passed');
  } finally {
    if (driver) await driver.quit().catch(() => {});
    await cleanupCreatedUsers().catch((error) => log(`cleanup failed: ${error.message}`));
    if (frontend) await frontend.close();
    if (proxy) await proxy.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
