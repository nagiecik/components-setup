import { ComponentNodeDef, FillOrStrokeDef } from '../types/generator';
import { parseHexOrRgb } from '../utils/colors';
import { ensureFontLoaded } from '../utils/fonts';
import { dsRegistry } from '../audit/registry';

export function cleanUtilityColorToken(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^var\(--(?:color-)?([^)]+)\)$/, '$1')
    .replace(/^--(?:color-)?/, '')
    .replace(/^(?:bg|text|border|stroke|fill)-/, '')
    .replace(/\/\d+$/, '');
}

export function extractNodeDescription(node: SceneNode): string {
  try {
    if (node.parent && node.parent.type === 'COMPONENT_SET' && (node.parent as any).description) {
      const desc = String((node.parent as any).description).trim();
      if (desc) return desc;
    }
    if ('description' in node && (node as any).description) {
      const desc = String((node as any).description).trim();
      if (desc) return desc;
    }
    if (node.type === 'INSTANCE' && (node as any).mainComponent) {
      const main = (node as any).mainComponent;
      if (main.parent && main.parent.type === 'COMPONENT_SET' && main.parent.description) {
        const desc = String(main.parent.description).trim();
        if (desc) return desc;
      }
      if (main.description) {
        const desc = String(main.description).trim();
        if (desc) return desc;
      }
    }
  } catch (e) {
    console.warn('[Export] Could not extract description:', e);
  }
  return '';
}

export class VariableEngine {
  private allVars: Variable[] = [];
  private allTextStyles: TextStyle[] = [];
  private isInitialized = false;

  resolveFontFamily(category: 'body' | 'heading' = 'body', hintFamily?: string): string {
    // 1. Check Figma Design System string variables (local & team libraries)
    const varNames = category === 'heading'
      ? ['fontfamily/heading', 'fontfamily/header', 'fontfamily/display', 'fontfamily/head', 'heading', 'header']
      : ['fontfamily/body', 'fontfamily/default', 'fontfamily/base', 'fontfamily/sans', 'body', 'default'];

    for (const name of varNames) {
      const v = this.allVars.find(
        (x) => x.resolvedType === 'STRING' && (x.name.toLowerCase() === name || x.name.toLowerCase().endsWith('/' + name))
      );
      if (v) {
        try {
          const keys = Object.keys(v.valuesByMode);
          if (keys.length > 0) {
            const val = v.valuesByMode[keys[0]];
            if (typeof val === 'string' && val.trim().length > 0) {
              return val.trim();
            }
          }
        } catch {}
      }
    }

    // 2. Check Figma Text Styles matching the role in the document
    const matchingStyles = this.allTextStyles.filter((s) => {
      const sName = s.name.toLowerCase();
      if (category === 'heading') {
        return sName.includes('heading') || sName.includes('display') || sName.includes('h1') || sName.includes('h2');
      }
      return sName.includes('body') || sName.includes('label') || sName.includes('default') || sName.includes('base');
    });

    for (const s of matchingStyles) {
      if (s.fontName && s.fontName.family && s.fontName.family.trim().length > 0) {
        return s.fontName.family.trim();
      }
    }

    // 3. Check ANY text style present in the document
    for (const s of this.allTextStyles) {
      if (s.fontName && s.fontName.family && s.fontName.family.trim().length > 0) {
        return s.fontName.family.trim();
      }
    }

    // 4. Use hintFamily if provided from workspace/code
    if (hintFamily && hintFamily.trim().length > 0 && hintFamily !== 'Inter') {
      return hintFamily.trim();
    }

    return hintFamily && hintFamily.trim().length > 0 ? hintFamily.trim() : 'Inter';
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
      const allowedColIds = new Set<string>();
      for (const col of localCollections) {
        if (!col.name.trim().startsWith('_')) {
          allowedColIds.add(col.id);
        }
      }
      const localVars = await figma.variables.getLocalVariablesAsync();
      for (const v of localVars) {
        if (allowedColIds.has(v.variableCollectionId) && !v.name.trim().startsWith('_')) {
          this.allVars.push(v);
        }
      }
    } catch (e) {
      console.warn('Error fetching local variables:', e);
    }

    try {
      const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const libCollection of libraryCollections) {
        if (libCollection.name.trim().startsWith('_')) {
          continue;
        }
        try {
          const descriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCollection.key);
          const allowedDescriptors = descriptors.filter(
            (d) => !d.name.trim().startsWith('_') && (!/\/\d+$/.test(d.name.trim()) || d.name.toLowerCase().includes('constant'))
          );
          const imported = await Promise.all(
            allowedDescriptors.map((d) => figma.variables.importVariableByKeyAsync(d.key).catch(() => null))
          );
          for (const v of imported) {
            if (v && !this.allVars.some((x) => x.id === v.id) && !v.name.trim().startsWith('_')) {
              this.allVars.push(v);
            }
          }
        } catch {
          // skip collection
        }
      }
    } catch (e) {
      console.warn('Team library collections error:', e);
    }

    // Initialize & discover Text Styles (Local and Library styles present across all pages in document)
    try {
      const localStyles = await figma.getLocalTextStylesAsync();
      for (const s of localStyles) {
        if (!this.allTextStyles.some((x) => x.id === s.id)) {
          this.allTextStyles.push(s);
        }
      }
    } catch (e) {
      console.warn('Error fetching local text styles:', e);
    }

    try {
      if (typeof figma.loadAllPagesAsync === 'function') {
        await figma.loadAllPagesAsync();
      }
      for (const page of figma.root.children) {
        try {
          const textNodes = page.findAllWithCriteria({ types: ['TEXT'] });
          for (const tn of textNodes) {
            if (typeof tn.textStyleId === 'string' && tn.textStyleId.length > 0) {
              try {
                const style = await figma.getStyleByIdAsync(tn.textStyleId);
                if (style && !this.allTextStyles.some((x) => x.id === style.id)) {
                  this.allTextStyles.push(style as TextStyle);
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Error discovering document text styles across pages:', e);
    }

    await this.ensureCoreColorVariables();

    this.isInitialized = true;
  }

  async ensureCoreColorVariables(): Promise<void> {
    // Respect existing Figma variables: do NOT create duplicate or hyphenated variables.
    // The plugin strictly binds to existing variables in the user's design system collections.
  }

  resolveColorVariableValue(v: Variable, visited = new Set<string>()): RGB | null {
    if (visited.has(v.id)) return null;
    visited.add(v.id);

    try {
      const keys = Object.keys(v.valuesByMode);
      if (keys.length === 0) return null;
      const rawVal = v.valuesByMode[keys[0]];
      if (!rawVal) return null;

      if (typeof rawVal === 'object') {
        if ('r' in rawVal && 'g' in rawVal && 'b' in rawVal) {
          return { r: rawVal.r, g: rawVal.g, b: rawVal.b };
        }
        if (rawVal.type === 'VARIABLE_ALIAS' && rawVal.id) {
          const aliasVar = this.allVars.find((x) => x.id === rawVal.id);
          if (aliasVar) {
            return this.resolveColorVariableValue(aliasVar, visited);
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  findColorVariable(
    nameOrKeywords?: string | string[],
    hexOrRgb?: string | RGB,
    scope?: VariableScope
  ): Variable | null {
    const colorVars = this.allVars.filter(
      (v) => v.resolvedType === 'COLOR' && !v.name.trim().startsWith('_') && !/\/\d+$/.test(v.name.trim())
    );
    if (colorVars.length === 0) return null;

    const normalize = (s: string) => {
      const clean = cleanUtilityColorToken(s);
      const leaf = clean.split('/').pop() || clean;
      return leaf.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const kebabToCamel = (s: string) => {
      const clean = cleanUtilityColorToken(s);
      const leaf = clean.split('/').pop() || clean;
      return leaf.replace(/[-_]([a-z0-9])/g, (_, g) => g.toUpperCase());
    };

    const camelToKebab = (s: string) => {
      const clean = cleanUtilityColorToken(s);
      const leaf = clean.split('/').pop() || clean;
      return leaf.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    };

    // 1. Try finding by name / keywords (matching camelCase, kebab-case, and normalized)
    if (nameOrKeywords) {
      const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
      const keywords = rawKeywords.filter(Boolean);

      for (const rawKw of keywords) {
        if (!rawKw || rawKw.trim().startsWith('_')) continue;
        const cleanKw = cleanUtilityColorToken(rawKw);
        const normKw = normalize(cleanKw);
        const simpleKw = cleanKw.split('/').pop() || cleanKw;
        const camelKw = kebabToCamel(simpleKw);
        const kebabKw = camelToKebab(simpleKw);

        const searchTerms = new Set<string>([
          rawKw.toLowerCase(),
          cleanKw.toLowerCase(),
          normKw,
          simpleKw.toLowerCase(),
          camelKw.toLowerCase(),
          kebabKw.toLowerCase(),
        ]);

        const exact = colorVars.find((v) => {
          const vClean = cleanUtilityColorToken(v.name);
          const vSimple = vClean.split('/').pop() || vClean;
          const vNorm = normalize(v.name);
          const vCamel = kebabToCamel(vSimple);
          const vKebab = camelToKebab(vSimple);
          return (
            searchTerms.has(vNorm) ||
            searchTerms.has(vSimple.toLowerCase()) ||
            searchTerms.has(vCamel.toLowerCase()) ||
            searchTerms.has(vKebab.toLowerCase()) ||
            vSimple === camelKw ||
            vSimple === kebabKw
          );
        });
        if (exact) return exact;
      }
    }

    // 2. Try finding by Color Value (Hex / RGB)
    let targetRgb: RGB | null = null;
    if (typeof hexOrRgb === 'string') {
      targetRgb = parseHexOrRgb(hexOrRgb);
    } else if (hexOrRgb && typeof (hexOrRgb as RGB).r === 'number') {
      targetRgb = hexOrRgb;
    }

    if (targetRgb) {
      for (const v of colorVars) {
        const val = this.resolveColorVariableValue(v);
        if (val) {
          const dr = Math.abs(val.r - targetRgb.r);
          const dg = Math.abs(val.g - targetRgb.g);
          const db = Math.abs(val.b - targetRgb.b);
          if (dr < 0.02 && dg < 0.02 && db < 0.02) {
            return v;
          }
        }
      }
    }

    return null;
  }

  findVariable(
    type: VariableResolvedDataType,
    scope?: VariableScope,
    nameOrKeywords?: string | string[],
    numericValue?: number
  ): Variable | null {
    const candidates = this.allVars.filter((v) => v.resolvedType === type && !v.name.trim().startsWith('_'));

    const matchesScope = (v: Variable) => {
      if (!scope) return true;
      if (!v.scopes || v.scopes.length === 0 || v.scopes.includes('ALL_SCOPES')) return true;
      return v.scopes.includes(scope);
    };

    if (nameOrKeywords) {
      const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
      const keywords = rawKeywords
        .filter(Boolean)
        .map((k) => k.toLowerCase().replace(/^[var(--]+/, '').replace(/[)]+$/, ''));

      for (const kw of keywords) {
        const exact = candidates.find((v) => matchesScope(v) && v.name.toLowerCase() === kw);
        if (exact) return exact;

        const partial = candidates.find(
          (v) =>
            matchesScope(v) &&
            (v.name.toLowerCase().endsWith('/' + kw) ||
              v.name.toLowerCase().replace(/\//g, '-').endsWith(kw) ||
              kw.endsWith(v.name.toLowerCase()))
        );
        if (partial) return partial;
      }

      // Fallback: search across all scopes if not found under strict scope
      for (const kw of keywords) {
        const exactAny = candidates.find((v) => v.name.toLowerCase() === kw);
        if (exactAny) {
          if (scope && exactAny.scopes && !exactAny.scopes.includes('ALL_SCOPES') && !exactAny.scopes.includes(scope)) {
            try { exactAny.scopes = [...exactAny.scopes, scope]; } catch {}
          }
          return exactAny;
        }

        const partialAny = candidates.find(
          (v) =>
            v.name.toLowerCase().endsWith('/' + kw) ||
            v.name.toLowerCase().replace(/\//g, '-').endsWith(kw) ||
            kw.endsWith(v.name.toLowerCase())
        );
        if (partialAny) {
          if (scope && partialAny.scopes && !partialAny.scopes.includes('ALL_SCOPES') && !partialAny.scopes.includes(scope)) {
            try { partialAny.scopes = [...partialAny.scopes, scope]; } catch {}
          }
          return partialAny;
        }
      }
    }

    if (numericValue !== undefined && type === 'FLOAT') {
      // First try to find one with 'none' or 'zero' in name matching value
      const zeroNamed = candidates.find(
        (v) => (v.name.toLowerCase().includes('none') || v.name.toLowerCase().includes('zero')) &&
               Math.abs(this.getVariableDefaultValue(v) - numericValue) < 0.001
      );
      if (zeroNamed) {
        if (scope && zeroNamed.scopes && !zeroNamed.scopes.includes('ALL_SCOPES') && !zeroNamed.scopes.includes(scope)) {
          try { zeroNamed.scopes = [...zeroNamed.scopes, scope]; } catch {}
        }
        return zeroNamed;
      }

      for (const v of candidates) {
        if (!matchesScope(v)) continue;
        const val = this.getVariableDefaultValue(v);
        if (typeof val === 'number' && Math.abs(val - numericValue) < 0.001) {
          return v;
        }
      }
    }

    return null;
  }

  getVariableDefaultValue(variable: Variable): any {
    try {
      const keys = Object.keys(variable.valuesByMode);
      if (keys.length > 0) return variable.valuesByMode[keys[0]];
    } catch {
      // ignore
    }
    return undefined;
  }

  findTextStyle(
    nameOrKeywords?: string | string[],
    fontSize?: number,
    fontStyle?: string
  ): TextStyle | null {
    if (this.allTextStyles.length === 0) return null;

    if (nameOrKeywords) {
      const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
      const queries = rawKeywords.filter(Boolean).map((k) => k.trim());

      for (const query of queries) {
        const qLower = query.toLowerCase();
        const qNormalized = qLower.replace(/^[./\-_]+|[./\-_]+$/g, '');
        const qNoPrefix = qNormalized.replace(/^default\//, '');
        const qWithPrefix = qNormalized.startsWith('default/') ? qNormalized : `default/${qNormalized}`;
        const qParts = qNormalized.split(/[/ _-]+/).filter(Boolean);

        // 1. Exact match (with or without 'default/' prefix)
        const exact = this.allTextStyles.find((s) => {
          const sLower = s.name.toLowerCase();
          return (
            sLower === qLower ||
            sLower === qNormalized ||
            sLower === qNoPrefix ||
            sLower === qWithPrefix
          );
        });
        if (exact) return exact;

        // 2. Suffix match
        const suffixMatch = this.allTextStyles.find((s) => {
          const sLower = s.name.toLowerCase();
          return sLower.endsWith('/' + qNoPrefix) || sLower.endsWith(qNoPrefix);
        });
        if (suffixMatch) return suffixMatch;

        // 3. Token-set match (all tokens present in style name)
        if (qParts.length >= 2) {
          const allMatch = this.allTextStyles.find((s) => {
            const sLower = s.name.toLowerCase();
            return qParts.every((part) => sLower.includes(part));
          });
          if (allMatch) return allMatch;
        }
      }

      // Do NOT blindly guess unrelated styles when specific name or keyword was requested!
      return null;
    }

    if (fontSize !== undefined) {
      const sizeCandidates = this.allTextStyles.filter(
        (s) => Math.abs(s.fontSize - fontSize) < 0.5
      );
      if (sizeCandidates.length > 0) {
        if (fontStyle) {
          const styleLower = fontStyle.toLowerCase();
          const match = sizeCandidates.find(
            (s) =>
              s.name.toLowerCase().includes(styleLower) ||
              (s.fontName && s.fontName.style.toLowerCase().includes(styleLower))
          );
          if (match) return match;
        }
        return sizeCandidates[0];
      }
    }

    return null;
  }

  async bindNodeVariables(node: SceneNode, def: ComponentNodeDef): Promise<void> {
    // 1. Corner Radius
    if ('cornerRadius' in node && typeof (node as any).setBoundVariable === 'function') {
      const frameNode = node as FrameNode | RectangleNode | ComponentNode;
      if (def.cornerRadius !== undefined || def.cornerRadiusVar) {
        const isNone = def.cornerRadius === 0 ||
          def.cornerRadiusVar === 'constant/none' ||
          def.cornerRadiusVar === 'none' ||
          def.cornerRadiusVar === 'radius/none' ||
          def.cornerRadiusVar === 'radius/container/none' ||
          def.cornerRadiusVar === 'constant-none';

        const targetVar = this.findVariable(
          'FLOAT',
          'CORNER_RADIUS',
          isNone
            ? ['constant/none', 'none', 'radius/none', 'radius/container/none', 'constant-none', 'constants/none']
            : (def.cornerRadiusVar || [
                def.cornerRadius === 0 ? 'constant/none' : '',
                def.cornerRadius === 0 ? 'none' : '',
                def.cornerRadius === 4 ? 'radius/container/pico' : '',
                def.cornerRadius === 8 ? 'radius/container/small' : '',
                def.cornerRadius === 12 ? 'radius/container/medium' : '',
                def.cornerRadius === 16 ? 'radius/container/base' : '',
                def.cornerRadius === 24 ? 'radius/container/large' : '',
                def.cornerRadius === 9999 ? 'constant/full' : '',
              ]),
          def.cornerRadius
        );
        if (targetVar) {
          try {
            (frameNode as any).setBoundVariable('cornerRadius', targetVar);
          } catch {}
          if ('topLeftRadius' in frameNode) {
            try {
              (frameNode as any).setBoundVariable('topLeftRadius', targetVar);
              (frameNode as any).setBoundVariable('topRightRadius', targetVar);
              (frameNode as any).setBoundVariable('bottomLeftRadius', targetVar);
              (frameNode as any).setBoundVariable('bottomRightRadius', targetVar);
            } catch {}
          }
        }
      }
    }

    // 2. Auto Layout Spacing & Padding
    if ('layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE' && typeof (node as any).setBoundVariable === 'function') {
      const alNode = node as FrameNode | ComponentNode;

      if (def.itemSpacing !== undefined || def.itemSpacingVar) {
        const isNone = def.itemSpacing === 0 ||
          def.itemSpacingVar === 'constant/none' ||
          def.itemSpacingVar === 'none' ||
          def.itemSpacingVar === 'spacing/none' ||
          def.itemSpacingVar === 'constant-none';

        const gapVar = this.findVariable(
          'FLOAT',
          'GAP',
          isNone
            ? ['constant/none', 'none', 'spacing/none', 'constant-none', 'constants/none']
            : (def.itemSpacingVar || [
                def.itemSpacing === 0 ? 'constant/none' : '',
                def.itemSpacing === 0 ? 'none' : '',
                def.itemSpacing === 4 ? 'spacing/pico' : '',
                def.itemSpacing === 8 ? 'spacing/extra-small' : '',
                def.itemSpacing === 12 ? 'spacing/small' : '',
                def.itemSpacing === 16 ? 'spacing/base' : '',
                def.itemSpacing === 20 ? 'spacing/medium' : '',
                def.itemSpacing === 24 ? 'spacing/semi-large' : '',
                def.itemSpacing === 32 ? 'spacing/large' : '',
                def.itemSpacing === 48 ? 'spacing/huge' : '',
              ]),
          def.itemSpacing
        );
        if (gapVar) {
          try {
            alNode.setBoundVariable('itemSpacing', gapVar);
          } catch {}
        }
      }

      const paddings: Array<{ field: 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight'; val?: number; varName?: string }> = [
        { field: 'paddingTop', val: def.paddingTop, varName: def.paddingTopVar },
        { field: 'paddingBottom', val: def.paddingBottom, varName: def.paddingBottomVar },
        { field: 'paddingLeft', val: def.paddingLeft, varName: def.paddingLeftVar },
        { field: 'paddingRight', val: def.paddingRight, varName: def.paddingRightVar },
      ];

      for (const p of paddings) {
        if (p.val !== undefined || p.varName) {
          const isNone = p.val === 0 ||
            p.varName === 'constant/none' ||
            p.varName === 'none' ||
            p.varName === 'spacing/none' ||
            p.varName === 'constant-none';

          const padVar = this.findVariable(
            'FLOAT',
            'GAP',
            isNone
              ? ['constant/none', 'none', 'spacing/none', 'constant-none', 'constants/none']
              : (p.varName || [
                  p.val === 0 ? 'constant/none' : '',
                  p.val === 0 ? 'none' : '',
                  p.val === 4 ? 'spacing/pico' : '',
                  p.val === 8 ? 'spacing/extra-small' : '',
                  p.val === 10 ? 'spacing/10' : '',
                  p.val === 12 ? 'spacing/small' : '',
                  p.val === 16 ? 'spacing/base' : '',
                  p.val === 20 ? 'spacing/medium' : '',
                  p.val === 24 ? 'spacing/semi-large' : '',
                  p.val === 32 ? 'spacing/large' : '',
                ]),
            p.val
          );
          if (padVar) {
            try {
              alNode.setBoundVariable(p.field, padVar);
            } catch {}
          }
        }
      }
    }

    // 3. Dimensions
    if (typeof (node as any).setBoundVariable === 'function') {
      const dimNode = node as any;
      if (def.maxWidth !== undefined || def.maxWidthVar) {
        const mwVar = this.findVariable('FLOAT', 'WIDTH_HEIGHT', def.maxWidthVar, def.maxWidth);
        if (mwVar) {
          try { dimNode.setBoundVariable('maxWidth', mwVar); } catch {}
        }
      }
      if (def.minWidth !== undefined || def.minWidthVar) {
        const minWVar = this.findVariable('FLOAT', 'WIDTH_HEIGHT', def.minWidthVar, def.minWidth);
        if (minWVar) {
          try { dimNode.setBoundVariable('minWidth', minWVar); } catch {}
        }
      }
    }

    // 4. Fills (Colors)
    if ('fills' in node && Array.isArray(node.fills)) {
      const currentFills = (node.fills as Paint[]).slice();
      let hasChange = false;
      const updatedFills = currentFills.map((paint, idx) => {
        if (paint.type !== 'SOLID') return paint;
        const boundColorId = (paint as any).boundVariables?.color?.id;
        const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
        if ((paint as any).boundVariables?.color && isBoundValid) return paint;

        const fillDef = def.fills && def.fills[idx] ? def.fills[idx] : undefined;
        const matchedToken = fillDef?.hex ? dsRegistry.matchColor(fillDef.hex, node.type === 'TEXT', false) : '';
        const colorVar = this.findColorVariable(
          fillDef?.variableName || matchedToken,
          fillDef?.hex || fillDef?.color || paint.color,
          node.type === 'TEXT' ? 'TEXT_FILL' : 'FRAME_FILL'
        );
        if (colorVar) {
          try {
            hasChange = true;
            return figma.variables.setBoundVariableForPaint(paint, 'color', colorVar);
          } catch {
            return paint;
          }
        } else if ((paint as any).boundVariables?.color && !isBoundValid) {
          hasChange = true;
          const p = { ...paint };
          delete (p as any).boundVariables;
          return p;
        }
        return paint;
      });
      if (hasChange) {
        (node as any).fills = updatedFills;
      }
    }

    // 5. Strokes (Borders)
    if ('strokes' in node && Array.isArray(node.strokes)) {
      const currentStrokes = (node.strokes as Paint[]).slice();
      let hasChange = false;
      const updatedStrokes = currentStrokes.map((paint, idx) => {
        if (paint.type !== 'SOLID') return paint;
        const boundColorId = (paint as any).boundVariables?.color?.id;
        const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
        if ((paint as any).boundVariables?.color && isBoundValid) return paint;

        const strokeDef = def.strokes && def.strokes[idx] ? def.strokes[idx] : undefined;
        const strokeVar = this.findColorVariable(
          strokeDef?.variableName || ['outline', 'outlineBase', 'outline-base', 'border-white', 'white'],
          strokeDef?.hex || strokeDef?.color || paint.color,
          'STROKE_COLOR'
        );
        if (strokeVar) {
          try {
            hasChange = true;
            return figma.variables.setBoundVariableForPaint(paint, 'color', strokeVar);
          } catch {
            return paint;
          }
        } else if ((paint as any).boundVariables?.color && !isBoundValid) {
          hasChange = true;
          const p = { ...paint };
          delete (p as any).boundVariables;
          return p;
        }
        return paint;
      });
      if (hasChange) {
        (node as any).strokes = updatedStrokes;
      }

      if (def.strokeWeight === 1 && typeof (node as any).setBoundVariable === 'function') {
        const stVar = this.findVariable('FLOAT', 'STROKE_FLOAT', ['constant/1', '1'], 1);
        if (stVar) {
          try { (node as any).setBoundVariable('strokeWeight', stVar); } catch {}
        }
      }
    }

    // 6. Typography bindings (Font Size, Line Height, Font Family) if no style is applied
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      if (!textNode.textStyleId && typeof (textNode as any).setBoundVariable === 'function') {
        const stylePrefix = def.textStyleName?.replace(/^default\//, '') || '';
        const category = stylePrefix.startsWith('heading') || stylePrefix.startsWith('display') ? 'heading' : 'body';
        const level = def.fontSize === 16 ? 'large' : def.fontSize === 14 ? 'medium' : def.fontSize === 12 ? 'large' : 'medium';

        // Font Size variable
        const fsVar = this.findVariable('FLOAT', 'FONT_SIZE', [
          `fontSize/${category}/${level}`,
          `fontSize/${stylePrefix.replace(/\/[^/]+$/, '')}`,
          def.fontSize === 16 ? 'fontSize/body/large' : '',
          def.fontSize === 14 ? 'fontSize/body/medium' : '',
          def.fontSize === 12 ? 'fontSize/label/large' : '',
        ].filter(Boolean), def.fontSize);
        if (fsVar) {
          try { (textNode as any).setBoundVariable('fontSize', fsVar); } catch {}
        }

        // Line Height variable
        const lhVar = this.findVariable('FLOAT', 'LINE_HEIGHT', [
          `lineHeight/${category}/${level}`,
          `lineHeight/${stylePrefix.replace(/\/[^/]+$/, '')}`,
          def.fontSize === 16 ? 'lineHeight/body/large' : '',
          def.fontSize === 14 ? 'lineHeight/body/medium' : '',
          def.fontSize === 12 ? 'lineHeight/label/large' : '',
        ].filter(Boolean));
        if (lhVar) {
          try { (textNode as any).setBoundVariable('lineHeight', lhVar); } catch {}
        }

        // Font Family variable
        const ffVar = this.findVariable('STRING', 'FONT_FAMILY', [
          category === 'heading' ? 'fontFamily/heading' : 'fontFamily/body',
          category === 'heading' ? 'fontFamily/header' : 'fontFamily/default',
        ].filter(Boolean));
        if (ffVar) {
          try { (textNode as any).setBoundVariable('fontFamily', ffVar); } catch {}
        }
      }
    }
  }

  async bindVariablesRecursively(node: SceneNode): Promise<number> {
    let boundCount = 0;

    const processNode = async (curr: SceneNode) => {
      // 1. Spacing & Paddings
      if ('layoutMode' in curr && (curr as FrameNode).layoutMode !== 'NONE') {
        const alNode = curr as FrameNode;
        const boundVars = (alNode as any).boundVariables || {};

        if (!boundVars.itemSpacing && alNode.itemSpacing > 0) {
          const gapVar = this.findVariable('FLOAT', 'GAP', undefined, alNode.itemSpacing);
          if (gapVar) {
            try { alNode.setBoundVariable('itemSpacing', gapVar); boundCount++; } catch {}
          }
        }

        const paddings: Array<{ field: 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight'; val: number }> = [
          { field: 'paddingTop', val: alNode.paddingTop },
          { field: 'paddingBottom', val: alNode.paddingBottom },
          { field: 'paddingLeft', val: alNode.paddingLeft },
          { field: 'paddingRight', val: alNode.paddingRight },
        ];
        for (const p of paddings) {
          if (!boundVars[p.field] && p.val > 0) {
            const pVar = this.findVariable('FLOAT', 'GAP', undefined, p.val);
            if (pVar) {
              try { (curr as any).setBoundVariable(p.field, pVar); boundCount++; } catch {}
            }
          }
        }
      }

      // 2. Corner Radius
      if ('cornerRadius' in curr && typeof (curr as any).cornerRadius === 'number' && (curr as any).cornerRadius > 0 && typeof (curr as any).setBoundVariable === 'function') {
        const boundVars = (curr as any).boundVariables || {};
        if (!boundVars.cornerRadius) {
          const rVar = this.findVariable('FLOAT', 'CORNER_RADIUS', undefined, (curr as any).cornerRadius);
          if (rVar) {
            try { (curr as any).setBoundVariable('cornerRadius', rVar); boundCount++; } catch {}
          }
        }
      }

      // 3. Fills
      if ('fills' in curr && Array.isArray((curr as any).fills) && (curr as any).fills.length > 0) {
        const lowerName = curr.name.toLowerCase();
        // Item and Track containers are transparent wrappers inside the ticker; clear accidental solid fills
        if ((lowerName.includes('item') || lowerName.includes('track')) && curr.type === 'FRAME') {
          (curr as any).fills = [];
        } else {
          let hasFillChange = false;
          const newFills = ((curr as any).fills as Paint[]).map((paint) => {
            if (paint.type !== 'SOLID') return paint;
            const boundColorId = (paint as any).boundVariables?.color?.id;
            const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
            if ((paint as any).boundVariables?.color && isBoundValid) return paint;

            const layerToken = cleanUtilityColorToken(curr.name);
            const candidates: string[] = layerToken && layerToken !== curr.name.toLowerCase() ? [layerToken] : [];
            if (curr.type === 'TEXT') {
              candidates.push('on-primary-unstable', 'onPrimaryUnstable');
            }

            const matchedVar = this.findColorVariable(
              candidates,
              paint.color,
              curr.type === 'TEXT' ? 'TEXT_FILL' : 'FRAME_FILL'
            );
            if (matchedVar) {
              try {
                hasFillChange = true;
                boundCount++;
                return figma.variables.setBoundVariableForPaint(paint, 'color', matchedVar);
              } catch {
                return paint;
              }
            }
            return paint;
          });
          if (hasFillChange) {
            (curr as any).fills = newFills;
          }
        }
      }

      // 4. Strokes
      if ('strokes' in curr && Array.isArray((curr as any).strokes) && (curr as any).strokes.length > 0) {
        let hasStrokeChange = false;
        const newStrokes = ((curr as any).strokes as Paint[]).map((paint) => {
          if (paint.type !== 'SOLID') return paint;
          const boundColorId = (paint as any).boundVariables?.color?.id;
          const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
          if ((paint as any).boundVariables?.color && isBoundValid) return paint;

          const matchedVar = this.findColorVariable(['outline', 'outlineBase', 'outline-base', curr.name], paint.color, 'STROKE_COLOR');
          if (matchedVar) {
            try {
              hasStrokeChange = true;
              boundCount++;
              return figma.variables.setBoundVariableForPaint(paint, 'color', matchedVar);
            } catch {
              return paint;
            }
          }
          return paint;
        });
        if (hasStrokeChange) {
          (curr as any).strokes = newStrokes;
        }
      }

      // Recursion
      if ('children' in curr && Array.isArray((curr as any).children)) {
        for (const ch of (curr as any).children) {
          await processNode(ch);
        }
      }
    };

    await processNode(node);
    return boundCount;
  }

  async exportNodeToCode(node: SceneNode): Promise<{
    code: string;
    name: string;
    description?: string;
    violations?: Array<{
      layer: string;
      property: string;
      rawValue: string;
      arbitraryClass: string;
      suggestion?: string;
    }>;
  }> {
    const resolveVarName = async (varId?: string): Promise<string | null> => {
      if (!varId) return null;
      try {
        const v = await figma.variables.getVariableByIdAsync(varId);
        if (!v) return null;
        let colName = '';
        if (v.variableCollectionId) {
          try {
            const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
            if (col) colName = col.name;
          } catch {}
        }
        if (colName && !v.name.toLowerCase().startsWith(colName.toLowerCase())) {
          return `${colName}/${v.name}`;
        }
        return v.name;
      } catch {
        return null;
      }
    };

    const sanitizeColorToken = (name: string): string => {
      const base = name.split('/').pop() || name;
      return base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    };

    const sanitizeSpacingToken = (name: string): string => {
      const clean = name.trim();
      if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
        const last = clean.split('/').pop() || clean;
        return `constant-${last.toLowerCase()}`;
      }
      const base = clean.split('/').pop() || clean;
      return base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    };

    const sanitizeRadiusToken = (name: string): string => {
      const clean = name.trim();
      if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
        const last = clean.split('/').pop() || clean;
        return `constant-${last.toLowerCase()}`;
      }
      const parts = clean.split('/').filter(Boolean);
      while (parts.length > 1 && /^(radius|corner-?radius|tokens?|primitives?|metrics|_metrics)$/i.test(parts[0])) {
        parts.shift();
      }
      return parts.map(p => p.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-');
    };

    interface TokenViolation {
      layer: string;
      property: string;
      rawValue: string;
      arbitraryClass: string;
      suggestion?: string;
    }
    const tokenViolations: TokenViolation[] = [];

    const matchSpacingToToken = (val: number, layerName = '', prop = 'spacing'): string => {
      const s = dsRegistry.matchSpacing(val);
      if (s.startsWith('[')) {
        tokenViolations.push({
          layer: layerName || 'Unknown Layer',
          property: prop,
          rawValue: `${val}px`,
          arbitraryClass: `${prop === 'gap' ? 'gap' : prop}-${s}`,
          suggestion: 'Use design-system spacing token (pico, nano, micro, small, base, large, etc.)',
        });
      }
      return s;
    };

    const matchRadiusToToken = (val: number, layerName = ''): string => {
      const s = dsRegistry.matchRadius(val);
      if (s.startsWith('[')) {
        tokenViolations.push({
          layer: layerName || 'Unknown Layer',
          property: 'borderRadius',
          rawValue: `${val}px`,
          arbitraryClass: `rounded-${s}`,
          suggestion: 'Use design-system radius token (none, small, medium, large, full)',
        });
      }
      return s;
    };

    const matchColorToToken = (color: RGB, layerName = '', isText = false, isStroke = false): string | null => {
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      const s = dsRegistry.matchColor(hex, isText, isStroke);
      if (s.startsWith('[')) {
        const prefix = isText ? 'text' : isStroke ? 'border' : 'bg';
        tokenViolations.push({
          layer: layerName || 'Unknown Layer',
          property: isText ? 'textColor' : isStroke ? 'borderColor' : 'backgroundColor',
          rawValue: hex,
          arbitraryClass: `${prefix}-${s}`,
          suggestion: 'Bind layer to a Figma Color Variable from Design System',
        });
      }
      return s;
    };

    // Determine root component name in PascalCase
    const getCleanComponentName = (n: SceneNode): string => {
      // If node is a variant inside a ComponentSet (e.g. name is "Type=Desktop" or "State=Default")
      if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET' && n.name.includes('=')) {
        return getCleanComponentName(n.parent as SceneNode);
      }

      let nameStr = n.name.trim();

      // If it contains variant properties like "Button, Size=Small", remove property assignments
      if (nameStr.includes('=')) {
        nameStr = nameStr.split(',')[0].split('=')[0].trim();
      }

      // If name contains slashes (e.g. "AnniversaryTicker/Item" or "UI/Button/Primary")
      if (nameStr.includes('/')) {
        const segments = nameStr.split('/').map(s => s.trim().replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
        if (segments.length > 0) {
          return segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        }
      }

      const clean = nameStr.replace(/[^a-zA-Z0-9]/g, '');
      if (!clean) return 'Component';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    let rootName = getCleanComponentName(node);
    const rawNodeName = node.name.trim();
    const parentNodeName = node.parent && node.parent.type === 'COMPONENT_SET' ? node.parent.name.trim() : '';
    const isPrivate = rawNodeName.startsWith('_') || rawNodeName.startsWith('.') || parentNodeName.startsWith('_') || parentNodeName.startsWith('.');
    const internalJsDoc = isPrivate ? `/**\n * @internal\n * Private component (${rawNodeName}) - excluded from public Design System presentation.\n * Documented for internal codebase use only.\n */\n` : '';

    interface SubcomponentInfo {
      subName: string;
      fullTag: string;
      htmlTag: string;
      classNames: string;
    }
    const detectedSubcomponents = new Map<string, SubcomponentInfo>();
    const detectedLucideIcons = new Set<string>();
    const detectedExternalComponents = new Set<string>();
    let rootClassNames: string[] = [];

    const resolveTag = (curr: SceneNode, isRoot: boolean): {
      tag: string;
      isSub: boolean;
      isExternal?: boolean;
      subName?: string;
      defaultHtmlTag: string;
      extraProps?: string;
    } => {
      const defaultHtmlTag = curr.name.toLowerCase().includes('button') ? 'button' : 'div';
      if (isRoot) {
        return { tag: rootName, isSub: false, defaultHtmlTag };
      }

      let raw = curr.name.trim();
      let extraProps = '';
      let isExternalComponent = false;
      let externalComponentName = '';

      if (curr.type === 'INSTANCE') {
        const inst = curr as InstanceNode;
        let masterName = '';
        if (inst.mainComponent) {
          const comp = inst.mainComponent;
          const parentCompSet = comp.parent && comp.parent.type === 'COMPONENT_SET' ? comp.parent : null;
          masterName = parentCompSet ? parentCompSet.name : comp.name;
        } else {
          masterName = inst.name;
        }

        const isIconInstance =
          masterName.toLowerCase().includes('lucide') ||
          raw.toLowerCase().includes('lucide') ||
          masterName.toLowerCase().startsWith('icon') ||
          raw.toLowerCase().startsWith('icon') ||
          masterName.toLowerCase().includes('/icon') ||
          (inst.width <= 48 && inst.height <= 48 && Math.abs(inst.width - inst.height) <= 4 && !masterName.toLowerCase().includes('logo'));

        // Clean masterName to PascalCase without stripping slash segments
        let pascalMaster = '';
        if (isIconInstance) {
          const iconRaw = masterName.replace(/^(lucide|icons?)\//i, '').split(/[=,\s/]/)[0];
          const iconPascal = iconRaw
            .split(/[-_/\s]+/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          if (iconPascal) {
            pascalMaster = iconPascal;
            detectedLucideIcons.add(iconPascal);
          }
        } else if (masterName.includes('/')) {
          const segments = masterName.split('/').map(s => s.trim().replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
          pascalMaster = segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        } else {
          const cleanMaster = masterName.split(/[=,\s]/)[0].replace(/[^a-zA-Z0-9]/g, '');
          pascalMaster = cleanMaster.charAt(0).toUpperCase() + cleanMaster.slice(1);
        }

        // Check variant properties on the instance
        if (inst.variantProperties) {
          const propEntries = Object.entries(inst.variantProperties);
          if (propEntries.length > 0) {
            extraProps = propEntries.map(([k, v]) => `${k}="${v}"`).join(' ');
          }
        }

        const isPrivateInstance = masterName.startsWith('_') || masterName.startsWith('.') || raw.startsWith('_') || raw.startsWith('.');

        if (isIconInstance) {
          // Icons are handled by Lucide or inline SVG, never as external components
        } else if (isPrivateInstance) {
          return {
            tag: pascalMaster,
            isSub: true,
            isExternal: false,
            subName: pascalMaster,
            defaultHtmlTag,
            extraProps,
          };
        } else if (pascalMaster.toLowerCase().includes('logotype') || raw.toLowerCase().includes('logotype')) {
          isExternalComponent = true;
          externalComponentName = 'Logotype';
          if (!extraProps) {
            extraProps = 'Size="Large" Schemes="OnSurfaceDarkWhite"';
          }
        } else if (masterName.toLowerCase().startsWith(rootName.toLowerCase()) || raw.toLowerCase().startsWith(rootName.toLowerCase())) {
          raw = masterName;
        } else if (pascalMaster && pascalMaster !== rootName) {
          isExternalComponent = true;
          externalComponentName = pascalMaster;
        }
      }

      if (isExternalComponent && externalComponentName) {
        detectedExternalComponents.add(externalComponentName);
        return {
          tag: externalComponentName,
          isSub: false,
          isExternal: true,
          defaultHtmlTag,
          extraProps,
        };
      }

      if (raw === 'MarqueeLogo' || raw.endsWith('/Logo') || raw.endsWith('.Logo') || raw.toLowerCase() === 'logo' || raw.toLowerCase().includes('logo')) {
        return {
          tag: 'Logotype',
          isSub: false,
          isExternal: true,
          defaultHtmlTag,
          extraProps: 'Size="SemiLarge" Schemes="OnSurfaceDarkWhite"',
        };
      }

      // Direct PascalCase compound notation without dots (e.g., "MarqueeItem", "MarqueeTrack")
      if (raw.startsWith(rootName) && raw.length > rootName.length) {
        const sub = raw.slice(rootName.length).replace(/^[._/ -]+/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (sub) {
          const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
          return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
        }
      }

      // Slash notation in Figma layer (e.g., "Marquee/Item", "Marquee/Track")
      if (raw.includes('/')) {
        const parts = raw.split('/');
        let sub = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, '');
        if (sub.toLowerCase().startsWith(rootName.toLowerCase())) {
          sub = sub.slice(rootName.length);
        }
        sub = sub.replace(/^[._/ -]+/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (sub) {
          const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
          return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
        }
      }

      // Explicit dot notation in Figma layer (e.g., "Marquee.Item", "Marquee.Track")
      if (raw.includes('.')) {
        const parts = raw.split('.');
        let sub = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, '');
        if (sub.toLowerCase().startsWith(rootName.toLowerCase())) {
          sub = sub.slice(rootName.length);
        }
        sub = sub.replace(/^[._/ -]+/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (sub) {
          const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
          return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
        }
      }

      // Recognized subcomponents
      const clean = raw.toLowerCase().replace(/[-_ ]\d+$/, '').replace(/[^a-z]/g, '');
      const known: Record<string, string> = {
        track: 'Track',
        item: 'Item',
        content: 'Content',
        trigger: 'Trigger',
        header: 'Header',
        footer: 'Footer',
        separator: 'Separator',
        dot: 'Separator',
        body: 'Body',
        card: 'Card',
        badge: 'Badge',
        text: 'Text',
        label: 'Text',
        logo: 'Logo',
        icon: 'Icon',
      };

      if (known[clean]) {
        const sub = known[clean];
        return { tag: `${rootName}${sub}`, isSub: true, subName: sub, defaultHtmlTag };
      }

      // PascalCase subcomponents
      if (/^[A-Z][a-zA-Z0-9]*$/.test(raw) && raw !== rootName) {
        return { tag: `${rootName}${raw}`, isSub: true, subName: raw, defaultHtmlTag };
      }

      return { tag: defaultHtmlTag, isSub: false, defaultHtmlTag };
    };

    // Helper to format numeric pixels into standard Tailwind dimension (e.g. 16px -> 4 -> 'h-4', 24px -> 6 -> 'h-6', 44px -> 'min-h-min-max-large')
    const formatDimClass = (val: number, axis: 'w' | 'h' | 'min-w' | 'max-w' | 'min-h' | 'max-h'): string => {
      if (!val || val <= 0) return `${axis}-0`;
      const rounded = Math.round(val * 10) / 10;
      if (axis === 'min-h' || axis === 'max-h' || axis === 'min-w' || axis === 'max-w') {
        if (Math.round(rounded) === 44) return `${axis}-min-max-large`;
        if (Math.round(rounded) === 48) return `${axis}-min-max-extra-large`;
        if (Math.round(rounded) === 56) return `${axis}-min-max-huge`;
        if (Math.round(rounded) === 24) return `${axis}-6`;
        if (Math.round(rounded) === 32) return `${axis}-8`;
        if (Math.round(rounded) === 20) return `${axis}-5`;
        if (Math.round(rounded) === 16) return `${axis}-4`;
      }
      const twUnit = rounded / 4;
      if (Number.isInteger(twUnit) || Number.isInteger(twUnit * 2)) {
        return `${axis}-${twUnit}`;
      }
      return `${axis}-[${Math.round(rounded)}px]`;
    };

    const extractFrameClassNames = async (curr: SceneNode): Promise<string[]> => {
      const boundVars = (curr as any).boundVariables || {};
      const classNames: string[] = [];

      // Auto Layout
      if ('layoutMode' in curr && (curr as FrameNode).layoutMode !== 'NONE') {
        const fn = curr as FrameNode;
        classNames.push('flex');
        if (fn.layoutMode === 'HORIZONTAL') {
          classNames.push('flex-row');
        } else {
          classNames.push('flex-col');
        }

        if (fn.primaryAxisAlignItems === 'CENTER') classNames.push('justify-center');
        else if (fn.primaryAxisAlignItems === 'SPACE_BETWEEN') classNames.push('justify-between');
        else if (fn.primaryAxisAlignItems === 'MAX') classNames.push('justify-end');

        if (fn.counterAxisAlignItems === 'CENTER') classNames.push('items-center');
        else if (fn.counterAxisAlignItems === 'MAX') classNames.push('items-end');

        // Gap / itemSpacing
        const gapVarId = boundVars.itemSpacing?.id;
        const gapVarName = await resolveVarName(gapVarId);
        if (gapVarName) {
          const s = sanitizeSpacingToken(gapVarName);
          classNames.push(s === 'none' || s === '0' || s === 'constant-none' ? 'gap-none' : `gap-${s}`);
        } else if (fn.itemSpacing !== undefined && fn.itemSpacing !== null) {
          if (fn.itemSpacing === 0) {
            classNames.push('gap-none');
          } else {
            const s = matchSpacingToToken(fn.itemSpacing, curr.name, 'gap');
            classNames.push(s === '0' || s === 'none' ? 'gap-none' : `gap-${s}`);
          }
        }

        // Paddings
        const pTopVar = await resolveVarName(boundVars.paddingTop?.id);
        const pBottomVar = await resolveVarName(boundVars.paddingBottom?.id);
        const pLeftVar = await resolveVarName(boundVars.paddingLeft?.id);
        const pRightVar = await resolveVarName(boundVars.paddingRight?.id);

        const isNoneVar = (varName: string | null): boolean => {
          if (!varName) return false;
          const s = sanitizeSpacingToken(varName);
          return s === 'none' || s === '0' || s === 'constant-none' || varName.toLowerCase().includes('none') || varName.toLowerCase().endsWith('/none');
        };

        const resolvePadToken = (varName: string | null, numVal?: number | null, side = 'p'): string | null => {
          if (varName) {
            const s = sanitizeSpacingToken(varName);
            return isNoneVar(varName) ? 'none' : s;
          }
          if (numVal !== undefined && numVal !== null) {
            if (numVal === 0) return 'none';
            const s = matchSpacingToToken(numVal, curr.name, side);
            return s === '0' || s === 'none' ? 'none' : s;
          }
          return null;
        };

        const tPad = resolvePadToken(pTopVar, fn.paddingTop, 'pt');
        const bPad = resolvePadToken(pBottomVar, fn.paddingBottom, 'pb');
        const lPad = resolvePadToken(pLeftVar, fn.paddingLeft, 'pl');
        const rPad = resolvePadToken(pRightVar, fn.paddingRight, 'pr');

        const allFourEqual = tPad !== null && tPad === bPad && tPad === lPad && tPad === rPad;
        if (allFourEqual) {
          classNames.push(`p-${tPad}`);
        } else {
          const verticalEqual = tPad !== null && tPad === bPad;
          const horizontalEqual = lPad !== null && lPad === rPad;

          if (verticalEqual) {
            classNames.push(`py-${tPad}`);
          } else {
            if (tPad !== null) classNames.push(`pt-${tPad}`);
            if (bPad !== null) classNames.push(`pb-${bPad}`);
          }

          if (horizontalEqual) {
            classNames.push(`px-${lPad}`);
          } else {
            if (lPad !== null) classNames.push(`pl-${lPad}`);
            if (rPad !== null) classNames.push(`pr-${rPad}`);
          }
        }
      }

      // Corner Radius
      let radVarName = await resolveVarName(boundVars.cornerRadius?.id);
      if (!radVarName) {
        radVarName = await resolveVarName(boundVars.topLeftRadius?.id);
      }
      if (!radVarName) {
        radVarName = await resolveVarName(boundVars.topRightRadius?.id);
      }

      const numRadius = ('cornerRadius' in curr && typeof (curr as any).cornerRadius === 'number')
        ? (curr as any).cornerRadius
        : ('topLeftRadius' in curr && typeof (curr as any).topLeftRadius === 'number')
          ? (curr as any).topLeftRadius
          : 0;

      let varNumVal: number | null = null;
      const varId = boundVars.cornerRadius?.id || boundVars.topLeftRadius?.id || boundVars.topRightRadius?.id;
      if (varId) {
        try {
          const v = await figma.variables.getVariableByIdAsync(varId);
          if (v && v.resolvedType === 'FLOAT') {
            const mKeys = Object.keys(v.valuesByMode || {});
            if (mKeys.length > 0) {
              const val = v.valuesByMode[mKeys[0]];
              if (typeof val === 'number') varNumVal = val;
            }
          }
        } catch {}
      }

      const isFullPill = numRadius >= 999 ||
        (varNumVal !== null && varNumVal >= 999) ||
        (radVarName ? (/(\b|_)(full|pill)(\b|_)/i.test(radVarName) || radVarName.toLowerCase().endsWith('/full') || radVarName.toLowerCase().endsWith('/pill')) : false);

      if (isFullPill) {
        let effectiveH = ('height' in curr && typeof (curr as any).height === 'number' && (curr as any).height > 0)
          ? (curr as any).height
          : (curr.parent && 'height' in curr.parent && typeof (curr.parent as any).height === 'number')
            ? (curr.parent as any).height
            : 0;
        if (effectiveH > 0) {
          const halfH = Math.round(effectiveH / 2);
          classNames.push(`rounded-[${halfH}px]`);
        } else {
          classNames.push('rounded-full');
        }
      } else if (radVarName) {
        const s = sanitizeRadiusToken(radVarName);
        const isNone = s === 'none' || s === '0' || s === 'constant-none' || radVarName.toLowerCase().includes('none') || radVarName.toLowerCase().endsWith('/none');
        classNames.push(isNone ? 'rounded-none' : `rounded-${s}`);
      } else if (numRadius > 0) {
        const s = matchRadiusToToken(numRadius, curr.name);
        classNames.push(s === 'none' ? 'rounded-none' : `rounded-${s}`);
      }

      // Dimensions (Width / Height / MinWidth / MaxWidth / MinHeight / MaxHeight)
      const formatDimToken = (varName: string | null): string | null => {
        if (!varName) return null;
        const clean = varName.trim();
        const lower = clean.toLowerCase();

        if (lower.includes('wcag')) {
          return 'wcag-min-target';
        }

        if (lower.includes('minmax') || lower.includes('min-max') || lower.startsWith('minmax/') || lower.startsWith('min-max/')) {
          const part = clean.split('/').pop() || clean;
          const kebabPart = part.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          return `min-max-${kebabPart}`;
        }

        if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
          const last = clean.split('/').pop() || clean;
          return last.toLowerCase() === '6' ? '6' : `constant-${last.toLowerCase()}`;
        }

        const lastPart = clean.split('/').pop() || clean;
        return lastPart.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      };

      // 1. Min Width
      const minWVarName = await resolveVarName(boundVars.minWidth?.id);
      if (minWVarName) {
        const s = formatDimToken(minWVarName);
        classNames.push(s === '0' || s === 'none' ? 'min-w-0' : s === 'full' ? 'min-w-full' : `min-w-${s}`);
      } else if ('minWidth' in curr && typeof (curr as any).minWidth === 'number' && (curr as any).minWidth !== null && (curr as any).minWidth > 0) {
        classNames.push(formatDimClass((curr as any).minWidth, 'min-w'));
      }

      // 2. Max Width
      const mwVarName = await resolveVarName(boundVars.maxWidth?.id);
      if (mwVarName) {
        const s = formatDimToken(mwVarName);
        classNames.push(s === 'none' ? 'max-w-none' : s === 'full' ? 'max-w-full' : `max-w-${s}`);
      } else if ('maxWidth' in curr && typeof (curr as any).maxWidth === 'number' && (curr as any).maxWidth !== null && (curr as any).maxWidth > 0) {
        classNames.push(formatDimClass((curr as any).maxWidth, 'max-w'));
      }

      // 3. Width
      const wVarName = await resolveVarName(boundVars.width?.id);
      if (wVarName && (wVarName.toLowerCase().includes('full') || wVarName.toLowerCase().endsWith('/full'))) {
        classNames.push('w-full');
      } else if (wVarName && (wVarName.toLowerCase().includes('screen') || wVarName.toLowerCase().endsWith('/screen'))) {
        classNames.push('w-screen');
      } else if (wVarName && (wVarName.toLowerCase().includes('auto') || wVarName.toLowerCase().endsWith('/auto'))) {
        classNames.push('w-auto');
      } else if ('layoutAlign' in curr && (curr as any).layoutAlign === 'STRETCH') {
        classNames.push('w-full');
      } else if ('width' in curr && typeof (curr as any).width === 'number' && (curr as any).width > 0) {
        // Do not use spacing variables for width/height - parse directly into regular Tailwind classes
        if (!('layoutMode' in curr && (curr as any).layoutMode !== 'NONE')) {
          classNames.push(formatDimClass((curr as any).width, 'w'));
        }
      }
      if ('layoutGrow' in curr && (curr as any).layoutGrow === 1) {
        classNames.push('flex-1');
      }

      // 4. Min Height
      const minHVarName = await resolveVarName(boundVars.minHeight?.id);
      if (minHVarName) {
        const s = formatDimToken(minHVarName);
        classNames.push(s === '0' || s === 'none' ? 'min-h-0' : s === 'full' ? 'min-h-full' : s === 'screen' ? 'min-h-screen' : `min-h-${s}`);
      } else if ('minHeight' in curr && typeof (curr as any).minHeight === 'number' && (curr as any).minHeight !== null && (curr as any).minHeight > 0) {
        classNames.push(formatDimClass((curr as any).minHeight, 'min-h'));
      }

      // 5. Max Height
      const maxHVarName = await resolveVarName(boundVars.maxHeight?.id);
      if (maxHVarName) {
        const s = formatDimToken(maxHVarName);
        classNames.push(s === 'none' ? 'max-h-none' : s === 'full' ? 'max-h-full' : s === 'screen' ? 'max-h-screen' : `max-h-${s}`);
      } else if ('maxHeight' in curr && typeof (curr as any).maxHeight === 'number' && (curr as any).maxHeight !== null && (curr as any).maxHeight > 0) {
        classNames.push(formatDimClass((curr as any).maxHeight, 'max-h'));
      }

      // 6. Height
      const hVarName = await resolveVarName(boundVars.height?.id);
      if (hVarName && (hVarName.toLowerCase().includes('full') || hVarName.toLowerCase().endsWith('/full'))) {
        classNames.push('h-full');
      } else if (hVarName && (hVarName.toLowerCase().includes('screen') || hVarName.toLowerCase().endsWith('/screen'))) {
        classNames.push('h-screen');
      } else if (hVarName && (hVarName.toLowerCase().includes('auto') || hVarName.toLowerCase().endsWith('/auto'))) {
        classNames.push('h-auto');
      } else if ('height' in curr && typeof (curr as any).height === 'number' && (curr as any).height > 0) {
        // Global rule: do not use spacing variables for width/height; parse pixel value directly to Tailwind classes (e.g. h-4, h-6, h-8)
        classNames.push(formatDimClass((curr as any).height, 'h'));
      }

      // Fills
      if ('fills' in curr && Array.isArray(curr.fills) && curr.fills.length > 0) {
        const fill = curr.fills[0];
        if (fill.type === 'SOLID') {
          const colorVarId = (fill as any).boundVariables?.color?.id;
          const colorVarName = await resolveVarName(colorVarId);
          let tokenName: string | null = null;
          if (colorVarName) {
            tokenName = sanitizeColorToken(colorVarName);
          } else if (fill.color) {
            tokenName = matchColorToToken(fill.color, curr.name, curr.type === 'TEXT', false);
          }
          if (tokenName) {
            const prefix = curr.type === 'TEXT' ? 'text' : 'bg';
            classNames.push(`${prefix}-${tokenName}`);
          }
        }
      }

      // Strokes / Borders
      if ('strokes' in curr && Array.isArray(curr.strokes) && curr.strokes.length > 0) {
        const stroke = curr.strokes[0];
        if (stroke.type === 'SOLID') {
          const strokeVarId = (stroke as any).boundVariables?.color?.id;
          const strokeVarName = await resolveVarName(strokeVarId);
          let strokeToken: string | null = null;
          if (strokeVarName) {
            strokeToken = sanitizeColorToken(strokeVarName);
          } else if (stroke.color) {
            strokeToken = matchColorToToken(stroke.color, curr.name, false, true);
          }
          if (strokeToken) {
            classNames.push(`border-${strokeToken}`);
          }
        }
        if ('strokeWeight' in curr && typeof (curr as any).strokeWeight === 'number' && (curr as any).strokeWeight > 0) {
          classNames.push('border');
        } else if ('strokeTopWeight' in curr) {
          const fn = curr as any;
          if (fn.strokeTopWeight > 0 && fn.strokeBottomWeight > 0 && fn.strokeLeftWeight === 0 && fn.strokeRightWeight === 0) {
            classNames.push('border-y');
          } else {
            if (fn.strokeTopWeight > 0) classNames.push('border-t');
            if (fn.strokeBottomWeight > 0) classNames.push('border-b');
            if (fn.strokeLeftWeight > 0) classNames.push('border-l');
            if (fn.strokeRightWeight > 0) classNames.push('border-r');
          }
        }
      }

      return classNames;
    };

    const traverse = async (curr: SceneNode, indent = '  ', isRoot = false): Promise<string> => {
      const classNames: string[] = await extractFrameClassNames(curr);

      // Text Node
      if (curr.type === 'TEXT') {
        const tn = curr as TextNode;
        let resolvedStyleName: string | null = null;
        if (typeof tn.textStyleId === 'string' && tn.textStyleId.length > 0) {
          try {
            const st = await figma.getStyleByIdAsync(tn.textStyleId);
            if (st) resolvedStyleName = st.name;
          } catch {}
        }

        const matchFontSizeToToken = (val: number): string => {
          if (val >= 96) return 'text-6xl';
          if (val >= 72) return 'text-5xl';
          if (val >= 48) return 'text-4xl';
          if (val >= 32) return 'text-3xl';
          if (val >= 24) return 'text-2xl';
          if (val >= 20) return 'text-xl';
          if (val >= 18) return 'text-lg';
          if (val >= 16) return 'text-base';
          if (val >= 14) return 'text-sm';
          if (val <= 12) return 'text-xs';
          return `text-[${val}px]`;
        };

        if (resolvedStyleName) {
          const cleanStyle = resolvedStyleName.toLowerCase();

          if (cleanStyle.includes('heading/h1') || cleanStyle.includes('display/mega')) classNames.push('text-6xl');
          else if (cleanStyle.includes('heading/h2') || cleanStyle.includes('display/huge')) classNames.push('text-5xl');
          else if (cleanStyle.includes('heading/h3') || cleanStyle.includes('display/large')) classNames.push('text-4xl');
          else if (cleanStyle.includes('heading/h4')) classNames.push('text-3xl');
          else if (cleanStyle.includes('heading/h5')) classNames.push('text-2xl');
          else if (cleanStyle.includes('heading/h6')) classNames.push('text-xl');
          else if (cleanStyle.includes('headline/large')) classNames.push('text-2xl');
          else if (cleanStyle.includes('headline/medium')) classNames.push('text-xl');
          else if (cleanStyle.includes('title/large')) classNames.push('text-lg');
          else if (cleanStyle.includes('body/large')) classNames.push('text-body-large');
          else if (cleanStyle.includes('body/medium')) classNames.push('text-body-medium');
          else if (cleanStyle.includes('body/small')) classNames.push('text-body-small');
          else if (cleanStyle.includes('label/large')) classNames.push('text-label-large');
          else if (cleanStyle.includes('label/medium') || cleanStyle.includes('label/small')) classNames.push('text-label-small');
          else if (typeof tn.fontSize === 'number') classNames.push(matchFontSizeToToken(tn.fontSize));

          const fam = tn.fontName && typeof tn.fontName === 'object' ? ((tn.fontName as any).family || '') : '';
          if (fam) {
            const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, '');
            const fontClass = 'font-' + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1);
            if (!classNames.includes(fontClass)) classNames.push(fontClass);
          }

          if (cleanStyle.includes('bold')) classNames.push('font-bold');
          else if (cleanStyle.includes('medium')) classNames.push('font-medium');
          else if (cleanStyle.includes('regular')) classNames.push('font-normal');
        } else {
          if (typeof tn.fontSize === 'number') classNames.push(matchFontSizeToToken(tn.fontSize));
          if (typeof tn.fontName === 'object' && tn.fontName !== null) {
            const fam = (tn.fontName as any).family || '';
            if (fam) {
              const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, '');
              const fontClass = 'font-' + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1);
              if (!classNames.includes(fontClass)) classNames.push(fontClass);
            }

            if ('style' in tn.fontName) {
              const st = (tn.fontName.style || '').toLowerCase();
              if (st.includes('bold')) classNames.push('font-bold');
              else if (st.includes('medium')) classNames.push('font-medium');
            }
          }
        }

        if (typeof tn.textCase === 'string' && tn.textCase === 'UPPER') classNames.push('uppercase');
        const dataStyleAttr = resolvedStyleName ? ` data-text-style="${resolvedStyleName}"` : '';
        return `${indent}<span className="${classNames.join(' ')}"${dataStyleAttr}>${tn.characters}</span>`;
      }

      // Ellipse Node (e.g. separator dot)
      if (curr.type === 'ELLIPSE') {
        classNames.push('rounded-full', 'shrink-0');
        if ('width' in curr && typeof (curr as any).width === 'number') {
          classNames.push(`w-[${(curr as any).width}px]`);
        }
        if ('height' in curr && typeof (curr as any).height === 'number') {
          classNames.push(`h-[${(curr as any).height}px]`);
        }
        return `${indent}<span className="${classNames.join(' ')}" aria-hidden="true" />`;
      }

      const { tag, isSub, isExternal, subName, defaultHtmlTag, extraProps } = resolveTag(curr, isRoot);
      const classAttr = classNames.length > 0 ? ` className="${classNames.join(' ')}"` : '';
      const propsAttr = extraProps ? ` ${extraProps}` : '';

      if (isRoot) {
        if (node.type !== 'COMPONENT_SET') {
          rootClassNames = classNames;
        }
        if ('children' in curr && (curr as FrameNode).children.length > 0) {
          const childStrs: string[] = [];
          const seenSignatures = new Map<string, number>();
          for (const ch of (curr as FrameNode).children) {
            const str = await traverse(ch, indent + '  ', false);
            const count = seenSignatures.get(str) || 0;
            seenSignatures.set(str, count + 1);
            if (count < 2) {
              childStrs.push(str);
            }
          }
          const rootVariantProps = variantPropsDefs.map(v => `${v.propName.charAt(0).toLowerCase() + v.propName.slice(1)}="${v.defaultVal || v.options[0]}"`).join(' ');
          const openTag = rootVariantProps ? `<${tag} ${rootVariantProps}>` : `<${tag}>`;
          return `${indent}${openTag}\n${childStrs.join('\n')}\n${indent}</${tag}>`;
        }
        const rootVariantProps = variantPropsDefs.map(v => `${v.propName.charAt(0).toLowerCase() + v.propName.slice(1)}="${v.defaultVal || v.options[0]}"`).join(' ');
        const selfCloseTag = rootVariantProps ? `<${tag} ${rootVariantProps} />` : `<${tag} />`;
        return `${indent}${selfCloseTag}`;
      } else if (isSub && subName) {
        const cleanSub = subName.replace(/^[._/ -]+/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (!detectedSubcomponents.has(cleanSub)) {
          let finalClassNames = classNames;
          if (cleanSub.toLowerCase().includes('icon')) {
            finalClassNames = classNames.map(c => {
              if (c.startsWith('bg-on-') || c.startsWith('bg-primary') || c.startsWith('bg-secondary') || c.startsWith('bg-error')) {
                return 'bg-current';
              }
              if (c.startsWith('text-on-') || c.startsWith('text-primary') || c.startsWith('text-secondary') || c.startsWith('text-error')) {
                return 'text-current';
              }
              return c;
            });
          }
          detectedSubcomponents.set(cleanSub, {
            subName: cleanSub,
            fullTag: tag,
            htmlTag: defaultHtmlTag,
            classNames: finalClassNames.join(' '),
          });
        }
      }

      if (isExternal) {
        return `${indent}<${tag}${propsAttr}${classAttr} />`;
      }
      if (isSub) {
        if ('children' in curr && (curr as FrameNode).children.length > 0) {
          const childStrs: string[] = [];
          const seenSignatures = new Map<string, number>();
          for (const ch of (curr as FrameNode).children) {
            const str = await traverse(ch, indent + '  ', false);
            const count = seenSignatures.get(str) || 0;
            seenSignatures.set(str, count + 1);
            if (count < 2) {
              childStrs.push(str);
            }
          }
          return `${indent}<${tag}${classAttr}>\n${childStrs.join('\n')}\n${indent}</${tag}>`;
        }
        return `${indent}<${tag}${classAttr} />`;
      }

      if ('children' in curr && (curr as FrameNode).children.length > 0) {
        const childStrs: string[] = [];
        const seenSignatures = new Map<string, number>();
        for (const ch of (curr as FrameNode).children) {
          const str = await traverse(ch, indent + '  ', false);
          const count = seenSignatures.get(str) || 0;
          seenSignatures.set(str, count + 1);
          if (count < 2) {
            childStrs.push(str);
          }
        }
        return `${indent}<${tag}${classAttr}>\n${childStrs.join('\n')}\n${indent}</${tag}>`;
      }

      return `${indent}<${tag}${classAttr} />`;
    };

    // 1. Detect ComponentSet variant property definitions & variants
    const variantPropsDefs: { propName: string; options: string[]; defaultVal?: string }[] = [];
    const booleanPropsDefs: { propName: string; defaultVal: boolean }[] = [];
    const instanceSwapPropsDefs: { propName: string; defaultVal?: string }[] = [];
    const textPropsDefs: { propName: string; defaultVal: string }[] = [];

    let variants: ComponentNode[] = [];
    let defaultVariantNode: ComponentNode | null = null;
    const preferredInstancesMap: Record<string, string[]> = {};

    const rawPropDefs = ('componentPropertyDefinitions' in node)
      ? ((node as any).componentPropertyDefinitions || {})
      : {};

    for (const [propKey, def] of Object.entries(rawPropDefs)) {
      const cleanKey = propKey.split('#')[0].replace(/[^a-zA-Z0-9]/g, '');
      const propPascal = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
      const pType = (def as any).type;
      if (pType === 'VARIANT' && Array.isArray((def as any).variantOptions)) {
        variantPropsDefs.push({
          propName: propPascal,
          options: (def as any).variantOptions,
          defaultVal: (def as any).defaultValue,
        });
      } else if (pType === 'BOOLEAN') {
        booleanPropsDefs.push({
          propName: propPascal,
          defaultVal: false,
        });
      } else if (pType === 'INSTANCE_SWAP') {
        instanceSwapPropsDefs.push({
          propName: propPascal,
          defaultVal: (def as any).defaultValue,
        });

        const preferredValues = (def as any).preferredValues;
        if (Array.isArray(preferredValues) && preferredValues.length > 0) {
          const prefList: string[] = [];
          for (const pv of preferredValues) {
            try {
              if (pv.key) {
                const local = figma.root.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && (n as any).key === pv.key);
                if (local) {
                  prefList.push(local.name);
                } else if (pv.type === 'COMPONENT') {
                  const imported = await figma.importComponentByKeyAsync(pv.key);
                  if (imported) prefList.push(imported.name);
                } else if (pv.type === 'COMPONENT_SET') {
                  const importedSet = await figma.importComponentSetByKeyAsync(pv.key);
                  if (importedSet) prefList.push(importedSet.name);
                }
              }
            } catch (e) {}
          }
          if (prefList.length > 0) {
            preferredInstancesMap[propPascal] = prefList;
          }
        }
      } else if (pType === 'TEXT') {
        textPropsDefs.push({
          propName: propPascal,
          defaultVal: String((def as any).defaultValue || ''),
        });
      }
    }

    if (node.type === 'COMPONENT_SET') {
      const compSet = node as ComponentSetNode;
      variants = compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
      defaultVariantNode = (compSet.defaultVariant as ComponentNode) || (variants[0] || null);
    }

    // Scan slot frames across the component to detect preferred instances (e.g. InputItemText, Lucide icons)
    try {
      if ('findAll' in node) {
        const slotNodes = (node as FrameNode).findAll(n => /slot/i.test(n.name));
        for (const slot of slotNodes) {
          const slotClean = slot.name.replace(/^[._/ -]+/, '').replace(/[^a-zA-Z0-9]/g, '');
          if ('children' in slot && Array.isArray((slot as FrameNode).children)) {
            const instanceChildren = (slot as FrameNode).children.filter(c => c.type === 'INSTANCE') as InstanceNode[];
            for (const inst of instanceChildren) {
              let compName = '';
              if (inst.mainComponent) {
                const parentSet = inst.mainComponent.parent && inst.mainComponent.parent.type === 'COMPONENT_SET' ? inst.mainComponent.parent : null;
                compName = parentSet ? parentSet.name : inst.mainComponent.name;
              } else {
                compName = inst.name;
              }
              if (compName) {
                const cleanComp = compName.split(/[,=]/)[0].trim();
                if (!preferredInstancesMap[slotClean]) {
                  preferredInstancesMap[slotClean] = [];
                }
                if (!preferredInstancesMap[slotClean].includes(cleanComp)) {
                  preferredInstancesMap[slotClean].push(cleanComp);
                }
              }
            }
          }
        }
      }
    } catch (e) {}

    let variantDictCode = '';
    let variantClassesLookup = '';
    let variantDefaultDestructure = '';

    const subcomponentUsageMap = new Map<string, {
      name: string;
      rawName: string;
      isPrivate: boolean;
      isExternal: boolean;
      importPath: string;
      appearingVariants: ComponentNode[];
      propsKeys: Set<string>;
      fixedProps: Map<string, string>;
      isAbsolute: boolean;
    }>();

    // Helper to deeply extract classes for a variant node, including container, surface, and text
    const extractDeepVariantClasses = async (variantNode: ComponentNode): Promise<string[]> => {
      const classesSet = new Set<string>();

      // 1. Root variant node classes
      const rootCls = await extractFrameClassNames(variantNode);
      rootCls.forEach(c => classesSet.add(c));

      // Helper to dynamically resolve icon dimensions to Tailwind classes (e.g. 16px -> 'w-4 h-4', 20px -> 'w-5 h-5', 22px -> 'w-5.5 h-5.5')
      const resolveIconDimensions = async (iconNode: SceneNode): Promise<string | null> => {
        if (!('width' in iconNode) || !('height' in iconNode) || !iconNode.width || !iconNode.height) return null;
        if (iconNode.width > 48 || iconNode.height > 48) return null;

        const boundVars = (iconNode as any).boundVariables || (iconNode.type === 'INSTANCE' && (iconNode as InstanceNode).mainComponent ? ((iconNode as InstanceNode).mainComponent as any).boundVariables : {}) || {};
        let iconW = iconNode.width;
        let iconH = iconNode.height;

        if (boundVars.width?.id) {
          try {
            const v = await figma.variables.getVariableByIdAsync(boundVars.width.id);
            if (v && v.resolvedType === 'FLOAT') {
              const mKeys = Object.keys(v.valuesByMode);
              if (mKeys.length > 0) {
                const val = v.valuesByMode[mKeys[0]];
                if (typeof val === 'number') {
                  iconW = val;
                }
              }
            }
          } catch {}
        }

        if (boundVars.height?.id) {
          try {
            const v = await figma.variables.getVariableByIdAsync(boundVars.height.id);
            if (v && v.resolvedType === 'FLOAT') {
              const mKeys = Object.keys(v.valuesByMode);
              if (mKeys.length > 0) {
                const val = v.valuesByMode[mKeys[0]];
                if (typeof val === 'number') {
                  iconH = val;
                }
              }
            }
          } catch {}
        }

        const formatDimClass = (val: number, axis: 'w' | 'h'): string => {
          if (!val || val <= 0) return `${axis}-0`;
          const rounded = Math.round(val * 10) / 10;
          const twUnit = rounded / 4;
          if (Number.isInteger(twUnit) || Number.isInteger(twUnit * 2)) {
            return `${axis}-${twUnit}`;
          }
          return `${axis}-[${Math.round(rounded)}px]`;
        };

        return `${formatDimClass(iconW, 'w')} ${formatDimClass(iconH, 'h')}`;
      };

      // 2. Traverse child nodes looking for Container, Surface instance, and Text nodes
      const inspectChildren = async (parent: SceneNode) => {
        if (!('children' in parent)) return;
        for (const child of (parent as FrameNode).children) {
          const isIconCandidate =
            child.name.toLowerCase().includes('icon') ||
            child.name.toLowerCase().includes('lucide') ||
            (child.type === 'INSTANCE' &&
              child.width && child.height && child.width <= 48 && child.height <= 48 &&
              !child.name.toLowerCase().includes('surface') &&
              !child.name.toLowerCase().includes('container'));

          if (isIconCandidate && child.width && child.height && child.width <= 48 && child.height <= 48) {
            const iconCls = await resolveIconDimensions(child);
            if (iconCls) {
              const sizeProp = variantNode.variantProperties?.Size || variantNode.variantProperties?.size;
              if (sizeProp) {
                iconSizeBySize.set(sizeProp, iconCls);
              }
            }
            const checkIconColors = async (n: SceneNode) => {
              if ('fills' in n && Array.isArray((n as any).fills) && (n as any).fills.length > 0) {
                const fill = (n as any).fills[0];
                if (fill.type === 'SOLID') {
                  const colorVarId = fill.boundVariables?.color?.id;
                  const colorVarName = await resolveVarName(colorVarId);
                  let token: string | null = colorVarName ? sanitizeColorToken(colorVarName) : null;
                  if (!token && fill.color) {
                    token = matchColorToToken(fill.color, n.name, true, false);
                  }
                  if (token) classesSet.add(`text-${token}`);
                }
              }
              if ('strokes' in n && Array.isArray((n as any).strokes) && (n as any).strokes.length > 0) {
                const stroke = (n as any).strokes[0];
                if (stroke.type === 'SOLID') {
                  const strokeVarId = (stroke as any).boundVariables?.color?.id;
                  const strokeVarName = await resolveVarName(strokeVarId);
                  let token: string | null = strokeVarName ? sanitizeColorToken(strokeVarName) : null;
                  if (!token && stroke.color) {
                    token = matchColorToToken(stroke.color, n.name, true, false);
                  }
                  if (token) classesSet.add(`text-${token}`);
                }
              }
              if ('children' in n) {
                for (const c of (n as any).children) {
                  await checkIconColors(c);
                }
              }
            };
            await checkIconColors(child);
          } else if (child.type === 'FRAME' || child.type === 'GROUP') {
            const frameCls = await extractFrameClassNames(child);
            const isSurfaceOrContainer = /container|surface|background|content|item|box/i.test(child.name);
            frameCls.forEach(c => {
              const isLayoutOrDim = /^(flex|w-|h-|min-w-|min-h-|max-w-|max-h-|p-|px-|py-|pt-|pb-|pl-|pr-|gap-|rounded-)/.test(c);
              if (!isLayoutOrDim) {
                classesSet.add(c);
              } else if (isSurfaceOrContainer) {
                if (/^(rounded-|p-|px-|py-|pt-|pb-|pl-|pr-|max-h-|min-h-)/.test(c)) {
                  classesSet.add(c);
                }
              }
            });
            await inspectChildren(child);
          } else if (child.type === 'INSTANCE') {
            const inst = child as InstanceNode;
            let masterName = '';
            if (inst.mainComponent) {
              const comp = inst.mainComponent;
              const parentCompSet = comp.parent && comp.parent.type === 'COMPONENT_SET' ? comp.parent : null;
              masterName = parentCompSet ? parentCompSet.name : comp.name;
            } else {
              masterName = inst.name;
            }

            const isIcon = isIconCandidate;
            const isSurface = masterName.toLowerCase().includes('surface') || inst.name.toLowerCase().includes('surface');

            if (!isIcon && !isSurface && masterName && masterName.toLowerCase() !== rootName.toLowerCase()) {
              const rawMaster = masterName.split(',')[0].split('=')[0].trim();
              const cleanSub = rawMaster.replace(/^[_./]+/, '').replace(/[^a-zA-Z0-9]/g, '');
              const isPriv = rawMaster.startsWith('_') || rawMaster.startsWith('.');
              const isSubOfRoot = cleanSub.toLowerCase().startsWith(rootName.toLowerCase()) ||
                ['item', 'track', 'content', 'separator', 'trigger', 'body', 'slot', 'leading', 'trailing', 'header', 'footer'].includes(cleanSub.toLowerCase());
              const isKnownExternal = ['button', 'buttonicon', 'iconbutton', 'logotype', 'badge', 'isobadge', 'avatar', 'tag', 'tooltip', 'input', 'select'].includes(cleanSub.toLowerCase());
              const isExternal = !isPriv && !isSubOfRoot && (isKnownExternal || !cleanSub.toLowerCase().includes(rootName.toLowerCase()));
              const kebab = cleanSub.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              const importPath = isPriv ? `./_${cleanSub}` : isExternal ? `../${kebab}` : `./${cleanSub}`;

              if (cleanSub && cleanSub.toLowerCase() !== rootName.toLowerCase()) {
                if (!subcomponentUsageMap.has(cleanSub)) {
                  subcomponentUsageMap.set(cleanSub, {
                    name: cleanSub,
                    rawName: rawMaster,
                    isPrivate: isPriv,
                    isExternal,
                    importPath,
                    appearingVariants: [],
                    propsKeys: new Set<string>(),
                    fixedProps: new Map<string, string>(),
                    isAbsolute: (inst as any).layoutPositioning === 'ABSOLUTE' ||
                                cleanSub.toLowerCase().includes('background') ||
                                cleanSub.toLowerCase().includes('overlay') ||
                                cleanSub.toLowerCase().includes('ring'),
                  });
                }
                const rec = subcomponentUsageMap.get(cleanSub)!;
                if (!rec.appearingVariants.includes(variantNode)) {
                  rec.appearingVariants.push(variantNode);
                }
                if (inst.variantProperties) {
                  Object.entries(inst.variantProperties).forEach(([k, v]) => {
                    const cleanK = k.split('#')[0].replace(/[^a-zA-Z0-9]/g, '');
                    const pascalK = cleanK.charAt(0).toUpperCase() + cleanK.slice(1);
                    rec.propsKeys.add(pascalK);
                    if (!rec.fixedProps.has(pascalK) && v) {
                      rec.fixedProps.set(pascalK, v);
                    }
                  });
                }
              }
            }

            if (isSurface) {
              // Surface subcomponent dropped: only adopt visual frame properties if needed
              if (inst.variantProperties) {
                const rad = inst.variantProperties['Radius'] || inst.variantProperties['radius'];
                if (rad) {
                  const radLower = rad.toLowerCase();
                  if (radLower === 'full') {
                    const h = ('height' in inst && typeof (inst as any).height === 'number' && (inst as any).height > 0)
                      ? (inst as any).height
                      : ('height' in variantNode && typeof variantNode.height === 'number')
                        ? variantNode.height
                        : 0;
                    if (h > 0) {
                      classesSet.add(`rounded-[${Math.round(h / 2)}px]`);
                    } else {
                      classesSet.add('rounded-full');
                    }
                  }
                  else if (radLower === 'large') classesSet.add('rounded-large');
                  else if (radLower === 'base') classesSet.add('rounded-base');
                  else if (radLower === 'small') classesSet.add('rounded-small');
                  else if (radLower === 'extrasmall') classesSet.add('rounded-extra-small');
                  else if (radLower === 'none') classesSet.add('rounded-none');
                }
                const border = inst.variantProperties['Border'] || inst.variantProperties['border'];
                if (border && border.toLowerCase() !== 'none') {
                  classesSet.add('border');
                }
              }
              const surfCls = await extractFrameClassNames(inst);
              surfCls.forEach(c => classesSet.add(c));
            }
            await inspectChildren(child);
          } else if (child.type === 'TEXT') {
            const tn = child as TextNode;
            let styleName: string | null = null;
            if (tn.textStyleId) {
              try {
                const s = await figma.getStyleByIdAsync(tn.textStyleId as string);
                if (s) styleName = s.name;
              } catch {}
            }
            if (styleName) {
              const clean = styleName.toLowerCase();
              if (clean.includes('label/large') || clean.includes('label-large') || clean.includes('label large')) classesSet.add('text-label-large');
              else if (clean.includes('label/medium') || clean.includes('label-medium') || clean.includes('label medium')) classesSet.add('text-label-medium');
              else if (clean.includes('label/small') || clean.includes('label-small') || clean.includes('label small')) classesSet.add('text-label-small');
              else if (clean.includes('body/large') || clean.includes('body-large') || clean.includes('body large')) classesSet.add('text-body-large');
              else if (clean.includes('body/medium') || clean.includes('body-medium') || clean.includes('body medium')) classesSet.add('text-body-medium');
              else if (clean.includes('body/small') || clean.includes('body-small') || clean.includes('body small')) classesSet.add('text-body-small');
              else if (clean.includes('title/large') || clean.includes('title-large')) classesSet.add('text-title-large');
              else if (clean.includes('title/medium') || clean.includes('title-medium')) classesSet.add('text-title-medium');
              else if (clean.includes('title/small') || clean.includes('title-small')) classesSet.add('text-title-small');
              else if (clean.includes('headline/large') || clean.includes('headline-large')) classesSet.add('text-headline-large');
              else if (clean.includes('headline/medium') || clean.includes('headline-medium')) classesSet.add('text-headline-medium');
              else if (clean.includes('headline/small') || clean.includes('headline-small')) classesSet.add('text-headline-small');

              if (clean.includes('bold') || clean.includes('700')) classesSet.add('font-bold');
              else if (clean.includes('medium') || clean.includes('500')) classesSet.add('font-medium');
              else if (clean.includes('regular') || clean.includes('400')) classesSet.add('font-normal');
            } else if (typeof tn.fontSize === 'number') {
              if (tn.fontSize <= 10) classesSet.add('text-label-small');
              else if (tn.fontSize <= 11) classesSet.add('text-label-medium');
              else if (tn.fontSize <= 12) classesSet.add('text-label-large');
              else if (tn.fontSize <= 13) classesSet.add('text-body-small');
              else if (tn.fontSize <= 14) classesSet.add('text-body-medium');
              else if (tn.fontSize <= 16) classesSet.add('text-body-large');
              else if (tn.fontSize <= 18) classesSet.add('text-title-small');
              else if (tn.fontSize <= 20) classesSet.add('text-title-medium');
              else if (tn.fontSize <= 22) classesSet.add('text-title-large');
              else classesSet.add('text-headline-small');
            }

            if (typeof tn.fontName === 'object' && tn.fontName !== null) {
              const fam = (tn.fontName as any).family || '';
              if (fam) {
                const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, '');
                classesSet.add('font-' + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1));
              }
              if ('style' in tn.fontName) {
                const st = ((tn.fontName as any).style || '').toLowerCase();
                if (st.includes('bold') || st.includes('700')) classesSet.add('font-bold');
                else if (st.includes('medium') || st.includes('500')) classesSet.add('font-medium');
              }
            }

            if ('fills' in tn && Array.isArray(tn.fills) && tn.fills.length > 0) {
              const fill = tn.fills[0];
              if (fill.type === 'SOLID') {
                const colorVarId = (fill as any).boundVariables?.color?.id;
                const colorVarName = await resolveVarName(colorVarId);
                let token: string | null = null;
                if (colorVarName) {
                  token = sanitizeColorToken(colorVarName);
                } else if (fill.color) {
                  token = matchColorToToken(fill.color, tn.name, true, false);
                }
                if (token) classesSet.add(`text-${token}`);
              }
            }
          }
        }
      };

      await inspectChildren(variantNode);
      return Array.from(classesSet);
    };

    const iconSizeBySize = new Map<string, string>();

    if (node.type === 'COMPONENT_SET' && variants.length > 0) {
      const variantClassList: { variant: ComponentNode; classes: string[] }[] = [];
      for (const v of variants) {
        const cls = await extractDeepVariantClasses(v);
        variantClassList.push({ variant: v, classes: cls });
      }

      // Compute common classes across all variants
      const common = variantClassList[0].classes.filter((c) =>
        variantClassList.every((vc) => vc.classes.includes(c))
      );
      rootClassNames = common;

      // Find the default resting variant (Hover=False/Default, Disabled=False/Default)
      const defaultVariant = variants.find((v) => {
        const vp = v.variantProperties;
        if (!vp) return false;
        const h = (vp['Hover'] || vp['hover'] || 'false').toLowerCase();
        const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
        return (h === 'false' || h === 'default' || h === '') && (d === 'false' || d === 'default' || d === '');
      }) || variants[0];
      const defaultVariantObj = variantClassList.find(vc => vc.variant === defaultVariant);
      const defaultVariantClasses = defaultVariantObj ? defaultVariantObj.classes : [];

      for (const vDef of variantPropsDefs) {
        const propNamePascal = vDef.propName.charAt(0).toUpperCase() + vDef.propName.slice(1);
        const propNameCamel = propNamePascal.charAt(0).toLowerCase() + propNamePascal.slice(1);
        const typeName = `${rootName}${propNamePascal}`;
        const dictName = `${propNameCamel}Classes`;

        const diffs: Record<string, string> = {};
        let hasAnyDiff = false;

        for (const opt of vDef.options) {
          const matching = variantClassList.filter((vc) => {
            const vp = vc.variant.variantProperties;
            if (!vp) return false;
            const val = vp[vDef.propName] || vp[vDef.propName.toLowerCase()] || vp[vDef.propName.toUpperCase()];
            return val && val.toLowerCase() === opt.toLowerCase();
          });
          const nonMatching = variantClassList.filter((vc) => {
            const vp = vc.variant.variantProperties;
            if (!vp) return true;
            const val = vp[vDef.propName] || vp[vDef.propName.toLowerCase()] || vp[vDef.propName.toUpperCase()];
            return !val || val.toLowerCase() !== opt.toLowerCase();
          });

          const isHoverProp = vDef.propName.toLowerCase() === 'hover';
          const isDisabledProp = vDef.propName.toLowerCase() === 'disabled';
          const isPressedProp = vDef.propName.toLowerCase() === 'pressed';

          let targetMatching = matching;
          let targetNonMatching = nonMatching;

          if (isHoverProp) {
            targetMatching = matching.filter(vc => {
              const d = (vc.variant.variantProperties?.Disabled || vc.variant.variantProperties?.disabled || '').toLowerCase();
              const p = (vc.variant.variantProperties?.Pressed || vc.variant.variantProperties?.pressed || '').toLowerCase();
              return d !== 'true' && p !== 'true';
            });
            targetNonMatching = nonMatching.filter(vc => {
              const d = (vc.variant.variantProperties?.Disabled || vc.variant.variantProperties?.disabled || '').toLowerCase();
              const p = (vc.variant.variantProperties?.Pressed || vc.variant.variantProperties?.pressed || '').toLowerCase();
              return d !== 'true' && p !== 'true';
            });
          } else if (isPressedProp) {
            targetMatching = matching.filter(vc => {
              const d = (vc.variant.variantProperties?.Disabled || vc.variant.variantProperties?.disabled || '').toLowerCase();
              return d !== 'true';
            });
            targetNonMatching = nonMatching.filter(vc => {
              const d = (vc.variant.variantProperties?.Disabled || vc.variant.variantProperties?.disabled || '').toLowerCase();
              return d !== 'true';
            });
          } else if (!isDisabledProp) {
            // For structural/size/scheme properties, compare resting variants (Hover=false/default, Disabled=false/default, Pressed=false/default)
            const restingMatching = matching.filter(vc => {
              const vp = vc.variant.variantProperties || {};
              const h = (vp['Hover'] || vp['hover'] || 'false').toLowerCase();
              const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
              const p = (vp['Pressed'] || vp['pressed'] || 'false').toLowerCase();
              return (h === 'false' || h === 'default' || h === '') && (d === 'false' || d === 'default' || d === '') && (p === 'false' || p === 'default' || p === '');
            });
            const restingNonMatching = nonMatching.filter(vc => {
              const vp = vc.variant.variantProperties || {};
              const h = (vp['Hover'] || vp['hover'] || 'false').toLowerCase();
              const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
              const p = (vp['Pressed'] || vp['pressed'] || 'false').toLowerCase();
              return (h === 'false' || h === 'default' || h === '') && (d === 'false' || d === 'default' || d === '') && (p === 'false' || p === 'default' || p === '');
            });
            if (restingMatching.length > 0) targetMatching = restingMatching;
            if (restingNonMatching.length > 0) targetNonMatching = restingNonMatching;
          }

          const useMatching = targetMatching.length > 0 ? targetMatching : matching;
          const useNonMatching = targetNonMatching.length > 0 ? targetNonMatching : nonMatching;

          const diffClassesList: string[] = [];
          if (useMatching.length > 0) {
            for (const c of useMatching[0].classes) {
              if (common.includes(c)) continue;
              const inAllMatching = useMatching.every((vc) => vc.classes.includes(c));
              const inAllNonMatching = useNonMatching.length > 0 && useNonMatching.every((vc) => vc.classes.includes(c));
              const inAnyNonMatching = useNonMatching.some((vc) => vc.classes.includes(c));

              const isVisualOrDim = /^(bg-|border-|rounded-|p-|px-|py-|pt-|pb-|pl-|pr-|max-h-|min-h-|h-|w-|gap-)/.test(c);

              if (inAllMatching && !inAllNonMatching) {
                diffClassesList.push(c);
              } else if (isVisualOrDim && !inAnyNonMatching && !diffClassesList.includes(c)) {
                // If visual/dimension style is unique to this variant and completely absent in non-matching, preserve 100% fidelity!
                diffClassesList.push(c);
              }
            }
          }

          const hasDedicatedDisabledProp = variantPropsDefs.some(v => v.propName.toLowerCase() === 'disabled');
          const hasDedicatedHoverProp = variantPropsDefs.some(v => v.propName.toLowerCase() === 'hover');
          const hasDedicatedPressedProp = variantPropsDefs.some(v => v.propName.toLowerCase() === 'pressed');
          const isSizeProp = vDef.propName.toLowerCase() === 'size';

          if (!isSizeProp) {
            // Check for Hover differences if no dedicated Hover prop
            if (!isHoverProp && !hasDedicatedHoverProp) {
              const hoverMatching = matching.filter(vc => {
                const vp = vc.variant.variantProperties || {};
                const h = (vp['Hover'] || vp['hover'] || 'false').toLowerCase();
                const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
                const p = (vp['Pressed'] || vp['pressed'] || 'false').toLowerCase();
                return (h === 'true' || h === 'hover') && (d === 'false' || d === 'default' || d === '') && (p === 'false' || p === 'default' || p === '');
              });
              if (hoverMatching.length > 0 && targetMatching.length > 0) {
                const hoverClasses = hoverMatching[0].classes.filter(c =>
                  hoverMatching.every(vc => vc.classes.includes(c)) &&
                  !targetMatching.every(vc => vc.classes.includes(c)) &&
                  !common.includes(c)
                );
                for (const c of hoverClasses) {
                  if (c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('border-')) {
                    const pref = `hover:${c}`;
                    if (!diffClassesList.includes(pref)) {
                      diffClassesList.push(pref);
                    }
                  }
                }
              }
            }

            // Check for Pressed differences if no dedicated Pressed prop
            if (!isPressedProp && !hasDedicatedPressedProp) {
              const pressedMatching = matching.filter(vc => {
                const vp = vc.variant.variantProperties || {};
                const p = (vp['Pressed'] || vp['pressed'] || 'false').toLowerCase();
                const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
                return (p === 'true' || p === 'pressed') && (d === 'false' || d === 'default' || d === '');
              });
              if (pressedMatching.length > 0 && targetMatching.length > 0) {
                const pressedClasses = pressedMatching[0].classes.filter(c =>
                  pressedMatching.every(vc => vc.classes.includes(c)) &&
                  !targetMatching.every(vc => vc.classes.includes(c)) &&
                  !common.includes(c)
                );
                for (const c of pressedClasses) {
                  if (c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('border-') || c.startsWith('scale-')) {
                    const pref = `active:${c}`;
                    if (!diffClassesList.includes(pref)) {
                      diffClassesList.push(pref);
                    }
                  }
                }
              }
            }

            // Check for Disabled differences if no dedicated Disabled prop
            if (!isDisabledProp && !hasDedicatedDisabledProp) {
              const disabledMatching = matching.filter(vc => {
                const vp = vc.variant.variantProperties || {};
                const d = (vp['Disabled'] || vp['disabled'] || 'false').toLowerCase();
                return d === 'true' || d === 'disabled';
              });
              if (disabledMatching.length > 0 && targetMatching.length > 0) {
                const disabledClasses = disabledMatching[0].classes.filter(c =>
                  disabledMatching.every(vc => vc.classes.includes(c)) &&
                  !targetMatching.every(vc => vc.classes.includes(c)) &&
                  !common.includes(c)
                );
                for (const c of disabledClasses) {
                  if (c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('border-')) {
                    const pref = `disabled:${c}`;
                    if (!diffClassesList.includes(pref)) {
                      diffClassesList.push(pref);
                    }
                  }
                }
              }
            }
          }

          const diffClasses = diffClassesList.join(' ');
          diffs[opt] = diffClasses;
          if (diffClasses.length > 0) hasAnyDiff = true;
        }

        // Symmetrical pairing for boolean / binary properties (e.g. Background, Filled, Active, etc.)
        const trueOpt = vDef.options.find(o => o.toLowerCase() === 'true');
        const falseOpt = vDef.options.find(o => o.toLowerCase() === 'false');
        if (trueOpt && falseOpt) {
          const trueClasses = diffs[trueOpt] ? diffs[trueOpt].split(' ').filter(Boolean) : [];
          const falseClasses = diffs[falseOpt] ? diffs[falseOpt].split(' ').filter(Boolean) : [];

          // 1. Padding contrast
          const hasPaddingInTrue = trueClasses.some(c => /^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c) && c !== 'p-none');
          const hasPaddingInFalse = falseClasses.some(c => /^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c));
          if (hasPaddingInTrue && !hasPaddingInFalse) {
            falseClasses.push('p-none');
          } else if (hasPaddingInFalse && !hasPaddingInTrue) {
            const matchingTrue = variantClassList.filter(vc => {
              const val = (vc.variant.variantProperties?.[vDef.propName] || '').toLowerCase();
              return val === 'true';
            });
            for (const vc of matchingTrue) {
              for (const c of vc.classes) {
                if (/^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c) && c !== 'p-none' && !trueClasses.includes(c)) {
                  trueClasses.push(c);
                }
              }
            }
          }

          // 2. Corner Radius contrast
          const hasRadiusInTrue = trueClasses.some(c => /^rounded-/.test(c) && c !== 'rounded-none');
          const hasRadiusInFalse = falseClasses.some(c => /^rounded-/.test(c));
          if (hasRadiusInTrue && !hasRadiusInFalse) {
            falseClasses.push('rounded-none');
          } else if (hasRadiusInFalse && !hasRadiusInTrue) {
            const matchingTrue = variantClassList.filter(vc => {
              const val = (vc.variant.variantProperties?.[vDef.propName] || '').toLowerCase();
              return val === 'true';
            });
            for (const vc of matchingTrue) {
              for (const c of vc.classes) {
                if (/^rounded-/.test(c) && c !== 'rounded-none' && !trueClasses.includes(c)) {
                  trueClasses.push(c);
                }
              }
            }
          }

          // 3. Max Height contrast
          const hasMaxHInTrue = trueClasses.some(c => /^max-h-/.test(c) && c !== 'max-h-none');
          const hasMaxHInFalse = falseClasses.some(c => /^max-h-/.test(c));
          if (hasMaxHInTrue && !hasMaxHInFalse) {
            falseClasses.push('max-h-none');
          } else if (hasMaxHInFalse && !hasMaxHInTrue) {
            const matchingTrue = variantClassList.filter(vc => {
              const val = (vc.variant.variantProperties?.[vDef.propName] || '').toLowerCase();
              return val === 'true';
            });
            for (const vc of matchingTrue) {
              for (const c of vc.classes) {
                if (/^max-h-/.test(c) && c !== 'max-h-none' && !trueClasses.includes(c)) {
                  trueClasses.push(c);
                }
              }
            }
          }

          diffs[trueOpt] = trueClasses.join(' ');
          diffs[falseOpt] = falseClasses.join(' ');
          if (diffs[trueOpt] || diffs[falseOpt]) hasAnyDiff = true;
        }

        // Special handling for Hover variant:
        // Inactive state applies active differences with native CSS hover: prefix to animate hover state!
        if (vDef.propName.toLowerCase() === 'hover') {
          const activeOpt = vDef.options.find(o => o.toLowerCase() === 'true' || o.toLowerCase() === 'hover') || vDef.options[1];
          const inactiveOpt = vDef.options.find(o => o.toLowerCase() === 'false' || o.toLowerCase() === 'default') || vDef.options[0];
          if (activeOpt && inactiveOpt && diffs[activeOpt]) {
            const activeClasses = diffs[activeOpt].split(' ').filter(Boolean);
            const hoverPrefixed = activeClasses.map(c => `hover:${c}`).join(' ');
            const restingPart = diffs[inactiveOpt] ? `${diffs[inactiveOpt]} ` : '';
            diffs[inactiveOpt] = `${restingPart}${hoverPrefixed}`.trim();
            hasAnyDiff = true;
          }
        }

        // Special handling for Pressed variant:
        // Inactive state applies active differences with native CSS active: prefix!
        if (vDef.propName.toLowerCase() === 'pressed') {
          const activeOpt = vDef.options.find(o => o.toLowerCase() === 'true' || o.toLowerCase() === 'pressed') || vDef.options[1];
          const inactiveOpt = vDef.options.find(o => o.toLowerCase() === 'false' || o.toLowerCase() === 'default') || vDef.options[0];
          if (activeOpt && inactiveOpt && diffs[activeOpt]) {
            const activeClasses = diffs[activeOpt].split(' ').filter(Boolean);
            const activePrefixed = activeClasses.map(c => `active:${c}`).join(' ');
            const restingPart = diffs[inactiveOpt] ? `${diffs[inactiveOpt]} ` : '';
            diffs[inactiveOpt] = `${restingPart}${activePrefixed}`.trim();
            hasAnyDiff = true;
          } else if (activeOpt && inactiveOpt && !diffs[activeOpt]) {
            diffs[activeOpt] = 'scale-95';
            diffs[inactiveOpt] = 'active:scale-95';
            hasAnyDiff = true;
          }
        }

        if (hasAnyDiff) {
          variantDictCode += `const ${dictName}: Record<${typeName}, string> = {\n` +
            vDef.options.map((opt) => `  ${opt}: '${diffs[opt] || ''}',`).join('\n') +
            '\n}\n\n';

          variantClassesLookup += ` \${${propNamePascal} ? (${dictName} as any)[${propNamePascal}] || '' : ''}`;
        }

        const defaultVal = vDef.defaultVal || vDef.options[0];
        variantDefaultDestructure += `  ${propNamePascal} = '${defaultVal}',\n`;
      }

      // Preserve base resting fill / text colors from defaultVariant if no scheme variant handles it
      const hasSchemeProp = variantPropsDefs.some(v => v.propName.toLowerCase().includes('scheme'));
      if (!hasSchemeProp && defaultVariantClasses.length > 0) {
        for (const cls of defaultVariantClasses) {
          if (
            (cls.startsWith('bg-') || cls.startsWith('text-') || cls.startsWith('rounded-')) &&
            !rootClassNames.includes(cls) &&
            !variantDictCode.includes(`'${cls}'`) &&
            !variantDictCode.includes(` ${cls}`) &&
            !variantDictCode.includes(`${cls} `)
          ) {
            rootClassNames.push(cls);
          }
        }
      }

      // Generate iconSizeClasses if icon sizing was detected per Size variant
      const sizeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'size');
      if (sizeDef && iconSizeBySize.size > 0) {
        const iconSizeTypeName = `${rootName}Size`;
        variantDictCode += `const iconSizeClasses: Record<${iconSizeTypeName}, string> = {\n` +
          sizeDef.options.map((opt) => `  ${opt}: '${iconSizeBySize.get(opt) || 'w-4 h-4'}',`).join('\n') +
          '\n}\n\n';
      }
    }

    const isSvgGraphic = !rootName.toLowerCase().includes('button') && /logo|logotype|icon|graphic|svg|mark|symbol|badge/i.test(rootName);

    // 2. Check for vector SVG export if component is an icon/logo/vector
    let svgJsx = '';
    if (isSvgGraphic) {
      try {
        const sampleNode = node.type === 'COMPONENT_SET' && (node as ComponentSetNode).children.length > 0
          ? (node as ComponentSetNode).children[0]
          : node;
        const svgBytes = await (sampleNode as any).exportAsync({ format: 'SVG' });
        let rawSvg = '';
        for (let i = 0; i < svgBytes.length; i++) {
          rawSvg += String.fromCharCode(svgBytes[i]);
        }
        const viewBoxMatch = rawSvg.match(/viewBox="([^"]+)"/);
        const viewBoxAttr = viewBoxMatch ? `viewBox="${viewBoxMatch[1]}"` : 'viewBox="0 0 100 100"';
        const innerContent = rawSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();
        // Replace paths that had opacity (elevationHigher in Figma) with Design System token var(--color-elevation-higher)
        let currentColorContent = innerContent.replace(
          /<path([^>]*?)(?:fill-opacity="0\.[0-9]+"|fillOpacity=\{0\.[0-9]+\})([^>]*?)\/?>/gi,
          (match, p1, p2) => {
            const combined = `${p1} ${p2}`
              .replace(/fill="[^"]*"/gi, '')
              .replace(/fill-opacity="[^"]*"/gi, '')
              .replace(/fillOpacity=\{[^}]*\}/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            return `<path ${combined} fill="var(--color-elevation-higher)"/>`;
          }
        );
        currentColorContent = currentColorContent
          .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"')
          .replace(/fill="black"/g, 'fill="currentColor"');

        const scaleDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'scale');
        const sizeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'size');
        const schemeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'schemes' || v.propName.toLowerCase() === 'scheme');

        if (scaleDef && sizeDef) {
          const scaleTypeName = `${rootName}Scale`;
          const sizeTypeName = `${rootName}Size`;
          let matrixCode = `const sizeClasses: Record<${scaleTypeName}, Record<${sizeTypeName}, string>> = {\n`;
          for (const sc of scaleDef.options) {
            matrixCode += `  ${sc}: {\n`;
            for (const sz of sizeDef.options) {
              const matchedVariant = variants.find(v => {
                const vp = v.variantProperties;
                if (!vp) return false;
                const scVal = vp['Scale'] || vp['scale'];
                const szVal = vp['Size'] || vp['size'];
                return scVal && scVal.toLowerCase() === sc.toLowerCase() && szVal && szVal.toLowerCase() === sz.toLowerCase();
              });
              let hCls = 'h-8';
              if (matchedVariant && typeof matchedVariant.height === 'number' && matchedVariant.height > 0) {
                hCls = formatDimClass(matchedVariant.height, 'h');
              } else {
                const szIdx = sizeDef.options.indexOf(sz);
                const basePx = sc.toLowerCase() === 'big' ? 32 : 16;
                const stepPx = sc.toLowerCase() === 'big' ? 16 : 8;
                const totalH = basePx + (szIdx >= 0 ? szIdx : 0) * stepPx;
                hCls = formatDimClass(totalH, 'h');
              }
              matrixCode += `    ${sz}: '${hCls}',\n`;
            }
            matrixCode += `  },\n`;
          }
          matrixCode += `}\n\n`;
          variantDictCode = matrixCode + variantDictCode.replace(/const sizeClasses[\s\S]*?\}\n\n/, '').replace(/const scaleClasses[\s\S]*?\}\n\n/, '');
        }

        const sizeLookup = (scaleDef && sizeDef)
          ? `\${Scale && Size ? (sizeClasses as any)[Scale]?.[Size] || '' : Size ? (sizeClasses as any).Small?.[Size] || '' : ''}`
          : sizeDef
            ? `\${Size ? (sizeClasses as any)[Size] || '' : ''}`
            : '';
        const schemeLookup = schemeDef ? `\${Schemes ? (schemeClasses as any)[Schemes] || '' : ''}` : '';

        svgJsx = `<svg
      role="img"
      aria-label={alt}
      ${viewBoxAttr}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={\`w-auto shrink-0 ${sizeLookup} ${schemeLookup} \${className}\`.trim()}
      {...props}
    >
      <title>{alt}</title>
      ${currentColorContent}
    </svg>`;
      } catch (err) {
        console.warn('[Export] SVG export failed:', err);
      }
    }

    const rootNodeToTraverse: SceneNode = (node.type === 'COMPONENT_SET' && defaultVariantNode) ? defaultVariantNode : node;
    const usageJsx = await traverse(rootNodeToTraverse, '', true);

    const subList = Array.from(detectedSubcomponents.values());

    const subDefsCode = subList
      .map(
        (s) => `export const ${rootName}${s.subName}: FC<{ className?: string; children?: ReactNode }> = ({ className = '', children }) => (
  <${s.htmlTag} className={\`${s.classNames} \${className}\`.trim()}>
    {children}
  </${s.htmlTag}>
)`
      )
      .join('\n\n');

    const variantTypesCode = variantPropsDefs.length > 0
      ? variantPropsDefs.map(v => `export type ${rootName}${v.propName.charAt(0).toUpperCase() + v.propName.slice(1)} = ${v.options.map(o => `'${o}'`).join(' | ')}`).join('\n') + '\n\n'
      : '';

    const variantPropsFields = [
      ...variantPropsDefs.map(v => `  ${v.propName}?: ${rootName}${v.propName}`),
      ...booleanPropsDefs.map(b => `  ${b.propName}?: boolean`),
      ...instanceSwapPropsDefs.map(i => `  ${i.propName}?: React.ComponentType<{ className?: string }> | ReactNode`),
      ...textPropsDefs.map(t => `  ${t.propName}?: string`),
    ].join('\n') + (variantPropsDefs.length || booleanPropsDefs.length || instanceSwapPropsDefs.length || textPropsDefs.length ? '\n' : '');

    let fullTsxModule = '';
    if (svgJsx) {
      const sizeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'size');
      const schemeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'schemes' || v.propName.toLowerCase() === 'scheme');

      const sizeDictCode = sizeDef ? `const sizeClasses: Record<${rootName}Size, string> = {\n` +
        sizeDef.options.map(opt => {
          const kebab = opt.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          return `  ${opt}: 'h-${kebab}',`;
        }).join('\n') + '\n}\n\n' : '';

      const schemeDictCode = schemeDef ? `const schemeClasses: Record<${rootName}Schemes, string> = {\n` +
        schemeDef.options.map(opt => {
          const kebab = opt.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          return `  ${opt}: 'text-${kebab}',`;
        }).join('\n') + '\n}\n\n' : '';

      const defaultSize = sizeDef ? (sizeDef.defaultVal || sizeDef.options[0]) : 'Base';
      const defaultScheme = schemeDef ? (schemeDef.defaultVal || schemeDef.options[0]) : 'OnSurfaceDarkWhite';

      const defaultPropsDestructure = [
        sizeDef ? `  Size = '${defaultSize}',` : '',
        schemeDef ? `  Schemes = '${defaultScheme}',` : '',
        "  className = '',",
        `  alt = '${rootName}',`,
        "  ...props",
      ].filter(Boolean).join('\n');

      fullTsxModule = `import React, { FC, SVGProps } from 'react'

${variantTypesCode}${sizeDictCode}${schemeDictCode}export interface I${rootName}Props extends Omit<SVGProps<SVGSVGElement>, 'color' | 'size'> {
${variantPropsFields}  className?: string
  alt?: string
}

${internalJsDoc}export const ${rootName}: FC<I${rootName}Props> = ({
${defaultPropsDestructure}
}) => {
  return (
    ${svgJsx}
  )
}

export default ${rootName}

/*
 * ==========================================
 * Example Usage:
 * ==========================================
<${rootName}${sizeDef ? ` Size="${defaultSize}"` : ''}${schemeDef ? ` Schemes="${defaultScheme}"` : ''} />
 */
`;
    } else {
      const isButton = rootName.toLowerCase().includes('button');
      const hasHoverProp = variantPropsDefs.some(v => v.propName.toLowerCase() === 'hover');
      if (hasHoverProp || isButton) {
        rootClassNames.push(
          'transition-all',
          'duration-700',
          'ease-[cubic-bezier(0.25,1,0.5,1)]',
          'cursor-pointer',
          'disabled:cursor-not-allowed',
          'disabled:pointer-events-none'
        );
      }

      interface DetectedImportedSubcomponent {
        name: string;
        rawName: string;
        isPrivate: boolean;
        isExternal: boolean;
        importPath: string;
        conditionProp?: string;
        conditionVal?: string;
        matchingProps: string[];
        fixedProps: Map<string, string>;
        isAbsolute: boolean;
      }

      const detectedImportedSubcomponents: DetectedImportedSubcomponent[] = [];

      for (const [subKey, rec] of subcomponentUsageMap.entries()) {
        let conditionProp: string | undefined;
        let conditionVal: string | undefined;

        if (variants.length > 0 && rec.appearingVariants.length < variants.length) {
          for (const vDef of variantPropsDefs) {
            const propName = vDef.propName;
            const appearingVals = new Set(
              rec.appearingVariants.map(v => (v.variantProperties?.[propName] || v.variantProperties?.[propName.toLowerCase()] || '').trim())
            );
            if (appearingVals.size === 1) {
              const singleVal = Array.from(appearingVals)[0];
              const nonAppearingVariants = variants.filter(v => !rec.appearingVariants.includes(v));
              const nonAppearingVals = new Set(
                nonAppearingVariants.map(v => (v.variantProperties?.[propName] || v.variantProperties?.[propName.toLowerCase()] || '').trim())
              );
              if (!nonAppearingVals.has(singleVal) && singleVal) {
                conditionProp = propName;
                conditionVal = singleVal;
                break;
              }
            }
          }
        }

        const matchingProps: string[] = [];
        const parentPropNames = [
          ...variantPropsDefs.map(v => v.propName),
          ...booleanPropsDefs.map(b => b.propName),
          ...textPropsDefs.map(t => t.propName),
        ];

        for (const pk of rec.propsKeys) {
          const matchedParentProp = parentPropNames.find(p => p.toLowerCase() === pk.toLowerCase());
          if (matchedParentProp && !matchingProps.includes(matchedParentProp)) {
            matchingProps.push(matchedParentProp);
          }
        }

        detectedImportedSubcomponents.push({
          name: rec.name,
          rawName: rec.rawName,
          isPrivate: rec.isPrivate,
          isExternal: rec.isExternal,
          importPath: rec.importPath,
          conditionProp,
          conditionVal,
          matchingProps,
          fixedProps: rec.fixedProps,
          isAbsolute: rec.isAbsolute,
        });
      }

      if (detectedImportedSubcomponents.some(s => s.isAbsolute)) {
        if (!rootClassNames.includes('relative')) {
          rootClassNames.unshift('relative');
        }
      }

      const rootClassStr = rootClassNames.join(' ');
      const rootClassesCombined = `${rootClassStr}${variantClassesLookup}`.trim();
      const lucideImport = detectedLucideIcons.size > 0
        ? `import { ${Array.from(detectedLucideIcons).sort().join(', ')} } from 'lucide-react'\n`
        : '';
      const subcomponentImports = detectedImportedSubcomponents.length > 0
        ? detectedImportedSubcomponents
            .map(s => `import { ${s.name} } from '${s.importPath}'`)
            .join('\n') + '\n'
        : '';
      const externalImports = detectedExternalComponents.size > 0
        ? Array.from(detectedExternalComponents)
            .filter(c => c !== rootName && c !== 'Surface' && !detectedLucideIcons.has(c) && !detectedImportedSubcomponents.some(s => s.name === c))
            .map(c => {
              const kebab = c.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              return `import { ${c} } from '../${kebab}'`;
            })
            .join('\n') + '\n'
        : '';

      const extendsInterface = isButton
        ? ' extends React.ButtonHTMLAttributes<HTMLButtonElement>'
        : '';

      const extraPropsDestructure = [
        ...booleanPropsDefs.map(b => `  ${b.propName} = ${b.defaultVal},`),
        ...instanceSwapPropsDefs.map(i => `  ${i.propName},`),
        ...textPropsDefs.map(t => `  ${t.propName} = '${t.defaultVal}',`),
      ].join('\n') + (booleanPropsDefs.length || instanceSwapPropsDefs.length || textPropsDefs.length ? '\n' : '');

      const hasText = textPropsDefs.some(t => t.propName.toLowerCase() === 'text');
      const showLeft = booleanPropsDefs.find(b => b.propName.toLowerCase().includes('iconleft'));
      const showRight = booleanPropsDefs.find(b => b.propName.toLowerCase().includes('iconright'));
      const leftIconProp = instanceSwapPropsDefs.find(i => i.propName.toLowerCase().includes('iconleft'))?.propName || 'IconLeft';
      const rightIconProp = instanceSwapPropsDefs.find(i => i.propName.toLowerCase().includes('iconright'))?.propName || 'IconRight';
      const defaultIcon = detectedLucideIcons.size > 0 ? Array.from(detectedLucideIcons)[0] : '';
      const sizeDef = variantPropsDefs.find(v => v.propName.toLowerCase() === 'size');
      const hasDynamicIconSizes = Boolean(sizeDef && iconSizeBySize.size > 0);
      const iconSizeClassProp = hasDynamicIconSizes
        ? '`' + '${iconSizeClasses[Size] || \'w-4 h-4\'} shrink-0`'
        : '"w-4 h-4 shrink-0"';
      const iconSizeJsxProp = hasDynamicIconSizes
        ? '{`' + '${iconSizeClasses[Size] || \'w-4 h-4\'} shrink-0`}'
        : '"w-4 h-4 shrink-0"';

      let innerJsx = '';
      for (const sub of detectedImportedSubcomponents) {
        const propAttrs: string[] = [];
        for (const p of sub.matchingProps) {
          propAttrs.push(`${p}={${p}}`);
        }
        for (const [k, v] of sub.fixedProps.entries()) {
          if (!sub.matchingProps.includes(k)) {
            propAttrs.push(`${k}="${v}"`);
          }
        }
        const propsAttr = propAttrs.length > 0 ? propAttrs.join(' ') : '';
        const clsAttr = sub.isAbsolute ? ' className="absolute -inset-[3px] pointer-events-none"' : '';
        const fullTag = `<${sub.name}${propsAttr ? ' ' + propsAttr : ''}${clsAttr} />`;
        if (sub.conditionProp && sub.conditionVal) {
          innerJsx += `\n        {${sub.conditionProp} === '${sub.conditionVal}' && (\n          ${fullTag}\n        )}`;
        } else {
          innerJsx += `\n        ${fullTag}`;
        }
      }

      const slotLeading = detectedSubcomponents.get('LeadingSlot') || detectedSubcomponents.get(`${rootName}LeadingSlot`);
      const slotContent = detectedSubcomponents.get('Content') || detectedSubcomponents.get(`${rootName}Content`);
      const slotTrailing = detectedSubcomponents.get('TrailingSlot') || detectedSubcomponents.get(`${rootName}TrailingSlot`);

      if (slotLeading || slotContent || slotTrailing) {
        const showLeading = booleanPropsDefs.find(b => b.propName.toLowerCase().includes('leadingslot'))?.propName;
        const showTrailing = booleanPropsDefs.find(b => b.propName.toLowerCase().includes('trailingslot'))?.propName;

        if (showLeading && slotLeading) {
          innerJsx += `\n        {${showLeading} && <${slotLeading.fullTag} />}`;
        }
        if (slotContent) {
          const contentChild = hasText ? '<span>{children || Text || Placeholder}</span>' : '{children}';
          innerJsx += `\n        <${slotContent.fullTag}>\n          ${contentChild}\n        </${slotContent.fullTag}>`;
        } else if (hasText) {
          innerJsx += `\n        <span>{children || Text || Placeholder}</span>`;
        }
        if (showTrailing && slotTrailing) {
          innerJsx += `\n        {${showTrailing} && <${slotTrailing.fullTag} />}`;
        }
        innerJsx += '\n      ';
      } else if (hasText || showLeft || showRight) {
        const leftSnippet = showLeft ? `\n        {${showLeft.propName} && (${leftIconProp} ? (React.isValidElement(${leftIconProp}) ? ${leftIconProp} : React.createElement(${leftIconProp} as any, { className: ${iconSizeClassProp} })) : ${defaultIcon ? `<${defaultIcon} className=${iconSizeJsxProp} />` : 'null'})}` : '';
        const textSnippet = hasText ? `\n        <span>{children || Text}</span>` : `\n        {children}`;
        const rightSnippet = showRight ? `\n        {${showRight.propName} && (${rightIconProp} ? (React.isValidElement(${rightIconProp}) ? ${rightIconProp} : React.createElement(${rightIconProp} as any, { className: ${iconSizeClassProp} })) : ${defaultIcon ? `<${defaultIcon} className=${iconSizeJsxProp} />` : 'null'})}` : '';
        innerJsx += `${leftSnippet}${textSnippet}${rightSnippet}\n      `;
      } else {
        innerJsx += innerJsx ? '\n        {children}\n      ' : '{children}';
      }

      const htmlTag = isButton ? 'button' : 'div';
      const hasDisabledProp = variantPropsDefs.some(v => v.propName.toLowerCase() === 'disabled');
      const extraHtmlProps = isButton ? `${hasDisabledProp ? ' disabled={Disabled === \'True\'}' : ''} type="button"` : '';

      fullTsxModule = `import React, { FC, ReactNode } from 'react'
${subcomponentImports}${lucideImport}${externalImports}
${variantTypesCode}${variantDictCode}export interface I${rootName}Props${extendsInterface} {
${variantPropsFields}  className?: string
  children?: ReactNode
}

${internalJsDoc}export const ${rootName}: FC<I${rootName}Props> = ({
${variantDefaultDestructure}${extraPropsDestructure}  className = '',
  children,
  ...props
}) => {
  return (
    <${htmlTag}${extraHtmlProps} className={\`${rootClassesCombined} \${className}\`.trim()} {...props}>
      ${innerJsx}
    </${htmlTag}>
  )
}

${subDefsCode}

export default ${rootName}

/*
 * ==========================================
 * Example Usage:
 * ==========================================
${usageJsx}
 */
`;
    }

    const compDesc = extractNodeDescription(node);
    return {
      code: fullTsxModule,
      name: rootName,
      rawName: rawNodeName,
      description: compDesc,
      isPrivate,
      preferredInstances: preferredInstancesMap,
      violations: tokenViolations,
    } as any;
  }
}

export async function buildFigmaNode(
  def: ComponentNodeDef,
  parent?: BaseNode & ChildrenMixin,
  engine?: VariableEngine,
  subComponentMasters?: Map<string, ComponentNode>
): Promise<SceneNode | null> {
  let node: SceneNode | null = null;

  if (def.type === 'FRAME' || (def as any).type === 'COMPONENT') {
    const frame = figma.createFrame();
    frame.name = def.name || 'frame';

    if (def.width && def.height) {
      frame.resize(def.width, def.height);
    }

    if (def.layoutMode && def.layoutMode !== 'NONE') {
      frame.layoutMode = def.layoutMode;
      if (def.primaryAxisSizingMode) frame.primaryAxisSizingMode = def.primaryAxisSizingMode;
      if (def.counterAxisSizingMode) frame.counterAxisSizingMode = def.counterAxisSizingMode;
      if (def.primaryAxisAlignItems) frame.primaryAxisAlignItems = def.primaryAxisAlignItems;
      if (def.counterAxisAlignItems) frame.counterAxisAlignItems = def.counterAxisAlignItems;
      frame.itemSpacing = def.itemSpacing ?? 0;
      frame.paddingTop = def.paddingTop ?? 0;
      frame.paddingBottom = def.paddingBottom ?? 0;
      frame.paddingLeft = def.paddingLeft ?? 0;
      frame.paddingRight = def.paddingRight ?? 0;
    }

    if (def.clipsContent !== undefined) {
      frame.clipsContent = def.clipsContent;
    }

    if (def.cornerRadius !== undefined) {
      frame.cornerRadius = def.cornerRadius;
      frame.cornerSmoothing = 0.6;
    }

    if (def.fills && def.fills.length > 0) {
      frame.fills = def.fills.map((f) => ({
        type: 'SOLID',
        color: parseHexOrRgb(f.color || f.hex),
        opacity: f.opacity ?? 1,
      }));
    } else {
      frame.fills = [];
    }

    if (def.strokes && def.strokes.length > 0) {
      frame.strokes = def.strokes.map((s) => ({
        type: 'SOLID',
        color: parseHexOrRgb(s.color || s.hex),
        opacity: s.opacity ?? 1,
      }));
      if (def.strokeWeight !== undefined) frame.strokeWeight = def.strokeWeight;
      if (def.strokeTopWeight !== undefined) frame.strokeTopWeight = def.strokeTopWeight;
      if (def.strokeBottomWeight !== undefined) frame.strokeBottomWeight = def.strokeBottomWeight;
      if (def.strokeLeftWeight !== undefined) frame.strokeLeftWeight = def.strokeLeftWeight;
      if (def.strokeRightWeight !== undefined) frame.strokeRightWeight = def.strokeRightWeight;
    }

    if (def.layoutGrow !== undefined) frame.layoutGrow = def.layoutGrow;
    if (def.layoutAlign !== undefined) frame.layoutAlign = def.layoutAlign;

    if (parent) {
      parent.appendChild(frame);
    }

    if (def.children && def.children.length > 0) {
      for (const childDef of def.children) {
        await buildFigmaNode(childDef, frame, engine, subComponentMasters);
      }
    }

    if (def.layoutMode && def.layoutMode !== 'NONE') {
      if (def.primaryAxisSizingMode) frame.primaryAxisSizingMode = def.primaryAxisSizingMode;
      if (def.counterAxisSizingMode) frame.counterAxisSizingMode = def.counterAxisSizingMode;
    }

    if (engine) {
      await engine.bindNodeVariables(frame, def);
    }

    node = frame;
  } else if (def.type === 'INSTANCE') {
    const targetName = def.componentName || def.name;
    let master = targetName && subComponentMasters ? subComponentMasters.get(targetName) : null;
    if (!master && targetName) {
      let found: BaseNode | null = figma.currentPage.findOne(
        (n) => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && (n.name.toLowerCase() === targetName.toLowerCase() || n.name.toLowerCase().startsWith(targetName.toLowerCase() + '/'))
      );
      if (!found) {
        for (const page of figma.root.children) {
          found = page.findOne(
            (n) => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && (n.name.toLowerCase() === targetName.toLowerCase() || n.name.toLowerCase().startsWith(targetName.toLowerCase() + '/'))
          );
          if (found) break;
        }
      }
      if (found) {
        if (found.type === 'COMPONENT') {
          master = found as ComponentNode;
        } else if (found.type === 'COMPONENT_SET') {
          const compSet = found as ComponentSetNode;
          if (def.variantProperties) {
            master = compSet.children.find((c): c is ComponentNode => {
              if (c.type !== 'COMPONENT' || !c.variantProperties) return false;
              return Object.entries(def.variantProperties!).every(([k, v]) => {
                const actual = c.variantProperties![k] || c.variantProperties![k.toLowerCase()] || c.variantProperties![k.toUpperCase()];
                return actual && actual.toLowerCase() === String(v).toLowerCase();
              });
            }) || (compSet.defaultVariant as ComponentNode) || (compSet.children[0] as ComponentNode);
          } else {
            master = (compSet.defaultVariant as ComponentNode) || (compSet.children[0] as ComponentNode);
          }
        }
      }
    }

    if (master) {
      const inst = master.createInstance();
      if (def.name) inst.name = def.name;
      if (def.variantProperties && 'setProperties' in inst) {
        try {
          (inst as any).setProperties(def.variantProperties);
        } catch {}
      }
      if (parent) {
        parent.appendChild(inst);
      }
      if (engine) {
        await engine.bindNodeVariables(inst, def);
      }
      node = inst;
    } else if (def.svgContent) {
      try {
        const svgNode = figma.createNodeFromSvg(def.svgContent);
        svgNode.name = def.name || 'icon';
        if (def.width && def.height) svgNode.resize(def.width, def.height);
        if (parent) parent.appendChild(svgNode);
        node = svgNode;
      } catch (e) {}
    }
  } else if (def.type === 'TEXT') {
    const textNode = figma.createText();
    textNode.name = def.name || 'label';

    let textStyleApplied = false;
    if (engine) {
      const candidates: string[] = [];
      if (def.textStyleName) candidates.push(def.textStyleName);

      // Generate fallback candidate names based on category & size & weight
      if (def.fontSize) {
        const weight = (def.fontStyle || 'Bold').toLowerCase().includes('bold') ? 'bold' : 'regular';
        if (def.fontSize >= 44) candidates.push(`heading/h1/${weight}`);
        else if (def.fontSize >= 36) candidates.push(`heading/h2/${weight}`);
        else if (def.fontSize >= 24) candidates.push(`heading/h4/${weight}`);
        else if (def.fontSize === 16) candidates.push(`default/body/large/${weight}`, `body/large/${weight}`);
        else if (def.fontSize === 14) candidates.push(`default/body/medium/${weight}`, `body/medium/${weight}`);
        else if (def.fontSize === 12) candidates.push(`default/label/large/${weight}`, `label/large/${weight}`);
        else if (def.fontSize === 11) candidates.push(`default/label/medium/${weight}`, `label/medium/${weight}`);
      }

      const matchedStyle = engine.findTextStyle(candidates, def.fontSize, def.fontStyle);
      if (matchedStyle) {
        try {
          if (matchedStyle.fontName) {
            await figma.loadFontAsync(matchedStyle.fontName);
          }
          await textNode.setTextStyleIdAsync(matchedStyle.id);
          textStyleApplied = true;
          console.log(`[Bridge] Bound text style "${matchedStyle.name}" to node "${textNode.name}"`);
        } catch (err) {
          console.warn(`[Bridge] Failed to set text style on "${textNode.name}":`, err);
        }
      }
    }

    if (!textStyleApplied) {
      const stylePrefix = def.textStyleName?.replace(/^default\//, '') || '';
      const isHeading = stylePrefix.startsWith('heading') || stylePrefix.startsWith('display') || (def.fontSize !== undefined && def.fontSize >= 24);
      const category: 'heading' | 'body' = isHeading ? 'heading' : 'body';
      const resolvedFamily = engine ? engine.resolveFontFamily(category, def.fontFamily) : (def.fontFamily || 'Inter');
      const targetWeight = def.fontStyle || (def.textStyleName?.includes('bold') ? 'Bold' : def.textStyleName?.includes('medium') ? 'Medium' : 'Regular');

      const font = await ensureFontLoaded(resolvedFamily, targetWeight);
      textNode.fontName = font;
      if (def.fontSize) textNode.fontSize = def.fontSize;
      if (def.letterSpacing !== undefined) {
        textNode.letterSpacing = { value: def.letterSpacing, unit: 'PERCENT' };
      }
      if (def.textCase) textNode.textCase = def.textCase;
    }

    textNode.characters = def.characters || '';

    if (def.fills && def.fills.length > 0) {
      textNode.fills = def.fills.map((f) => ({
        type: 'SOLID',
        color: parseHexOrRgb(f.color || f.hex),
        opacity: f.opacity ?? 1,
      }));
    }

    if (parent) {
      parent.appendChild(textNode);
    }

    if (engine) {
      await engine.bindNodeVariables(textNode, def);
    }

    node = textNode;
  } else if (def.type === 'ELLIPSE') {
    const ellipse = figma.createEllipse();
    ellipse.name = def.name || 'dot';
    ellipse.resize(def.width || 6, def.height || 6);

    if (def.fills && def.fills.length > 0) {
      ellipse.fills = def.fills.map((f) => ({
        type: 'SOLID',
        color: parseHexOrRgb(f.color || f.hex),
        opacity: f.opacity ?? 1,
      }));
    }

    if (parent) {
      parent.appendChild(ellipse);
    }

    if (engine) {
      await engine.bindNodeVariables(ellipse, def);
    }

    node = ellipse;
  } else if (def.type === 'RECTANGLE') {
    const rect = figma.createRectangle();
    rect.name = def.name || 'rect';
    rect.resize(def.width || 10, def.height || 10);
    if (def.cornerRadius) rect.cornerRadius = def.cornerRadius;
    if (def.fills && def.fills.length > 0) {
      rect.fills = def.fills.map((f) => ({
        type: 'SOLID',
        color: parseHexOrRgb(f.color || f.hex),
        opacity: f.opacity ?? 1,
      }));
    }

    if (parent) {
      parent.appendChild(rect);
    }

    if (engine) {
      await engine.bindNodeVariables(rect, def);
    }
    node = rect;
  } else if (def.type === 'SVG' && def.svgContent) {
    try {
      let svgStr = def.svgContent;
      if (def.width && def.height) {
        svgStr = svgStr.replace(/<svg\s+([^>]*)/i, (_match, attrs) => {
          let updated = attrs
            .replace(/\bwidth="[^"]*"/i, `width="${def.width}"`)
            .replace(/\bheight="[^"]*"/i, `height="${def.height}"`);
          if (!/\bwidth="/i.test(updated)) updated += ` width="${def.width}"`;
          if (!/\bheight="/i.test(updated)) updated += ` height="${def.height}"`;
          return `<svg ${updated}`;
        });
      }

      const svgNode = figma.createNodeFromSvg(svgStr);
      svgNode.name = def.name || 'icon';

      if (def.height && svgNode.height > 0) {
        const scale = def.height / svgNode.height;
        if (Math.abs(scale - 1) > 0.005 && typeof (svgNode as any).rescale === 'function') {
          (svgNode as any).rescale(scale);
        }
      }

      if (def.width && def.height) {
        svgNode.resize(def.width, def.height);
      }
      svgNode.layoutGrow = 0;
      if (parent) {
        parent.appendChild(svgNode);
      }
      node = svgNode;
    } catch (e) {
      console.warn('SVG parse error in buildFigmaNode:', e);
    }
  }

  return node;
}

