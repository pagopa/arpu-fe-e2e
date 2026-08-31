# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ARPU/test.spec.ts >> ARPU-001 - Come cittadino voglio pagare un avviso di pagamento
- Location: tests/ARPU/test.spec.ts:16:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "https://uat.p4pa.pagopa.it/cittadini/ptdemo/public/esito/pagamento-avviso-completato?nav=350000000001140314&org_fiscal_code=99999000013", waiting until "load"

```

# Test source

```ts
  43  |     next: 'spontanei-controls-continue-button',
  44  |     back: 'spontanei-controls-back-button',
  45  |     org: '[name="org"]',
  46  |     pay: 'pay-button',
  47  |     downloadNotice: 'download-notice-button',
  48  |     retry: 'courtesyPage.cta',
  49  |     login: 'loginPage-cta3',
  50  |     spontaneousPayment: 'loginPage-cta1'
  51  |   },
  52  |   inputs: {
  53  |     fullName: '[id="fullName"]',
  54  |     fiscalCode: '[id="fiscalCode"]',
  55  |     email: '[id="email"]',
  56  |     orgFiscalCode: '[id="orgFiscalCode"]',
  57  |     amount: '[name="amount"]',
  58  |     description: '[name="description"]'
  59  |   },
  60  |   helpers: {
  61  |     fullName: '[id="fullName-helper-text"]',
  62  |     fiscalCode: '[id="fiscalCode-helper-text"]',
  63  |     email: '[id="email-helper-text"]',
  64  |     orgFiscalCode: '[id="orgFiscalCode-helper-text"]'
  65  |   },
  66  |   summary: {
  67  |     municipality: 'summary-extra-orgFiscalCode.label-value',
  68  |     municipalityCode: 'summary-extra-orgFiscalCode.value-value',
  69  |     debtType: 'summary-extra-debtType.description-value',
  70  |     amount: 'summary-extra-cieAmountCents-value',
  71  |     debtorName: 'summary-debtor-name-value',
  72  |     debtorCode: 'summary-debtor-code-value',
  73  |     debtorEmail: 'summary-debtor-email-value'
  74  |   },
  75  |   noticeSearch: {
  76  |     iuvInput: '[id="iuvOrNav"]',
  77  |     cfInput: '[id="fiscalCode"]',
  78  |     searchButton: 'button[type="submit"]',
  79  |     downloadButton: 'download-payment-notice-button',
  80  |     statusClass: '.status__UNPAID',
  81  |     payButtonLabel: 'pay-now-button'
  82  |   },
  83  |   sidebar: {
  84  |     home: 'sidebar-menu-item-homepage',
  85  |     debtPositions: 'sidebar-menu-item-debt-positions',
  86  |     receipts: 'sidebar-menu-item-receipts'
  87  |   },
  88  |   debtPositionListPage: {
  89  |     detailButton: 'debt-position-detail-button-:debtPositionId'
  90  |   },
  91  |   receiptListPage: {
  92  |     detailButton: 'receipt-detail-button-:receiptId'
  93  |   },
  94  |   receiptDetailPage: {
  95  |     downloadButton: 'receipt-detail-download-button'
  96  |   },
  97  |   debtPositionDetailPage: {
  98  |     payButton: 'payment-option-action-pay'
  99  |   },
  100 |   searchPage: {
  101 |     goToDetailButton: 'search-item-detail-button'
  102 |   },
  103 |   listItem: {
  104 |     ec: 'list-item-ec',
  105 |     description: 'list-item-description'
  106 |   }
  107 | };
  108 | 
  109 | // HELPERS
  110 | /** Return a random element from a list */
  111 | export function getRandomFrom<T>(list: T[]): T {
  112 |   return list[Math.floor(Math.random() * list.length)];
  113 | }
  114 | 
  115 | /**
  116 |  * Convers a currency string to a number.
  117 |  * Example: '12,21 €' -> 12.21
  118 |  */
  119 | export function parseCurrencyToNumber(currencyString: string): number {
  120 |   if (!currencyString) return 0;
  121 |   // Remove non-numeric characters except for the decimal separator (comma)
  122 |   // This assumes the Italian/European format provided in the example
  123 |   const sanitized = currencyString.replace(/[^\d,.-]/g, '').replace(',', '.');
  124 |   return parseFloat(sanitized);
  125 | }
  126 | /**
  127 |  * Simulates the checkout payment process for a given notice.
  128 |  */
  129 | export const simulateCheckoutPayment = async (page: Page, paymentDetails: PaymentDetails) => {
  130 |   await page.getByLabel('Apri riepilogo pagamento').click();
  131 | 
  132 |   const amount = page
  133 |     .getByText('Importo', { exact: true })
  134 |     .locator('xpath=following-sibling::*[1]');
  135 |   await expect(amount).toHaveText(paymentDetails.amount);
  136 | 
  137 |   const ec = page
  138 |     .getByText('Ente Creditore', { exact: true })
  139 |     .locator('xpath=following-sibling::*[1]');
  140 |   await expect(ec).toHaveText(paymentDetails.ec);
  141 | 
  142 |   //Simulate successful completion
> 143 |   await page.goto(
      |              ^ Error: page.goto: Target page, context or browser has been closed
  144 |     `${ARPU_BROKER_URL}/public/esito/pagamento-avviso-completato?nav=${paymentDetails.nav}&org_fiscal_code=${paymentDetails.orgFiscalCode}`
  145 |   );
  146 |   await page.waitForURL(
  147 |     `${ARPU_BROKER_URL}/public/esito/pagamento-avviso-completato?nav=${paymentDetails.nav}&org_fiscal_code=${paymentDetails.orgFiscalCode}`
  148 |   );
  149 | };
  150 | 
  151 | /**
  152 |  * Finds a debt position by its description using pagination.
  153 |  */
  154 | export const findDebPositionByDescriptionUsingPagination = async (
  155 |   page: Page,
  156 |   description: string
  157 | ) => {
  158 |   let found = false;
  159 |   let currentPage = 1;
  160 |   while (!found && currentPage <= 20) {
  161 |     const notices = page.locator('[role="listitem"]');
  162 |     await expect(notices.first()).toBeVisible();
  163 |     const count = await notices.count();
  164 |     console.log(
  165 |       `Checking ${count} debt positions on page ${currentPage} for description: "${description}"`
  166 |     );
  167 | 
  168 |     for (let i = 0; i < count; i++) {
  169 |       const noticeDescription = await notices
  170 |         .nth(i)
  171 |         .getByTestId(SELECTORS.listItem.description)
  172 |         .textContent();
  173 |       if (noticeDescription === description) {
  174 |         found = true;
  175 |         break;
  176 |       }
  177 |     }
  178 | 
  179 |     if (!found) {
  180 |       const nextButton = page.getByLabel('Go to next page');
  181 |       if (!(await nextButton.isVisible())) {
  182 |         break; // No more pages to navigate
  183 |       }
  184 |       await nextButton.click();
  185 |       currentPage++;
  186 |     }
  187 |   }
  188 | 
  189 |   return found;
  190 | };
  191 | 
```