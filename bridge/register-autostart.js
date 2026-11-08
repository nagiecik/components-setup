const fs = require('fs');
const path = require('path');

const startupDir = path.join(
  process.env.APPDATA,
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
);

const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${path.resolve(__dirname, '..').replace(/\\/g, '\\\\')}"
WshShell.Run "node bridge\\\\server.js", 0, False
`;

const targetFile = path.join(startupDir, 'FigmaComponentsBridge.vbs');

try {
  fs.writeFileSync(targetFile, vbsContent, 'utf8');
  console.log('✓ Bridge autostart successfully registered at: ' + targetFile);
} catch (err) {
  console.error('Failed to register autostart:', err.message);
}
