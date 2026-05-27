import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3899', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click Visual Memory tab
    await page.click('text=Visual Memory');
    await page.waitForTimeout(3000);  // Wait for animations

    // Screenshot 1: Enhanced gallery view
    await page.screenshot({
      path: '/tmp/enhanced-gallery.png',
      fullPage: true
    });
    console.log('✅ Captured: Enhanced gallery view');

    // Click first diagram card
    const firstCard = await page.locator('.group').first();
    await firstCard.click();
    await page.waitForTimeout(2000);

    // Screenshot 2: Modal with zoom controls
    await page.screenshot({
      path: '/tmp/enhanced-modal.png',
      fullPage: false
    });
    console.log('✅ Captured: Modal with zoom controls');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
