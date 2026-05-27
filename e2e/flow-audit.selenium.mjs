#!/usr/bin/env node

import http from 'node:http';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3101);
const MOCK_PORT = Number(process.env.E2E_MOCK_PORT || 3998);
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const WAIT_TIMEOUT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 30000);
const HEADLESS = process.env.E2E_HEADLESS !== 'false';

const now = '2026-05-22T08:00:00.000Z';

const state = {
  nextPlantationId: 10,
  nextShipmentId: 20,
  nextPayrollId: 30,
  calls: [],
  users: [
    user('admin-1', 'admin', 'admin@mysawit.test', 'ADMIN', 'Admin Utama'),
    user('mandor-1', 'mandor', 'mandor@mysawit.test', 'MANDOR', 'Mandor Satu', { certificationNumber: 'CERT-M1' }),
    user('buruh-1', 'buruh', 'buruh@mysawit.test', 'BURUH', 'Buruh Satu', { mandorId: 'mandor-1' }),
    user('buruh-2', 'buruhdua', 'buruhdua@mysawit.test', 'BURUH', 'Buruh Dua'),
    user('supir-1', 'supir', 'supir@mysawit.test', 'SUPIR', 'Supir Satu'),
  ],
  plantations: [
    plantation('plant-1', 'Kebun Alpha', 'Bogor', 20, { mandorId: 'mandor-1', supirIds: ['supir-1'] }),
    plantation('plant-2', 'Kebun Beta', 'Depok', 12),
  ],
  harvests: [
    harvest('harvest-1', 'plant-1', 80, 'PENDING', { harvesterId: 'buruh-1', harvesterName: 'Buruh Satu', news: 'Buah matang' }),
    harvest('harvest-2', 'plant-1', 120, 'APPROVED', { harvesterId: 'buruh-1', harvesterName: 'Buruh Satu', quality: 'PREMIUM' }),
    harvest('harvest-3', 'plant-1', 450, 'APPROVED', { harvesterId: 'buruh-2', harvesterName: 'Buruh Dua' }),
    harvest('harvest-4', 'plant-2', 60, 'PENDING', { harvesterId: 'buruh-2', harvesterName: 'Buruh Dua' }),
    harvest('harvest-5', 'plant-1', 35, 'REJECTED', { harvesterId: 'buruh-1', harvesterName: 'Buruh Satu', rejectionReason: 'Foto kurang jelas' }),
  ],
  shipments: [
    shipment('ship-1', 'TIBA', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 120, destination: 'Pabrik Utara' }),
    shipment('ship-2', 'MANDOR_APPROVED', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 90, destination: 'Pabrik Timur' }),
    shipment('ship-3', 'MANDOR_APPROVED', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 70, destination: 'Pabrik Barat' }),
    shipment('ship-4', 'MANDOR_APPROVED', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 65, destination: 'Pabrik Selatan' }),
    shipment('ship-5', 'MEMUAT', { mandorUserId: 'mandor-1', supirUserId: 'supir-2', totalKg: 110, destination: 'Pabrik Aktif' }),
    shipment('ship-6', 'MENGIRIM', { mandorUserId: 'mandor-1', supirUserId: 'supir-2', totalKg: 95, destination: 'Pabrik Jalan' }),
    shipment('ship-7', 'ADMIN_APPROVED', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 88, destination: 'Pabrik Selesai' }),
    shipment('ship-8', 'ADMIN_REJECTED', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 77, destination: 'Pabrik Ditolak', rejectionReason: 'Berat tidak cocok' }),
    shipment('ship-9', 'TIBA', { mandorUserId: 'mandor-1', supirUserId: 'supir-1', totalKg: 72, destination: 'Pabrik Review' }),
  ],
  payrolls: [
    payroll(1, 'buruh-1', 'BURUH', 'PENDING', { baseAmount: 1200000, bonusAmount: 100000 }),
    payroll(2, 'supir-1', 'SUPIR', 'PENDING', { baseAmount: 1500000 }),
    payroll(3, 'mandor-1', 'MANDOR', 'PAID', { baseAmount: 2500000, totalAmount: 2500000, walletSettled: true }),
    payroll(4, 'buruh-2', 'BURUH', 'APPROVED', { baseAmount: 1300000 }),
    payroll(5, 'buruh-2', 'BURUH', 'PENDING', { baseAmount: 900000 }),
    payroll(6, 'buruh-1', 'BURUH', 'PENDING', { baseAmount: 850000 }),
  ],
};

function user(id, username, email, role, name, extra = {}) {
  return {
    id,
    username,
    email,
    name,
    role,
    googleLinked: false,
    hasPassword: true,
    createdAt: now,
    mandorId: null,
    certificationNumber: null,
    kebunId: null,
    ...extra,
  };
}

function plantation(id, name, location, area, extra = {}) {
  return {
    id,
    code: `KB-${String(id).slice(-1)}`,
    name,
    location,
    area,
    ownerId: 'admin-1',
    description: '',
    plantDate: now,
    coordinates: [
      { latitude: -6.2, longitude: 106.8 },
      { latitude: -6.2, longitude: 106.9 },
      { latitude: -6.3, longitude: 106.9 },
      { latitude: -6.3, longitude: 106.8 },
    ],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function harvest(id, plantationId, weight, status, extra = {}) {
  return {
    id,
    plantationId,
    weight,
    status,
    quality: 'STANDARD',
    harvestDate: now,
    createdAt: now,
    updatedAt: now,
    notes: '',
    ...extra,
  };
}

function shipment(id, status, extra = {}) {
  return {
    id,
    mandorName: 'Mandor Satu',
    supirName: 'Supir Satu',
    destination: 'Pabrik',
    totalKg: 100,
    weight: 100,
    status,
    items: [{ harvestId: 'harvest-2', weightKg: 100 }],
    createdAt: now,
    updatedAt: now,
    mandorReviewedAt: now,
    adminReviewedAt: now,
    ...extra,
  };
}

function payroll(id, userId, roleType, status, extra = {}) {
  const baseAmount = extra.baseAmount ?? 1000000;
  const bonusAmount = extra.bonusAmount ?? 0;
  const deductionAmount = extra.deductionAmount ?? 0;
  return {
    id,
    userId,
    roleType,
    sourceType: 'MANUAL',
    periodStart: '2026-05-01T00:00:00',
    periodEnd: '2026-05-31T00:00:00',
    baseAmount,
    bonusAmount,
    deductionAmount,
    totalAmount: extra.totalAmount ?? baseAmount + bonusAmount - deductionAmount,
    status,
    paymentMethod: 'SANDBOX',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function authFor(role) {
  const record = state.users.find((item) => item.role === role) || state.users[0];
  return {
    token: `token-${role.toLowerCase()}`,
    refreshToken: `refresh-${role.toLowerCase()}`,
    type: 'Bearer',
    id: record.id,
    username: record.username,
    email: record.email,
    role: record.role,
    googleLinked: false,
    hasPassword: true,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function log(message) {
  console.log(`[flow-e2e] ${message}`);
}

function escapeXPath(value) {
  if (!value.includes("'")) return `'${value}'`;
  return `concat(${value.split("'").map((part) => `'${part}'`).join(', "\"\'\"", ')})`;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function startMockBackend() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const bodyText = await readRequestBody(req);
    const body = parseJson(bodyText);
    state.calls.push({ method: req.method, path: url.pathname, search: url.search, body });

    try {
      const [service, ...rest] = url.pathname.split('/').filter(Boolean);
      const path = `/${rest.join('/')}`;

      if (service === 'identity') return handleIdentity(req, res, path, url, body);
      if (service === 'plantation') return handlePlantation(req, res, path, body);
      if (service === 'harvest') return handleHarvest(req, res, path, url, body);
      if (service === 'shipment') return handleShipment(req, res, path, url, body);
      if (service === 'payroll') return handlePayroll(req, res, path, url, body);

      sendJson(res, 404, { error: `Unknown mock service ${service}` });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Mock failure' });
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(MOCK_PORT, '127.0.0.1', () => {
      server.off('error', reject);
      log(`mock backend listening at ${MOCK_URL}`);
      resolve({ close: () => new Promise((done) => server.close(done)) });
    });
  });
}

function handleIdentity(req, res, path, url, body) {
  if (req.method === 'POST' && path === '/api/auth/login') {
    const email = String(body.email || '').toLowerCase();
    const role = email.includes('mandor') ? 'MANDOR'
      : email.includes('buruh') ? 'BURUH'
      : email.includes('supir') ? 'SUPIR'
      : 'ADMIN';
    return sendJson(res, 200, authFor(role));
  }

  if (req.method === 'POST' && path === '/api/auth/register') {
    const role = body.role || 'BURUH';
    const id = `registered-${state.users.length + 1}`;
    state.users.push(user(id, body.username, body.email, role, body.username, {
      certificationNumber: body.certificationNumber || null,
    }));
    return sendJson(res, 200, { ...authFor(role), id, username: body.username, email: body.email });
  }

  if (req.method === 'POST' && path === '/api/auth/logout') return sendJson(res, 200, { message: 'ok' });
  if (req.method === 'GET' && path === '/api/auth/health') return sendJson(res, 200, { status: 'UP' });

  if (req.method === 'GET' && path === '/api/admin/users') {
    let users = [...state.users];
    const name = url.searchParams.get('name')?.toLowerCase();
    const email = url.searchParams.get('email')?.toLowerCase();
    const role = url.searchParams.get('role');
    if (name) users = users.filter((item) => `${item.name} ${item.username}`.toLowerCase().includes(name));
    if (email) users = users.filter((item) => item.email.toLowerCase().includes(email));
    if (role) users = users.filter((item) => item.role === role);
    return sendJson(res, 200, users);
  }

  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)(?:\/(assign-mandor|unassign-mandor))?$/);
  if (userMatch) {
    const [, userId, action] = userMatch;
    const target = state.users.find((item) => item.id === userId);
    if (!target) return sendJson(res, 404, { message: 'User not found' });
    if (req.method === 'GET' && !action) return sendJson(res, 200, target);
    if (req.method === 'DELETE' && !action) {
      state.users = state.users.filter((item) => item.id !== userId);
      return sendJson(res, 200, { message: 'deleted' });
    }
    if (req.method === 'PUT' && action === 'assign-mandor') {
      target.mandorId = body.mandorId;
      return sendJson(res, 200, { message: 'assigned' });
    }
    if (req.method === 'PUT' && action === 'unassign-mandor') {
      target.mandorId = null;
      return sendJson(res, 200, { message: 'unassigned' });
    }
  }

  return sendJson(res, 404, { error: `Unhandled identity ${req.method} ${path}` });
}

function handlePlantation(req, res, path, body) {
  if (req.method === 'GET' && path === '/api/plantations') return sendJson(res, 200, state.plantations);
  if (req.method === 'GET' && path.startsWith('/api/plantations/owner/')) {
    const ownerId = path.split('/').pop();
    return sendJson(res, 200, state.plantations.filter((item) => String(item.mandorId || item.ownerId) === String(ownerId)));
  }
  if (req.method === 'POST' && path === '/api/plantations') {
    const item = plantation(`plant-${state.nextPlantationId++}`, body.name, body.location, Number(body.area), {
      ownerId: body.ownerId,
      description: body.description || '',
      plantDate: body.plantDate || now,
      coordinates: body.coordinates || [],
    });
    state.plantations.unshift(item);
    return sendJson(res, 201, item);
  }
  if (req.method === 'PUT' && path === '/api/plantations/transfer-mandor') {
    const from = state.plantations.find((item) => String(item.id) === String(body.fromPlantationId));
    const to = state.plantations.find((item) => String(item.id) === String(body.toPlantationId));
    if (from) from.mandorId = undefined;
    if (to) to.mandorId = body.mandorId;
    return sendJson(res, 200, { message: 'transferred' });
  }

  const supirMatch = path.match(/^\/api\/plantations\/([^/]+)\/supirs(?:\/([^/]+))?$/);
  if (supirMatch) {
    const [, plantationId, supirId] = supirMatch;
    const item = state.plantations.find((p) => String(p.id) === String(plantationId));
    if (!item) return sendJson(res, 404, { message: 'Plantation not found' });
    item.supirIds ??= [];
    if (req.method === 'GET') return sendJson(res, 200, item.supirIds);
    if (req.method === 'POST') {
      if (!item.supirIds.includes(body.supirId)) item.supirIds.push(body.supirId);
      return sendJson(res, 200, item);
    }
    if (req.method === 'DELETE') {
      item.supirIds = item.supirIds.filter((id) => id !== supirId);
      return sendJson(res, 200, item);
    }
  }

  const mandorMatch = path.match(/^\/api\/plantations\/([^/]+)\/mandor$/);
  if (mandorMatch) {
    const item = state.plantations.find((p) => String(p.id) === String(mandorMatch[1]));
    if (!item) return sendJson(res, 404, { message: 'Plantation not found' });
    if (req.method === 'POST') item.mandorId = body.mandorId;
    if (req.method === 'DELETE') item.mandorId = undefined;
    return sendJson(res, 200, item);
  }

  const byIdMatch = path.match(/^\/api\/plantations\/([^/]+)$/);
  if (byIdMatch) {
    const id = byIdMatch[1];
    const index = state.plantations.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return sendJson(res, 404, { message: 'Plantation not found' });
    if (req.method === 'GET') return sendJson(res, 200, state.plantations[index]);
    if (req.method === 'PUT') {
      state.plantations[index] = { ...state.plantations[index], ...body, updatedAt: now };
      return sendJson(res, 200, state.plantations[index]);
    }
    if (req.method === 'DELETE') {
      state.plantations.splice(index, 1);
      return sendJson(res, 200, { message: 'deleted' });
    }
  }

  return sendJson(res, 404, { error: `Unhandled plantation ${req.method} ${path}` });
}

function handleHarvest(req, res, path, url, body) {
  if (req.method === 'GET' && path === '/harvests/my') {
    return sendJson(res, 200, state.harvests.filter((item) => item.harvesterId === 'buruh-1'));
  }
  if (req.method === 'GET' && path === '/harvests') {
    let harvests = [...state.harvests];
    const status = url.searchParams.get('status');
    const harvesterName = url.searchParams.get('harvesterName')?.toLowerCase();
    if (status) harvests = harvests.filter((item) => item.status === status);
    if (harvesterName) harvests = harvests.filter((item) => item.harvesterName?.toLowerCase().includes(harvesterName));
    return sendJson(res, 200, harvests);
  }
  if (req.method === 'PATCH' && path === '/harvests/update') {
    const item = state.harvests.find((harvestItem) => String(harvestItem.id) === String(body.id));
    if (!item) return sendJson(res, 404, { message: 'Harvest not found' });
    item.status = body.status;
    item.rejectionReason = body.rejectionReason;
    item.updatedAt = now;
    return sendJson(res, 200, item);
  }
  if (req.method === 'GET' && path === '/actuator/health') return sendJson(res, 200, { status: 'UP' });
  return sendJson(res, 404, { error: `Unhandled harvest ${req.method} ${path}` });
}

function handleShipment(req, res, path, url, body) {
  if (req.method === 'GET' && path === '/api/shipments/available-supirs') {
    return sendJson(res, 200, [{ userId: 'supir-1', name: 'Supir Satu', plantationId: 'plant-1' }]);
  }
  if (req.method === 'GET' && path === '/api/shipments') {
    let shipments = [...state.shipments];
    const supirUserId = url.searchParams.get('supirUserId');
    if (supirUserId) shipments = shipments.filter((item) => String(item.supirUserId) === String(supirUserId));
    return sendJson(res, 200, shipments);
  }
  if (req.method === 'POST' && path === '/api/shipments') {
    const created = shipment(`ship-${state.nextShipmentId++}`, body.status || 'MEMUAT', {
      mandorUserId: 'mandor-1',
      supirUserId: body.supirUserId,
      destination: body.destination,
      items: body.items || [],
      totalKg: body.weight || body.items?.reduce((sum, item) => sum + Number(item.weightKg || 0), 0) || 0,
      weight: body.weight || 0,
    });
    state.shipments.unshift(created);
    return sendJson(res, 201, created);
  }

  const actionMatch = path.match(/^\/api\/shipments\/([^/]+)\/(status|mandor-approval|admin-approval)$/);
  if (actionMatch) {
    const [, id, action] = actionMatch;
    const item = state.shipments.find((shipmentItem) => String(shipmentItem.id) === String(id));
    if (!item) return sendJson(res, 404, { message: 'Shipment not found' });
    item.status = body.status;
    if (action === 'admin-approval') {
      item.rejectionReason = body.rejectionReason;
      item.kgAccepted = body.kgAccepted;
      item.adminReviewedAt = now;
    }
    if (action === 'mandor-approval') item.mandorReviewedAt = now;
    item.updatedAt = now;
    return sendJson(res, 200, item);
  }

  if (req.method === 'GET' && path === '/api/shipments/health') return sendJson(res, 200, { status: 'UP' });
  return sendJson(res, 404, { error: `Unhandled shipment ${req.method} ${path}` });
}

function handlePayroll(req, res, path, url, body) {
  if (req.method === 'GET' && path === '/api/payrolls') {
    let payrolls = [...state.payrolls];
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    if (userId) payrolls = payrolls.filter((item) => String(item.userId) === String(userId));
    if (status) payrolls = payrolls.filter((item) => item.status === status);
    return sendJson(res, 200, payrolls);
  }
  const byUserMatch = path.match(/^\/api\/payrolls\/user\/([^/]+)$/);
  if (req.method === 'GET' && byUserMatch) {
    return sendJson(res, 200, state.payrolls.filter((item) => String(item.userId) === String(byUserMatch[1])));
  }
  if (req.method === 'POST' && path === '/api/payrolls') {
    const created = payroll(state.nextPayrollId++, body.userId, body.roleType || 'BURUH', body.status || 'PENDING', {
      baseAmount: Number(body.baseAmount || 0),
      bonusAmount: Number(body.bonusAmount || 0),
      deductionAmount: Number(body.deductionAmount || 0),
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      paymentMethod: body.paymentMethod,
      notes: body.notes || '',
    });
    state.payrolls.unshift(created);
    return sendJson(res, 201, created);
  }

  const actionMatch = path.match(/^\/api\/payrolls\/([^/]+)\/(approve|accept|reject|pay)$/);
  if (actionMatch) {
    const [, id, action] = actionMatch;
    const item = state.payrolls.find((payrollItem) => String(payrollItem.id) === String(id));
    if (!item) return sendJson(res, 404, { message: 'Payroll not found' });
    if (action === 'approve') item.status = 'APPROVED';
    if (action === 'accept') item.status = 'ACCEPTED';
    if (action === 'reject') {
      item.status = 'REJECTED';
      item.rejectionReason = body.reason;
    }
    if (action === 'pay') {
      item.status = 'PAID';
      item.walletSettled = true;
    }
    item.updatedAt = now;
    return sendJson(res, 200, item);
  }

  const byIdMatch = path.match(/^\/api\/payrolls\/([^/]+)$/);
  if (byIdMatch) {
    const index = state.payrolls.findIndex((item) => String(item.id) === String(byIdMatch[1]));
    if (index < 0) return sendJson(res, 404, { message: 'Payroll not found' });
    if (req.method === 'GET') return sendJson(res, 200, state.payrolls[index]);
    if (req.method === 'DELETE') {
      state.payrolls.splice(index, 1);
      return sendJson(res, 204, {});
    }
  }

  if (req.method === 'GET' && path === '/actuator/health') return sendJson(res, 200, { status: 'UP' });
  return sendJson(res, 404, { error: `Unhandled payroll ${req.method} ${path}` });
}

async function startFrontend() {
  const env = {
    ...process.env,
    IDENTITY_SERVICE_URL: `${MOCK_URL}/identity`,
    PLANTATION_SERVICE_URL: `${MOCK_URL}/plantation`,
    HARVEST_SERVICE_URL: `${MOCK_URL}/harvest`,
    SHIPMENT_SERVICE_URL: `${MOCK_URL}/shipment`,
    PAYROLL_SERVICE_URL: `${MOCK_URL}/payroll`,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'flow-audit-google-client',
  };

  const child = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(FRONTEND_PORT)], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => process.stdout.write(`[next] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[next] ${data}`));

  log(`starting frontend at ${FRONTEND_URL}`);
  await waitForHttp(FRONTEND_URL);

  return {
    close: async () => {
      if (!child.killed) child.kill();
      await delay(500);
    },
  };
}

async function waitForHttp(url) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function waitForText(driver, text) {
  try {
    await driver.wait(until.elementLocated(By.xpath(`//*[contains(normalize-space(.), ${escapeXPath(text)})]`)), WAIT_TIMEOUT_MS);
  } catch (error) {
    const body = await driver.findElement(By.css('body')).getText().catch(() => '');
    console.error(`[flow-e2e] could not find text "${text}". Current body:\n${body.slice(0, 3000)}`);
    throw error;
  }
}

async function findClickable(driver, xpath) {
  let element;
  try {
    element = await driver.wait(until.elementLocated(By.xpath(xpath)), WAIT_TIMEOUT_MS);
  } catch (error) {
    const body = await driver.findElement(By.css('body')).getText().catch(() => '');
    console.error(`[flow-e2e] could not locate xpath "${xpath}". Current body:\n${body.slice(0, 3000)}`);
    throw error;
  }
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

async function clickXPath(driver, xpath) {
  const element = await findClickable(driver, xpath);
  try {
    await element.click();
  } catch {
    await driver.executeScript(
      "arguments[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));",
      element,
    );
  }
}

async function clickVisibleButtonByText(driver, text, index = 0) {
  const clicked = await driver.executeScript(
    `const buttons = Array.from(document.querySelectorAll('button'))
      .filter((button) => button.textContent && button.textContent.includes(arguments[0]))
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !button.disabled;
      });
    const button = buttons[arguments[1]];
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;`,
    text,
    index,
  );
  assert(clicked, `No visible enabled button found for text ${text} at index ${index}`);
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

async function clickCheckboxNearText(driver, text) {
  const element = await findClickable(driver, `//*[contains(normalize-space(.), ${escapeXPath(text)})]/ancestor::label[1]//input[@type='checkbox']`);
  await element.click();
}

async function setAuth(driver, role) {
  const auth = authFor(role);
  await driver.get(FRONTEND_URL);
  await driver.executeScript(
    `localStorage.clear();
     localStorage.setItem('authToken', arguments[0].token);
     localStorage.setItem('refreshToken', arguments[0].refreshToken);
     localStorage.setItem('userId', String(arguments[0].id));
     localStorage.setItem('username', arguments[0].username);
     localStorage.setItem('userEmail', arguments[0].email);
     localStorage.setItem('userRole', arguments[0].role);
     localStorage.setItem('googleLinked', 'false');
     localStorage.setItem('hasPassword', 'true');`,
    auth,
  );
}

async function openAs(driver, role, path, expectedText) {
  await setAuth(driver, role);
  await driver.get(`${FRONTEND_URL}${path}`);
  if (expectedText) await waitForText(driver, expectedText);
}

function recentCall(predicate) {
  return [...state.calls].reverse().find(predicate);
}

async function waitForRecordedCall(afterIndex, predicate, description) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const match = state.calls.slice(afterIndex).find(predicate);
    if (match) return match;
    await delay(100);
  }
  throw new Error(`Timed out waiting for recorded call: ${description}`);
}

async function acceptAlert(driver, text) {
  const alert = await driver.wait(until.alertIsPresent(), WAIT_TIMEOUT_MS);
  if (text !== undefined) await alert.sendKeys(text);
  await alert.accept();
}

async function runAuthFlows(driver) {
  log('auth/register flows');
  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel(driver, 'Nama Pengguna', 'mandorbaru');
  await fillByLabel(driver, 'Email', 'mandorbaru@mysawit.test');
  await fillByLabel(driver, 'Password', 'secret123');
  await fillByLabel(driver, 'Konfirmasi Password', 'secret124');
  await clickText(driver, 'Daftar');
  await waitForText(driver, 'Konfirmasi password belum sama');

  await driver.get(`${FRONTEND_URL}/register`);
  await fillByLabel(driver, 'Nama Pengguna', 'mandorbaru');
  await fillByLabel(driver, 'Daftar Sebagai', 'Mandor');
  await fillByLabel(driver, 'Nomor Sertifikasi', 'CERT-NEW');
  await fillByLabel(driver, 'Email', 'mandorbaru@mysawit.test');
  await fillByLabel(driver, 'Password', 'secret123');
  await fillByLabel(driver, 'Konfirmasi Password', 'secret123');
  await clickText(driver, 'Daftar');
  await driver.wait(until.urlContains('/login'), WAIT_TIMEOUT_MS);
  const registerCall = recentCall((call) => call.path.endsWith('/api/auth/register'));
  assert(registerCall?.body.role === 'MANDOR', 'register did not submit MANDOR role');
  assert(registerCall?.body.certificationNumber === 'CERT-NEW', 'register did not submit certification number');

  const redirects = [
    ['admin@mysawit.test', '/admin/dashboard'],
    ['mandor@mysawit.test', '/mandor/plantations'],
    ['buruh@mysawit.test', '/harvest'],
    ['supir@mysawit.test', '/shipment/active'],
  ];

  for (const [email, path] of redirects) {
    await driver.get(`${FRONTEND_URL}/login`);
    await fillByLabel(driver, 'Email', email);
    await fillByLabel(driver, 'Password', 'secret123');
    await clickText(driver, 'Masuk');
    await driver.wait(until.urlContains(path), WAIT_TIMEOUT_MS);
  }
}

async function runAdminFlows(driver) {
  log('admin dashboard/users/plantations/shipment/payroll flows');
  await openAs(driver, 'ADMIN', '/admin/dashboard', 'Ringkasan Data');
  await waitForText(driver, 'Anggota Tim');
  await clickText(driver, 'Perbarui Data');

  await openAs(driver, 'ADMIN', '/admin/users', 'Clear Filters');
  await fillByLabel(driver, 'Name', 'Buruh');
  await fillByLabel(driver, 'Role', 'Buruh');
  await waitForText(driver, 'Buruh Satu');
  await clickText(driver, 'Clear Filters');
  await waitForText(driver, 'Admin Utama');
  await driver.executeScript('window.confirm = () => true;');
  await clickText(driver, 'View');
  await waitForText(driver, 'Informasi Akun');
  await driver.navigate().back();
  await waitForText(driver, 'Clear Filters');

  await openAs(driver, 'ADMIN', '/admin/plantations', 'Manajemen Kebun');
  await clickText(driver, '+ Tambah Kebun');
  await fillByLabel(driver, 'Nama Kebun', 'Kebun Selenium');
  await fillByLabel(driver, 'Lokasi', 'Bekasi');
  await fillByLabel(driver, 'Luas (hektare)', '18.5');
  await fillByLabel(driver, 'Deskripsi', 'Dibuat dari Selenium');
  await clickText(driver, 'Buat Kebun');
  await waitForText(driver, 'Kebun berhasil dibuat');
  const createPlantationCall = recentCall((call) => call.path.endsWith('/api/plantations') && call.method === 'POST');
  assert(createPlantationCall?.body.name === 'Kebun Selenium', 'plantation create did not submit name');
  assert(createPlantationCall?.body.area === 18.5, 'plantation create did not submit numeric area');

  await clickText(driver, 'Penugasan Mandor');
  await fillByLabel(driver, 'Kebun', 'Kebun Beta - Depok');
  await fillByLabel(driver, 'Mandor', 'Mandor Satu');
  await clickText(driver, 'Simpan Penugasan');
  await waitForText(driver, 'Mandor berhasil ditugaskan');

  await clickXPath(driver, "//div[contains(@class, 'tab-bar')]//button[normalize-space(.)='Penugasan Buruh']");
  await waitForText(driver, 'Assign Mandor ke Buruh');
  await fillByLabel(driver, 'Kebun', 'Kebun Alpha - Bogor');
  await fillByLabel(driver, 'Buruh', 'Buruh Dua');
  await clickXPath(driver, "//h3[contains(normalize-space(.), 'Assign Mandor ke Buruh')]/following::form[1]//button[@type='submit']");
  await waitForText(driver, 'Mandor berhasil ditugaskan ke buruh');

  await clickXPath(driver, "//div[contains(@class, 'tab-bar')]//button[normalize-space(.)='Penugasan Supir']");
  await waitForText(driver, 'Assign Supir ke Kebun');
  await fillByLabel(driver, 'Kebun', 'Kebun Alpha - Bogor');
  await fillByLabel(driver, 'Supir', 'Supir Satu');
  await clickXPath(driver, "//h3[contains(normalize-space(.), 'Assign Supir ke Kebun')]/following::form[1]//button[@type='submit']");
  await waitForText(driver, 'Supir berhasil ditugaskan');

  await openAs(driver, 'ADMIN', '/admin/shipments', 'Pusat Persetujuan Admin');
  let afterCall = state.calls.length;
  await clickText(driver, 'Setujui Penuh');
  await waitForRecordedCall(
    afterCall,
    (call) => call.path.includes('/admin-approval') && call.body.status === 'ADMIN_APPROVED',
    'admin full shipment approval',
  );
  await waitForText(driver, '#ship-3');
  await clickVisibleButtonByText(driver, 'Koreksi Parsial', 0);
  await fillByLabel(driver, 'Berat yang disetujui (Kg)', '55');
  await fillByLabel(driver, 'Alasan Koreksi', 'Sortasi ulang');
  await clickText(driver, 'Simpan Keputusan');
  await waitForRecordedCall(
    afterCall,
    (call) => call.path.includes('/admin-approval') && call.body.status === 'PARTIALLY_REJECTED',
    'admin partial shipment approval',
  );
  const partialCall = recentCall((call) => call.path.includes('/admin-approval') && call.body.status === 'PARTIALLY_REJECTED');
  assert(partialCall?.body.kgAccepted === 55, 'partial admin approval did not submit kgAccepted');
  await waitForText(driver, '#ship-4');
  afterCall = state.calls.length;
  await clickVisibleButtonByText(driver, 'Tolak', 0);
  await fillByLabel(driver, 'Alasan Penolakan', 'Dokumen kurang');
  await delay(250);
  await clickText(driver, 'Simpan Keputusan');
  const rejectShipmentCall = await waitForRecordedCall(
    afterCall,
    (call) => call.path.includes('/admin-approval') && call.body.status === 'ADMIN_REJECTED',
    'admin shipment reject',
  );
  assert(rejectShipmentCall?.body.rejectionReason === 'Dokumen kurang', 'admin reject did not submit reason');

  await openAs(driver, 'ADMIN', '/admin/payroll', 'Gaji dan Pembayaran');
  await clickText(driver, '+ Add Payroll');
  await fillByLabel(driver, 'User', 'Buruh Satu');
  await fillByLabel(driver, 'Base Amount (IDR)', '1600000');
  await fillByLabel(driver, 'Bonus Amount (IDR)', '100000');
  await fillByLabel(driver, 'Deduction Amount (IDR)', '25000');
  await fillByLabel(driver, 'Period Start', '05/01/2026');
  await fillByLabel(driver, 'Period End', '05/31/2026');
  await fillByLabel(driver, 'Payment Method', 'BANK_TRANSFER');
  await fillByLabel(driver, 'Notes (optional)', 'Payroll Selenium');
  await clickText(driver, 'Create Payroll');
  await waitForText(driver, 'Payroll #30');
  const createPayrollCall = recentCall((call) => call.path.endsWith('/api/payrolls') && call.method === 'POST');
  assert(createPayrollCall?.body.baseAmount === 1600000, 'payroll create did not submit baseAmount');
  assert(createPayrollCall?.body.roleType === 'BURUH', 'payroll create did not infer roleType');
  await clickText(driver, 'Approve');
  await waitForText(driver, 'APPROVED');
  await delay(250);
  await clickVisibleButtonByText(driver, 'Mark as Paid', 0);
  await waitForText(driver, 'PAID');
  await waitForText(driver, 'Payroll #1');
  afterCall = state.calls.length;
  await clickXPath(driver, "//*[contains(normalize-space(.), 'Payroll #1')]/ancestor::article[1]//button[contains(normalize-space(.), 'Reject')]");
  await acceptAlert(driver, 'Ditolak audit');
  const rejectPayrollCall = await waitForRecordedCall(
    afterCall,
    (call) => call.path.includes('/reject'),
    'admin payroll reject',
  );
  assert(rejectPayrollCall?.body.reason === 'Ditolak audit', 'payroll reject did not submit prompt reason');
}

async function runMandorFlows(driver) {
  log('mandor plantation/harvest/shipment/payroll flows');
  await openAs(driver, 'MANDOR', '/mandor/plantations', 'Kebun Saya');
  await waitForText(driver, 'Kebun Alpha');

  await openAs(driver, 'MANDOR', '/mandor/harvest', 'Persetujuan Panen');
  await fillByLabel(driver, 'Nama Buruh', 'Buruh');
  await fillByLabel(driver, 'Status', 'Menunggu');
  await clickText(driver, 'Terapkan Filter');
  await waitForText(driver, 'Buruh Satu');
  await clickText(driver, 'Setujui');
  await waitForText(driver, 'Disetujui');
  await clickText(driver, 'Tolak');
  await acceptAlert(driver, 'Kualitas kurang');
  await waitForText(driver, 'Kualitas kurang');
  const rejectHarvestCall = recentCall((call) => call.path.endsWith('/harvests/update') && call.body.status === 'REJECTED');
  assert(rejectHarvestCall?.body.rejectionReason === 'Kualitas kurang', 'harvest reject did not submit reason');

  await openAs(driver, 'MANDOR', '/mandor/shipment', 'Pengiriman Panen');
  await clickText(driver, '+ Buat Pengiriman');
  await waitForText(driver, 'Tugaskan Pengiriman Baru');
  await fillByLabel(driver, 'Pilih Supir Truk', 'Supir Satu');
  await fillByLabel(driver, 'Tujuan Pabrik', 'Pabrik Selenium');
  await clickCheckboxNearText(driver, '450 kg');
  const disabled = await driver.findElement(By.xpath("//button[contains(normalize-space(.), 'Tugaskan Pengiriman')]")).getAttribute('disabled');
  assert(disabled !== null, 'shipment submit should be disabled when total exceeds 400 kg');
  await clickCheckboxNearText(driver, '450 kg');
  await clickCheckboxNearText(driver, '120 kg');
  await clickText(driver, 'Tugaskan Pengiriman');
  await waitForText(driver, 'Pabrik Selenium');
  const createShipmentCall = recentCall((call) => call.path.endsWith('/api/shipments') && call.method === 'POST');
  assert(createShipmentCall?.body.destination === 'Pabrik Selenium', 'shipment create did not submit destination');
  assert(createShipmentCall?.body.items?.length === 1, 'shipment create did not submit selected harvest item');
  await clickText(driver, 'Setujui');
  await waitForText(driver, 'Persetujuan selesai');
  const afterCall = state.calls.length;
  await clickText(driver, 'Tolak');
  await acceptAlert(driver, 'Muatan tidak sesuai');
  const mandorRejectCall = await waitForRecordedCall(
    afterCall,
    (call) => call.path.includes('/mandor-approval') && call.body.status === 'MANDOR_REJECTED',
    'mandor shipment reject',
  );
  assert(mandorRejectCall?.body.rejectionReason === 'Muatan tidak sesuai', 'mandor shipment reject did not submit reason');

  await openAs(driver, 'MANDOR', '/mandor/payroll', 'Validasi Gaji');
  await clickText(driver, 'Bawahan');
  await clickVisibleButtonByText(driver, 'Validasi', 0);
  await waitForText(driver, 'Sudah divalidasi');
  await driver.executeScript('window.prompt = () => "Tidak sesuai";');
  const payrollRejectAfterCall = state.calls.length;
  await clickVisibleButtonByText(driver, 'Tolak', 0);
  const mandorPayrollRejectCall = await waitForRecordedCall(
    payrollRejectAfterCall,
    (call) => call.path.includes('/api/payrolls/') && call.path.endsWith('/reject'),
    'mandor payroll reject',
  );
  assert(mandorPayrollRejectCall?.body.reason === 'Tidak sesuai', 'mandor payroll reject did not submit reason');
}

async function runWorkerFlows(driver) {
  log('worker harvest/payroll/shipment flows');
  await openAs(driver, 'BURUH', '/harvest', 'Catatan Panen Saya');
  await waitForText(driver, 'Total Panen');
  await waitForText(driver, 'Foto kurang jelas');

  await openAs(driver, 'BURUH', '/payroll', 'Slip Gaji Saya');
  await clickText(driver, 'Konfirmasi Slip Gaji');
  await waitForText(driver, 'Anda telah mengkonfirmasi');

  await openAs(driver, 'SUPIR', '/shipment/active', 'Pengiriman Aktif');
  await clickText(driver, 'Mulai Pengiriman');
  await waitForText(driver, 'Dalam Perjalanan');
  await clickText(driver, 'Tandai Tiba');
  await waitForText(driver, 'Tidak ada pengiriman aktif');

  await openAs(driver, 'SUPIR', '/shipment/history', 'Riwayat Pengiriman');
  await waitForText(driver, 'Pabrik Selesai');
  await waitForText(driver, 'Berat tidak cocok');
}

async function run() {
  let mockBackend;
  let frontend;
  let driver;

  try {
    mockBackend = await startMockBackend();
    frontend = await startFrontend();
    driver = await buildDriver();

    await runAuthFlows(driver);
    await runAdminFlows(driver);
    await runMandorFlows(driver);
    await runWorkerFlows(driver);

    log(`covered ${state.calls.length} mocked backend calls`);
    log('frontend Selenium flow audit passed');
  } finally {
    if (driver) await driver.quit().catch(() => {});
    if (frontend) await frontend.close();
    if (mockBackend) await mockBackend.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
