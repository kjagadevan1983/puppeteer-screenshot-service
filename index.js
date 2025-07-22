const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.get('/screenshot', async (req, res) => {
  const symbol = req.query.symbol || 'SPX';
  const intervals = ['1', '5', '15', '30'];
  const timestamp = Date.now();
  const outputDir = path.join(__dirname, 'screenshots', String(timestamp));

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const imagePaths = [];

  for (const interval of intervals) {
    const page = await browser.newPage();
    const url = `https://www.tradingview.com/chart/?symbol=${symbol}&interval=${interval}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-name="legend-source-item"]');

    const filename = `${symbol}_${interval}min.png`;
    const filePath = path.join(outputDir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    await page.close();

    imagePaths.push({
      interval,
      file: filename,
      path: `/screenshots/${timestamp}/${filename}`,
      absolute: filePath,
    });
  }

  await browser.close();

  res.json({
    symbol,
    timestamp,
    count: imagePaths.length,
    folder: `/screenshots/${timestamp}`,
    images: imagePaths,
  });
});

app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

app.listen(port, () => {
  console.log(`Screenshot service running at http://localhost:${port}`);
});
