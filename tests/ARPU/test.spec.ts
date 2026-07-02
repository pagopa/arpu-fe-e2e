import { test, expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth.fixture';
import { SELECTORS, ARPU_BROKER_URL } from '../../utils';
import { NOTICE_API } from '../../utils/api';

const TEST_URL = ARPU_BROKER_URL;
const TEST_IUV_OR_NAV = '50000000001140314';
const TEST_PAID_IUV = '301000000230616789';
const TEST_USER = 'Marco Polo';
const TEST_CF = 'PLOMRC01P30L736Y';
const TEST_EMAIL = 'marcopolo@test.it';

const noticeInfo = {
  ec: 'EC DEMO',
  amount: '97,50 €',
  orgFisacalCode: '99999000013'
};

authTest(
  'ARPU-002 - Come cittadino voglio scaricare una ricevuta di pagamento',
  async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`${TEST_URL}/dashboard`);
    expect(authenticatedPage.url()).toContain(`${TEST_URL}/dashboard`);
    // add mores steps according to the ARPU-002 test case
  }
);

test('ARPU-004 - Come cittadino voglio generare un avviso di pagamento “spontaneo" e procedere con il pagamento', async ({
  page
}) => {
  const TEST_OBJECT = 'ARPU-004 Causale di test';
  const TEST_REASON = '[E2E DO NOT DELETE]';
  const TEST_AMOUNT_FORMATED = '2,00 €';
  const TEST_AMOUNT_VALUE = '2';

  await page.goto(`${TEST_URL}/accesso`);
  await page.getByTestId(SELECTORS.buttons.spontaneousPayment).click();

  // Select Municipality
  await page.locator(SELECTORS.buttons.org).click();
  await page.getByRole('option', { name: noticeInfo.ec }).click();
  await page.getByTestId(SELECTORS.buttons.next).click();

  // Select Reason
  await page.getByText(TEST_REASON).click();
  await page.getByTestId(SELECTORS.buttons.next).click();

  // Fill Form
  await page.locator(SELECTORS.inputs.fullName).click();
  await page.locator(SELECTORS.inputs.fullName).fill(TEST_USER);
  await page.locator(SELECTORS.inputs.email).click();
  await page.locator(SELECTORS.inputs.email).fill(TEST_EMAIL);
  await page.locator(SELECTORS.inputs.description).click();
  await page.locator(SELECTORS.inputs.description).fill(TEST_OBJECT);
  await page.locator(SELECTORS.inputs.fiscalCode).click();
  await page.locator(SELECTORS.inputs.fiscalCode).fill(TEST_CF);
  await page.locator(SELECTORS.inputs.amount).click();
  await page.locator(SELECTORS.inputs.amount).fill(TEST_AMOUNT_VALUE);
  await page.getByTestId(SELECTORS.buttons.next).click();

  // Resume
  await expect(page.getByTestId('summary-org-name-value')).toContainText(noticeInfo.ec);
  await expect(page.getByTestId('summary-payment-amount-value')).toContainText(
    TEST_AMOUNT_FORMATED
  );
  await expect(page.getByTestId('summary-org-code-value')).toContainText(noticeInfo.orgFisacalCode);
  await expect(page.getByTestId('summary-service-name-value')).toContainText(TEST_REASON);
  await expect(page.getByTestId('summary-debtor-name-value')).toContainText(TEST_USER);
  await expect(page.getByTestId('summary-debtor-code-value')).toContainText(TEST_CF);
  await expect(page.getByTestId('summary-debtor-email-value')).toContainText(TEST_EMAIL);
  await expect(page.getByTestId('summary-payment-description-value')).toContainText(TEST_OBJECT);

  await page.getByTestId(SELECTORS.buttons.next).click();

  //download notice pd
  const noticeResponsePromise = page.waitForResponse(NOTICE_API);
  const noticeResponse = await noticeResponsePromise;
  const noticeResponseData = await noticeResponse.json();
  const { nav } = noticeResponseData.paymentDetails;

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
  await page.getByTestId(SELECTORS.buttons.pay).click();

  //CHECKOUT
  await page.getByLabel('Apri riepilogo pagamento').click();

  const amount = page.getByText('Importo', { exact: true }).locator('//following-sibling::*[1]');
  await expect(amount).toHaveText(TEST_AMOUNT_FORMATED);

  const ec = page.getByText('Ente Creditore', { exact: true }).locator('//following-sibling::*[1]');
  await expect(ec).toHaveText(noticeInfo.ec);

  //Simulate successful completion
  await page.goto(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${nav}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );
  await page.waitForURL(
    `${TEST_URL}/public/esito/pagamento-avviso-completato?nav=${nav}&org_fiscal_code=${noticeInfo.orgFisacalCode}`
  );
});

test('ARPU-005 - Come cittadino voglio recuperare una ricevute di un pagamento che ho effettuato per poter consultare il dettaglio e scaricare il pdf', async ({
  page
}) => {
  await page.goto(
    `/cittadini/demo/public/ricevute/ricerca#fiscalCode=${TEST_CF}&iuvOrNav=${TEST_PAID_IUV}`
  );
  await page.getByTestId('download-receipt-button').click();
  const downloadPromise = page.waitForEvent('download');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.pdf');
});

test('ARPU-006 - Come cittadino voglio cercare una avviso di pagamento, scaricare il pdf e procedere con il pagamento', async ({
  page
}) => {
  await page.goto(`${TEST_URL}/accesso`);
  await page.getByTestId(SELECTORS.buttons.login).click();

  // form compilation
  await page.locator(SELECTORS.noticeSearch.iuvInput).fill(TEST_IUV_OR_NAV);
  await page.locator(SELECTORS.noticeSearch.cfInput).fill(TEST_CF);
  await page.locator(SELECTORS.noticeSearch.searchButton).click();

  //download notice pdf
  await expect(page.locator(SELECTORS.noticeSearch.statusClass)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId(SELECTORS.noticeSearch.downloadButton).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('.pdf');

  //pay notice
  await page.goBack();
  await page.getByTestId(SELECTORS.noticeSearch.payButtonLabel).click();

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
