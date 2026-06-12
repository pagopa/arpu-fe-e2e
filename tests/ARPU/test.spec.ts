import { test, expect } from '@playwright/test';
import { SELECTORS } from '../../utils';

const TEST_URL = '/cittadini/ptdemo';
const TEST_IUV_OR_NAV = '50000000001140314';
const TEST_CF = 'PLOMRC01P30L736Y';

const noticeInfo = {
  ec: 'EC DEMO',
  amount: '97,50 €',
  orgFisacalCode: '00199999000013',
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
  await page.goto(`${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`);
  await page.waitForURL(`${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${TEST_IUV_OR_NAV}&org_fiscal_code=${noticeInfo.orgFisacalCode}`);
});
