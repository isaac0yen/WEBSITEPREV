import puppeteer from 'puppeteer';
import type { Shot, BrowserConfig } from '../types/index.js';

interface ScreenshotResult {
  success: boolean;
  tempPath?: string;
  error?: string;
}

export async function takeScreenshot(shot: Shot, browserConfig: BrowserConfig): Promise<ScreenshotResult> {
  const config: BrowserConfig = { ...browserConfig, ...shot.browser };
  const { width, height, fullPage, waitUntil, delayMs, userAgent, extraHeaders } = config;
  
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',  // Hide automation
      '--disable-dev-shm-usage'
    ],
    headless: true
  });
  
  let page: puppeteer.Page | null = null;
  const tempPath = `/tmp/${shot.name}.png`;
  
  try {
    page = await browser.newPage();
    
    // Set a realistic user agent if not provided
    const finalUserAgent = userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(finalUserAgent);
    
    // Set extra headers if provided (useful for bypassing some protections)
    if (extraHeaders) {
      await page.setExtraHTTPHeaders(extraHeaders);
    }
    
    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    await page.setViewport({ width, height });
    
    try {
      await page.goto(shot.url, { waitUntil, timeout: 60000 });
    } catch (error) {
      // If navigation fails, check if we hit a challenge page
      const content = await page.content();
      if (content.includes('challenge-platform') || content.includes('cf-browser-verification')) {
        throw new Error('Cloudflare challenge detected. Consider adding a longer delayMs or using a different approach.');
      }
      throw error;
    }
    
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
