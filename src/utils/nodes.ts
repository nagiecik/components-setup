// Node evaluation and filtering utilities
import { toPascalCase } from './strings';

/**
 * 1. Niezawodny normalizator nazw (normalizeToken)
 * Usuwa spacje, myślniki, podkreślniki, ukośniki oraz sufiks #id właściwości Figmy i zamienia wszystko na małe litery.
 */
export function normalizeToken(str: string): string {
  return (str || '')
    .split('#')[0] // odcina sufiks ID właściwości np. "ShowStatusBar#12:34" -> "ShowStatusBar"
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // "Status Bar - iPhone" -> "statusbariPhone", "ShowStatusBar" -> "showstatusbar"
}

export const IGNORED_KEYWORDS = [
  'statusbar',
  'homeindicator',
  'bezel',
  'dynamicisland',
  'notch',
  'systembar',
  'navigationbarsystem',
  'iphone', // dla Bezel = "iPhone 18 Pro"
  'wrapper', // dla "Wrapper [locked]"
  'liquidglass',
  'blurbg',
  'backdrop'
];

/**
 * 2. Sprawdza czy sama nazwa (warstwy lub właściwości Component Property!) jest wykluczona.
 */
export function isIgnoredName(rawName: string | null | undefined): boolean {
  if (!rawName || typeof rawName !== 'string') return false;
  const norm = normalizeToken(rawName);
  if (!norm) return false;

  // Jeśli to właściwość Show... (np. "ShowStatusBar" -> po odcięciu "show" zostaje "statusbar")
  const withoutShow = norm.startsWith('show') ? norm.slice(4) : norm;

  // Dokładne dopasowanie dla krótkich nazw tła ("bg", "background", "glass")
  if (
    norm === 'bg' || norm === 'background' || norm === 'glass' ||
    withoutShow === 'bg' || withoutShow === 'background' || withoutShow === 'glass'
  ) {
    return true;
  }

  // Prefiksy bg/ glass/ background/
  const cleanLower = rawName.split('#')[0].trim().toLowerCase();
  if (/^(show\s*)?(bg|background|glass)([\/\-_\s]|$)/i.test(cleanLower)) {
    return true;
  }

  // Sprawdzenie słów kluczowych (łapie zarówno "Status Bar", "StatusBar", jak i "ShowStatusBar", "Bezel", "iPhone 18 Pro"!)
  for (const kw of IGNORED_KEYWORDS) {
    if (norm.includes(kw) || withoutShow.includes(kw)) {
      return true;
    }
  }

  return false;
}

// Alias for backwards compatibility
export const isSystemOrIgnoredPropName = isIgnoredName;

/**
 * Sprawdza węzeł na kanwie asynchronicznie (wraz z przodkami i asynchronicznym Main Componentem).
 * Zatrzymuje pętlę sprawdzania przodków przed COMPONENT i COMPONENT_SET,
 * aby kłódka na samym wariancie Default (Default.locked === true) nie oznaczała,
 * że wszystkie warstwy wariantu są systemowe!
 */
export async function isSystemOrIgnoredNodeAsync(node: SceneNode | BaseNode, rootBoundary?: BaseNode): Promise<boolean> {
  if (!node) return false;
  if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') {
    return false;
  }

  if ('locked' in node && (node as any).locked === true) return true;
  if ('name' in node && isIgnoredName((node as any).name)) return true;

  let curr: BaseNode | null = node.parent;
  while (
    curr &&
    curr !== rootBoundary &&
    curr.type !== 'COMPONENT' &&
    curr.type !== 'COMPONENT_SET' &&
    curr.type !== 'PAGE' &&
    curr.type !== 'DOCUMENT'
  ) {
    if ('locked' in curr && (curr as any).locked === true) return true;
    if ('name' in curr && isIgnoredName((curr as any).name)) return true;
    curr = curr.parent;
  }

  if ('type' in node && node.type === 'INSTANCE') {
    try {
      const inst = node as InstanceNode;
      const mainComp = (typeof inst.getMainComponentAsync === 'function' ? await inst.getMainComponentAsync() : null) || inst.mainComponent;
      if (mainComp) {
        if (isIgnoredName(mainComp.name)) return true;
        if (mainComp.parent && mainComp.parent.type === 'COMPONENT_SET' && isIgnoredName(mainComp.parent.name)) {
          return true;
        }
      }
    } catch (e) {}
  }
  return false;
}

/**
 * Sprawdza węzeł na kanwie synchronicznie (wraz z przodkami i synchronicznym mainComponent).
 * Zatrzymuje pętlę sprawdzania przodków przed COMPONENT i COMPONENT_SET!
 */
export function isSystemOrIgnoredNode(node: SceneNode | BaseNode | null | undefined, rootBoundary?: BaseNode): boolean {
  if (!node) return false;
  if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') {
    return false;
  }

  if ('locked' in node && (node as any).locked === true) return true;
  if ('name' in node && isIgnoredName((node as any).name)) return true;

  let curr: BaseNode | null = node.parent;
  while (
    curr &&
    curr !== rootBoundary &&
    curr.type !== 'COMPONENT' &&
    curr.type !== 'COMPONENT_SET' &&
    curr.type !== 'PAGE' &&
    curr.type !== 'DOCUMENT'
  ) {
    if ('locked' in curr && (curr as any).locked === true) return true;
    if ('name' in curr && isIgnoredName((curr as any).name)) return true;
    curr = curr.parent;
  }

  if ('type' in node && node.type === 'INSTANCE') {
    const inst = node as InstanceNode;
    let mainComp: ComponentNode | null = null;
    try {
      mainComp = inst.mainComponent;
    } catch (_) {}
    if (mainComp) {
      if (isIgnoredName(mainComp.name)) return true;
      if (mainComp.parent && mainComp.parent.type === 'COMPONENT_SET' && isIgnoredName(mainComp.parent.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Naprawia nazwy wariantów w ComponentSetNode, gdy Figma zgłasza "Component set has existing errors".
 * Upewnia się, że każdy wariant ma poprawną składnię Key=Value bez duplikatów i konfliktów z definicją wariantu w Figmie.
 */
export function repairComponentSetVariants(compSet: ComponentSetNode): void {
  if (!compSet || compSet.type !== 'COMPONENT_SET' || (compSet as any).removed) return;
  const variants = compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
  if (variants.length === 0) return;

  // 1. Sprawdź czy Figma już definiuje klucze wariantów w componentPropertyDefinitions
  let existingVariantKeys: string[] = [];
  try {
    const rawDefs = compSet.componentPropertyDefinitions;
    if (rawDefs) {
      for (const [k, def] of Object.entries(rawDefs)) {
        if (def && def.type === 'VARIANT') {
          existingVariantKeys.push(k.split('#')[0].trim());
        }
      }
    }
  } catch (_) {
    // ComponentSet ma błąd wariantu - spróbuj wyczyścić konflikt przywracając Property 1 lub Default
    for (const v of variants) {
      if (v.name && v.name.includes('=')) {
        const parts = v.name.split(',');
        const restored = parts.map(p => {
          const eq = p.indexOf('=');
          if (eq === -1) return p;
          const val = p.substring(eq + 1).trim();
          return `Property 1=${val || 'Default'}`;
        }).join(', ');
        try { v.name = restored; } catch (_) {}
      }
    }
    try {
      const retryDefs = compSet.componentPropertyDefinitions;
      if (retryDefs) {
        for (const [k, def] of Object.entries(retryDefs)) {
          if (def && def.type === 'VARIANT') {
            existingVariantKeys.push(k.split('#')[0].trim());
          }
        }
      }
    } catch (_) {}
  }

  // 2. Jeśli mamy Property 1, spróbuj bezpiecznie zmienić nazwę definicji na Type
  if (existingVariantKeys.length > 0 && typeof (compSet as any).editComponentProperty === 'function') {
    for (let i = 0; i < existingVariantKeys.length; i++) {
      const vk = existingVariantKeys[i];
      if (/^property\s*\d+$/i.test(vk)) {
        try {
          (compSet as any).editComponentProperty(vk, { name: 'Type' });
          existingVariantKeys[i] = 'Type';
        } catch (_) {}
      }
    }
  }

  const propKeys: string[] = existingVariantKeys.length > 0 ? [...existingVariantKeys] : [];

  if (propKeys.length === 0) {
    for (const v of variants) {
      const parts = (v.name || '').split(',').map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          const k = part.substring(0, eqIdx).trim();
          const cleanK = toPascalCase(k) || 'Type';
          if (cleanK && !propKeys.includes(cleanK)) {
            propKeys.push(cleanK);
          }
        }
      }
    }
  }

  if (propKeys.length === 0) {
    propKeys.push('Property 1');
  }

  const usedNames = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const rawName = (v.name || '').trim();
    const parts = rawName.split(',').map(p => p.trim()).filter(Boolean);

    let fixedParts: string[] = [];
    if (parts.length === 0 || (parts.length === 1 && !parts[0].includes('='))) {
      const val = parts.length === 1 ? toPascalCase(parts[0]) : 'Default';
      fixedParts = [`${propKeys[0]}=${val || 'Default'}`];
    } else {
      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const part = parts[pIdx];
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) {
          const k = propKeys[pIdx] || `Property${pIdx + 1}`;
          fixedParts.push(`${k}=${toPascalCase(part) || 'Default'}`);
        } else {
          const k = part.substring(0, eqIdx).trim();
          const val = part.substring(eqIdx + 1).trim();
          const pascalK = toPascalCase(k) || propKeys[pIdx] || 'Type';
          const pascalVal = toPascalCase(val) || 'Default';
          fixedParts.push(`${pascalK}=${pascalVal}`);
        }
      }
    }

    for (const expectedKey of propKeys) {
      if (!fixedParts.some(p => p.startsWith(`${expectedKey}=`))) {
        fixedParts.push(`${expectedKey}=Default`);
      }
    }

    let candidateName = fixedParts.join(', ');
    let counter = 2;
    while (usedNames.has(candidateName.toLowerCase())) {
      candidateName = `${fixedParts.slice(0, -1).join(', ')}${fixedParts.length > 1 ? ', ' : ''}${propKeys[propKeys.length - 1]}=Variant${counter}`;
      counter++;
    }
    usedNames.add(candidateName.toLowerCase());

    if (v.name !== candidateName) {
      try {
        v.name = candidateName;
      } catch (_) {}
    }
  }
}

/**
 * Bezpiecznie pobiera componentPropertyDefinitions bez wyrzucania
 * "Error: in get_componentPropertyDefinitions: Component set has existing errors".
 */
export function safeGetComponentPropertyDefinitions(
  propertyHost: ComponentNode | ComponentSetNode | null | undefined
): ComponentPropertyDefinitions {
  if (!propertyHost || (propertyHost as any).removed) return {};
  try {
    return propertyHost.componentPropertyDefinitions || {};
  } catch (err) {
    console.warn(`[safeGetDefs] Error accessing componentPropertyDefinitions on "${propertyHost.name}":`, err);
    return {};
  }
}

/**
 * 3. Twardy "Purge" (Czyszczenie) istniejących właściwości na komponencie!
 * Usuwa wykluczone właściwości (ShowStatusBar, ShowBezel, ShowHomeIndicator, Bezel, StatusBar, BG, itp.)
 * oraz odpina ich referencje i wyłącza isExposedInstance.
 */
export async function purgeIgnoredPropertiesAndReferences(propertyHost: ComponentNode | ComponentSetNode): Promise<string[]> {
  if (!propertyHost || (propertyHost as any).removed) return [];
  const deletedProps: string[] = [];

  try {
    const variants = propertyHost.type === 'COMPONENT_SET'
      ? propertyHost.children.filter((c): c is ComponentNode => c.type === 'COMPONENT')
      : [propertyHost as ComponentNode];

    // 1. Odepnij referencje i wyłącz isExposedInstance na warstwach wewnątrz komponentu:
    const cleanNode = async (n: SceneNode) => {
      try {
        if (!n || (n as any).removed) return;
        const isIgnored = await isSystemOrIgnoredNodeAsync(n, propertyHost);
        if (isIgnored) {
          if (n.type === 'INSTANCE') {
            try { (n as InstanceNode).isExposedInstance = false; } catch (_) {}
          }
          if ('componentPropertyReferences' in n && (n as any).componentPropertyReferences) {
            try { (n as any).componentPropertyReferences = null; } catch (_) {}
          }
        }

        if ('children' in n && (n as any).children) {
          for (const ch of (n as any).children) {
            await cleanNode(ch);
          }
        }
      } catch (_) {}
    };

    for (const v of variants) {
      if ('children' in v && (v as any).children) {
        for (const ch of (v as any).children) {
          await cleanNode(ch);
        }
      }
    }

    // 2. Usuń wykluczone właściwości z propertyHost.componentPropertyDefinitions:
    const defs = safeGetComponentPropertyDefinitions(propertyHost);
    for (const [propKey, def] of Object.entries(defs)) {
      if (def.type === 'VARIANT' || (def as any).type === 'SLOT') continue;
      if (isIgnoredName(propKey)) {
        // Odepnij z warstw, żeby Figma pozwoliła usunąć
        const unbindKey = (n: SceneNode) => {
          try {
            if (!n || (n as any).removed) return;
            if ('componentPropertyReferences' in n && (n as any).componentPropertyReferences) {
              const rawRefs = (n as any).componentPropertyReferences;
              const refs: Record<string, string> = {};
              let changed = false;
              for (const [refName, boundKey] of Object.entries(rawRefs)) {
                if (boundKey === propKey) {
                  changed = true;
                } else if (typeof boundKey === 'string') {
                  refs[refName] = boundKey;
                }
              }
              if (changed) {
                try {
                  (n as any).componentPropertyReferences = Object.keys(refs).length > 0 ? refs : null;
                } catch (_) {}
              }
            }
          } catch (_) {}

          if ('children' in n && (n as any).children) {
            try {
              for (const ch of (n as any).children) {
                unbindKey(ch);
              }
            } catch (_) {}
          }
        };

        for (const v of variants) {
          unbindKey(v);
        }

        try {
          propertyHost.deleteComponentProperty(propKey);
          deletedProps.push(propKey.split('#')[0]);
        } catch (delErr) {
          console.warn(`[Purge] Failed to deleteComponentProperty "${propKey}":`, delErr);
        }
      }
    }
  } catch (err) {
    console.warn('[Purge] Warning in purgeIgnoredPropertiesAndReferences:', err);
  }

  return deletedProps;
}

/**
 * Synchronous version of purgeIgnoredPropertiesAndReferences.
 */
export function purgeIgnoredPropertiesAndReferencesSync(propertyHost: ComponentNode | ComponentSetNode): string[] {
  if (!propertyHost || (propertyHost as any).removed) return [];
  const deletedProps: string[] = [];

  try {
    const variants = propertyHost.type === 'COMPONENT_SET'
      ? propertyHost.children.filter((c): c is ComponentNode => c.type === 'COMPONENT')
      : [propertyHost as ComponentNode];

    // 1. Odepnij referencje i wyłącz isExposedInstance na warstwach wewnątrz komponentu:
    const cleanNode = (n: SceneNode) => {
      try {
        if (!n || (n as any).removed) return;
        const isIgnored = isSystemOrIgnoredNode(n, propertyHost) || isIgnoredName(n.name);
        if (isIgnored) {
          if (n.type === 'INSTANCE') {
            try { (n as InstanceNode).isExposedInstance = false; } catch (_) {}
          }
          if ('componentPropertyReferences' in n && (n as any).componentPropertyReferences) {
            try { (n as any).componentPropertyReferences = null; } catch (_) {}
          }
        }

        if ('children' in n && (n as any).children) {
          for (const ch of (n as any).children) {
            cleanNode(ch);
          }
        }
      } catch (_) {}
    };

    for (const v of variants) {
      if ('children' in v && (v as any).children) {
        for (const ch of (v as any).children) {
          cleanNode(ch);
        }
      }
    }

    // 2. Usuń wykluczone właściwości z propertyHost.componentPropertyDefinitions:
    const defs = safeGetComponentPropertyDefinitions(propertyHost);
    for (const [propKey, def] of Object.entries(defs)) {
      if (def.type === 'VARIANT' || (def as any).type === 'SLOT') continue;
      if (isIgnoredName(propKey)) {
        const unbindKey = (n: SceneNode) => {
          try {
            if (!n || (n as any).removed) return;
            if ('componentPropertyReferences' in n && (n as any).componentPropertyReferences) {
              const rawRefs = (n as any).componentPropertyReferences;
              const refs: Record<string, string> = {};
              let changed = false;
              for (const [refName, boundKey] of Object.entries(rawRefs)) {
                if (boundKey === propKey) {
                  changed = true;
                } else if (typeof boundKey === 'string') {
                  refs[refName] = boundKey;
                }
              }
              if (changed) {
                try {
                  (n as any).componentPropertyReferences = Object.keys(refs).length > 0 ? refs : null;
                } catch (_) {}
              }
            }
          } catch (_) {}

          if ('children' in n && (n as any).children) {
            try {
              for (const ch of (n as any).children) {
                unbindKey(ch);
              }
            } catch (_) {}
          }
        };

        for (const v of variants) {
          unbindKey(v);
        }

        try {
          propertyHost.deleteComponentProperty(propKey);
          deletedProps.push(propKey.split('#')[0]);
        } catch (delErr) {
          console.warn(`[PurgeSync] Failed to deleteComponentProperty "${propKey}":`, delErr);
        }
      }
    }
  } catch (err) {
    console.warn('[PurgeSync] Warning in purgeIgnoredPropertiesAndReferencesSync:', err);
  }

  return deletedProps;
}
