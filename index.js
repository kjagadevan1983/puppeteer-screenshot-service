const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const SYMBOL = 'SPX';
const INTERVALS = ['1', '5', '15', '30']; // TradingView intervals

app.get('/screenshot', async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, 'output', timestamp);
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || puppeteer.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-zygote',
      '--single-process',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  try {
    const page = await browser.newPage();

    // Spoof user agent and screen size
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    for (const interval of INTERVALS) {
      const url = `https://www.tradingview.com/chart/?symbol=${SYMBOL}&interval=${interval}`;
      let loaded = false;

      for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
          loaded = true;
        } catch (err) {
          console.warn(`Attempt ${attempt + 1} failed for ${url}`, err);
          await page.waitForTimeout(3000); // Wait before retry
        }
      }

      if (!loaded) throw new Error(`Failed to load ${url} after 3 attempts`);

      await page.waitForTimeout(12000); // Let TradingView load visuals
      const screenshotPath = path.join(outputDir, `${SYMBOL}_${interval}min.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Captured ${interval}min chart`);
    }

    await browser.close();

    res.json({
      message: 'Screenshots captured successfully',
      folder: `output/${timestamp}`,
      files: fs.readdirSync(outputDir),
    });

  } catch (err) {
    await browser.close();
    console.error('❌ Screenshot error:', err.stack || err);
    res.status(500).json({ error: 'Screenshot capture failed' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Puppeteer Service is Running');
});

app.listen(PORT, () => {
  console.log(`📸 Puppeteer Screenshot API running at http://localhost:${PORT}`);
});
