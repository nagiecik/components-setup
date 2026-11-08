import { compareVisualSortScore } from '../utils/sorting';
import { sendSelectionToUI } from '../retextifier/retextifier';

export function reorderComponentSetVariants(compSet: ComponentSetNode): void {
  const variants = compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
  if (variants.length === 0) return;

  const keyValuesMap = new Map<string, Set<string>>();
  const keyOrder: string[] = [];

  for (const v of variants) {
    const rawPairs = v.name.split(',').map(s => s.trim()).filter(Boolean);
    for (const pair of rawPairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = pair.slice(0, eqIdx).trim();
        const val = pair.slice(eqIdx + 1).trim();
        if (!keyValuesMap.has(key)) {
          keyValuesMap.set(key, new Set<string>());
          keyOrder.push(key);
        }
        keyValuesMap.get(key)!.add(val);
      }
    }
  }

  if (keyOrder.length <= 1) return;

  const isBoolValue = (v: string) => /^(true|false|yes|no|on|off)$/i.test(v.trim());
  const group1Keys: string[] = [];
  const group2Keys: string[] = [];

  for (const key of keyOrder) {
    const values = keyValuesMap.get(key);
    if (!values || values.size === 0) {
      group1Keys.push(key);
      continue;
    }
    const allBool = Array.from(values).every(v => isBoolValue(v));
    if (allBool) {
      group2Keys.push(key);
    } else {
      group1Keys.push(key);
    }
  }

  const targetKeyOrder = [...group1Keys, ...group2Keys];

  for (const v of variants) {
    const rawPairs = v.name.split(',').map(s => s.trim()).filter(Boolean);
    const pairMap = new Map<string, string>();
    for (const pair of rawPairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = pair.slice(0, eqIdx).trim();
        const val = pair.slice(eqIdx + 1).trim();
        pairMap.set(key, val);
      }
    }

    const reorderedPairs: string[] = [];
    for (const key of targetKeyOrder) {
      if (pairMap.has(key)) {
        reorderedPairs.push(`${key}=${pairMap.get(key)}`);
      }
    }
    for (const [k, val] of pairMap.entries()) {
      if (!targetKeyOrder.includes(k)) {
        reorderedPairs.push(`${k}=${val}`);
      }
    }

    const newName = reorderedPairs.join(', ');
    if (newName && newName !== v.name) {
      v.name = newName;
    }
  }
}


export async function organizeElementsOnCanvas(forceAll: boolean = false) {
  const selection = figma.currentPage.selection;
  let nodes: SceneNode[] = [];

  if (!forceAll && selection.length > 1) {
    nodes = Array.from(selection);
  } else {
    // Top-level children on the current page
    nodes = figma.currentPage.children.filter(
      (n): n is SceneNode => !n.locked && 'x' in n && 'y' in n && 'width' in n && 'height' in n
    );
  }

  if (nodes.length === 0) {
    figma.notify('No elements found to arrange on canvas.', { error: true });
    return;
  }

  // Find start anchor position (minX, minY)
  let startX = Math.min(...nodes.map((n) => n.x));
  let startY = Math.min(...nodes.map((n) => n.y));
  if (!isFinite(startX)) startX = 0;
  if (!isFinite(startY)) startY = 0;

  // Group elements by primary name segment before the first slash ('/')
  const groupsMap = new Map<string, { displayKey: string; items: SceneNode[] }>();

  for (const node of nodes) {
    const rawName = (node.name || '').trim();
    const slashIndex = rawName.indexOf('/');
    const groupName = slashIndex !== -1 ? rawName.substring(0, slashIndex).trim() : rawName;
    const normalizedKey = groupName.toLowerCase();

    if (!groupsMap.has(normalizedKey)) {
      groupsMap.set(normalizedKey, { displayKey: groupName, items: [] });
    }
    groupsMap.get(normalizedKey)!.items.push(node);
  }

  // Sort groups alphabetically by group name
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) =>
    a.displayKey.localeCompare(b.displayKey, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Sort items within each group alphabetically by full name
  for (const grp of sortedGroups) {
    grp.items.sort((a, b) =>
      (a.name || '').localeCompare((b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  const GAP_X = 272;
  const GAP_Y = 272;

  let currentX = startX;

  for (const grp of sortedGroups) {
    const columnWidth = Math.max(...grp.items.map((n) => n.width || 0), 0);
    let currentY = startY;

    for (const item of grp.items) {
      try {
        item.x = currentX;
        item.y = currentY;
      } catch (err) {
        console.warn(`Could not set position for "${item.name}":`, err);
      }
      currentY += (item.height || 0) + GAP_Y;
    }

    currentX += columnWidth + GAP_X;
  }

  // Zoom/scroll viewport to show all arranged nodes
  figma.viewport.scrollAndZoomIntoView(nodes);

  // Collapse all container layers in the Layers panel (equivalent to Alt + L)
  function collapseContainers(node: BaseNode) {
    if ('expanded' in node) {
      try {
        (node as any).expanded = false;
      } catch (err) {}
    }
    if ('children' in node && Array.isArray((node as any).children)) {
      for (const child of (node as any).children) {
        collapseContainers(child);
      }
    }
  }

  collapseContainers(figma.currentPage);

  // Deselect all elements on canvas
  figma.currentPage.selection = [];
  await sendSelectionToUI();

  figma.notify(`Arranged ${nodes.length} element${nodes.length > 1 ? 's' : ''} in ${sortedGroups.length} column group${sortedGroups.length > 1 ? 's' : ''} & collapsed layers! 📐`);
}

export function isLibraryComponentsPage(page: PageNode = figma.currentPage): boolean {
  const TARGET_PAGE_NAME = '    🔷 Components';
  if (page.name === TARGET_PAGE_NAME) return true;
  const clean = page.name.trim().toLowerCase();
  if (clean === '🔷 components' || clean === '🔷components' || clean === 'components' || clean === 'component') {
    return true;
  }
  return clean.includes('🔷') && clean.includes('component');
}

export function getOrCreateTargetPage(pageType: 'components' | 'screens' = 'components'): PageNode {
  const isScreens = pageType === 'screens';
  const TARGET_PAGE_NAME = isScreens ? '    🔷 screens' : '    🔷 Components';

  // 1. Exact match (including leading spaces)
  let targetPage = figma.root.children.find((p) => p.name === TARGET_PAGE_NAME);

  // 2. Trimmed match: "🔷 screens" / "🔷 components" (case-insensitive)
  if (!targetPage) {
    const targetTrimmed = isScreens ? '🔷 screens' : '🔷 components';
    const targetNoSpace = isScreens ? '🔷screens' : '🔷components';
    targetPage = figma.root.children.find((p) => {
      const clean = p.name.trim().toLowerCase();
      return clean === targetTrimmed || clean === targetNoSpace;
    });
  }

  // 3. Page containing both "🔷" and ("screen" or "component")
  if (!targetPage) {
    const keyword = isScreens ? 'screen' : 'component';
    targetPage = figma.root.children.find((p) => {
      const lower = p.name.toLowerCase();
      return lower.includes('🔷') && lower.includes(keyword);
    });
  }

  // 4. Exact trimmed "screens" / "screen" / "components" / "component" (case-insensitive)
  if (!targetPage) {
    targetPage = figma.root.children.find((p) => {
      const clean = p.name.trim().toLowerCase();
      return isScreens
        ? (clean === 'screens' || clean === 'screen')
        : (clean === 'components' || clean === 'component');
    });
  }

  // 5. Create new page if not found
  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = TARGET_PAGE_NAME;
  } else if (targetPage.name !== TARGET_PAGE_NAME) {
    targetPage.name = TARGET_PAGE_NAME;
  }

  return targetPage;
}

export async function moveSelectedToComponentsPage() {
  if (typeof figma.loadAllPagesAsync === 'function') {
    await figma.loadAllPagesAsync();
  }

  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    figma.notify('Please select a Component or Component Set to move.', { error: true });
    return;
  }

  // Find all target nodes to move:
  // - If variant of a ComponentSet or inside a ComponentSet, move the parent ComponentSet
  // - If standalone Component or inside a Component, move that Component
  // - Otherwise, move the selected node itself (never climb to enclosing layout frames)
  const nodesToMove = new Set<SceneNode>();

  for (const node of selection) {
    let curr: BaseNode | null = node;
    let enclosingCompSet: ComponentSetNode | null = null;
    let enclosingComp: ComponentNode | null = null;

    while (curr && curr.type !== 'PAGE') {
      if (curr.type === 'COMPONENT_SET') {
        enclosingCompSet = curr as ComponentSetNode;
        break;
      }
      if (curr.type === 'COMPONENT' && !enclosingComp) {
        enclosingComp = curr as ComponentNode;
      }
      curr = curr.parent;
    }

    if (enclosingCompSet) {
      nodesToMove.add(enclosingCompSet);
    } else if (enclosingComp) {
      nodesToMove.add(enclosingComp);
    } else {
      nodesToMove.add(node as SceneNode);
    }
  }

  if (nodesToMove.size === 0) {
    figma.notify('No element found in selection to move.', { error: true });
    return;
  }

  // Target page is always the components page ("    🔷 Components")
  const componentsTargetPage = getOrCreateTargetPage('components');

  const nodesToTransfer: SceneNode[] = [];

  for (const node of nodesToMove) {
    // Check if node is already on this target page
    let nodePage: BaseNode | null = node;
    while (nodePage && nodePage.type !== 'PAGE') {
      nodePage = nodePage.parent;
    }

    if (nodePage && nodePage.id === componentsTargetPage.id) {
      // Already on target page
      continue;
    }

    nodesToTransfer.push(node);
  }

  if (nodesToTransfer.length === 0) {
    figma.notify('Selected element(s) are already on the components page! ℹ️');
    figma.currentPage = componentsTargetPage;
    await organizeElementsOnCanvas(true);
    return;
  }

  // 1. Leave instances in the original place of components before moving
  for (const nodeToMove of nodesToTransfer) {
    if (nodeToMove.type === 'COMPONENT' || nodeToMove.type === 'COMPONENT_SET') {
      try {
        const originalParent = nodeToMove.parent;
        if (originalParent && 'children' in originalParent) {
          const originalIndex = originalParent.children.indexOf(nodeToMove);
          const originalX = nodeToMove.x;
          const originalY = nodeToMove.y;
          const originalWidth = nodeToMove.width;
          const originalHeight = nodeToMove.height;
          const originalName = nodeToMove.name;

          let instance: InstanceNode | null = null;
          if (nodeToMove.type === 'COMPONENT') {
            instance = (nodeToMove as ComponentNode).createInstance();
          } else if (nodeToMove.type === 'COMPONENT_SET') {
            const compSet = nodeToMove as ComponentSetNode;
            const comp = compSet.defaultVariant || (compSet.children.find((c) => c.type === 'COMPONENT') as ComponentNode);
            if (comp) {
              instance = comp.createInstance();
            }
          }

          if (instance) {
            if ('insertChild' in originalParent && originalIndex !== -1) {
              originalParent.insertChild(originalIndex, instance);
            } else if ('appendChild' in originalParent) {
              (originalParent as any).appendChild(instance);
            }

            instance.x = originalX;
            instance.y = originalY;
            try {
              instance.resize(originalWidth, originalHeight);
            } catch (e) {}

            if ('layoutPositioning' in nodeToMove && 'layoutPositioning' in instance) {
              try { (instance as any).layoutPositioning = (nodeToMove as any).layoutPositioning; } catch (e) {}
            }
            if ('layoutAlign' in nodeToMove && 'layoutAlign' in instance) {
              try { (instance as any).layoutAlign = (nodeToMove as any).layoutAlign; } catch (e) {}
            }
            if ('layoutGrow' in nodeToMove && 'layoutGrow' in instance) {
              try { (instance as any).layoutGrow = (nodeToMove as any).layoutGrow; } catch (e) {}
            }
            if ('constraints' in nodeToMove && 'constraints' in instance) {
              try { (instance as any).constraints = (nodeToMove as any).constraints; } catch (e) {}
            }
            if ('rotation' in nodeToMove && 'rotation' in instance) {
              try { (instance as any).rotation = (nodeToMove as any).rotation; } catch (e) {}
            }
            if ('opacity' in nodeToMove && 'opacity' in instance) {
              try { (instance as any).opacity = (nodeToMove as any).opacity; } catch (e) {}
            }
            if ('visible' in nodeToMove && 'visible' in instance) {
              try { (instance as any).visible = (nodeToMove as any).visible; } catch (e) {}
            }
            instance.name = originalName;
          }
        }
      } catch (instErr) {
        console.warn(`Could not leave instance for "${nodeToMove.name}":`, instErr);
      }
    }
  }

  // 2. Move components to target page
  figma.currentPage = componentsTargetPage;
  let totalMoved = 0;
  const allSuccessfullyMoved: SceneNode[] = [];

  for (const nodeToMove of nodesToTransfer) {
    try {
      componentsTargetPage.appendChild(nodeToMove);
      totalMoved++;
      allSuccessfullyMoved.push(nodeToMove);
    } catch (err: any) {
      console.error(`Could not move "${nodeToMove.name}" to "${componentsTargetPage.name}":`, err);
      figma.notify(`Could not move "${nodeToMove.name}": ${err.message || err}`, { error: true });
    }
  }

  // Organize elements in tidy grid on the target page
  await organizeElementsOnCanvas(true);

  const selectionOnPage = allSuccessfullyMoved.filter(
    (n) => n.parent && (n.parent as any).id === componentsTargetPage.id
  );
  if (selectionOnPage.length > 0) {
    figma.currentPage.selection = selectionOnPage;
    figma.viewport.scrollAndZoomIntoView(selectionOnPage);
  }
  await sendSelectionToUI();
  figma.notify(`Moved ${totalMoved} element${totalMoved > 1 ? 's' : ''} to "    🔷 Components" & arranged grid! 🚀📐`);
}

// ============================================================================
// COMPONENT GENERATOR ENGINE & PRESETS
// ============================================================================

