import puppeteer from 'puppeteer';

export async function takeScreenshot(shot, browserConfig) {
  const config = { ...browserConfig, ...shot.browser };
  const { width, height, fullPage, waitUntil, delayMs } = config;
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let page = null;
  const tempPath = `/tmp/${shot.name}.png`;
  
  try {
    page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(shot.url, { waitUntil });
    
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
    
    await page.screenshot({ path: tempPath, fullPage });
    await page.close();
    await browser.close();
    
    return { success: true, tempPath };
  } catch (error) {
    if (page) {
      try { await page.close(); } catch (e) {}
    }
    try { await browser.close(); } catch (e) {}
    return { success: false, error: error.message };
  }
}

export async function takeAllScreenshots(shots, browserConfig) {
  const results = [];
  
  for (const shot of shots) {
    const result = await takeScreenshot(shot, browserConfig);
    results.push({
      name: shot.name,
      url: shot.url,
      output: shot.output,
      ...result
    });
  }
  
  return results;
}
