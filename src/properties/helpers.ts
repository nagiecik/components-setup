export function findExistingTextPropKey(host: ComponentNode | ComponentSetNode, baseName: string): string | null {
  try {
    const defs = host.componentPropertyDefinitions;
    if (!defs) return null;
    const search = baseName.trim().toLowerCase();
    for (const key of Object.keys(defs)) {
      const def = defs[key];
      if (def && def.type === 'TEXT') {
        const cleanName = key.split('#')[0].trim().toLowerCase();
        if (cleanName === search) {
          return key;
        }
      }
    }
  } catch (e) {
    console.warn('[AutoProps] Could not inspect componentPropertyDefinitions:', e);
  }
  return null;
}

export function findOrCreateComponentTextProperty(
  host: ComponentNode | ComponentSetNode,
  propName: string,
  defaultValue: string
): { propKey: string; created: boolean } | null {
  try {
    const defs = host.componentPropertyDefinitions || {};
    const search = propName.trim().toLowerCase();

    // 1. Check if an exact matching TEXT property already exists on the host
    for (const key of Object.keys(defs)) {
      const def = defs[key];
      if (def && def.type === 'TEXT') {
        const cleanName = key.split('#')[0].trim().toLowerCase();
        if (cleanName === search) {
          return { propKey: key, created: false };
        }
      }
    }

    // 2. Resolve safe unique property name if name is taken by a non-TEXT property (e.g. VARIANT or BOOLEAN)
    const existingNames = new Set(Object.keys(defs).map(k => k.split('#')[0].trim().toLowerCase()));
    let candidateName = propName;
    if (existingNames.has(search)) {
      if (!candidateName.toLowerCase().endsWith('text')) {
        candidateName = `${propName} Text`;
      } else {
        candidateName = `${propName} 1`;
      }
    }

    let counter = 1;
    let finalName = candidateName;
    while (existingNames.has(finalName.trim().toLowerCase())) {
      finalName = `${candidateName} ${counter}`;
      counter++;
    }

    // 3. Add TEXT property on host (COMPONENT or COMPONENT_SET)
    const newKey = host.addComponentProperty(finalName, 'TEXT', defaultValue || finalName);
    return { propKey: newKey, created: true };
  } catch (err) {
    console.warn(`[AutoProps] Failed to addComponentProperty "${propName}" on ${host.name}:`, err);
    const fallbackKey = findExistingTextPropKey(host, propName);
    if (fallbackKey) {
      return { propKey: fallbackKey, created: false };
    }
    return null;
  }
}

export function findExistingInstanceSwapPropKey(host: ComponentNode | ComponentSetNode, baseName: string): string | null {
  try {
    const defs = host.componentPropertyDefinitions;
    if (!defs) return null;
    const search = baseName.trim().toLowerCase();
    for (const key of Object.keys(defs)) {
      const def = defs[key];
      if (def && def.type === 'INSTANCE_SWAP') {
        const cleanName = key.split('#')[0].trim().toLowerCase();
        if (cleanName === search) {
          return key;
        }
      }
    }
  } catch (e) {
    console.warn('[AutoProps] Could not inspect componentPropertyDefinitions for instance swap:', e);
  }
  return null;
}

export function findOrCreateComponentInstanceSwapProperty(
  host: ComponentNode | ComponentSetNode,
  propName: string,
  defaultValue: string
): { propKey: string; created: boolean } | null {
  try {
    const defs = host.componentPropertyDefinitions || {};
    const search = propName.trim().toLowerCase();

    // 1. Check if an exact matching INSTANCE_SWAP property already exists on the host
    for (const key of Object.keys(defs)) {
      const def = defs[key];
      if (def && def.type === 'INSTANCE_SWAP') {
        const cleanName = key.split('#')[0].trim().toLowerCase();
        if (cleanName === search) {
          return { propKey: key, created: false };
        }
      }
    }

    // 2. Resolve safe unique property name if name is taken by a non-INSTANCE_SWAP property
    const existingNames = new Set(Object.keys(defs).map(k => k.split('#')[0].trim().toLowerCase()));
    let candidateName = propName;
    if (existingNames.has(search)) {
      if (!candidateName.toLowerCase().endsWith('icon')) {
        candidateName = `${propName} Icon`;
      } else {
        candidateName = `${propName} 1`;
      }
    }

    let counter = 1;
    let finalName = candidateName;
    while (existingNames.has(finalName.trim().toLowerCase())) {
      finalName = `${candidateName} ${counter}`;
      counter++;
    }

    // 3. Add INSTANCE_SWAP property on host without preferred instances
    const newKey = host.addComponentProperty(finalName, 'INSTANCE_SWAP', defaultValue);
    return { propKey: newKey, created: true };
  } catch (err) {
    console.warn(`[AutoProps] Failed to addComponentProperty (INSTANCE_SWAP) "${propName}" on ${host.name}:`, err);
    const fallbackKey = findExistingInstanceSwapPropKey(host, propName);
    if (fallbackKey) {
      return { propKey: fallbackKey, created: false };
    }
    return null;
  }
}

