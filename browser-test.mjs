import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  const consoleLogs = [];
  const errors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.message));
  
  try {
    // Step 1: Navigate
    console.log('=== STEP 1: Navigate to app ===');
    let connected = false;
    for (let i = 0; i < 30; i++) {
      try {
        const resp = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 5000 });
        console.log(`  Connected: status ${resp?.status()}`);
        connected = true;
        break;
      } catch(e) {
        if (i < 29) await page.waitForTimeout(2000);
      }
    }
    if (!connected) { console.log('  FATAL: Cannot connect'); return; }
    await page.waitForTimeout(2000);
    console.log(`  Title: "${await page.title()}"`);

    // Step 2: Login
    console.log('\n=== STEP 2: Login ===');
    await page.locator('#email, input[type="email"]').first().fill('admin@meridian.com');
    await page.locator('#password, input[type="password"]').first().fill('password123');
    await page.locator('button:has-text("Sign In")').first().click();
    console.log('  Submitted login form');
    
    // Wait for the sidebar to appear (indicates successful login)
    await page.locator('text=Dashboard').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('  Login successful (sidebar visible)');
    await page.screenshot({ path: '/home/z/my-project/screenshot-02-login.png', fullPage: false });
    console.log('  Screenshot: screenshot-02-login.png');

    // Step 3: Click "Front Desk" to expand sidebar section
    console.log('\n=== STEP 3: Click "Front Desk" in sidebar ===');
    
    // The "Front Desk" button - need to find the specific one in the sidebar, not in any other area
    // Using the sidebar-menu-button that contains "Front Desk"
    const frontDeskBtn = page.locator('[data-sidebar="menu-button"], [class*="sidebar-menu-button"]').filter({ hasText: 'Front Desk' }).first();
    
    // Alternative: just click the text "Front Desk" in the sidebar area
    const sidebar = page.locator('aside, nav, [data-sidebar="content"]').first();
    const fdInSidebar = sidebar.locator('text=Front Desk').first();
    
    try {
      if (await fdInSidebar.isVisible({ timeout: 5000 })) {
        await fdInSidebar.click();
        console.log('  Clicked "Front Desk" in sidebar');
      } else {
        console.log('  Trying alternative selector...');
        await page.getByText('Front Desk').first().click();
        console.log('  Clicked "Front Desk" via getByText');
      }
    } catch(e) {
      console.log(`  Error clicking Front Desk: ${e.message}`);
    }
    
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/home/z/my-project/screenshot-03-frontdesk-expanded.png', fullPage: false });
    console.log('  Screenshot: screenshot-03-frontdesk-expanded.png');

    // Step 4: Click "Calendar" sub-menu item
    console.log('\n=== STEP 4: Click "Calendar" sub-menu ===');
    
    // After expanding, look for "Calendar" text in the sidebar sub-items
    // The Calendar sub-item should now be visible
    const calendarSubItem = page.locator('text=Calendar').last(); // last() to avoid matching other Calendar references
    
    // Get all text content near Calendar to verify it's a sub-item
    try {
      // Wait for Calendar to be visible as a sub-item
      const calendarVisible = await calendarSubItem.isVisible({ timeout: 5000 });
      if (calendarVisible) {
        console.log('  Found "Calendar" sub-item, clicking...');
        await calendarSubItem.click();
        console.log('  Clicked "Calendar" sub-item');
      } else {
        // Maybe the sub-menu items use a different approach
        console.log('  Calendar not visible, trying SidebarMenuSubButton...');
        const subButtons = page.locator('[data-sidebar="menu-sub-button"], [class*="sidebar-menu-sub"]').filter({ hasText: 'Calendar' });
        if (await subButtons.count() > 0) {
          await subButtons.first().click();
          console.log('  Clicked via SidebarMenuSubButton');
        } else {
          console.log('  No sub-button found either');
        }
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
    
    // CRITICAL: Wait for the calendar view to render
    // The CalendarView loads data via API and renders a grid
    console.log('  Waiting for calendar view to render...');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/home/z/my-project/screenshot-04-calendar.png', fullPage: false });
    console.log('  Screenshot: screenshot-04-calendar.png');
    console.log(`  URL: ${page.url()}`);

    // Additional wait for any lazy-loaded content
    console.log('  Waiting additional 3s for lazy content...');
    await page.waitForTimeout(3000);
    
    // Step 5: Check what's on screen
    console.log('\n=== STEP 5: Verify Calendar content ===');
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    // Print a focused snippet - look for calendar-specific content
    const calendarSection = pageContent.substring(0, 5000);
    console.log('  (looking for calendar-specific indicators in page content)');
    
    // More precise checks for calendar view
    const calendarChecks = [
      ['"Front Desk" heading visible', /Front Desk/i],
      ['Calendar tab active', /Calendar/i],
      ['Room numbers in grid', /(?:Room|#)\s*(?:101|102|103|104|105|106|107|108|201|202|203)/i],
      ['14-day date headers', /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}/],
      ['Reservation status (Occupied)', /Occupied|occupied|Checked.?In|checked.?in|In.?House/i],
      ['Available/Vacant rooms', /Available|Vacant|vacant/i],
      ['Color legend section', /legend|Legend|Color.*code|Status.*key/i],
      ['Stats summary cards', /Occupancy.*%|Arrivals.*\d|Departures.*\d|Rooms.*Available/i],
      ['Navigation arrows/buttons', /Prev|Next|Previous|<|>|arrow/i],
      ['Guest names on reservations', /[A-Z][a-z]+\s+[A-Z][a-z]+/],
      ['Reservation confirmation numbers', /TKH-|CONF-|RES-/],
    ];
    
    let pass = 0, fail = 0;
    for (const [name, pattern] of calendarChecks) {
      const found = pattern.test(pageContent);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
      if (found) pass++; else fail++;
    }
    console.log(`\n  Result: ${pass}/${pass+fail} checks passed`);
    
    // Check if we're still on dashboard (should NOT contain these if on calendar)
    const dashboardIndicators = [
      ['Dashboard-specific: "Good Afternoon"', /Good (Morning|Afternoon|Evening)/],
      ['Dashboard-specific: "Revenue Trend"', /Revenue Trend/],
      ['Dashboard-specific: "Room Status Overview"', /Room Status Overview/],
    ];
    console.log('\n  Dashboard leak check (these should NOT appear on Calendar):');
    for (const [name, pattern] of dashboardIndicators) {
      const found = pattern.test(pageContent);
      console.log(`  ${found ? '⚠️ STILL ON DASHBOARD' : '✅ Not on dashboard'}: ${name}`);
    }
    
    // Full page screenshot
    await page.screenshot({ path: '/home/z/my-project/screenshot-05-calendar-full.png', fullPage: true });
    console.log('\n  Full page: screenshot-05-calendar-full.png');
    
    // Step 6: Error check
    console.log('\n=== STEP 6: Errors ===');
    const errorLogs = consoleLogs.filter(l => l.startsWith('[error]'));
    if (errorLogs.length > 0) {
      console.log(`  Console errors (${errorLogs.length}):`);
      errorLogs.slice(0, 10).forEach(l => console.log(`    ${l}`));
    } else {
      console.log('  No console errors');
    }
    const warnLogs = consoleLogs.filter(l => l.startsWith('[warning]'));
    if (warnLogs.length > 0) {
      console.log(`  Warnings (${warnLogs.length}):`);
      warnLogs.slice(0, 5).forEach(l => console.log(`    ${l}`));
    }
    console.log(`  Page errors: ${errors.length}`);
    errors.forEach(e => console.log(`    ${e}`));
    
    // Final page content for analysis
    console.log('\n=== PAGE TEXT (first 3000 chars) ===');
    console.log(pageContent.substring(0, 3000));
    
  } catch (error) {
    console.error(`\nFATAL: ${error.message}`);
    await page.screenshot({ path: '/home/z/my-project/screenshot-error.png' }).catch(() => {});
  } finally {
    await browser.close();
    console.log('\nDone.');
  }
})();
