#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3102);
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const WAIT_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 45000);
const REQUEST_TIMEOUT_MS = Number(process.env.E2E_REQUEST_TIMEOUT_MS || 12000);
const HEADLESS = process.env.E2E_HEADLESS !== 'false';
const PASSWORD = process.env.REAL_E2E_PASSWORD || 'Password123!';
const RUN_ID = process.env.E2E_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const PROOF_FILE = path.join(__dirname, 'fixtures', 'harvest-proof.svg');

const services = {
  identity: process.env.REAL_IDENTITY_SERVICE_URL || process.env.IDENTITY_SERVICE_URL || 'http://127.0.0.1:8081',
  plantation: process.env.REAL_PLANTATION_SERVICE_URL || process.env.PLANTATION_SERVICE_URL || 'http://127.0.0.1:8082',
  harvest: process.env.REAL_HARVEST_SERVICE_URL || process.env.HARVEST_SERVICE_URL || 'http://127.0.0.1:8083',
  shipment: process.env.REAL_SHIPMENT_SERVICE_URL || process.env.SHIPMENT_SERVICE_URL || 'http://127.0.0.1:8084',
  payroll: process.env.REAL_PAYROLL_SERVICE_URL || process.env.PAYROLL_SERVICE_URL || 'http://127.0.0.1:8085',
};

const roleLabels = {
  BURUH: 'Pekerja Panen',
  MANDOR: 'Mandor',
  SUPIR: 'Supir',
};

const createdUsers = [];
const createdPlantations = [];
let driver;
let frontend;
let adminAuth;

function log(message) {
  console.log(`[prd-e2e] ${message}`);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for PRD real E2E`);
  return value;
}

function ensureSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function serviceUrl(service, pathname) {
  return new URL(pathname, ensureSlash(services[service])).toString();
}

function timeoutSignal() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

async function fetchJson(service, pathname, init = {}) {
  const { signal, done } = timeoutSignal();
  const headers = {
    ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers || {}),
  };

  try {
    const response = await fetch(serviceUrl(service, pathname), {
      method: init.method || 'GET',
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    const expected = init.expected || [200];
    if (!expected.includes(response.status)) {
      throw new Error(`${service} ${init.method || 'GET'} ${pathname} -> HTTP ${response.status}: ${text}`);
    }
    return body;
  } finally {
    done();
  }
}

async function checkBackends() {
  const health = [
    ['identity', '/api/auth/health'],
    ['plantation', '/actuator/health'],
    ['harvest', '/actuator/health'],
    ['shipment', '/api/shipments/health'],
    ['payroll', '/actuator/health'],
  ];
  for (const [service, pathname] of health) {
    await fetchJson(service, pathname);
    log(`${service} is reachable`);
  }
}

async function startFrontend() {
  const env = {
    ...process.env,
    IDENTITY_SERVICE_URL: services.identity,
    PLANTATION_SERVICE_URL: services.plantation,
    HARVEST_SERVICE_URL: services.harvest,
    SHIPMENT_SERVICE_URL: services.shipment,
    PAYROLL_SERVICE_URL: services.payroll,
  };
  const child = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(FRONTEND_PORT)], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => process.stdout.write(`[next] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[next] ${data}`));

  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(FRONTEND_URL);
      if (response.status < 500) return { close: () => child.kill() };
    } catch {
      await delay(500);
    }
  }
  child.kill();
  throw new Error(`Timed out waiting for frontend at ${FRONTEND_URL}`);
}

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

function testId(id) {
  return By.css(`[data-testid="${id}"]`);
}

function anyTextXPath(text) {
  return `//*[contains(normalize-space(.), ${JSON.stringify(text)})]`;
}

function actionTextXPath(text) {
  return `//*[self::button or self::a][contains(normalize-space(.), ${JSON.stringify(text)})]`;
}

async function clickByText(text) {
  const element = await driver.wait(until.elementLocated(By.xpath(actionTextXPath(text))), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].click();', element);
}

async function fillByLabel(label, value) {
  const lower = label.toLowerCase();
  const element = await driver.wait(until.elementLocated(By.xpath(
    `(//label[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${JSON.stringify(lower)})]//*[self::input or self::textarea or self::select][1] | //label[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${JSON.stringify(lower)})]/following::*[self::input or self::textarea or self::select][1])[1]`,
  )), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
  const tag = await element.getTagName();
  if (tag !== 'select') await element.clear();
  await element.sendKeys(value);
}

async function selectByLabel(label, optionText) {
  await fillByLabel(label, optionText);
}

async function getStoredAuth() {
  return driver.executeScript(`return {
    token: localStorage.getItem('authToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    id: localStorage.getItem('userId'),
    username: localStorage.getItem('username'),
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole')
  };`);
}

async function login(email, password = PASSWORD) {
  await driver.get(`${FRONTEND_URL}/login`);
  await driver.findElement(testId('login-email-input')).sendKeys(email);
  await driver.findElement(testId('login-password-input')).sendKeys(password);
  await driver.findElement(testId('login-submit-button')).click();
  await driver.wait(async () => {
    const auth = await getStoredAuth();
    return Boolean(auth.token);
  }, WAIT_TIMEOUT_MS);
  return getStoredAuth();
}

async function logout() {
  try {
    const button = await driver.findElement(By.css('button[title="Logout"]'));
    await button.click();
    await delay(300);
  } catch {
    await driver.executeScript('localStorage.clear()');
  }
}

async function registerRole(role) {
  const suffix = `${role.toLowerCase()}_${RUN_ID}`;
  const user = {
    role,
    username: `e2e_${suffix}`,
    email: `e2e_${suffix}@example.test`,
  };
  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel('Nama Pengguna', user.username);
  await selectByLabel('Daftar Sebagai', roleLabels[role]);
  if (role === 'MANDOR') await fillByLabel('Nomor Sertifikasi', `CERT-${RUN_ID}`);
  await fillByLabel('Email', user.email);
  await fillByLabel('Password', PASSWORD);
  await fillByLabel('Konfirmasi Password', PASSWORD);
  await driver.findElement(testId('user-create-button')).click();
  await driver.wait(until.urlContains('/login'), WAIT_TIMEOUT_MS);
  const auth = await login(user.email);
  assert.equal(auth.role, role);
  createdUsers.push(auth.id);
  await logout();
  return { ...user, ...auth };
}

async function createPlantation(name, code, offset) {
  await driver.get(`${FRONTEND_URL}/admin/plantations`);
  await clickByText('+ Tambah Kebun');
  await fillByLabel('Kode Unik Kebun', code);
  await fillByLabel('Nama Kebun', name);
  await fillByLabel('Lokasi', `E2E Block ${offset}`);
  await fillByLabel('Luas', '12.5');
  const latInputs = await driver.findElements(By.css('input[placeholder="Lat"]'));
  const lonInputs = await driver.findElements(By.css('input[placeholder="Lon"]'));
  const baseLat = -6.2 - offset / 100;
  const baseLon = 106.8 + offset / 100;
  const coords = [
    [baseLat, baseLon],
    [baseLat, baseLon + 0.004],
    [baseLat - 0.004, baseLon + 0.004],
    [baseLat - 0.004, baseLon],
  ];
  for (let i = 0; i < 4; i += 1) {
    await latInputs[i].clear();
    await latInputs[i].sendKeys(String(coords[i][0]));
    await lonInputs[i].clear();
    await lonInputs[i].sendKeys(String(coords[i][1]));
  }
  await driver.findElement(testId('kebun-create-button')).click();
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Kebun berhasil dibuat'))), WAIT_TIMEOUT_MS);
  const plantations = await fetchJson('plantation', `/api/plantations?code=${encodeURIComponent(code)}`, {
    token: adminAuth.token,
  });
  assert.equal(plantations.length, 1, `Expected one plantation with code ${code}`);
  createdPlantations.push(plantations[0].id);
  return plantations[0];
}

async function assignMandorToPlantation(plantation, mandor) {
  await clickByText('Penugasan Mandor');
  await selectByLabel('Kebun', plantation.code ? `${plantation.code} - ${plantation.name}` : plantation.name);
  await selectByLabel('Mandor', mandor.email);
  await clickByText('Simpan Penugasan');
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Mandor berhasil ditugaskan'))), WAIT_TIMEOUT_MS);
}

async function assignSupirToPlantation(plantation, supir) {
  await clickByText('Penugasan Supir');
  await selectByLabel('Kebun', plantation.name);
  await selectByLabel('Supir', supir.email);
  await clickByText('Simpan Penugasan');
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Supir berhasil ditugaskan'))), WAIT_TIMEOUT_MS);
}

async function assignBuruhToMandor(plantation, buruh) {
  await clickByText('Penugasan Buruh');
  await selectByLabel('Kebun', plantation.name);
  await selectByLabel('Buruh', buruh.email);
  await clickByText('Simpan Penugasan Mandor');
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Mandor berhasil ditugaskan ke buruh'))), WAIT_TIMEOUT_MS);
}

async function logHarvest(buruh, plantation) {
  await login(buruh.email);
  await driver.get(`${FRONTEND_URL}/harvest`);
  await selectByLabel('Kebun', plantation.name);
  await fillByLabel('Berat Panen', '120');
  await fillByLabel('Catatan Panen', `Panen e2e ${RUN_ID}`);
  await driver.findElement(By.css('input[type="file"]')).sendKeys(PROOF_FILE);
  await driver.findElement(testId('harvest-create-button')).click();
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Log panen berhasil'))), WAIT_TIMEOUT_MS);
  await clickByText('Kirim Log Panen').catch(() => {});
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('sudah mencatat panen hari ini'))), WAIT_TIMEOUT_MS);
  await logout();

  const harvests = await fetchJson('harvest', '/harvests/my', {
    token: buruh.token,
  });
  const created = harvests.find((item) => String(item.harvesterId) === String(buruh.id));
  assert.ok(created, 'Expected created harvest to be readable from real Harvest service');
  return created;
}

async function approveHarvest(mandor, harvest) {
  await login(mandor.email);
  await driver.get(`${FRONTEND_URL}/mandor/harvest`);
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Persetujuan Panen'))), WAIT_TIMEOUT_MS);
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath(String(harvest.weight)))), WAIT_TIMEOUT_MS);
  await driver.findElement(testId('harvest-approve-button')).click();
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Disetujui'))), WAIT_TIMEOUT_MS);
}

async function waitForPendingPayroll(userId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const payrolls = await fetchJson('payroll', `/api/payrolls/user/${userId}`, {
      expected: [200],
    });
    const pending = payrolls.find((item) => item.status === 'PENDING');
    if (pending) return pending;
    await delay(1000);
  }
  throw new Error(`Timed out waiting for pending payroll for user ${userId}`);
}

async function waitForAcceptedPayroll(payrollId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const payroll = await fetchJson('payroll', `/api/payrolls/${payrollId}`, {
      expected: [200],
    });
    if (payroll.status === 'ACCEPTED' && payroll.walletSettled) return payroll;
    await delay(1000);
  }
  throw new Error(`Timed out waiting for payroll ${payrollId} to be accepted and wallet-settled`);
}

async function getWallet(userId) {
  return fetchJson('payroll', `/api/wallets/${userId}`, { expected: [200] });
}

async function topUpAdminWallet(amountSawitDollar) {
  await driver.get(`${FRONTEND_URL}/admin/payroll`);
  const walletText = await driver.findElement(By.css('[data-testid="wallet-balance"]')).getText();
  assert.ok(walletText.includes('SawitDollar'), 'Admin wallet balance must be visible');
  const page = await driver.findElement(By.css('body')).getText();
  assert.ok(
    !page.includes('/api/wallets') && !page.includes('404') && !page.toLowerCase().includes('failed to load admin wallet'),
    'BUG: Payroll backend wallet/top-up boundary is not available to the real frontend',
  );
  await fillByLabel('Top Up SawitDollar', String(amountSawitDollar));
  await clickByText('Top Up');
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('Tandai Paid'))), WAIT_TIMEOUT_MS);
  await clickByText('Tandai Paid');
  await driver.wait(async () => {
    const wallet = await getWallet(adminAuth.id);
    return wallet.balance >= amountSawitDollar;
  }, WAIT_TIMEOUT_MS);
}

async function approvePayrollFromUi(worker, pendingPayroll) {
  const adminWalletBefore = await getWallet(adminAuth.id);
  const workerWalletBefore = await getWallet(worker.id);

  await driver.get(`${FRONTEND_URL}/admin/payroll`);
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath(worker.email))), WAIT_TIMEOUT_MS);
  await selectByLabel('Penerima Filter', worker.email);
  await clickByText('Filter');
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath(`Payroll #${pendingPayroll.id}`))), WAIT_TIMEOUT_MS);
  await driver.findElement(testId('payroll-approve-button')).click();

  const accepted = await waitForAcceptedPayroll(pendingPayroll.id);
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath('ACCEPTED'))), WAIT_TIMEOUT_MS);

  const adminWalletAfter = await getWallet(adminAuth.id);
  const workerWalletAfter = await getWallet(worker.id);
  const expectedWalletDelta = accepted.walletTransferAmount / 10000;
  assert.ok(
    Math.abs(workerWalletAfter.balance - (workerWalletBefore.balance + expectedWalletDelta)) < 0.0001,
    'Worker wallet should increase by accepted payroll amount',
  );
  assert.ok(
    Math.abs(adminWalletAfter.balance - (adminWalletBefore.balance - expectedWalletDelta)) < 0.0001,
    'Admin wallet should decrease by accepted payroll amount',
  );
  return accepted;
}

async function cleanup() {
  if (adminAuth?.token) {
    for (const id of [...createdPlantations].reverse()) {
      await fetchJson('plantation', `/api/plantations/${id}`, {
        method: 'DELETE',
        token: adminAuth.token,
        expected: [204, 400, 404],
      }).catch((error) => log(`cleanup plantation ${id}: ${error.message}`));
    }
    for (const id of [...createdUsers].reverse()) {
      await fetchJson('identity', `/api/admin/users/${id}`, {
        method: 'DELETE',
        token: adminAuth.token,
        expected: [200, 404],
      }).catch((error) => log(`cleanup user ${id}: ${error.message}`));
    }
  }
}

async function run() {
  requiredEnv('REAL_ADMIN_EMAIL');
  requiredEnv('REAL_ADMIN_PASSWORD');
  await checkBackends();
  frontend = await startFrontend();
  driver = await buildDriver();

  const mandor = await registerRole('MANDOR');
  const buruh = await registerRole('BURUH');
  const supir = await registerRole('SUPIR');

  adminAuth = await login(process.env.REAL_ADMIN_EMAIL, process.env.REAL_ADMIN_PASSWORD);
  assert.equal(adminAuth.role, 'ADMIN');

  await driver.get(`${FRONTEND_URL}/admin/users`);
  await driver.wait(until.elementLocated(By.xpath(anyTextXPath(mandor.email))), WAIT_TIMEOUT_MS);
  await fillByLabel('Name', mandor.username);
  await fillByLabel('Email', mandor.email);
  await selectByLabel('Role', 'Mandor');

  const plantationA = await createPlantation(`Kebun E2E A ${RUN_ID}`, `E2E-A-${RUN_ID}`, 1);
  await createPlantation(`Kebun E2E B ${RUN_ID}`, `E2E-B-${RUN_ID}`, 2);
  await assignMandorToPlantation(plantationA, mandor);
  await assignSupirToPlantation(plantationA, supir);
  await assignBuruhToMandor(plantationA, buruh);
  await logout();

  const harvest = await logHarvest(buruh, plantationA);
  await approveHarvest(mandor, harvest);
  await logout();

  const buruhPayroll = await waitForPendingPayroll(buruh.id);
  adminAuth = await login(process.env.REAL_ADMIN_EMAIL, process.env.REAL_ADMIN_PASSWORD);
  await topUpAdminWallet(100);
  await approvePayrollFromUi(buruh, buruhPayroll);
  log('PRD real E2E settled Buruh payroll through the real wallet flow');
}

run()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (driver) await driver.quit().catch(() => {});
    await cleanup();
    if (frontend) frontend.close();
  });
