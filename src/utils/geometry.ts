import { isGenericLayerName } from './strings';

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


export function getStructuralSignature(frame: FrameNode): string | null {
  if (frame.type !== 'FRAME' || (frame as any).type === 'INSTANCE') return null;
  if (!('children' in frame) || !Array.isArray(frame.children) || frame.children.length === 0) return null;

  // Must contain text layers
  const textNodes = (frame.findAll ? frame.findAll(n => n.type === 'TEXT') : []) as TextNode[];
  if (textNodes.length === 0) return null;

  const directSig = frame.children.map(c => `${c.type}:${c.name}`).join('|');
  const textSig = textNodes.map(t => t.name).join('|');

  return `${frame.layoutMode || 'NONE'}[${directSig}]<${textSig}>`;
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

