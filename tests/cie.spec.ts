import { test, expect } from '@playwright/test';
import {
  avaiableReasons,
  avaiableMunicipalities,
  userData,
  getRandomFrom,
  parseCurrencyToNumber
} from '../utils/index.ts';

const minimumAmountEuro = 1;
const nextButtonId = 'spontanei-controls-continue-button';
const backButtonId = 'spontanei-controls-back-button';
const fullNameInputId = '[id="fullName"]';
const fiscalCodeInputId = '[id="fiscalCode"]';
const emailInputId = '[id="email"]';
const orgFiscalCodeInputId = '[id="orgFiscalCode"]';
const fullNameHelperTextId = '[id="fullName-helper-text"]';
const fiscalCodeHelperTextId = '[id="fiscalCode-helper-text"]';
const emailHelperTextId = '[id="email-helper-text"]';
const orgFiscalCodeHelperTextId = '[id="orgFiscalCode-helper-text"]';

test('CIE-001 - Come cittadino voglio generare un avviso di pagamento per richiedere o rinnovare la Carta di Identità elettronica', async ({
  page
}) => {
  // STEP ONE: Reason selection
  await page.goto('/cittadini/cie/public/spontanei/');
  let reason = getRandomFrom(avaiableReasons);
  console.log('User selected reason: ' + reason.name);
  await page.getByText(reason.name).click();
  await page.getByTestId(nextButtonId).click();

  // STEP TWO: Debtor data form
  // testing checks
  await page.getByTestId(nextButtonId).click();
  await expect(page.locator(fullNameHelperTextId)).toBeVisible();
  await expect(page.locator(emailHelperTextId)).toBeVisible();
  await expect(page.locator(fiscalCodeHelperTextId)).toBeVisible();
  await expect(page.locator(orgFiscalCodeHelperTextId)).toBeVisible();

  // Municipality selection
  let municipality = getRandomFrom(avaiableMunicipalities);
  console.log('User selected municipality: ' + municipality.name);
  await page.locator(orgFiscalCodeInputId).click();
  await page.getByRole('option', { name: municipality.name }).click();

  // Debtor data filling
  await page.locator(fullNameInputId).fill(userData.name);
  await page.locator(fiscalCodeInputId).fill(userData.fiscal_code);
  await page.locator(emailInputId).fill(userData.email);

  // testing checks after filling
  await expect(page.locator(fullNameHelperTextId)).not.toBeVisible();
  await expect(page.locator(emailHelperTextId)).not.toBeVisible();
  await expect(page.locator(fiscalCodeHelperTextId)).not.toBeVisible();
  await expect(page.locator(orgFiscalCodeHelperTextId)).not.toBeVisible();

  // Simulating user uncertainty randomically
  if (Math.random() >= 0.5) {
    // going back to reason selection (STEP ONE)
    await page.getByTestId(backButtonId).click();
    await expect(page.getByLabel(reason.name)).toBeChecked();
    // selecting new reason
    reason = getRandomFrom(avaiableReasons);
    console.log('User selected new reason: ' + reason.name);
    await page.getByText(reason.name).click();
    // going to municipality selection (STEP TWO)
    await page.getByTestId(nextButtonId).click();
    // selecting new municipality
    municipality = getRandomFrom(avaiableMunicipalities);
    console.log('User selected new municipality: ' + municipality.name);
    await page.locator(orgFiscalCodeInputId).click();
    await page.getByRole('option', { name: municipality.name }).click();
  }

  // going to summary page (STEP THREE)
  await page.getByTestId(nextButtonId).click();

  // STEP THREE: Summary page assertions
  // Organization, reason and amount
  await expect(page.getByTestId('summary-extra-orgFiscalCode.label-value')).toContainText(
    municipality.name
  );
  await expect(page.getByTestId('summary-extra-orgFiscalCode.value-value')).toContainText(
    municipality.fiscal_code
  );
  await expect(page.getByTestId('summary-extra-debtType.description-value')).toContainText(
    reason.name
  );
  const amount = await page.getByTestId('summary-payment-amount-value').textContent();
  const parsedAmount = parseCurrencyToNumber(amount || '');
  console.log('Amount: ' + parsedAmount);
  expect(parsedAmount).toBeGreaterThan(minimumAmountEuro);

  // Debtor
  await expect(page.getByTestId('summary-debtor-name-value')).toContainText(userData.name);
  await expect(page.getByTestId('summary-debtor-code-value')).toContainText(userData.fiscal_code);
  await expect(page.getByTestId('summary-debtor-email-value')).toContainText(userData.email);

  // Continue button
  //await page.getByTestId('summary-continue-button').click();
});
