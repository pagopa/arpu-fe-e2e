import { expect, Page } from '@playwright/test';
import {
  avaiableReasons,
  avaiableMunicipalities,
  userData,
  getRandomFrom,
  parseCurrencyToNumber
} from '../utils/index.ts';

// ============================================================================
// Constants
// ============================================================================

export const SELECTORS = {
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

export const BASE_URL = '/cittadini/cie/public/spontanei/';
const MIN_AMOUNT = 1;

export function createSteps(page: Page) {
  return {
    /**
     * STEP 1: Select a payment reason
     * @param reason - Optional specific reason. If not provided, selects random
     */
    async selectReason(reason?: any) {
      const selected = reason || getRandomFrom(avaiableReasons);
      console.log(`Selected reason: ${selected.name}`);

      await page.getByText(selected.name).click();
      await expect(page.getByLabel(selected.name)).toBeChecked();
      await page.getByTestId(SELECTORS.buttons.next).click();

      return selected;
    },

    /**
     * STEP 2: Fill debtor form with validation
     * @param municipality - Optional specific municipality. If not provided, selects random
     */
    async fillForm(municipality?: any) {
      const selected = municipality || getRandomFrom(avaiableMunicipalities);
      console.log(`Selected municipality: ${selected.name}`);

      // Verify validation on empty form
      await page.getByTestId(SELECTORS.buttons.next).click();
      await expect(page.locator(SELECTORS.helpers.fullName)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.email)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.fiscalCode)).toBeVisible();
      await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).toBeVisible();

      // Fill form
      await page.locator(SELECTORS.inputs.orgFiscalCode).click();
      await page.getByRole('option', { name: selected.name }).click();
      await page.locator(SELECTORS.inputs.fullName).fill(userData.name);
      await page.locator(SELECTORS.inputs.fiscalCode).fill(userData.fiscal_code);
      await page.locator(SELECTORS.inputs.email).fill(userData.email);

      // Verify errors cleared
      await expect(page.locator(SELECTORS.helpers.fullName)).not.toBeVisible();
      await expect(page.locator(SELECTORS.helpers.email)).not.toBeVisible();
      await expect(page.locator(SELECTORS.helpers.fiscalCode)).not.toBeVisible();
      await expect(page.locator(SELECTORS.helpers.orgFiscalCode)).not.toBeVisible();

      return selected;
    },

    /**
     * STEP 3: Verify summary page displays correct data
     */
    async verifySummary(reason: any, municipality: any) {
      await page.getByTestId(SELECTORS.buttons.next).click();

      await expect(page.getByTestId(SELECTORS.summary.municipality)).toContainText(
        municipality.name
      );
      await expect(page.getByTestId(SELECTORS.summary.municipalityCode)).toContainText(
        municipality.fiscal_code
      );
      await expect(page.getByTestId(SELECTORS.summary.debtType)).toContainText(reason.name);

      const amount = await page.getByTestId(SELECTORS.summary.amount).textContent();
      const parsedAmount = parseCurrencyToNumber(amount || '');
      expect(parsedAmount).toBeGreaterThan(MIN_AMOUNT);

      await expect(page.getByTestId(SELECTORS.summary.debtorName)).toContainText(userData.name);
      await expect(page.getByTestId(SELECTORS.summary.debtorCode)).toContainText(
        userData.fiscal_code
      );
      await expect(page.getByTestId(SELECTORS.summary.debtorEmail)).toContainText(userData.email);
    },

    /**
     * STEP 4: Process payment and verify payment page
     */
    async processPayment() {
      const response = page.waitForResponse(
        (r) => r.url().includes('spontaneous/debt-positions') && r.request().method() === 'POST'
      );

      await page.getByTestId(SELECTORS.buttons.next).click();

      const result = await response;
      expect(result.ok()).toBeTruthy();

      await expect(page.getByTestId(SELECTORS.buttons.pay)).toBeVisible();
      await expect(page.getByTestId(SELECTORS.buttons.downloadNotice)).toBeVisible();

      return result;
    },

    /**
     * STEP 2B: User selects a different reason
     */
    async changeReason(currentReason: any, newReason?: any, newMunicipality?: any) {
      const updatedReason = newReason || getRandomFrom(avaiableReasons);
      const updatedMunicipality = newMunicipality || getRandomFrom(avaiableMunicipalities);

      console.log(
        `Changed to reason: ${updatedReason.name}, municipality: ${updatedMunicipality.name}`
      );

      // Go back and verify current selection
      await page.getByTestId(SELECTORS.buttons.back).click();
      await expect(page.getByLabel(currentReason.name)).toBeChecked();

      // Select new reason and proceed
      await page.getByText(updatedReason.name).click();
      await page.getByTestId(SELECTORS.buttons.next).click();

      // Verify form reset
      await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toBeEmpty();

      // Fill with new data
      await page.locator(SELECTORS.inputs.orgFiscalCode).click();
      await page.getByRole('option', { name: updatedMunicipality.name }).click();
      await page.locator(SELECTORS.inputs.fullName).fill(userData.name);
      await page.locator(SELECTORS.inputs.fiscalCode).fill(userData.fiscal_code);
      await page.locator(SELECTORS.inputs.email).fill(userData.email);

      return { reason: updatedReason, municipality: updatedMunicipality };
    },

    /**
     * STEP 3B: User returns to form to verify/change data
     */
    async returnToForm(reason: any, municipality: any) {
      await page.getByTestId(SELECTORS.buttons.back).click();

      // Verify form data persisted
      await expect(page.locator(SELECTORS.inputs.fullName)).toHaveValue(userData.name);
      await expect(page.locator(SELECTORS.inputs.fiscalCode)).toHaveValue(userData.fiscal_code);
      await expect(page.locator(SELECTORS.inputs.email)).toHaveValue(userData.email);
      await expect(page.getByRole('combobox', { name: 'Cerca il comune' })).toHaveValue(
        municipality.name
      );

      // Go back to summary
      await page.getByTestId(SELECTORS.buttons.next).click();
      await this.verifySummary(reason, municipality);
    }
  };
}
