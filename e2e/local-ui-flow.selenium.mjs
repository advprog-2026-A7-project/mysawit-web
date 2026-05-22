#!/usr/bin/env node

import http from 'node:http';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3101);
const API_PORT = Number(process.env.E2E_API_PORT || 3998);
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WAIT_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 30000);
const HEADLESS = process.env.E2E_HEADLESS !== 'false';

const calls = [];
const state = {
  plantations: [],
  harvests: [],
  shipments: [],
  payrolls: [],
  wageConfigs: [],
  wallets: new Map(),
  nextId: 1,
};

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

function log(message) {
  console.log(`[local-e2e] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function json(res, status, body) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(body));
}

function createRecord(collection, body) {
  const now = '2026-05-22T00:00:00';
  const record = { id: state.nextId++, createdAt: now, updatedAt: now, ...body };
  collection.push(record);
  return record;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function startApiServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      json(res, 204, {});
      return;
    }

    const url = new URL(req.url || '/', API_URL);
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readBody(req) : {};
    calls.push({ method: req.method, path: url.pathname + url.search, body });

    if (url.pathname === '/identity/api/auth/register' || url.pathname === '/identity/api/auth/login') {
      json(res, 200, {
        token: `token-${runId}`,
        type: 'Bearer',
        id: '100',
        username: body.username || body.email || 'e2e-user',
        email: body.email || 'e2e@example.test',
        role: 'USER',
      });
      return;
    }
    if (url.pathname === '/identity/api/auth/health') {
      json(res, 200, { status: 'UP', service: 'mysawit-identity-service' });
      return;
    }

    if (url.pathname === '/plantation/api/plantations' && req.method === 'GET') {
      json(res, 200, state.plantations);
      return;
    }
    if (url.pathname === '/plantation/api/plantations' && req.method === 'POST') {
      json(res, 201, createRecord(state.plantations, body));
      return;
    }

    if (url.pathname === '/harvest/api/harvests' && req.method === 'GET') {
      json(res, 200, state.harvests);
      return;
    }
    if (url.pathname === '/harvest/api/harvests' && req.method === 'POST') {
      json(res, 201, createRecord(state.harvests, { quality: 'STANDARD', ...body }));
      return;
    }

    if (url.pathname === '/shipment/api/shipments' && req.method === 'GET') {
      json(res, 200, state.shipments);
      return;
    }
    if (url.pathname === '/shipment/api/shipments' && req.method === 'POST') {
      json(res, 201, createRecord(state.shipments, { status: 'PENDING', ...body }));
      return;
    }

    if (url.pathname === '/payroll/api/payrolls' && req.method === 'GET') {
      json(res, 200, state.payrolls);
      return;
    }
    if (url.pathname === '/payroll/api/payrolls' && req.method === 'POST') {
      const baseAmount = Number(body.baseAmount || 0);
      const bonusAmount = Number(body.bonusAmount || 0);
      const deductionAmount = Number(body.deductionAmount || 0);
      json(res, 201, createRecord(state.payrolls, {
        bonusAmount,
        deductionAmount,
        totalAmount: baseAmount + bonusAmount - deductionAmount,
        status: 'PENDING',
        ...body,
      }));
      return;
    }
    const payrollTransition = url.pathname.match(/^\/payroll\/api\/payrolls\/(\d+)\/(approve|pay)$/);
    if (payrollTransition && req.method === 'PATCH') {
      const payroll = state.payrolls.find((item) => item.id === Number(payrollTransition[1]));
      assert(payroll, `missing payroll ${payrollTransition[1]}`);
      payroll.status = payrollTransition[2] === 'approve' ? 'APPROVED' : 'PAID';
      payroll.walletSettled = payroll.status === 'APPROVED' ? true : payroll.walletSettled;
      payroll.walletTransferAmount = payroll.status === 'APPROVED' ? payroll.totalAmount : payroll.walletTransferAmount;
      json(res, 200, payroll);
      return;
    }

    const walletMatch = url.pathname.match(/^\/payroll\/api\/wallets\/([^/]+)$/);
    if (walletMatch && req.method === 'GET') {
      const userId = decodeURIComponent(walletMatch[1]);
      const wallet = state.wallets.get(userId) || { id: state.nextId++, userId, balance: 0, createdAt: '2026-05-22T00:00:00', updatedAt: '2026-05-22T00:00:00' };
      state.wallets.set(userId, wallet);
      json(res, 200, wallet);
      return;
    }
    const topUpMatch = url.pathname.match(/^\/payroll\/api\/wallets\/([^/]+)\/top-up\/sandbox$/);
    if (topUpMatch && req.method === 'POST') {
      const userId = decodeURIComponent(topUpMatch[1]);
      const wallet = state.wallets.get(userId) || { id: state.nextId++, userId, balance: 0, createdAt: '2026-05-22T00:00:00', updatedAt: '2026-05-22T00:00:00' };
      wallet.balance += Number(body.amountSawitDollar || 0);
      state.wallets.set(userId, wallet);
      json(res, 200, {
        id: state.nextId++,
        transactionId: `sandbox-${runId}`,
        userId,
        gateway: body.gateway || 'SANDBOX',
        status: 'PAID',
        amountSawitDollar: Number(body.amountSawitDollar || 0),
        amountIdr: Number(body.amountSawitDollar || 0) * 10000,
        createdAt: '2026-05-22T00:00:00',
      });
      return;
    }

    if (url.pathname === '/payroll/api/admin/wage-configs' && req.method === 'GET') {
      json(res, 200, state.wageConfigs);
      return;
    }
    if (url.pathname === '/payroll/api/admin/wage-configs' && req.method === 'POST') {
      json(res, 201, createRecord(state.wageConfigs, body));
      return;
    }

    json(res, 404, { error: `No stub route for ${req.method} ${url.pathname}` });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(API_PORT, '127.0.0.1', () => {
      server.off('error', reject);
      log(`stub API listening at ${API_URL}`);
      resolve({ close: () => new Promise((done) => server.close(done)) });
    });
  });
}

async function startFrontend() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCommand, ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(FRONTEND_PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_IDENTITY_SERVICE_URL: `${API_URL}/identity`,
      NEXT_PUBLIC_PLANTATION_SERVICE_URL: `${API_URL}/plantation`,
      NEXT_PUBLIC_HARVEST_SERVICE_URL: `${API_URL}/harvest`,
      NEXT_PUBLIC_SHIPMENT_SERVICE_URL: `${API_URL}/shipment`,
      NEXT_PUBLIC_PAYROLL_SERVICE_URL: `${API_URL}/payroll`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  child.stdout.on('data', (data) => process.stdout.write(`[next] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[next] ${data}`));

  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(FRONTEND_URL);
      if (response.status < 500) {
        return { close: async () => stopProcessTree(child.pid) };
      }
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Timed out waiting for frontend at ${FRONTEND_URL}`);
}

async function stopProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('close', resolve);
      killer.on('error', resolve);
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    childKill(pid);
  }
  await delay(500);
}

function childKill(pid) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000', '--disable-dev-shm-usage');
  if (HEADLESS) {
    options.addArguments('--headless=new');
  }
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

function escapeXPath(value) {
  return value.includes("'")
    ? `concat(${value.split("'").map((part) => `'${part}'`).join(', "\"\'\"", ')})`
    : `'${value}'`;
}

async function clickText(driver, text) {
  const xpath = `//*[self::button or self::a][contains(normalize-space(.), ${escapeXPath(text)})]`;
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
  await driver.wait(until.elementIsEnabled(element), WAIT_TIMEOUT_MS);
  await element.click();
}

async function fillByLabel(driver, label, value) {
  const xpath = `//label[normalize-space(.)=${escapeXPath(label)}]/following::*[self::input or self::textarea or self::select][1]`;
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
  const tagName = await element.getTagName();
  if (tagName !== 'select') {
    await element.clear();
  }
  await element.sendKeys(value);
}

async function waitForText(driver, text) {
  await driver.wait(until.elementLocated(By.xpath(`//*[contains(normalize-space(.), ${escapeXPath(text)})]`)), WAIT_TIMEOUT_MS);
}

function saw(method, fragment) {
  return calls.some((call) => call.method === method && call.path.includes(fragment));
}

async function runFlow(driver) {
  const username = `e2e_${runId}`;
  const email = `${username}@example.test`;

  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel(driver, 'Username', username);
  await fillByLabel(driver, 'Email', email);
  await fillByLabel(driver, 'Password', 'secret123');
  await fillByLabel(driver, 'Confirm Password', 'secret123');
  await clickText(driver, 'Register');
  await driver.wait(until.urlContains('/dashboard'), WAIT_TIMEOUT_MS);

  await clickText(driver, 'Plantations');
  await waitForText(driver, 'Plantations Management');
  await clickText(driver, 'Add Plantation');
  await fillByLabel(driver, 'Plantation Name', `E2E Plantation ${runId}`);
  await fillByLabel(driver, 'Location', 'Riau');
  await fillByLabel(driver, 'Area (hectares)', '12.5');
  await fillByLabel(driver, 'Description', 'Local browser flow');
  await clickText(driver, 'Create Plantation');
  await waitForText(driver, `E2E Plantation ${runId}`);

  await driver.get(`${FRONTEND_URL}/dashboard/harvests`);
  await waitForText(driver, 'Harvests Management');
  await clickText(driver, 'Add Harvest');
  await fillByLabel(driver, 'Plantation ID', String(state.plantations[0].id));
  await fillByLabel(driver, 'Harvest Date', '2026-05-22');
  await fillByLabel(driver, 'Weight (kg)', '88');
  await fillByLabel(driver, 'Quality', 'PREMIUM');
  await fillByLabel(driver, 'Notes (optional)', 'Local harvest');
  await clickText(driver, 'Create Harvest');
  await waitForText(driver, `Harvest #${state.harvests[0].id}`);

  await driver.get(`${FRONTEND_URL}/dashboard/shipments`);
  await waitForText(driver, 'Shipments Management');
  await clickText(driver, 'Add Shipment');
  await fillByLabel(driver, 'Harvest ID', String(state.harvests[0].id));
  await fillByLabel(driver, 'Destination', 'Mill A');
  await fillByLabel(driver, 'Weight (kg)', '44');
  await fillByLabel(driver, 'Status', 'PENDING');
  await fillByLabel(driver, 'Notes (optional)', 'Local shipment');
  await clickText(driver, 'Create Shipment');
  await waitForText(driver, `Shipment #${state.shipments[0].id}`);

  await driver.get(`${FRONTEND_URL}/dashboard/payroll`);
  await waitForText(driver, 'Payroll Management');
  await clickText(driver, 'Add Payroll');
  await fillByLabel(driver, 'User ID', 'worker-1');
  await fillByLabel(driver, 'Role Type', 'BURUH');
  await fillByLabel(driver, 'Base Amount', '100');
  await fillByLabel(driver, 'Period Start', '2026-05-01');
  await fillByLabel(driver, 'Period End', '2026-05-31');
  await fillByLabel(driver, 'Bonus Amount', '20');
  await fillByLabel(driver, 'Deduction Amount', '5');
  await fillByLabel(driver, 'Payment Method', 'SANDBOX');
  await fillByLabel(driver, 'Notes', 'Local payroll');
  await clickText(driver, 'Create Payroll');
  await waitForText(driver, `Payroll #${state.payrolls[0].id}`);
  await clickText(driver, 'Approve');
  await waitForText(driver, 'APPROVED');
  await clickText(driver, 'Mark as Paid');
  await waitForText(driver, 'PAID');

  await clickText(driver, 'Wallets');
  await fillByLabel(driver, 'Wallet User ID', 'admin');
  await fillByLabel(driver, 'Sawit Dollar Amount', '100');
  await clickText(driver, 'Top Up Wallet');
  await waitForText(driver, 'Wallet admin');

  await clickText(driver, 'Wage Configs');
  await clickText(driver, 'Add Wage Config');
  await fillByLabel(driver, 'Wage Role Type', 'BURUH');
  await fillByLabel(driver, 'Rate Per Kg', '350');
  await fillByLabel(driver, 'Effective Date', '2026-01-01');
  await fillByLabel(driver, 'Created By', 'admin');
  await fillByLabel(driver, 'Description', 'Local wage');
  await clickText(driver, 'Create Wage Config');
  await waitForText(driver, 'Local wage');

  assert(saw('POST', '/identity/api/auth/register'), 'register did not call identity API');
  assert(saw('GET', '/plantation/api/plantations'), 'plantation list API was not called');
  assert(saw('POST', '/plantation/api/plantations'), 'plantation create API was not called');
  assert(saw('POST', '/harvest/api/harvests'), 'harvest create API was not called');
  assert(saw('POST', '/shipment/api/shipments'), 'shipment create API was not called');
  assert(saw('POST', '/payroll/api/payrolls'), 'payroll create API was not called');
  assert(saw('PATCH', `/payroll/api/payrolls/${state.payrolls[0].id}/approve`), 'payroll approve API was not called');
  assert(saw('PATCH', `/payroll/api/payrolls/${state.payrolls[0].id}/pay`), 'payroll pay API was not called');
  assert(saw('POST', '/payroll/api/wallets/admin/top-up/sandbox'), 'wallet top-up API was not called');
  assert(saw('POST', '/payroll/api/admin/wage-configs'), 'wage config create API was not called');

  log('recorded calls:');
  calls.forEach((call) => console.log(`  ${call.method.padEnd(6)} ${call.path}`));
}

async function main() {
  let apiServer;
  let frontend;
  let driver;
  try {
    apiServer = await startApiServer();
    frontend = await startFrontend();
    driver = await buildDriver();
    await runFlow(driver);
    log('local Chromium UI flow passed');
  } finally {
    if (driver) await driver.quit().catch(() => {});
    if (frontend) await frontend.close().catch(() => {});
    if (apiServer) await apiServer.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
