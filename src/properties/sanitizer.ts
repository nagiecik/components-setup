import { toCamelCase, toPascalCase } from '../utils/strings';
import { cleanRebuildComponentProperties } from './rebuilder';
import { reorderComponentSetVariants } from '../components/canvas';

export function collectComponentTargets(nodes: readonly BaseNode[]): Set<ComponentNode | ComponentSetNode> {
  const targets = new Set<ComponentNode | ComponentSetNode>();

  function addComponentWithRelations(comp: ComponentNode) {
    targets.add(comp);
    if (comp.parent && comp.parent.type === 'COMPONENT_SET') {
      targets.add(comp.parent as ComponentSetNode);
      for (const sibling of (comp.parent as ComponentSetNode).children) {
        if (sibling.type === 'COMPONENT') {
          targets.add(sibling as ComponentNode);
        }
      }
    }
  }

  function addComponentSetWithRelations(compSet: ComponentSetNode) {
    targets.add(compSet);
    for (const child of compSet.children) {
      if (child.type === 'COMPONENT') {
        targets.add(child as ComponentNode);
      }
    }
  }

  function inspectNode(node: BaseNode | null) {
    if (!node) return;

    if (node.type === 'COMPONENT_SET') {
      addComponentSetWithRelations(node as ComponentSetNode);
    } else if (node.type === 'COMPONENT') {
      addComponentWithRelations(node as ComponentNode);
    } else if (node.type === 'INSTANCE') {
      const main = (node as InstanceNode).mainComponent;
      if (main) {
        addComponentWithRelations(main);
      }
    }

    // Walk up parent tree in case a sub-layer inside a component/instance was selected
    let curr = node.parent;
    while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
      if (curr.type === 'COMPONENT_SET') {
        addComponentSetWithRelations(curr as ComponentSetNode);
        break;
      } else if (curr.type === 'COMPONENT') {
        addComponentWithRelations(curr as ComponentNode);
        break;
      } else if (curr.type === 'INSTANCE') {
        const main = (curr as InstanceNode).mainComponent;
        if (main) {
          addComponentWithRelations(main);
        }
        break;
      }
      curr = curr.parent;
    }

    // Walk down children if container
    if ('children' in node && (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'GROUP')) {
      for (const child of (node as any).children) {
        inspectNode(child);
      }
    }
  }

  for (const n of nodes) {
    inspectNode(n);
  }

  return targets;
}

export async function resolveComponentSetConflicts(compSet: ComponentSetNode): Promise<number> {
  if (!compSet || compSet.type !== 'COMPONENT_SET') return 0;
  const variants = compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
  if (variants.length <= 1) return 0;

  let resolvedCount = 0;

  interface ParsedProp {
    rawKey: string;
    rawVal: string;
    normKey: string;
    normVal: string;
  }

  function parseVariantProps(name: string): ParsedProp[] {
    const rawParts = (name || '').split(',').map((p) => p.trim()).filter((p) => p.length > 0);
    if (rawParts.length === 0) {
      return [{ rawKey: 'Type', rawVal: 'Default', normKey: 'type', normVal: 'default' }];
    }

    return rawParts.map((part) => {
      const eqIdx = part.indexOf('=');
      let k = 'Type';
      let v = part;
      if (eqIdx !== -1) {
        k = part.substring(0, eqIdx).trim();
        v = part.substring(eqIdx + 1).trim();
      }
      if (/^property\s*\d+$/i.test(k)) {
        k = 'Type';
      }
      return {
        rawKey: k || 'Type',
        rawVal: v || 'Default',
        normKey: (k || 'Type').toLowerCase(),
        normVal: (v || 'Default').toLowerCase(),
      };
    });
  }

  // 1. Gather all property keys across component definitions and variants
  const allPropertyKeys: string[] = [];
  const allPropertyKeysLower = new Set<string>();

  try {
    const defs = (compSet as any).componentPropertyDefinitions;
    if (defs) {
      for (const propKey of Object.keys(defs)) {
        if (defs[propKey]?.type === 'VARIANT') {
          const rawName = propKey.split('#')[0].trim();
          const cleanName = /^property\s*\d+$/i.test(rawName) ? 'Type' : rawName;
          if (!allPropertyKeysLower.has(cleanName.toLowerCase())) {
            allPropertyKeysLower.add(cleanName.toLowerCase());
            allPropertyKeys.push(cleanName);
          }
        }
      }
    }
  } catch (e) {}

  const variantParsedList: Array<{ variant: ComponentNode; props: ParsedProp[] }> = [];
  for (const v of variants) {
    const parsed = parseVariantProps(v.name);
    for (const p of parsed) {
      if (!allPropertyKeysLower.has(p.normKey)) {
        allPropertyKeysLower.add(p.normKey);
        allPropertyKeys.push(p.rawKey);
      }
    }
    variantParsedList.push({ variant: v, props: parsed });
  }

  if (allPropertyKeys.length === 0) {
    allPropertyKeys.push('Type');
  }

  // 2. Ensure every variant has all expected property keys
  for (const item of variantParsedList) {
    const existingKeys = new Set(item.props.map((p) => p.normKey));
    for (const expectedKey of allPropertyKeys) {
      if (!existingKeys.has(expectedKey.toLowerCase())) {
        item.props.push({
          rawKey: expectedKey,
          rawVal: 'Default',
          normKey: expectedKey.toLowerCase(),
          normVal: 'default',
        });
      }
    }
  }

  // 3. Signature builder
  function makeSignature(props: ParsedProp[]): string {
    return props
      .slice()
      .sort((a, b) => a.normKey.localeCompare(b.normKey))
      .map((p) => `${p.normKey}=${p.normVal}`)
      .join('|');
  }

  const seenSignatures = new Map<string, number>();

  // 4. Resolve collisions
  for (const item of variantParsedList) {
    let sig = makeSignature(item.props);

    if (seenSignatures.has(sig)) {
      const count = (seenSignatures.get(sig) || 1) + 1;
      seenSignatures.set(sig, count);

      const targetProp = item.props[item.props.length - 1];
      const baseVal = targetProp.rawVal.replace(/\s+\d+$/, '').trim() || 'Variant';
      let counter = count;
      let newRawVal = `${baseVal} ${counter}`;
      targetProp.rawVal = newRawVal;
      targetProp.normVal = newRawVal.toLowerCase();
      sig = makeSignature(item.props);

      while (seenSignatures.has(sig)) {
        counter++;
        newRawVal = `${baseVal} ${counter}`;
        targetProp.rawVal = newRawVal;
        targetProp.normVal = newRawVal.toLowerCase();
        sig = makeSignature(item.props);
      }

      seenSignatures.set(sig, 1);

      const newName = item.props.map((p) => `${p.rawKey}=${p.rawVal}`).join(', ');
      try {
        if (item.variant.name !== newName) {
          item.variant.name = newName;
          resolvedCount++;
        }
      } catch (err) {
        console.warn(`Could not set unique name on variant "${item.variant.name}":`, err);
      }
    } else {
      seenSignatures.set(sig, 1);
      const expectedName = item.props.map((p) => `${p.rawKey}=${p.rawVal}`).join(', ');
      if (item.variant.name !== expectedName && item.props.length > 1) {
        try {
          item.variant.name = expectedName;
        } catch (e) {}
      }
    }
  }

  return resolvedCount;
}

export async function sanitizeComponentProperties(root: BaseNode | readonly BaseNode[]): Promise<number> {
  if (!root) return 0;
  const nodes = Array.isArray(root) ? root : [root];
  const targets = collectComponentTargets(nodes);

  let totalRenamed = 0;
  for (const target of targets) {
    if (!target) continue;

    try {
      // 1. If it's a ComponentSetNode, resolve conflicts and sanitize variant keys and values in all child variant names to PascalCase
      if (target.type === 'COMPONENT_SET') {
        const compSet = target as ComponentSetNode;
        try {
          await resolveComponentSetConflicts(compSet);
        } catch (errConflicts) {
          console.warn('resolveComponentSetConflicts error:', errConflicts);
        }

        const seenNames = new Set<string>();

        for (const child of compSet.children) {
          if (child.type === 'COMPONENT' && child.name) {
            const parts = child.name.split(',').map((part) => {
              const eqIdx = part.indexOf('=');
              if (eqIdx === -1) {
                return toPascalCase(part.trim());
              }
              const k = part.substring(0, eqIdx).trim();
              const v = part.substring(eqIdx + 1).trim();
              const pascalK = /^property\s*\d+$/i.test(k) ? 'Type' : toPascalCase(k);
              const pascalV = toPascalCase(v);
              return pascalK ? `${pascalK}=${pascalV}` : `${k}=${pascalV}`;
            });
            let newName = parts.join(', ');

            // Ensure no duplicate names are generated during PascalCase conversion
            if (seenNames.has(newName.toLowerCase())) {
              let counter = 2;
              let candidate = `${newName} ${counter}`;
              while (seenNames.has(candidate.toLowerCase())) {
                counter++;
                candidate = `${newName} ${counter}`;
              }
              newName = candidate;
            }
            seenNames.add(newName.toLowerCase());

            if (child.name !== newName) {
              try {
                child.name = newName;
                totalRenamed++;
              } catch (errChildName) {
                console.warn(`Could not set child name to "${newName}":`, errChildName);
              }
            }
          }
        }

        try {
          reorderComponentSetVariants(compSet);
        } catch (errReorder) {
          console.warn('reorderComponentSetVariants error:', errReorder);
        }
      }

      // 2. Edit component property definitions on ComponentSetNode or standalone ComponentNode (VARIANT and TEXT properties)
      if (typeof (target as any).editComponentProperty === 'function') {
        // If it's a variant child of a set, don't edit directly - parent set owns the definitions
        if (target.type === 'COMPONENT' && target.parent && target.parent.type === 'COMPONENT_SET') {
          continue;
        }

        let changed = true;
        let iterations = 0;
        while (changed && iterations < 30) {
          changed = false;
          iterations++;
          const defs = (target as any).componentPropertyDefinitions;
          if (!defs) break;

          for (const propKey of Object.keys(defs)) {
            const def = defs[propKey];
            const rawName = propKey.split('#')[0].trim();
            const pascalName = /^property\s*\d+$/i.test(rawName) ? 'Type' : toPascalCase(rawName);
            const needsNameChange = pascalName && pascalName !== rawName;
            let needsValueChange = false;
            let pascalDefaultValue: string | undefined = undefined;

            // Convert VARIANT property values to PascalCase and set TEXT property defaultValue to match its property name
            if (def.type === 'VARIANT' && typeof def.defaultValue === 'string') {
              const val = toPascalCase(def.defaultValue);
              if (val && val !== def.defaultValue) {
                needsValueChange = true;
                pascalDefaultValue = val;
              }
            } else if (def.type === 'TEXT') {
              const targetTextVal = pascalName || rawName;
              if (targetTextVal && def.defaultValue !== targetTextVal) {
                needsValueChange = true;
                pascalDefaultValue = targetTextVal;
              }
            }

            if (needsNameChange || needsValueChange) {
              const updatePayload: { name?: string; defaultValue?: string } = {};
              if (needsNameChange) updatePayload.name = pascalName;
              if (needsValueChange && pascalDefaultValue) updatePayload.defaultValue = pascalDefaultValue;

              let success = false;
              try {
                (target as any).editComponentProperty(propKey, updatePayload);
                success = true;
              } catch (err1) {
                try {
                  (target as any).editComponentProperty(rawName, updatePayload);
                  success = true;
                } catch (err2) {
                  // Try setting defaultValue only if payload had both
                  if (needsValueChange && updatePayload.defaultValue) {
                    try {
                      (target as any).editComponentProperty(propKey, { defaultValue: updatePayload.defaultValue });
                      success = true;
                    } catch (errVal1) {
                      try {
                        (target as any).editComponentProperty(rawName, { defaultValue: updatePayload.defaultValue });
                        success = true;
                      } catch (errVal2) {}
                    }
                  }
                  if (!success && needsNameChange && updatePayload.name) {
                    try {
                      (target as any).editComponentProperty(propKey, { name: updatePayload.name });
                      success = true;
                    } catch (err3) {
                      try {
                        (target as any).editComponentProperty(rawName, { name: updatePayload.name });
                        success = true;
                      } catch (err4) {
                        console.warn(`Could not rename component property "${propKey}" on "${target.name}":`, err4);
                      }
                    }
                  }
                }
              }
              if (success) {
                totalRenamed++;
                changed = true;
                break; // Break and re-fetch defs from target to prevent working with stale keys
              }
            }
          }
        }

        // 3. Enforce canonical schema ordering of EXISTING non-variant properties ONLY (do NOT create new properties):
        // Group 3 (BOOLEAN Show*) -> Group 4 (TEXT) -> Group 5 (INSTANCE_SWAP) -> Group 6 (SLOT)
        try {
          const finalDefs = (target as any).componentPropertyDefinitions || {};
          const nonVariantKeys = Object.keys(finalDefs).filter(k => finalDefs[k] && finalDefs[k].type !== 'VARIANT');
          if (nonVariantKeys.length > 1) {
            const variants = target.type === 'COMPONENT_SET'
              ? (target as ComponentSetNode).children.filter((c): c is ComponentNode => c.type === 'COMPONENT')
              : [target as ComponentNode];
            cleanRebuildComponentProperties(target, variants, {
              enableText: false,
              enableInstanceSwap: false,
              enableBoolean: false,
              enableSlotExtract: true,
              enableNestedInstances: false
            });
          }
        } catch (errSortProps) {
          console.warn(`Could not sort component properties on "${target.name}":`, errSortProps);
        }
      }
    } catch (errTarget) {
      console.warn(`Error sanitizing component properties for target "${target.name}":`, errTarget);
    }
  }

  return totalRenamed;
}

export async function sanitizeInstanceProperties(node: BaseNode) {
  if (!node) return;

  if (node.type === 'INSTANCE') {
    const inst = node as InstanceNode;
    try {
      const props = inst.componentProperties;
      if (props) {
        const toSet: Record<string, string> = {};
        for (const [key, prop] of Object.entries(props)) {
          // Only convert VARIANT property values to PascalCase (preserve TEXT content)
          if (prop.type === 'VARIANT' && typeof prop.value === 'string') {
            const pascalVal = toPascalCase(prop.value);
            if (pascalVal && pascalVal !== prop.value) {
              toSet[key] = pascalVal;
            }
          }
        }
        if (Object.keys(toSet).length > 0) {
          inst.setProperties(toSet);
        }
      }
    } catch (err) {
      console.warn(`Could not set properties on instance "${node.name}":`, err);
    }
  }

  if ('children' in node && (node as any).children) {
    for (const child of (node as any).children) {
      await sanitizeInstanceProperties(child);
    }
  }
}

