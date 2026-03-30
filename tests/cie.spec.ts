import { test, expect } from '@playwright/test';
import {
  avaiableReasons,
  avaiableMunicipalities,
  userData,
  getRandomFrom,
  parseCurrencyToNumber
} from '../utils/index.ts';

const TEST_URL = '/cittadini/cie/public/spontanei/';
const MIN_AMOUNT = 1;

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
    amount: 'summary-payment-amount-value',
    debtorName: 'summary-debtor-name-value',
    debtorCode: 'summary-debtor-code-value',
    debtorEmail: 'summary-debtor-email-value'
  }
};

test('CIE-001 - Come cittadino voglio generare un avviso di pagamento per richiedere o rinnovare la Carta di Identità elettronica', async ({
  page
}) => {
  let reason: any;
  let municipality: any;
  let paymentAmount: string;

  await page.goto(TEST_URL);

  await test.step('Step 1: Select random reason', async () => {
    reason = getRandomFrom(avaiableReasons);

    await page.getByText(reason.name).click();
    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 2: fill form and check validation', async () => {
    // Test validation errors on empty form
    await page.getByTestId(SELECTORS.buttons.next).click();
    await expect(page.locator(SELECTORS.helpers.fullName)).toBeVisible();
    await expect(page.locator(SELECTORS.helpers.email)).toBeVisible();
    await expect(page.locator(SELECTORS.helpers.fiscalCode)).toBeVisible();
    await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).toBeVisible();

    // Select random municipality
    municipality = getRandomFrom(avaiableMunicipalities);
    await page.locator(SELECTORS.inputs.orgFiscalCode).click();
    await page.getByRole('option', { name: municipality.name }).click();

    // Fill debtor data
    await page.locator(SELECTORS.inputs.fullName).fill(userData.name);
    await page.locator(SELECTORS.inputs.fiscalCode).fill(userData.fiscal_code);
    await page.locator(SELECTORS.inputs.email).fill(userData.email);

    // Verify errors cleared
    await expect(page.locator(SELECTORS.helpers.fullName)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.email)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.fiscalCode)).not.toBeVisible();
    await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).not.toBeVisible();
  });

  // STEP 2B (OPTIONAL)
  if (Math.random() >= 0.5) {
    await test.step('Step 2B: User reconsiders and changes reason', async () => {
      await page.getByTestId(SELECTORS.buttons.back).click();
      await expect(page.getByLabel(reason.name)).toBeChecked();

      reason = getRandomFrom(avaiableReasons);
      await page.getByText(reason.name).click();
      await page.getByTestId(SELECTORS.buttons.next).click();

      // Verify form reset
      await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toBeEmpty();

      // Select new municipality
      municipality = getRandomFrom(avaiableMunicipalities);
      await page.locator(SELECTORS.inputs.orgFiscalCode).click();
      await page.getByRole('option', { name: municipality.name }).click();
    });
  }

  await test.step('Step 3: Review and verify summary', async () => {
    await page.getByTestId(SELECTORS.buttons.next).click();

    await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(municipality.name);
    await expect(page.getByTestId(SELECTORS.summary.municipalityCode)).toContainText(
      municipality.fiscal_code
    );
    await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(reason.name);

    const amount = await page.getByTestId(SELECTORS.summary.amount).textContent();
    const parsedAmount = parseCurrencyToNumber(amount || '');
    expect(parsedAmount).toBeGreaterThan(MIN_AMOUNT);

    paymentAmount = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parsedAmount);

    await expect(page.getByTestId(SELECTORS.summary.debtorName)).toContainText(userData.name);
    await expect(page.getByTestId(SELECTORS.summary.debtorCode)).toContainText(
      userData.fiscal_code
    );
    await expect(page.getByTestId(SELECTORS.summary.debtorEmail)).toContainText(userData.email);
  });

  // STEP 3B (OPTIONAL)
  if (Math.random() >= 0.5) {
    await test.step('Step 3B: User returns to form to verify data persists', async () => {
      await page.getByTestId(SELECTORS.buttons.back).click();

      await expect(page.locator(SELECTORS.inputs.fullName)).toHaveValue(userData.name);
      await expect(page.locator(SELECTORS.inputs.fiscalCode)).toHaveValue(userData.fiscal_code);
      await expect(page.locator(SELECTORS.inputs.email)).toHaveValue(userData.email);
      await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toHaveValue(
        municipality.name
      );

      await page.getByTestId(SELECTORS.buttons.next).click();

      // Verify summary again
      await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(
        municipality.name
      );
      await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(reason.name);
    });
  }

  await test.step('Step 4: Process payment and verify payment page', async () => {
    const debtPositionResponse = page.waitForResponse(
      (r) => r.url().includes('spontaneous/debt-positions') && r.request().method() === 'POST'
    );

    await page.getByTestId(SELECTORS.buttons.next).click();

    const response = await debtPositionResponse;
    expect(response.ok()).toBeTruthy();

    await expect(page.getByTestId(SELECTORS.buttons.pay)).toBeVisible();
    await expect(page.getByTestId(SELECTORS.buttons.downloadNotice)).toBeVisible();
  });

  await test.step('Step 5: Checkout summary + payment flow', async () => {
    test.info().annotations.push({
      type: 'CIE-003',
      description:
        'Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica'
    });

    test.slow();
    await page.getByTestId(SELECTORS.buttons.pay).click();

    // Wait for checkout redirect
    await expect(page).toHaveURL(/checkout\.pagopa\.it\//);

    // Amount check
    await expect(page.getByRole('button').filter({ hasText: paymentAmount })).toBeVisible();

    // Cart data checks
    await page.getByLabel('Apri riepilogo pagamento').click();
    await expect(page.getByText(reason.name)).toBeVisible();
    await expect(page.getByText(municipality.fiscal_code)).toBeVisible();
    await page.getByLabel('Chiudi').click();

    // Email check
    await expect(page.getByLabel('Email')).toHaveValue(userData.email);
    await page.getByLabel('Ripeti di nuovo').fill(userData.email);
    await page.getByRole('button', { name: 'Continua' }).click();

    // Payment method
    await page.getByRole('button', { name: 'Carta di credito o debito' }).click();

    // Payment completed and redirection
    await page.goto('/cittadini/cie/public/esito/pagamento-avviso-completato');
    await expect(page).toHaveURL('/cittadini/cie/public/esito/pagamento-avviso-completato');
  });
});
