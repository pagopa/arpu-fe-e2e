import { test as base, expect } from '@playwright/test';
import { getRandomFrom, MunicipalityResponse, ReasonResponse, userData } from '../utils/index.ts';
import { REASONS_API, MUNICIPALITIES_API } from '../utils/api.ts';

const TEST_URL = '/cittadini/cie/public/spontanei/';
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

const test = base.extend({
  checkoutPage: async ({ page }, use) => {
    let avaiableReasons: ReasonResponse;
    let avaiableMunicipalities: MunicipalityResponse;

    const reasonsResponsePromise = page.waitForResponse(REASONS_API);
    const municipalityResponse = page.waitForResponse(MUNICIPALITIES_API);

    await page.goto(TEST_URL);

    await test.step('Step 1: Select reason', async () => {
      avaiableReasons = await (await reasonsResponsePromise).json();
      const reason = getRandomFrom(avaiableReasons);
      await page.getByText(reason.description).click();
      await page.getByTestId(SELECTORS.buttons.next).click();
    });

    await test.step('Step 2: Fill form with data', async () => {
      avaiableMunicipalities = await (await municipalityResponse).json();
      const municipality = getRandomFrom(avaiableMunicipalities.result);
      await page.locator(SELECTORS.inputs.orgFiscalCode).click();
      await page.getByRole('option', { name: municipality.label }).click();
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

    await test.step('Step 5: Proceed to payment checkout', async () => {
      await page.getByTestId(SELECTORS.buttons.pay).click();
      await page.waitForURL(/checkout\.pagopa\.it\//, { timeout: 15000 });
      await expect(page.getByLabel('Email')).toBeVisible();
    });

    // Make page available to the test
    await use(page);
  }
});

/**
 * Test 1: Cancel payment on checkout
 */
test('CIE-004 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica, ma decido di annullare il pagamento', async ({
  checkoutPage
}) => {
  // Click cancel button to abort payment
  await checkoutPage.getByRole('button', { name: 'Indietro' }).click();
  await expect(checkoutPage.getByTestId('courtesyPage.title')).toBeVisible();
  await expect(checkoutPage.getByTestId('courtesyPage.cta')).toBeVisible();
  await expect(checkoutPage).toHaveURL(/esito\/pagamento-annullato/);
});

/**
 * Test 2: Cancel payment and download notice
 */
test("CIE-005 - Come cittadino voglio annullare il pagamento online per richiedere o rinnovare la Carta di Identità elettronica, ma poi decido di scaricare l'avviso", async ({
  checkoutPage
}) => {
  await test.step('Step 6: Cancel payment on checkout', async () => {
    await checkoutPage.getByRole('button', { name: 'Indietro' }).click();
    await expect(checkoutPage.getByTestId('courtesyPage.title')).toBeVisible();
    await expect(checkoutPage.getByTestId('courtesyPage.cta')).toBeVisible();
    await expect(checkoutPage).toHaveURL(/esito\/pagamento-annullato/);
  });

  await test.step('Download payment notice', async () => {
    await checkoutPage.getByTestId('courtesyPage.downloadCta').click();
    const newPage = await checkoutPage.waitForEvent('popup');
    const downloadPromise = await newPage.waitForEvent('download');
    expect(downloadPromise.suggestedFilename()).toContain('.pdf');
  });
});
