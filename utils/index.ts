// TYPES AND INTERFACES
export interface Municipality {
  label: string;
  value: string;
}

export interface MunicipalityResponse {
  result: Municipality[];
}

export interface Reason {
  description: string;
  code: number;
}

export type ReasonResponse = Reason[];

export const userData = {
  name: 'Marco Polo',
  fiscal_code: 'MRCPLO80A01H501J',
  email: 'marcopolo@test.it'
};

// SELECTORS
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
    amount: 'summary-extra-cieAmountCents-value',
    debtorName: 'summary-debtor-name-value',
    debtorCode: 'summary-debtor-code-value',
    debtorEmail: 'summary-debtor-email-value'
  }
};

// HELPERS
/** Return a random element from a list */
export function getRandomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Convers a currency string to a number.
 * Example: '12,21 €' -> 12.21
 */
export function parseCurrencyToNumber(currencyString: string): number {
  if (!currencyString) return 0;
  // Remove non-numeric characters except for the decimal separator (comma)
  // This assumes the Italian/European format provided in the example
  const sanitized = currencyString.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(sanitized);
}
