import { ResolvedVariable } from '../types/variables';
import {
  bindColorVariablesRecursively,
  bindOrReplaceField,
  bindRadiusOrReplaceForeign,
  getAllRelevantVariablesForComponentSet,
  normalizeVarPath
} from '../variables/variables';

export function isSlotLayer(node: SceneNode): boolean {
  const name = (node.name || '').trim().toLowerCase();
  if (name.includes('slot') || name === 'actions') {
    return true;
  }
  if ('componentPropertyReferences' in node) {
    const refs = (node as any).componentPropertyReferences;
    if (refs && typeof refs === 'object' && Object.keys(refs).length > 0) {
      return true;
    }
  }
  return false;
}


export function isSlotContainer(n: BaseNode): boolean {
  if (!n) return false;
  if ((n as any).type === 'SLOT') return true;
  if ((n as any).componentPropertyReferences && (n as any).componentPropertyReferences.slot) return true;
  if (n.type !== 'FRAME') return false;
  const name = (n.name || '').trim().toLowerCase();
  return (
    name === 'slot' ||
    name === 'itemsslot' ||
    name === 'contentslot' ||
    name.endsWith('slot') ||
    name.startsWith('slot') ||
    name.includes('slot')
  );
}

export function isInsideSlot(n: SceneNode, root?: SceneNode): boolean {
  let curr: BaseNode | null = n.parent;
  while (curr && curr !== root && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
    if (isSlotContainer(curr)) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

export function findDirectSlotContainers(root: BaseNode & ChildrenMixin): (FrameNode | any)[] {
  const result: any[] = [];
  function recurse(n: SceneNode) {
    if (n.type === 'INSTANCE') return;
    if (isSlotContainer(n)) {
      result.push(n);
      return; // Stop at topmost slot container
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

export function getInstanceFamilyKey(inst: InstanceNode): string {
  if (inst.mainComponent && inst.mainComponent.parent && inst.mainComponent.parent.type === 'COMPONENT_SET') {
    return `set:${inst.mainComponent.parent.name.trim().toLowerCase()}`;
  }
  if (inst.mainComponent) {
    const compName = inst.mainComponent.name.trim().toLowerCase();
    const baseName = compName.split(',')[0].split('=')[0].trim();
    if (baseName && baseName !== compName) {
      return `comp_base:${baseName}`;
    }
    return `comp:${compName}`;
  }
  return `name:${(inst.name || '').trim().toLowerCase()}`;
}

export function normalizeSlotLayoutMode(slotNode: any, parent?: any): 'HORIZONTAL' | 'VERTICAL' {
  if (slotNode && 'children' in slotNode && Array.isArray(slotNode.children) && slotNode.children.length >= 2) {
    const c0 = slotNode.children[0];
    const c1 = slotNode.children[1];
    if (c0 && c1 && typeof c0.x === 'number' && typeof c1.x === 'number') {
      const deltaY = Math.abs(c1.y - c0.y);
      const deltaX = Math.abs(c1.x - c0.x);
      if (deltaY > deltaX) return 'VERTICAL';
      if (deltaX > deltaY) return 'HORIZONTAL';
    }
  }
  if (parent && 'layoutMode' in parent) {
    if (parent.layoutMode === 'VERTICAL') return 'VERTICAL';
    if (parent.layoutMode === 'HORIZONTAL') return 'HORIZONTAL';
  }
  return 'HORIZONTAL';
}

export function sanitizeSlotFrame(slotNode: any, parent?: any): void {
  if (!slotNode || slotNode.removed) return;
  try {
    if ('layoutGrids' in slotNode && Array.isArray(slotNode.layoutGrids) && slotNode.layoutGrids.length > 0) {
      slotNode.layoutGrids = [];
    }
  } catch (_) {}
  try {
    if ('gridStyleId' in slotNode && slotNode.gridStyleId) {
      slotNode.gridStyleId = '';
    }
  } catch (_) {}

  try {
    const currentMode = 'layoutMode' in slotNode ? (slotNode.layoutMode as string) : 'NONE';
    if (currentMode === 'GRID' || currentMode === 'NONE') {
      const desiredMode = normalizeSlotLayoutMode(slotNode, parent);
      slotNode.layoutMode = desiredMode;
    }
  } catch (err) {
    console.warn('[sanitizeSlotFrame] Could not set layoutMode:', err);
    try { slotNode.layoutMode = 'HORIZONTAL'; } catch (_) {}
  }

  try {
    if ('layoutWrap' in slotNode && slotNode.layoutWrap === 'WRAP') {
      slotNode.layoutWrap = 'NO_WRAP';
    }
  } catch (_) {}
}

export function applySlotMetricsAndVariables(
  slotNode: FrameNode | any,
  parent: FrameNode | ComponentNode | any,
  preloadedVars?: Map<string, Variable>
): void {
  if (!slotNode || !('setBoundVariable' in slotNode)) return;

  sanitizeSlotFrame(slotNode, parent);

  // Clear fills and strokes
  try { slotNode.fills = []; } catch (_) {}
  try { slotNode.strokes = []; } catch (_) {}

  // Find varNone (constant/none, none, constant/zero)
  let varNone: Variable | undefined = undefined;
  if (preloadedVars) {
    for (const v of preloadedVars.values()) {
      if (!v || !v.name) continue;
      const lower = v.name.toLowerCase().trim();
      const norm = normalizeVarPath(v.name);
      if (
        norm === 'constant/none' ||
        norm === 'none' ||
        norm === 'constant/zero' ||
        lower === 'constant/none' ||
        lower === 'none' ||
        lower === 'constant/zero' ||
        lower.endsWith('/none') ||
        lower.endsWith('/zero')
      ) {
        varNone = v;
        break;
      }
    }
  }

  if (!varNone && figma.variables && typeof figma.variables.getLocalVariables === 'function') {
    try {
      const localVars = figma.variables.getLocalVariables('FLOAT');
      for (const v of localVars) {
        if (!v || !v.name) continue;
        const lower = v.name.toLowerCase().trim();
        const norm = normalizeVarPath(v.name);
        if (
          norm === 'constant/none' ||
          norm === 'none' ||
          norm === 'constant/zero' ||
          lower === 'constant/none' ||
          lower === 'none' ||
          lower === 'constant/zero' ||
          lower.endsWith('/none') ||
          lower.endsWith('/zero')
        ) {
          varNone = v;
          break;
        }
      }
    } catch (_) {}
  }

  if (varNone) {
    try {
      const scopes = (varNone as any).scopes || [];
      const neededScopes: VariableScope[] = ['GAP', 'CORNER_RADIUS'];
      let changed = false;
      const newScopes = [...scopes];
      for (const s of neededScopes) {
        if (!newScopes.includes(s) && !newScopes.includes('ALL_SCOPES' as any)) {
          newScopes.push(s);
          changed = true;
        }
      }
      if (changed) (varNone as any).scopes = newScopes;
    } catch (_) {}

    // Bind paddings (all 0)
    try { slotNode.setBoundVariable('paddingTop', varNone); } catch (_) {}
    try { slotNode.setBoundVariable('paddingBottom', varNone); } catch (_) {}
    try { slotNode.setBoundVariable('paddingLeft', varNone); } catch (_) {}
    try { slotNode.setBoundVariable('paddingRight', varNone); } catch (_) {}

    // Bind corner radius (all 0)
    try {
      slotNode.setBoundVariable('cornerRadius', varNone);
    } catch (_) {
      try { slotNode.setBoundVariable('topLeftRadius', varNone); } catch (_) {}
      try { slotNode.setBoundVariable('topRightRadius', varNone); } catch (_) {}
      try { slotNode.setBoundVariable('bottomLeftRadius', varNone); } catch (_) {}
      try { slotNode.setBoundVariable('bottomRightRadius', varNone); } catch (_) {}
    }
  }

  if ('cornerSmoothing' in slotNode) {
    try { slotNode.cornerSmoothing = 0.6; } catch (_) {}
  }

  // Handle itemSpacing / gap
  const slotBv = (slotNode as any).boundVariables;
  const isAlreadyBoundSpacing = Boolean(slotBv && (slotBv.itemSpacing || slotBv.counterAxisSpacing));

  if (!isAlreadyBoundSpacing) {
    let inheritedSpacingVar: Variable | undefined = undefined;
    const parentBv = parent ? (parent as any).boundVariables : null;
    if (parentBv && parentBv.itemSpacing && typeof parentBv.itemSpacing.id === 'string') {
      const pId = parentBv.itemSpacing.id;
      inheritedSpacingVar = (preloadedVars && preloadedVars.get(pId)) ||
        (figma.variables && typeof figma.variables.getVariableById === 'function' ? figma.variables.getVariableById(pId) : null) ||
        undefined;
    }

    if (inheritedSpacingVar) {
      try {
        if (!(inheritedSpacingVar as any).scopes.includes('GAP') && !(inheritedSpacingVar as any).scopes.includes('ALL_SCOPES')) {
          (inheritedSpacingVar as any).scopes = [...(inheritedSpacingVar as any).scopes, 'GAP'];
        }
      } catch (_) {}
      try { slotNode.setBoundVariable('itemSpacing', inheritedSpacingVar); } catch (_) {}
      try { slotNode.setBoundVariable('counterAxisSpacing', inheritedSpacingVar); } catch (_) {}
    } else if (slotNode.itemSpacing === 0 && varNone) {
      try { slotNode.setBoundVariable('itemSpacing', varNone); } catch (_) {}
      try { slotNode.setBoundVariable('counterAxisSpacing', varNone); } catch (_) {}
    } else if (slotNode.itemSpacing > 0 && preloadedVars) {
      let matchedSpacingVar: Variable | undefined = undefined;
      if (slotNode.itemSpacing === 12) {
        for (const v of preloadedVars.values()) {
          const norm = normalizeVarPath(v.name || '');
          if (norm === 'layout/base' || norm.endsWith('/layout/base')) {
            matchedSpacingVar = v;
            break;
          }
        }
      }
      if (!matchedSpacingVar) {
        for (const v of preloadedVars.values()) {
          if (v && v.resolvedType === 'FLOAT' && v.valuesByMode) {
            const vals = Object.values(v.valuesByMode);
            if (vals.includes(slotNode.itemSpacing)) {
              const lower = (v.name || '').toLowerCase();
              if (lower.includes('layout') || lower.includes('gap') || lower.includes('spacing')) {
                matchedSpacingVar = v;
                break;
              }
            }
          }
        }
      }
      if (matchedSpacingVar) {
        try {
          if (!(matchedSpacingVar as any).scopes.includes('GAP') && !(matchedSpacingVar as any).scopes.includes('ALL_SCOPES')) {
            (matchedSpacingVar as any).scopes = [...(matchedSpacingVar as any).scopes, 'GAP'];
          }
        } catch (_) {}
        try { slotNode.setBoundVariable('itemSpacing', matchedSpacingVar); } catch (_) {}
        try { slotNode.setBoundVariable('counterAxisSpacing', matchedSpacingVar); } catch (_) {}
      }
    }
  }
}

export function hasVisibleFillsOrStrokes(node: BaseNode): boolean {
  if ('fills' in node && Array.isArray((node as any).fills)) {
    if ((node as any).fills.some((f: Paint) => f && f.visible !== false && (typeof f.opacity !== 'number' || f.opacity > 0))) {
      return true;
    }
  }
  if ('strokes' in node && Array.isArray((node as any).strokes)) {
    if ((node as any).strokes.some((s: Paint) => s && s.visible !== false && (typeof s.opacity !== 'number' || s.opacity > 0))) {
      return true;
    }
  }
  if ('effects' in node && Array.isArray((node as any).effects)) {
    if ((node as any).effects.some((e: Effect) => e && e.visible !== false)) {
      return true;
    }
  }
  return false;
}

export function isRedundantSlotWrapper(node: BaseNode | null, root?: BaseNode): boolean {
  if (!node || (node as any).removed) return false;
  if (root && node === root) return false;
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  if (isSlotContainer(node)) return false;
  const parent = node.parent;
  if (!parent || !('insertChild' in parent) || parent.type === 'PAGE' || parent.type === 'COMPONENT_SET') {
    return false;
  }
  if (!('children' in node) || !Array.isArray(node.children) || node.children.length !== 1) {
    return false;
  }
  if (!isSlotContainer(node.children[0])) {
    return false;
  }
  if (hasVisibleFillsOrStrokes(node)) {
    return false;
  }
  return true;
}

export function unwrapRedundantSlotWrappers(
  root: BaseNode,
  preloadedVars?: Map<string, Variable>
): number {
  let unwrappedCount = 0;
  if (!root || !('children' in root)) return 0;

  const slots = findDirectSlotContainers(root as BaseNode & ChildrenMixin);
  for (const slotNode of slots) {
    while (slotNode && !slotNode.removed && isRedundantSlotWrapper(slotNode.parent, root)) {
      const wrapper = slotNode.parent as FrameNode | GroupNode;
      const grandParent = wrapper.parent as BaseNode & ChildrenMixin;
      if (!grandParent || !('insertChild' in grandParent)) break;

      const wrapperIndex = grandParent.children.indexOf(wrapper);
      if (wrapperIndex === -1) break;

      const wrapperLayoutMode = 'layoutMode' in wrapper ? wrapper.layoutMode : 'NONE';
      const wrapperItemSpacing = 'itemSpacing' in wrapper && typeof wrapper.itemSpacing === 'number' ? wrapper.itemSpacing : 0;
      const wrapperPrimaryAlign = 'primaryAxisAlignItems' in wrapper ? wrapper.primaryAxisAlignItems : undefined;
      const wrapperCounterAlign = 'counterAxisAlignItems' in wrapper ? wrapper.counterAxisAlignItems : undefined;
      const wrapperSizingH = 'layoutSizingHorizontal' in wrapper ? (wrapper as any).layoutSizingHorizontal : undefined;
      const wrapperSizingV = 'layoutSizingVertical' in wrapper ? (wrapper as any).layoutSizingVertical : undefined;
      const wrapperLayoutAlign = 'layoutAlign' in wrapper ? (wrapper as any).layoutAlign : undefined;
      const wrapperLayoutGrow = 'layoutGrow' in wrapper ? (wrapper as any).layoutGrow : undefined;

      if (wrapperLayoutMode === 'HORIZONTAL' || wrapperLayoutMode === 'VERTICAL') {
        try { slotNode.layoutMode = wrapperLayoutMode; } catch (_) {}
      }
      if (wrapperItemSpacing > 0 && (!('itemSpacing' in slotNode) || slotNode.itemSpacing === 0)) {
        try { slotNode.itemSpacing = wrapperItemSpacing; } catch (_) {}
      }
      if (wrapperPrimaryAlign) {
        try { slotNode.primaryAxisAlignItems = wrapperPrimaryAlign; } catch (_) {}
      }
      if (wrapperCounterAlign) {
        try { slotNode.counterAxisAlignItems = wrapperCounterAlign; } catch (_) {}
      }

      // Inherit bound spacing variable from wrapper before removing wrapper
      applySlotMetricsAndVariables(slotNode, wrapper, preloadedVars);

      grandParent.insertChild(wrapperIndex, slotNode);

      try {
        if (wrapperSizingH) {
          slotNode.layoutSizingHorizontal = wrapperSizingH === 'FIXED' ? 'HUG' : wrapperSizingH;
        }
      } catch (_) {}
      try {
        if (wrapperSizingV) {
          slotNode.layoutSizingVertical = wrapperSizingV === 'FIXED' ? 'HUG' : wrapperSizingV;
        } else if (slotNode.layoutMode === 'HORIZONTAL' && 'layoutMode' in grandParent && (grandParent as any).layoutMode === 'VERTICAL') {
          slotNode.layoutSizingVertical = 'HUG';
        }
      } catch (_) {}
      try {
        if (wrapperLayoutAlign) (slotNode as any).layoutAlign = wrapperLayoutAlign;
      } catch (_) {}
      try {
        if (wrapperLayoutGrow !== undefined) (slotNode as any).layoutGrow = wrapperLayoutGrow;
      } catch (_) {}

      try {
        wrapper.remove();
        unwrappedCount++;
      } catch (_) {
        break;
      }
    }
  }

  return unwrappedCount;
}

export function consolidateRepeatingInstancesIntoSlot(
  root: ComponentNode | FrameNode,
  preloadedVars?: Map<string, Variable>
): (FrameNode | any)[] {
  const slotFrames: any[] = [];
  const candidateParents: (FrameNode | ComponentNode)[] = [];

  // 0. Unwrap any existing redundant wrapper groups/frames (e.g. ItemGroup > Slot) first
  unwrapRedundantSlotWrappers(root, preloadedVars);

  const inspectNode = (n: SceneNode) => {
    if (n.type === 'INSTANCE') return;
    if (isSlotContainer(n)) return; // Stop at Slot boundary
    if (n.type === 'FRAME' || n.type === 'COMPONENT' || (n as any).type === 'SLOT') {
      const frame = n as FrameNode | ComponentNode;
      if ('children' in frame && Array.isArray(frame.children)) {
        candidateParents.push(frame);
        for (const ch of frame.children) {
          inspectNode(ch);
        }
      }
    }
  };
  inspectNode(root);

  for (const parent of candidateParents) {
    if ((parent as any).removed || !parent.parent) continue;
    if (isSlotContainer(parent) || isInsideSlot(parent, root)) {
      if (isSlotContainer(parent)) {
        applySlotMetricsAndVariables(parent, parent.parent, preloadedVars);
        if ('children' in parent && Array.isArray((parent as any).children)) {
          for (const ch of (parent as any).children) {
            if ('componentPropertyReferences' in ch) {
              try { (ch as any).componentPropertyReferences = {}; } catch (_) {}
            }
          }
        }
        if (!slotFrames.includes(parent)) {
          slotFrames.push(parent);
        }
      }
      continue;
    }

    // Check existing slot containers in parent
    const existingSlots = ((parent as any).children || []).filter(
      (c: SceneNode) => isSlotContainer(c) && (c.type === 'FRAME' || (c as any).type === 'SLOT')
    ) as FrameNode[];
    const hasLooseInstances = ((parent as any).children || []).some(
      (c: SceneNode) => c.type === 'INSTANCE' && !isSlotContainer(c)
    );

    let preservedSlotLayoutMode: 'HORIZONTAL' | 'VERTICAL' | null = null;
    let preservedSlotSpacing: number | null = null;

    if (existingSlots.length > 0) {
      if (hasLooseInstances) {
        // Unpack incomplete slot containers so loose sibling instances can be regrouped cleanly, preserving slot orientation
        for (const oldSlot of existingSlots) {
          if (!preservedSlotLayoutMode && 'layoutMode' in oldSlot && (oldSlot.layoutMode === 'HORIZONTAL' || oldSlot.layoutMode === 'VERTICAL')) {
            preservedSlotLayoutMode = oldSlot.layoutMode;
          }
          if (preservedSlotSpacing === null && 'itemSpacing' in oldSlot && typeof oldSlot.itemSpacing === 'number') {
            preservedSlotSpacing = oldSlot.itemSpacing;
          }
          if ('children' in oldSlot && Array.isArray(oldSlot.children)) {
            const slotChildren = [...oldSlot.children];
            const oldIndex = parent.children.indexOf(oldSlot);
            for (let i = 0; i < slotChildren.length; i++) {
              parent.insertChild(oldIndex + i, slotChildren[i]);
            }
          }
          try { oldSlot.remove(); } catch (_) {}
        }
      } else {
        // No loose instances outside existing slot(s): keep native SLOTs intact; if any is a plain FRAME named Slot, upgrade or sanitize in place
        let owningComp: ComponentNode | null = null;
        let currNode: BaseNode | null = parent;
        while (currNode && currNode.type !== 'PAGE' && currNode.type !== 'DOCUMENT') {
          if (currNode.type === 'COMPONENT') {
            owningComp = currNode as ComponentNode;
            break;
          }
          currNode = currNode.parent;
        }

        for (const oldSlot of existingSlots) {
          if ((oldSlot as any).type === 'SLOT') {
            applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
            if ('children' in oldSlot && Array.isArray(oldSlot.children)) {
              for (const ch of oldSlot.children) {
                if ('componentPropertyReferences' in ch) {
                  try { (ch as any).componentPropertyReferences = {}; } catch (_) {}
                }
              }
            }
            if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
          } else if (oldSlot.type === 'FRAME' && owningComp && typeof (owningComp as any).createSlot === 'function') {
            try {
              const compMode = 'layoutMode' in owningComp ? (owningComp as any).layoutMode : 'NONE';
              if (compMode !== 'GRID') {
                const upgradedSlot = (owningComp as any).createSlot();
                upgradedSlot.name = 'Slot';
                const oldIdx = parent.children.indexOf(oldSlot);
                const oldMode = oldSlot.layoutMode === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
                const oldSpacing = oldSlot.itemSpacing || 0;
                const oldSizingH = (oldSlot as any).layoutSizingHorizontal;
                const oldSizingV = (oldSlot as any).layoutSizingVertical;
                try { upgradedSlot.layoutMode = oldMode; } catch (_) {}
                sanitizeSlotFrame(upgradedSlot, parent);
                upgradedSlot.itemSpacing = oldSpacing;
                try { upgradedSlot.primaryAxisAlignItems = oldSlot.primaryAxisAlignItems; } catch (_) {}
                try { upgradedSlot.counterAxisAlignItems = oldSlot.counterAxisAlignItems; } catch (_) {}
                upgradedSlot.paddingLeft = 0;
                upgradedSlot.paddingRight = 0;
                upgradedSlot.paddingTop = 0;
                upgradedSlot.paddingBottom = 0;
                parent.insertChild(oldIdx, upgradedSlot);
                try { if (oldSizingH) upgradedSlot.layoutSizingHorizontal = oldSizingH; } catch (_) {}
                try { if (oldSizingV) upgradedSlot.layoutSizingVertical = oldSizingV; } catch (_) {}
                const slotChildren = [...oldSlot.children];
                for (const ch of slotChildren) {
                  upgradedSlot.appendChild(ch);
                  if ('componentPropertyReferences' in ch) {
                    try { (ch as any).componentPropertyReferences = {}; } catch (_) {}
                  }
                }
                applySlotMetricsAndVariables(upgradedSlot, oldSlot, preloadedVars);
                try { oldSlot.remove(); } catch (_) {}
                if (!slotFrames.includes(upgradedSlot)) slotFrames.push(upgradedSlot);
                continue;
              }
            } catch (_) {}
            applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
            if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
          } else {
            applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
            if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
          }
        }
      }
    }

    const children = ((parent as any).children || []) as SceneNode[];
    if (children.length < 2) continue;

    let currentRun: InstanceNode[] = [];
    let currentCompKey: string | null = null;
    const instanceRuns: InstanceNode[][] = [];

    for (const child of children) {
      if (child.type === 'INSTANCE') {
        const inst = child as InstanceNode;
        const compKey = getInstanceFamilyKey(inst);
        if (currentCompKey && compKey === currentCompKey) {
          currentRun.push(inst);
        } else {
          if (currentRun.length >= 2) {
            instanceRuns.push([...currentRun]);
          }
          currentRun = [inst];
          currentCompKey = compKey;
        }
      } else {
        if (currentRun.length >= 2) {
          instanceRuns.push([...currentRun]);
        }
        currentRun = [];
        currentCompKey = null;
      }
    }
    if (currentRun.length >= 2) {
      instanceRuns.push([...currentRun]);
    }

    if (instanceRuns.length === 0) continue;

    // Find the nearest ComponentNode host to invoke createSlot() on
    let owningComponent: ComponentNode | null = null;
    if (parent.type === 'COMPONENT') {
      owningComponent = parent as ComponentNode;
    } else {
      let curr: BaseNode | null = parent;
      while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
        if (curr.type === 'COMPONENT') {
          owningComponent = curr as ComponentNode;
          break;
        }
        curr = curr.parent;
      }
    }

    for (const run of instanceRuns) {
      let slotNode: any = null;

      // Check if a sibling variant in the same ComponentSet already has a slot container to clone from
      if (owningComponent && owningComponent.parent && owningComponent.parent.type === 'COMPONENT_SET') {
        const compSet = owningComponent.parent as ComponentSetNode;
        for (const sibling of compSet.children) {
          if (sibling !== owningComponent && sibling.type === 'COMPONENT') {
            const siblingSlots = findDirectSlotContainers(sibling);
            if (siblingSlots.length > 0) {
              const existingSiblingSlot = siblingSlots[0];
              if (existingSiblingSlot && typeof (existingSiblingSlot as any).clone === 'function') {
                try {
                  slotNode = existingSiblingSlot.clone();
                  while (slotNode.children.length > 0) {
                    slotNode.children[0].remove();
                  }
                } catch (cloneErr) {
                  slotNode = null;
                }
              }
              if (slotNode) break;
            }
          }
        }
      }

      if (!slotNode && owningComponent && typeof (owningComponent as any).createSlot === 'function') {
        try {
          const compMode = 'layoutMode' in owningComponent ? (owningComponent as any).layoutMode : 'NONE';
          if (compMode !== 'GRID') {
            slotNode = (owningComponent as any).createSlot();
          }
        } catch (err) {
          console.warn('[AutoProps] owningComponent.createSlot() error:', err);
          slotNode = null;
        }
      }
      if (!slotNode) {
        slotNode = figma.createFrame();
      }

      slotNode.name = 'Slot';
      try { slotNode.fills = []; } catch (_) {}
      try { slotNode.strokes = []; } catch (_) {}

      let effectiveLayoutMode: 'HORIZONTAL' | 'VERTICAL' = 'HORIZONTAL';
      if (preservedSlotLayoutMode) {
        effectiveLayoutMode = preservedSlotLayoutMode;
      } else if ('layoutMode' in parent && (parent.layoutMode === 'HORIZONTAL' || parent.layoutMode === 'VERTICAL') && run.length === children.length) {
        effectiveLayoutMode = parent.layoutMode;
      } else if (run.length >= 2) {
        const deltaY = Math.abs(run[1].y - run[0].y);
        const deltaX = Math.abs(run[1].x - run[0].x);
        effectiveLayoutMode = deltaY > deltaX ? 'VERTICAL' : 'HORIZONTAL';
      } else if ('layoutMode' in parent && parent.layoutMode === 'VERTICAL') {
        effectiveLayoutMode = 'VERTICAL';
      } else if ('layoutMode' in parent && parent.layoutMode === 'HORIZONTAL') {
        effectiveLayoutMode = 'HORIZONTAL';
      }

      try {
        slotNode.layoutMode = effectiveLayoutMode;
      } catch (layoutErr) {
        console.warn('[AutoProps] slotNode.layoutMode error:', layoutErr);
        try { slotNode.layoutMode = 'HORIZONTAL'; } catch (_) {}
      }
      sanitizeSlotFrame(slotNode, parent);
      if (preservedSlotSpacing !== null) {
        slotNode.itemSpacing = preservedSlotSpacing;
      } else if ('itemSpacing' in parent && typeof parent.itemSpacing === 'number') {
        slotNode.itemSpacing = parent.itemSpacing;
      } else {
        slotNode.itemSpacing = 0;
      }
      try { slotNode.primaryAxisAlignItems = parent.primaryAxisAlignItems; } catch (_) {}
      try { slotNode.counterAxisAlignItems = parent.counterAxisAlignItems; } catch (_) {}
      try { slotNode.layoutWrap = 'NO_WRAP'; } catch (_) {}
      slotNode.paddingLeft = 0;
      slotNode.paddingRight = 0;
      slotNode.paddingTop = 0;
      slotNode.paddingBottom = 0;
      slotNode.x = run[0].x;
      slotNode.y = run[0].y;

      const firstIndex = parent.children.indexOf(run[0]);
      parent.insertChild(firstIndex, slotNode);

      try {
        if (effectiveLayoutMode === 'HORIZONTAL') {
          if ((parent as any).layoutSizingHorizontal === 'HUG') {
            slotNode.layoutSizingHorizontal = 'HUG';
          } else {
            slotNode.layoutSizingHorizontal = 'FILL';
          }
          try { slotNode.layoutSizingVertical = 'FILL'; } catch (_) { slotNode.layoutSizingVertical = 'HUG'; }
        } else {
          slotNode.layoutSizingHorizontal = 'FILL';
          try { slotNode.layoutSizingVertical = 'HUG'; } catch (_) {}
        }
      } catch (e) {
        try { (slotNode as any).layoutAlign = 'STRETCH'; } catch (e2) {}
      }

      for (const inst of run) {
        slotNode.appendChild(inst);
        try {
          inst.componentPropertyReferences = {};
        } catch (_) {}
        if (effectiveLayoutMode === 'VERTICAL') {
          try {
            inst.layoutSizingHorizontal = 'FILL';
          } catch (e) {}
        }
      }

      applySlotMetricsAndVariables(slotNode, parent, preloadedVars);

      if (!slotFrames.includes(slotNode)) slotFrames.push(slotNode);
    }
  }

  // Final pass: if any parent frame (like ItemGroup) now wraps ONLY a Slot and nothing else, unwrap it so Slot stands on its own!
  unwrapRedundantSlotWrappers(root, preloadedVars);

  return slotFrames;
}

