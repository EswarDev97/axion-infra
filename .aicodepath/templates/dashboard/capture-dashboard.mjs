import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3899', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Screenshot 1: Main dashboard (Monitor view)
    await page.screenshot({ 
      path: '/tmp/dashboard-monitor.png',
      fullPage: true 
    });
    console.log('✅ Captured: Monitor view');

    // Click Visual Memory tab
    await page.click('text=Visual Memory');
    await page.waitForTimeout(2000);
    
    // Screenshot 2: Visual Memory gallery
    await page.screenshot({ 
      path: '/tmp/dashboard-visual-memory.png',
      fullPage: true 
    });
    console.log('✅ Captured: Visual Memory gallery');

    // Click first diagram card to open modal
    const firstCard = await page.locator('.group').first();
    const count = await firstCard.count();
    if (count > 0) {
      await firstCard.click();
      await page.waitForTimeout(1500);
      
      // Screenshot 3: Diagram modal
      await page.screenshot({ 
        path: '/tmp/dashboard-diagram-modal.png',
        fullPage: false 
      });
      console.log('✅ Captured: Diagram modal');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
