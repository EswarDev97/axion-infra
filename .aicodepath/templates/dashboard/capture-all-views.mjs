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

    // Screenshot 1: Monitor View (default)
    console.log('Capturing Monitor View...');
    await page.screenshot({
      path: '/tmp/monitor-view-enhanced.png',
      fullPage: true
    });
    console.log('✅ Captured: Monitor View');

    // Screenshot 2: Kanban Board - using button selector
    console.log('Capturing Kanban Board...');
    const kanbanButton = page.locator('button:has-text("Kanban Board")');
    await kanbanButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/tmp/kanban-board-enhanced.png',
      fullPage: true
    });
    console.log('✅ Captured: Kanban Board');

    // Screenshot 3: Dependencies Graph
    console.log('Capturing Dependencies Graph...');
    const depsButton = page.locator('button:has-text("Dependencies")');
    await depsButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/tmp/dependency-graph-enhanced.png',
      fullPage: true
    });
    console.log('✅ Captured: Dependencies Graph');

    // Screenshot 4: Visual Memory
    console.log('Capturing Visual Memory...');
    const memoryButton = page.locator('button:has-text("Visual Memory")');
    await memoryButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/tmp/visual-memory-enhanced.png',
      fullPage: true
    });
    console.log('✅ Captured: Visual Memory');

    // Screenshot 5: Visual Memory with Modal
    console.log('Capturing Visual Memory Modal...');
    const firstCard = page.locator('.group').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: '/tmp/visual-memory-modal.png',
        fullPage: false
      });
      console.log('✅ Captured: Visual Memory Modal');
    }

    console.log('\n🎉 All screenshots captured successfully!');
    console.log('\nScreenshots saved to:');
    console.log('  - /tmp/monitor-view-enhanced.png');
    console.log('  - /tmp/kanban-board-enhanced.png');
    console.log('  - /tmp/dependency-graph-enhanced.png');
    console.log('  - /tmp/visual-memory-enhanced.png');
    console.log('  - /tmp/visual-memory-modal.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
