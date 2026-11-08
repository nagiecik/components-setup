// Local Antigravity <-> Figma Components Setup Bridge
// Multi-channel bridge: WebSocket (bidirectional) + HTTP/SSE + TypeScript AST Parser

const http = require('http');
const fs = require('fs');
const path = require('path');
const { getTokens } = require('./tokens');
const { getCuratedPreset } = require('./presets');
const { parseComponentAst } = require('./tsx-ast-parser');

let chokidar = null;
try {
  chokidar = require('chokidar');
} catch (e) {
  console.warn('[Bridge] Optional chokidar not loaded, will use fs.watch');
}

let WebSocketServer = null;
try {
  const wsModule = require('ws');
  WebSocketServer = wsModule.WebSocketServer || wsModule.Server;
} catch (e) {
  console.warn('[Bridge] Optional ws not loaded, will use HTTP/SSE only');
}

const PORT = process.env.BRIDGE_PORT || 4055;
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.env.MAMF_WORKSPACE_DIR || 'c:\\Users\\JakubNagiet\\win-Workspace\\mamf\\mamf-any-frontend';
const SYNC_DIR = path.join(WORKSPACE_DIR, '.figma-sync');
const COMPONENTS_DIR = path.join(WORKSPACE_DIR, 'src', 'components');
const UI_COMPONENTS_DIR = path.join(WORKSPACE_DIR, 'src', 'components', 'ui');

const tokens = getTokens(WORKSPACE_DIR);

const sseClients = new Set();
const wsClients = new Set();
let lastExportedCode = null;
const exportedComponents = new Map();
let activeSelection = null;

// Broadcast to all active clients across both WebSocket and SSE channels
function broadcast(eventData) {
  const payloadStr = typeof eventData === 'string' ? eventData : JSON.stringify(eventData);

  // 1. Send to WebSocket clients
  for (const ws of wsClients) {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(payloadStr);
      }
    } catch (e) {
      wsClients.delete(ws);
    }
  }

  // 2. Send to SSE clients
  for (const client of sseClients) {
    try {
      client.write(`data: ${payloadStr}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Persist exported TSX code to disk
function saveExportedCode(exportData) {
  lastExportedCode = exportData;
  const rawName = (exportData.rawName || exportData.name || 'Component').trim();
  const isPrivate = Boolean(exportData.isPrivate || rawName.startsWith('_') || rawName.startsWith('.'));
  const cleanName = (exportData.name || 'Component').replace(/[^a-zA-Z0-9]/g, '');
  exportedComponents.set(cleanName.toLowerCase(), exportData);
  let savedFilePath = null;
  try {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }
    const tsxFileName = isPrivate ? `_${cleanName}.tsx` : `${cleanName}.tsx`;
    const tsxFile = path.join(SYNC_DIR, tsxFileName);
    const metaFile = path.join(SYNC_DIR, 'last-export.json');

    fs.writeFileSync(tsxFile, exportData.code || '', 'utf8');
    fs.writeFileSync(metaFile, JSON.stringify({
      name: cleanName,
      rawName,
      description: exportData.description || '',
      isPrivate,
      preferredInstances: exportData.preferredInstances || {},
      timestamp: exportData.timestamp || new Date().toISOString(),
      filePath: tsxFile,
      codeLength: (exportData.code || '').length,
      violations: exportData.violations || [],
    }, null, 2), 'utf8');

    savedFilePath = tsxFile;
    console.log(`[Bridge] Auto-saved TSX to: ${tsxFile} ${isPrivate ? '(Private component)' : ''}`);

    // Automatically register component in Design System (or code documentation only if private)
    autoRegisterDesignSystemComponent(cleanName, exportData, isPrivate);
  } catch (saveErr) {
    console.warn('[Bridge] File write warning:', saveErr.message);
  }
  return { cleanName, savedFilePath, isPrivate };
}

// Automatically register synchronized component in Design System and create thin doc page
function autoRegisterDesignSystemComponent(cleanName, exportData, isPrivate = false) {
  if (!cleanName || cleanName.length < 2) return;
  const isLikelySub = /(Item|Track|Text|Logo|Icon|Header|Footer|Content|Trigger|Separator|Media)$/i.test(cleanName) && cleanName.length > 5;
  if (isLikelySub) return;

  const rawName = (exportData.rawName || exportData.name || cleanName).trim();
  const isItemSubcomponent = Boolean(cleanName.includes('Item') || rawName.includes('Item'));
  const isComponentPrivate = Boolean(isPrivate || exportData.isPrivate || rawName.startsWith('_') || rawName.startsWith('.') || isItemSubcomponent);

  const kebabName = cleanName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const pagesDir = path.join(WORKSPACE_DIR, 'src', 'pages', 'design-system', 'components');
  const registryFile = path.join(WORKSPACE_DIR, 'src', 'design-system', 'components-registry.tsx');

  try {
    // 1. Presentation Page: Private components starting with "_" or containing "Item" MUST NOT go to the public presentation showcase.
    if (!isComponentPrivate) {
      if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
      }

      // Auto-create thin documentation page if it does not exist
      const docPagePath = path.join(pagesDir, `${kebabName}.tsx`);
      if (!fs.existsSync(docPagePath)) {
        const pageCode = `import React, { FC } from 'react'
import { graphql } from 'gatsby'
import ComponentDocTemplate from 'src/components/design-system/ComponentDocTemplate'
import { getComponentDocById } from 'src/design-system/components-registry'

const ${cleanName}DocsPage: FC = () => {
  const doc = getComponentDocById('${kebabName}')
  if (!doc) return null
  return <ComponentDocTemplate config={doc} />
}

export const query = graphql\`
  query ($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
\`

export default ${cleanName}DocsPage
`;
        fs.writeFileSync(docPagePath, pageCode, 'utf8');
        console.log(`[Bridge] Auto-created Design System doc page: ${docPagePath}`);
      }
    } else {
      console.log(`[Bridge] Skipped public presentation page for private/item component "${cleanName}".`);
    }

    // 2. Code Documentation: Register or update in components-registry.tsx
    if (fs.existsSync(registryFile)) {
      let regContent = fs.readFileSync(registryFile, 'utf8');
      const incomingDesc = (exportData.description && typeof exportData.description === 'string' && exportData.description.trim())
        ? exportData.description.trim().replace(/'/g, "\\'").replace(/\r?\n/g, ' ')
        : '';

      if (!regContent.includes(`id: '${kebabName}'`)) {
        let usageSnippet = `<${cleanName} />`;
        if (exportData.code && exportData.code.includes('Example Usage:')) {
          const rawUsage = exportData.code.split('Example Usage:')[1].replace(/\*\//g, '').trim();
          const cleanedUsage = rawUsage.replace(/^[\s*=-]+/gm, '').trim();
          if (cleanedUsage.startsWith('<')) {
            usageSnippet = cleanedUsage;
          }
        }

        const fallbackDesc = `${cleanName}${isComponentPrivate ? ' (Internal / Private)' : ''} component synchronized directly from Figma.`;
        const initialDesc = incomingDesc || fallbackDesc;
        const pascalDisplayName = cleanName.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

        const newEntry = `
export const ${cleanName.charAt(0).toLowerCase() + cleanName.slice(1)}Doc: IComponentDocConfig = {
  id: '${kebabName}',
  name: '${pascalDisplayName}',
  category: 'layout',
  isNew: true,
  isPrivate: ${isComponentPrivate ? 'true' : 'false'},
  description: '${initialDesc}',
  preview: (
    <div className="p-4 flex items-center justify-center">
      <span className="text-sm text-neutral-500">${cleanName}${isComponentPrivate ? ' (Internal Code Doc)' : ' Preview'}</span>
    </div>
  ),
  usageCode: ${JSON.stringify(usageSnippet)},
}
`;
        if (regContent.includes('const REGISTRY:')) {
          regContent = regContent.replace('const REGISTRY:', `${newEntry}\nconst REGISTRY:`);
          regContent = regContent.replace(/const REGISTRY: Record<string, IComponentDocConfig> = {([^}]*)}/, (m, inner) => {
            return `const REGISTRY: Record<string, IComponentDocConfig> = {${inner}  [${cleanName.charAt(0).toLowerCase() + cleanName.slice(1)}Doc.id]: ${cleanName.charAt(0).toLowerCase() + cleanName.slice(1)}Doc,\n}`;
          });
          fs.writeFileSync(registryFile, regContent, 'utf8');
          console.log(`[Bridge] Auto-registered "${cleanName}" in components-registry.tsx ${isComponentPrivate ? '(as private code documentation)' : ''}`);
        }
      } else if (incomingDesc) {
        // Component is already registered: update description from Figma Component configuration
        const descRegex = new RegExp(`(id:\\s*['"]${kebabName}['"][\\s\\S]*?description:\\s*)(['"\`])([\\s\\S]*?)\\2`);
        if (descRegex.test(regContent)) {
          regContent = regContent.replace(descRegex, `$1'${incomingDesc}'`);
          fs.writeFileSync(registryFile, regContent, 'utf8');
          console.log(`[Bridge] Updated description for "${cleanName}" in components-registry.tsx`);
        }
      }
    }
  } catch (err) {
    console.warn('[Bridge] Auto-registration warning:', err.message);
  }
}

// Dynamically inspect workspace Tailwind and CSS configs to detect fonts and mappings
function detectWorkspaceTypography() {
  const fonts = {
    heading: null,
    body: null,
    map: {}, // class -> font family e.g. 'font-sans' -> 'Inter', 'font-heading' -> 'Poppins'
  };

  const candidateConfigs = [
    path.join(WORKSPACE_DIR, 'tailwind.config.js'),
    path.join(WORKSPACE_DIR, 'tailwind.config.ts'),
    path.join(WORKSPACE_DIR, 'tailwind.config.mjs'),
    path.join(WORKSPACE_DIR, 'src', 'design-system', 'theme', 'tailwind.preset.js'),
  ];

  for (const cfgPath of candidateConfigs) {
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const content = fs.readFileSync(cfgPath, 'utf8');
      const fontBlockMatch = content.match(/fontFamily\s*:\s*\{([^}]+)\}/s);
      if (fontBlockMatch) {
        const fontBlock = fontBlockMatch[1];
        const entryRegex = /([a-zA-Z0-9_-]+)\s*:\s*(?:\[\s*['"`]([^'"`]+)['"`]|['"`]([^'"`]+)['"`])/g;
        let m;
        while ((m = entryRegex.exec(fontBlock)) !== null) {
          const key = m[1];
          const familyName = m[2] || m[3];
          if (key && familyName) {
            fonts.map[`font-${key}`] = familyName;
            fonts.map[`font-${key.toLowerCase()}`] = familyName;
            if (!fonts.body && /^(sans|body|base|default)/i.test(key)) {
              fonts.body = familyName;
            }
            if (!fonts.heading && /^(heading|display|title|head)/i.test(key)) {
              fonts.heading = familyName;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Bridge] Warning reading tailwind config:', e.message);
    }
  }
  return fonts;
}

// Discover all components recursively in src/components (fast, lightweight, zero file content read)
function getAvailableComponents() {
  const results = [];

  function scanDir(dir, relPath = '') {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), path.join(relPath, entry.name));
        } else if (entry.isFile()) {
          const isComp = entry.name.endsWith('.tsx') || (entry.name.endsWith('.ts') && /^[A-Z]/.test(entry.name));
          if (!isComp) continue;
          if (/^(index|types|constants|\.d)\./i.test(entry.name)) continue;
          const compName = entry.name.replace(/\.(tsx|ts)$/, '');
          const category = relPath ? relPath.split(path.sep)[0] : 'ui';
          results.push({
            name: compName,
            fileName: entry.name,
            relativePath: path.join(relPath, entry.name).replace(/\\/g, '/'),
            category,
          });
        }
      }
    } catch (e) {
      console.warn('[Bridge] Scan warning:', e.message);
    }
  }

  scanDir(COMPONENTS_DIR);
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function findComponentTsx(componentName) {
  const all = getAvailableComponents();
  const found = all.find(c => c.name.toLowerCase() === componentName.toLowerCase());
  if (found) {
    return path.join(COMPONENTS_DIR, found.relativePath);
  }
  const directPath = path.join(UI_COMPONENTS_DIR, `${componentName}.tsx`);
  if (fs.existsSync(directPath)) return directPath;
  return null;
}

// Function that parses the latest TSX file directly from disk and produces Figma schema
function buildDynamicComponentSchema(componentName) {
  const tsxPath = findComponentTsx(componentName);
  if (!tsxPath || !fs.existsSync(tsxPath)) {
    console.warn(`[Bridge] TSX file not found for component: "${componentName}"`);
    return null;
  }

  // 1. Check curated pixel-perfect presets
  const curated = getCuratedPreset(componentName, tsxPath, tokens, detectWorkspaceTypography());
  if (curated) {
    return curated;
  }

  // 2. Parse live component dynamically via TypeScript AST (universal parser for all components)
  try {
    const astSchema = parseComponentAst(tsxPath, tokens);
    if (astSchema) {
      console.log(`[Bridge] Generated dynamic AST schema for "${componentName}" (${path.basename(tsxPath)})`);
      return astSchema;
    }
  } catch (err) {
    console.warn(`[Bridge] AST parser warning for "${componentName}":`, err.message);
  }

  return null;
}

// Live file watcher with chokidar (debounced 150ms) or fallback to fs.watch
if (chokidar && fs.existsSync(COMPONENTS_DIR)) {
  const watcher = chokidar.watch(COMPONENTS_DIR, {
    ignored: /(^|[\/\\])\..|node_modules/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
  });

  watcher.on('all', (event, filePath) => {
    if (filePath && (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))) {
      const filename = path.basename(filePath);
      const compName = filename.replace(/\.(tsx|ts)$/, '');
      console.log(`[Bridge] (chokidar:${event}) Component changed: ${compName} (${filename})`);
      broadcast({
        type: 'COMPONENT_FILE_CHANGED',
        componentName: compName,
        filename,
        filePath,
        changeType: event,
        timestamp: Date.now(),
      });
    }
  });
  console.log(`[Bridge] Watching ${COMPONENTS_DIR} with chokidar (debounced 150ms).`);
} else if (fs.existsSync(COMPONENTS_DIR)) {
  let debounceTimer = null;
  try {
    fs.watch(COMPONENTS_DIR, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const compName = path.basename(filename).replace(/\.(tsx|ts)$/, '');
          console.log(`[Bridge] Live file change detected: ${filename}`);
          broadcast({
            type: 'COMPONENT_FILE_CHANGED',
            componentName: compName,
            filename,
            timestamp: Date.now(),
          });
        }, 150);
      }
    });
    console.log(`[Bridge] Watching ${COMPONENTS_DIR} with native fs.watch (debounced).`);
  } catch (e) {
    console.warn('[Bridge] Native watcher warning:', e.message);
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // SSE endpoint for Figma plugin (ui.html fallback)
  if (url.pathname === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    sseClients.add(res);
    console.log(`[Bridge] Figma plugin SSE connected! (Active SSE: ${sseClients.size}, WS: ${wsClients.size})`);

    // Send connection handshake with design system tokens
    res.write(`data: ${JSON.stringify({
      type: 'STATUS',
      status: 'connected',
      channel: 'sse',
      clients: sseClients.size + wsClients.size,
      tokens: tokens.getAllTokens(),
      activeSelection,
    })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
      console.log(`[Bridge] Figma plugin SSE disconnected. (Active SSE: ${sseClients.size})`);
    });
    return;
  }

  // Health / Status endpoint
  if (url.pathname === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      connectedPlugins: sseClients.size + wsClients.size,
      wsClients: wsClients.size,
      sseClients: sseClients.size,
      activeSelection,
      uptime: Math.round(process.uptime()),
    }));
    return;
  }

  // Active Figma Selection Endpoint (GET: agent/CLI inspects, POST: plugin updates)
  if (url.pathname === '/active-selection') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        hasSelection: Boolean(activeSelection && activeSelection.hasSelection),
        selection: activeSelection,
      }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          activeSelection = payload.selection !== undefined ? payload.selection : payload;
          console.log(`[Bridge] Active selection updated: "${activeSelection ? activeSelection.name : 'none'}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, selection: activeSelection }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // Design System Tokens endpoint
  if (url.pathname === '/tokens' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      tokens: tokens.getAllTokens(),
    }));
    return;
  }

  // Receive exported code from Figma
  if (url.pathname === '/export-code' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (Array.isArray(payload)) {
          const results = payload.map(item => {
            const res = saveExportedCode(item);
            broadcast({
              type: 'CODE_EXPORTED',
              name: res.cleanName,
              savedTo: res.savedFilePath,
              timestamp: Date.now(),
            });
            return res;
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            count: results.length,
            items: results,
          }));
        } else {
          const { cleanName, savedFilePath } = saveExportedCode(payload);
          console.log(`[Bridge] Received exported code for "${cleanName}" (${(payload.code || '').length} chars).`);

          broadcast({
            type: 'CODE_EXPORTED',
            name: cleanName,
            savedTo: savedFilePath,
            timestamp: Date.now(),
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            name: cleanName,
            savedTo: savedFilePath,
          }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Fetch last exported code from Figma
  if (url.pathname === '/export-code' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: lastExportedCode,
      recent: Array.from(exportedComponents.values()),
    }));
    return;
  }

  // Endpoint to discover all components in src/components (lightweight metadata only)
  if (url.pathname === '/components' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const components = getAvailableComponents();
    res.end(JSON.stringify({
      success: true,
      count: components.length,
      components,
    }));
    return;
  }

  // Endpoint to fetch code of a single requested component
  if (url.pathname.startsWith('/component-code/') && req.method === 'GET') {
    const compName = decodeURIComponent(url.pathname.replace('/component-code/', '').trim());
    const tsxPath = findComponentTsx(compName);
    if (tsxPath && fs.existsSync(tsxPath)) {
      const code = fs.readFileSync(tsxPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        name: compName,
        filePath: tsxPath,
        relativePath: path.relative(COMPONENTS_DIR, tsxPath).replace(/\\/g, '/'),
        code,
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Component "${compName}" not found` }));
    }
    return;
  }

  // Endpoint to fetch dynamic preset schema parsed directly from live TSX on disk
  if (url.pathname.startsWith('/preset/') && req.method === 'GET') {
    const presetName = decodeURIComponent(url.pathname.replace('/preset/', '').trim());
    const schema = buildDynamicComponentSchema(presetName);
    if (schema) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(schema));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Component "${presetName}" not found or unsupported` }));
    }
    return;
  }

  // Endpoint to send component schemas to Figma
  if (url.pathname === '/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let schemaToBroadcast = payload;

        // If a preset was requested, build latest live schema from disk
        const presetName = payload.presetName || (payload.type === 'GENERATE_PRESET' ? payload.presetName : null);
        if (presetName) {
          const dynamicSchema = buildDynamicComponentSchema(presetName);
          if (dynamicSchema) {
            schemaToBroadcast = dynamicSchema;
          }
        }

        const eventData = JSON.stringify({
          type: 'GENERATE_COMPONENT',
          timestamp: Date.now(),
          ...schemaToBroadcast,
        });

        broadcast(eventData);

        const totalClients = sseClients.size + wsClients.size;
        console.log(`[Bridge] Sent component "${schemaToBroadcast.name || payload.name || 'unnamed'}" to ${totalClients} Figma plugin(s).`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          deliveredTo: totalClients,
          schema: schemaToBroadcast,
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Attach WebSocket Server for full bidirectional sync
if (WebSocketServer) {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`[Bridge] Figma plugin WebSocket connected! (Active WS: ${wsClients.size}, SSE: ${sseClients.size})`);

    // Handshake
    ws.send(JSON.stringify({
      type: 'STATUS',
      status: 'connected',
      channel: 'websocket',
      clients: wsClients.size + sseClients.size,
      tokens: tokens.getAllTokens(),
      activeSelection,
    }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'SELECTION_CHANGED') {
          activeSelection = msg.selection !== undefined ? msg.selection : msg;
          console.log(`[Bridge] Active selection updated via WS: "${activeSelection ? activeSelection.name : 'none'}"`);
        } else if (msg.type === 'EXPORT_CODE') {
          const res = saveExportedCode(msg.data || msg);
          ws.send(JSON.stringify({ type: 'EXPORT_ACK', success: true, ...res }));
          broadcast({ type: 'CODE_EXPORTED', ...res });
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        console.warn('[Bridge] WS message parse error:', err.message);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log(`[Bridge] Figma plugin WebSocket disconnected. (Active WS: ${wsClients.size})`);
    });

    ws.on('error', (err) => {
      console.warn('[Bridge] WS error:', err.message);
      wsClients.delete(ws);
    });
  });
}

// Periodic heartbeat across SSE and WebSocket
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(`: heartbeat\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
  for (const ws of wsClients) {
    try {
      if (ws.readyState === 1) {
        ws.ping();
      }
    } catch {
      wsClients.delete(ws);
    }
  }
}, 15000);

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ Antigravity <-> Figma Bridge Server running on http://localhost:${PORT}`);
  console.log(`   - WebSocket:   ws://localhost:${PORT}`);
  console.log(`   - SSE Stream:  http://localhost:${PORT}/events`);
  console.log(`   - Status:      http://localhost:${PORT}/status`);
  console.log(`   - Selection:   http://localhost:${PORT}/active-selection`);
  console.log(`   - Tokens:      http://localhost:${PORT}/tokens`);
  console.log(`   - Generate:    POST http://localhost:${PORT}/generate`);
  console.log(`======================================================\n`);
});
