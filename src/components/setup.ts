import {
  resolveComponentSetConflicts,
  sanitizeComponentProperties,
  sanitizeInstanceProperties
} from '../properties/sanitizer';
import { sanitizeLayerNames } from '../renamer/frameClassifier';
import { applySlotMetricsAndVariables, findDirectSlotContainers } from '../slots/slots';
import { toCamelCase, toPascalCase } from '../utils/strings';
import {
  bindColorVariablesRecursively,
  bindOrReplaceField,
  bindRadiusOrReplaceForeign,
  cleanHiddenWhiteFills,
  findColorVariableWithPriority,
  findVariableWithPriority,
  getAllRelevantVariablesForComponentSet,
  isAllowedCollection,
  isDefaultCollection,
  normalizeVarPath,
  stripForeignVariablesFromNode,
  ensureTemporaryMetricsCollection
} from '../variables/variables';
import { sendSelectionToUI } from '../retextifier/retextifier';

export async function setupComponentSets(nodes: readonly ComponentSetNode[]) {
  await ensureTemporaryMetricsCollection();
  let allVars = await getAllRelevantVariablesForComponentSet();

  let varGap = findVariableWithPriority(allVars, 'Layout/Base', 'Metrics') || findVariableWithPriority(allVars, 'layout/base', 'Metrics');
  let varPadding = findVariableWithPriority(allVars, 'Layout/Base', 'Metrics') || findVariableWithPriority(allVars, 'layout/base', 'Metrics');
  let varRadius = findVariableWithPriority(allVars, 'Radius/Container/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/container/base', 'Metrics') || findVariableWithPriority(allVars, 'Radius/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/base', 'Metrics');
  let varBorder = findVariableWithPriority(allVars, 'Constant/1', 'Metrics') || findVariableWithPriority(allVars, 'constant/1', 'Metrics') || findVariableWithPriority(allVars, 'Constant/One', 'Metrics') || findVariableWithPriority(allVars, 'constant/one', 'Metrics');
  let varNone = findVariableWithPriority(allVars, 'constant/none', 'Metrics') || findVariableWithPriority(allVars, 'none', 'Metrics') || findVariableWithPriority(allVars, 'constant/zero', 'Metrics');
  let varBorderColor = findColorVariableWithPriority(allVars, ['OutlineBase', 'outlineBase', 'outlineHighest', 'outline']);

  const varCollectionCache = new Map<string, string>();
  for (const item of allVars) {
    varCollectionCache.set(item.variable.id, item.collectionName);
  }

  const ensureScope = (variable: Variable, requiredScope: VariableScope) => {
    if (
      variable.scopes.indexOf(requiredScope) === -1 &&
      variable.scopes.indexOf('ALL_SCOPES' as any) === -1
    ) {
      variable.scopes = [...variable.scopes, requiredScope];
    }
  };

  try {
    if (varGap) ensureScope(varGap, 'GAP');
    if (varPadding) ensureScope(varPadding, 'GAP');
    if (varRadius) ensureScope(varRadius, 'CORNER_RADIUS');
    if (varBorder) ensureScope(varBorder, 'STROKE_FLOAT');
    if (varNone) {
      ensureScope(varNone, 'GAP');
      ensureScope(varNone, 'CORNER_RADIUS');
    }
  } catch (e) {
    console.warn('Unable to update variable scopes:', e);
  }

  let totalSuccess = 0;
  const errors: string[] = [];

  for (const node of nodes) {
    try {
      // 0. Resolve any variant conflicts on this component set first
      try {
        await resolveComponentSetConflicts(node);
      } catch (errConflicts) {
        console.warn(`Could not auto-resolve conflicts on "${node.name}":`, errConflicts);
      }

      try { cleanHiddenWhiteFills(node); } catch (e) {}
      try { await sanitizeComponentProperties(node); } catch (e) { console.warn('sanitizeComponentProperties error:', e); }
      try { sanitizeLayerNames(node); } catch (e) {}

      // Strip any foreign variables on this component set and its nested layers
      try {
        await stripForeignVariablesFromNode(node, varCollectionCache, {
          varNone,
          varBorderColor,
        });
      } catch (e) {
        console.warn('stripForeignVariablesFromNode error:', e);
      }

      try {
        node.layoutMode = 'VERTICAL';
        node.layoutWrap = 'NO_WRAP';
        node.primaryAxisSizingMode = 'AUTO';
        node.counterAxisSizingMode = 'AUTO';
      } catch (layoutErr: any) {
        console.warn(`Could not set layoutMode on "${node.name}":`, layoutErr);
        errors.push(`${node.name} [layoutMode] -> ${layoutErr?.message || layoutErr}`);
      }

      try {
        node.fills = [];
      } catch (e) {}

      const safeBind = (prop: any, variable: Variable | undefined) => {
        if (!variable) return;
        try {
          node.setBoundVariable(prop, variable);
        } catch (e: any) {
          errors.push(`${node.name} [${prop}] -> ${e.message}`);
        }
      };

      safeBind('itemSpacing', varGap);
      safeBind('counterAxisSpacing', varGap);
      safeBind('paddingTop', varPadding);
      safeBind('paddingBottom', varPadding);
      safeBind('paddingLeft', varPadding);
      safeBind('paddingRight', varPadding);

      if (varRadius) {
        try {
          node.setBoundVariable('cornerRadius', varRadius);
        } catch (err) {
          safeBind('topLeftRadius', varRadius);
          safeBind('topRightRadius', varRadius);
          safeBind('bottomLeftRadius', varRadius);
          safeBind('bottomRightRadius', varRadius);
        }
      }

      if ('cornerSmoothing' in node) {
        try {
          node.cornerSmoothing = 0.6;
        } catch (e) {}
      }

      try {
        node.dashPattern = [4, 4];
        node.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
        if (varBorderColor) {
          const newStrokes = [...(node.strokes as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varBorderColor);
            }
            return paint;
          });
          node.strokes = newStrokes;
        }
        if (varBorder) {
          safeBind('strokeWeight', varBorder);
        }
      } catch (e: any) {
        errors.push(`${node.name} [strokes] -> ${e.message}`);
      }

      // Ensure all child variants have Auto Layout configured and variables checked
      for (const child of node.children) {
        try { cleanHiddenWhiteFills(child); } catch (e) {}
        try { sanitizeLayerNames(child); } catch (e) {}
        if (child.type === 'COMPONENT') {
          if (child.layoutMode === 'NONE') {
            try {
              child.layoutMode = 'HORIZONTAL';
              child.primaryAxisSizingMode = 'AUTO';
              child.counterAxisSizingMode = 'AUTO';
            } catch (e) {
              console.warn(`Could not set auto layout on variant "${child.name}":`, e);
            }
          }
          if (varNone) {
            try {
              if (child.layoutMode !== 'NONE') {
                await bindOrReplaceField(child, 'itemSpacing', varNone, varCollectionCache);
                await bindOrReplaceField(child, 'counterAxisSpacing', varNone, varCollectionCache);
                if (child.paddingTop === 0) await bindOrReplaceField(child, 'paddingTop', varNone, varCollectionCache);
                if (child.paddingBottom === 0) await bindOrReplaceField(child, 'paddingBottom', varNone, varCollectionCache);
                if (child.paddingLeft === 0) await bindOrReplaceField(child, 'paddingLeft', varNone, varCollectionCache);
                if (child.paddingRight === 0) await bindOrReplaceField(child, 'paddingRight', varNone, varCollectionCache);
              }
              await bindRadiusOrReplaceForeign(child, varNone, varCollectionCache);
              if ('cornerSmoothing' in child) {
                child.cornerSmoothing = 0.6;
              }
            } catch (e) {
              console.warn(`Could not bind varNone on variant "${child.name}":`, e);
            }
          }
        }
      }

      totalSuccess++;
    } catch (nodeErr: any) {
      console.error(`Error configuring component set "${node.name}":`, nodeErr);
      errors.push(`${node.name}: ${nodeErr?.message || nodeErr}`);
    }
  }

  if (errors.length > 0) {
    figma.notify(`Configured ${totalSuccess} Component Set(s) with warnings: ${errors[0]}`);
  } else {
    figma.notify(`Configured ${totalSuccess} Component Set${totalSuccess > 1 ? 's' : ''}! ⚡`);
  }
}

export async function applyVariantMetrics(selection: readonly SceneNode[]) {
  await ensureTemporaryMetricsCollection();
  let allVars = await getAllRelevantVariablesForComponentSet();

  let varNone = findVariableWithPriority(allVars, 'constant/none', 'Metrics') || findVariableWithPriority(allVars, 'none', 'Metrics') || findVariableWithPriority(allVars, 'constant/zero', 'Metrics');
  let varLayoutBase = findVariableWithPriority(allVars, 'Layout/Base', 'Metrics') || findVariableWithPriority(allVars, 'layout/base', 'Metrics');
  let varLayoutMassive = findVariableWithPriority(allVars, 'layout/massive', 'Metrics');
  let varLayoutLarge = findVariableWithPriority(allVars, 'layout/large', 'Metrics');
  let varRadiusBase = findVariableWithPriority(allVars, 'Radius/Container/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/container/base', 'Metrics') || findVariableWithPriority(allVars, 'Radius/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/base', 'Metrics');
  let varRadiusExtraHuge = findVariableWithPriority(allVars, 'radius/container/extraHuge', 'Metrics');
  let varRadiusExtraLarge = findVariableWithPriority(allVars, 'radius/container/extraLarge', 'Metrics');
  let varRadiusHuge = findVariableWithPriority(allVars, 'radius/container/huge', 'Metrics');
  let varBorderOne = findVariableWithPriority(allVars, 'Constant/1', 'Metrics') || findVariableWithPriority(allVars, 'constant/1', 'Metrics') || findVariableWithPriority(allVars, 'Constant/One', 'Metrics') || findVariableWithPriority(allVars, 'constant/one', 'Metrics');
  let varOutlineBase = findColorVariableWithPriority(allVars, ['OutlineBase', 'outlineBase', 'outlineHighest', 'outline']);
  let varSurfaceBackground = findColorVariableWithPriority(allVars, ['SurfaceBackground', 'surfaceBackground', 'background', 'surface']);
  let varMaxWidthScreen = findVariableWithPriority(allVars, 'maxWidth/screen', 'layout');
  let varMaxHeightScreen = findVariableWithPriority(allVars, 'maxHeight/screen', 'layout');

  const varCollectionCache = new Map<string, string>();
  for (const item of allVars) {
    varCollectionCache.set(item.variable.id, item.collectionName);
  }

  const ensureScope = (variable: Variable, requiredScope: VariableScope) => {
    if (
      variable.scopes.indexOf(requiredScope) === -1 &&
      variable.scopes.indexOf('ALL_SCOPES' as any) === -1
    ) {
      variable.scopes = [...variable.scopes, requiredScope];
    }
  };

  try {
    if (varNone) ensureScope(varNone, 'GAP');
    if (varRadiusBase) ensureScope(varRadiusBase, 'CORNER_RADIUS');
    if (varRadiusExtraHuge) ensureScope(varRadiusExtraHuge, 'CORNER_RADIUS');
    if (varRadiusExtraLarge) ensureScope(varRadiusExtraLarge, 'CORNER_RADIUS');
    if (varRadiusHuge) ensureScope(varRadiusHuge, 'CORNER_RADIUS');
    if (varBorderOne) ensureScope(varBorderOne, 'STROKE_FLOAT');
    if (varLayoutBase) ensureScope(varLayoutBase, 'GAP');
    if (varLayoutMassive) ensureScope(varLayoutMassive, 'GAP');
    if (varLayoutLarge) ensureScope(varLayoutLarge, 'GAP');
    if (varMaxWidthScreen) ensureScope(varMaxWidthScreen, 'WIDTH_HEIGHT');
    if (varMaxHeightScreen) ensureScope(varMaxHeightScreen, 'WIDTH_HEIGHT');
  } catch (e) {
    console.warn('Unable to update variable scopes:', e);
  }

  let count = 0;
  for (const node of selection) {
    try {
      try { cleanHiddenWhiteFills(node); } catch (e) {}
      try { await sanitizeComponentProperties(node); } catch (e) {}
      try { sanitizeLayerNames(node); } catch (e) {}

      // Strip foreign variables from this node and all sublayers
      try {
        await stripForeignVariablesFromNode(node, varCollectionCache, {
          varNone,
          varBorderColor: varOutlineBase,
          varSurfaceBackground,
        });
      } catch (e) {}

      // Automatically bind theme/design-system color variables to all solid fills and strokes
      try {
        await bindColorVariablesRecursively(node, allVars);
      } catch (e) {}

    const isFigmaSection = node.type === 'SECTION';
    const isFrameSection = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'section';
    const isMainLayer = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'main';
    const isComponentLayer = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'component';
    const isScreenLayer = (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || 'layoutMode' in node) && node.name.trim().toLowerCase() === 'screen';

    if (isFigmaSection) {
      const radiusToUse = varRadiusExtraHuge || varRadiusBase;
      try {
        if ('setBoundVariable' in node && radiusToUse) {
          (node as any).setBoundVariable('cornerRadius', radiusToUse);
        }
        if ('topLeftRadius' in node && radiusToUse) {
          node.setBoundVariable('topLeftRadius', radiusToUse);
          node.setBoundVariable('topRightRadius', radiusToUse);
          node.setBoundVariable('bottomLeftRadius', radiusToUse);
          node.setBoundVariable('bottomRightRadius', radiusToUse);
        }
        if ('cornerSmoothing' in node) {
          node.cornerSmoothing = 0.6;
        }

        if (varSurfaceBackground && 'fills' in node) {
          node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          const newFills = [...(node.fills as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varSurfaceBackground);
            }
            return paint;
          });
          node.fills = newFills;
        }

        if ('strokes' in node) {
          try {
            (node as any).strokes = [];
          } catch (err) {}
        }

        count++;
      } catch (e) {
        console.error('Error assigning radius to section:', e);
      }
    } else if (isFrameSection) {
      try {
        const layoutToUse = varLayoutMassive || varLayoutBase;
        if ('layoutMode' in node && node.layoutMode !== 'NONE' && layoutToUse) {
          node.setBoundVariable('itemSpacing', layoutToUse);
          node.setBoundVariable('counterAxisSpacing', layoutToUse);
          node.setBoundVariable('paddingTop', layoutToUse);
          node.setBoundVariable('paddingBottom', layoutToUse);
          node.setBoundVariable('paddingLeft', layoutToUse);
          node.setBoundVariable('paddingRight', layoutToUse);
        }
        if (varNone) {
          if ('cornerRadius' in node) {
            (node as any).setBoundVariable('cornerRadius', varNone);
          }
          if ('topLeftRadius' in node) {
            node.setBoundVariable('topLeftRadius', varNone);
            node.setBoundVariable('topRightRadius', varNone);
            node.setBoundVariable('bottomLeftRadius', varNone);
            node.setBoundVariable('bottomRightRadius', varNone);
          }
        }

        if (varSurfaceBackground && 'fills' in node) {
          node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          const newFills = [...(node.fills as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varSurfaceBackground);
            }
            return paint;
          });
          node.fills = newFills;
        }

        if ('strokes' in node) {
          try {
            (node as any).strokes = [];
          } catch (err) {}
        }

        count++;
      } catch (e) {
        console.error("Error configuring 'section' frame:", e);
      }
    } else if (isMainLayer) {
      try {
        if ('layoutMode' in node && node.layoutMode !== 'NONE' && varNone) {
          node.setBoundVariable('itemSpacing', varNone);
          node.setBoundVariable('counterAxisSpacing', varNone);
          node.setBoundVariable('paddingTop', varNone);
          node.setBoundVariable('paddingBottom', varNone);
          node.setBoundVariable('paddingLeft', varNone);
          node.setBoundVariable('paddingRight', varNone);
        }
        const radiusToUse = varRadiusExtraLarge || varRadiusBase;
        if ('topLeftRadius' in node && radiusToUse) {
          node.setBoundVariable('topLeftRadius', radiusToUse);
          node.setBoundVariable('topRightRadius', radiusToUse);
          node.setBoundVariable('bottomLeftRadius', radiusToUse);
          node.setBoundVariable('bottomRightRadius', radiusToUse);
        }
        if ('cornerSmoothing' in node) {
          node.cornerSmoothing = 0.6;
        }

        if (varOutlineBase && varBorderOne && 'strokes' in node) {
          node.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
          const newStrokes = [...(node.strokes as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varOutlineBase);
            }
            return paint;
          });
          node.strokes = newStrokes;
          node.setBoundVariable('strokeWeight', varBorderOne);
        }

        count++;
      } catch (e) {
        console.error("Error configuring 'main' frame:", e);
      }
    } else if (isComponentLayer) {
      try {
        const gapToUse = varLayoutLarge || varLayoutBase;
        if ('layoutMode' in node && node.layoutMode !== 'NONE' && gapToUse) {
          node.setBoundVariable('itemSpacing', gapToUse);
          node.setBoundVariable('counterAxisSpacing', gapToUse);
          if (varNone) {
            node.setBoundVariable('paddingTop', varNone);
            node.setBoundVariable('paddingBottom', varNone);
            node.setBoundVariable('paddingLeft', varNone);
            node.setBoundVariable('paddingRight', varNone);
          }
        }
        if (varNone) {
          if ('cornerRadius' in node) {
            (node as any).setBoundVariable('cornerRadius', varNone);
          }
          if ('topLeftRadius' in node) {
            node.setBoundVariable('topLeftRadius', varNone);
            node.setBoundVariable('topRightRadius', varNone);
            node.setBoundVariable('bottomLeftRadius', varNone);
            node.setBoundVariable('bottomRightRadius', varNone);
          }
        }
        count++;
      } catch (e) {
        console.error("Error configuring 'component' frame:", e);
      }
    } else if (isScreenLayer) {
      try {
        if ('layoutMode' in node && node.layoutMode !== 'NONE' && varNone) {
          node.setBoundVariable('itemSpacing', varNone);
          node.setBoundVariable('counterAxisSpacing', varNone);
          node.setBoundVariable('paddingTop', varNone);
          node.setBoundVariable('paddingBottom', varNone);
          node.setBoundVariable('paddingLeft', varNone);
          node.setBoundVariable('paddingRight', varNone);
        }
        const radiusToUse = varRadiusHuge || varRadiusExtraHuge || varRadiusBase;
        if (radiusToUse) {
          if ('cornerRadius' in node) {
            (node as any).setBoundVariable('cornerRadius', radiusToUse);
          }
          if ('topLeftRadius' in node) {
            node.setBoundVariable('topLeftRadius', radiusToUse);
            node.setBoundVariable('topRightRadius', radiusToUse);
            node.setBoundVariable('bottomLeftRadius', radiusToUse);
            node.setBoundVariable('bottomRightRadius', radiusToUse);
          }
          if ('cornerSmoothing' in node) {
            node.cornerSmoothing = 0.6;
          }
        }

        if (varSurfaceBackground && 'fills' in node) {
          node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          const newFills = [...(node.fills as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varSurfaceBackground);
            }
            return paint;
          });
          node.fills = newFills;
        }

        if (varMaxWidthScreen && 'setBoundVariable' in node) {
          try {
            node.setBoundVariable('minWidth', varMaxWidthScreen);
            node.setBoundVariable('maxWidth', varMaxWidthScreen);
          } catch (err) {
            console.warn("Could not bind minWidth/maxWidth to screen:", err);
          }
        }

        if (varMaxHeightScreen && 'setBoundVariable' in node) {
          try {
            node.setBoundVariable('minHeight', varMaxHeightScreen);
            node.setBoundVariable('maxHeight', varMaxHeightScreen);
          } catch (err) {
            console.warn("Could not bind minHeight/maxHeight to screen:", err);
          }
        }

        count++;
      } catch (e) {
        console.error("Error configuring 'screen' frame:", e);
      }
    } else if (node.type === 'COMPONENT') {
      try {
        if ('layoutMode' in node && node.layoutMode === 'NONE') {
          node.layoutMode = 'HORIZONTAL';
          node.primaryAxisSizingMode = 'AUTO';
          node.counterAxisSizingMode = 'AUTO';
        }
        if (varNone) {
          if ('layoutMode' in node && node.layoutMode !== 'NONE') {
            await bindOrReplaceField(node, 'itemSpacing', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'counterAxisSpacing', varNone, varCollectionCache);
            if (node.paddingTop === 0) await bindOrReplaceField(node, 'paddingTop', varNone, varCollectionCache);
            if (node.paddingBottom === 0) await bindOrReplaceField(node, 'paddingBottom', varNone, varCollectionCache);
            if (node.paddingLeft === 0) await bindOrReplaceField(node, 'paddingLeft', varNone, varCollectionCache);
            if (node.paddingRight === 0) await bindOrReplaceField(node, 'paddingRight', varNone, varCollectionCache);
          }
          await bindRadiusOrReplaceForeign(node, varNone, varCollectionCache);
          if ('cornerSmoothing' in node) {
            node.cornerSmoothing = 0.6;
          }
        }
        count++;
      } catch (e) {
        console.error("Error configuring variant with varNone:", e);
      }
    } else if ('setBoundVariable' in node) {
      try {
        if ('layoutMode' in node && node.layoutMode !== 'NONE') {
          if (varNone) {
            await bindOrReplaceField(node, 'itemSpacing', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'counterAxisSpacing', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'paddingTop', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'paddingBottom', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'paddingLeft', varNone, varCollectionCache);
            await bindOrReplaceField(node, 'paddingRight', varNone, varCollectionCache);
          }
        }
        if (varNone) {
          await bindRadiusOrReplaceForeign(node, varNone, varCollectionCache);
          if ('cornerSmoothing' in node) {
            node.cornerSmoothing = 0.6;
          }
        }
        count++;
      } catch (e) {
        console.error('Error binding variable:', e);
      }
    }
  } catch (errNode: any) {
    console.error(`Error applying metrics to node "${node.name}":`, errNode);
  }
}

  figma.notify(`Updated ${count} elements with base metrics! ⚡`);
}

export function needsSmartSetup(selection: readonly SceneNode[]): boolean {
  if (!selection || selection.length === 0) return false;

  const hasRadiusBound = (n: any): boolean => {
    const bv = n?.boundVariables;
    if (!bv) return false;
    return Boolean(bv.cornerRadius || bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius);
  };

  const hasSpacingBound = (n: any): boolean => {
    const bv = n?.boundVariables;
    if (!bv) return false;
    return Boolean(bv.itemSpacing || bv.paddingTop || bv.paddingBottom || bv.paddingLeft || bv.paddingRight);
  };

  const checkComponentSet = (cs: ComponentSetNode): boolean => {
    if (cs.layoutMode === 'NONE') return true;
    if (!cs.dashPattern || cs.dashPattern.length === 0) return true;
    if (!hasSpacingBound(cs) || !hasRadiusBound(cs)) return true;

    const defs = cs.componentPropertyDefinitions || {};
    for (const key of Object.keys(defs)) {
      const rawName = key.split('#')[0].trim();
      if (/^property\s*\d+$/i.test(rawName)) return true;
    }

    const variants = cs.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
    for (const v of variants) {
      if (v.layoutMode === 'NONE') return true;
      if (!hasRadiusBound(v)) return true;
    }
    return false;
  };

  for (const node of selection) {
    // 1. Standalone COMPONENT not wrapped in a COMPONENT_SET
    if (node.type === 'COMPONENT' && (!node.parent || node.parent.type !== 'COMPONENT_SET')) {
      return true;
    }

    // 2. COMPONENT_SET directly selected or as ancestor
    let hostSet: ComponentSetNode | null = null;
    if (node.type === 'COMPONENT_SET') {
      hostSet = node;
    } else {
      let curr: BaseNode | null = node.parent;
      while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
        if (curr.type === 'COMPONENT_SET') {
          hostSet = curr as ComponentSetNode;
          break;
        }
        curr = curr.parent;
      }
    }

    if (hostSet) {
      if (checkComponentSet(hostSet)) return true;
      continue;
    }

    // 3. Standalone FRAME or SECTION
    if (node.type === 'FRAME') {
      if (node.layoutMode === 'NONE') return true;
      if (!hasSpacingBound(node) && !hasRadiusBound(node)) return true;
    }
  }

  return false;
}

export async function runComponentSetLogic() {
  try {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify('Please select something on the canvas to configure Component Set.', { error: true });
      return;
    }

    // Pre-emptively ensure temporary collection with metrics and baseline tokens if variables are missing
    await ensureTemporaryMetricsCollection();

    // 1. Identify standalone components that are not already part of a component set
    const standaloneComponents = selection.filter(
      (node): node is ComponentNode => node.type === 'COMPONENT' && (!node.parent || node.parent.type !== 'COMPONENT_SET')
    );

    const newlyCreatedComponentSets: ComponentSetNode[] = [];
    const newlyCreatedVariants: ComponentNode[] = [];

    for (const comp of standaloneComponents) {
      cleanHiddenWhiteFills(comp);
      try {
        let originalName = comp.name.trim();
        if (/^frame(\s*\d+)?$/i.test(originalName)) {
          originalName = 'Container';
        } else {
          originalName = toPascalCase(originalName);
        }
        const parent = (comp.parent && 'children' in comp.parent) ? comp.parent : figma.currentPage;
        const compSet = figma.combineAsVariants([comp], parent as BaseNode & ChildrenMixin);
        compSet.name = originalName;

        // Rename Figma's default "Property 1" variant property to "Type=Default"
        try {
          if (typeof (compSet as any).editComponentProperty === 'function') {
            const defs = (compSet as any).componentPropertyDefinitions;
            if (defs) {
              for (const propKey of Object.keys(defs)) {
                const def = defs[propKey];
                const rawName = propKey.split('#')[0].trim();
                if (def.type === 'VARIANT' || /^property\s*\d+$/i.test(rawName)) {
                  try {
                    (compSet as any).editComponentProperty(propKey, { name: 'Type', defaultValue: 'Default' });
                  } catch (e1) {
                    try {
                      (compSet as any).editComponentProperty(rawName, { name: 'Type', defaultValue: 'Default' });
                    } catch (e2) {}
                  }
                }
              }
            }
          }
        } catch (errProp) {
          console.warn('Could not edit component property to Type:', errProp);
        }

        comp.name = 'Type=Default';

        if (comp.layoutMode === 'NONE') {
          comp.layoutMode = 'HORIZONTAL';
          comp.primaryAxisSizingMode = 'AUTO';
          comp.counterAxisSizingMode = 'AUTO';
        }

        newlyCreatedComponentSets.push(compSet);
        newlyCreatedVariants.push(comp);
      } catch (err: any) {
        console.error('Error combining component into component set:', err);
        figma.notify(`Could not convert "${comp.name}" to Component Set: ${err.message}`, { error: true });
      }
    }

    // 2. Existing component sets selected directly or via child variant or ancestor
    const existingComponentSets = new Set<ComponentSetNode>();
    for (const node of selection) {
      if (node.type === 'COMPONENT_SET') {
        existingComponentSets.add(node);
      } else {
        let curr: BaseNode | null = node;
        while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
          if (curr.type === 'COMPONENT_SET') {
            existingComponentSets.add(curr as ComponentSetNode);
            break;
          }
          curr = curr.parent;
        }
      }
    }

    const allComponentSets = [...Array.from(existingComponentSets), ...newlyCreatedComponentSets];

    // Resolve any variant conflicts across all affected component sets upfront
    for (const cs of allComponentSets) {
      try {
        await resolveComponentSetConflicts(cs);
      } catch (e) {
        console.warn('resolveComponentSetConflicts error:', e);
      }
    }

    if (allComponentSets.length > 0) {
      await setupComponentSets(allComponentSets);
    }

    // 3. Other nodes (excluding component sets and standalone components that were converted) + newly created variants
    const otherNodes = selection.filter(
      (node) => node.type !== 'COMPONENT_SET' && !standaloneComponents.includes(node as ComponentNode)
    );

    const nodesToApplyVariantMetrics = [...otherNodes, ...newlyCreatedVariants];

    if (nodesToApplyVariantMetrics.length > 0) {
      await applyVariantMetrics(nodesToApplyVariantMetrics);
    }

    // 4. Sanitize component properties and layer names on all affected sets and nodes
    for (const cs of allComponentSets) {
      try {
        await sanitizeComponentProperties(cs);
        await sanitizeLayerNames(cs);
      } catch (e) {}
    }

    for (const n of selection) {
      try {
        await sanitizeComponentProperties(n);
        await sanitizeLayerNames(n);
      } catch (e) {}
    }

    // If new component sets were created, select them and update UI inspector
    if (newlyCreatedComponentSets.length > 0) {
      figma.currentPage.selection = allComponentSets;
      await sendSelectionToUI();
    } else {
      // Re-trigger selection to force Figma inspector panel to refresh property names immediately
      try {
        const currentSelection = [...figma.currentPage.selection];
        if (currentSelection.length > 0) {
          figma.currentPage.selection = [];
          figma.currentPage.selection = currentSelection;
        }
      } catch (e) {
        // ignore
      }
      await sendSelectionToUI();
    }
  } catch (err: any) {
    console.error('runComponentSetLogic failed:', err);
    figma.notify(`Setup Component warning: ${err?.message || err}`, { error: true });
  }
}

export async function runRenamePascalCaseLogic() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('Please select elements on canvas to rename to PascalCase.', { error: true });
    return;
  }

  const nodesToSanitize = new Set<BaseNode>();
  const componentSets = new Set<ComponentSetNode>();
  const componentTargets = new Set<ComponentNode | ComponentSetNode>();

  // 1. Traverse up from each selected node to collect parent/ancestor layers (Sections, Frames with/without Auto Layout, ComponentSets, etc.)
  for (const node of selection) {
    let curr: BaseNode | null = node.parent;
    while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
      if (curr.type === 'INSTANCE') {
        break; // Stop climbing if inside an instance
      }
      nodesToSanitize.add(curr);
      if (curr.type === 'COMPONENT_SET') {
        componentSets.add(curr as ComponentSetNode);
        componentTargets.add(curr as ComponentSetNode);
        for (const child of (curr as ComponentSetNode).children) {
          if (child.type === 'COMPONENT') {
            componentTargets.add(child as ComponentNode);
            nodesToSanitize.add(child);
          }
        }
      } else if (curr.type === 'COMPONENT') {
        componentTargets.add(curr as ComponentNode);
      }
      curr = curr.parent;
    }
  }

  // 2. Collect selected nodes and all their descendants (recursively, skipping instances)
  function collectSubtree(n: BaseNode) {
    if (!n) return;
    if (n.type === 'INSTANCE') {
      // "oprócz instancji komponentów" - do not rename instances or traverse inside them
      return;
    }
    nodesToSanitize.add(n);

    if (n.type === 'COMPONENT_SET') {
      const cs = n as ComponentSetNode;
      componentSets.add(cs);
      componentTargets.add(cs);
      for (const child of cs.children) {
        if (child.type === 'COMPONENT') {
          componentTargets.add(child as ComponentNode);
          nodesToSanitize.add(child);
          if ('children' in child && (child as any).children) {
            for (const sub of (child as any).children) {
              collectSubtree(sub);
            }
          }
        }
      }
      return;
    }

    if (n.type === 'COMPONENT') {
      componentTargets.add(n as ComponentNode);
      if (n.parent && n.parent.type === 'COMPONENT_SET') {
        const parentSet = n.parent as ComponentSetNode;
        componentSets.add(parentSet);
        componentTargets.add(parentSet);
        nodesToSanitize.add(parentSet);
      }
    }

    if ('children' in n && (n as any).children) {
      for (const child of (n as any).children) {
        collectSubtree(child);
      }
    }
  }

  for (const n of selection) {
    collectSubtree(n);
  }

  // 3. Sanitize component properties on all affected components and component sets
  for (const cs of componentSets) {
    await sanitizeComponentProperties(cs);
  }
  for (const target of componentTargets) {
    await sanitizeComponentProperties(target);
  }

  // 4. Sanitize layer names on all collected nodes (ancestors: sections, frames; descendants: components, shapes, text...)
  // Using isPascalCaseOnly = true to convert all layer and frame names (with or without auto layout) to PascalCase
  for (const node of nodesToSanitize) {
    await sanitizeLayerNames(node, true);
  }

  // 5. Sanitize instance property overrides if any instances are inside selection
  for (const n of selection) {
    await sanitizeInstanceProperties(n);
  }

  // Force Figma inspector & layer panel to refresh names immediately
  try {
    const currentSelection = [...figma.currentPage.selection];
    if (currentSelection.length > 0) {
      figma.currentPage.selection = [];
      figma.currentPage.selection = currentSelection;
    }
  } catch (e) {
    // ignore
  }

  await sendSelectionToUI();
  figma.notify('Renamed layers, frames, sections & variant properties to PascalCase! 🔤');
}

export async function setupComponentSetOnlyHorizontal(nodes: readonly ComponentSetNode[]) {
  await ensureTemporaryMetricsCollection();
  const allVars = await getAllRelevantVariablesForComponentSet();

  const varGap = findVariableWithPriority(allVars, 'Layout/Base', 'Metrics') || findVariableWithPriority(allVars, 'layout/base', 'Metrics');
  const varPadding = findVariableWithPriority(allVars, 'Layout/Base', 'Metrics') || findVariableWithPriority(allVars, 'layout/base', 'Metrics');
  const varRadius = findVariableWithPriority(allVars, 'Radius/Container/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/container/base', 'Metrics') || findVariableWithPriority(allVars, 'Radius/Base', 'Metrics') || findVariableWithPriority(allVars, 'radius/base', 'Metrics');
  const varBorder = findVariableWithPriority(allVars, 'Constant/1', 'Metrics') || findVariableWithPriority(allVars, 'constant/1', 'Metrics') || findVariableWithPriority(allVars, 'Constant/One', 'Metrics') || findVariableWithPriority(allVars, 'constant/one', 'Metrics');
  const varBorderColor = findColorVariableWithPriority(allVars, ['OutlineBase', 'outlineBase', 'outlineHighest', 'outline']);

  const ensureScope = (variable: Variable, requiredScope: VariableScope) => {
    if (
      variable.scopes.indexOf(requiredScope) === -1 &&
      variable.scopes.indexOf('ALL_SCOPES' as any) === -1
    ) {
      variable.scopes = [...variable.scopes, requiredScope];
    }
  };

  try {
    if (varGap) ensureScope(varGap, 'GAP');
    if (varPadding) ensureScope(varPadding, 'GAP');
    if (varRadius) ensureScope(varRadius, 'CORNER_RADIUS');
    if (varBorder) ensureScope(varBorder, 'STROKE_FLOAT');
  } catch (e) {
    console.warn('Unable to update variable scopes:', e);
  }

  let totalSuccess = 0;
  for (const node of nodes) {
    try {
      node.layoutMode = 'HORIZONTAL';
      node.layoutWrap = 'NO_WRAP';
      node.primaryAxisSizingMode = 'AUTO';
      node.counterAxisSizingMode = 'AUTO';
      node.fills = [];

      const safeBind = (prop: any, variable: Variable | undefined) => {
        if (!variable) return;
        try {
          node.setBoundVariable(prop, variable);
        } catch (e: any) {
          console.warn(`[safeBind] Failed to bind ${prop} on ${node.name}:`, e);
        }
      };

      safeBind('itemSpacing', varGap);
      safeBind('counterAxisSpacing', varGap);
      safeBind('paddingTop', varPadding);
      safeBind('paddingBottom', varPadding);
      safeBind('paddingLeft', varPadding);
      safeBind('paddingRight', varPadding);

      if (varRadius) {
        try {
          node.setBoundVariable('cornerRadius', varRadius);
        } catch (err) {
          safeBind('topLeftRadius', varRadius);
          safeBind('topRightRadius', varRadius);
          safeBind('bottomLeftRadius', varRadius);
          safeBind('bottomRightRadius', varRadius);
        }
      }

      if ('cornerSmoothing' in node) {
        try {
          node.cornerSmoothing = 0.6;
        } catch (e) {}
      }

      try {
        node.dashPattern = [4, 4];
        node.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
        if (varBorderColor) {
          const newStrokes = [...(node.strokes as readonly Paint[])].map((paint) => {
            if (paint.type === 'SOLID') {
              return figma.variables.setBoundVariableForPaint(paint, 'color', varBorderColor);
            }
            return paint;
          });
          node.strokes = newStrokes;
        }
        if (varBorder) {
          safeBind('strokeWeight', varBorder);
        }
      } catch (e: any) {
        console.warn(`[strokes] Failed to set strokes on ${node.name}:`, e);
      }

      totalSuccess++;
    } catch (err: any) {
      console.error(`Failed to setup ComponentSet "${node.name}":`, err);
    }
  }

  if (totalSuccess > 0) {
    figma.notify(`Skonfigurowano ${totalSuccess} Component Set${totalSuccess > 1 ? 'ów' : ''} (Horizontal Auto Layout & tokeny)! ⚡`);
    sendSelectionToUI();
  }
}

export async function runSetupComponentSetHorizontalLogic() {
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    figma.notify('Zaznacz Component Set na canvasie.', { error: true });
    return;
  }

  const compSets = new Set<ComponentSetNode>();
  for (const node of selection) {
    if (node.type === 'COMPONENT_SET') {
      compSets.add(node);
    } else {
      let curr: BaseNode | null = node;
      while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
        if (curr.type === 'COMPONENT_SET') {
          compSets.add(curr as ComponentSetNode);
          break;
        }
        curr = curr.parent;
      }
    }
  }

  const allSets = Array.from(compSets);
  if (allSets.length === 0) {
    figma.notify('Nie znaleziono Component Set w zaznaczeniu.', { error: true });
    return;
  }

  await setupComponentSetOnlyHorizontal(allSets);
}


