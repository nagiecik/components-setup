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
import { getStructuralSignature } from '../utils/geometry';
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

export function findRepeatingFrameRuns(parent: FrameNode | ComponentNode): FrameNode[][] {
  const runs: FrameNode[][] = [];
  if (!('children' in parent) || !Array.isArray(parent.children) || parent.children.length < 2) {
    return runs;
  }
  const children = parent.children as SceneNode[];
  let currentRun: FrameNode[] = [];
  let currentSig: string | null = null;

  for (const child of children) {
    if (child.type === 'FRAME' && (child as any).type !== 'INSTANCE') {
      const frame = child as FrameNode;
      const sig = getStructuralSignature(frame);
      if (sig) {
        if (sig === currentSig) {
          currentRun.push(frame);
          continue;
        } else {
          if (currentRun.length >= 2) {
            runs.push([...currentRun]);
          }
          currentRun = [frame];
          currentSig = sig;
          continue;
        }
      }
    }
    if (currentRun.length >= 2) {
      runs.push([...currentRun]);
    }
    currentRun = [];
    currentSig = null;
  }
  if (currentRun.length >= 2) {
    runs.push([...currentRun]);
  }
  return runs;
}


export function autoCreateTextPropsAndExtractItemsSync(
  roots: (ComponentSetNode | ComponentNode | FrameNode)[],
  preloadedVars?: Map<string, Variable>,
  options?: AutoPropsOptions
): { extractedItemsCount: number; textPropsCount: number; instanceSwapPropsCount: number; booleanPropsCount: number; slotsCreatedCount: number; nestedInstancesCount: number } {
  let extractedItemsCount = 0;
  let textPropsCount = 0;
  let instanceSwapPropsCount = 0;
  let booleanPropsCount = 0;
  let slotsCreatedCount = 0;
  let nestedInstancesCount = 0;

  if (roots.length === 0) {
    return { extractedItemsCount: 0, textPropsCount: 0, instanceSwapPropsCount: 0, booleanPropsCount: 0, slotsCreatedCount: 0, nestedInstancesCount: 0 };
  }

  const processedHostIds = new Set<string>();
  const createdItemsByTargetName = new Map<string, { itemComponent: ComponentNode; propMap: Map<string, string> }>();

  for (const root of roots) {
    const rootComponent = root;
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

          // Reuse .../Item across variants in the same ComponentSet instead of deleting and recreating it per variant
          let cachedItem = createdItemsByTargetName.get(targetItemName);
          let itemComponent: ComponentNode;
          let propMap: Map<string, string>;

          if (cachedItem) {
            itemComponent = cachedItem.itemComponent;
            propMap = cachedItem.propMap;
          } else {
            const existingOld = figma.currentPage.findOne(n => n.type === 'COMPONENT' && n.name === targetItemName) as ComponentNode | null;
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

            itemComponent = convertFrameToComponentAtomic(
              templateNode,
              'clone-to-page',
              preloadedVars,
              { x: placeX, y: placeY }
            );
            itemComponent.name = targetItemName;
            extractedItemsCount++;

            // 2. Konfiguracja właściwości na nowym itemComponent z pełnym posortowaniem
            const itemRebuild = cleanRebuildComponentProperties(itemComponent, [itemComponent], options);
            textPropsCount += itemRebuild.textPropsCount;
            instanceSwapPropsCount += itemRebuild.instanceSwapPropsCount;
            booleanPropsCount += itemRebuild.booleanPropsCount;

            propMap = new Map<string, string>();
            const itemDefs = itemComponent.componentPropertyDefinitions || {};
            for (const k of Object.keys(itemDefs)) {
              const def = itemDefs[k];
              if (def && def.type === 'TEXT') {
                const clean = k.split('#')[0].trim();
                propMap.set(clean, k);
              }
            }

            createdItemsByTargetName.set(targetItemName, { itemComponent, propMap });
          }

          // 3. Niezawodna podmiana duplikatów na instancje .../Item w głównym komponencie
          let runParent: (BaseNode & ChildrenMixin) | null = null;
          for (const oldContainer of repeatingNodes) {
            const parent = oldContainer.parent;
            if (!parent || !('insertChild' in parent)) continue;
            runParent = parent;

            // 1. Zapisz oryginalne teksty z warstw TEXT starego kontenera (np. { Caption: "Bonus", Title: "100 PLN" })
            const originalTexts: Record<string, string> = {};
            const oldTexts = (oldContainer.findAll ? oldContainer.findAll(n => n.type === 'TEXT') : []) as TextNode[];
            for (const t of oldTexts) {
              originalTexts[t.name] = t.characters;
            }

            // 2. Zapisz dokładny indeks w rodzicu oraz ustawienia responsywności Auto Layoutu (FILL / HUG / FIXED)
            const index = parent.children.indexOf(oldContainer);
            const sizingH = oldContainer.layoutSizingHorizontal;
            const sizingV = oldContainer.layoutSizingVertical;
            const layoutAlign = oldContainer.layoutAlign;
            const layoutGrow = oldContainer.layoutGrow;

            // 3. Stwórz instancję naszego nowego komponentu .../Item i wstaw ją dokładnie w miejsce starego kontenera!
            const instance = itemComponent.createInstance();
            parent.insertChild(index, instance);

            // 4. Przywróć ustawienia rozciągania (MUSI być wywołane PO insertChild do rodzica z Auto Layoutem!)
            try {
              instance.layoutSizingHorizontal = sizingH;
              instance.layoutSizingVertical = sizingV;
              instance.layoutAlign = layoutAlign;
              instance.layoutGrow = layoutGrow;
            } catch (e) {}

            // 5. Przywróć oryginalne teksty jako właściwości (Component Properties) na instancji
            const propsToSet: Record<string, string> = {};
            for (const [layerName, textVal] of Object.entries(originalTexts)) {
              const propKey = propMap.get(layerName);
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

          // 4. Zmiana nazwy rodzica nowych instancji
          if (runParent && 'children' in runParent) {
            const allChildrenAreItems = runParent.children.length > 0 && runParent.children.every(
              c => c.type === 'INSTANCE' && (
                (c as InstanceNode).mainComponent?.name === targetItemName ||
                (c as InstanceNode).mainComponent?.id === itemComponent.id
              )
            );
            if (allChildrenAreItems) {
              runParent.name = 'Slot';
              sanitizeSlotFrame(runParent, runParent.parent);
              applySlotMetricsAndVariables(runParent, runParent.parent, preloadedVars);
              for (const ch of runParent.children) {
                if ('componentPropertyReferences' in ch) {
                  try { (ch as any).componentPropertyReferences = {}; } catch (_) {}
                }
              }
            } else {
              if ('layoutMode' in runParent && (runParent as any).layoutMode === 'HORIZONTAL') {
                runParent.name = 'RowStack';
              } else {
                runParent.name = 'ColumnStack';
              }
            }
          }
        }
      }
    }
  }

    // Fallback: If parent was a raw FRAME, convert it to a ComponentNode atomically without flushing Undo history
    if (!propertyHost && (rootComponent.type as string) === 'FRAME') {
      try {
        const parentComp = convertFrameToComponentAtomic(
          rootComponent as FrameNode,
          'replace-in-parent',
          preloadedVars
        );
        propertyHost = parentComp;
        variants = [parentComp];
      } catch (e) {
        console.warn('[AutoProps] Could not convert parent frame to component:', e);
      }
    }

    // ==========================================
    // FAZA 2: Tworzenie i porządkowanie Properties w komponencie nadrzędnym
    // ==========================================
    if (propertyHost && (propertyHost.type === 'COMPONENT_SET' || propertyHost.type === 'COMPONENT')) {
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
      nestedInstancesCount += rebuildRes.nestedInstancesCount;
    }
  }

  return { extractedItemsCount, textPropsCount, instanceSwapPropsCount, booleanPropsCount, slotsCreatedCount, nestedInstancesCount };
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

  return autoCreateTextPropsAndExtractItemsSync(roots, preloadedVars);
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
    const texts = collectDirectTextNodes(primaryVariant as any);

    const instanceList = instances.map(inst => {
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

