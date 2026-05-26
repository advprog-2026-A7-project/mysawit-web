#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const { Builder, By, Key, until } = webdriver;

const BASE_URL = process.env.MYSAWIT_FRONTEND_URL || 'http://localhost:3000';
const WAIT_MS = Number(process.env.E2E_WAIT_TIMEOUT_MS || 20000);
const HEADLESS = process.env.E2E_HEADLESS === 'true';
const ARTIFACT_DIR = path.join(process.cwd(), 'e2e', 'artifacts');

const accounts = {
  admin: {
    email: process.env.MYSAWIT_ADMIN_EMAIL || 'admin@mysawit.com',
    password: process.env.MYSAWIT_ADMIN_PASSWORD || 'admin123',
  },
  mandor: {
    email: process.env.MYSAWIT_MANDOR_EMAIL || 'mandor_manual@mysawit.com',
    password: process.env.MYSAWIT_MANDOR_PASSWORD || 'mandor123',
  },
  buruh: {
    email: process.env.MYSAWIT_BURUH_EMAIL || 'buruh_manual@mysawit.com',
    password: process.env.MYSAWIT_BURUH_PASSWORD || 'buruh123',
  },
  supir: {
    email: process.env.MYSAWIT_SUPIR_EMAIL || 'supir_manual@mysawit.com',
    password: process.env.MYSAWIT_SUPIR_PASSWORD || 'supir123',
  },
};

let driver;
const results = [];

const log = (message) => console.log(`[manual-negative-ui] ${message}`);

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
    if (!String(error?.name || error?.message).includes('ElementClickIntercepted')) {
      throw error;
    }
    await driver.executeScript('arguments[0].click();', element);
  }
}

async function clickByText(text) {
  const element = await driver.wait(
    until.elementLocated(By.xpath(`//button[contains(normalize-space(.), ${xpathText(text)})] | //a[contains(normalize-space(.), ${xpathText(text)})]`)),
    WAIT_MS,
  );
  await clickElement(element);
}

async function fill(selector, value) {
  const element = await driver.wait(until.elementLocated(selector), WAIT_MS);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  await element.clear();
  await element.sendKeys(value);
}

async function login(account) {
  await driver.get(`${BASE_URL}/login`);
  await fill(testId('login-email-input'), account.email);
  await fill(testId('login-password-input'), account.password);
  await clickElement(await driver.findElement(testId('login-submit-button')));
  try {
    await driver.wait(async () => {
      const token = await driver.executeScript("return window.localStorage.getItem('authToken')");
      return Boolean(token);
    }, WAIT_MS);
  } catch (error) {
    const page = await bodyText().catch(() => '');
    const currentUrl = await driver.getCurrentUrl().catch(() => BASE_URL);
    const file = await screenshot(`login-failed-${account.email.replaceAll(/[^a-z0-9]+/gi, '-')}`);
    throw new Error(`Login gagal untuk ${account.email} di ${currentUrl}: ${page.slice(0, 500)} (screenshot: ${file})`);
  }
}

async function logout() {
  await driver.executeScript('window.localStorage.clear()');
  await driver.get(`${BASE_URL}/login`);
}

async function acceptPromptBlank() {
  const alert = await driver.wait(until.alertIsPresent(), WAIT_MS);
  await alert.accept();
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
    throw error;
  }
}

async function harvestRejectRequiresReason() {
  await login(accounts.mandor);
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await waitForText('NEGATIVE TEST - reject harvest tanpa alasan');
  const rejectButton = await driver.wait(
    until.elementLocated(By.xpath(`(//button[normalize-space(.)='Tolak'])[1]`)),
    WAIT_MS,
  );
  await clickElement(rejectButton);
  await acceptPromptBlank();
  await waitForText('Alasan penolakan wajib diisi');
  const page = await bodyText();
  assert.match(page, /NEGATIVE TEST - reject harvest tanpa alasan/);
  assert.match(page, /Menunggu/);
}

async function shipmentOverLimitBlocked() {
  await driver.get(`${BASE_URL}/mandor/shipment`);
  await clickByText('+ Buat Pengiriman');
  await waitForText('Pilih Panen yang Akan Diangkut');
  const supirSelect = await driver.wait(until.elementLocated(By.css('select')), WAIT_MS);
  await driver.wait(async () => (await supirSelect.getAttribute('disabled')) === null, WAIT_MS);
  await driver.wait(
    async () => (await supirSelect.findElements(By.xpath(`.//option[contains(normalize-space(.), 'supir_manual')]`))).length > 0,
    WAIT_MS,
  );
  await waitForText('250 kg');
  await waitForText('200 kg');
  await supirSelect.sendKeys('supir_manual');
  const destinationInput = await driver.wait(
    until.elementLocated(By.xpath(`//label[.//span[contains(normalize-space(.), 'Tujuan Pabrik')]]//input`)),
    WAIT_MS,
  );
  await destinationInput.sendKeys(Key.chord(Key.CONTROL, 'a'), 'Pabrik negative overlimit');

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

async function payrollApproveInsufficientWallet() {
  await logout();
  await login(accounts.admin);
  await driver.get(`${BASE_URL}/admin/payroll`);
  await waitForText('Gaji #11');
  const approveButton = await driver.wait(
    until.elementLocated(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #11')]]//button[normalize-space(.)='Setujui']`)),
    WAIT_MS,
  );
  await clickElement(approveButton);
  await driver.wait(async () => {
    const page = await bodyText();
    return /insufficient|saldo|balance|cukup/i.test(page);
  }, WAIT_MS);
  const payrollCard = await driver.findElement(By.xpath(`//article[.//*[contains(normalize-space(.), 'Gaji #11')]]`));
  assert.match(await payrollCard.getText(), /MENUNGGU/i);
}

async function payrollRejectRequiresReason() {
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

async function buruhCannotOpenAdminPayroll() {
  await logout();
  await login(accounts.buruh);
  await driver.get(`${BASE_URL}/admin/payroll`);
  await driver.sleep(1000);
  const currentUrl = await driver.getCurrentUrl();
  const page = await bodyText();
  assert.ok(!currentUrl.includes('/admin/payroll') || /akses|unauthorized|forbidden|tidak berhak|dashboard/i.test(page));
}

async function supirCannotOpenMandorHarvestApproval() {
  await logout();
  await login(accounts.supir);
  await driver.get(`${BASE_URL}/mandor/harvest`);
  await driver.sleep(1000);
  const currentUrl = await driver.getCurrentUrl();
  const page = await bodyText();
  assert.ok(!currentUrl.includes('/mandor/harvest') || /akses|unauthorized|forbidden|tidak berhak|dashboard/i.test(page));
}

async function buruhHarvestUsesPlantationSelect() {
  await driver.get(`${BASE_URL}/harvest`);
  await waitForText('Log Panen Baru');
  await waitForText('Catatan panen hari ini sudah tersimpan');
  const plantationSelect = await driver.wait(until.elementLocated(testId('harvest-plantation-select')), WAIT_MS);
  await driver.wait(async () => /KB-A-001 - Kebun test manual/.test(await plantationSelect.getText()), WAIT_MS);
  assert.equal(await plantationSelect.getTagName(), 'select');
  assert.match(await plantationSelect.getText(), /KB-A-001 - Kebun test manual/);
}

async function main() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,1000');
  options.addArguments('--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');

  driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await runCheck('mandor-harvest-reject-empty-reason', harvestRejectRequiresReason);
    await runCheck('mandor-shipment-over-400-blocked', shipmentOverLimitBlocked);
    await runCheck('admin-payroll-approve-insufficient-wallet', payrollApproveInsufficientWallet);
    await runCheck('admin-payroll-reject-empty-reason', payrollRejectRequiresReason);
    await runCheck('buruh-admin-payroll-rbac', buruhCannotOpenAdminPayroll);
    await runCheck('buruh-harvest-plantation-select', buruhHarvestUsesPlantationSelect);
    await runCheck('supir-mandor-harvest-rbac', supirCannotOpenMandorHarvestApproval);
    console.log(JSON.stringify(results, null, 2));
  } finally {
    try {
      await driver.quit();
    } catch {
      // The session can already be gone when Chrome exits after a hard failure.
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
