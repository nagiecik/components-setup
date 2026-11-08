import { isSlotContainer, isSlotLayer } from '../slots/slots';
import { checkChildrenHomogeneity, getInstanceBaseName, hasContentAncestorNode } from '../utils/geometry';
import { sanitizePascalCase, toPascalCase } from '../utils/strings';
import {
  classifyTextNodeDirectly,
  getExistingSemanticRole,
  isAllowedTextRole,
  isNameDerivedFromCharacters
} from './textClassifier';

export function nodeContainsText(node: SceneNode): boolean {
  if (node.type === 'TEXT') return true;
  if (node.type === 'INSTANCE') return false; // Stop recursion at instance boundaries
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (nodeContainsText(child)) return true;
    }
  }
  return false;
}

export function isGenericLayerName(name: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  if (/^(frame|group|rectangle|vector|ellipse|line|star|polygon|auto layout|container|box|wrapper|div|element|stack|row|contentstack|contentrow|containerstack)[\s\d_#-]*$/i.test(n)) {
    return true;
  }
  if (/^frame\s*\d+$/i.test(n) || /^group\s*\d+$/i.test(n)) {
    return true;
  }
  return false;
}


const VALID_FRAME_SEMANTIC_NAMES = new Set([
  'HeaderRow',
  'TitleRow',
  'HeaderGroup',
  'TitleGroup',
  'FooterRow',
  'BottomBar',
  'Actions',
  'ActionRow',
  'ActionGroup',
  'ButtonGroup',
  'TextStack',
  'ColumnStack',
  'RowStack',
  'CardGroup',
  'CardGrid',
  'ItemGroup',
  'ItemGrid',
  'BadgeGroup',
  'InputGroup',
  'TabGroup',
  'StepsGroup',
  'IndicatorsRow',
  'MarkersRow',
  'MediaWrapper',
  'IconWrapper',
  'LeadingIconWrapper',
  'TrailingIconWrapper',
  'Content',
  'Slot',
  'LeadingSlot',
  'TrailingSlot',
  'BottomSlot',
  'Divider',
  'Bar',
  'Track',
  'Fill',
  'Thumb',
  'Indicator',
  'Backdrop',
  'Surface',
  'FieldLabel',
  'FieldDescription'
]);

const VALID_FRAME_SEMANTIC_LOOKUP = new Map<string, string>(
  Array.from(VALID_FRAME_SEMANTIC_NAMES).map(n => [n.toLowerCase(), n])
);

export function getExistingSemanticFrameName(
  frame: FrameNode | GroupNode,
  isDirectRootChild: boolean,
  hasContentAncestor: boolean
): string | null {
  const rawName = (frame.name || '').trim();
  if (!rawName || isGenericLayerName(rawName)) return null;

  if (isSlotContainer(frame)) {
    return 'Slot';
  }

  const lower = rawName.toLowerCase();
  if (lower === 'content' && (!isDirectRootChild || hasContentAncestor)) {
    return null;
  }

  const matched = VALID_FRAME_SEMANTIC_LOOKUP.get(lower);
  if (matched) {
    return matched;
  }

  // Also respect indexed Slots like "Slot 2", "Slot 3"
  if (/^slot(\s+\d+)?$/i.test(rawName)) {
    return rawName;
  }

  return null;
}

export function classifyAutoLayoutFrame(
  frame: FrameNode | GroupNode,
  isDirectRootChild: boolean,
  hasContentAncestor: boolean
): string {
  const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
  if (existingFrameRole) {
    return existingFrameRole;
  }

  const children = 'children' in frame && Array.isArray(frame.children) ? frame.children : [];
  const mode = 'layoutMode' in frame ? frame.layoutMode : 'NONE';
  const wrap = 'layoutWrap' in frame ? frame.layoutWrap : 'NO_WRAP';
  const currentName = (frame.name || '').trim();
  const lowerName = currentName.toLowerCase();

  // Rule 4: Content check
  // Content can ONLY exist as direct child of root component (or slot directly under root).
  if (isDirectRootChild && !hasContentAncestor) {
    if (lowerName === 'content' || isSlotLayer(frame)) {
      if (lowerName.includes('lead') && lowerName.includes('slot')) return 'LeadingSlot';
      if (lowerName.includes('trail') && lowerName.includes('slot')) return 'TrailingSlot';
      if (lowerName.includes('bottom') && lowerName.includes('slot')) return 'BottomSlot';
      return 'Content';
    }
  }

  if (isSlotContainer(frame)) {
    return 'Slot';
  }

  // Thin decorative divider
  const w = 'width' in frame ? frame.width : 0;
  const h = 'height' in frame ? frame.height : 0;
  if ((h === 1 && w > 1) || (w === 1 && h > 1) || lowerName.includes('divider') || lowerName.includes('separator')) {
    return 'Divider';
  }

  // Track or Bar (long bars or top bars)
  if ((w >= 36 && h > 0 && h <= 16 && (w / h >= 2.5)) || (h >= 36 && w > 0 && w <= 16 && (h / w >= 2.5))) {
    if (lowerName.includes('bar') || lowerName.includes('track') || lowerName.includes('progress')) {
      return lowerName.includes('fill') ? 'Fill' : 'Bar';
    }
  }
  if (lowerName === 'bar') {
    return 'Bar';
  }

  // Exception: Exactly 1 child (children.length === 1) -> Wrapper / IconWrapper / MediaWrapper
  if (children.length === 1) {
    const ch = children[0];
    if (ch.type === 'INSTANCE') {
      const chName = (ch.name || '') + ' ' + ((ch as InstanceNode).mainComponent?.name || '');
      if (/icon/i.test(chName)) {
        if (/lead|left|start/i.test(currentName)) return 'LeadingIconWrapper';
        if (/trail|right|end/i.test(currentName)) return 'TrailingIconWrapper';
        return 'IconWrapper';
      }
    }
    const clips = 'clipsContent' in frame ? Boolean(frame.clipsContent) : false;
    const isMedia = ch.type === 'RECTANGLE' || ch.type === 'VECTOR' || /image|img|media|thumb|video|avatar|cover/i.test(ch.name || '');
    if (clips && isMedia && w > 30 && h > 30) {
      return 'MediaWrapper';
    }
    return 'Wrapper';
  }

  // Reguła B: Homogeneous Children (>= 2 identical items -> ...Group / ...Grid)
  const homo = checkChildrenHomogeneity(children);
  if (homo.isHomogeneous && homo.itemKind !== 'text') {
    if (wrap === 'WRAP') {
      if (homo.itemKind === 'card') return 'CardGrid';
      return 'ItemGrid';
    }
    // List (horizontal or vertical AL)
    if (homo.itemKind === 'card') return 'CardGroup';
    if (homo.itemKind === 'button') return 'ButtonGroup';
    if (homo.itemKind === 'badge') return 'BadgeGroup';
    if (homo.itemKind === 'input') return 'InputGroup';
    if (homo.itemKind === 'tab') return 'TabGroup';
    return 'ItemGroup';
  }

  // Reguła A: Heterogeneous Children (> 1 different items)
  // Semantic exceptions:
  // 1. TextStack: vertical AL where ALL children are TEXT
  if (mode === 'VERTICAL' && children.length >= 2 && children.every(c => c.type === 'TEXT')) {
    return 'TextStack';
  }

  // 2. HeaderRow: horizontal AL at top of section/card with title + optional actions/icons
  if (mode === 'HORIZONTAL') {
    const isTopInParent = frame.parent && 'children' in frame.parent && (
      frame.parent.children[0] === frame ||
      frame.parent.children.filter(c => c.type === 'FRAME' || c.type === 'GROUP')[0] === frame
    );
    const hasTextChild = children.some(c => c.type === 'TEXT' || (c.type === 'FRAME' && nodeContainsText(c)));
    const hasHeaderName = /header|title|head/i.test(currentName);
    if ((isTopInParent && hasTextChild) || hasHeaderName) {
      return 'HeaderRow';
    }
  }

  // Core Rule A:
  if (mode === 'HORIZONTAL') {
    if (wrap === 'WRAP') return 'CardGrid';
    return 'RowStack';
  }
  if (mode === 'VERTICAL') {
    return 'ColumnStack';
  }

  return 'ColumnStack';
}

export function sanitizeLayerNameByContext(rawNewName: string, node: SceneNode, rootCompName: string): string {
  // Never rename a top-level root component/frame/group on Page or Section
  if (node.parent && (node.parent.type === 'PAGE' || node.parent.type === 'SECTION')) {
    return toPascalCase(node.name || rawNewName);
  }
  let name = sanitizePascalCase(rawNewName);
  const rootLower = (rootCompName || '').toLowerCase();

  // Root context guardrail: ban Slider/Range specific words if root component doesn't match
  if (!rootLower.includes('slider') && !rootLower.includes('range')) {
    name = name.replace(/^Slider([A-Z])/, '$1');
    if (name === 'Slider') name = 'Track';
    if (name === 'Tick' || name === 'TickMark') name = 'Marker';
  }

  if (node.type === 'TEXT') {
    const txt = node as TextNode;
    const chars = txt.characters || '';
    const existingSemantic = getExistingSemanticRole(txt.name, chars);
    if (existingSemantic) {
      return existingSemantic;
    }
    if (name.length > 20 || isNameDerivedFromCharacters(name, chars) || !isAllowedTextRole(name)) {
      return classifyTextNodeDirectly(txt);
    }
    return name;
  }

  if (node.type === 'FRAME' || node.type === 'GROUP') {
    if (isSlotContainer(node)) {
      return 'Slot';
    }
    const frame = node as FrameNode | GroupNode;
    const isDirectRootChild = Boolean(node.parent && (node.parent.type === 'COMPONENT' || node.parent.type === 'COMPONENT_SET'));
    const hasContentAncestor = hasContentAncestorNode(node);

    const lower = name.toLowerCase();
    const isBanned = [
      'containerstack', 'stack', 'row', 'contentstack', 'contentrow', 'rowwrapper'
    ].includes(lower) || (lower === 'content' && hasContentAncestor);

    if (isBanned || !name) {
      name = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
    } else {
      const children = 'children' in frame && Array.isArray(frame.children) ? frame.children : [];
      const homo = checkChildrenHomogeneity(children);
      if (homo.isHomogeneous && homo.itemKind !== 'text') {
        if (/stack|row/i.test(name) || name === 'Group' || isGenericLayerName(name)) {
          name = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
        }
      }
    }
  }

  return name;
}


export async function sanitizeLayerNames(node: BaseNode, isPascalCaseOnly: boolean = false) {
  if (!node) return;

  // Skip instances of other components completely ("oprócz instancji komponentów")
  if (node.type === 'INSTANCE') {
    return;
  }

  if (node.type === 'TEXT') {
    const txt = node as TextNode;
    const rawName = (txt.name || '').trim();
    const chars = txt.characters || '';

    // PRIORYTET 1: Poszanowanie istniejącej, semantycznej nazwy roboczej
    const existing = getExistingSemanticRole(rawName, chars);
    if (existing) {
      if (txt.name !== existing) txt.name = existing;
      return;
    }

    // Requirement 1 & 4: Never concatenate raw characters into PascalCase.
    // If name is derived from characters, is generic, > 20 chars, or not an allowed UI role:
    if (isNameDerivedFromCharacters(rawName, chars) || rawName.length > 20 || isGenericLayerName(rawName) || !isAllowedTextRole(rawName)) {
      const semantic = classifyTextNodeDirectly(txt);
      if (txt.name !== semantic) {
        txt.name = semantic;
      }
    } else {
      const pascal = toPascalCase(rawName);
      if (pascal && txt.name !== pascal) {
        txt.name = pascal;
      }
    }
    return;
  }

  if ('name' in node && typeof (node as any).name === 'string') {
    const rawName = (node as any).name.trim();
    if (rawName) {
      const isVariantInSet = node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET';
      if (isVariantInSet) {
        // Sanitize variant property and value cases to PascalCase
        const parts = rawName.split(',').map((part) => {
          const eqIdx = part.indexOf('=');
          if (eqIdx === -1) {
            return toPascalCase(part.trim());
          }
          const k = part.substring(0, eqIdx).trim();
          const v = part.substring(eqIdx + 1).trim();
          const pascalK = /^property\s*\d+$/i.test(k) ? 'Type' : toPascalCase(k);
          const pascalV = toPascalCase(v);
          return pascalK ? `${pascalK}=${pascalV}` : `${k}=${pascalV}`;
        });
        const newName = parts.join(', ');
        if ((node as any).name !== newName) {
          (node as any).name = newName;
        }
      } else {
        if (!isPascalCaseOnly && /^frame(\s*\d+)?$/i.test(rawName)) {
          (node as any).name = 'Container';
        } else {
          const pascal = toPascalCase(rawName);
          if (pascal && (node as any).name !== pascal) {
            (node as any).name = pascal;
          }
        }
      }
    }
  }

  if ('children' in node && (node as any).children) {
    for (const child of (node as any).children) {
      await sanitizeLayerNames(child, isPascalCaseOnly);
    }
  }
}

let metricsCollectionPromise: Promise<void> | null = null;

