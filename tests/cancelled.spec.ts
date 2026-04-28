import { test, expect } from '@playwright/test';
import { avaiableMunicipalities, availableReasons, userData } from '../utils/index.ts';

const TEST_URL = '/cittadini/cie/public/spontanei/';

const reason = availableReasons[0];
const municipality = avaiableMunicipalities[0];

const SELECTORS = {
  buttons: {
    next: 'spontanei-controls-continue-button',
    pay: 'pay-button'
  },
  inputs: {
    fullName: '[id="fullName"]',
    fiscalCode: '[id="fiscalCode"]',
    email: '[id="email"]',
    orgFiscalCode: '[id="orgFiscalCode"]'
  },
  checkout: {
    cancelButton: 'button[id="paymentNoticeButtonCancel"]'
  }
};

test('CIE-004 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica, ma decido di annullare il pagamento', async ({
  page
}) => {
  test.slow();
  await page.goto(TEST_URL);

  await test.step('Step 1: Select reason', async () => {
    await page.getByText(reason.name).click();
    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 2: Fill form with data', async () => {
    await page.locator(SELECTORS.inputs.orgFiscalCode).click();
    await page.getByRole('option', { name: municipality.name }).click();

    await page.locator(SELECTORS.inputs.fullName).fill(userData.name);
    await page.locator(SELECTORS.inputs.fiscalCode).fill(userData.fiscal_code);
    await page.locator(SELECTORS.inputs.email).fill(userData.email);

    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 3: Verify summary data', async () => {
    await page.getByTestId(SELECTORS.buttons.next).click();
  });

  await test.step('Step 4: Create debt position and reach payment page', async () => {
    const debtPositionResponse = page.waitForResponse(
      (r) => r.url().includes('spontaneous/debt-positions') && r.request().method() === 'POST'
    );

    const response = await debtPositionResponse;
    expect(response.ok()).toBeTruthy();

    await expect(page.getByTestId(SELECTORS.buttons.pay)).toBeVisible();
  });

  // THEN proceed to payment checkout
  await test.step('Step 5: Proceed to payment checkout', async () => {
    await page.getByTestId(SELECTORS.buttons.pay).click();
    await page.waitForURL(/checkout\.pagopa\.it\//, { timeout: 15000 });

    // Verify payment page is loaded
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  await test.step('Step 6: Cancel payment on checkout', async () => {
    // Click cancel button to abort payment
    await page.getByRole('button', { name: 'Indietro' }).click();

    await expect(page.getByTestId('courtesyPage.title')).toBeVisible();
    await expect(page.getByTestId('courtesyPage.cta')).toBeVisible();
    await expect(page).toHaveURL(/esito\/pagamento-annullato/);
  });
});
