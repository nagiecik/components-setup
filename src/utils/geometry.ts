import { isGenericLayerName } from './strings';
import { rgbToHex } from './colors';

export function isNodeEffectivelyVisible(node: BaseNode): boolean {
  let curr: BaseNode | null = node;
  while (curr && curr.type !== 'PAGE') {
    if ('visible' in curr && (curr as SceneNode).visible === false) {
      return false;
    }
    curr = curr.parent;
  }
  return true;
}


export function getSafeNodeChildren(node: any): SceneNode[] {
  if (!node) return [];

  try {
    if ('children' in node && node.children) {
      if (Array.isArray(node.children)) {
        return node.children;
      }
      if (typeof node.children.length === 'number') {
        return Array.from(node.children);
      }
      if (typeof node.children[Symbol.iterator] === 'function') {
        return Array.from(node.children);
      }
    }
  } catch (e) {}

  try {
    if (typeof node.findChildren === 'function') {
      const found = node.findChildren(() => true);
      if (found && found.length > 0) return found;
    }
  } catch (e) {}

  return [];
}


export function areFramesMatchingItems(a: FrameNode, b: FrameNode): boolean {
  if (!a || !b) return false;
  if (a.type !== 'FRAME' || b.type !== 'FRAME') return false;
  if ((a as any).type === 'INSTANCE' || (b as any).type === 'INSTANCE') return false;

  const nameA = (a.name || '').trim().toLowerCase();
  const nameB = (b.name || '').trim().toLowerCase();

  // 1. Same exact name (e.g. "Progress/Steps/Element" or "ColumnStack")
  if (nameA === nameB && nameA.length > 0) {
    return true;
  }

  // 2. Same base name without numbers or trailing symbols (e.g. "Step 1" vs "Step 2")
  const baseA = nameA.replace(/\d+/g, '').replace(/[-_#\s]+$/, '').trim();
  const baseB = nameB.replace(/\d+/g, '').replace(/[-_#\s]+$/, '').trim();
  if (baseA === baseB && baseA.length > 0) {
    return true;
  }

  // 3. Structural match: layoutMode + children count + child types (even without text!)
  const layoutA = a.layoutMode || 'NONE';
  const layoutB = b.layoutMode || 'NONE';
  if (layoutA !== layoutB) return false;

  const countA = ('children' in a && Array.isArray(a.children)) ? a.children.length : 0;
  const countB = ('children' in b && Array.isArray(b.children)) ? b.children.length : 0;
  if (countA !== countB) return false;

  if (countA === 0) {
    // Both are leaf frames (e.g. empty step bar or shape indicator)
    return true;
  }

  const typesA = a.children.map(c => c.type).join(',');
  const typesB = b.children.map(c => c.type).join(',');
  if (typesA === typesB) {
    return true;
  }

  return false;
}

export function getStructuralSignature(frame: FrameNode): string | null {
  if (frame.type !== 'FRAME' || (frame as any).type === 'INSTANCE') return null;

  const cleanName = (frame.name || '').trim().toLowerCase().replace(/\d+/g, '').trim();
  const layout = frame.layoutMode || 'NONE';
  const childCount = ('children' in frame && Array.isArray(frame.children)) ? frame.children.length : 0;
  const childTypes = childCount > 0 ? frame.children.map(c => c.type).join('|') : 'empty';

  const textNodes = (frame.findAll ? frame.findAll(n => n.type === 'TEXT') : []) as TextNode[];
  const textSig = textNodes.length > 0 ? textNodes.map(t => t.name.trim().toLowerCase()).join('|') : 'no_text';

  return `${cleanName}|${layout}|count:${childCount}|types:[${childTypes}]|text:[${textSig}]`;
}

function getNodeVisualChunk(node: SceneNode): string {
  const parts: string[] = [];
  parts.push(`t:${node.type}`);
  parts.push(`v:${node.visible !== false ? '1' : '0'}`);

  if ('opacity' in node && typeof (node as any).opacity === 'number') {
    parts.push(`op:${(node as any).opacity.toFixed(2)}`);
  }

  // Fills (HEX or boundVariable ID)
  if ('fills' in node && Array.isArray((node as any).fills)) {
    const fills = (node as any).fills as readonly Paint[];
    const bvFills = (node as any).boundVariables?.fills;
    if (bvFills && Array.isArray(bvFills) && bvFills.length > 0) {
      parts.push(`bvFills:${bvFills.map((b: any) => (b && b.id) || '').join(',')}`);
    } else {
      const fillDescs = fills.map(f => {
        if (!f || f.visible === false) return 'none';
        if (f.type === 'SOLID') {
          return `${rgbToHex(f.color.r, f.color.g, f.color.b)}@${(f.opacity ?? 1).toFixed(2)}`;
        }
        return f.type;
      });
      parts.push(`fills:[${fillDescs.join(',')}]`);
    }
  }

  // Strokes (HEX or boundVariable ID) & strokeWeight
  if ('strokes' in node && Array.isArray((node as any).strokes)) {
    const strokes = (node as any).strokes as readonly Paint[];
    const bvStrokes = (node as any).boundVariables?.strokes;
    if (bvStrokes && Array.isArray(bvStrokes) && bvStrokes.length > 0) {
      parts.push(`bvStrokes:${bvStrokes.map((b: any) => (b && b.id) || '').join(',')}`);
    } else {
      const strokeDescs = strokes.map(s => {
        if (!s || s.visible === false) return 'none';
        if (s.type === 'SOLID') return rgbToHex(s.color.r, s.color.g, s.color.b);
        return s.type;
      });
      parts.push(`strokes:[${strokeDescs.join(',')}]`);
    }
    if ('strokeWeight' in node && typeof (node as any).strokeWeight === 'number') {
      parts.push(`sw:${(node as any).strokeWeight}`);
    }
  }

  // Corner radius
  if ('cornerRadius' in node) {
    const cr = (node as any).cornerRadius;
    parts.push(`cr:${cr === figma.mixed ? 'mixed' : cr}`);
  }

  // Typography font style/weight (characters intentionally excluded!)
  if (node.type === 'TEXT') {
    const fn = (node as TextNode).fontName;
    if (fn !== figma.mixed && fn && typeof fn === 'object') {
      parts.push(`style:${fn.style}`);
    }
  }

  // Nested instance variant properties (e.g. Toggle=True vs Toggle=False)
  if (node.type === 'INSTANCE') {
    const inst = node as InstanceNode;
    if (inst.variantProperties) {
      const vp = Object.entries(inst.variantProperties)
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join(';');
      parts.push(`vp:{${vp}}`);
    }
    if (inst.mainComponent) {
      parts.push(`mc:${inst.mainComponent.name}`);
    }
  }

  return parts.join(';');
}

export function getVisualSignature(frame: FrameNode): string {
  const chunks: string[] = [getNodeVisualChunk(frame)];

  function recurse(ch: SceneNode) {
    chunks.push(getNodeVisualChunk(ch));
    if ('children' in ch && Array.isArray((ch as any).children)) {
      for (const sub of (ch as any).children) {
        recurse(sub);
      }
    }
  }

  if ('children' in frame && Array.isArray(frame.children)) {
    for (const child of frame.children) {
      recurse(child as SceneNode);
    }
  }

  return chunks.join('|');
}


export function getInstanceBaseName(inst: InstanceNode): string {
  if (inst.mainComponent) {
    if (inst.mainComponent.parent && inst.mainComponent.parent.type === 'COMPONENT_SET') {
      return inst.mainComponent.parent.name.trim();
    }
    const compName = (inst.mainComponent.name || '').trim();
    if (compName.includes('/')) {
      return compName.split('/')[0].trim();
    }
    if (compName.includes(',')) {
      return compName.split(',')[0].trim();
    }
    if (compName) return compName;
  }
  const nodeName = (inst.name || '').trim();
  if (nodeName.includes('/')) {
    return nodeName.split('/')[0].trim();
  }
  if (nodeName.includes(',')) {
    return nodeName.split(',')[0].trim();
  }
  return nodeName;
}


export function checkChildrenHomogeneity(children: readonly SceneNode[]): {
  isHomogeneous: boolean;
  itemKind: 'card' | 'button' | 'badge' | 'input' | 'tab' | 'item' | 'text' | 'none';
  baseName: string;
} {
  if (!children || children.length < 2) {
    return { isHomogeneous: false, itemKind: 'none', baseName: '' };
  }

  // 1. All TEXT children
  if (children.every(c => c.type === 'TEXT')) {
    return { isHomogeneous: true, itemKind: 'text', baseName: 'Text' };
  }

  // 2. All INSTANCE children (homogeneous if same component set or same base name before '/')
  if (children.every(c => c.type === 'INSTANCE')) {
    const baseNames = children.map(c => getInstanceBaseName(c as InstanceNode));
    const firstBase = baseNames[0] || '';
    const firstLower = firstBase.toLowerCase();
    const allSameBase = baseNames.every(b => b.toLowerCase() === firstLower);

    const firstInst = children[0] as InstanceNode;
    const firstMainId = firstInst.mainComponent?.id;
    const firstSetId = firstInst.mainComponent?.parent?.id;
    const allSameMain = firstMainId && children.every(c => (c as InstanceNode).mainComponent?.id === firstMainId);
    const allSameSet = firstSetId && children.every(c => (c as InstanceNode).mainComponent?.parent?.id === firstSetId);

    if (allSameBase || allSameMain || allSameSet) {
      let itemKind: 'card' | 'button' | 'badge' | 'input' | 'tab' | 'item' = 'item';
      if (/card/i.test(firstLower)) itemKind = 'card';
      else if (/button|btn|cta/i.test(firstLower)) itemKind = 'button';
      else if (/badge|tag|chip/i.test(firstLower)) itemKind = 'badge';
      else if (/input|field|select|textarea/i.test(firstLower)) itemKind = 'input';
      else if (/tab/i.test(firstLower)) itemKind = 'tab';

      return { isHomogeneous: true, itemKind, baseName: firstBase };
    }
  }

  // 3. All FRAME children with identical semantic name
  if (children.every(c => c.type === 'FRAME')) {
    const firstFrameName = children[0].name.trim().toLowerCase();
    const allSameFrameName = children.every(c => c.name.trim().toLowerCase() === firstFrameName);
    if (allSameFrameName && !isGenericLayerName(firstFrameName)) {
      let itemKind: 'card' | 'item' = 'item';
      if (/card/i.test(firstFrameName)) itemKind = 'card';
      return { isHomogeneous: true, itemKind, baseName: children[0].name.trim() };
    }
  }

  return { isHomogeneous: false, itemKind: 'none', baseName: '' };
}


export function hasContentAncestorNode(node: SceneNode): boolean {
  let curr: BaseNode | null = node.parent;
  while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
    if (curr.type === 'COMPONENT' || curr.type === 'COMPONENT_SET') break;
    const pName = (curr.name || '').trim().toLowerCase();
    if (pName === 'content') return true;
    curr = curr.parent;
  }
  return false;
}

