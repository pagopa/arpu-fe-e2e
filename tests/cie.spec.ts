import { test, expect } from '@playwright/test';

test('CIE-001 - Come cittadino voglio generare un avviso di pagamento per richiedere o rinnovare la Carta di Identità elettronica', async ({ page }) => {
  // Starting from the landing page
  await page.goto('https://uat.p4pa.pagopa.it/cie/');
  await page.locator('div').filter({ hasText: /^Paga oraScopri come funziona$/ }).getByRole('link').click();

  // Reason selection
  await page.getByText('Ho perso la carta d\'identità').click();
  await page.getByTestId('spontanei-controls-continue-button').click();

  // Debtor data
  await page.getByLabel('Cerca il comune').click();
  await page.getByRole('option', { name: 'Comune di Brescia (BS)' }).click();
  await page.getByLabel('Nome e cognome *').click();
  await page.getByLabel('Nome e cognome *').fill('Marco Polo');
  await page.getByLabel('Codice Fiscale *').click();
  await page.getByLabel('Codice Fiscale *').fill('MRCPLO80A01H501J');
  await page.getByLabel('Email per la ricevuta *').click();
  await page.getByLabel('Email per la ricevuta *').fill('marcopolo@test.it');
  await page.getByTestId('spontanei-controls-continue-button').click();

  // Summary page assertions
  // Organization and reason
  await expect(page.getByTestId('summary-extra-orgFiscalCode.label-value')).toContainText('Comune di Brescia (BS)');
  await expect(page.getByTestId('summary-extra-orgFiscalCode.value-value')).toContainText('00761890177');
  await expect(page.getByTestId('summary-extra-debtType.description-value')).toContainText('Ho perso la carta d\'identità');

  // Debtor
  await expect(page.getByTestId('summary-debtor-name-value')).toContainText('Marco Polo');
  await expect(page.getByTestId('summary-debtor-code-value')).toContainText('MRCPLO80A01H501J');
  await expect(page.getByTestId('summary-debtor-email-value')).toContainText('marcopolo@test.it');

  // Payment
  await page.getByTestId('summary-payment-description-value').click();
  await expect(page.getByTestId('summary-payment-description-value')).toContainText('Carta d\'Identità Elettronica - Smarrimento');
  await expect(page.getByTestId('summary-payment-amount-value')).toContainText('11,30 €');

  // Continue button
  //await page.getByTestId('summary-continue-button').click();
});