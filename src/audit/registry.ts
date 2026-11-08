import { TokenColorDef } from '../types/audit';

const DEFAULT_DS_COLORS: Record<string, TokenColorDef> = {
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

const DEFAULT_DS_SPACING: Record<number, string> = {
  0: '0',
  4: 'pico',
  8: 'extra-small',
  10: '2.5',
  12: 'small',
  14: '3.5',
  16: 'base',
  18: '4.5',
  20: 'medium',
  22: '5.5',
  24: 'semi-large',
  32: 'large',
  40: 'extra-large',
  48: 'huge',
  56: 'extra-huge',
  64: 'massive',
  72: 'gigantic',
  80: 'colossal',
};

const DEFAULT_DS_RADIUS: Record<number, string> = {
  0: 'none',
  2: 'extra-small',
  4: 'small',
  8: 'base',
  12: 'medium',
  16: 'large',
  20: 'extra-large',
  32: 'semi-large',
  999: 'full',
  9999: 'full',
};

const DEFAULT_DS_STROKE: Record<number, string> = {
  0: '0',
  1: 'Constant/1',
  2: 'Constant/2',
  4: 'Constant/4',
  8: 'Constant/8',
};

export class DesignSystemRegistry {
  private colors: Record<string, TokenColorDef> = { ...DEFAULT_DS_COLORS };
  private spacing: Record<number, string> = { ...DEFAULT_DS_SPACING };
  private radius: Record<number, string> = { ...DEFAULT_DS_RADIUS };
  private stroke: Record<number, string> = { ...DEFAULT_DS_STROKE };
  private hexMap: Map<string, string> = new Map();

  constructor() {
    this.rebuildHexMap();
  }

  private rebuildHexMap() {
    this.hexMap.clear();
    for (const [name, def] of Object.entries(this.colors)) {
      const h = def.hex.toUpperCase();
      if (!this.hexMap.has(h)) {
        this.hexMap.set(h, name);
      }
    }
  }

  public updateTokens(remoteTokens: { colors?: Record<string, TokenColorDef>; spacing?: any; radius?: any; stroke?: any }) {
    if (remoteTokens.colors) {
      this.colors = { ...this.colors, ...remoteTokens.colors };
    }
    if (remoteTokens.spacing) {
      for (const [k, v] of Object.entries(remoteTokens.spacing)) {
        const num = Number(k);
        const name = typeof v === 'object' && v !== null && 'tailwind' in v ? (v as any).tailwind : String(v);
        if (!isNaN(num)) this.spacing[num] = name;
      }
    }
    if (remoteTokens.radius) {
      for (const [k, v] of Object.entries(remoteTokens.radius)) {
        const num = Number(k);
        const name = typeof v === 'object' && v !== null && 'tailwind' in v ? (v as any).tailwind : String(v);
        if (!isNaN(num)) this.radius[num] = name;
      }
    }
    if ((remoteTokens as any).stroke) {
      for (const [k, v] of Object.entries((remoteTokens as any).stroke)) {
        const num = Number(k);
        const name = typeof v === 'object' && v !== null && 'tailwind' in v ? (v as any).tailwind : String(v);
        if (!isNaN(num)) this.stroke[num] = name;
      }
    }
    this.rebuildHexMap();
  }

  public getFill(tokenName: string, opacity = 1) {
    const key = (tokenName || '').toLowerCase().trim();
    const c = this.colors[key] || { hex: '#181B1D', variableName: tokenName };
    const fill: any = { hex: c.hex, variableName: c.variableName };
    if (opacity < 1) fill.opacity = opacity;
    return [fill];
  }

  public getStroke(tokenName: string, opacity = 1) {
    const key = (tokenName || '').toLowerCase().trim();
    const c = this.colors[key] || { hex: '#AEB8BE', variableName: tokenName };
    const stroke: any = { hex: c.hex, variableName: c.variableName };
    if (opacity < 1) stroke.opacity = opacity;
    return [stroke];
  }

  public matchColor(hex: string, isText = false, isStroke = false): string {
    const cleanHex = hex.toUpperCase().trim();
    if (cleanHex === '#FFFFFF') {
      if (isText) return 'on-surface-primary';
      if (isStroke) return 'white';
      return 'white';
    }
    if (this.hexMap.has(cleanHex)) {
      return this.hexMap.get(cleanHex)!;
    }
    return `[${cleanHex}]`;
  }

  public matchSpacing(val: number): string {
    if (this.spacing[val]) return this.spacing[val];
    for (const [k, name] of Object.entries(this.spacing)) {
      if (Math.abs(Number(k) - val) <= 1) return name;
    }
    return `[${val}px]`;
  }

  public matchRadius(val: number): string {
    if (this.radius[val]) return this.radius[val];
    for (const [k, name] of Object.entries(this.radius)) {
      if (Math.abs(Number(k) - val) <= 1) return name;
    }
    return `[${val}px]`;
  }

  public matchStroke(val: number): string {
    if (this.stroke[val]) return this.stroke[val];
    return `[${val}px]`;
  }
}

export const dsRegistry = new DesignSystemRegistry();


export const NON_NUMERIC_PROP_KEYS = new Set([
  'fills', 'strokes', 'effects', 'visible', 'characters', 'textdata', 'fontname',
  'fontsize', 'lineheight', 'letterspacing', 'paragraphspacing', 'paragraphindent',
  'fontweight', 'textcase', 'textdecoration', 'leading', 'tracking', 'font', 'typography', 'text'
]);

export function getLayerTypeDisplayName(type: string): string {
  switch (type) {
    case 'SECTION':
      return 'Section Layers';
    case 'INSTANCE':
      return 'Instance Layers';
    case 'COMPONENT':
      return 'Component Layers';
    case 'RECTANGLE':
      return 'Rectangle Layers';
    case 'FRAME':
      return 'Frame Layers';
    case 'VECTOR':
      return 'Vector Layers';
    case 'COMPONENT_SET':
      return 'Component_set Layers';
    case 'TEXT':
      return 'Text Layers';
    case 'LINE':
      return 'Line Layers';
    case 'ELLIPSE':
      return 'Ellipse Layers';
    case 'STAR':
      return 'Star Layers';
    case 'POLYGON':
      return 'Polygon Layers';
    case 'GROUP':
      return 'Group Layers';
    case 'BOOLEAN_OPERATION':
      return 'Boolean Operation Layers';
    default:
      const lower = type.toLowerCase().replace(/_/g, ' ');
      const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
      return `${capitalized} Layers`;
  }
}

export function isNonNumericProp(key: string): boolean {
  const k = key.toLowerCase();
  if (NON_NUMERIC_PROP_KEYS.has(k)) return true;
  if (k.includes('font') || k.includes('text') || k.includes('lineheight') || k.includes('letterspacing') || k.includes('typography')) {
    return true;
  }
  return false;
}

export function parsePropertyInfo(propName: string): { category: string; detail: string } {
  const p = propName.toLowerCase();

  // Corner radii
  if (p.includes('topleftradius') || p.includes('topleft')) {
    return { category: 'Radius', detail: 'Top-Left' };
  }
  if (p.includes('toprightradius') || p.includes('topright')) {
    return { category: 'Radius', detail: 'Top-Right' };
  }
  if (p.includes('bottomleftradius') || p.includes('bottomleft')) {
    return { category: 'Radius', detail: 'Bottom-Left' };
  }
  if (p.includes('bottomrightradius') || p.includes('bottomright')) {
    return { category: 'Radius', detail: 'Bottom-Right' };
  }
  if (p.includes('radius') || p.includes('corner')) {
    return { category: 'Radius', detail: 'All Corners' };
  }

  // Padding
  if (p.includes('paddingleft')) return { category: 'Padding', detail: 'Left' };
  if (p.includes('paddingright')) return { category: 'Padding', detail: 'Right' };
  if (p.includes('paddingtop')) return { category: 'Padding', detail: 'Top' };
  if (p.includes('paddingbottom')) return { category: 'Padding', detail: 'Bottom' };
  if (p.includes('padding')) return { category: 'Padding', detail: 'All Sides' };

  // Gap / Spacing
  if (p.includes('itemspacing') || p === 'gap') return { category: 'Gap', detail: 'Gap' };
  if (p.includes('counteraxisspacing')) return { category: 'Gap', detail: 'Counter Gap' };
  if (p.includes('spacing')) return { category: 'Gap', detail: 'Gap' };

  // Border / Stroke Weight
  if (p.includes('stroketopweight')) return { category: 'Border', detail: 'Top' };
  if (p.includes('strokebottomweight')) return { category: 'Border', detail: 'Bottom' };
  if (p.includes('strokeleftweight')) return { category: 'Border', detail: 'Left' };
  if (p.includes('strokerightweight')) return { category: 'Border', detail: 'Right' };
  if (p.includes('stroke') || p.includes('border') || p.includes('weight')) return { category: 'Border', detail: 'All Sides' };

  // Size
  if (p.includes('width')) return { category: 'Size', detail: 'Width' };
  if (p.includes('height')) return { category: 'Size', detail: 'Height' };
  if (p.includes('size')) return { category: 'Size', detail: 'Size' };

  // Opacity
  if (p.includes('opacity')) return { category: 'Opacity', detail: 'Opacity' };

  // Effects / Shadows / Blurs / Glass
  if (p.includes('effect') || p.includes('shadow') || p.includes('blur') || p.includes('glass') || p.includes('frost')) {
    return { category: 'Effect', detail: propName || 'Effect' };
  }

  return { category: 'Property', detail: propName || 'Property' };
}


export const IGNORED_CONTAINER_FRAME_NAMES = new Set([
  'main', 'section', 'component', 'screen'
]);

export function isInsideIgnoredSubtree(node: BaseNode): boolean {
  let curr: BaseNode | null = node;
  while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
    const name = (curr.name || '').trim().toLowerCase();
    if (name.startsWith('_')) {
      return true;
    }
    if (curr.type === 'INSTANCE') {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

export function shouldSkipNodeReporting(node: BaseNode): boolean {
  // Skip any node that starts with _, is an INSTANCE, or is inside an ancestor starting with _ / INSTANCE
  if (isInsideIgnoredSubtree(node)) return true;

  // Skip reporting variables directly on Figma SECTION containers
  if (node.type === 'SECTION') return true;

  // Skip reporting variables directly on COMPONENT_SET outer wrapper containers
  if (node.type === 'COMPONENT_SET') return true;

  // Skip reporting variables directly on wrapper FRAMEs named main, section, or component
  if (node.type === 'FRAME') {
    const nameLower = (node.name || '').trim().toLowerCase();
    if (IGNORED_CONTAINER_FRAME_NAMES.has(nameLower)) return true;
  }

  return false;
}


export function getNodeIgnoredAuditKeys(node: SceneNode): Set<string> {
  try {
    const raw = (node as any).getPluginData ? (node as any).getPluginData('ignored_audit_issues') : '';
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

export function setNodeAuditIgnored(node: SceneNode, category: string, property: string, ignored: boolean): void {
  try {
    if (!('getPluginData' in node) || !('setPluginData' in node)) return;
    const raw = (node as any).getPluginData('ignored_audit_issues');
    let list: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        list = [];
      }
    }
    const key = `${category}:${property}`;
    if (ignored) {
      if (!list.includes(key)) list.push(key);
    } else {
      list = list.filter(k => k !== key && k !== `${category}:*`);
    }
    (node as any).setPluginData('ignored_audit_issues', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to set pluginData for audit ignore on node:', (node as any)?.id, e);
  }
}

