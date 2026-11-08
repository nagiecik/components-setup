#!/usr/bin/env node
// CLI Automation for Antigravity <-> Figma Bridge
// Commands:
//   npm run figma:push <ComponentName>  - Builds AST schema and sends to Figma
//   npm run figma:pull                  - Pulls latest exported TSX from Figma to project
//   npm run figma:status                - Checks Bridge server and active Figma selection
//   npm run figma:lint [ComponentName]  - Lints component for Design System token compliance

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.BRIDGE_PORT || 4055;
const BASE_URL = `http://localhost:${PORT}`;

function httpRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function cmdPush(compName) {
  if (!compName) {
    console.error('❌ Error: Please specify component name (e.g. npm run figma:push Button)');
    process.exit(1);
  }

  console.log(`⚡ Sending "${compName}" to Figma via Bridge (${BASE_URL})...`);
  try {
    const res = await httpRequest('/generate', 'POST', { presetName: compName });
    if (res.status === 200 && res.data && res.data.success) {
      console.log(`✅ Success! Component "${compName}" delivered to ${res.data.deliveredTo || 1} connected Figma plugin(s).`);
      if (res.data.schema) {
        console.log(`   - Variants: ${res.data.schema.variants ? res.data.schema.variants.length : 1}`);
        console.log(`   - Props: ${(res.data.schema.props || []).map(p => p.name).join(', ') || 'none'}`);
      }
    } else {
      console.error(`❌ Push failed (${res.status}):`, res.data ? (res.data.error || JSON.stringify(res.data)) : res.raw);
    }
  } catch (err) {
    console.error(`❌ Connection error: Is bridge server running? (npm run bridge)`);
    console.error(`   Details: ${err.message}`);
    process.exit(1);
  }
}

async function cmdPull(targetPath) {
  console.log(`📥 Pulling exported component(s) from Figma via Bridge (${BASE_URL})...`);
  try {
    const res = await httpRequest('/export-code', 'GET');
    const items = (res.data && res.data.recent && res.data.recent.length > 0)
      ? res.data.recent
      : (res.data && res.data.data ? [res.data.data] : []);

    if (res.status === 200 && items.length > 0) {
      for (const exp of items) {
        const rawName = (exp.rawName || exp.name || 'Component').trim();
        const isPrivate = Boolean(exp.isPrivate || rawName.startsWith('_') || rawName.startsWith('.'));
        const cleanName = (exp.name || 'Component').replace(/[^a-zA-Z0-9]/g, '');
        const fileName = isPrivate ? `_${cleanName}.tsx` : `${cleanName}.tsx`;
        let outFile = null;

        if (targetPath) {
          outFile = path.join(targetPath, fileName);
        } else {
          const srcDir = path.join(process.cwd(), '..', '..', 'win-Workspace', 'mamf', 'mamf-any-frontend', 'src', 'components');
          const findExisting = (dir) => {
            if (!fs.existsSync(dir)) return null;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (e.isDirectory() && e.name !== 'node_modules') {
                const found = findExisting(full);
                if (found) return found;
              } else if (e.isFile() && e.name.toLowerCase() === fileName.toLowerCase()) {
                return full;
              }
            }
            return null;
          };
          outFile = findExisting(srcDir) || path.join(srcDir, 'ui', fileName);
        }

        const outDir = path.dirname(outFile);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(outFile, exp.code || '', 'utf8');
        console.log(`✅ Pulled "${isPrivate ? '_' + cleanName : cleanName}" successfully!`);
        console.log(`   - Destination: ${outFile}`);
        console.log(`   - Code size: ${(exp.code || '').length} characters`);
        if (exp.violations && exp.violations.length > 0) {
          console.warn(`   ⚠️ Warning: ${exp.violations.length} token violation(s) detected during export!`);
        }
      }
    } else {
      console.log('ℹ️ No recently exported component in bridge. In Figma plugin, click "Export Selected to Code".');
    }
  } catch (err) {
    console.error(`❌ Connection error: Is bridge server running? (npm run bridge)`);
    console.error(`   Details: ${err.message}`);
    process.exit(1);
  }
}

async function cmdStatus() {
  console.log(`🔍 Checking Antigravity <-> Figma Bridge status at ${BASE_URL}...`);
  try {
    const statusRes = await httpRequest('/status', 'GET');
    console.log(`\n--- Bridge Server ---`);
    console.log(`Status:            ${statusRes.data.status || 'unknown'}`);
    console.log(`Connected Plugins: ${statusRes.data.connectedPlugins || 0}`);
    console.log(`WebSocket Clients: ${statusRes.data.wsClients || 0}`);
    console.log(`SSE Clients:       ${statusRes.data.sseClients || 0}`);
    console.log(`Uptime:            ${statusRes.data.uptime || 0}s`);

    const selRes = await httpRequest('/active-selection', 'GET');
    console.log(`\n--- Active Figma Selection ---`);
    if (selRes.data && selRes.data.hasSelection && selRes.data.selection) {
      const s = selRes.data.selection;
      console.log(`Layer Name:        ${s.name}`);
      console.log(`Type:              ${s.type} (${s.typeName || ''})`);
      console.log(`Node ID:           ${s.nodeId || 'unknown'}`);
      if (s.variants && s.variants.length > 0) {
        console.log(`Variants Count:    ${s.variants.length}`);
      }
    } else {
      console.log(`No active layer selected in Figma canvas.`);
    }
    console.log('-------------------------------\n');
  } catch (err) {
    console.error(`❌ Bridge is offline at ${BASE_URL}. Start it with: npm run bridge`);
  }
}

async function cmdLint(compName) {
  console.log(`🔬 Running Design System Token Linter...`);
  const workspaceDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), '..', '..', 'win-Workspace', 'mamf', 'mamf-any-frontend');
  const compDir = path.join(workspaceDir, 'src', 'components');

  const filesToCheck = [];
  if (compName) {
    const direct = path.join(compDir, 'ui', `${compName}.tsx`);
    if (fs.existsSync(direct)) filesToCheck.push(direct);
  } else {
    function findTsx(dir) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) findTsx(path.join(dir, e.name));
        else if (e.isFile() && e.name.endsWith('.tsx') && !e.name.startsWith('index.')) {
          filesToCheck.push(path.join(dir, e.name));
        }
      }
    }
    findTsx(compDir);
  }

  console.log(`Checking ${filesToCheck.length} component(s) against token rules...`);
  let totalViolations = 0;

  for (const f of filesToCheck) {
    const code = fs.readFileSync(f, 'utf8');
    const rel = path.relative(workspaceDir, f);
    const violations = [];

    // Check arbitrary hex in className
    const hexMatches = code.match(/\[#([0-9a-fA-F]{3,8})\]/g);
    if (hexMatches) {
      for (const h of hexMatches) {
        violations.push({ type: 'Arbitrary HEX Color', value: h });
      }
    }

    // Check arbitrary px spacing
    const pxMatches = code.match(/(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\[(\d+)px\]/g);
    if (pxMatches) {
      for (const p of pxMatches) {
        violations.push({ type: 'Arbitrary Spacing', value: p });
      }
    }

    if (violations.length > 0) {
      totalViolations += violations.length;
      console.log(`\n⚠️  ${rel} (${violations.length} violations):`);
      for (const v of violations) {
        console.log(`   - [${v.type}] ${v.value}`);
      }
    }
  }

  if (totalViolations === 0) {
    console.log(`\n✅ 100% Token Compliant! Zero arbitrary classes detected in checked components.`);
  } else {
    console.log(`\n❌ Total violations found: ${totalViolations}. Replace arbitrary classes with Design System tokens.`);
  }
}

const args = process.argv.slice(2);
const command = args[0] || 'status';

switch (command) {
  case 'push':
    cmdPush(args[1]);
    break;
  case 'pull':
    cmdPull(args[1]);
    break;
  case 'status':
    cmdStatus();
    break;
  case 'lint':
    cmdLint(args[1]);
    break;
  default:
    console.log(`Available commands:`);
    console.log(`  push <ComponentName>  - Send component to Figma`);
    console.log(`  pull                  - Pull exported component from Figma`);
    console.log(`  status                - Check bridge and active selection`);
    console.log(`  lint [ComponentName]  - Verify token compliance`);
}
