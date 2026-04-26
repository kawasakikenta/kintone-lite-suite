#!/usr/bin/env node

const { chromium } = require('playwright');

if (process.platform !== 'win32') {
  process.env.TMPDIR = '/tmp';
  process.env.TEMP = '/tmp';
  process.env.TMP = '/tmp';
}

(async () => {
  const browserName = process.env.PLAYWRIGHT_MCP_BROWSER || 'chrome';
  let browser;

  try {
    browser = await chromium.launch({
      ...(browserName === 'chromium' ? {} : { channel: browserName }),
      headless: true,
    });
  } catch (error) {
    if (browserName === 'chromium') throw error;
    console.warn(`browser-channel-fallback:${browserName}:${String(error.message || error).split('\n')[0]}`);
    try {
      browser = await chromium.launch({ headless: true });
    } catch (fallbackError) {
      const message = fallbackError?.message || String(fallbackError);
      if (/Executable doesn't exist|Please run .*playwright install|is not found/.test(message)) {
        console.log(`browser-skip:${message.split('\n')[0]}`);
        return;
      }
      throw fallbackError;
    }
  }

  try {
    const page = await browser.newPage();
    await page.goto('data:text/html,playwright-mcp-ok');
    const bodyText = await page.textContent('body');
    console.log(`browser-ok:${bodyText}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
