#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, until } = webdriver;

const BASE_URL = process.env.MYSAWIT_FRONTEND_URL || 'http://localhost:3000';
const WAIT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 25000);
const HEADLESS = process.env.E2E_HEADLESS === 'true';
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const ARTIFACT_DIR = path.join(process.cwd(), 'e2e', 'artifacts', `full-positive-${RUN_ID}`);

const accounts = {
  admin: { email: process.env.MYSAWIT_ADMIN_EMAIL || 'admin@mysawit.com', password: process.env.MYSAWIT_ADMIN_PASSWORD || 'admin123' },
  mandor: { email: process.env.MYSAWIT_MANDOR_EMAIL || 'mandor_manual@mysawit.com', password: process.env.MYSAWIT_MANDOR_PASSWORD || 'mandor123' },
  buruh: { email: process.env.MYSAWIT_BURUH_EMAIL || 'buruh_manual@mysawit.com', password: process.env.MYSAWIT_BURUH_PASSWORD || 'buruh123' },
  supir: { email: process.env.MYSAWIT_SUPIR_EMAIL || 'supir_manual@mysawit.com', password: process.env.MYSAWIT_SUPIR_PASSWORD || 'supir123' },
};

let driver;
const results = [];

const log = (message) => console.log(`[full-positive-ui] ${message}`);
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
      const page = await bodyText().catch(() => '');
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

async function assertNoHorizontalOverflow() {
  const overflow = await driver.executeScript(`
    const body = document.body;
    const html = document.documentElement;
    return Math.max(body.scrollWidth, html.scrollWidth) - html.clientWidth;
  `);
  assert.ok(Number(overflow) <= 4, `horizontal overflow ${overflow}px`);
}

async function adminDashboardLoads() {
  await driver.get(`${BASE_URL}/admin/dashboard`);
  await waitForText('Ringkasan');
  await assertNoHorizontalOverflow();
}

async function adminUsersFilterLoads() {
  await driver.get(`${BASE_URL}/admin/users`);
  await waitForText('admin@mysawit.com');
  await fillByLabel('Email', 'admin@mysawit.com');
  await driver.wait(async () => (await bodyText()).includes('admin@mysawit.com'), WAIT_MS);
}

async function adminPlantationsLayoutAndTabs() {
  await driver.get(`${BASE_URL}/admin/plantations`);
  await waitForText('Manajemen Kebun');
  await waitForText('Daftar Kebun');
  await assertNoHorizontalOverflow();
  const tabRoleCount = await driver.executeScript("return document.querySelectorAll('[role=\"tab\"]').length");
  assert.equal(tabRoleCount, 5);
  await clickByText('+ Tambah Kebun');
  await waitForText('Tambah Kebun Baru');
  await clickByText('Daftar Kebun');
}

async function adminShipmentsLoads() {
  await driver.get(`${BASE_URL}/admin/shipments`);
  await waitForText('Pusat Persetujuan Admin');
  await waitForText('Status');
}

async function adminPayrollLoads() {
  await driver.get(`${BASE_URL}/admin/payroll`);
  await waitForText('Wallet Admin');
  await waitForText('Konfigurasi Upah per Kg');
  await driver.findElement(testId('wallet-balance'));
}

async function mandorPlantationsLoads() {
  await driver.get(`${BASE_URL}/mandor/plantations`);
  await waitForText('Kebun Saya');
  await waitForText('Kebun test manual');
  await waitForText('supir_manual');
}

async function mandorHarvestLoads() {
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await waitForText('Persetujuan Panen');
  await driver.wait(async () => !(await bodyText()).includes('Memuat daftar panen...'), WAIT_MS);
}

async function mandorShipmentFormShowsClearHarvestCards() {
  await driver.get(`${BASE_URL}/mandor/shipment`);
  await waitForText('Pengiriman Panen');
  await clickByText('+ Buat Pengiriman');
  await waitForText('Pilih Panen yang Akan Diangkut');
  await driver.wait(async () => !(await bodyText()).includes('Memuat daftar panen...'), WAIT_MS);
  await waitForText('supir_manual');
  await waitForText('dipilih');
  await waitForText('Kebun');
  await waitForText('Panen #');
  const harvestChoices = await driver.findElements(By.css('input[type="checkbox"]'));
  assert.ok(harvestChoices.length > 0, 'Tidak ada pilihan panen approved di form pengiriman');
  await assertNoHorizontalOverflow();
}

async function mandorPayrollLoads() {
  await driver.get(`${BASE_URL}/mandor/payroll`);
  await waitForText('Validasi Gaji');
}

async function supirPagesLoad() {
  await driver.get(`${BASE_URL}/shipment/active`);
  await waitForText('Pengiriman Aktif');
  await driver.get(`${BASE_URL}/shipment/history`);
  await waitForText('Riwayat Pengiriman');
  await driver.get(`${BASE_URL}/payroll`);
  await waitForText('Gaji Saya');
}

async function buruhPagesLoad() {
  await driver.get(`${BASE_URL}/harvest`);
  await waitForText('Log Panen Baru');
  const plantationSelect = await driver.wait(until.elementLocated(testId('harvest-plantation-select')), WAIT_MS);
  await driver.wait(async () => /KB-A-001 - Kebun test manual/.test(await plantationSelect.getText()), WAIT_MS);
  await driver.get(`${BASE_URL}/payroll`);
  await waitForText('Gaji Saya');
}

async function main() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');

  driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await login(accounts.admin);
    await runCheck('admin-dashboard-loads', adminDashboardLoads);
    await runCheck('admin-users-filter-loads', adminUsersFilterLoads);
    await runCheck('admin-plantations-layout-and-tabs', adminPlantationsLayoutAndTabs);
    await runCheck('admin-shipments-loads', adminShipmentsLoads);
    await runCheck('admin-payroll-loads', adminPayrollLoads);

    await logout();
    await login(accounts.mandor);
    await runCheck('mandor-plantations-loads', mandorPlantationsLoads);
    await runCheck('mandor-harvest-loads', mandorHarvestLoads);
    await runCheck('mandor-shipment-form-clear-harvest-cards', mandorShipmentFormShowsClearHarvestCards);
    await runCheck('mandor-payroll-loads', mandorPayrollLoads);

    await logout();
    await login(accounts.supir);
    await runCheck('supir-pages-load', supirPagesLoad);

    await logout();
    await login(accounts.buruh);
    await runCheck('buruh-pages-load', buruhPagesLoad);

    const failed = results.filter((result) => result.status === 'FAIL');
    console.log(JSON.stringify(results, null, 2));
    if (failed.length > 0) process.exitCode = 1;
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
