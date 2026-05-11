import { test as base, expect } from '@playwright/test';
import {
  userData,
  getRandomFrom,
  parseCurrencyToNumber,
  type Reason,
  type Municipality,
  type ReasonResponse,
  type MunicipalityResponse,
  SELECTORS
} from '../utils/index.ts';
import { MUNICIPALITIES_API, REASONS_API } from '../utils/api.ts';

const TEST_URL = '/cittadini/cie/public/spontanei/';

const MIN_AMOUNT = 1;

let reason: Reason;
let municipality: Municipality;
let paymentAmount: string;

const test = base.extend({
  CIE: async ({ page }, use) => {
    let avaiableReasons: ReasonResponse;
    let avaiableMunicipalities: MunicipalityResponse;
    const reasonsResponsePromise = page.waitForResponse(REASONS_API);
    const municipalityResponse = page.waitForResponse(MUNICIPALITIES_API);

    await page.goto(TEST_URL);

    // STEP 1: REASON PAGE
    await test.step('Step 1: Select reason', async () => {
      avaiableReasons = await (await reasonsResponsePromise).json();
      reason = getRandomFrom(avaiableReasons);

      await page.getByText(reason.description).click();
    });

    // NEXT STEP
    await page.getByTestId(SELECTORS.buttons.next).click();

    // STEP 2: FORM PAGE
    await test.step('Step 2: fill form and check validation', async () => {
      avaiableMunicipalities = await (await municipalityResponse).json();
      municipality = getRandomFrom(avaiableMunicipalities.result);
      const amountResponsePromise = page.waitForResponse(
        `**/pu/cie/public/organizations/${municipality.value}/amount?debtPositionTypeOrgCode=${reason.code}`
      );

      // Test validation errors on empty form
      await page.getByTestId(SELECTORS.buttons.next).click();

      await expect(page.locator(SELECTORS.helpers.fullName)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.email)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.fiscalCode)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).toBeVisible();

      // Select random municipality
      await page.locator(SELECTORS.inputs.orgFiscalCode).click();
      await page.getByRole('option', { name: municipality.label }).click();
      // this await is needed to update the amount correctly
      // because a click on the next button before the amount is updated will result in an error
      await amountResponsePromise;

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
    if (Math.random() > 0.5) {
      await test.step('Step 2B: User reconsiders and changes reason', async () => {
        await page.getByTestId(SELECTORS.buttons.back).click();
        await expect(page.getByLabel(reason.description)).toBeChecked();

        municipality = getRandomFrom(avaiableMunicipalities.result);
        reason = getRandomFrom(avaiableReasons);
        const amountResponsePromise = page.waitForResponse(
          `**/pu/cie/public/organizations/${municipality.value}/amount?debtPositionTypeOrgCode=${reason.code}`
        );

        await page.getByText(reason.description).click();
        await page.getByTestId(SELECTORS.buttons.next).click();

        // Verify form reset
        await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toBeEmpty();

        // Select new municipality
        await page.locator(SELECTORS.inputs.orgFiscalCode).click();
        await page.getByRole('option', { name: municipality.label }).click();
        await amountResponsePromise;
      });
    }

    // NEXT STEP
    await page.getByTestId(SELECTORS.buttons.next).click();

    // STEP 3: SUMMARY PAGE
    await test.step('Step 3: Review and verify summary', async () => {
      await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(
        municipality.label
      );
      await expect(page.getByTestId(SELECTORS.summary.municipalityCode)).toContainText(
        municipality.value
      );
      await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(reason.description);

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
    if (Math.random() > 0.5) {
      await test.step('Step 3B: User returns to form to verify data persists', async () => {
        await page.getByTestId(SELECTORS.buttons.back).click();

        await expect(page.locator(SELECTORS.inputs.fullName)).toHaveValue(userData.name);
        await expect(page.locator(SELECTORS.inputs.fiscalCode)).toHaveValue(userData.fiscal_code);
        await expect(page.locator(SELECTORS.inputs.email)).toHaveValue(userData.email);
        await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toHaveValue(
          municipality.label
        );

        await page.getByTestId(SELECTORS.buttons.next).click();

        // Verify summary again
        await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(
          municipality.label
        );
        await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(
          reason.description
        );
      });
    }

    // NEXT STEP
    await page.getByTestId(SELECTORS.buttons.next).click();

    // STEP 4: PAYMENT PAGE
    await test.step('Step 4: Process payment and verify payment page', async () => {
      const debtPositionResponse = page.waitForResponse(
        (r) => r.url().includes('spontaneous/debt-positions') && r.request().method() === 'POST'
      );
      const response = await debtPositionResponse;
      expect(response.ok()).toBeTruthy();
    });

    await use(page);
  }
});

test('CIE-001 - Come cittadino voglio generare un avviso di pagamento per richiedere o rinnovare la Carta di Identità elettronica', async ({
  CIE
}) => {
  await expect(CIE.getByTestId(SELECTORS.buttons.pay)).toBeVisible();
  await expect(CIE.getByTestId(SELECTORS.buttons.downloadNotice)).toBeVisible();
});

test("CIE-002 - Come cittadino voglio scaricare il pdf dell'avviso generato per richiedere o rinnovare la Carta di Identità elettronica", async ({
  CIE
}) => {
  //Wait for DB update notice status
  await CIE.waitForTimeout(2000);

  const newPagePromise = CIE.waitForEvent('popup');
  await CIE.getByTestId(SELECTORS.buttons.downloadNotice).click();

  const newPage = await newPagePromise;
  await newPage.waitForLoadState();

  // Wait for download to start in the new tab
  const download = await newPage.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('.pdf');

  await newPage.close();

  // Bring back focus to previous tab to continue CIE-003
  await CIE.bringToFront();
});

test('CIE-003 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica', async ({
  CIE
}) => {
  await CIE.getByTestId(SELECTORS.buttons.pay).click();

  // Wait for checkout redirect
  await expect(CIE).toHaveURL(/checkout\.pagopa\.it\//);

  // Amount check
  await expect(CIE.getByRole('button').filter({ hasText: paymentAmount })).toBeVisible();

  // Cart data checks
  await CIE.getByLabel('Apri riepilogo pagamento').click();
  await expect(CIE.getByText(municipality.value)).toBeVisible();
  await CIE.getByLabel('Chiudi').click();

  // Email check
  await expect(CIE.getByLabel('Email')).toHaveValue(userData.email);
  await CIE.getByLabel('Ripeti di nuovo').fill(userData.email);
  await CIE.getByRole('button', { name: 'Continua' }).click();

  // Payment method
  await CIE.getByRole('button', { name: 'Carta di credito o debito' }).click();

  // Payment completed and redirection
  await CIE.goto('/cittadini/cie/public/esito/pagamento-avviso-completato');
  await expect(CIE).toHaveURL('/cittadini/cie/public/esito/pagamento-avviso-completato');
});

test('CIE-006 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica, ma il pagamento non va a buon fine', async ({
  CIE
}) => {
  await test.step('Proceed to payment checkout', async () => {
    await CIE.getByTestId(SELECTORS.buttons.pay).click();
    await CIE.waitForURL(/checkout\.pagopa\.it\//, { timeout: 15000 });
    await expect(CIE.getByLabel('Email')).toBeVisible();
  });

  await test.step('Cancel payment to land on pagamento-annullato', async () => {
    await CIE.getByRole('button', { name: 'Indietro' }).click();
    await expect(CIE).toHaveURL(/esito\/pagamento-annullato/);

    // Wait for the cancel page to fully render and settle before navigating away
    await expect(CIE.getByTestId('courtesyPage.title')).toBeVisible();
    await CIE.waitForLoadState('networkidle');
  });

  await test.step('Step 6: Simulate failed payment by rewriting the URL', async () => {
    const failureUrl = CIE.url().replace('pagamento-annullato', 'pagamento-non-riuscito');
    await CIE.goto(failureUrl);

    await expect(CIE).toHaveURL(/esito\/pagamento-non-riuscito/);
    await expect(CIE.getByTestId('courtesyPage.title')).toBeVisible();
    await expect(CIE.getByTestId('courtesyPage.cta')).toBeVisible();
  });
});

test('CIE-007 - Come cittadino voglio pagare online per richiedere o rinnovare la Carta di Identità elettronica, ma il pagamento non va a buon fine e decido di riprovare', async ({
  CIE
}) => {
  test.slow();

  await test.step('Step 1: Proceed to payment checkout', async () => {
    await CIE.getByTestId(SELECTORS.buttons.pay).click();
    await CIE.waitForURL(/checkout\.pagopa\.it\//, { timeout: 15000 });
    await expect(CIE.getByLabel('Email')).toBeVisible();
  });

  await test.step('Step 2: Cancel payment and simulate failure', async () => {
    await CIE.getByRole('button', { name: 'Indietro' }).click();
    await expect(CIE).toHaveURL(/esito\/pagamento-annullato/);
    await expect(CIE.getByTestId('courtesyPage.title')).toBeVisible();
    await CIE.waitForLoadState('networkidle');

    const failureUrl = CIE.url().replace('pagamento-annullato', 'pagamento-non-riuscito');
    await CIE.goto(failureUrl);

    await expect(CIE).toHaveURL(/esito\/pagamento-non-riuscito/);
    await expect(CIE.getByTestId(SELECTORS.buttons.retry)).toBeVisible();

    // give the page time to "settle" like a human would
    await CIE.waitForLoadState('networkidle');
    await CIE.waitForTimeout(2000);
  });

  await test.step('Step 3: Click "Riprova" and verify checkout redirect', async () => {
    await CIE.getByTestId(SELECTORS.buttons.retry).click();
    await CIE.waitForURL(/checkout\.pagopa\.it\//, { timeout: 15000 });
  });

  await test.step('Step 4: Complete payment on checkout', async () => {
    await expect(CIE.getByRole('button').filter({ hasText: paymentAmount })).toBeVisible();

    await expect(CIE.getByLabel('Email')).toHaveValue('');
    await CIE.getByLabel('Email').fill(userData.email);
    await CIE.getByLabel('Ripeti di nuovo').fill(userData.email);
    await CIE.getByRole('button', { name: 'Continua' }).click();

    await CIE.getByRole('button', { name: 'Carta di credito o debito' }).click();
  });

  await test.step('Step 5: Simulate successful payment completion', async () => {
    await CIE.goto('/cittadini/cie/public/esito/pagamento-avviso-completato');
    await expect(CIE).toHaveURL('/cittadini/cie/public/esito/pagamento-avviso-completato');
  });
});
