import { toPascalCase, sanitizePascalCase } from '../utils/strings';
import { isSlotContainer } from '../slots/slots';

export function collectDirectTextNodes(root: BaseNode & ChildrenMixin): TextNode[] {
  const result: TextNode[] = [];
  function recurse(n: SceneNode) {
    if (n.type === 'INSTANCE') return; // Stop at instance boundary
    if (isSlotContainer(n)) return; // Stop at Slot boundary - ignore texts inside Slot
    if (n.type === 'TEXT') {
      result.push(n as TextNode);
      return;
    }
    if ('children' in n && Array.isArray((n as any).children)) {
      for (const ch of (n as any).children) {
        recurse(ch);
      }
    }
  }
  if ('children' in root && Array.isArray(root.children)) {
    for (const ch of root.children) {
      recurse(ch);
    }
  }
  return result;
}

export function isIconInstanceNode(n: InstanceNode): boolean {
  const nameLower = (n.name || '').trim().toLowerCase();
  if (nameLower === 'icon' || nameLower.includes('icon') || nameLower.startsWith('ico')) {
    return true;
  }
  const mainComp = n.mainComponent;
  if (mainComp) {
    const mainLower = (mainComp.name || '').trim().toLowerCase();
    if (mainLower === 'icon' || mainLower.includes('icon') || mainLower.startsWith('ico')) {
      return true;
    }
    if (mainComp.parent && mainComp.parent.type === 'COMPONENT_SET') {
      const parentLower = (mainComp.parent.name || '').trim().toLowerCase();
      if (parentLower === 'icon' || parentLower.includes('icon') || parentLower.startsWith('ico') || parentLower.includes('lucide')) {
        return true;
      }
    }
  }
  if ('width' in n && 'height' in n && n.width > 0 && n.height > 0 && n.width <= 48 && n.height <= 48) {
    const ratio = n.width / n.height;
    if (ratio >= 0.8 && ratio <= 1.25) {
      if (!nameLower.includes('avatar') && !nameLower.includes('badge') && !nameLower.includes('dot') && !nameLower.includes('item')) {
        return true;
      }
    }
  }
  return false;
}

export function collectDirectIconInstances(root: BaseNode & ChildrenMixin): InstanceNode[] {
  const result: InstanceNode[] = [];
  function recurse(n: SceneNode) {
    if (n.type === 'INSTANCE') {
      const inst = n as InstanceNode;
      if (isIconInstanceNode(inst)) {
        result.push(inst);
      }
      return; // Stop at instance boundary
    }
    if ('children' in n && Array.isArray((n as any).children)) {
      for (const ch of (n as any).children) {
        recurse(ch);
      }
    }
  }
  if ('children' in root && Array.isArray(root.children)) {
    for (const ch of root.children) {
      recurse(ch);
    }
  }
  return result;
}

export function collectDirectInstances(root: BaseNode & ChildrenMixin): InstanceNode[] {
  const result: InstanceNode[] = [];
  function recurse(n: SceneNode) {
    if (isSlotContainer(n)) return; // Stop at Slot boundary - do not collect instances inside Slot
    if (n.type === 'INSTANCE') {
      const inst = n as InstanceNode;
      const nameLower = (inst.name || '').trim().toLowerCase();
      if (!nameLower.includes('slot')) {
        result.push(inst);
      }
      return; // Stop at instance boundary - do not collect nested instances
    }
    if ('children' in n && Array.isArray((n as any).children)) {
      for (const ch of (n as any).children) {
        recurse(ch);
      }
    }
  }
  if ('children' in root && Array.isArray(root.children)) {
    for (const ch of root.children) {
      recurse(ch);
    }
  }
  return result;
}

export function cleanInstancePropertyName(rawName: string): { propName: string; isSlot: boolean } {
  let name = (rawName || '').trim();

  if (name.includes('/')) {
    const segments = name.split('/').map(s => s.trim()).filter(Boolean);
    const filtered = segments.filter((s, idx) => {
      if (idx === segments.length - 1 && segments.length > 1 && /^(default|variant\d*|property\d*|state\d*|hover|active|focus|disabled|pressed|normal)$/i.test(s)) {
        return false;
      }
      return true;
    });
    name = filtered.length > 0 ? filtered.join(' ') : (segments[segments.length - 1] || 'Instance');
  }

  let pascal = sanitizePascalCase(name);
  if (!pascal || pascal === 'Wrapper') {
    pascal = 'Instance';
  }

  const isSlot = /slot/i.test(rawName) || /slot/i.test(pascal);
  return { propName: pascal, isSlot };
}

export function getContainingVariantOrRoot(node: SceneNode): SceneNode {
  let curr: BaseNode | null = node;
  while (curr) {
    if (curr.parent && curr.parent.type === 'COMPONENT_SET') {
      return curr as SceneNode;
    }
    if (curr.type === 'COMPONENT' || curr.type === 'COMPONENT_SET') {
      return curr as SceneNode;
    }
    curr = curr.parent;
  }
  return node;
}

