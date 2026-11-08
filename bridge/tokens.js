// Design System Token Resolver for Antigravity <-> Figma Bridge
// Extracts tokens dynamically from workspace design-system.css, tailwind.preset.js, or variables.json
// Eliminates hardcoded hex values and arbitrary Tailwind classes across bridge and plugin

const fs = require('fs');
const path = require('path');

// Baseline tokens guaranteed by the design system (fallback when workspace is not mounted)
const DEFAULT_COLORS = {
  'primary': { hex: '#F04248', variableName: 'primary' },
  'on-primary-unstable': { hex: '#FFFFFF', variableName: 'on-primary-unstable' },
  'on-surface-primary': { hex: '#FFFFFF', variableName: 'on-surface-primary' },
  'on-surface': { hex: '#181B1D', variableName: 'on-surface' },
  'on-surface-subtle': { hex: '#485258', variableName: 'on-surface-subtle' },
  'surface': { hex: '#FFFFFF', variableName: 'surface' },
  'surface-subtle': { hex: '#E4E7E9', variableName: 'surface-subtle' },
  'surface-inverse-subtle': { hex: '#24292C', variableName: 'surface-inverse-subtle' },
  'surface-popout': { hex: '#AEB8BE', variableName: 'surface-popout' },
  'outline-base': { hex: '#AEB8BE', variableName: 'outline-base' },
  'outline-highest': { hex: '#788993', variableName: 'outline-highest' },
  'secondary': { hex: '#59539F', variableName: 'secondary' },
  'tertiary': { hex: '#EFF8E2', variableName: 'tertiary' },
  'error': { hex: '#E7000B', variableName: 'error' },
  'warning': { hex: '#F2C94C', variableName: 'warning' },
  'success': { hex: '#27AE60', variableName: 'success' },
  'action': { hex: '#2979FF', variableName: 'action' },
  'white': { hex: '#FFFFFF', variableName: 'white' },
  'black': { hex: '#000000', variableName: 'black' },
};

const DEFAULT_SPACING = {
  0: { token: 'constant/none', tailwind: '0' },
  4: { token: 'spacing/pico', tailwind: 'pico' },
  8: { token: 'spacing/extra-small', tailwind: 'extra-small' },
  12: { token: 'spacing/small', tailwind: 'small' },
  16: { token: 'spacing/base', tailwind: 'base' },
  20: { token: 'spacing/medium', tailwind: 'medium' },
  24: { token: 'spacing/semi-large', tailwind: 'semi-large' },
  32: { token: 'spacing/large', tailwind: 'large' },
  40: { token: 'spacing/extra-large', tailwind: 'extra-large' },
  48: { token: 'spacing/huge', tailwind: 'huge' },
  56: { token: 'spacing/extra-huge', tailwind: 'extra-huge' },
  64: { token: 'spacing/massive', tailwind: 'massive' },
  72: { token: 'spacing/gigantic', tailwind: 'gigantic' },
  80: { token: 'spacing/colossal', tailwind: 'colossal' },
};

const DEFAULT_RADIUS = {
  0: { token: 'constant/none', tailwind: 'none' },
  2: { token: 'radius/extra-small', tailwind: 'extra-small' },
  4: { token: 'radius/small', tailwind: 'small' },
  8: { token: 'radius/base', tailwind: 'base' },
  12: { token: 'radius/medium', tailwind: 'medium' },
  16: { token: 'radius/large', tailwind: 'large' },
  20: { token: 'radius/extra-large', tailwind: 'extra-large' },
  32: { token: 'radius/semi-large', tailwind: 'semi-large' },
  999: { token: 'constant/full', tailwind: 'full' },
  9999: { token: 'constant/full', tailwind: 'full' },
};

class TokenRegistry {
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir;
    this.colors = { ...DEFAULT_COLORS };
    this.spacing = { ...DEFAULT_SPACING };
    this.radius = { ...DEFAULT_RADIUS };
    this.hexToToken = new Map();

    this.init();
  }

  init() {
    this.rebuildHexIndex();
    if (!this.workspaceDir) return;

    this.loadFromVariablesJson();
    this.loadFromDesignSystemCss();
    this.rebuildHexIndex();
  }

  rebuildHexIndex() {
    this.hexToToken.clear();
    for (const [key, def] of Object.entries(this.colors)) {
      const normalizedHex = def.hex.toUpperCase();
      if (!this.hexToToken.has(normalizedHex)) {
        this.hexToToken.set(normalizedHex, key);
      }
    }
  }

  loadFromVariablesJson() {
    const candidatePaths = [
      path.join(this.workspaceDir, 'src', 'design-system', 'variables.json'),
      path.join(this.workspaceDir, 'variables.json'),
    ];

    for (const jsonPath of candidatePaths) {
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        if (!data.collections || !Array.isArray(data.collections)) continue;

        for (const col of data.collections) {
          const modes = col.modes || [];
          const defaultMode = modes.find(m => m.name === 'default' || m.name === 'light') || modes[0];
          if (!defaultMode || !Array.isArray(defaultMode.variables)) continue;

          for (const v of defaultMode.variables) {
            if (v.type === 'color' && typeof v.value === 'string' && v.value.startsWith('#')) {
              const cleanName = v.name.replace(/\//g, '-').toLowerCase();
              const hex = v.value.length === 9 ? v.value.substring(0, 7) : v.value;
              this.colors[cleanName] = {
                hex: hex.toUpperCase(),
                variableName: v.name,
              };
            }
          }
        }
        break;
      } catch (e) {
        console.warn('[Tokens] Warning parsing variables.json:', e.message);
      }
    }
  }

  loadFromDesignSystemCss() {
    const cssPath = path.join(this.workspaceDir, 'src', 'design-system', 'theme', 'design-system.css');
    if (!fs.existsSync(cssPath)) return;

    try {
      const css = fs.readFileSync(cssPath, 'utf8');
      const rootMatch = css.match(/:root[\s\S]*?\{([\s\S]*?)\}/);
      if (!rootMatch) return;

      const varBlock = rootMatch[1];
      const varRegex = /--color-([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{6,8})/g;
      let m;
      while ((m = varRegex.exec(varBlock)) !== null) {
        const rawKey = m[1];
        const hex = m[2].length === 9 ? m[2].substring(0, 7) : m[2];
        const varName = rawKey.replace(/-default$/, '');
        this.colors[varName] = {
          hex: hex.toUpperCase(),
          variableName: varName,
        };
      }
    } catch (e) {
      console.warn('[Tokens] Warning parsing design-system.css:', e.message);
    }
  }

  getColor(tokenName, defaultHex = '#181B1D') {
    const key = (tokenName || '').toLowerCase().trim();
    if (this.colors[key]) {
      return this.colors[key];
    }
    return { hex: defaultHex, variableName: tokenName };
  }

  getFill(tokenName, opacity = 1) {
    const c = this.getColor(tokenName);
    const fill = { hex: c.hex, variableName: c.variableName };
    if (opacity < 1) fill.opacity = opacity;
    return [fill];
  }

  getStroke(tokenName, opacity = 1) {
    const c = this.getColor(tokenName);
    const stroke = { hex: c.hex, variableName: c.variableName };
    if (opacity < 1) stroke.opacity = opacity;
    return [stroke];
  }

  getHex(tokenName, defaultHex = '#181B1D') {
    return this.getColor(tokenName, defaultHex).hex;
  }

  getVarName(tokenName) {
    return this.getColor(tokenName).variableName;
  }

  findTokenByHex(hex, isText = false, isStroke = false) {
    if (!hex) return null;
    const cleanHex = hex.toUpperCase().trim();

    if (cleanHex === '#FFFFFF') {
      if (isText) return 'on-surface-primary';
      if (isStroke) return 'white';
      return 'white';
    }

    if (this.hexToToken.has(cleanHex)) {
      return this.hexToToken.get(cleanHex);
    }

    return null;
  }

  matchSpacing(val) {
    if (this.spacing[val]) {
      return this.spacing[val];
    }
    // Snap to closest token if within 1px, otherwise flag
    const keys = Object.keys(this.spacing).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
      if (Math.abs(k - val) <= 1) {
        return this.spacing[k];
      }
    }
    return { token: `spacing/[${val}px]`, tailwind: `[${val}px]` };
  }

  matchRadius(val) {
    if (this.radius[val]) {
      return this.radius[val];
    }
    const keys = Object.keys(this.radius).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
      if (Math.abs(k - val) <= 1) {
        return this.radius[k];
      }
    }
    return { token: `radius/[${val}px]`, tailwind: `[${val}px]` };
  }

  getAllTokens() {
    return {
      colors: this.colors,
      spacing: this.spacing,
      radius: this.radius,
    };
  }
}

let instance = null;

function getTokens(workspaceDir) {
  if (!instance || (workspaceDir && instance.workspaceDir !== workspaceDir)) {
    instance = new TokenRegistry(workspaceDir);
  }
  return instance;
}

module.exports = {
  getTokens,
  TokenRegistry,
  DEFAULT_COLORS,
  DEFAULT_SPACING,
  DEFAULT_RADIUS,
};
