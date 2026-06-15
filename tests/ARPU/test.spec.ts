import { test, expect } from '@playwright/test';
import { SELECTORS } from '../../utils';

const TEST_URL = '/cittadini/ptdemo';
const TEST_IUV_OR_NAV = '50000000001140314';
const TEST_CF = 'PLOMRC01P30L736Y';

const noticeInfo = {
  ec: 'EC DEMO',
  amount: '97,50 €',
  orgFisacalCode: '00199999000013'
};

test('ARPU-006 - Come cittadino voglio cercare una avviso di pagamento, scaricare il pdf e procedere con il pagamento', async ({
  page
}) => {
  await page.goto(`${TEST_URL}/accesso`);
  await page.getByRole('button', { name: 'Cerca un avviso' }).click();

  // form compilation
  await page.locator(SELECTORS.noticeSearch.iuvInput).fill(TEST_IUV_OR_NAV);
  await page.locator(SELECTORS.noticeSearch.cfInput).fill(TEST_CF);
  await page.locator(SELECTORS.noticeSearch.searchButton).click();

  //download notice pdf
  await expect(page.locator('span.MuiChip-label')).toContainText('Da pagare');
  const downloadPromise = page.waitForEvent('download');
  await page.locator(SELECTORS.noticeSearch.downloadButton).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('.pdf');

  //pay notice
  await page.goBack();
  await page.getByRole('button', { name: SELECTORS.noticeSearch.payButtonLabel }).click();

  //CHECKOUT
  await page.getByLabel('Apri riepilogo pagamento').click();

  const amount = page.getByText('Importo', { exact: true }).locator('//following-sibling::*[1]');
  await expect(amount).toHaveText(noticeInfo.amount);

  const ec = page.getByText('Ente Creditore', { exact: true }).locator('//following-sibling::*[1]');
  await expect(ec).toHaveText(noticeInfo.ec);

  //Simulate successful completion
  await page.goto(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );
  await page.waitForURL(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );
});




test('ARPU-004 - Come cittadino voglio generare un avviso di pagamento “spontaneo" e procedere con il pagamento', async ({ page }) => {
  await page.goto(`${TEST_URL}/accesso`);
  await page.getByRole('button', { name: 'Fai un pagamento spontaneo' }).click();
  await page.getByLabel('Cerca per nome dell\'ente *').click();
  await page.getByRole('option', { name: 'EC DEMO' }).click();
  await page.getByTestId('spontanei-controls-continue-button').click();
  await page.getByText('Diritti di segreteria').click();
  await page.getByTestId('spontanei-controls-continue-button').click();
  await page.getByLabel('Nome e Cognome debitore *').click();
  await page.getByLabel('Nome e Cognome debitore *').fill('Marco Polo');
  await page.getByLabel('Email *').click();
  await page.getByLabel('Email *').fill('marcopolo@test.it');
  await page.getByLabel('Oggetto del pagamento *').click();
  await page.getByLabel('Oggetto del pagamento *').fill('Test');
  await page.getByLabel('Codice Fiscale *').click();
  await page.getByLabel('Codice Fiscale *').fill(TEST_CF);
  await page.getByTestId('spontanei-controls-continue-button').click();

  await page.getByTestId('spontanei-controls-continue-button').click();

  //download notice pdf
  //Wait for DB update notice status
  await page.waitForTimeout(2000);
  const newPagePromise = page.waitForEvent('popup');
  await page.getByTestId(SELECTORS.buttons.downloadNotice).click();

  const newPage = await newPagePromise;
  await newPage.waitForLoadState();

  // Wait for download to start in the new tab
  const download = await newPage.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('.pdf');

  // Pay notice
  await page.getByTestId('pay-button').click();

  //CHECKOUT
  await page.getByLabel('Apri riepilogo pagamento').click();

  const amount = page.getByText('Importo', { exact: true }).locator('//following-sibling::*[1]');
  await expect(amount).toHaveText('2,00 €');

  const ec = page.getByText('Ente Creditore', { exact: true }).locator('//following-sibling::*[1]');
  await expect(ec).toHaveText('EC DEMO');

  //Simulate successful completion
  await page.goto(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );
  await page.waitForURL(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );

});