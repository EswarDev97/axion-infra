import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://localhost:3899', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  console.log('Page title:', await page.title());
  console.log('Body text length:', (await page.textContent('body')).length);

  // Check if navigation buttons exist
  const buttons = await page.locator('button').count();
  console.log('Total buttons found:', buttons);

  // Get all button texts
  const buttonTexts = await page.locator('button').allTextContents();
  console.log('Button texts:', buttonTexts);

  await browser.close();
})();
