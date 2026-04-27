import puppeteer from 'puppeteer';
import type { Shot, BrowserConfig } from '../types/index.js';

interface ScreenshotResult {
  success: boolean;
  tempPath?: string;
  error?: string;
}

export async function takeScreenshot(shot: Shot, browserConfig: BrowserConfig): Promise<ScreenshotResult> {
  const config: BrowserConfig = { ...browserConfig, ...shot.browser };
  const { width, height, fullPage, waitUntil, delayMs } = config;
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let page: puppeteer.Page | null = null;
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
      try { await page.close(); } catch { /* ignore */ }
    }
    try { await browser.close(); } catch { /* ignore */ }
    return { success: false, error: (error as Error).message };
  }
}
