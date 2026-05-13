#!/usr/bin/env node

import http from 'node:http';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3100);
const PROXY_PORT = Number(process.env.E2E_PROXY_PORT || 3999);
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || `http://127.0.0.1:${FRONTEND_PORT}`;
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;
const HEADLESS = process.env.E2E_HEADLESS !== 'false';
const KEEP_FRONTEND = Boolean(process.env.E2E_FRONTEND_URL);
const REQUEST_TIMEOUT_MS = Number(process.env.E2E_REQUEST_TIMEOUT_MS || 10000);
const WAIT_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 20000);

const services = {
  identity: {
    env: 'NEXT_PUBLIC_IDENTITY_SERVICE_URL',
    target: process.env.REAL_IDENTITY_SERVICE_URL || process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || 'http://localhost:8081',
    proxyPrefix: '/identity',
    healthPath: '/api/auth/health',
  },
  plantation: {
    env: 'NEXT_PUBLIC_PLANTATION_SERVICE_URL',
    target: process.env.REAL_PLANTATION_SERVICE_URL || process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL || 'http://localhost:8082',
    proxyPrefix: '/plantation',
    healthPath: '/api/plantations/health',
  },
  harvest: {
    env: 'NEXT_PUBLIC_HARVEST_SERVICE_URL',
    target: process.env.REAL_HARVEST_SERVICE_URL || process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL || 'http://localhost:8083',
    proxyPrefix: '/harvest',
    healthPath: '/api/harvests/health',
  },
  shipment: {
    env: 'NEXT_PUBLIC_SHIPMENT_SERVICE_URL',
    target: process.env.REAL_SHIPMENT_SERVICE_URL || process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL || 'http://localhost:8084',
    proxyPrefix: '/shipment',
    healthPath: '/api/shipments/health',
  },
  payroll: {
    env: 'NEXT_PUBLIC_PAYROLL_SERVICE_URL',
    target: process.env.REAL_PAYROLL_SERVICE_URL || process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL || 'http://localhost:8085',
    proxyPrefix: '/payroll',
    healthPath: '/actuator/health',
  },
};

const created = {
  plantationIds: [],
  harvestIds: [],
  shipmentIds: [],
  employeeIds: [],
  payrollIds: [],
};

const runId = process.env.E2E_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const testUser = {
  username: `e2e_${runId}`,
  email: `e2e_${runId}@example.test`,
  password: 'Password123!',
};

function log(message) {
  console.log(`[e2e] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeXPath(value) {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  const parts = value.split("'").map((part) => `'${part}'`);
  return `concat(${parts.join(', "\"\'\"", ')})`;
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

async function serviceFetch(serviceName, path, init = {}) {
  const service = services[serviceName];
  const url = new URL(path, ensureTrailingSlash(service.target)).toString();
  return fetchWithTimeout(url, init);
}

async function serviceJson(serviceName, path, init = {}) {
  const response = await serviceFetch(serviceName, path, init);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(`${serviceName} ${path} returned ${response.status}: ${text}`);
  }

  return body;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
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
    throw new Error(
      [
        'Backend preflight failed. Start the real services or set REAL_*_SERVICE_URL env vars.',
        ...failures.map((failure) => `- ${failure}`),
      ].join('\n'),
    );
  }
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
      requestBody,
      status: null,
      responseBody: '',
      upstreamUrl,
    };

    try {
      const upstream = await fetchWithTimeout(upstreamUrl, {
        method: req.method,
        headers,
        body: requestBody.length > 0 ? requestBody : undefined,
      });

      const responseBody = await upstream.text();
      const responseHeaders = {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      };

      call.status = upstream.status;
      call.responseBody = responseBody;
      calls.push(call);

      res.writeHead(upstream.status, responseHeaders);
      res.end(responseBody);
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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function startFrontend() {
  if (KEEP_FRONTEND) {
    log(`using existing frontend at ${FRONTEND_URL}`);
    await waitForHttp(FRONTEND_URL, 'frontend');
    return { close: async () => {} };
  }

  const env = {
    ...process.env,
    NEXT_PUBLIC_IDENTITY_SERVICE_URL: `${PROXY_URL}${services.identity.proxyPrefix}`,
    NEXT_PUBLIC_PLANTATION_SERVICE_URL: `${PROXY_URL}${services.plantation.proxyPrefix}`,
    NEXT_PUBLIC_HARVEST_SERVICE_URL: `${PROXY_URL}${services.harvest.proxyPrefix}`,
    NEXT_PUBLIC_SHIPMENT_SERVICE_URL: `${PROXY_URL}${services.shipment.proxyPrefix}`,
    NEXT_PUBLIC_PAYROLL_SERVICE_URL: `${PROXY_URL}${services.payroll.proxyPrefix}`,
  };

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCommand, ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(FRONTEND_PORT)], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
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

async function waitForHttp(url, label) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(url);
      if (response.status < 500) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError?.message || 'no response'}`);
}

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');

  if (HEADLESS) {
    options.addArguments('--headless=new');
  }

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

function markCalls(proxy) {
  return proxy.calls.length;
}

async function waitForCall(proxy, afterIndex, expected) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const match = proxy.calls.slice(afterIndex).find((call) => (
      call.service === expected.service &&
      call.method === expected.method &&
      pathMatches(call.path, expected.path) &&
      (expected.status === undefined || call.status === expected.status)
    ));

    if (match) {
      return match;
    }

    await delay(100);
  }

  const recent = proxy.calls.slice(Math.max(0, proxy.calls.length - 12))
    .map((call) => `${call.service} ${call.method} ${call.path} -> ${call.status}`)
    .join('\n');

  throw new Error(`Timed out waiting for ${expected.service} ${expected.method} ${expected.path}. Recent calls:\n${recent}`);
}

function pathMatches(actual, expected) {
  if (expected instanceof RegExp) {
    return expected.test(actual);
  }

  if (expected.includes('?')) {
    return actual === expected;
  }

  return actual.split('?')[0] === expected;
}

function responseJson(call) {
  try {
    return JSON.parse(call.responseBody);
  } catch {
    throw new Error(`Expected JSON response for ${call.service} ${call.method} ${call.path}: ${call.responseBody}`);
  }
}

async function clickText(driver, text) {
  const xpath = `//*[self::button or self::a][contains(normalize-space(.), ${escapeXPath(text)})]`;
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_TIMEOUT_MS);
  await driver.wait(until.elementIsEnabled(element), WAIT_TIMEOUT_MS);
  await element.click();
}

async function clickButtonInside(driver, containerText, buttonText) {
  const xpath = [
    `//*[contains(normalize-space(.), ${escapeXPath(containerText)})]`,
    `/ancestor::div[.//button[contains(normalize-space(.), ${escapeXPath(buttonText)})]][1]`,
    `//button[contains(normalize-space(.), ${escapeXPath(buttonText)})]`,
  ].join('');
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_TIMEOUT_MS);
  await driver.wait(until.elementIsEnabled(element), WAIT_TIMEOUT_MS);
  await element.click();
}

async function fillByLabel(driver, label, value) {
  const xpath = `//label[normalize-space(.)=${escapeXPath(label)}]/following::*[self::input or self::textarea or self::select][1]`;
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_TIMEOUT_MS);

  const tagName = await element.getTagName();
  if (tagName === 'select') {
    await element.sendKeys(value);
    return;
  }

  await element.clear();
  await element.sendKeys(value);
}

async function waitForPageText(driver, text) {
  const xpath = `//*[contains(normalize-space(.), ${escapeXPath(text)})]`;
  await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
}

async function registerAndLogin(driver, proxy) {
  log('registering and logging in through the UI');

  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel(driver, 'Username', testUser.username);
  await fillByLabel(driver, 'Email', testUser.email);
  await fillByLabel(driver, 'Password', testUser.password);
  await fillByLabel(driver, 'Confirm Password', testUser.password);

  let after = markCalls(proxy);
  await clickText(driver, 'Register');
  const registerCall = await waitForCall(proxy, after, {
    service: 'identity',
    method: 'POST',
    path: '/api/auth/register',
    status: 200,
  });

  const registeredUser = responseJson(registerCall);
  assert(registeredUser.token, 'register response did not include an auth token');
  await driver.wait(until.urlContains('/dashboard'), WAIT_TIMEOUT_MS);

  await driver.executeScript('localStorage.clear();');
  await driver.get(`${FRONTEND_URL}/login`);
  await fillByLabel(driver, 'Username', testUser.username);
  await fillByLabel(driver, 'Password', testUser.password);

  after = markCalls(proxy);
  await clickText(driver, 'Login');
  const loginCall = await waitForCall(proxy, after, {
    service: 'identity',
    method: 'POST',
    path: '/api/auth/login',
    status: 200,
  });

  const loggedInUser = responseJson(loginCall);
  assert(loggedInUser.token, 'login response did not include an auth token');
  await driver.wait(until.urlContains('/dashboard'), WAIT_TIMEOUT_MS);

  return loggedInUser;
}

async function createPlantation(driver, proxy) {
  const name = `E2E Plantation ${runId}`;

  log('creating plantation through the UI');
  await driver.get(`${FRONTEND_URL}/dashboard/plantations`);
  await waitForCall(proxy, markCalls(proxy), {
    service: 'plantation',
    method: 'GET',
    path: '/api/plantations',
    status: 200,
  }).catch(() => {});

  await waitForPageText(driver, 'Plantations Management');
  await clickText(driver, 'Add Plantation');
  await fillByLabel(driver, 'Plantation Name', name);
  await fillByLabel(driver, 'Location', `E2E Location ${runId}`);
  await fillByLabel(driver, 'Area (hectares)', '12.5');
  await fillByLabel(driver, 'Description', `E2E plantation created ${runId}`);

  const after = markCalls(proxy);
  await clickText(driver, 'Create Plantation');
  const createCall = await waitForCall(proxy, after, {
    service: 'plantation',
    method: 'POST',
    path: '/api/plantations',
    status: 201,
  });

  const plantation = responseJson(createCall);
  created.plantationIds.push(plantation.id);
  await waitForPageText(driver, name);

  const persisted = await serviceJson('plantation', `/api/plantations/${plantation.id}`);
  assert(persisted.name === name, 'created plantation was not readable from the real backend');
  log(`plantation created and persisted with id ${plantation.id}`);

  return plantation;
}

async function createHarvest(driver, proxy, plantation) {
  log('creating harvest through the UI');
  await driver.get(`${FRONTEND_URL}/dashboard/harvests`);
  await waitForPageText(driver, 'Harvests Management');
  await clickText(driver, 'Add Harvest');
  await fillByLabel(driver, 'Plantation ID', String(plantation.id));
  await fillByLabel(driver, 'Harvest Date', '2026-05-05');
  await fillByLabel(driver, 'Weight (kg)', '88.75');
  await fillByLabel(driver, 'Quality', 'PREMIUM');
  await fillByLabel(driver, 'Notes (optional)', `E2E harvest ${runId}`);

  const after = markCalls(proxy);
  await clickText(driver, 'Create Harvest');
  const createCall = await waitForCall(proxy, after, {
    service: 'harvest',
    method: 'POST',
    path: '/api/harvests',
    status: 201,
  });

  const harvest = responseJson(createCall);
  created.harvestIds.push(harvest.id);
  await waitForPageText(driver, `Harvest #${harvest.id}`);

  const persisted = await serviceJson('harvest', `/api/harvests/${harvest.id}`);
  assert(persisted.plantationId === plantation.id, 'created harvest was not readable from the real backend');
  log(`harvest created and persisted with id ${harvest.id}`);

  return harvest;
}

async function createShipment(driver, proxy, harvest) {
  log('creating shipment through the UI');
  await driver.get(`${FRONTEND_URL}/dashboard/shipments`);
  await waitForPageText(driver, 'Shipments Management');
  await clickText(driver, 'Add Shipment');
  await fillByLabel(driver, 'Harvest ID', String(harvest.id));
  await fillByLabel(driver, 'Destination', `E2E Destination ${runId}`);
  await fillByLabel(driver, 'Weight (kg)', '44.5');
  await fillByLabel(driver, 'Status', 'PENDING');
  await fillByLabel(driver, 'Shipper Name (optional)', `E2E Shipper ${runId}`);
  await fillByLabel(driver, 'Vehicle Number (optional)', `E2E-${runId.slice(-6)}`);
  await fillByLabel(driver, 'Shipment Date (optional)', '2026-05-05');
  await fillByLabel(driver, 'Notes (optional)', `E2E shipment ${runId}`);

  const after = markCalls(proxy);
  await clickText(driver, 'Create Shipment');
  const createCall = await waitForCall(proxy, after, {
    service: 'shipment',
    method: 'POST',
    path: '/api/shipments',
    status: 201,
  });

  const shipment = responseJson(createCall);
  created.shipmentIds.push(shipment.id);
  await waitForPageText(driver, `Shipment #${shipment.id}`);

  const persisted = await serviceJson('shipment', `/api/shipments/${shipment.id}`);
  assert(persisted.harvestId === harvest.id, 'created shipment was not readable from the real backend');
  log(`shipment created and persisted with id ${shipment.id}`);

  return shipment;
}

async function createEmployeeAndPayroll(driver, proxy, plantation) {
  const employeeName = `E2E Employee ${runId}`;
  const employeeCode = `E2E${runId.slice(-10)}`;

  log('creating employee through the UI');
  await driver.get(`${FRONTEND_URL}/dashboard/payroll`);
  await waitForPageText(driver, 'Payroll Management');
  await clickText(driver, 'Add Employee');
  await fillByLabel(driver, 'Full Name', employeeName);
  await fillByLabel(driver, 'Employee Code', employeeCode);
  await fillByLabel(driver, 'Position', 'HARVESTER');
  await fillByLabel(driver, 'Base Salary (IDR)', '2500000');
  await fillByLabel(driver, 'Plantation ID (optional)', String(plantation.id));
  await fillByLabel(driver, 'Phone Number (optional)', '081234567890');
  await fillByLabel(driver, 'Address (optional)', `E2E address ${runId}`);

  let after = markCalls(proxy);
  await clickText(driver, 'Create Employee');
  const employeeCall = await waitForCall(proxy, after, {
    service: 'payroll',
    method: 'POST',
    path: '/api/employees',
    status: 201,
  });

  const employee = responseJson(employeeCall);
  created.employeeIds.push(employee.id);
  await waitForPageText(driver, employeeName);

  const persistedEmployee = await serviceJson('payroll', `/api/employees/${employee.id}`);
  assert(persistedEmployee.employeeCode === employeeCode, 'created employee was not readable from the real backend');
  log(`employee created and persisted with id ${employee.id}`);

  log('creating payroll through the UI');
  await clickText(driver, 'Payrolls');
  await clickText(driver, 'Add Payroll');
  await fillByLabel(driver, 'Employee ID', String(employee.id));
  await fillByLabel(driver, 'Base Amount (IDR)', '2500000');
  await fillByLabel(driver, 'Period Start', '2026-05-01');
  await fillByLabel(driver, 'Period End', '2026-05-31');
  await fillByLabel(driver, 'Bonus Amount (IDR)', '100000');
  await fillByLabel(driver, 'Deduction Amount (IDR)', '25000');
  await fillByLabel(driver, 'Payment Method', 'BANK_TRANSFER');
  await fillByLabel(driver, 'Notes (optional)', `E2E payroll ${runId}`);

  after = markCalls(proxy);
  await clickText(driver, 'Create Payroll');
  const payrollCall = await waitForCall(proxy, after, {
    service: 'payroll',
    method: 'POST',
    path: '/api/payrolls',
    status: 201,
  });

  const payroll = responseJson(payrollCall);
  created.payrollIds.push(payroll.id);
  await waitForPageText(driver, `Payroll #${payroll.id}`);

  let persistedPayroll = await serviceJson('payroll', `/api/payrolls/${payroll.id}`);
  assert(persistedPayroll.employeeId === employee.id, 'created payroll was not readable from the real backend');
  log(`payroll created and persisted with id ${payroll.id}`);

  after = markCalls(proxy);
  await clickButtonInside(driver, `Payroll #${payroll.id}`, 'Approve');
  await waitForCall(proxy, after, {
    service: 'payroll',
    method: 'PATCH',
    path: `/api/payrolls/${payroll.id}/approve`,
    status: 200,
  });

  persistedPayroll = await serviceJson('payroll', `/api/payrolls/${payroll.id}`);
  assert(persistedPayroll.status === 'APPROVED', 'payroll approve action did not persist APPROVED status');
  await waitForPageText(driver, 'APPROVED');
  log(`payroll ${payroll.id} approved through the UI`);

  after = markCalls(proxy);
  await clickButtonInside(driver, `Payroll #${payroll.id}`, 'Mark as Paid');
  await waitForCall(proxy, after, {
    service: 'payroll',
    method: 'PATCH',
    path: `/api/payrolls/${payroll.id}/pay`,
    status: 200,
  });

  persistedPayroll = await serviceJson('payroll', `/api/payrolls/${payroll.id}`);
  assert(persistedPayroll.status === 'PAID', 'payroll pay action did not persist PAID status');
  await waitForPageText(driver, 'PAID');
  log(`payroll ${payroll.id} paid through the UI`);

  return { employee, payroll };
}

async function cleanup() {
  log('cleaning up created records');

  for (const id of [...created.payrollIds].reverse()) {
    await ignoreCleanupError(() => serviceFetch('payroll', `/api/payrolls/${id}`, { method: 'DELETE' }));
  }

  for (const id of [...created.employeeIds].reverse()) {
    await ignoreCleanupError(() => serviceFetch('payroll', `/api/employees/${id}`, { method: 'DELETE' }));
  }

  for (const id of [...created.shipmentIds].reverse()) {
    await ignoreCleanupError(() => serviceFetch('shipment', `/api/shipments/${id}`, { method: 'DELETE' }));
  }

  for (const id of [...created.harvestIds].reverse()) {
    await ignoreCleanupError(() => serviceFetch('harvest', `/api/harvests/${id}`, { method: 'DELETE' }));
  }

  for (const id of [...created.plantationIds].reverse()) {
    await ignoreCleanupError(() => serviceFetch('plantation', `/api/plantations/${id}`, { method: 'DELETE' }));
  }
}

async function ignoreCleanupError(action) {
  try {
    await action();
  } catch (error) {
    log(`cleanup warning: ${error.message}`);
  }
}

function printRouteSummary(proxy) {
  const relevant = proxy.calls.filter((call) => call.method !== 'OPTIONS');
  log('recorded backend calls:');

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

    await registerAndLogin(driver, proxy);
    const plantation = await createPlantation(driver, proxy);
    const harvest = await createHarvest(driver, proxy, plantation);
    await createShipment(driver, proxy, harvest);
    await createEmployeeAndPayroll(driver, proxy, plantation);
    printRouteSummary(proxy);
    log('real frontend/backend/database integration passed');
  } finally {
    if (driver) {
      await driver.quit().catch(() => {});
    }
    await cleanup().catch((error) => log(`cleanup failed: ${error.message}`));
    if (frontend) {
      await frontend.close();
    }
    if (proxy) {
      await proxy.close();
    }
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
