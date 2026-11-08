import { ResolvedVariable } from '../types/variables';

export async function getAllRelevantVariablesForComponentSet(): Promise<ResolvedVariable[]> {
  const allVariables: ResolvedVariable[] = [];

  try {
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    const colMap = new Map<string, string>();
    for (const c of localCollections) {
      if (!c.name.trim().startsWith('_')) {
        colMap.set(c.id, c.name);
      }
    }

    const localVars = await figma.variables.getLocalVariablesAsync();
    for (const v of localVars) {
      const colName = colMap.get(v.variableCollectionId);
      if (!colName || colName.trim().startsWith('_')) continue;
      if (v.name.trim().startsWith('_')) continue;
      allVariables.push({
        variable: v,
        collectionName: colName,
      });
    }
  } catch (err) {
    console.warn('Error fetching local variables:', err);
  }

  // Check team libraries if available
  try {
    const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (const libCollection of libraryCollections) {
      if (libCollection.name.trim().startsWith('_')) continue;
      try {
        const varsDescriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          libCollection.key,
        );
        const relevantDescriptors = varsDescriptors.filter((d) => {
          if (d.name.trim().startsWith('_')) return false;
          const lower = d.name.toLowerCase();
          if (!lower.includes('constant') && /\/\d+$/.test(d.name.trim())) return false;
          return (
            lower.includes('layout') ||
            lower.includes('base') ||
            lower.includes('radius') ||
            lower.includes('constant') ||
            lower.includes('outline') ||
            lower.includes('border') ||
            lower.includes('surface') ||
            lower.includes('background') ||
            lower.includes('screen') ||
            lower.includes('none')
          );
        });

        const importedVars = await Promise.all(
          relevantDescriptors.map((v) => figma.variables.importVariableByKeyAsync(v.key).catch(() => null)),
        );
        for (const v of importedVars) {
          if (v && !v.name.trim().startsWith('_')) {
            allVariables.push({
              variable: v,
              collectionName: libCollection.name,
            });
          }
        }
      } catch (e) {
        console.warn(`Error importing from library ${libCollection.name}:`, e);
      }
    }
  } catch (e) {
    // teamLibrary might not be supported on all plans
  }

  return allVariables;
}

export function cleanHiddenWhiteFills(node: BaseNode) {
  if ('fills' in node && Array.isArray((node as any).fills)) {
    try {
      const fills = (node as any).fills as readonly Paint[];
      const filteredFills = fills.filter((paint) => {
        if (paint.type === 'SOLID') {
          const isHidden = paint.visible === false;
          const isWhite =
            Math.abs(paint.color.r - 1) < 0.002 &&
            Math.abs(paint.color.g - 1) < 0.002 &&
            Math.abs(paint.color.b - 1) < 0.002;

          if (isHidden && isWhite) {
            return false;
          }
        }
        return true;
      });

      if (filteredFills.length !== fills.length) {
        (node as any).fills = filteredFills;
      }
    } catch (err) {
      console.warn('Could not clean hidden white fills on node:', (node as any).name, err);
    }
  }
}

export function isTemporaryCollection(name: string): boolean {
  if (!name) return false;
  return name.trim().startsWith('_');
}

export function isDefaultCollection(name: string): boolean {
  if (!name) return false;
  return !isTemporaryCollection(name);
}

export function isAllowedCollection(name: string): boolean {
  if (!name) return false;
  return !name.trim().startsWith('_');
}

export function normalizeVarPath(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_–—.]+/g, '');
}

export function findVariableWithPriority(
  allVars: ResolvedVariable[],
  varName: string,
  preferredCol: 'metrics' | 'schemes' | 'layout' | string = 'metrics',
): Variable | undefined {
  if (!varName || varName.trim().startsWith('_')) return undefined;
  const baseName = varName.split('/').pop() || varName;
  const normVarName = normalizeVarPath(varName);
  const normPrefVarName = normalizeVarPath(`${preferredCol}/${varName}`);
  const normBaseName = normalizeVarPath(baseName);
  const lowerPrefCol = preferredCol.toLowerCase();

  const isColMatch = (colName: string) => {
    const c = colName.toLowerCase();
    return c === lowerPrefCol || c.endsWith('/' + lowerPrefCol) || c.endsWith(' / ' + lowerPrefCol);
  };

  const matchesExactOrPref = (vName: string) => {
    const norm = normalizeVarPath(vName);
    return (
      vName === varName ||
      vName === `${preferredCol}/${varName}` ||
      vName.endsWith(`/${varName}`) ||
      norm === normVarName ||
      norm === normPrefVarName ||
      norm.endsWith(`/${normVarName}`)
    );
  };

  const matchesBase = (vName: string) => {
    const norm = normalizeVarPath(vName);
    return (
      vName === baseName ||
      vName.endsWith(`/${baseName}`) ||
      norm === normBaseName ||
      norm.endsWith(`/${normBaseName}`)
    );
  };

  // 1. Search matching preferred collection, giving absolute priority to REMOTE (library) variables!
  const colCandidates = allVars.filter(
    (item) =>
      isDefaultCollection(item.collectionName) &&
      !item.variable.name.trim().startsWith('_') &&
      isColMatch(item.collectionName) &&
      matchesExactOrPref(item.variable.name),
  );
  if (colCandidates.length > 0) {
    const remote = colCandidates.find((c) => (c.variable as any).remote === true);
    return (remote || colCandidates[0]).variable;
  }

  // 2. Search all allowed collections, giving absolute priority to REMOTE (library) variables!
  const anyCandidates = allVars.filter(
    (item) =>
      isDefaultCollection(item.collectionName) &&
      !item.variable.name.trim().startsWith('_') &&
      matchesExactOrPref(item.variable.name),
  );
  if (anyCandidates.length > 0) {
    const remote = anyCandidates.find((c) => (c.variable as any).remote === true);
    return (remote || anyCandidates[0]).variable;
  }

  // 3. Fallback to base name, giving priority to REMOTE (library) variables!
  const baseCandidates = allVars.filter(
    (item) =>
      isDefaultCollection(item.collectionName) &&
      !item.variable.name.trim().startsWith('_') &&
      matchesBase(item.variable.name),
  );
  if (baseCandidates.length > 0) {
    const remote = baseCandidates.find((c) => (c.variable as any).remote === true);
    return (remote || baseCandidates[0]).variable;
  }

  return undefined;
}

export function findColorVariableWithPriority(
  allVars: ResolvedVariable[],
  colorNames: string[],
): Variable | undefined {
  // Search strictly in default collections (not starting with '_') and never allow tonal steps (e.g. primary/0)
  for (const name of colorNames) {
    if (!name || name.trim().startsWith('_')) continue;
    const normName = normalizeVarPath(name);
    const normSchemesName = normalizeVarPath(`schemes/${name}`);
    const matches = allVars.filter(
      (item) =>
        isDefaultCollection(item.collectionName) &&
        !item.variable.name.trim().startsWith('_') &&
        !/\/\d+$/.test(item.variable.name.trim()) &&
        (item.variable.name === name ||
          item.variable.name === `schemes/${name}` ||
          item.variable.name.endsWith(`/${name}`) ||
          normalizeVarPath(item.variable.name) === normName ||
          normalizeVarPath(item.variable.name) === normSchemesName ||
          normalizeVarPath(item.variable.name).endsWith(`/${normName}`)),
    );
    if (matches.length > 0) {
      const remote = matches.find((m) => (m.variable as any).remote === true);
      return (remote || matches[0]).variable;
    }
  }

  return undefined;
}

export async function isVariableFromAllowedCollection(
  varId: string,
  varCollectionCache: Map<string, string>,
): Promise<boolean> {
  let colName = varCollectionCache.get(varId);
  if (!colName) {
    try {
      const v = await figma.variables.getVariableByIdAsync(varId);
      if (v) {
        if (v.name.trim().startsWith('_')) return false;
        const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (col) {
          colName = col.name;
          varCollectionCache.set(varId, col.name);
        }
      }
    } catch (e) {}
  }
  if (!colName) return false;
  return isAllowedCollection(colName);
}

export async function bindOrReplaceField(
  node: SceneNode,
  fieldName: string,
  targetVariable: Variable | undefined,
  varCollectionCache: Map<string, string>,
) {
  if (!('setBoundVariable' in node)) return;

  const boundVars = (node as any).boundVariables;
  const currentBinding = boundVars ? boundVars[fieldName] : undefined;

  if (currentBinding && currentBinding.type === 'VARIABLE_ALIAS' && currentBinding.id) {
    const isAllowed = await isVariableFromAllowedCollection(currentBinding.id, varCollectionCache);
    if (!isAllowed) {
      // It's a foreign variable: replace with target default variable or unbind
      if (targetVariable) {
        try {
          (node as any).setBoundVariable(fieldName, targetVariable);
        } catch (e) {
          console.warn(`Could not replace foreign variable on ${fieldName}:`, e);
        }
      } else {
        try {
          (node as any).setBoundVariable(fieldName, null);
        } catch (e) {
          console.warn(`Could not unbind foreign variable on ${fieldName}:`, e);
        }
      }
    }
    return;
  }

  // Not currently bound: bind targetVariable if provided
  if (targetVariable) {
    try {
      (node as any).setBoundVariable(fieldName, targetVariable);
    } catch (e) {
      console.warn(`Could not bind ${fieldName}:`, e);
    }
  }
}

export async function bindRadiusOrReplaceForeign(
  node: SceneNode,
  targetRadiusVariable: Variable | undefined,
  varCollectionCache: Map<string, string>,
) {
  if (node.type === 'ELLIPSE' || 'arcData' in node || !('setBoundVariable' in node)) return;

  const boundVars = (node as any).boundVariables;
  const radiusFields = ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];

  let hasForeignRadius = false;
  let hasAllowedRadius = false;

  if (boundVars) {
    for (const field of radiusFields) {
      const binding = boundVars[field];
      if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
        const isAllowed = await isVariableFromAllowedCollection(binding.id, varCollectionCache);
        if (!isAllowed) {
          hasForeignRadius = true;
          try {
            (node as any).setBoundVariable(field, null);
          } catch (e) {}
        } else {
          hasAllowedRadius = true;
        }
      }
    }
  }

  if (hasForeignRadius || !hasAllowedRadius) {
    if (targetRadiusVariable) {
      if ('cornerRadius' in node) {
        try {
          (node as any).setBoundVariable('cornerRadius', targetRadiusVariable);
          return;
        } catch (e) {}
      }
      if ('topLeftRadius' in node) {
        try {
          (node as any).setBoundVariable('topLeftRadius', targetRadiusVariable);
          (node as any).setBoundVariable('topRightRadius', targetRadiusVariable);
          (node as any).setBoundVariable('bottomLeftRadius', targetRadiusVariable);
          (node as any).setBoundVariable('bottomRightRadius', targetRadiusVariable);
        } catch (e) {}
      }
    }
  }
}

export async function stripForeignVariablesFromNode(
  node: BaseNode,
  varCollectionCache: Map<string, string>,
  fallbackVars: {
    varNone?: Variable;
    varBorderColor?: Variable;
    varSurfaceBackground?: Variable;
  },
) {
  if (!node) return;

  if ('boundVariables' in node && (node as any).boundVariables) {
    const bound = (node as any).boundVariables;
    for (const field of Object.keys(bound)) {
      const binding = bound[field];
      if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
        const isAllowed = await isVariableFromAllowedCollection(binding.id, varCollectionCache);
        if (!isAllowed) {
          if (
            (field.includes('Spacing') || field.includes('padding') || field.includes('Radius')) &&
            fallbackVars.varNone &&
            'setBoundVariable' in node
          ) {
            try {
              (node as any).setBoundVariable(field, fallbackVars.varNone);
            } catch (e) {
              try { (node as any).setBoundVariable(field, null); } catch (e2) {}
            }
          } else if ('setBoundVariable' in node) {
            try {
              (node as any).setBoundVariable(field, null);
            } catch (e) {}
          }
        }
      }
    }
  }

  if ('fills' in node && Array.isArray((node as any).fills)) {
    try {
      const fills = (node as any).fills as readonly Paint[];
      let fillsChanged = false;
      const newFills = fills.map((paint) => {
        if ((paint as any).boundVariables?.color) {
          const varId = (paint as any).boundVariables.color.id;
          const colName = varCollectionCache.get(varId);
          if (colName && !isAllowedCollection(colName)) {
            fillsChanged = true;
            if (fallbackVars.varSurfaceBackground && paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', fallbackVars.varSurfaceBackground);
            } else {
              const p = { ...paint };
              delete (p as any).boundVariables;
              return p;
            }
          }
        }
        return paint;
      });
      if (fillsChanged) {
        (node as any).fills = newFills;
      }
    } catch (e) {}
  }

  if ('strokes' in node && Array.isArray((node as any).strokes)) {
    try {
      const strokes = (node as any).strokes as readonly Paint[];
      let strokesChanged = false;
      const newStrokes = strokes.map((paint) => {
        if ((paint as any).boundVariables?.color) {
          const varId = (paint as any).boundVariables.color.id;
          const colName = varCollectionCache.get(varId);
          if (colName && !isAllowedCollection(colName)) {
            strokesChanged = true;
            if (fallbackVars.varBorderColor && paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', fallbackVars.varBorderColor);
            } else {
              const p = { ...paint };
              delete (p as any).boundVariables;
              return p;
            }
          }
        }
        return paint;
      });
      if (strokesChanged) {
        (node as any).strokes = newStrokes;
      }
    } catch (e) {}
  }

  if ('children' in node && node.type !== 'INSTANCE') {
    for (const child of (node as any).children) {
      await stripForeignVariablesFromNode(child, varCollectionCache, fallbackVars);
    }
  }
}

export async function bindColorVariablesRecursively(node: SceneNode, allVars: ResolvedVariable[]): Promise<void> {
  const colorVars = allVars.filter((v) => v.variable.resolvedType === 'COLOR');
  if (colorVars.length === 0) return;

  const matchColor = (paint: SolidPaint, isText: boolean): Variable | null => {
    const r = paint.color.r;
    const g = paint.color.g;
    const b = paint.color.b;
    for (const item of colorVars) {
      const v = item.variable;
      try {
        const keys = Object.keys(v.valuesByMode);
        if (keys.length > 0) {
          const val = v.valuesByMode[keys[0]];
          if (val && typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val) {
            if (Math.abs(val.r - r) < 0.02 && Math.abs(val.g - g) < 0.02 && Math.abs(val.b - b) < 0.02) {
              return v;
            }
          }
        }
      } catch {}
    }
    return null;
  };

  if ('fills' in node && Array.isArray((node as any).fills)) {
    try {
      const fills = (node as any).fills as readonly Paint[];
      let changed = false;
      const newFills = fills.map((paint) => {
        if (paint.type === 'SOLID' && !(paint as any).boundVariables?.color) {
          const matchedVar = matchColor(paint, node.type === 'TEXT');
          if (matchedVar) {
            changed = true;
            return figma.variables.setBoundVariableForPaint(paint, 'color', matchedVar);
          }
        }
        return paint;
      });
      if (changed) (node as any).fills = newFills;
    } catch {}
  }

  if ('strokes' in node && Array.isArray((node as any).strokes)) {
    try {
      const strokes = (node as any).strokes as readonly Paint[];
      let changed = false;
      const newStrokes = strokes.map((paint) => {
        if (paint.type === 'SOLID' && !(paint as any).boundVariables?.color) {
          const matchedVar = matchColor(paint, false);
          if (matchedVar) {
            changed = true;
            return figma.variables.setBoundVariableForPaint(paint, 'color', matchedVar);
          }
        }
        return paint;
      });
      if (changed) (node as any).strokes = newStrokes;
    } catch {}
  }

  if ('children' in node && (node as any).type !== 'INSTANCE') {
    for (const child of (node as any).children) {
      await bindColorVariablesRecursively(child, allVars);
    }
  }
}


export async function preloadBoundVariablesForRoots(
  roots: (ComponentSetNode | ComponentNode | FrameNode)[]
): Promise<Map<string, Variable>> {
  const varIds = new Set<string>();
  const collectFromNode = (n: BaseNode) => {
    const bv = (n as any).boundVariables;
    if (bv && typeof bv === 'object') {
      for (const val of Object.values(bv)) {
        if (!val) continue;
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof (item as any).id === 'string') varIds.add((item as any).id);
          }
        } else if (typeof (val as any).id === 'string') {
          varIds.add((val as any).id);
        }
      }
    }
  };

  for (const root of roots) {
    collectFromNode(root);
    if ('findAll' in root && typeof root.findAll === 'function') {
      const descendants = root.findAll(() => true);
      for (const d of descendants) collectFromNode(d);
    }
  }

  const varMap = new Map<string, Variable>();
  await Promise.all(
    Array.from(varIds).map(async (id) => {
      try {
        const v = (figma.variables.getVariableById ? figma.variables.getVariableById(id) : null) ||
          (figma.variables.getVariableByIdAsync ? await figma.variables.getVariableByIdAsync(id) : null);
        if (v) varMap.set(id, v);
      } catch (e) {}
    })
  );

  try {
    await ensureTemporaryMetricsCollection();
  } catch (_) {}

  try {
    const relevant = await getAllRelevantVariablesForComponentSet();
    for (const item of relevant) {
      if (item && item.variable) {
        varMap.set(item.variable.id, item.variable);
      }
    }
  } catch (_) {}

  return varMap;
}

/**
 * Converts a FrameNode into a ComponentNode using low-level `figma.createComponent()`
 * WITHOUT calling `figma.createComponentFromNode()` (which commits an internal Undo boundary in Figma's C++ engine).
 * Preserves 100% of frame styling, auto-layout, strokes, effects, corner radii, boundVariables, and children.
 */

let metricsCollectionPromise: Promise<void> | null = null;

export async function ensureTemporaryMetricsCollection(): Promise<void> {
  if (metricsCollectionPromise) {
    return metricsCollectionPromise;
  }

  metricsCollectionPromise = (async () => {
    try {
      const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
      let allVars = await getAllRelevantVariablesForComponentSet();

      // Explicitly search available team libraries for Constant/1 before deciding to create a local stub
      let libraryConstantOne = allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          !v.variable.name.trim().startsWith('_') &&
          (normalizeVarPath(v.variable.name) === 'constant/1' ||
            normalizeVarPath(v.variable.name) === 'constant/one' ||
            normalizeVarPath(v.variable.name).endsWith('/constant/1') ||
            normalizeVarPath(v.variable.name).endsWith('/constant/one'))
      );

      if (!libraryConstantOne) {
        try {
          const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
          for (const libCollection of libraryCollections) {
            if (libCollection.name.trim().startsWith('_')) continue;
            try {
              const descriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCollection.key);
              const constDesc = descriptors.find((d) => {
                if (d.name.trim().startsWith('_')) return false;
                const norm = normalizeVarPath(d.name);
                return (
                  norm === 'constant/1' ||
                  norm === 'constant/one' ||
                  norm.endsWith('/constant/1') ||
                  norm.endsWith('/constant/one')
                );
              });
              if (constDesc) {
                const imported = await figma.variables.importVariableByKeyAsync(constDesc.key).catch(() => null);
                if (imported) {
                  libraryConstantOne = {
                    variable: imported,
                    collectionName: libCollection.name,
                  };
                  allVars.push(libraryConstantOne);
                  break;
                }
              }
            } catch (e) {
              console.warn(`Error searching Constant/1 in library ${libCollection.name}:`, e);
            }
          }
        } catch (e) {}
      }

      // Check if DEFAULT settings exist (priority!)
      const hasDefaultLayout = !!allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          (v.variable.name === 'Layout/Base' ||
            v.variable.name === 'layout/base' ||
            v.variable.name.endsWith('/Layout/Base') ||
            v.variable.name.endsWith('/layout/base') ||
            normalizeVarPath(v.variable.name) === 'layout/base' ||
            normalizeVarPath(v.variable.name).endsWith('/layout/base')),
      );
      const hasDefaultRadius = !!allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          (v.variable.name === 'Radius/Container/Base' ||
            v.variable.name === 'radius/container/base' ||
            v.variable.name === 'Radius/Base' ||
            v.variable.name === 'radius/base' ||
            v.variable.name.endsWith('/Radius/Container/Base') ||
            v.variable.name.endsWith('/radius/container/base') ||
            v.variable.name.endsWith('/Radius/Base') ||
            v.variable.name.endsWith('/radius/base') ||
            normalizeVarPath(v.variable.name) === 'radius/container/base' ||
            normalizeVarPath(v.variable.name) === 'radius/base' ||
            normalizeVarPath(v.variable.name).endsWith('/radius/container/base') ||
            normalizeVarPath(v.variable.name).endsWith('/radius/base')),
      );
      const hasDefaultBorder = !!allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          (v.variable.name === 'Constant/1' ||
            v.variable.name === 'constant/1' ||
            v.variable.name === 'Constant/One' ||
            v.variable.name === 'constant/one' ||
            v.variable.name.endsWith('/Constant/1') ||
            v.variable.name.endsWith('/constant/1') ||
            v.variable.name.endsWith('/Constant/One') ||
            v.variable.name.endsWith('/constant/one') ||
            normalizeVarPath(v.variable.name) === 'constant/1' ||
            normalizeVarPath(v.variable.name) === 'constant/one' ||
            normalizeVarPath(v.variable.name).endsWith('/constant/1') ||
            normalizeVarPath(v.variable.name).endsWith('/constant/one')),
      );
      const hasDefaultColor = !!allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          (v.variable.name === 'OutlineBase' ||
            v.variable.name === 'outlineBase' ||
            v.variable.name === 'outlineHighest' ||
            v.variable.name.endsWith('OutlineBase') ||
            v.variable.name.endsWith('outlineBase') ||
            normalizeVarPath(v.variable.name) === 'outlinebase'),
      );
      const hasDefaultSurface = !!allVars.find(
        (v) =>
          isDefaultCollection(v.collectionName) &&
          (v.variable.name === 'SurfaceBackground' ||
            v.variable.name === 'surfaceBackground' ||
            v.variable.name.endsWith('SurfaceBackground') ||
            v.variable.name.endsWith('surfaceBackground') ||
            normalizeVarPath(v.variable.name) === 'surfacebackground'),
      );

      // If default variable settings exist, we use them - do not create metrics!
      if (hasDefaultLayout && hasDefaultRadius && hasDefaultBorder && hasDefaultColor && hasDefaultSurface) {
        return;
      }

      // Check if Metrics / metrics collection already exists locally
      let targetCol = localCollections.find((c) => c.name.toLowerCase() === 'metrics');

      if (!targetCol) {
        try {
          targetCol = figma.variables.createVariableCollection('Metrics');
        } catch (e: any) {
          console.warn('Could not create collection Metrics:', e);
          if (localCollections.length > 0) {
            targetCol = localCollections.find((c) => !c.name.trim().startsWith('_')) || null;
          }
          if (!targetCol) {
            return;
          }
        }
      } else if (targetCol.name !== 'Metrics') {
        try {
          targetCol.name = 'Metrics';
        } catch (e) {}
      }

      const defaultModeId = targetCol.modes[0].modeId;

      // Query variables in targetCol directly so we never throw duplicate errors
      const existingVarsInCol = (
        await Promise.all(
          targetCol.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
        )
      ).filter((v): v is Variable => v !== null);

      // Keep only required variables; if library Constant/1 exists, remove redundant local stub
      for (const v of existingVarsInCol) {
        const lower = v.name.toLowerCase();
        if (lower === 'outlinebase') {
          if (v.name !== 'OutlineBase') {
            try { v.name = 'OutlineBase'; } catch (e) {}
          }
        } else if (lower === 'surfacebackground') {
          if (v.name !== 'SurfaceBackground') {
            try { v.name = 'SurfaceBackground'; } catch (e) {}
          }
        } else if (lower === 'constant/1' || lower === 'constant/one') {
          // If library Constant/1 is already imported, remove local duplicate stub!
          if (libraryConstantOne && libraryConstantOne.variable.id !== v.id) {
            try {
              allVars = allVars.filter((item) => item.variable.id !== v.id);
              v.remove();
            } catch (e) {}
          } else if (v.name !== 'Constant/1') {
            try { v.name = 'Constant/1'; } catch (e) {}
          }
        } else if (lower === 'layout/base') {
          if (v.name !== 'Layout/Base') {
            try { v.name = 'Layout/Base'; } catch (e) {}
          }
        } else if (lower === 'radius/container/base' || lower === 'radius/base') {
          if (v.name !== 'Radius/Container/Base') {
            try { v.name = 'Radius/Container/Base'; } catch (e) {}
          }
        } else {
          try {
            allVars = allVars.filter((item) => item.variable.id !== v.id);
            v.remove();
          } catch (e) {}
        }
      }

      const remainingVarsInCol = (
        await Promise.all(
          targetCol.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
        )
      ).filter((v): v is Variable => v !== null);

      const colVarMap = new Map<string, Variable>();
      for (const v of remainingVarsInCol) {
        colVarMap.set(v.name.toLowerCase(), v);
      }

      const ensureVar = (
        name: string,
        type: VariableResolvedDataType,
        val: any,
        scopes: VariableScope[],
        description?: string,
      ): Variable | undefined => {
        // If Constant/1 is available from a library, use it and never create a local stub
        if (normalizeVarPath(name) === 'constant/1') {
          if (libraryConstantOne) return libraryConstantOne.variable;
        }

        const inCol = colVarMap.get(name.toLowerCase());
        if (inCol) return inCol;

        const existing = allVars.find(
          (v) =>
            (v.variable.name.toLowerCase() === name.toLowerCase() ||
              normalizeVarPath(v.variable.name) === normalizeVarPath(name)) &&
            isAllowedCollection(v.collectionName),
        );
        if (existing) return existing.variable;

        try {
          const v = figma.variables.createVariable(name, targetCol!, type);
          v.setValueForMode(defaultModeId, val);
          if (scopes && scopes.length > 0) {
            v.scopes = scopes;
          }
          if (description) {
            v.description = description;
          }
          colVarMap.set(name.toLowerCase(), v);
          allVars.push({ variable: v, collectionName: targetCol!.name });
          return v;
        } catch (err) {
          console.warn(`Could not create variable ${name}:`, err);
          return undefined;
        }
      };

      ensureVar('OutlineBase', 'COLOR', { r: 0.85, g: 0.85, b: 0.85, a: 1 }, ['STROKE_COLOR'], 'Baseline component outline');
      ensureVar('SurfaceBackground', 'COLOR', { r: 1, g: 1, b: 1, a: 1 }, ['FRAME_FILL'], 'Baseline surface background');
      ensureVar('Constant/1', 'FLOAT', 1, ['STROKE_FLOAT', 'GAP', 'CORNER_RADIUS', 'WIDTH_HEIGHT'], 'Constant 1px border');
      ensureVar('Layout/Base', 'FLOAT', 12, ['GAP'], 'Base spacing (12px)');
      ensureVar('Radius/Container/Base', 'FLOAT', 12, ['CORNER_RADIUS'], 'Base container radius (12px)');
    } finally {
      metricsCollectionPromise = null;
    }
  })();

  return metricsCollectionPromise;
}

