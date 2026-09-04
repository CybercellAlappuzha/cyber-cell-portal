'use strict';

/*
 * Cyber Cell request proforma — station-facing form.
 *
 * Deliberately has no database, no accounts, and no dependencies: a station
 * officer fills the form and the PDF is generated entirely in the browser
 * (same jsPDF libraries and layout as the office's existing offline Performa
 * Generator). This file's only job is to serve the static files in public/
 * to any browser on the LAN — nothing is stored, logged, or sent anywhere.
 * Using only Node's built-in modules means there is nothing to `npm install`.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3939;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const resolved = path.normalize(path.join(base, decoded));
  if (!resolved.startsWith(base)) return null; // block ../ escapes
  return resolved;
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  if (!filePath) {
    res.writeHead(400).end('Bad request');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  Cyber Cell request proforma is running.');
  console.log(`  On this computer:  http://localhost:${PORT}/`);
  for (const ip of lanAddresses()) {
    console.log(`  On the LAN:        http://${ip}:${PORT}/   (share this with other stations)`);
  }
  console.log('');
  console.log('  Nothing is saved anywhere — each station fills the form and downloads its');
  console.log('  own PDF. Close this window to stop the server.');
  console.log('');
});
