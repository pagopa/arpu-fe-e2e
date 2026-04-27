import { test, expect, Page } from '@playwright/test';
import { avaiableMunicipalities, availableReasons, userData } from '../utils/index.ts';

const TEST_URL = '/cittadini/cie/public/spontanei/';
const MIN_AMOUNT = 1;

// use first reason

const FIXED_REASON = availableReasons[0];
// Use first municipality
const FIXED_MUNICIPALITY = avaiableMunicipalities[0];

const SELECTORS = {
  buttons: {
    next: 'spontanei-controls-continue-button',
    back: 'spontanei-controls-back-button',
    pay: 'pay-button',
    downloadNotice: 'download-notice-button'
  },
  inputs: {
    fullName: '[id="fullName"]',
    fiscalCode: '[id="fiscalCode"]',
    email: '[id="email"]',
    orgFiscalCode: '[id="orgFiscalCode"]'
  },
  helpers: {
    fullName: '[id="fullName-helper-text"]',
    fiscalCode: '[id="fiscalCode-helper-text"]',
    email: '[id="email-helper-text"]',
    orgFiscalCode: '[id="orgFiscalCode-helper-text"]'
  },
  summary: {
    municipality: 'summary-extra-orgFiscalCode.label-value',
    municipalityCode: 'summary-extra-orgFiscalCode.value-value',
    debtType: 'summary-extra-debtType.description-value',
    amount: 'summary-extra-cieAmount-value',
    debtorName: 'summary-debtor-name-value',
    debtorCode: 'summary-debtor-code-value',
    debtorEmail: 'summary-debtor-email-value'
  },
  checkout: {
    cancelButton: 'button[aria-label="Annulla"]',
    continueButton: 'button[aria-label="Continua"]'
  }
};

let page: Page;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test('CIE-004 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica, ma decido di annullare il pagamento', async () => {
  await page.goto(TEST_URL);

  await test.step('Step 1: Select reason', async () => {
    await page.getByText(FIXED_REASON.name).click();
    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 2: Fill form with data', async () => {
    // Select municipality
    await page.locator(SELECTORS.inputs.orgFiscalCode).click();
    await page.getByRole('option', { name: FIXED_MUNICIPALITY.name }).click();

    // Fill debtor data
    await page.locator(SELECTORS.inputs.fullName).fill(userData.name);
    await page.locator(SELECTORS.inputs.fiscalCode).fill(userData.fiscal_code);
    await page.locator(SELECTORS.inputs.email).fill(userData.email);

    // Verify no validation errors
    await expect(page.locator(SELECTORS.helpers.fullName)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.email)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.fiscalCode)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).not.toBeVisible();

    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 3: Verify summary data', async () => {
    await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(
      FIXED_MUNICIPALITY.name
    );
    await expect(page.getByTestId(SELECTORS.summary.municipalityCode)).toContainText(
      FIXED_MUNICIPALITY.fiscal_code
    );
    await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(FIXED_REASON.name);

    const amount = await page.getByTestId(SELECTORS.summary.amount).textContent();
    const parsedAmount = parseFloat(amount?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
    expect(parsedAmount).toBeGreaterThan(MIN_AMOUNT);

    await expect(page.getByTestId(SELECTORS.summary.debtorName)).toContainText(userData.name);
    await expect(page.getByTestId(SELECTORS.summary.debtorCode)).toContainText(
      userData.fiscal_code
    );
    await expect(page.getByTestId(SELECTORS.summary.debtorEmail)).toContainText(userData.email);

    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 4: Proceed to payment checkout', async () => {
    test.slow();
    await page.getByTestId(SELECTORS.buttons.pay).click();

    // Wait for checkout redirect
    await expect(page).toHaveURL(/checkout\.pagopa\.it\//);
    // Verify payment page is loaded
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  await test.step('Step 5: Cancel payment on checkout', async () => {
    // Click cancel button to abort payment
    await page.getByRole('button', { name: /annulla|cancel/i }).click();

    // TODO: Verify redirect to cancellation page
  });
});
