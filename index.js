const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/screenshot', async (req, res) => {
  const { symbol = 'SPX', interval = '1' } = req.query;
  const url = `https://www.tradingview.com/chart/?symbol=${symbol}&interval=${interval}`;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-name="legend-source-item"]');

  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();

  res.set('Content-Type', 'image/png');
  res.send(screenshot);
});

app.listen(3000, () => {
  console.log('Screenshot service running on http://localhost:3000');
});
