const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();

app.get('/screenshot', async (req, res) => {
  const symbol = req.query.symbol || 'SPX';
  const intervals = ['1', '5', '15', '30'];
  const timestamp = Date.now();
  const tempDir = path.join(__dirname, 'screenshots', String(timestamp));

  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  for (const interval of intervals) {
    const page = await browser.newPage();
    const url = `https://www.tradingview.com/chart/?symbol=${symbol}&interval=${interval}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-name="legend-source-item"]');
    const filePath = path.join(tempDir, `${symbol}_${interval}min.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    await page.close();
  }

  await browser.close();

  // Zip the screenshots
  const zipName = `${symbol}_charts_${timestamp}.zip`;
  const zipPath = path.join(__dirname, zipName);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(tempDir, false);
  await archive.finalize();

  output.on('close', () => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.sendFile(zipPath, () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
    });
  });
});
