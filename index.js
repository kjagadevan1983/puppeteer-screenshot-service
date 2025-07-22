const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const SYMBOL = 'SPX';
const INTERVALS = ['1', '5', '15', '30']; // TradingView intervals (minutes)

app.get('/screenshot', async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, 'output', timestamp);
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    for (const interval of INTERVALS) {
      const url = `https://www.tradingview.com/chart/?symbol=${SYMBOL}&interval=${interval}`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      await page.waitForTimeout(6000); // Wait for chart to load fully

      const screenshotPath = path.join(outputDir, `${SYMBOL}_${interval}min.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured ${interval}min chart`);
    }

    await browser.close();

    res.json({
      message: 'Screenshots captured successfully',
      folder: `output/${timestamp}`,
      files: fs.readdirSync(outputDir)
    });

  } catch (err) {
    await browser.close();
    console.error('Screenshot error:', err);
    res.status(500).json({ error: 'Screenshot capture failed' });
  }
});

app.listen(PORT, () => {
  console.log(`📸 Puppeteer Screenshot API running at http://localhost:${PORT}`);
});
