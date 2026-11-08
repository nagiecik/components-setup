import { AutoPropsOptions, TargetPropDef } from '../types/auto-props';
import {
  findDirectSlotContainers,
  isInsideSlot,
  isSlotContainer,
  sanitizeSlotFrame
} from '../slots/slots';
import { compareVisualSortScore } from '../utils/sorting';
import { syncSetCharacters } from '../utils/fonts';
import {
  cleanInstancePropertyName,
  collectDirectInstances,
  collectDirectTextNodes,
  isIconInstanceNode
} from './collectors';
import {
  findExistingInstanceSwapPropKey,
  findExistingTextPropKey,
  findOrCreateComponentInstanceSwapProperty,
  findOrCreateComponentTextProperty
} from './helpers';

export function cleanRebuildComponentProperties(
  propertyHost: ComponentNode | ComponentSetNode,
  variants: (ComponentNode | FrameNode)[],
  options?: AutoPropsOptions
): { textPropsCount: number; instanceSwapPropsCount: number; booleanPropsCount: number; nestedInstancesCount: number } {
  let textPropsCount = 0;
  let instanceSwapPropsCount = 0;
  let booleanPropsCount = 0;
  let nestedInstancesCount = 0;

  if (variants.length === 0) {
    return { textPropsCount: 0, instanceSwapPropsCount: 0, booleanPropsCount: 0, nestedInstancesCount: 0 };
  }

  let primaryVariant: SceneNode = propertyHost;
  if (propertyHost.type === 'COMPONENT_SET') {
    const compSet = propertyHost as ComponentSetNode;
    primaryVariant = compSet.defaultVariant || variants[0] || compSet;
  } else if (variants.length > 0) {
    primaryVariant = variants[0];
  }

  const oldDefs = propertyHost.componentPropertyDefinitions || {};

  const existingBindingsByPropKey = new Map<string, Array<{ node: SceneNode; refType: 'visible' | 'characters' | 'mainComponent' | 'slot' }>>();
  for (const variant of variants) {
    const scanBindings = (n: SceneNode) => {
      if (isInsideSlot(n, variant)) return;
      if (isSlotContainer(n)) {
        if ('componentPropertyReferences' in n && (n as any).componentPropertyReferences?.slot) {
          const slotRef = (n as any).componentPropertyReferences.slot;
          if (!existingBindingsByPropKey.has(slotRef)) existingBindingsByPropKey.set(slotRef, []);
          existingBindingsByPropKey.get(slotRef)!.push({ node: n, refType: 'slot' });
        }
        return; // Do NOT scan inside slot containers!
      }
      if ('componentPropertyReferences' in n && n.componentPropertyReferences) {
        const refs = n.componentPropertyReferences;
        if (refs.visible) {
          if (!existingBindingsByPropKey.has(refs.visible)) existingBindingsByPropKey.set(refs.visible, []);
          existingBindingsByPropKey.get(refs.visible)!.push({ node: n, refType: 'visible' });
        }
        if (refs.characters) {
          if (!existingBindingsByPropKey.has(refs.characters)) existingBindingsByPropKey.set(refs.characters, []);
          existingBindingsByPropKey.get(refs.characters)!.push({ node: n, refType: 'characters' });
        }
        if (refs.mainComponent) {
          if (!existingBindingsByPropKey.has(refs.mainComponent)) existingBindingsByPropKey.set(refs.mainComponent, []);
          existingBindingsByPropKey.get(refs.mainComponent)!.push({ node: n, refType: 'mainComponent' });
        }
        if ((refs as any).slot) {
          const slotRef = (refs as any).slot;
          if (!existingBindingsByPropKey.has(slotRef)) existingBindingsByPropKey.set(slotRef, []);
          existingBindingsByPropKey.get(slotRef)!.push({ node: n, refType: 'slot' });
        }
      }
      if ('children' in n && Array.isArray((n as any).children)) {
        for (const ch of (n as any).children) {
          scanBindings(ch);
        }
      }
    };
    scanBindings(variant);
  }

  const maxTextOccurrences = new Map<string, number>();
  for (const variant of variants) {
    const texts = collectDirectTextNodes(variant);
    const countInVariant = new Map<string, number>();
    for (const t of texts) {
      countInVariant.set(t.name, (countInVariant.get(t.name) || 0) + 1);
    }
    for (const [name, count] of countInVariant.entries()) {
      if (count > (maxTextOccurrences.get(name) || 0)) {
        maxTextOccurrences.set(name, count);
      }
    }
  }

  const maxInstanceOccurrences = new Map<string, number>();
  for (const variant of variants) {
    const instances = collectDirectInstances(variant);
    const countInVariant = new Map<string, number>();
    for (const inst of instances) {
      const cleanInfo = cleanInstancePropertyName(inst.name);
      countInVariant.set(cleanInfo.propName, (countInVariant.get(cleanInfo.propName) || 0) + 1);
    }
    for (const [name, count] of countInVariant.entries()) {
      if (count > (maxInstanceOccurrences.get(name) || 0)) {
        maxInstanceOccurrences.set(name, count);
      }
    }
  }

  const defsByGroup = {
    group3: new Map<string, TargetPropDef>(),
    group4: new Map<string, TargetPropDef>(),
    group5: new Map<string, TargetPropDef>(),
    group6: new Map<string, TargetPropDef>()
  };

  if (options?.enableText !== false) {
    for (const variant of variants) {
      const texts = collectDirectTextNodes(variant);
      texts.sort((a, b) => compareVisualSortScore(a, b, variant));

      const nameIndex = new Map<string, number>();
      for (const textNode of texts) {
        if (options?.disabledTextNames && (options.disabledTextNames.includes(textNode.name) || options.disabledTextNames.includes(textNode.id))) {
          continue;
        }

        const maxCount = maxTextOccurrences.get(textNode.name) || 1;
        let propName = textNode.name;
        if (maxCount > 1) {
          const idx = (nameIndex.get(textNode.name) || 0) + 1;
          nameIndex.set(textNode.name, idx);
          propName = `${textNode.name} ${idx}`;
        }

        if (!defsByGroup.group4.has(propName)) {
          defsByGroup.group4.set(propName, {
            name: propName,
            group: 4,
            type: 'TEXT',
            defaultValue: propName,
            representativeNode: textNode,
            bindings: []
          });
        }

        const def = defsByGroup.group4.get(propName)!;
        if (variant === primaryVariant) {
          def.representativeNode = textNode;
          def.defaultValue = propName;
        }
        if (!def.bindings.some(b => b.node === textNode && b.refType === 'characters')) {
          def.bindings.push({ node: textNode, refType: 'characters' });
        }

        // Optional text visibility control (Show<TextName>) - strictly disabled by default in full auto,
        // unless already bound on the component or explicitly enabled!
        const hasExistingTextVisibilityBinding = Boolean(
          textNode.componentPropertyReferences &&
          (textNode.componentPropertyReferences as any).visible
        );
        const allowTextVisibility = options?.enableTextVisibility === true ||
          hasExistingTextVisibilityBinding ||
          (options?.textVisibilityDecisions && (options.textVisibilityDecisions[propName] === true || options.textVisibilityDecisions[textNode.name] === true || options.textVisibilityDecisions[textNode.id] === true));

        if (allowTextVisibility && options?.enableBoolean !== false) {
          const textBoolPropName = propName.startsWith('Show')
            ? propName
            : `Show${propName.charAt(0).toUpperCase() + propName.slice(1)}`;

          if (!defsByGroup.group3.has(textBoolPropName)) {
            defsByGroup.group3.set(textBoolPropName, {
              name: textBoolPropName,
              group: 3,
              type: 'BOOLEAN',
              defaultValue: textNode.visible !== false,
              representativeNode: textNode,
              bindings: []
            });
          }

          const textBoolDef = defsByGroup.group3.get(textBoolPropName)!;
          if (variant === primaryVariant) {
            textBoolDef.representativeNode = textNode;
            textBoolDef.defaultValue = textNode.visible !== false;
          }
          if (!textBoolDef.bindings.some(b => b.node === textNode && b.refType === 'visible')) {
            textBoolDef.bindings.push({ node: textNode, refType: 'visible' });
          }
        }
      }
    }
  }

  for (const variant of variants) {
    const instances = collectDirectInstances(variant);
    instances.sort((a, b) => compareVisualSortScore(a, b, variant));

    const instanceNameIndex = new Map<string, number>();
    for (const inst of instances) {
      if (isInsideSlot(inst, variant)) continue;
      const cleanInfo = cleanInstancePropertyName(inst.name);
      if (cleanInfo.isSlot || /slot/i.test(inst.name)) continue;

      const maxCount = maxInstanceOccurrences.get(cleanInfo.propName) || 1;
      let propBaseName = cleanInfo.propName;
      if (maxCount > 1) {
        const idx = (instanceNameIndex.get(cleanInfo.propName) || 0) + 1;
        instanceNameIndex.set(cleanInfo.propName, idx);
        propBaseName = `${cleanInfo.propName} ${idx}`;
      }

      const allowSwap = options?.enableInstanceSwap !== false;
      const isSpecificSwapDisabled =
        options?.disabledInstanceSwapNames?.some(n => n.toLowerCase() === propBaseName.toLowerCase() || n.toLowerCase() === cleanInfo.propName.toLowerCase()) ||
        (options?.instanceSwapDecisions && (options.instanceSwapDecisions[propBaseName] === false || options.instanceSwapDecisions[cleanInfo.propName] === false));

      const mainComp = inst.mainComponent;
      if (allowSwap && !isSpecificSwapDisabled && mainComp && mainComp.id) {
        if (!defsByGroup.group5.has(propBaseName)) {
          defsByGroup.group5.set(propBaseName, {
            name: propBaseName,
            group: 5,
            type: 'INSTANCE_SWAP',
            defaultValue: mainComp.id,
            representativeNode: inst,
            bindings: []
          });
        }

        const swapDef = defsByGroup.group5.get(propBaseName)!;
        if (variant === primaryVariant) {
          swapDef.representativeNode = inst;
          swapDef.defaultValue = mainComp.id;
        }
        if (!swapDef.bindings.some(b => b.node === inst && b.refType === 'mainComponent')) {
          swapDef.bindings.push({ node: inst, refType: 'mainComponent' });
        }
      }

      if (options?.enableBoolean !== false) {
        const boolPropName = propBaseName.startsWith('Show')
          ? propBaseName
          : `Show${propBaseName.charAt(0).toUpperCase() + propBaseName.slice(1)}`;

        if (!defsByGroup.group3.has(boolPropName)) {
          defsByGroup.group3.set(boolPropName, {
            name: boolPropName,
            group: 3,
            type: 'BOOLEAN',
            defaultValue: inst.visible !== false,
            representativeNode: inst,
            bindings: []
          });
        }

        const boolDef = defsByGroup.group3.get(boolPropName)!;
        if (variant === primaryVariant) {
          boolDef.representativeNode = inst;
          boolDef.defaultValue = inst.visible !== false;
        }
        if (!boolDef.bindings.some(b => b.node === inst && b.refType === 'visible')) {
          boolDef.bindings.push({ node: inst, refType: 'visible' });
        }
      }

      // Optional: Expose Nested Instance in Figma Component Properties
      // Preserve already exposed instances if the user didn't explicitly disable them in Review mode
      const explicitNestedDecision =
        options?.nestedInstanceDecisions?.[propBaseName] ??
        options?.nestedInstanceDecisions?.[cleanInfo.propName] ??
        options?.nestedInstanceDecisions?.[inst.name] ??
        options?.nestedInstanceDecisions?.[inst.id];
      const shouldExposeNested = explicitNestedDecision !== undefined
        ? Boolean(explicitNestedDecision)
        : (options?.enableNestedInstances === true
            ? !isIconInstanceNode(inst)
            : Boolean(inst.isExposedInstance));

      try {
        const wasAlreadyExposed = Boolean(inst.isExposedInstance);
        if (wasAlreadyExposed !== shouldExposeNested) {
          inst.isExposedInstance = shouldExposeNested;
          if (shouldExposeNested && variant === primaryVariant) {
            nestedInstancesCount++;
          }
        }
      } catch (_) {}
    }

    // Also handle instances inside Slot containers if enableNestedInstances is explicitly configured
    const slotsInVariant = findDirectSlotContainers(variant);
    for (const slotContainer of slotsInVariant) {
      if ('children' in slotContainer && Array.isArray((slotContainer as any).children)) {
        for (const ch of (slotContainer as any).children) {
          if (ch.type === 'INSTANCE') {
            const slotInst = ch as InstanceNode;
            const shouldExposeSlotInst = options?.enableNestedInstances === true
              ? !isIconInstanceNode(slotInst)
              : Boolean(slotInst.isExposedInstance);
            try {
              const wasAlreadyExposed = Boolean(slotInst.isExposedInstance);
              if (wasAlreadyExposed !== shouldExposeSlotInst) {
                slotInst.isExposedInstance = shouldExposeSlotInst;
                if (shouldExposeSlotInst && variant === primaryVariant) {
                  nestedInstancesCount++;
                }
              }
            } catch (_) {}
          }
        }
      }
    }
  }

  if (options?.enableSlotExtract !== false) {
    for (const variant of variants) {
      const vSlots = findDirectSlotContainers(variant);
      for (const sf of vSlots) {
        sanitizeSlotFrame(sf, sf.parent);
      }
      if (vSlots.length === 1) {
        vSlots[0].name = 'Slot';
      } else if (vSlots.length > 1) {
        vSlots.sort((a, b) => compareVisualSortScore(a, b, variant));
        vSlots.forEach((s, idx) => {
          s.name = idx === 0 ? 'Slot' : `Slot ${idx + 1}`;
        });
      }
    }

    for (const variant of variants) {
      const slots = findDirectSlotContainers(variant);
      slots.sort((a, b) => compareVisualSortScore(a, b, variant));

      const slotNameIndex = new Map<string, number>();
      for (const slotFrame of slots) {
        sanitizeSlotFrame(slotFrame, slotFrame.parent);
        const rawName = slotFrame.name.trim();
        const baseSlotName = rawName || 'Slot';
        let propName = baseSlotName;
        const countMatching = slots.filter(s => s.name.trim().toLowerCase() === baseSlotName.toLowerCase()).length;
        if (countMatching > 1) {
          const idx = (slotNameIndex.get(baseSlotName) || 0) + 1;
          slotNameIndex.set(baseSlotName, idx);
          propName = `${baseSlotName} ${idx}`;
        }

        if (!defsByGroup.group6.has(propName)) {
          defsByGroup.group6.set(propName, {
            name: propName,
            group: 6,
            type: 'SLOT',
            representativeNode: slotFrame,
            bindings: []
          });
        }

        const slotDef = defsByGroup.group6.get(propName)!;
        if (variant === primaryVariant) {
          slotDef.representativeNode = slotFrame;
        }
        if (!slotDef.bindings.some(b => b.node === slotFrame && b.refType === 'slot')) {
          slotDef.bindings.push({ node: slotFrame, refType: 'slot' });
        }
      }
    }
  }

  const isDisallowedProp = (name: string, type: string) => {
    const lower = name.toLowerCase().replace(/[\s_#\d-]+/g, '');
    if (lower === 'showslot' || lower.startsWith('showslot')) return true;
    if (lower === 'slot' && type !== 'SLOT') return true;
    if (lower === 'showitem' || lower.startsWith('showitem')) return true;
    if (lower === 'item' && (type === 'INSTANCE_SWAP' || type === 'BOOLEAN')) return true;
    return false;
  };

  for (const key of Object.keys(oldDefs)) {
    const oldDef = oldDefs[key];
    if (!oldDef || oldDef.type === 'VARIANT' || (oldDef.type as string) === 'SLOT') continue;
    const cleanName = key.split('#')[0].trim();
    if (isDisallowedProp(cleanName, oldDef.type)) continue;

    const bindings = (existingBindingsByPropKey.get(key) || []).filter(b => !isInsideSlot(b.node, primaryVariant));
    if (bindings.length === 0) continue;

    const repNode = bindings.find(b => primaryVariant === propertyHost || !b.node.parent || b.node.id.startsWith(primaryVariant.id.split(';')[0]))?.node || bindings[0].node;
    if (isInsideSlot(repNode, primaryVariant)) continue;

    if (oldDef.type === 'BOOLEAN') {
      if (!defsByGroup.group3.has(cleanName)) {
        defsByGroup.group3.set(cleanName, {
          name: cleanName,
          group: 3,
          type: 'BOOLEAN',
          defaultValue: Boolean(oldDef.defaultValue),
          representativeNode: repNode,
          bindings
        });
      } else {
        const existing = defsByGroup.group3.get(cleanName)!;
        existing.defaultValue = Boolean(oldDef.defaultValue);
      }
    } else if (oldDef.type === 'TEXT') {
      if (!defsByGroup.group4.has(cleanName)) {
        defsByGroup.group4.set(cleanName, {
          name: cleanName,
          group: 4,
          type: 'TEXT',
          defaultValue: cleanName,
          representativeNode: repNode,
          bindings
        });
      } else {
        const existing = defsByGroup.group4.get(cleanName)!;
        existing.defaultValue = existing.name;
      }
    } else if (oldDef.type === 'INSTANCE_SWAP') {
      if (!defsByGroup.group5.has(cleanName)) {
        defsByGroup.group5.set(cleanName, {
          name: cleanName,
          group: 5,
          type: 'INSTANCE_SWAP',
          defaultValue: String(oldDef.defaultValue),
          preferredValues: (oldDef as any).preferredValues,
          representativeNode: repNode,
          bindings
        });
      } else {
        const existing = defsByGroup.group5.get(cleanName)!;
        if ((oldDef as any).preferredValues && !existing.preferredValues) {
          existing.preferredValues = (oldDef as any).preferredValues;
        }
      }
    }
  }

  const sortGroup = (map: Map<string, TargetPropDef>): TargetPropDef[] => {
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.representativeNode && b.representativeNode) {
        return compareVisualSortScore(a.representativeNode, b.representativeNode, primaryVariant);
      }
      if (a.representativeNode) return -1;
      if (b.representativeNode) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  };

  const sortedGroup3 = sortGroup(defsByGroup.group3);
  const sortedGroup4 = sortGroup(defsByGroup.group4);
  const sortedGroup5 = sortGroup(defsByGroup.group5);
  const sortedGroup6 = sortGroup(defsByGroup.group6);

  const fullSortedList = [...sortedGroup3, ...sortedGroup4, ...sortedGroup5, ...sortedGroup6];

  const existingPropKeysByNameAndType = new Map<string, string>();
  const currentNonVariantOrder: Array<{ type: string; name: string }> = [];
  for (const key of Object.keys(oldDefs)) {
    const d = oldDefs[key];
    if (!d || d.type === 'VARIANT') continue;
    const clean = key.split('#')[0].trim().toLowerCase();
    existingPropKeysByNameAndType.set(`${d.type}:${clean}`, key);
    currentNonVariantOrder.push({ type: d.type, name: clean });
  }

  const usedPropNamesCheck = new Set<string>();
  const targetNonVariantOrder: Array<{ type: string; name: string }> = [];
  for (const def of fullSortedList) {
    let fname = def.name;
    let cnt = 1;
    while (usedPropNamesCheck.has(fname.toLowerCase())) {
      cnt++;
      fname = `${def.name} ${cnt}`;
    }
    usedPropNamesCheck.add(fname.toLowerCase());
    targetNonVariantOrder.push({ type: def.type, name: fname.toLowerCase() });
  }

  const isOrderAlreadyExact =
    currentNonVariantOrder.length === targetNonVariantOrder.length &&
    currentNonVariantOrder.every((item, idx) =>
      item.type === targetNonVariantOrder[idx].type && item.name === targetNonVariantOrder[idx].name
    );

  // If the order in Figma's panel does NOT match the strict schema (Group 3 BOOLEAN -> Group 4 TEXT -> Group 5 INSTANCE_SWAP -> Group 6 SLOT),
  // we must delete and re-add non-variant properties in fullSortedList order because Figma has no reorder API.
  if (!isOrderAlreadyExact) {
    for (const key of Object.keys(oldDefs)) {
      const d = oldDefs[key];
      if (d && d.type !== 'VARIANT' && (d.type as string) !== 'SLOT') {
        try {
          propertyHost.deleteComponentProperty(key);
        } catch (delErr) {
          console.warn(`[AutoProps] Could not delete property ${key} on ${propertyHost.name}:`, delErr);
        }
      }
    }
    existingPropKeysByNameAndType.clear();
  }

  const usedPropNames = new Set<string>();
  const usedSlotKeys = new Set<string>();
  const usedExistingKeys = new Set<string>();

  for (const def of fullSortedList) {
    let finalPropName = def.name;
    let counter = 1;
    while (usedPropNames.has(finalPropName.toLowerCase())) {
      counter++;
      finalPropName = `${def.name} ${counter}`;
    }
    usedPropNames.add(finalPropName.toLowerCase());

    let newKey: string | null = null;
    const existingMatchedKey = existingPropKeysByNameAndType.get(`${def.type}:${finalPropName.toLowerCase()}`);

    try {
      if (existingMatchedKey && !usedExistingKeys.has(existingMatchedKey) && def.type !== 'SLOT') {
        newKey = existingMatchedKey;
        usedExistingKeys.add(existingMatchedKey);
        if (def.type === 'TEXT' && propertyHost.editComponentProperty) {
          const curDef = (propertyHost.componentPropertyDefinitions || {})[newKey];
          if (curDef && String(curDef.defaultValue) !== finalPropName) {
            try {
              propertyHost.editComponentProperty(newKey, { defaultValue: finalPropName });
            } catch (_) {}
          }
        }
      } else if (def.type === 'BOOLEAN') {
        newKey = propertyHost.addComponentProperty(finalPropName, 'BOOLEAN', Boolean(def.defaultValue));
        booleanPropsCount++;
      } else if (def.type === 'TEXT') {
        newKey = propertyHost.addComponentProperty(finalPropName, 'TEXT', finalPropName);
        textPropsCount++;
      } else if (def.type === 'INSTANCE_SWAP') {
        newKey = propertyHost.addComponentProperty(
          finalPropName,
          'INSTANCE_SWAP',
          String(def.defaultValue),
          def.preferredValues ? { preferredValues: def.preferredValues } : undefined
        );
        instanceSwapPropsCount++;
      } else if (def.type === 'SLOT') {
        const currentDefs = propertyHost.componentPropertyDefinitions || {};
        // 1. Check for exact matching slot property by name that hasn't been used yet
        let matchedKey = Object.keys(currentDefs).find(k => {
          if (usedSlotKeys.has(k)) return false;
          const d = currentDefs[k];
          if (!d || (d.type as string) !== 'SLOT') return false;
          const clean = k.split('#')[0].trim().toLowerCase();
          return clean === finalPropName.toLowerCase();
        });

        // 2. Fallback to any unused slot property
        if (!matchedKey) {
          matchedKey = Object.keys(currentDefs).find(k => {
            if (usedSlotKeys.has(k)) return false;
            const d = currentDefs[k];
            return d && (d.type as string) === 'SLOT';
          });
          if (matchedKey && propertyHost.editComponentProperty) {
            try {
              propertyHost.editComponentProperty(matchedKey, { name: finalPropName });
            } catch (_) {}
          }
        }

        if (matchedKey) {
          newKey = matchedKey;
        } else {
          try {
            newKey = (propertyHost as any).addComponentProperty(finalPropName, 'SLOT', '' as any);
          } catch (e1) {
            try {
              newKey = (propertyHost as any).addComponentProperty(finalPropName, 'SLOT');
            } catch (e2) {
              console.warn(`[AutoProps] Failed to addComponentProperty SLOT "${finalPropName}":`, e2);
            }
          }
        }

        if (newKey) {
          usedSlotKeys.add(newKey);
          usedExistingKeys.add(newKey);
        }
      }
    } catch (addErr) {
      console.warn(`[AutoProps] Failed to addComponentProperty "${finalPropName}" on ${propertyHost.name}:`, addErr);
    }

    if (newKey) {
      for (const binding of def.bindings) {
        try {
          if (binding.refType === 'characters' && binding.node.type === 'TEXT') {
            const textNode = binding.node as TextNode;
            if (textNode.characters !== finalPropName) {
              syncSetCharacters(textNode, finalPropName);
            }
          }
          if (binding.refType === 'slot') {
            sanitizeSlotFrame(binding.node, binding.node.parent);
            const currentSlotRef = (binding.node as any).componentPropertyReferences?.slot || (binding.node as any).componentPropertyReferences?.mainComponent;
            if (currentSlotRef !== newKey) {
              try {
                (binding.node as any).componentPropertyReferences = {
                  ...((binding.node as any).componentPropertyReferences || {}),
                  slot: newKey
                };
              } catch (err1) {
                try {
                  (binding.node as any).componentPropertyReferences = {
                    ...((binding.node as any).componentPropertyReferences || {}),
                    mainComponent: newKey
                  };
                } catch (err2) {
                  console.warn(`[AutoProps] Could not set slot reference on ${binding.node.name}:`, err2);
                }
              }
            }
          } else {
            const currentRef = (binding.node.componentPropertyReferences as any)?.[binding.refType];
            if (currentRef !== newKey) {
              binding.node.componentPropertyReferences = {
                ...(binding.node.componentPropertyReferences || {}),
                [binding.refType]: newKey
              };
            }
          }
        } catch (bindErr) {
          console.warn(`[AutoProps] Could not set ${binding.refType} reference on ${binding.node.name}:`, bindErr);
        }
      }
    }
  }

  // Delete only obsolete/disallowed properties that are no longer in the target set
  const postDefs = propertyHost.componentPropertyDefinitions || {};
  for (const k of Object.keys(postDefs)) {
    const d = postDefs[k];
    if (!d || d.type === 'VARIANT') continue;
    if ((d.type as string) === 'SLOT') {
      if (!usedSlotKeys.has(k)) {
        try {
          propertyHost.deleteComponentProperty(k);
        } catch (delSlotErr) {
          console.warn(`[AutoProps] Could not delete redundant slot property ${k} on ${propertyHost.name}:`, delSlotErr);
        }
      }
    } else if (!usedExistingKeys.has(k)) {
      const clean = k.split('#')[0].trim().toLowerCase();
      if (!usedPropNames.has(clean)) {
        try {
          propertyHost.deleteComponentProperty(k);
        } catch (delErr) {
          console.warn(`[AutoProps] Could not delete obsolete property ${k} on ${propertyHost.name}:`, delErr);
        }
      }
    }
  }

  return { textPropsCount, instanceSwapPropsCount, booleanPropsCount, nestedInstancesCount };
}

