#!/usr/bin/env node
// Submit every URL in sitemap.xml to IndexNow (Bing/Yandex/Seznam, feeds DDG/Yahoo/Ecosia).
// Run: node submit-indexnow.js
//
// IndexNow protocol: https://www.indexnow.org/documentation
// Bing endpoint accepts up to 10,000 URLs per call.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'boardgaminghub.com';
const KEY = '7ff86ce4c72bbe1aef1ecbf822d8eb6b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

const sitemap = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

if (urlList.length === 0) {
  console.error('No URLs found in sitemap.xml');
  process.exit(1);
}

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
});

const req = https.request(
  ENDPOINT,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`Submitted ${urlList.length} URLs`);
      if (data) console.log(`Body: ${data}`);
      // 200/202 = accepted, 422 = some URLs invalid, 429 = rate limit
    });
  }
);

req.on('error', (e) => {
  console.error('Request failed:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
