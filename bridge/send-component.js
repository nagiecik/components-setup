// Helper CLI to send components or presets to Figma via the local bridge
const http = require('http');
const fs = require('fs');
const path = require('path');

let target = process.argv[2] || 'Marquee';
let command = 'preset';

if (target === 'preset' || target === 'json') {
  command = target;
  target = process.argv[3] || 'Marquee';
}

let payload = {};

if (command === 'json' && fs.existsSync(target)) {
  payload = JSON.parse(fs.readFileSync(target, 'utf8'));
} else {
  payload = {
    type: 'GENERATE_PRESET',
    presetName: target,
  };
}

const reqData = JSON.stringify(payload);

const req = http.request({
  hostname: 'localhost',
  port: 4055,
  path: '/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(reqData),
  },
}, (res) => {
  let resBody = '';
  res.on('data', c => resBody += c);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(resBody);
      if (parsed.success) {
        console.log(`✓ Successfully dispatched "${target}" to ${parsed.deliveredTo} open Figma plugin(s)! ✨`);
      } else {
        console.error('Bridge error:', parsed.error);
      }
    } catch (e) {
      console.log('Response:', resBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`Could not connect to bridge server on http://localhost:4055: ${e.message}`);
  console.error('Make sure the bridge server is running: "npm run bridge" in components-setup.');
});

req.write(reqData);
req.end();
