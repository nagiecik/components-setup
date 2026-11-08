import { loadAllFontsForTextNode, safeLoadFontAndSetCharacters } from '../utils/fonts';

export interface SmartSwapOptions {
  matchCascade?: boolean;
  copyLayout?: boolean;
  preserveVisibility?: boolean;
}

export interface ExtractedLayerData {
  name: string;
  type: string;
  characters?: string;
  visible?: boolean;
  mainComponentId?: string;
  variantProperties?: { [property: string]: string } | null;
  path: string;
  parentPath: string;
  leafKey: string;
}

export interface ExtractedContentMap {
  byPath: Map<string, ExtractedLayerData>;
  byParent: Map<string, ExtractedLayerData>;
  byLeafKey: Map<string, ExtractedLayerData>;
  byName: Map<string, ExtractedLayerData[]>;
  totalTexts: number;
}

export interface MatchScoreResult {
  totalTargetTexts: number;
  matchedTexts: number;
  percent: number;
  sampleMatches: Array<{ targetName: string; sourceText: string }>;
  isCompatible: boolean;
}

/**
 * Builds a clean hierarchical path for a layer relative to the root node.
 */
function buildRelativePath(node: BaseNode, rootNode: BaseNode): string {
  const parts: string[] = [];
  let curr: BaseNode | null = node;
  while (curr && curr !== rootNode) {
    if ('name' in curr && typeof curr.name === 'string') {
      parts.unshift(curr.name);
    }
    curr = curr.parent;
  }
  return parts.join('/');
}

/**
 * Recursively scans a sourceNode and extracts a 3-level cascade content map.
 * Level 1: Full cascade path (e.g. "ColumnStack/TextStack/Caption")
 * Level 2: Parent name + layer name (e.g. "TextStack/Caption")
 * Level 3: Layer name + occurrence index (e.g. "Caption#0")
 * Fallback: Pure layer name array (e.g. "Caption")
 */
export function extractContentMap(sourceNode: SceneNode): ExtractedContentMap {
  const byPath = new Map<string, ExtractedLayerData>();
  const byParent = new Map<string, ExtractedLayerData>();
  const byLeafKey = new Map<string, ExtractedLayerData>();
  const byName = new Map<string, ExtractedLayerData[]>();
  const occurrenceCount = new Map<string, number>();

  let totalTexts = 0;

  function traverse(node: SceneNode) {
    if (node === sourceNode) {
      if ('children' in node && Array.isArray((node as any).children)) {
        for (const child of (node as any).children) {
          traverse(child);
        }
      }
      return;
    }

    const name = node.name || '';
    const relPath = buildRelativePath(node, sourceNode);
    const parentName = node.parent && 'name' in node.parent && node.parent !== sourceNode ? String(node.parent.name) : '';
    const parentPath = parentName ? `${parentName}/${name}` : name;

    const currentCount = occurrenceCount.get(name) || 0;
    const leafKey = `${name}#${currentCount}`;
    occurrenceCount.set(name, currentCount + 1);

    const layerData: ExtractedLayerData = {
      name,
      type: node.type,
      path: relPath,
      parentPath,
      leafKey,
      visible: 'visible' in node ? node.visible : true,
    };

    if (node.type === 'TEXT') {
      totalTexts++;
      layerData.characters = (node as TextNode).characters;
    } else if (node.type === 'INSTANCE') {
      const inst = node as InstanceNode;
      layerData.variantProperties = inst.variantProperties;
      if (inst.mainComponent && inst.mainComponent.id) {
        layerData.mainComponentId = inst.mainComponent.id;
      }
    }

    if (relPath) byPath.set(relPath, layerData);
    if (parentPath) byParent.set(parentPath, layerData);
    byLeafKey.set(leafKey, layerData);

    const nameList = byName.get(name) || [];
    nameList.push(layerData);
    byName.set(name, nameList);

    if ('children' in node && Array.isArray((node as any).children)) {
      for (const child of (node as any).children) {
        traverse(child);
      }
    }
  }

  traverse(sourceNode);

  return {
    byPath,
    byParent,
    byLeafKey,
    byName,
    totalTexts,
  };
}

/**
 * Finds the best matching layer in the source map for a target node inside the new instance.
 */
function findBestMatch(
  targetNode: SceneNode,
  rootInstance: InstanceNode,
  sourceMap: ExtractedContentMap,
  occurrenceIndex: number
): ExtractedLayerData | null {
  const targetRelPath = buildRelativePath(targetNode, rootInstance);
  const targetParentName = targetNode.parent && 'name' in targetNode.parent && targetNode.parent !== rootInstance
    ? String(targetNode.parent.name)
    : '';
  const targetParentPath = targetParentName ? `${targetParentName}/${targetNode.name}` : targetNode.name;
  const targetLeafKey = `${targetNode.name}#${occurrenceIndex}`;

  // Priority 1: Exact cascade relative path
  if (targetRelPath && sourceMap.byPath.has(targetRelPath)) {
    return sourceMap.byPath.get(targetRelPath)!;
  }

  // Priority 2: Parent name + layer name
  if (targetParentPath && sourceMap.byParent.has(targetParentPath)) {
    return sourceMap.byParent.get(targetParentPath)!;
  }

  // Priority 3: Layer name + occurrence index
  if (sourceMap.byLeafKey.has(targetLeafKey)) {
    return sourceMap.byLeafKey.get(targetLeafKey)!;
  }

  // Priority 4: Fallback to same layer name
  const candidates = sourceMap.byName.get(targetNode.name);
  if (candidates && candidates.length > 0) {
    return candidates[Math.min(occurrenceIndex, candidates.length - 1)];
  }

  return null;
}

/**
 * Resolves the master component from a template node (INSTANCE or COMPONENT).
 */
export async function resolveMainComponent(templateNode: SceneNode): Promise<ComponentNode> {
  if (templateNode.type === 'COMPONENT') {
    return templateNode as ComponentNode;
  }

  if (templateNode.type === 'INSTANCE') {
    const inst = templateNode as InstanceNode;
    const mainComp = await inst.getMainComponentAsync();
    if (mainComp) return mainComp;
  }

  if (templateNode.type === 'COMPONENT_SET') {
    const setNode = templateNode as ComponentSetNode;
    if (setNode.defaultVariant) return setNode.defaultVariant;
    const firstComp = setNode.children.find((c) => c.type === 'COMPONENT') as ComponentNode | undefined;
    if (firstComp) return firstComp;
  }

  throw new Error(`Target object "${templateNode.name}" must be an Instance or Component.`);
}

/**
 * Calculates match compatibility statistics between source and template.
 */
export async function calculateMatchStats(
  sourceNode: SceneNode,
  templateNode: SceneNode
): Promise<MatchScoreResult> {
  try {
    const mainComp = await resolveMainComponent(templateNode);
    const sourceMap = extractContentMap(sourceNode);

    let totalTargetTexts = 0;
    let matchedTexts = 0;
    const sampleMatches: Array<{ targetName: string; sourceText: string }> = [];

    // Scan target template structure
    const targetTexts: TextNode[] = [];
    if ('findAllWithCriteria' in templateNode && typeof (templateNode as any).findAllWithCriteria === 'function') {
      try {
        const found = (templateNode as any).findAllWithCriteria({ types: ['TEXT'] }) as TextNode[];
        if (Array.isArray(found)) targetTexts.push(...found);
      } catch (e) {}
    }

    if (targetTexts.length === 0 && 'findAllWithCriteria' in mainComp && typeof (mainComp as any).findAllWithCriteria === 'function') {
      try {
        const found = (mainComp as any).findAllWithCriteria({ types: ['TEXT'] }) as TextNode[];
        if (Array.isArray(found)) targetTexts.push(...found);
      } catch (e) {}
    }

    const occurrenceTracker = new Map<string, number>();

    for (const tNode of targetTexts) {
      totalTargetTexts++;
      const name = tNode.name || '';
      const idx = occurrenceTracker.get(name) || 0;
      occurrenceTracker.set(name, idx + 1);

      const match = findBestMatch(tNode, templateNode as any, sourceMap, idx);
      if (match && match.characters !== undefined) {
        matchedTexts++;
        if (sampleMatches.length < 5) {
          sampleMatches.push({
            targetName: name,
            sourceText: match.characters.length > 30 ? match.characters.slice(0, 27) + '...' : match.characters,
          });
        }
      }
    }

    const percent = totalTargetTexts > 0 ? Math.round((matchedTexts / totalTargetTexts) * 100) : 100;

    return {
      totalTargetTexts,
      matchedTexts,
      percent,
      sampleMatches,
      isCompatible: percent > 0 || totalTargetTexts === 0,
    };
  } catch (err: any) {
    return {
      totalTargetTexts: 0,
      matchedTexts: 0,
      percent: 0,
      sampleMatches: [],
      isCompatible: false,
    };
  }
}

/**
 * Replaces a single source node with a fresh instance of the template,
 * transferring 100% of matching overrides (text characters, visibility, nested component swaps).
 */
export async function smartSwapSingleNode(
  sourceNode: SceneNode,
  templateNode: SceneNode,
  options: SmartSwapOptions = {}
): Promise<{ newInstance: InstanceNode; overridesCount: number }> {
  const matchCascade = options.matchCascade !== false;
  const copyLayout = options.copyLayout !== false;
  const preserveVisibility = options.preserveVisibility !== false;

  const parent = sourceNode.parent;
  if (!parent || parent.type === 'DOCUMENT') {
    throw new Error(`Cannot replace node "${sourceNode.name}" because it has no parent container.`);
  }

  const index = parent.children.indexOf(sourceNode);
  if (index === -1) {
    throw new Error(`Node "${sourceNode.name}" not found in parent hierarchy.`);
  }

  // 1. Resolve master component
  const mainComp = await resolveMainComponent(templateNode);

  // 2. Extract content map from source node
  const sourceMap = extractContentMap(sourceNode);

  // 3. Save geometry & Auto Layout responsiveness from sourceNode
  const origX = sourceNode.x;
  const origY = sourceNode.y;
  const origWidth = sourceNode.width;
  const origHeight = sourceNode.height;

  const layoutProps: any = {};
  if ('layoutSizingHorizontal' in sourceNode) {
    layoutProps.layoutSizingHorizontal = (sourceNode as any).layoutSizingHorizontal;
  }
  if ('layoutSizingVertical' in sourceNode) {
    layoutProps.layoutSizingVertical = (sourceNode as any).layoutSizingVertical;
  }
  if ('layoutAlign' in sourceNode) {
    layoutProps.layoutAlign = (sourceNode as any).layoutAlign;
  }
  if ('layoutGrow' in sourceNode) {
    layoutProps.layoutGrow = (sourceNode as any).layoutGrow;
  }
  if ('layoutPositioning' in sourceNode) {
    layoutProps.layoutPositioning = (sourceNode as any).layoutPositioning;
  }

  // 4. Create fresh instance
  const newInstance = mainComp.createInstance();

  // If templateNode is an instance with variant properties, copy them
  if (templateNode.type === 'INSTANCE' && (templateNode as InstanceNode).variantProperties) {
    try {
      newInstance.setProperties((templateNode as InstanceNode).variantProperties!);
    } catch (e) {
      console.warn('[SmartSwap] Could not set variant properties on new instance:', e);
    }
  }

  // 5. Insert new instance into parent at exact position
  parent.insertChild(index, newInstance);

  // Restore position & layout sizing
  newInstance.x = origX;
  newInstance.y = origY;

  if (copyLayout) {
    if (layoutProps.layoutPositioning) {
      try {
        (newInstance as any).layoutPositioning = layoutProps.layoutPositioning;
      } catch (e) {}
    }
    if (layoutProps.layoutAlign) {
      try {
        newInstance.layoutAlign = layoutProps.layoutAlign;
      } catch (e) {}
    }
    if (layoutProps.layoutGrow !== undefined) {
      try {
        newInstance.layoutGrow = layoutProps.layoutGrow;
      } catch (e) {}
    }

    try {
      newInstance.resize(origWidth, origHeight);
    } catch (e) {}

    if (layoutProps.layoutSizingHorizontal) {
      try {
        (newInstance as any).layoutSizingHorizontal = layoutProps.layoutSizingHorizontal;
      } catch (e) {}
    }
    if (layoutProps.layoutSizingVertical) {
      try {
        (newInstance as any).layoutSizingVertical = layoutProps.layoutSizingVertical;
      } catch (e) {}
    }
  }

  let overridesCount = 0;
  const appliedComponentPropKeys = new Set<string>();

  // 6. Deep Override Transfer: Step A (Component Properties)
  if (newInstance.componentProperties) {
    const propUpdates: { [name: string]: any } = {};

    for (const [propKey, propDef] of Object.entries(newInstance.componentProperties)) {
      const cleanPropName = propKey.split('#')[0].trim();

      if (propDef.type === 'TEXT') {
        const candidate = sourceMap.byName.get(cleanPropName);
        if (candidate && candidate.length > 0 && candidate[0].characters !== undefined) {
          propUpdates[propKey] = candidate[0].characters;
          appliedComponentPropKeys.add(propKey);
          overridesCount++;
        }
      } else if (propDef.type === 'BOOLEAN' && preserveVisibility) {
        const candidate = sourceMap.byName.get(cleanPropName);
        if (candidate && candidate.length > 0 && candidate[0].visible !== undefined) {
          propUpdates[propKey] = candidate[0].visible;
          appliedComponentPropKeys.add(propKey);
          overridesCount++;
        }
      }
    }

    if (Object.keys(propUpdates).length > 0) {
      try {
        newInstance.setProperties(propUpdates);
      } catch (e) {
        console.warn('[SmartSwap] Error applying component properties:', e);
      }
    }
  }

  // 7. Deep Override Transfer: Step B (Direct Tree Traversal & Cascade)
  const targetOccurrenceTracker = new Map<string, number>();

  async function applyOverrides(targetNode: SceneNode) {
    if (targetNode !== newInstance) {
      const name = targetNode.name || '';
      const idx = targetOccurrenceTracker.get(name) || 0;
      targetOccurrenceTracker.set(name, idx + 1);

      const matched = findBestMatch(targetNode, newInstance, sourceMap, idx);

      if (matched) {
        // Text layer transfer
        if (targetNode.type === 'TEXT' && matched.characters !== undefined) {
          const textNode = targetNode as TextNode;
          if (textNode.characters !== matched.characters) {
            try {
              const success = await safeLoadFontAndSetCharacters(textNode, matched.characters);
              if (success) overridesCount++;
            } catch (fontErr) {
              console.warn('[SmartSwap] Could not set text on:', textNode.name, fontErr);
            }
          }
        }

        // Visibility transfer
        if (preserveVisibility && matched.visible !== undefined && 'visible' in targetNode) {
          if (targetNode.visible !== matched.visible) {
            targetNode.visible = matched.visible;
            overridesCount++;
          }
        }

        // Nested instance swap
        if (targetNode.type === 'INSTANCE' && matched.mainComponentId) {
          const instNode = targetNode as InstanceNode;
          const currentMainId = instNode.mainComponent ? instNode.mainComponent.id : null;
          if (currentMainId && currentMainId !== matched.mainComponentId) {
            try {
              const compToSwap = await figma.getNodeByIdAsync(matched.mainComponentId);
              if (compToSwap && compToSwap.type === 'COMPONENT') {
                instNode.swapComponent(compToSwap as ComponentNode);
                overridesCount++;
              }
            } catch (swapErr) {
              console.warn('[SmartSwap] Nested component swap failed:', swapErr);
            }
          }
        }
      }
    }

    if ('children' in targetNode && Array.isArray((targetNode as any).children)) {
      for (const child of (targetNode as any).children) {
        await applyOverrides(child);
      }
    }
  }

  await applyOverrides(newInstance);

  // 8. Remove the old source node
  try {
    sourceNode.remove();
  } catch (err) {
    console.warn('[SmartSwap] Could not remove old source node:', err);
  }

  return { newInstance, overridesCount };
}

/**
 * Executes Smart Swap for one or more source nodes using a template node.
 */
export async function executeSmartSwapBatch(
  sourceIds: string[],
  templateId: string,
  options: SmartSwapOptions = {}
): Promise<{ success: boolean; replacedCount: number; totalOverrides: number; createdInstanceIds: string[]; message: string }> {
  if (!sourceIds || sourceIds.length === 0) {
    throw new Error('No target objects selected to replace.');
  }
  if (!templateId) {
    throw new Error('No reference template instance or component selected.');
  }

  const templateNode = await figma.getNodeByIdAsync(templateId);
  if (!templateNode || (templateNode.type !== 'INSTANCE' && templateNode.type !== 'COMPONENT' && templateNode.type !== 'COMPONENT_SET')) {
    throw new Error('Target template must be a valid Component or Instance on the page.');
  }

  const createdInstances: InstanceNode[] = [];
  let totalOverrides = 0;

  for (const id of sourceIds) {
    // Avoid swapping template with itself
    if (id === templateId) continue;

    const src = await figma.getNodeByIdAsync(id);
    if (!src || src.removed) continue;

    try {
      const result = await smartSwapSingleNode(src as SceneNode, templateNode as SceneNode, options);
      createdInstances.push(result.newInstance);
      totalOverrides += result.overridesCount;
    } catch (nodeErr: any) {
      console.warn(`[SmartSwap] Failed to replace node ${id}:`, nodeErr);
    }
  }

  if (createdInstances.length === 0) {
    return {
      success: false,
      replacedCount: 0,
      totalOverrides: 0,
      createdInstanceIds: [],
      message: 'Could not replace any of the selected objects.',
    };
  }

  // Select newly created instances on canvas
  figma.currentPage.selection = createdInstances;

  const count = createdInstances.length;
  const msg = count === 1
    ? `Podmieniono na instancję z zachowaniem ${totalOverrides} nadpisań! ✨`
    : `Podmieniono ${count} obiektów na instancje z zachowaniem ${totalOverrides} nadpisań! ✨`;

  figma.notify(msg);

  return {
    success: true,
    replacedCount: count,
    totalOverrides,
    createdInstanceIds: createdInstances.map((n) => n.id),
    message: msg,
  };
}

