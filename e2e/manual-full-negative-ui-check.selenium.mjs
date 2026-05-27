#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, Key, until } = webdriver;

const BASE_URL = process.env.MYSAWIT_FRONTEND_URL || 'http://localhost:3000';
const WAIT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 25000);
const HEADLESS = process.env.E2E_HEADLESS === 'true';
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const ARTIFACT_DIR = path.join(process.cwd(), 'e2e', 'artifacts', `full-negative-${RUN_ID}`);

const accounts = {
  admin: { email: process.env.MYSAWIT_ADMIN_EMAIL || 'admin@mysawit.com', password: process.env.MYSAWIT_ADMIN_PASSWORD || 'admin123' },
  mandor: { email: process.env.MYSAWIT_MANDOR_EMAIL || 'mandor_manual@mysawit.com', password: process.env.MYSAWIT_MANDOR_PASSWORD || 'mandor123' },
  buruh: { email: process.env.MYSAWIT_BURUH_EMAIL || 'buruh_manual@mysawit.com', password: process.env.MYSAWIT_BURUH_PASSWORD || 'buruh123' },
  supir: { email: process.env.MYSAWIT_SUPIR_EMAIL || 'supir_manual@mysawit.com', password: process.env.MYSAWIT_SUPIR_PASSWORD || 'supir123' },
};

let driver;
const results = [];
let reviewShipment = null;

const log = (message) => console.log(`[full-negative-ui] ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function xpathText(text) {
  if (!text.includes("'")) return `'${text}'`;
  if (!text.includes('"')) return `"${text}"`;
  return `concat('${text.replaceAll("'", "', \"'\", '")}')`;
}

function testId(id) {
  return By.css(`[data-testid="${id}"]`);
}

async function screenshot(name) {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const file = path.join(ARTIFACT_DIR, `${name}.png`);
  await fs.writeFile(file, await driver.takeScreenshot(), 'base64');
  return file;
}

async function bodyText() {
  return driver.findElement(By.css('body')).getText();
}

async function waitForText(text, timeout = WAIT_MS) {
  return driver.wait(
    until.elementLocated(By.xpath(`//*[contains(normalize-space(.), ${xpathText(text)})]`)),
    timeout,
  );
}

async function clickElement(element) {
  await driver.executeScript('arguments[0].scrollIntoView({ block: "center", inline: "center" });', element);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  try {
    await element.click();
  } catch (error) {
    if (!String(error?.name || error?.message).includes('ElementClickIntercepted')) throw error;
    await driver.executeScript('arguments[0].click();', element);
  }
}

async function clickByText(text) {
  const element = await driver.wait(
    until.elementLocated(By.xpath(`(//button[contains(normalize-space(.), ${xpathText(text)})] | //a[contains(normalize-space(.), ${xpathText(text)})])[1]`)),
    WAIT_MS,
  );
  await clickElement(element);
}

async function fill(selector, value) {
  const element = await driver.wait(until.elementLocated(selector), WAIT_MS);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  await element.clear();
  await element.sendKeys(value);
  return element;
}

async function fieldByLabel(label) {
  return driver.wait(until.elementLocated(By.xpath(
    `(//label[contains(normalize-space(.), ${xpathText(label)})]//*[self::input or self::textarea or self::select][1] | //label[contains(normalize-space(.), ${xpathText(label)})]/following::*[self::input or self::textarea or self::select][1])[1]`,
  )), WAIT_MS);
}

async function fillByLabel(label, value) {
  const element = await fieldByLabel(label);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  const tag = await element.getTagName();
  if (tag !== 'select') await element.clear();
  await element.sendKeys(value);
  return element;
}

async function clearByLabel(label) {
  const element = await fieldByLabel(label);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  await element.clear();
  return element;
}

async function clearWithKeyboard(element) {
  await clickElement(element);
  await element.sendKeys(Key.chord(Key.COMMAND, 'a'));
  await element.sendKeys(Key.BACK_SPACE);
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
  await element.sendKeys(Key.BACK_SPACE);
}

async function acceptPromptBlank() {
  const alert = await driver.wait(until.alertIsPresent(), WAIT_MS);
  await alert.accept();
}

async function acceptPromptText(text) {
  const alert = await driver.wait(until.alertIsPresent(), WAIT_MS);
  await alert.sendKeys(text);
  await alert.accept();
}

async function acceptConfirm() {
  const alert = await driver.wait(until.alertIsPresent(), WAIT_MS);
  await alert.accept();
}

async function logout() {
  await driver.executeScript('window.localStorage.clear()');
  await driver.get(`${BASE_URL}/login`);
}

async function login(account) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await driver.get(`${BASE_URL}/login`);
    await fill(testId('login-email-input'), account.email);
    await fill(testId('login-password-input'), account.password);
    await clickElement(await driver.findElement(testId('login-submit-button')));
    try {
      await driver.wait(async () => {
        const token = await driver.executeScript("return window.localStorage.getItem('authToken')");
        return Boolean(token);
      }, WAIT_MS);
      return;
    } catch (error) {
      const page = await bodyText();
      if (attempt === 1 && /Too many login attempts/i.test(page)) {
        log('rate limit login aktif; menunggu refill 65 detik');
        await sleep(65000);
        continue;
      }
      const currentUrl = await driver.getCurrentUrl().catch(() => BASE_URL);
      const file = await screenshot(`login-failed-${account.email.replaceAll(/[^a-z0-9]+/gi, '-')}`);
      throw new Error(`Login gagal untuk ${account.email} di ${currentUrl}: ${page.slice(0, 500)} (screenshot: ${file})`);
    }
  }
}

async function authFetch(pathname, init = {}) {
  const result = await driver.executeAsyncScript((pathArg, initArg, callback) => {
    const token = window.localStorage.getItem('authToken');
    const userId = window.localStorage.getItem('userId');
    const username = window.localStorage.getItem('username');
    const role = window.localStorage.getItem('userRole');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (userId) {
      headers['X-User-Id'] = userId;
      headers['X-Requester-Id'] = userId;
    }
    if (username) headers['X-User-Name'] = username;
    if (role) {
      headers['X-User-Role'] = role;
      if (userId && role === 'BURUH') {
        headers['X-Harvester-Id'] = userId;
        headers['X-Harvester-Name'] = username || userId;
      }
      if (userId && role === 'MANDOR') headers['X-Foreman-Id'] = userId;
    }

    fetch(pathArg, {
      method: initArg.method || 'GET',
      headers,
      body: initArg.body === undefined ? undefined : JSON.stringify(initArg.body),
    })
      .then(async (response) => {
        const text = await response.text();
        let body = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = text;
        }
        callback({ ok: response.ok, status: response.status, body, text });
      })
      .catch((error) => callback({ ok: false, status: 0, error: error.message }));
  }, pathname, init);

  if (!result.ok) {
    throw new Error(`${pathname} -> ${result.status}: ${result.error || result.text || JSON.stringify(result.body)}`);
  }
  return result.body;
}

async function runCheck(name, fn) {
  try {
    await fn();
    const file = await screenshot(name.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase());
    results.push({ name, status: 'PASS', screenshot: file });
    log(`PASS ${name}`);
  } catch (error) {
    const file = await screenshot(`${name.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase()}-failed`);
    results.push({ name, status: 'FAIL', screenshot: file, error: error.message });
    log(`FAIL ${name}: ${error.message}`);
  }
}

async function oauthButtonExists() {
  await driver.get(`${BASE_URL}/login`);
  await waitForText('Login dengan Google');
}

async function harvestRejectRequiresReason() {
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await waitForMandorHarvestLoaded();
  const rejectButtons = await driver.findElements(By.xpath(`//button[normalize-space(.)='Tolak']`));
  if (rejectButtons.length === 0) {
    throw new Error('Tidak ada harvest PENDING untuk diuji reject tanpa alasan');
  }
  await clickElement(rejectButtons[0]);
  await acceptPromptBlank();
  await waitForText('Alasan penolakan wajib diisi');
  assert.match(await bodyText(), /Menunggu/);
}

async function mandorOnlySeesAssignedBuruhHarvests() {
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await waitForMandorHarvestLoaded();
  const page = await bodyText();
  assert.match(page, /buruh_manual/);
  assert.doesNotMatch(page, /real-e2e|unassigned|outside/i);
}

async function waitForMandorHarvestLoaded() {
  await waitForText('Persetujuan Panen');
  await driver.wait(async () => !(await bodyText()).includes('Memuat daftar panen...'), WAIT_MS);
}

async function openMandorShipmentForm() {
  await driver.get(`${BASE_URL}/mandor/shipment`);
  await waitForText('Pengiriman Panen');
  await clickByText('+ Buat Pengiriman');
  await waitForText('Pilih Panen yang Akan Diangkut');
  const supirSelect = await driver.wait(until.elementLocated(By.css('select')), WAIT_MS);
  await driver.wait(async () => (await supirSelect.getAttribute('disabled')) === null, WAIT_MS);
  await driver.wait(
    async () => (await supirSelect.findElements(By.xpath(`.//option[contains(normalize-space(.), 'supir_manual')]`))).length > 0,
    WAIT_MS,
  );
  return supirSelect;
}

async function shipmentOverLimitBlocked() {
  const supirSelect = await openMandorShipmentForm();
  await waitForText('250 kg');
  await waitForText('200 kg');
  await supirSelect.sendKeys('supir_manual');
  await fillByLabel('Tujuan Pabrik', 'Pabrik negative overlimit');
  for (const weight of ['250 kg', '200 kg']) {
    const checkbox = await driver.wait(
      until.elementLocated(By.xpath(`//label[.//*[contains(normalize-space(.), ${xpathText(weight)})]]//input[@type='checkbox']`)),
      WAIT_MS,
    );
    await clickElement(checkbox);
  }
  await waitForText('450 kg / 400 kg');
  await waitForText('Total muatan melebihi kapasitas maksimum 400 kg');
  const submitButton = await driver.findElement(testId('shipment-create-button'));
  assert.equal(await submitButton.isEnabled(), false);
}

async function rejectedHarvestNotShownInShipmentOptions() {
  const supirSelect = await openMandorShipmentForm();
  assert.match(await supirSelect.getText(), /supir_manual/);
  const page = await bodyText();
  assert.doesNotMatch(page, /NEGATIVE TEST - reject harvest tanpa alasan/);
  assert.doesNotMatch(page, /75 kg/);
}

async function supirDifferentPlantationNotSelectable() {
  const supirSelect = await openMandorShipmentForm();
  const options = await supirSelect.getText();
  assert.match(options, /supir_manual/);
  assert.doesNotMatch(options, /beda|outside|other|lain/i);
}

async function findMandorReviewCandidate() {
  const shipments = await authFetch('/api/gateway/shipment/api/shipments?status=MANDOR_APPROVED');
  return Array.isArray(shipments) && shipments.length > 0 ? shipments[0] : null;
}

async function createShipmentCandidateIfNeeded() {
  const existing = await findMandorReviewCandidate();
  if (existing) {
    reviewShipment = existing;
    return;
  }

  const harvests = await authFetch('/api/gateway/harvest/harvests?status=APPROVED');
  const shipments = await authFetch('/api/gateway/shipment/api/shipments');
  const claimed = new Set(
    (Array.isArray(shipments) ? shipments : [])
      .flatMap((shipment) => shipment.items || [])
      .map((item) => String(item.harvestId)),
  );
  const candidates = (Array.isArray(harvests) ? harvests : [])
    .filter((harvest) => harvest.status === 'APPROVED' && Number(harvest.weight) > 0 && Number(harvest.weight) <= 400)
    .filter((harvest) => !claimed.has(String(harvest.id)))
    .sort((a, b) => Number(a.weight) - Number(b.weight));

  if (candidates.length === 0) {
    throw new Error('Tidak ada harvest APPROVED yang belum diklaim shipment untuk membuat kandidat admin review');
  }

  const candidate = candidates[0];
  const destination = `Pabrik admin negative ${RUN_ID}`;
  const supirSelect = await openMandorShipmentForm();
  await supirSelect.sendKeys('supir_manual');
  await fillByLabel('Tujuan Pabrik', destination);
  const checkbox = await driver.wait(
    until.elementLocated(By.xpath(`//label[.//*[contains(normalize-space(.), ${xpathText(`${candidate.weight} kg`)})]]//input[@type='checkbox']`)),
    WAIT_MS,
  );
  await clickElement(checkbox);
  await clickElement(await driver.findElement(testId('shipment-create-button')));
  await waitForText(destination);
  reviewShipment = { destination, status: 'MEMUAT', totalKg: Number(candidate.weight) };
}

async function supirProgressCandidateToTiba() {
  if (!reviewShipment || reviewShipment.status === 'MANDOR_APPROVED') return;
  await driver.get(`${BASE_URL}/shipment/active`);
  await waitForText('Pengiriman Aktif');
  await waitForText(reviewShipment.destination);
  const page = await bodyText();
  if (/Mulai Pengiriman/.test(page)) {
    await clickElement(await driver.findElement(By.xpath(`//div[.//*[contains(normalize-space(.), ${xpathText(reviewShipment.destination)})]]//button[contains(normalize-space(.), 'Mulai Pengiriman')]`)));
    await waitForText('Tandai Tiba');
  }
  await clickElement(await driver.findElement(By.xpath(`//button[contains(normalize-space(.), 'Tandai Tiba')]`)));
  await driver.wait(async () => !(await bodyText()).includes(reviewShipment.destination), WAIT_MS);
  reviewShipment.status = 'TIBA';
}

async function supirCannotOpenMandorHarvestApproval() {
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await driver.sleep(1000);
  const currentUrl = await driver.getCurrentUrl();
  const page = await bodyText();
  assert.ok(!currentUrl.includes('/mandor/harvest') || /akses|unauthorized|forbidden|tidak berhak|dashboard/i.test(page));
}

async function approveCandidateByMandor() {
  const existing = await findMandorReviewCandidate();
  if (existing) {
    reviewShipment = existing;
    return;
  }
  if (!reviewShipment) throw new Error('Tidak ada kandidat shipment untuk approval Mandor');
  await driver.get(`${BASE_URL}/mandor/shipment`);
  await waitForText('Pengiriman Panen');
  await waitForText(reviewShipment.destination);
  await clickElement(await driver.findElement(By.xpath(`//div[.//*[contains(normalize-space(.), ${xpathText(reviewShipment.destination)})]]//button[normalize-space(.)='Setujui']`)));
  await driver.wait(async () => /Persetujuan selesai|Disetujui Mandor/i.test(await bodyText()), WAIT_MS);
  const refreshed = await findMandorReviewCandidate();
  reviewShipment = refreshed || { ...reviewShipment, status: 'MANDOR_APPROVED' };
}

async function mandorCannotCreatePlantation() {
  await driver.get(`${BASE_URL}/admin/plantations`);
  await driver.sleep(1000);
  const currentUrl = await driver.getCurrentUrl();
  const page = await bodyText();
  assert.ok(!currentUrl.includes('/admin/plantations') || /akses|unauthorized|forbidden|tidak berhak|dashboard/i.test(page));
}

async function ensureAdminReviewCandidateVisible() {
  await driver.get(`${BASE_URL}/admin/shipments`);
  await waitForText('Pusat Persetujuan Admin');
  if (reviewShipment?.destination) {
    await waitForText(reviewShipment.destination);
  } else {
    await waitForText('Setujui Penuh');
  }
}

async function adminRejectShipmentRequiresReason() {
  await ensureAdminReviewCandidateVisible();
  await clickElement(await driver.findElement(By.xpath(`(//button[normalize-space(.)='Tolak'])[1]`)));
  await waitForText('Tolak Pengiriman');
  await clickByText('Simpan Keputusan');
  await waitForText('Alasan penolakan wajib diisi');
  await clickByText('Batal');
}

async function adminPartialRejectValidatesFields() {
  await ensureAdminReviewCandidateVisible();
  await clickElement(await driver.findElement(By.xpath(`(//button[contains(normalize-space(.), 'Koreksi Parsial')])[1]`)));
  await waitForText('Koreksi Parsial');
  await clickByText('Simpan Keputusan');
  await waitForText('Alasan koreksi parsial wajib diisi');

  await fill(By.css('textarea[name="reason"]'), 'uji parsial tanpa kg');
  await clickByText('Simpan Keputusan');
  await waitForText('Kilogram sawit yang diakui wajib diisi');

  await fill(By.css('input[name="kgAccepted"]'), '999999');
  await clickByText('Simpan Keputusan');
  await waitForText('Kilogram sawit yang diakui tidak boleh melebihi total pengiriman');
  await clickByText('Batal');
}

async function adminSelfDeleteHidden() {
  await driver.get(`${BASE_URL}/admin/users`);
  await waitForText('admin@mysawit.com');
  await fillByLabel('Email', accounts.admin.email);
  await driver.wait(async () => (await bodyText()).includes(accounts.admin.email), WAIT_MS);
  const adminRows = await driver.findElements(By.xpath(`//tr[.//*[contains(normalize-space(.), ${xpathText(accounts.admin.email)})]]`));
  assert.ok(adminRows.length > 0, 'Admin row tidak ditemukan');
  assert.doesNotMatch(await adminRows[0].getText(), /\bHapus\b/);
}

async function openPlantationForm() {
  await driver.get(`${BASE_URL}/admin/plantations`);
  await waitForText('Manajemen Kebun');
  await clickByText('Daftar Kebun');
  await clickByText('+ Tambah Kebun');
  await waitForText('Tambah Kebun Baru');
}

async function setCoordinates(coords) {
  const latInputs = await driver.findElements(By.css('input[placeholder="Lat"]'));
  const lonInputs = await driver.findElements(By.css('input[placeholder="Lon"]'));
  for (let i = 0; i < 4; i += 1) {
    await latInputs[i].clear();
    await latInputs[i].sendKeys(String(coords[i][0]));
    await lonInputs[i].clear();
    await lonInputs[i].sendKeys(String(coords[i][1]));
  }
}

async function validFarCoords(offset = 0) {
  const lat = -8.1 - offset / 1000;
  const lon = 110.1 + offset / 1000;
  return [[lat, lon], [lat, lon + 0.004], [lat - 0.004, lon + 0.004], [lat - 0.004, lon]];
}

async function fillPlantationForm({ code, name, area = '10', coords }) {
  await fillByLabel('Kode Unik Kebun', code);
  await fillByLabel('Nama Kebun', name);
  await fillByLabel('Lokasi', 'Lokasi negative test');
  await fillByLabel('Luas', area);
  if (coords) await setCoordinates(coords);
}

async function plantationRejectsInvalidArea() {
  await openPlantationForm();
  await fillPlantationForm({
    code: `NEG-AREA-${RUN_ID}`,
    name: `Negative Area ${RUN_ID}`,
    area: '0',
    coords: await validFarCoords(1),
  });
  await clickElement(await driver.findElement(testId('kebun-create-button')));
  await waitForText('Luas kebun harus lebih dari 0 hektare');
}

async function plantationRejectsIncompleteCoordinates() {
  await openPlantationForm();
  await fillPlantationForm({
    code: `NEG-COORD-${RUN_ID}`,
    name: `Negative Coord ${RUN_ID}`,
    area: '10',
    coords: await validFarCoords(2),
  });
  const latInputs = await driver.findElements(By.css('input[placeholder="Lat"]'));
  await clearWithKeyboard(latInputs[0]);
  assert.equal(await latInputs[0].getAttribute('value'), '');
  await clickElement(await driver.findElement(testId('kebun-create-button')));
  await waitForText('Koordinat 4 sudut wajib lengkap dan valid');
}

async function plantationRejectsDuplicateCode() {
  await openPlantationForm();
  await fillPlantationForm({
    code: 'KB-A-001',
    name: `Duplicate Code ${RUN_ID}`,
    area: '10',
    coords: await validFarCoords(3),
  });
  await clickElement(await driver.findElement(testId('kebun-create-button')));
  await driver.wait(async () => /kode|code|duplicate|already|exist|sudah/i.test(await bodyText()), WAIT_MS);
}

async function plantationRejectsOverlap() {
  await openPlantationForm();
  await fillPlantationForm({
    code: `NEG-OVR-${RUN_ID}`,
    name: `Negative Overlap ${RUN_ID}`,
    area: '10',
    coords: [
      [-6.200, 106.816],
      [-6.200, 106.826],
      [-6.210, 106.826],
      [-6.210, 106.816],
    ],
  });
  await clickElement(await driver.findElement(testId('kebun-create-button')));
  await driver.wait(async () => /overlap|tumpang|intersect|beririsan/i.test(await bodyText()), WAIT_MS);
}

async function plantationCodeDisabledOnEdit() {
  await driver.get(`${BASE_URL}/admin/plantations`);
  await waitForText('KB-A-001');
  const editButton = await driver.wait(
    until.elementLocated(By.xpath(`(//button[contains(normalize-space(.), 'Edit')][ancestor::*[contains(normalize-space(.), 'KB-A-001')]])[1]`)),
    WAIT_MS,
  );
  await clickElement(editButton);
  const codeInput = await fieldByLabel('Kode Unik Kebun');
  assert.equal(await codeInput.getAttribute('disabled'), 'true');
}

async function plantationDeleteWithMandorFails() {
  await driver.get(`${BASE_URL}/admin/plantations`);
  await waitForText('KB-A-001');
  const deleteButton = await driver.wait(
    until.elementLocated(By.xpath(`(//button[contains(normalize-space(.), 'Hapus')][ancestor::*[contains(normalize-space(.), 'KB-A-001')]])[1]`)),
    WAIT_MS,
  );
  await clickElement(deleteButton);
  await acceptConfirm();
  await driver.wait(async () => /Gagal|mandor|aktif|assigned/i.test(await bodyText()), WAIT_MS);
  assert.match(await bodyText(), /KB-A-001/);
}

async function payrollApproveInsufficientWallet() {
  await driver.get(`${BASE_URL}/admin/payroll`);
  await waitForText('Gaji #11');
  const beforeBalance = await driver.findElement(testId('wallet-balance')).getText();
  const approveButton = await driver.wait(
    until.elementLocated(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #11')]]//button[normalize-space(.)='Setujui']`)),
    WAIT_MS,
  );
  await clickElement(approveButton);
  await driver.wait(async () => /insufficient|saldo|balance|cukup/i.test(await bodyText()), WAIT_MS);
  const payrollCard = await driver.findElement(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #11')]]`));
  assert.match(await payrollCard.getText(), /MENUNGGU/i);
  assert.equal(await driver.findElement(testId('wallet-balance')).getText(), beforeBalance);
}

async function payrollRejectRequiresReason() {
  await driver.get(`${BASE_URL}/admin/payroll`);
  await waitForText('Gaji #12');
  const rejectButton = await driver.wait(
    until.elementLocated(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #12')]]//button[normalize-space(.)='Tolak']`)),
    WAIT_MS,
  );
  await clickElement(rejectButton);
  await acceptPromptBlank();
  await waitForText('Alasan penolakan gaji wajib diisi');
  const payrollCard = await driver.findElement(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #12')]]`));
  assert.match(await payrollCard.getText(), /MENUNGGU/i);
}

async function sandboxTopUpRejectsInvalidAmount() {
  await driver.get(`${BASE_URL}/admin/payroll`);
  await waitForText('Wallet Admin');
  const beforeBalance = await stableWalletBalance();
  await fillByLabel('Top Up SawitDollar', '0');
  await clickByText('Top Up');
  await waitForText('Jumlah top-up harus lebih dari 0 SawitDollar');
  assert.equal(await stableWalletBalance(), beforeBalance);
}

async function stableWalletBalance() {
  let previous = '';
  for (let i = 0; i < 12; i += 1) {
    const current = (await driver.findElement(testId('wallet-balance')).getText()).trim();
    if (current && current === previous) return current;
    previous = current;
    await sleep(500);
  }
  return previous;
}

async function buruhCannotOpenAdminPayroll() {
  await driver.get(`${BASE_URL}/admin/payroll`);
  await driver.sleep(1000);
  const currentUrl = await driver.getCurrentUrl();
  const page = await bodyText();
  assert.ok(!currentUrl.includes('/admin/payroll') || /akses|unauthorized|forbidden|tidak berhak|dashboard/i.test(page));
}

async function buruhHarvestPlantationSelectAndDuplicateGuard() {
  await driver.get(`${BASE_URL}/harvest`);
  await waitForText('Log Panen Baru');
  await waitForText('Catatan panen hari ini sudah tersimpan');
  const plantationSelect = await driver.wait(until.elementLocated(testId('harvest-plantation-select')), WAIT_MS);
  await driver.wait(async () => /KB-A-001 - Kebun test manual/.test(await plantationSelect.getText()), WAIT_MS);
  assert.equal(await plantationSelect.getTagName(), 'select');
  const submitButton = await driver.findElement(testId('harvest-create-button'));
  assert.equal(await submitButton.isEnabled(), false);
  assert.doesNotMatch(await bodyText(), /\bEdit\b/i);
}

async function buruhMenuHasNoAdminLinks() {
  const adminLinks = await driver.executeScript("return Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean).filter(h => h.startsWith('/admin'))");
  assert.deepEqual(adminLinks, []);
}

async function main() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');

  driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await runCheck('oauth-google-button-visible', oauthButtonExists);

    await login(accounts.mandor);
    await runCheck('mandor-harvest-reject-empty-reason', harvestRejectRequiresReason);
    await runCheck('mandor-only-sees-assigned-buruh-harvests', mandorOnlySeesAssignedBuruhHarvests);
    await runCheck('mandor-shipment-over-400-blocked', shipmentOverLimitBlocked);
    await runCheck('mandor-shipment-rejected-or-nonapproved-harvest-hidden', rejectedHarvestNotShownInShipmentOptions);
    await runCheck('mandor-shipment-only-same-plantation-supir-options', supirDifferentPlantationNotSelectable);
    await runCheck('setup-mandor-create-admin-review-shipment-if-needed', createShipmentCandidateIfNeeded);

    await logout();
    await login(accounts.supir);
    await runCheck('supir-progresses-review-candidate-to-tiba', supirProgressCandidateToTiba);
    await runCheck('supir-mandor-harvest-rbac', supirCannotOpenMandorHarvestApproval);

    await logout();
    await login(accounts.mandor);
    await runCheck('mandor-approves-review-candidate', approveCandidateByMandor);
    await runCheck('mandor-admin-plantation-rbac', mandorCannotCreatePlantation);

    await logout();
    await login(accounts.admin);
    await runCheck('admin-shipment-reject-empty-reason', adminRejectShipmentRequiresReason);
    await runCheck('admin-shipment-partial-reject-field-validation', adminPartialRejectValidatesFields);
    await runCheck('admin-self-delete-hidden', adminSelfDeleteHidden);
    await runCheck('plantation-invalid-area-rejected', plantationRejectsInvalidArea);
    await runCheck('plantation-incomplete-coordinates-rejected', plantationRejectsIncompleteCoordinates);
    await runCheck('plantation-duplicate-code-rejected', plantationRejectsDuplicateCode);
    await runCheck('plantation-overlap-rejected', plantationRejectsOverlap);
    await runCheck('plantation-code-disabled-on-edit', plantationCodeDisabledOnEdit);
    await runCheck('plantation-delete-with-mandor-fails', plantationDeleteWithMandorFails);
    await runCheck('admin-payroll-approve-insufficient-wallet', payrollApproveInsufficientWallet);
    await runCheck('admin-payroll-reject-empty-reason', payrollRejectRequiresReason);
    await runCheck('admin-sandbox-topup-invalid-amount', sandboxTopUpRejectsInvalidAmount);

    await logout();
    await login(accounts.buruh);
    await runCheck('buruh-admin-payroll-rbac', buruhCannotOpenAdminPayroll);
    await runCheck('buruh-harvest-plantation-select-and-duplicate-guard', buruhHarvestPlantationSelectAndDuplicateGuard);
    await runCheck('buruh-menu-has-no-admin-links', buruhMenuHasNoAdminLinks);

    const failed = results.filter((result) => result.status === 'FAIL');
    console.log(JSON.stringify(results, null, 2));
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    try {
      await driver.quit();
    } catch {
      // Ignore duplicate cleanup after a failed session.
    }
  }
}

main().catch(async (error) => {
  console.error(error);
  console.error(JSON.stringify(results, null, 2));
  if (driver) {
    try {
      await driver.quit();
    } catch {
      // Ignore duplicate cleanup after a failed session.
    }
  }
  process.exit(1);
});
