import { test, expect } from '@playwright/test';

const TEST_URL = '/cittadini/ptdemo/accesso';
const TEST_IUV = '50000000000040684';
const TEST_CF = 'PLOMRC01P30L736Y';

const noticeInfo = {
  ec: 'EC DEMO',
  amount: '111,00 €'
};

test('ARPU-006 - Come cittadino voglio cercare una avviso di pagamento, scaricare il pdf e procedere con il pagamento', async ({
  page
}) => {
  await page.goto(TEST_URL);
  await page.getByRole('button', { name: 'Cerca un avviso' }).click();
  await page.getByLabel('Codice Avviso/IUV').click();
  await page.getByLabel('Codice Avviso/IUV').fill(TEST_IUV);
  await page.getByLabel('Codice Fiscale', { exact: true }).click();
  await page.getByLabel('Codice Fiscale', { exact: true }).fill(TEST_CF);
  await page.getByRole('button', { name: 'Cerca' }).click();

  //download notice pdf
  const downloadPromise = page.waitForEvent('download');
  await page.getByLabel('Scarica').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('.pdf');

  //pay notice
  await page.goBack();
  await page.getByRole('button', { name: 'Paga ora' }).click();
  await page.getByLabel('Apri riepilogo pagamento').click();

  const amount = page.getByText('Importo', { exact: true }).locator('//following-sibling::*[1]');
  await expect(amount).toHaveText(noticeInfo.amount);

  const ec = page.getByText('Ente Creditore', { exact: true }).locator('//following-sibling::*[1]');
  await expect(ec).toHaveText(noticeInfo.ec);
});
