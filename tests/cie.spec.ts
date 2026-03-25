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
const fullNameInputLocator = '[id="fullName"]';
const fiscalCodeInputLocator = '[id="fiscalCode"]';
const emailInputLocator = '[id="email"]';
const orgFiscalCodeInputLocator = '[id="orgFiscalCode"]';
const fullNameHelperTextLocator = '[id="fullName-helper-text"]';
const fiscalCodeHelperTextLocator = '[id="fiscalCode-helper-text"]';
const emailHelperTextLocator = '[id="email-helper-text"]';
const orgFiscalCodeHelperTextLocator = '[id="orgFiscalCode-helper-text"]';

test('CIE-001 - Come cittadino voglio generare un avviso di pagamento per richiedere o rinnovare la Carta di Identità elettronica', async ({
  page
}) => {
  // Summary page assertions
  const checkSummary = async () => {
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
    expect(parsedAmount).toBeGreaterThan(minimumAmountEuro);

    // Debtor
    await expect(page.getByTestId('summary-debtor-name-value')).toContainText(userData.name);
    await expect(page.getByTestId('summary-debtor-code-value')).toContainText(userData.fiscal_code);
    await expect(page.getByTestId('summary-debtor-email-value')).toContainText(userData.email);
  }

  // Prepare to listen for the specific API response
  const debtPositionResponse = page.waitForResponse(response =>
    response.url().includes('spontaneous/debt-positions') && response.request().method() === 'POST'
  );

  await page.goto('/cittadini/cie/public/spontanei/');
  // STEP ONE: Reason selection
  let reason = getRandomFrom(avaiableReasons);
  console.log('User selected reason: ' + reason.name);
  await page.getByText(reason.name).click();
  await page.getByTestId(nextButtonId).click();

  // STEP TWO: Debtor data form
  // testing checks
  await page.getByTestId(nextButtonId).click();
  await expect(page.locator(fullNameHelperTextLocator)).toBeVisible();
  await expect(page.locator(emailHelperTextLocator)).toBeVisible();
  await expect(page.locator(fiscalCodeHelperTextLocator)).toBeVisible();
  await expect(page.locator(orgFiscalCodeHelperTextLocator)).toBeVisible();

  // Municipality selection
  let municipality = getRandomFrom(avaiableMunicipalities);
  console.log('User selected municipality: ' + municipality.name);
  await page.locator(orgFiscalCodeInputLocator).click();
  await page.getByRole('option', { name: municipality.name }).click();

  // Debtor data filling
  await page.locator(fullNameInputLocator).fill(userData.name);
  await page.locator(fiscalCodeInputLocator).fill(userData.fiscal_code);
  await page.locator(emailInputLocator).fill(userData.email);

  // testing checks after filling
  await expect(page.locator(fullNameHelperTextLocator)).not.toBeVisible();
  await expect(page.locator(emailHelperTextLocator)).not.toBeVisible();
  await expect(page.locator(fiscalCodeHelperTextLocator)).not.toBeVisible();
  await expect(page.locator(orgFiscalCodeHelperTextLocator)).not.toBeVisible();

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
    // testing the form reset
    await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toBeEmpty();
    //selecting new municipality
    municipality = getRandomFrom(avaiableMunicipalities);
    console.log('User selected new municipality: ' + municipality.name);
    await page.locator(orgFiscalCodeInputLocator).click();
    await page.getByRole('option', { name: municipality.name }).click();
  }

  // going to summary page (STEP THREE)
  await page.getByTestId(nextButtonId).click();
  // STEP THREE: Summary page assertions
  await checkSummary();

  // Simulating user uncertainty randomically
  if (Math.random() >= 0.5) {
    // return to form (STEP TWO) and testing the form doesn't reset (except for user info)
    await page.getByTestId(backButtonId).click();
    console.log('User returned to form');
    await expect(page.locator(fullNameInputLocator)).toHaveValue(userData.name);
    await expect(page.locator(fiscalCodeInputLocator)).toHaveValue(userData.fiscal_code);
    await expect(page.locator(emailInputLocator)).toHaveValue(userData.email);
    await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toHaveValue(municipality.name);
    // going to summary page again (STEP THREE)
    await page.getByTestId(nextButtonId).click();
    // STEP THREE: Summary page assertions
    await checkSummary();
  }

  // STEP FOUR: Payment page assertions
  // Trigger the action that makes the call
  await page.getByTestId(nextButtonId).click();

  // Await the response and check that it succeeded
  const response = await debtPositionResponse;
  expect(response.ok()).toBeTruthy(); // Asserts that status is in the 200-299 range

  // Continue with other assertions
  await expect(page.getByTestId('pay-button')).toBeVisible();
  await expect(page.getByTestId('download-notice-button')).toBeVisible();
});
