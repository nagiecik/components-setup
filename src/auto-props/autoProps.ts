import { AutoPropsOptions, TargetPropDef } from '../types/auto-props';
import { ResolvedVariable } from '../types/variables';
import { convertFrameToComponentAtomic } from '../components/atomic';
import { cleanRebuildComponentProperties } from '../properties/rebuilder';
import {
  applySlotMetricsAndVariables,
  consolidateRepeatingInstancesIntoSlot,
  findDirectSlotContainers,
  getInstanceFamilyKey,
  isInsideSlot,
  isSlotContainer,
  sanitizeSlotFrame,
  unwrapRedundantSlotWrappers
} from '../slots/slots';
import { areFramesMatchingItems, getStructuralSignature, getVisualSignature } from '../utils/geometry';
import { setupComponentSetOnlyHorizontal } from '../components/setup';
import { toPascalCase } from '../utils/strings';
import { getVisualSortScore } from '../utils/sorting';
import {
  cleanInstancePropertyName,
  collectDirectIconInstances,
  collectDirectInstances,
  collectDirectTextNodes,
  getContainingVariantOrRoot,
  isIconInstanceNode
} from '../properties/collectors';
import { preloadBoundVariablesForRoots } from '../variables/variables';
import { reorderComponentSetVariants } from '../components/canvas';
import { lastAiRenamerRootIds } from '../renamer/scanner';
import { loadFontsForTextNode } from '../utils/fonts';
import { isIgnoredName, isSystemOrIgnoredNode, isSystemOrIgnoredNodeAsync, isSystemOrIgnoredPropName, purgeIgnoredPropertiesAndReferences, safeGetComponentPropertyDefinitions } from '../utils/nodes';

export function findRepeatingFrameRuns(parent: FrameNode | ComponentNode): FrameNode[][] {
  const runs: FrameNode[][] = [];
  if (!('children' in parent) || !Array.isArray(parent.children) || parent.children.length < 2) {
    return runs;
  }
  const children = parent.children as SceneNode[];
  let currentRun: FrameNode[] = [];

  for (const child of children) {
    if (child.type === 'FRAME' && (child as any).type !== 'INSTANCE' && !isSlotContainer(child) && !isSystemOrIgnoredNode(child)) {
      const frame = child as FrameNode;
      if (currentRun.length === 0) {
        currentRun = [frame];
      } else {
        const lastFrame = currentRun[currentRun.length - 1];
        if (areFramesMatchingItems(lastFrame, frame)) {
          currentRun.push(frame);
        } else {
          if (currentRun.length >= 2) {
            runs.push([...currentRun]);
          }
          currentRun = [frame];
        }
      }
    } else {
      if (currentRun.length >= 2) {
        runs.push([...currentRun]);
      }
      currentRun = [];
    }
  }
  if (currentRun.length >= 2) {
    runs.push([...currentRun]);
  }
  return runs;
}

export async function applyNestedInstancesExposure(
  propertyHost: ComponentNode | ComponentSetNode,
  variants: (ComponentNode | FrameNode)[],
  options?: AutoPropsOptions
): Promise<number> {
  let exposedCount = 0;
  if (!propertyHost || variants.length === 0) return 0;

  try {
    for (const variant of variants) {
      if (!variant || (variant as any).removed || !('children' in variant)) continue;

      function inspect(n: SceneNode, insideSlot: boolean) {
        try {
          if (!n || (n as any).removed) return;
          if (isSystemOrIgnoredNode(n) || (n.name && isSystemOrIgnoredPropName(n.name))) {
            const resetSubtree = (curr: SceneNode) => {
              try {
                if (curr.type === 'INSTANCE') {
                  try { (curr as InstanceNode).isExposedInstance = false; } catch (_) {}
                }
                if ('children' in curr && (curr as any).children) {
                  for (const ch of (curr as any).children) {
                    resetSubtree(ch);
                  }
                }
              } catch (_) {}
            };
            resetSubtree(n);
            return;
          }
          const isSlot = insideSlot || isSlotContainer(n) || (n.name && /slot/i.test(n.name));

          if (n.type === 'INSTANCE') {
            const inst = n as InstanceNode;
            if (
              isSlot ||
              isSystemOrIgnoredNode(inst) ||
              isSystemOrIgnoredPropName(inst.name) ||
              (inst.mainComponent && isSystemOrIgnoredPropName(inst.mainComponent.name)) ||
              (inst.mainComponent?.parent && isSystemOrIgnoredPropName(inst.mainComponent.parent.name))
            ) {
              try { inst.isExposedInstance = false; } catch (_) {}
              return;
            } else {
              if (options?.enableNestedInstances === true) {
                const explicitDecision = options?.nestedInstanceDecisions?.[inst.name] ?? options?.nestedInstanceDecisions?.[inst.id];
                if (explicitDecision === false) {
                  try { inst.isExposedInstance = false; } catch (_) {}
                } else {
                  let mainComp: ComponentNode | null = null;
                  try {
                    mainComp = inst.mainComponent;
                  } catch (_) {}

                  if (mainComp) {
                    const defHost = mainComp.parent && mainComp.parent.type === 'COMPONENT_SET'
                      ? (mainComp.parent as ComponentSetNode)
                      : mainComp;

                    let defs = safeGetComponentPropertyDefinitions(defHost);

                    // Prerequisite: If local sub-component has 0 property definitions,
                    // auto-generate them so Figma allows setting isExposedInstance = true!
                    if (Object.keys(defs).length === 0 && !(defHost as any).remote) {
                      try {
                        const hostVariants = defHost.type === 'COMPONENT_SET'
                          ? (defHost.children.filter((c): c is ComponentNode => c.type === 'COMPONENT'))
                          : [defHost as ComponentNode];
                        cleanRebuildComponentProperties(defHost, hostVariants, {
                          enableText: true,
                          enableInstanceSwap: true,
                          enableInstanceShow: true,
                          enableBoolean: true,
                          enableSlotExtract: false
                        });
                        defs = safeGetComponentPropertyDefinitions(defHost);
                      } catch (e) {}
                    }

                    if (Object.keys(defs).length > 0) {
                      try {
                        inst.isExposedInstance = true;
                        if (variant === variants[0]) {
                          exposedCount++;
                        }
                      } catch (err) {
                        console.warn('[AutoExpose] Failed to set isExposedInstance:', err);
                      }
                    }
                  }
                }
              } else {
                try { inst.isExposedInstance = false; } catch (_) {}
              }
            }
          }

          if ('children' in n && (n as any).children) {
            for (const ch of (n as any).children) {
              inspect(ch, isSlot);
            }
          }
        } catch (_) {}
      }

      for (const child of (variant as any).children) {
        inspect(child, false);
      }
    }
  } catch (err) {
    console.warn('[AutoExpose] Error caught in applyNestedInstancesExposure:', err);
  }

  return exposedCount;
}

function resolveClusterVariantNames(clusterEntries: Array<{ sig: string; nodes: FrameNode[]; count: number }>): string[] {
  const STATE_KEYWORDS = [
    'active', 'selected', 'completed', 'current', 'disabled', 'inactive', 'hover', 'focus', 'pressed', 'default', 'error', 'warning', 'success', 'done', 'pending'
  ];

  const usedNames = new Set<string>();
  const variantNames: string[] = new Array(clusterEntries.length).fill('');

  // 1. Keyword check from node names
  for (let i = 0; i < clusterEntries.length; i++) {
    const entry = clusterEntries[i];
    for (const node of entry.nodes) {
      const lower = (node.name || '').toLowerCase();
      let foundKw: string | null = null;
      for (const kw of STATE_KEYWORDS) {
        if (lower.includes(kw)) {
          foundKw = kw;
          break;
        }
      }
      if (foundKw) {
        const cap = foundKw.charAt(0).toUpperCase() + foundKw.slice(1);
        const candidate = `State=${cap}`;
        if (!usedNames.has(candidate)) {
          variantNames[i] = candidate;
          usedNames.add(candidate);
          break;
        }
      }
    }
  }

  // 2. Assign majority / minority heuristics (entries sorted by count descending)
  for (let i = 0; i < clusterEntries.length; i++) {
    if (variantNames[i]) continue;

    if (i === 0 && !usedNames.has('State=Default')) {
      variantNames[i] = 'State=Default';
      usedNames.add('State=Default');
      continue;
    }

    if (clusterEntries[i].count < clusterEntries[0].count && !usedNames.has('State=Active')) {
      variantNames[i] = 'State=Active';
      usedNames.add('State=Active');
      continue;
    }

    if (!usedNames.has('State=Default')) {
      variantNames[i] = 'State=Default';
      usedNames.add('State=Default');
    } else if (!usedNames.has('State=Active')) {
      variantNames[i] = 'State=Active';
      usedNames.add('State=Active');
    } else {
      let vNum = i + 1;
      while (usedNames.has(`State=Variant${vNum}`)) {
        vNum++;
      }
      const vName = `State=Variant${vNum}`;
      variantNames[i] = vName;
      usedNames.add(vName);
    }
  }

  return variantNames;
}

export async function autoCreateTextPropsAndExtractItemsSync(
  roots: (ComponentSetNode | ComponentNode | FrameNode)[],
  preloadedVars?: Map<string, Variable>,
  options?: AutoPropsOptions
): Promise<{
  extractedItemsCount: number;
  textPropsCount: number;
  instanceSwapPropsCount: number;
  booleanPropsCount: number;
  slotsCreatedCount: number;
  nestedInstancesCount: number;
  createdItemSets: ComponentSetNode[];
  masterNodes: (ComponentNode | ComponentSetNode)[];
}> {
  let extractedItemsCount = 0;
  let textPropsCount = 0;
  let instanceSwapPropsCount = 0;
  let booleanPropsCount = 0;
  let slotsCreatedCount = 0;
  let nestedInstancesCount = 0;

  if (roots.length === 0) {
    return {
      extractedItemsCount: 0,
      textPropsCount: 0,
      instanceSwapPropsCount: 0,
      booleanPropsCount: 0,
      slotsCreatedCount: 0,
      nestedInstancesCount: 0,
      createdItemSets: [],
      masterNodes: []
    };
  }

  const processedHostIds = new Set<string>();
  const createdItemsByTargetName = new Map<string, {
    itemSet: ComponentSetNode;
    clusterToVariantComp: Map<string, ComponentNode>;
    propMap: Map<string, string>;
    createdItemComponents: ComponentNode[];
  }>();
  const allCreatedItemSets: ComponentSetNode[] = [];
  const allMasterNodes = new Set<ComponentNode | ComponentSetNode>();

  for (const root of roots) {
    let rootComponent = root;
    let rootName = rootComponent.name.trim();

    // Resolve propertyHost (the parent COMPONENT or COMPONENT_SET)
    let propertyHost: ComponentNode | ComponentSetNode | null = null;
    let compSetParent: ComponentSetNode | null = null;

    if (rootComponent.parent && rootComponent.parent.type === 'COMPONENT_SET') {
      compSetParent = rootComponent.parent as ComponentSetNode;
      propertyHost = compSetParent;
      rootName = compSetParent.name.trim();
    } else if (rootComponent.type === 'COMPONENT_SET') {
      compSetParent = rootComponent as ComponentSetNode;
      propertyHost = compSetParent;
    } else if (rootComponent.type === 'COMPONENT') {
      propertyHost = rootComponent as ComponentNode;
    } else {
      let p: BaseNode | null = rootComponent.parent;
      while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
        if (p.type === 'COMPONENT_SET') {
          compSetParent = p as ComponentSetNode;
          propertyHost = compSetParent;
          rootName = compSetParent.name.trim();
          break;
        }
        if (p.type === 'COMPONENT') {
          if (p.parent && p.parent.type === 'COMPONENT_SET') {
            compSetParent = p.parent as ComponentSetNode;
            propertyHost = compSetParent;
            rootName = compSetParent.name.trim();
          } else {
            propertyHost = p as ComponentNode;
            rootName = p.name.trim();
          }
          break;
        }
        p = p.parent;
      }
    }

    // Convert raw FRAME to ComponentNode if needed
    if (!propertyHost && (rootComponent.type as string) === 'FRAME') {
      try {
        const parentComp = convertFrameToComponentAtomic(
          rootComponent as FrameNode,
          'replace-in-parent',
          preloadedVars
        );
        propertyHost = parentComp;
        rootComponent = parentComp;
        rootName = parentComp.name.trim();
      } catch (e) {
        console.warn('[AutoProps] Could not convert parent frame to component:', e);
      }
    }

    // Always ensure the main component is wrapped as a COMPONENT_SET (not just a single component)
    if (propertyHost && propertyHost.type === 'COMPONENT' && (!propertyHost.parent || propertyHost.parent.type !== 'COMPONENT_SET')) {
      try {
        const comp = propertyHost as ComponentNode;
        let originalName = comp.name.trim();
        if (/^frame(\s*\d+)?$/i.test(originalName)) {
          originalName = 'Container';
        } else {
          originalName = toPascalCase(originalName);
        }
        const parent = (comp.parent && 'children' in comp.parent) ? comp.parent : figma.currentPage;
        comp.name = 'State=Default';
        const compSet = figma.combineAsVariants([comp], parent as BaseNode & ChildrenMixin);
        compSet.name = originalName;
        await setupComponentSetOnlyHorizontal([compSet]);

        propertyHost = compSet;
        compSetParent = compSet;
        rootComponent = compSet;
        rootName = originalName;
      } catch (err) {
        console.warn('[AutoProps] Could not wrap component into COMPONENT_SET:', err);
      }
    }

    if (propertyHost) {
      allMasterNodes.add(propertyHost);
      try {
        await purgeIgnoredPropertiesAndReferences(propertyHost);
      } catch (_) {}
    }

    const hostKey = (compSetParent || propertyHost || rootComponent).id;
    if (processedHostIds.has(hostKey)) continue;
    processedHostIds.add(hostKey);

    let variants: (ComponentNode | FrameNode)[] = compSetParent
      ? (compSetParent.children.filter((c): c is ComponentNode => c.type === 'COMPONENT'))
      : (rootComponent.type === 'COMPONENT_SET'
          ? (rootComponent.children.filter((c): c is ComponentNode => c.type === 'COMPONENT'))
          : [rootComponent as (ComponentNode | FrameNode)]);

    // ==========================================
    // FAZA 1: Detekcja duplikatów i ekstrakcja sub-komponentu (.../Item)
    // ==========================================
    if (options?.enableSlotExtract !== false) {
      for (const variant of variants) {
        const containersWithRuns: Array<{ parent: FrameNode | ComponentNode; runs: FrameNode[][] }> = [];
        const inspectNode = (n: SceneNode) => {
          if (isSystemOrIgnoredNode(n)) return;
          if (n.type === 'INSTANCE') return;
          if (n.type === 'FRAME' || n.type === 'COMPONENT') {
            const frame = n as FrameNode | ComponentNode;
            if ('children' in frame && Array.isArray(frame.children)) {
              for (const ch of frame.children) {
                inspectNode(ch);
              }
            }
            const runs = findRepeatingFrameRuns(frame);
            if (runs.length > 0) {
              containersWithRuns.push({ parent: frame, runs });
            }
          }
        };
        inspectNode(variant);

        for (const item of containersWithRuns) {
          for (const repeatingNodes of item.runs) {
            if (!repeatingNodes || repeatingNodes.length < 2) continue;

            const templateNode = repeatingNodes[0];
            if (!templateNode || !templateNode.parent) continue;

            const baseHostName = (propertyHost ? propertyHost.name : rootName).split(',')[0].trim();
            const targetItemName = `${baseHostName}/Item`;

            // Klasteryzacja wariantów powtarzających się ramek według visualSignature
            const clusters = new Map<string, FrameNode[]>();
            for (const fn of repeatingNodes) {
              const sig = getVisualSignature(fn);
              const list = clusters.get(sig) || [];
              list.push(fn);
              clusters.set(sig, list);
            }

            let cachedItem = createdItemsByTargetName.get(targetItemName);

            if (!cachedItem) {
              const existingOld = figma.currentPage.findOne(
                n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === targetItemName
              );
              if (existingOld) {
                try {
                  existingOld.remove();
                } catch (e) {}
              }

              let placeX = rootComponent.x + rootComponent.width + 100;
              let placeY = rootComponent.y;
              if (compSetParent) {
                placeX = compSetParent.x + compSetParent.width + 100;
                placeY = compSetParent.y;
              }

              if (clusters.size <= 1) {
                // Przypadek A: Wszystkie Itemy mają ten sam wygląd (clusters.size === 1)
                const cloned = templateNode.clone();
                figma.currentPage.appendChild(cloned);
                cloned.x = placeX;
                cloned.y = placeY;
                const singleComp = figma.createComponentFromNode(cloned);
                singleComp.name = 'State=Default';

                const itemSet = figma.combineAsVariants([singleComp], figma.currentPage);
                itemSet.name = targetItemName;
                itemSet.x = placeX;
                itemSet.y = placeY;

                await setupComponentSetOnlyHorizontal([itemSet]);
                const itemRebuild = cleanRebuildComponentProperties(itemSet, [singleComp], options);
                textPropsCount += itemRebuild.textPropsCount;
                instanceSwapPropsCount += itemRebuild.instanceSwapPropsCount;
                booleanPropsCount += itemRebuild.booleanPropsCount;
                const exposedNested = await applyNestedInstancesExposure(itemSet, [singleComp], options);
                nestedInstancesCount += exposedNested;
                extractedItemsCount++;
                allCreatedItemSets.push(itemSet);

                const clusterToVariantComp = new Map<string, ComponentNode>();
                for (const sig of clusters.keys()) {
                  clusterToVariantComp.set(sig, singleComp);
                }

                const propMap = new Map<string, string>();
                const itemDefs = safeGetComponentPropertyDefinitions(itemSet);
                for (const k of Object.keys(itemDefs)) {
                  const def = itemDefs[k];
                  if (def && def.type === 'TEXT') {
                    const clean = k.split('#')[0].trim();
                    propMap.set(clean, k);
                  }
                }

                cachedItem = {
                  itemSet,
                  clusterToVariantComp,
                  propMap,
                  createdItemComponents: [singleComp]
                };
                createdItemsByTargetName.set(targetItemName, cachedItem);
              } else {
                // Przypadek B: Itemy różnią się wyglądem (clusters.size > 1)
                const clusterEntries = Array.from(clusters.entries()).map(([sig, nodes]) => ({
                  sig,
                  nodes,
                  count: nodes.length
                }));
                clusterEntries.sort((a, b) => b.count - a.count);

                const variantNames = resolveClusterVariantNames(clusterEntries);
                const createdItemComponents: ComponentNode[] = [];
                const clusterToVariantComp = new Map<string, ComponentNode>();

                for (let i = 0; i < clusterEntries.length; i++) {
                  const entry = clusterEntries[i];
                  const repNode = entry.nodes[0];
                  const cloned = repNode.clone();
                  figma.currentPage.appendChild(cloned);
                  cloned.x = placeX + i * 120;
                  cloned.y = placeY;
                  const comp = figma.createComponentFromNode(cloned);
                  comp.name = variantNames[i];
                  createdItemComponents.push(comp);
                  clusterToVariantComp.set(entry.sig, comp);
                }

                // Reorder so that State=Default is first component
                const defaultIdx = createdItemComponents.findIndex(c => c.name === 'State=Default');
                if (defaultIdx > 0) {
                  const defComp = createdItemComponents.splice(defaultIdx, 1)[0];
                  createdItemComponents.unshift(defComp);
                }

                const itemSet = figma.combineAsVariants(createdItemComponents, figma.currentPage);
                itemSet.name = targetItemName;
                itemSet.x = placeX;
                itemSet.y = placeY;

                await setupComponentSetOnlyHorizontal([itemSet]);
                const itemRebuild = cleanRebuildComponentProperties(itemSet, createdItemComponents, options);
                textPropsCount += itemRebuild.textPropsCount;
                instanceSwapPropsCount += itemRebuild.instanceSwapPropsCount;
                booleanPropsCount += itemRebuild.booleanPropsCount;
                const exposedNested = await applyNestedInstancesExposure(itemSet, createdItemComponents, options);
                nestedInstancesCount += exposedNested;
                extractedItemsCount += createdItemComponents.length;
                allCreatedItemSets.push(itemSet);

                const propMap = new Map<string, string>();
                const itemDefs = safeGetComponentPropertyDefinitions(itemSet);
                for (const k of Object.keys(itemDefs)) {
                  const def = itemDefs[k];
                  if (def && def.type === 'TEXT') {
                    const clean = k.split('#')[0].trim();
                    propMap.set(clean, k);
                  }
                }

                cachedItem = {
                  itemSet,
                  clusterToVariantComp,
                  propMap,
                  createdItemComponents
                };
                createdItemsByTargetName.set(targetItemName, cachedItem);
              }
            } else {
              // cachedItem already exists: check if any new cluster in this run needs an additional variant
              for (const fn of repeatingNodes) {
                const sig = getVisualSignature(fn);
                if (!cachedItem.clusterToVariantComp.has(sig)) {
                  const cloned = fn.clone();
                  figma.currentPage.appendChild(cloned);
                  const comp = figma.createComponentFromNode(cloned);
                  let vNum = cachedItem.createdItemComponents.length + 1;
                  comp.name = `State=Variant${vNum}`;
                  cachedItem.itemSet.appendChild(comp);
                  cachedItem.createdItemComponents.push(comp);
                  cachedItem.clusterToVariantComp.set(sig, comp);
                  await setupComponentSetOnlyHorizontal([cachedItem.itemSet]);
                  cleanRebuildComponentProperties(cachedItem.itemSet, cachedItem.createdItemComponents, options);
                  extractedItemsCount++;
                }
              }
            }

            // 3. Niezawodna podmiana duplikatów na instancje odpowiedniego wariantu .../Item
            let runParent: (BaseNode & ChildrenMixin) | null = null;
            const newlyCreatedInstances: InstanceNode[] = [];

            for (const oldContainer of repeatingNodes) {
              const parent = oldContainer.parent;
              if (!parent || !('insertChild' in parent)) continue;
              runParent = parent;

              // 1. Zapisz oryginalne teksty z warstw TEXT starego kontenera
              const originalTexts: Record<string, string> = {};
              const oldTexts = (oldContainer.findAll ? oldContainer.findAll(n => n.type === 'TEXT') : []) as TextNode[];
              for (const t of oldTexts) {
                originalTexts[t.name] = t.characters;
              }

              // 2. Zapisz dokładny indeks w rodzicu oraz parametry Auto Layoutu
              const index = parent.children.indexOf(oldContainer);
              const sizingH = oldContainer.layoutSizingHorizontal;
              const sizingV = oldContainer.layoutSizingVertical;
              const layoutAlign = oldContainer.layoutAlign;
              const layoutGrow = oldContainer.layoutGrow;

              // 3. Stwórz instancję DOKŁADNIE TEGO wariantu na podstawie visualSignature
              const sig = getVisualSignature(oldContainer);
              const targetVariantComp = cachedItem.clusterToVariantComp.get(sig) || cachedItem.itemSet.defaultVariant || cachedItem.createdItemComponents[0];
              const instance = targetVariantComp.createInstance();
              parent.insertChild(index, instance);
              newlyCreatedInstances.push(instance);

              // 4. Przywróć ustawienia rozciągania Auto Layoutu
              try {
                instance.layoutSizingHorizontal = sizingH;
                instance.layoutSizingVertical = sizingV;
                instance.layoutAlign = layoutAlign;
                instance.layoutGrow = layoutGrow;
              } catch (e) {}

              // 5. Przywróć oryginalne teksty jako właściwości (Component Properties) na instancji
              const propsToSet: Record<string, string> = {};
              for (const [layerName, textVal] of Object.entries(originalTexts)) {
                const propKey = cachedItem.propMap.get(layerName);
                if (propKey && textVal) {
                  propsToSet[propKey] = textVal;
                }
              }
              if (Object.keys(propsToSet).length > 0) {
                try {
                  instance.setProperties(propsToSet);
                } catch (e) {
                  console.warn('[AutoProps] Could not setProperties on instance:', e);
                }
              }

              // 6. Usuń stary kontener!
              oldContainer.remove();
            }

            // 4. Automatyczne zamknięcie instancji w Slot
            if (runParent && 'children' in runParent) {
              const nonItemChildren = runParent.children.filter(
                c => !newlyCreatedInstances.includes(c as InstanceNode)
              );

              if (nonItemChildren.length === 0) {
                runParent.name = 'Slot';
                sanitizeSlotFrame(runParent, runParent.parent);
                applySlotMetricsAndVariables(runParent, runParent.parent, preloadedVars);
                slotsCreatedCount++;
                for (const ch of runParent.children) {
                  if ('componentPropertyReferences' in ch) {
                    try { (ch as any).componentPropertyReferences = null; } catch (_) {}
                  }
                  if (ch.type === 'INSTANCE') {
                    try { (ch as InstanceNode).isExposedInstance = false; } catch (_) {}
                  }
                }
              } else if (newlyCreatedInstances.length > 0) {
                const firstChild = newlyCreatedInstances[0];
                const firstIdx = runParent.children.indexOf(firstChild);
                const slotFrame = figma.createFrame();
                slotFrame.name = 'Slot';
                const parentMode = 'layoutMode' in runParent ? (runParent as any).layoutMode : 'HORIZONTAL';
                slotFrame.layoutMode = parentMode === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
                if ('itemSpacing' in runParent && typeof (runParent as any).itemSpacing === 'number') {
                  slotFrame.itemSpacing = (runParent as any).itemSpacing;
                }
                slotFrame.paddingLeft = 0;
                slotFrame.paddingRight = 0;
                slotFrame.paddingTop = 0;
                slotFrame.paddingBottom = 0;
                slotFrame.fills = [];
                slotFrame.strokes = [];

                if (firstIdx !== -1) {
                  runParent.insertChild(firstIdx, slotFrame);
                } else {
                  runParent.appendChild(slotFrame);
                }

                for (const inst of newlyCreatedInstances) {
                  slotFrame.appendChild(inst);
                  if ('componentPropertyReferences' in inst) {
                    try { (inst as any).componentPropertyReferences = null; } catch (_) {}
                  }
                  try { inst.isExposedInstance = false; } catch (_) {}
                }
                sanitizeSlotFrame(slotFrame, runParent);
                applySlotMetricsAndVariables(slotFrame, runParent, preloadedVars);
                slotsCreatedCount++;
              }
            }
          }
        }
      }
    }

    // Fallback: If propertyHost is still a standalone COMPONENT, wrap into COMPONENT_SET
    if (propertyHost && propertyHost.type === 'COMPONENT' && (!propertyHost.parent || propertyHost.parent.type !== 'COMPONENT_SET')) {
      try {
        const comp = propertyHost as ComponentNode;
        let origName = comp.name.trim();
        if (/^frame(\s*\d+)?$/i.test(origName)) {
          origName = 'Container';
        } else {
          origName = toPascalCase(origName);
        }
        const parent = (comp.parent && 'children' in comp.parent) ? comp.parent : figma.currentPage;
        comp.name = 'State=Default';
        const compSet = figma.combineAsVariants([comp], parent as BaseNode & ChildrenMixin);
        compSet.name = origName;
        await setupComponentSetOnlyHorizontal([compSet]);
        propertyHost = compSet;
        variants = [comp];
        allMasterNodes.add(compSet);
      } catch (e) {
        console.warn('[AutoProps] Could not wrap propertyHost in COMPONENT_SET:', e);
      }
    }

    // ==========================================
    // FAZA 2: Tworzenie i porządkowanie Properties w komponencie nadrzędnym
    // ==========================================
    if (propertyHost && (propertyHost.type === 'COMPONENT_SET' || propertyHost.type === 'COMPONENT')) {
      allMasterNodes.add(propertyHost);
      if (propertyHost.type === 'COMPONENT_SET') {
        reorderComponentSetVariants(propertyHost as ComponentSetNode);
      }

      if (options?.enableSlotExtract !== false) {
        for (const v of variants) {
          if (v.type === 'COMPONENT' || v.type === 'FRAME') {
            const createdSlots = consolidateRepeatingInstancesIntoSlot(v as ComponentNode | FrameNode, preloadedVars);
            slotsCreatedCount += createdSlots.length;
          }
        }
      } else {
        for (const v of variants) {
          if (v.type === 'COMPONENT' || v.type === 'FRAME') {
            unwrapRedundantSlotWrappers(v as ComponentNode | FrameNode, preloadedVars);
          }
        }
      }

      const rebuildRes = cleanRebuildComponentProperties(propertyHost, variants, options);
      textPropsCount += rebuildRes.textPropsCount;
      instanceSwapPropsCount += rebuildRes.instanceSwapPropsCount;
      booleanPropsCount += rebuildRes.booleanPropsCount;

      const exposedNested = await applyNestedInstancesExposure(propertyHost, variants, options);
      nestedInstancesCount += exposedNested;

      try {
        await purgeIgnoredPropertiesAndReferences(propertyHost);
      } catch (_) {}
    }
  }

  return {
    extractedItemsCount,
    textPropsCount,
    instanceSwapPropsCount,
    booleanPropsCount,
    slotsCreatedCount,
    nestedInstancesCount,
    createdItemSets: allCreatedItemSets,
    masterNodes: Array.from(allMasterNodes)
  };
}

export async function autoCreateTextPropsAndExtractItems(
  specificRoots?: (ComponentSetNode | ComponentNode | FrameNode)[]
): Promise<{ extractedItemsCount: number; textPropsCount: number; instanceSwapPropsCount: number; booleanPropsCount: number }> {
  const rawRoots: (ComponentSetNode | ComponentNode | FrameNode)[] = specificRoots ? [...specificRoots] : [];
  if (rawRoots.length === 0) {
    for (const id of lastAiRenamerRootIds) {
      try {
        const node = (figma.getNodeById(id) as any) || (await figma.getNodeByIdAsync(id) as any);
        if (node && (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'FRAME')) {
          if (!rawRoots.includes(node)) rawRoots.push(node);
        }
      } catch (e) {}
    }
  }

  if (rawRoots.length === 0) {
    for (const node of figma.currentPage.selection) {
      if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'FRAME') {
        if (!rawRoots.includes(node as any)) rawRoots.push(node as any);
      }
    }
  }

  if (rawRoots.length === 0) {
    return { extractedItemsCount: 0, textPropsCount: 0, instanceSwapPropsCount: 0, booleanPropsCount: 0 };
  }

  const roots: (ComponentSetNode | ComponentNode | FrameNode)[] = [];
  for (const r of rawRoots) {
    let resolved: ComponentSetNode | ComponentNode | FrameNode = r;
    if (r.parent && r.parent.type === 'COMPONENT_SET') {
      resolved = r.parent as ComponentSetNode;
    } else if (r.type !== 'COMPONENT_SET' && r.type !== 'COMPONENT') {
      let p: BaseNode | null = r.parent;
      while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
        if (p.type === 'COMPONENT_SET') {
          resolved = p as ComponentSetNode;
          break;
        }
        if (p.type === 'COMPONENT') {
          resolved = (p.parent && p.parent.type === 'COMPONENT_SET')
            ? (p.parent as ComponentSetNode)
            : (p as ComponentNode);
          break;
        }
        p = p.parent;
      }
    }
    if (!roots.includes(resolved)) roots.push(resolved);
  }

  const allTextNodes: TextNode[] = [];
  const allDirectInstances: InstanceNode[] = [];
  for (const root of roots) {
    const texts = (root.findAll ? root.findAll(n => n.type === 'TEXT') : []) as TextNode[];
    for (const t of texts) allTextNodes.push(t);
    const instances = (root.findAll ? root.findAll(n => n.type === 'INSTANCE') : []) as InstanceNode[];
    for (const inst of instances) {
      allDirectInstances.push(inst);
    }
  }

  const [, , , preloadedVars] = await Promise.all([
    Promise.all(allTextNodes.map(t => loadFontsForTextNode(t))),
    Promise.all(allDirectInstances.map(async (inst) => {
      if (inst.getMainComponentAsync) {
        try { await inst.getMainComponentAsync(); } catch (e) {}
      }
    })),
    (async () => {
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (e) {}
    })(),
    preloadBoundVariablesForRoots(roots)
  ]);

  return await autoCreateTextPropsAndExtractItemsSync(roots, preloadedVars);
}

export function collectAutoPropsPreviewData(
  roots: (ComponentSetNode | ComponentNode | FrameNode)[]
): Array<{
  rootId: string;
  rootName: string;
  instances: Array<{
    id: string;
    layerName: string;
    propName: string;
    mainComponentName: string;
    canSwap: boolean;
    defaultSwap: boolean;
    defaultShow: boolean;
  }>;
  texts: Array<{
    id: string;
    layerName: string;
    characters: string;
    defaultCreate: boolean;
  }>;
}> {
  const result: any[] = [];
  const seenHostIds = new Set<string>();

  for (const root of roots) {
    let host: ComponentSetNode | ComponentNode | FrameNode = root;
    if (root.parent && root.parent.type === 'COMPONENT_SET') {
      host = root.parent as ComponentSetNode;
    }
    if (seenHostIds.has(host.id)) continue;
    seenHostIds.add(host.id);

    let variants: (ComponentNode | FrameNode)[] = [];
    if (host.type === 'COMPONENT_SET') {
      variants = host.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
    } else {
      variants = [host as (ComponentNode | FrameNode)];
    }

    const primaryVariant = (host.type === 'COMPONENT_SET' ? host.defaultVariant : null) || variants[0] || host;

    const instances = collectDirectInstances(primaryVariant as any).filter(inst => {
      if (isInsideSlot(inst, primaryVariant as any)) return false;
      if (
        isSystemOrIgnoredNode(inst) ||
        isIgnoredName(inst.name) ||
        (inst.mainComponent && isIgnoredName(inst.mainComponent.name)) ||
        (inst.mainComponent?.parent && isIgnoredName(inst.mainComponent.parent.name))
      ) {
        return false;
      }
      const parent = inst.parent;
      if (parent && 'children' in parent && Array.isArray(parent.children)) {
        const siblings = parent.children.filter(c => c.type === 'INSTANCE') as InstanceNode[];
        const sameCompSiblings = siblings.filter(s => {
          return getInstanceFamilyKey(inst) === getInstanceFamilyKey(s);
        });
        if (sameCompSiblings.length >= 2) return false;
      }
      return true;
    });
    const texts = collectDirectTextNodes(primaryVariant as any).filter(t => {
      if (isSystemOrIgnoredNode(t) || isIgnoredName(t.name)) return false;
      return true;
    });

    const instanceList = instances
      .filter(inst => !isIgnoredName(cleanInstancePropertyName(inst.name).propName))
      .map(inst => {
      const clean = cleanInstancePropertyName(inst.name);
      const isIcon = isIconInstanceNode(inst);
      return {
        id: inst.id,
        layerName: inst.name,
        propName: clean.propName,
        mainComponentName: inst.mainComponent?.name || '',
        canSwap: Boolean(inst.mainComponent?.id),
        defaultSwap: true,
        defaultShow: true,
        canExposeNested: !isIcon,
        defaultNested: Boolean(inst.isExposedInstance)
      };
    });

    const textList = texts.map(t => ({
      id: t.id,
      layerName: t.name,
      characters: (t.characters || '').slice(0, 40),
      defaultCreate: true,
      defaultShow: false
    }));

    result.push({
      rootId: host.id,
      rootName: host.name,
      instances: instanceList,
      texts: textList
    });
  }

  return result;
}

