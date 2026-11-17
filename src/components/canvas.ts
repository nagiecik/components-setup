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


export type OrganizeLayoutMode = 'columns' | 'rows';

const ORGANIZE_LAYOUT_STORAGE_KEY = 'organize_layout_mode';

export async function getOrganizeLayoutMode(): Promise<OrganizeLayoutMode> {
  try {
    const saved = await figma.clientStorage.getAsync(ORGANIZE_LAYOUT_STORAGE_KEY);
    if (saved === 'rows' || saved === 'columns') {
      return saved;
    }
  } catch (e) {}
  return 'columns';
}

export async function setOrganizeLayoutMode(mode: OrganizeLayoutMode): Promise<void> {
  try {
    await figma.clientStorage.setAsync(ORGANIZE_LAYOUT_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Failed to save organize layout mode:', e);
  }
}

export async function organizeElementsOnCanvas(
  forceAll: boolean = false,
  targetPage: PageNode = figma.currentPage,
  layoutMode?: OrganizeLayoutMode
) {
  const resolvedLayoutMode: OrganizeLayoutMode = layoutMode || (await getOrganizeLayoutMode());
  const isCurrentPage = targetPage.id === figma.currentPage.id;
  const selection = figma.currentPage.selection;
  let nodes: SceneNode[] = [];

  if (isCurrentPage && !forceAll && selection.length > 1) {
    nodes = Array.from(selection);
  } else {
    // Top-level children on the target page
    nodes = targetPage.children.filter(
      (n): n is SceneNode => !n.locked && 'x' in n && 'y' in n && 'width' in n && 'height' in n
    );
  }

  if (nodes.length === 0) {
    if (isCurrentPage) {
      figma.notify('No elements found to arrange on canvas.', { error: true });
    }
    return;
  }

  // Move any Screen components/component sets on non-Screens pages to "    🔷 Screens" in the background
  const movedScreenNodes: SceneNode[] = [];
  if (!isLibraryScreensPage(targetPage)) {
    const screenNodes = nodes.filter(isScreenLibraryNode);
    if (screenNodes.length > 0) {
      if (typeof figma.loadAllPagesAsync === 'function') {
        await figma.loadAllPagesAsync();
      }
      const screensPage = getOrCreateTargetPage('screens');
      if (typeof screensPage.loadAsync === 'function') {
        await screensPage.loadAsync();
      }

      for (const screenNode of screenNodes) {
        try {
          screensPage.appendChild(screenNode);
          movedScreenNodes.push(screenNode);
        } catch (err) {
          console.warn(`Could not move "${screenNode.name}" to "${screensPage.name}":`, err);
        }
      }

      if (movedScreenNodes.length > 0) {
        const movedSet = new Set(movedScreenNodes);
        nodes = nodes.filter((n) => !movedSet.has(n));
        await organizeElementsOnCanvas(true, screensPage, resolvedLayoutMode);
      }
    }
  }

  if (nodes.length === 0) {
    if (isCurrentPage) {
      figma.currentPage.selection = [];
      await sendSelectionToUI();
      if (movedScreenNodes.length > 0) {
        figma.notify(
          `Moved ${movedScreenNodes.length} Screen component${movedScreenNodes.length > 1 ? 's' : ''} in background to "    🔷 Screens" & arranged! 📐`
        );
      } else {
        figma.notify('No elements found to arrange on canvas.', { error: true });
      }
    }
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

  if (resolvedLayoutMode === 'rows') {
    let currentY = startY;

    for (const grp of sortedGroups) {
      const rowHeight = Math.max(...grp.items.map((n) => n.height || 0), 0);
      let currentX = startX;

      for (const item of grp.items) {
        try {
          item.x = currentX;
          item.y = currentY;
        } catch (err) {
          console.warn(`Could not set position for "${item.name}":`, err);
        }
        currentX += (item.width || 0) + GAP_X;
      }

      currentY += rowHeight + GAP_Y;
    }
  } else {
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
  }

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

  collapseContainers(targetPage);

  if (!isCurrentPage) {
    return;
  }

  // Zoom/scroll viewport to show all arranged nodes
  figma.viewport.scrollAndZoomIntoView(nodes);

  // Deselect all elements on canvas
  figma.currentPage.selection = [];
  await sendSelectionToUI();

  const groupAxisLabel = resolvedLayoutMode === 'rows' ? 'row' : 'column';
  if (movedScreenNodes.length > 0) {
    figma.notify(
      `Arranged ${nodes.length} element${nodes.length > 1 ? 's' : ''} in ${sortedGroups.length} ${groupAxisLabel} group${sortedGroups.length > 1 ? 's' : ''} & moved ${movedScreenNodes.length} Screen component${movedScreenNodes.length > 1 ? 's' : ''} to "    🔷 Screens"! 📐`
    );
  } else {
    figma.notify(
      `Arranged ${nodes.length} element${nodes.length > 1 ? 's' : ''} in ${sortedGroups.length} ${groupAxisLabel} group${sortedGroups.length > 1 ? 's' : ''} & collapsed layers! 📐`
    );
  }
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

export function isLibraryScreensPage(page: PageNode = figma.currentPage): boolean {
  const TARGET_PAGE_NAME = '    🔷 Screens';
  if (page.name === TARGET_PAGE_NAME) return true;
  const clean = page.name.trim().toLowerCase();
  if (clean === '🔷 screens' || clean === '🔷screens' || clean === 'screens' || clean === 'screen') {
    return true;
  }
  return clean.includes('🔷') && clean.includes('screen');
}

export function isScreenLibraryNode(node: BaseNode): boolean {
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    return false;
  }
  const trimmed = (node.name || '').trim();
  return /^screen(?=$|[^a-z])/i.test(trimmed);
}

export function getOrCreateTargetPage(pageType: 'components' | 'screens' = 'components'): PageNode {
  const isScreens = pageType === 'screens';
  const TARGET_PAGE_NAME = isScreens ? '    🔷 Screens' : '    🔷 Components';

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

export async function moveSelectedToComponentsPage(layoutMode?: OrganizeLayoutMode) {
  const resolvedLayoutMode: OrganizeLayoutMode = layoutMode || (await getOrganizeLayoutMode());
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

  const allNodesToMove = Array.from(nodesToMove);
  const hasScreenNodes = allNodesToMove.some(isScreenLibraryNode);
  const hasComponentNodes = allNodesToMove.some((n) => !isScreenLibraryNode(n));

  const screensTargetPage = hasScreenNodes ? getOrCreateTargetPage('screens') : null;
  const componentsTargetPage = hasComponentNodes ? getOrCreateTargetPage('components') : null;

  if (screensTargetPage && typeof screensTargetPage.loadAsync === 'function') {
    await screensTargetPage.loadAsync();
  }
  if (componentsTargetPage && typeof componentsTargetPage.loadAsync === 'function') {
    await componentsTargetPage.loadAsync();
  }

  const getEnclosingPage = (node: BaseNode): PageNode | null => {
    let curr: BaseNode | null = node;
    while (curr && curr.type !== 'PAGE') {
      curr = curr.parent;
    }
    return curr && curr.type === 'PAGE' ? (curr as PageNode) : null;
  };

  interface TransferItem {
    node: SceneNode;
    targetPage: PageNode;
    isScreen: boolean;
    fromLibraryPage: boolean;
  }

  const transfers: TransferItem[] = [];

  for (const node of allNodesToMove) {
    const isScreen = isScreenLibraryNode(node);
    const targetPage = isScreen ? screensTargetPage! : componentsTargetPage!;
    const nodePage = getEnclosingPage(node);

    if (nodePage && nodePage.id === targetPage.id) {
      continue;
    }

    const fromLibraryPage = Boolean(
      nodePage && (isLibraryComponentsPage(nodePage) || isLibraryScreensPage(nodePage))
    );

    transfers.push({ node, targetPage, isScreen, fromLibraryPage });
  }

  if (transfers.length === 0) {
    const focusPage = screensTargetPage && !componentsTargetPage ? screensTargetPage : componentsTargetPage!;
    const pageLabel = isLibraryScreensPage(focusPage) ? '"    🔷 Screens"' : 'components';
    figma.notify(`Selected element(s) are already on the ${pageLabel} page! ℹ️`);
    figma.currentPage = focusPage;
    await organizeElementsOnCanvas(true, focusPage, resolvedLayoutMode);
    return;
  }

  // 1. Leave instances in the original place of components before moving (only from non-library pages)
  for (const { node: nodeToMove, fromLibraryPage } of transfers) {
    if (fromLibraryPage) continue;
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

  // 2. Move components to their respective target pages
  const movedToScreens: SceneNode[] = [];
  const movedToComponents: SceneNode[] = [];

  for (const { node: nodeToMove, targetPage, isScreen } of transfers) {
    try {
      targetPage.appendChild(nodeToMove);
      if (isScreen) {
        movedToScreens.push(nodeToMove);
      } else {
        movedToComponents.push(nodeToMove);
      }
    } catch (err: any) {
      console.error(`Could not move "${nodeToMove.name}" to "${targetPage.name}":`, err);
      figma.notify(`Could not move "${nodeToMove.name}": ${err.message || err}`, { error: true });
    }
  }

  // 3. Organize affected target pages and focus the primary destination page
  const primaryPage =
    movedToComponents.length > 0
      ? componentsTargetPage!
      : movedToScreens.length > 0
        ? screensTargetPage!
        : (componentsTargetPage || screensTargetPage!);

  if (movedToScreens.length > 0 && screensTargetPage && screensTargetPage.id !== primaryPage.id) {
    await organizeElementsOnCanvas(true, screensTargetPage, resolvedLayoutMode);
  }

  figma.currentPage = primaryPage;
  await organizeElementsOnCanvas(true, primaryPage, resolvedLayoutMode);

  const primaryMoved = primaryPage.id === screensTargetPage?.id ? movedToScreens : movedToComponents;
  const selectionOnPage = primaryMoved.filter(
    (n) => n.parent && (n.parent as any).id === primaryPage.id
  );
  if (selectionOnPage.length > 0) {
    figma.currentPage.selection = selectionOnPage;
    figma.viewport.scrollAndZoomIntoView(selectionOnPage);
  }
  await sendSelectionToUI();

  if (movedToScreens.length > 0 && movedToComponents.length > 0) {
    figma.notify(
      `Moved ${movedToComponents.length} to "    🔷 Components" & ${movedToScreens.length} to "    🔷 Screens" & arranged grid! 🚀📐`
    );
  } else if (movedToScreens.length > 0) {
    figma.notify(
      `Moved ${movedToScreens.length} element${movedToScreens.length > 1 ? 's' : ''} to "    🔷 Screens" & arranged grid! 🚀📐`
    );
  } else if (movedToComponents.length > 0) {
    figma.notify(
      `Moved ${movedToComponents.length} element${movedToComponents.length > 1 ? 's' : ''} to "    🔷 Components" & arranged grid! 🚀📐`
    );
  }
}

// ============================================================================
// COMPONENT GENERATOR ENGINE & PRESETS
// ============================================================================

