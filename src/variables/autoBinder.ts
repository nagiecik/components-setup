import {
  ensureTemporaryMetricsCollection,
  getAllRelevantVariablesForComponentSet
} from './variables';
import { ResolvedVariable } from '../types/variables';
import { loadFontsForTextNode } from '../utils/fonts';
import {
  createAppleDetectionCaches,
  createAuditVariableContext,
  isInsideOfficialAppleSubtree,
  LibraryCollectionInfo,
} from '../audit/inspector';
import { getNodeIgnoredAuditKeys } from '../audit/registry';

export interface AutoBinderOptions {
  mode: 'exact' | 'snap';
  notify?: boolean;
  ignoreFontFamily?: boolean;
  forceRebind?: boolean;
  setupContainers?: boolean;
  bindTokens?: boolean;
}

export interface AuditAutoFixOptions {
  mode: 'exact' | 'snap';
  filter?: string;
  detachUnmatchedForeign?: boolean;
  notify?: boolean;
}

interface ResolvedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface CachedTextStyle {
  key: string;
  name: string;
  description: string;
  family: string;
  weight: string;
  fontSize: number;
  lineHeightPx: number | null;
}

export interface IndexedTextStyle {
  id?: string;
  key?: string;
  name: string;
  description?: string;
  family: string;
  weightStyle: string;
  fontSize: number;
  lineHeightPx: number | null;
  style?: TextStyle;
  isRemoteCached?: boolean;
}

interface PrecomputedMetric {
  variable: Variable;
  name: string;
  lowerName: string;
  scopes: VariableScope[];
  value: number;
  isLocal: boolean;
  collectionName: string;
  isMetricsCollection: boolean;
}

interface PrecomputedColor {
  variable: Variable;
  name: string;
  lowerName: string;
  scopes: VariableScope[];
  color: ResolvedColor;
  isLocal: boolean;
  collectionName: string;
  isSchemesCollection: boolean;
}

// Global session caches to prevent re-querying Figma / teamLibrary APIs on repeated runs
let sessionVariablesLoaded = false;
const sessionAllColsMap = new Map<string, VariableCollection>();
const sessionLibraryInfoByKey = new Map<string, LibraryCollectionInfo>();
const sessionLocalColIds = new Set<string>();
const sessionAllVarsMap = new Map<string, Variable>();
export const CACHED_VARIABLES_MAP = sessionAllVarsMap;
export let CACHED_TEXT_STYLES: IndexedTextStyle[] = [];
export const CACHED_STYLE_ID_TO_LABEL_MAP = new Map<string, string>();
let sessionTextStylesLoaded = false;
let sessionPrecomputedMetrics: PrecomputedMetric[] | null = null;
let sessionPrecomputedColors: PrecomputedColor[] | null = null;
const sessionImportedStylesCache = new Map<string, TextStyle>();

export function invalidateAutoBinderSessionCache(): void {
  sessionVariablesLoaded = false;
  sessionTextStylesLoaded = false;
  sessionPrecomputedMetrics = null;
  sessionPrecomputedColors = null;
  CACHED_TEXT_STYLES = [];
  sessionAllColsMap.clear();
  sessionLibraryInfoByKey.clear();
  sessionLocalColIds.clear();
  sessionAllVarsMap.clear();
}

export function normalizeFontWeight(styleName: string): string {
  if (!styleName) return 'regular';
  let s = styleName.toLowerCase().replace(/[\s\-_]+/g, '');
  s = s.replace(/italic|oblique|slanted/g, '');

  if (!s || s === 'normal' || s === 'book' || s === 'roman' || s === 'text' || s === '400' || s === 'base') {
    return 'regular';
  }
  if (s === '500' || s === 'medium') {
    return 'medium';
  }
  if (s === '600' || s === 'demibold' || s === 'semibold') {
    return 'semibold';
  }
  if (s === '700' || s === 'heavy' || s === 'bold') {
    return 'bold';
  }
  if (s === '800' || s === 'extrabold' || s === 'ultrabold') {
    return 'extrabold';
  }
  if (s === '900' || s === 'black' || s === 'extrablack' || s === 'ultrablack') {
    return 'black';
  }
  if (s === '300' || s === 'light') {
    return 'light';
  }
  if (s === '100' || s === 'thin' || s === 'hairline') {
    return 'thin';
  }
  if (s === '200' || s === 'extralight' || s === 'ultralight') {
    return 'extralight';
  }

  if (s.includes('semibold') || s.includes('demibold')) return 'semibold';
  if (s.includes('extrabold') || s.includes('ultrabold') || s.includes('heavy')) return 'extrabold';
  if (s.includes('bold')) return 'bold';
  if (s.includes('medium')) return 'medium';
  if (s.includes('light')) return 'light';
  if (s.includes('black')) return 'black';
  if (s.includes('thin')) return 'thin';

  return s;
}

export function calculateLineHeightPx(fontSize: number, lineHeight: LineHeight | undefined): number | null {
  if (!lineHeight) return null;
  if (lineHeight.unit === 'PIXELS') {
    return Math.round(lineHeight.value);
  }
  if (lineHeight.unit === 'PERCENT') {
    return Math.round(fontSize * (lineHeight.value / 100));
  }
  return null;
}

/**
 * Extracts typography parameters from a TextStyle, resolving boundVariables if present
 */
export async function extractStyleTypographyParams(
  style: TextStyle,
  consumerNode?: SceneNode
): Promise<{
  family: string;
  weight: string;
  fontSize: number;
  lineHeightPx: number | null;
}> {
  let family = style.fontName?.family || '';
  let styleName = style.fontName?.style || '';
  let fontSize = style.fontSize;
  let lineHeightPx = calculateLineHeightPx(fontSize, style.lineHeight);

  const boundVars = (style as any).boundVariables;
  if (boundVars) {
    async function resolveRawVarValue(varId: string): Promise<any> {
      let v = sessionAllVarsMap.get(varId);
      if (!v) {
        try {
          v = (await figma.variables.getVariableByIdAsync(varId)) || undefined;
          if (v) sessionAllVarsMap.set(v.id, v);
        } catch (e) {}
      }
      if (!v) return null;

      // Prefer native Figma engine consumer resolution (resolves cross-library aliases automatically)
      if (consumerNode && typeof (v as any).resolveForConsumer === 'function') {
        try {
          const res = (v as any).resolveForConsumer(consumerNode);
          if (res && res.value !== undefined && res.value !== null) {
            return res.value;
          }
        } catch (e) {}
      }

      let val = Object.values(v.valuesByMode)[0];
      if (val && typeof val === 'object' && (val as any).type === 'VARIABLE_ALIAS') {
        return resolveRawVarValue((val as any).id);
      }
      return val;
    }

    // Check fontFamily bound variable
    const fontFamVarId = boundVars.fontFamily?.id || boundVars.fontFamily;
    if (fontFamVarId && typeof fontFamVarId === 'string') {
      try {
        const val = await resolveRawVarValue(fontFamVarId);
        if (typeof val === 'string' && val.trim().length > 0) {
          family = val.trim();
        }
      } catch (e) {}
    }

    // Check fontStyle bound variable
    const fontStyleVarId = boundVars.fontStyle?.id || boundVars.fontStyle;
    if (fontStyleVarId && typeof fontStyleVarId === 'string') {
      try {
        const val = await resolveRawVarValue(fontStyleVarId);
        if (typeof val === 'string' && val.trim().length > 0) {
          styleName = val.trim();
        } else {
          let v = sessionAllVarsMap.get(fontStyleVarId);
          if (v) {
            const vName = v.name.toLowerCase();
            if (vName.includes('base') || vName.includes('regular')) styleName = 'Regular';
            else if (vName.includes('semibold')) styleName = 'SemiBold';
            else if (vName.includes('bold')) styleName = 'Bold';
            else if (vName.includes('medium')) styleName = 'Medium';
            else if (vName.includes('light')) styleName = 'Light';
          }
        }
      } catch (e) {}
    }

    // Check fontSize bound variable
    const fontSizeVarId = boundVars.fontSize?.id || boundVars.fontSize;
    if (fontSizeVarId && typeof fontSizeVarId === 'string') {
      try {
        const val = await resolveRawVarValue(fontSizeVarId);
        if (typeof val === 'number' && val > 0) {
          fontSize = val;
        }
      } catch (e) {}
    }

    // Check lineHeight bound variable
    const lineHeightVarId = boundVars.lineHeight?.id || boundVars.lineHeight;
    if (lineHeightVarId && typeof lineHeightVarId === 'string') {
      try {
        const val = await resolveRawVarValue(lineHeightVarId);
        if (typeof val === 'number' && val > 0) {
          lineHeightPx = Math.round(val);
        }
      } catch (e) {}
    }
  }

  // Fallback if family is empty or placeholder
  if (!family || family.toLowerCase().includes('default') || family.toLowerCase().includes('fontfamily')) {
    try {
      const localVars = await figma.variables.getLocalVariablesAsync();
      const defaultFamVar = localVars.find(
        (v) => v.name.toLowerCase() === 'fontfamily/default' || v.name.toLowerCase() === 'fontfamily'
      );
      if (defaultFamVar) {
        if (consumerNode && typeof (defaultFamVar as any).resolveForConsumer === 'function') {
          try {
            const res = (defaultFamVar as any).resolveForConsumer(consumerNode);
            if (res && typeof res.value === 'string' && res.value.trim().length > 0) {
              family = res.value.trim();
            }
          } catch (e) {}
        }
        if (!family || family.toLowerCase().includes('default')) {
          let vVal = Object.values(defaultFamVar.valuesByMode)[0];
          if (vVal && typeof vVal === 'object' && (vVal as any).type === 'VARIABLE_ALIAS') {
            const aliased = await figma.variables.getVariableByIdAsync((vVal as any).id);
            if (aliased) vVal = Object.values(aliased.valuesByMode)[0];
          }
          if (typeof vVal === 'string') family = vVal;
        }
      }
    } catch (e) {}
  }

  return {
    family: family.trim().toLowerCase(),
    weight: normalizeFontWeight(styleName),
    fontSize,
    lineHeightPx,
  };
}

/**
 * Saves all local text styles to figma.clientStorage catalog so project files can import them via key
 */
export async function syncLibraryTextStylesToCache(): Promise<number> {
  const localStyles = await figma.getLocalTextStylesAsync();
  const catalog: CachedTextStyle[] = [];

  for (const style of localStyles) {
    if (!style.key) continue;
    const params = await extractStyleTypographyParams(style);
    catalog.push({
      key: style.key,
      name: style.name,
      description: style.description || '',
      family: params.family,
      weight: params.weight,
      fontSize: params.fontSize,
      lineHeightPx: params.lineHeightPx,
    });
  }

  await figma.clientStorage.setAsync('ds_library_text_styles', catalog);
  sessionTextStylesLoaded = false;
  CACHED_TEXT_STYLES = [];
  return catalog.length;
}

export async function getLibraryStylesCacheCount(): Promise<number> {
  try {
    const cachedCatalog = (await figma.clientStorage.getAsync('ds_library_text_styles')) as
      | CachedTextStyle[]
      | undefined;
    return Array.isArray(cachedCatalog) ? cachedCatalog.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Local TextStyles + clientStorage Catalog (No full page scanning! Cached in memory per session)
 */
export async function getAllAvailableTextStyles(
  forceRefresh = false,
  consumerNode?: SceneNode
): Promise<IndexedTextStyle[]> {
  if (!forceRefresh && sessionTextStylesLoaded && CACHED_TEXT_STYLES.length > 0) {
    return CACHED_TEXT_STYLES;
  }

  const result: IndexedTextStyle[] = [];
  const seenKeys = new Set<string>();

  // 1. Local text styles in current file
  try {
    const localStyles = await figma.getLocalTextStylesAsync();
    for (const style of localStyles) {
      const params = await extractStyleTypographyParams(style, consumerNode);
      if (style.key) seenKeys.add(style.key);
      const label = style.description ? `${style.name} ${style.description}` : style.name;
      CACHED_STYLE_ID_TO_LABEL_MAP.set(style.id, label);
      result.push({
        id: style.id,
        key: style.key,
        name: style.name,
        description: style.description,
        family: params.family,
        weightStyle: params.weight,
        fontSize: params.fontSize,
        lineHeightPx: params.lineHeightPx,
        style,
      });
    }
  } catch (e) {
    console.warn('Error fetching local text styles:', e);
  }

  // 2. ClientStorage catalog from DS library file
  try {
    const cachedCatalog = (await figma.clientStorage.getAsync('ds_library_text_styles')) as
      | CachedTextStyle[]
      | undefined;
    if (Array.isArray(cachedCatalog)) {
      for (const item of cachedCatalog) {
        if (!item.key || seenKeys.has(item.key)) continue;
        seenKeys.add(item.key);
        result.push({
          key: item.key,
          name: item.name,
          description: item.description,
          family: (item.family || '').trim().toLowerCase(),
          weightStyle: normalizeFontWeight(item.weight),
          fontSize: item.fontSize,
          lineHeightPx: item.lineHeightPx,
          isRemoteCached: true,
        });
      }
    }
  } catch (e) {
    console.warn('Error reading ds_library_text_styles:', e);
  }

  CACHED_TEXT_STYLES = result;
  sessionTextStylesLoaded = true;
  return result;
}

export function matchTextStyleForSpec(
  family: string,
  styleName: string,
  fontSize: number,
  lineHeight: LineHeight | number | null | undefined,
  nodeName: string,
  indexedStyles: IndexedTextStyle[],
  options: { mode: 'exact' | 'snap'; ignoreFontFamily?: boolean }
): IndexedTextStyle | null {
  if (!indexedStyles || indexedStyles.length === 0) return null;

  const targetFamily = (family || '').trim().toLowerCase();
  const targetWeight = normalizeFontWeight(styleName);
  let targetLineHeightPx: number | null = null;

  if (typeof lineHeight === 'number') {
    targetLineHeightPx = Math.round(lineHeight);
  } else if (lineHeight && typeof lineHeight === 'object' && 'unit' in lineHeight) {
    targetLineHeightPx = calculateLineHeightPx(fontSize, lineHeight as LineHeight);
  }

  // 1. Initial filter by family, weight, and size
  const candidates = indexedStyles.filter((cand) => {
    if (!options.ignoreFontFamily && cand.family && cand.family !== targetFamily) {
      return false;
    }
    if (cand.weightStyle !== targetWeight) {
      return false;
    }
    if (Math.abs(cand.fontSize - fontSize) >= 0.5) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // 2. Exact match check on line-height
  let matchedCandidates = candidates.filter((cand) => {
    if (targetLineHeightPx === null) {
      return cand.lineHeightPx === null;
    }
    if (cand.lineHeightPx === null) {
      return false;
    }
    return Math.abs(cand.lineHeightPx - targetLineHeightPx) <= 1;
  });

  if (matchedCandidates.length === 0 && targetLineHeightPx === null) {
    matchedCandidates = [...candidates];
  }

  // 3. Snap to nearest style
  if (matchedCandidates.length === 0 && options.mode === 'snap' && targetLineHeightPx !== null) {
    matchedCandidates = candidates.filter((cand) => {
      if (cand.lineHeightPx === null) return false;
      return Math.abs(cand.lineHeightPx - targetLineHeightPx) <= 2;
    });
  }

  if (matchedCandidates.length === 0) return null;

  // 4. Semantic tie-breaker based on node name and style name/description
  const nName = (nodeName || '').toLowerCase();
  function getSemanticScore(cand: IndexedTextStyle): number {
    const sName = (cand.name || '').toLowerCase();
    const sDesc = (cand.description || '').toLowerCase();
    const fullText = `${sName} ${sDesc}`;
    let score = 0;

    if (nName.includes('heading') || nName.includes('headline') || nName.includes('hero')) {
      if (fullText.includes('headline') || fullText.includes('display') || fullText.includes('heading')) score += 100;
    } else if (nName.includes('title') || nName.includes('subtitle')) {
      if (fullText.includes('title')) score += 100;
    } else if (
      nName.includes('description') ||
      nName.includes('body') ||
      nName.includes('copy') ||
      nName.includes('paragraph') ||
      nName.includes('text')
    ) {
      if (fullText.includes('body') || fullText.includes('paragraph')) score += 100;
    } else if (
      nName.includes('label') ||
      nName.includes('caption') ||
      nName.includes('meta') ||
      nName.includes('timestamp') ||
      nName.includes('button') ||
      nName.includes('badge') ||
      nName.includes('value') ||
      nName.includes('eyebrow')
    ) {
      if (fullText.includes('label') || fullText.includes('caption')) score += 100;
    }

    if (sDesc.includes('body') || sDesc.includes('title') || sDesc.includes('label') || sDesc.includes('headline')) {
      score += 15;
    }
    return score;
  }

  matchedCandidates.sort((a, b) => {
    const diffA = targetLineHeightPx !== null && a.lineHeightPx !== null ? Math.abs(a.lineHeightPx - targetLineHeightPx) : 0;
    const diffB = targetLineHeightPx !== null && b.lineHeightPx !== null ? Math.abs(b.lineHeightPx - targetLineHeightPx) : 0;
    if (diffA !== diffB) return diffA - diffB;

    const scoreA = getSemanticScore(a);
    const scoreB = getSemanticScore(b);
    return scoreB - scoreA;
  });

  return matchedCandidates[0];
}

function checkScopeMatch(scopes: VariableScope[], allowedScopes: VariableScope[]): boolean {
  if (!scopes || scopes.length === 0) return false;
  if (scopes.includes('ALL_SCOPES')) return true;
  return allowedScopes.some((sc) => scopes.includes(sc));
}

export async function preloadAutoBinderCaches(
  forceRefresh = false,
  consumerNode?: SceneNode
): Promise<{
  precomputedMetrics: PrecomputedMetric[];
  precomputedColors: PrecomputedColor[];
  availableTextStyles: IndexedTextStyle[];
}> {
  if (forceRefresh || !sessionVariablesLoaded || sessionAllVarsMap.size === 0) {
    sessionVariablesLoaded = false;
    sessionPrecomputedMetrics = null;
    sessionPrecomputedColors = null;
    sessionAllColsMap.clear();
    sessionLibraryInfoByKey.clear();
    sessionLocalColIds.clear();
    sessionAllVarsMap.clear();

    try {
      await ensureTemporaryMetricsCollection();
    } catch (e) {}

    try {
      const localCols = await figma.variables.getLocalVariableCollectionsAsync();
      for (const c of localCols) {
        sessionAllColsMap.set(c.id, c);
        sessionLocalColIds.add(c.id);
      }
    } catch (e) {}

    try {
      const localVars = await figma.variables.getLocalVariablesAsync();
      for (const v of localVars) sessionAllVarsMap.set(v.id, v);
    } catch (e) {}

    try {
      const relevantVars: ResolvedVariable[] = await getAllRelevantVariablesForComponentSet();
      for (const item of relevantVars) {
        if (item?.variable) sessionAllVarsMap.set(item.variable.id, item.variable);
      }
    } catch (e) {}

    try {
      const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const libCol of libraryCollections) {
        if (libCol.key) {
          sessionLibraryInfoByKey.set(libCol.key, {
            name: libCol.name || 'Remote Collection',
            libraryName: libCol.libraryName || 'External Library',
          });
        }
        if (libCol.name.trim().startsWith('_')) continue;
        sessionAllColsMap.set(libCol.key, libCol as any);
        try {
          const descriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCol.key);
          const validDescriptors = descriptors.filter((d) => !d.name.trim().startsWith('_'));
          const imported = await Promise.all(
            validDescriptors.map((d) => figma.variables.importVariableByKeyAsync(d.key).catch(() => null))
          );
          for (const v of imported) {
            if (v && !v.name.trim().startsWith('_')) {
              sessionAllVarsMap.set(v.id, v);
              if (v.variableCollectionId && !sessionAllColsMap.has(v.variableCollectionId)) {
                sessionAllColsMap.set(v.variableCollectionId, libCol as any);
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    sessionVariablesLoaded = true;
  }

  if (!sessionPrecomputedMetrics || !sessionPrecomputedColors) {
    const resolvedValueCache = new Map<string, number | ResolvedColor | null>();

    async function resolveVarValue(
      variable: Variable,
      visited = new Set<string>()
    ): Promise<number | ResolvedColor | null> {
      if (resolvedValueCache.has(variable.id)) {
        return resolvedValueCache.get(variable.id)!;
      }

      // 1. Try native Figma resolveForConsumer first (resolves cross-library aliases and modes natively)
      if (consumerNode && typeof (variable as any).resolveForConsumer === 'function') {
        try {
          const res = (variable as any).resolveForConsumer(consumerNode);
          if (res && res.value !== undefined && res.value !== null) {
            if (res.resolvedType === 'FLOAT' && typeof res.value === 'number') {
              resolvedValueCache.set(variable.id, res.value);
              return res.value;
            }
            if (
              res.resolvedType === 'COLOR' &&
              res.value &&
              typeof res.value === 'object' &&
              'r' in res.value
            ) {
              const colorVal: ResolvedColor = {
                r: (res.value as any).r,
                g: (res.value as any).g,
                b: (res.value as any).b,
                a: typeof (res.value as any).a === 'number' ? (res.value as any).a : 1,
              };
              resolvedValueCache.set(variable.id, colorVal);
              return colorVal;
            }
          }
        } catch (e) {}
      }

      // 2. Fallback to recursive alias traversal
      let val = Object.values(variable.valuesByMode)[0];

      if (val && typeof val === 'object' && 'type' in val && (val as any).type === 'VARIABLE_ALIAS') {
        const aliasId = (val as any).id as string;
        if (visited.has(aliasId)) return null;
        visited.add(aliasId);
        let aliasedVar = sessionAllVarsMap.get(aliasId);
        if (!aliasedVar) {
          try {
            aliasedVar = (await figma.variables.getVariableByIdAsync(aliasId)) || undefined;
            if (aliasedVar) sessionAllVarsMap.set(aliasedVar.id, aliasedVar);
          } catch (e) {}
        }
        if (!aliasedVar) return null;
        const res = await resolveVarValue(aliasedVar, visited);
        resolvedValueCache.set(variable.id, res);
        return res;
      }

      if (typeof val === 'number') {
        resolvedValueCache.set(variable.id, val);
        return val;
      }

      if (val && typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val) {
        const colorVal: ResolvedColor = {
          r: (val as any).r,
          g: (val as any).g,
          b: (val as any).b,
          a: typeof (val as any).a === 'number' ? (val as any).a : 1,
        };
        resolvedValueCache.set(variable.id, colorVal);
        return colorVal;
      }

      resolvedValueCache.set(variable.id, null);
      return null;
    }

    const metricsList: PrecomputedMetric[] = [];
    const colorsList: PrecomputedColor[] = [];

    const allVars = Array.from(sessionAllVarsMap.values());
    await Promise.all(
      allVars.map(async (v) => {
        if (v.name.trim().startsWith('_')) return;
        if (!v.scopes || v.scopes.length === 0) return;

        const col = sessionAllColsMap.get(v.variableCollectionId);
        const colName = col ? col.name.trim() : '';
        const isMetricsCollection = /^(metrics|_metrics)$/i.test(colName);
        if (colName.startsWith('_') && !isMetricsCollection) return;

        const isLocal = !(v as any).remote && sessionLocalColIds.has(v.variableCollectionId);
        const isSchemesCollection = /^schemes$/i.test(colName);

        if (v.resolvedType === 'FLOAT') {
          const val = await resolveVarValue(v);
          if (typeof val === 'number') {
            metricsList.push({
              variable: v,
              name: v.name,
              lowerName: v.name.toLowerCase(),
              scopes: v.scopes,
              value: val,
              isLocal,
              collectionName: colName,
              isMetricsCollection,
            });
          }
        } else if (v.resolvedType === 'COLOR') {
          const colVal = await resolveVarValue(v);
          if (colVal && typeof colVal === 'object' && 'r' in colVal) {
            colorsList.push({
              variable: v,
              name: v.name,
              lowerName: v.name.toLowerCase(),
              scopes: v.scopes,
              color: colVal as ResolvedColor,
              isLocal,
              collectionName: colName,
              isSchemesCollection,
            });
          }
        }
      })
    );

    sessionPrecomputedMetrics = metricsList;
    sessionPrecomputedColors = colorsList;
  }

  const availableTextStyles = await getAllAvailableTextStyles(forceRefresh, consumerNode);

  return {
    precomputedMetrics: sessionPrecomputedMetrics,
    precomputedColors: sessionPrecomputedColors,
    availableTextStyles,
  };
}

export async function runSmartTokenAutoBinder(
  nodes: readonly SceneNode[],
  options: AutoBinderOptions = { mode: 'exact', notify: true }
): Promise<{ metricsBound: number; colorsBound: number; textStylesBound: number }> {
  if (!nodes || nodes.length === 0) {
    if (options.notify !== false) {
      figma.notify('Zaznacz obiekt lub komponent na canvasie, aby podpiąć zmienne.', { error: true });
    }
    return { metricsBound: 0, colorsBound: 0, textStylesBound: 0 };
  }

  // 1-3. Load & reuse session caches (Variables + Resolved Values + Available TextStyles)
  const consumerNode = nodes[0];
  const forceRefresh =
    Boolean(options.forceRebind) ||
    !sessionPrecomputedMetrics ||
    sessionPrecomputedMetrics.length === 0;
  const { precomputedMetrics, precomputedColors, availableTextStyles } = await preloadAutoBinderCaches(
    forceRefresh,
    consumerNode
  );
  const importedStylesCache = sessionImportedStylesCache;

  // 4. Collect selection nodes (Single Tree Walk traversing into instances safely)
  const allNodesToProcess: SceneNode[] = [];
  const visitedNodeIds = new Set<string>();

  function collectNodes(node: SceneNode, depth = 0) {
    if (!node || visitedNodeIds.has(node.id) || depth > 30) return;
    visitedNodeIds.add(node.id);
    allNodesToProcess.push(node);

    // Skip leaf vector shapes (SVG icons) to avoid deep recursion on complex paths
    if (
      node.type === 'VECTOR' ||
      node.type === 'LINE' ||
      node.type === 'STAR' ||
      node.type === 'POLYGON' ||
      node.type === 'BOOLEAN_OPERATION'
    ) {
      return;
    }

    if ('children' in node && (node as any).children) {
      for (const child of (node as any).children) {
        collectNodes(child as SceneNode, depth + 1);
      }
    }
  }

  for (const root of nodes) {
    collectNodes(root);
  }

  let metricsBoundCount = 0;
  let colorsBoundCount = 0;
  let textStylesBoundCount = 0;

  function isInteractiveControl(node: SceneNode): boolean {
    const nameLower = node.name.toLowerCase();
    if (
      nameLower.includes('button') ||
      nameLower.includes('input') ||
      nameLower.includes('control') ||
      nameLower.includes('tag') ||
      nameLower.includes('badge') ||
      nameLower.includes('chip') ||
      nameLower.includes('tab') ||
      nameLower.includes('toggle') ||
      nameLower.includes('switch') ||
      nameLower.includes('checkbox') ||
      nameLower.includes('radio')
    ) {
      return true;
    }
    if (node.height > 0 && node.height <= 56 && node.width > 0 && node.width <= 320) {
      return true;
    }
    return false;
  }

  function getAncestorContainerRole(node: SceneNode): 'primary' | 'primaryContainer' | 'surface' | 'background' | null {
    let curr: BaseNode | null = node.parent;
    while (curr && curr.type !== 'PAGE') {
      const boundFillVar = (curr as any).boundVariables?.fills?.[0];
      if (boundFillVar) {
        const varObj = sessionAllVarsMap.get(boundFillVar.id);
        if (varObj) {
          const vName = varObj.name.toLowerCase();
          if (vName.includes('primarycontainer')) return 'primaryContainer';
          if (vName.includes('primary')) return 'primary';
          if (vName.includes('surface')) return 'surface';
          if (vName.includes('background')) return 'background';
        }
      }
      curr = curr.parent;
    }
    return null;
  }

  // --- TRAVERSAL OF SELECTION WITH UI YIELD ---
  let processedCount = 0;
  const smartAppleCaches = createAppleDetectionCaches();

  for (const node of allNodesToProcess) {
    processedCount++;
    if (allNodesToProcess.length > 30 && processedCount % 25 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }

    const isAppleNode = await isInsideOfficialAppleSubtree(node, sessionLibraryInfoByKey, smartAppleCaches);

    // Inline Container Setup during Single Tree Walk when setupContainers === true
    if (options.setupContainers) {
      if ('fills' in node && Array.isArray((node as any).fills)) {
        try {
          const fills = (node as any).fills as readonly Paint[];
          const filtered = fills.filter((p) => {
            if (p.visible === false && p.type === 'SOLID' && p.color.r > 0.98 && p.color.g > 0.98 && p.color.b > 0.98) {
              return false;
            }
            return true;
          });
          if (filtered.length !== fills.length) {
            (node as any).fills = filtered;
          }
        } catch (e) {}
      }

      if (node.type === 'COMPONENT' && node.layoutMode === 'NONE') {
        try {
          node.layoutMode = 'HORIZONTAL';
          node.primaryAxisSizingMode = 'AUTO';
          node.counterAxisSizingMode = 'AUTO';
        } catch (e) {}
      }

      if ('cornerSmoothing' in node && (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'COMPONENT_SET')) {
        try {
          if ((node as any).cornerSmoothing !== 0.6) {
            (node as any).cornerSmoothing = 0.6;
          }
        } catch (e) {}
      }
    }

    if (options.bindTokens === false) {
      continue;
    }

    const boundVars = (node as any).boundVariables || {};
    const isControl = isInteractiveControl(node);

    // --- A. BIND METRICS (FLOAT) ---
    const bindNumericProperty = (
      prop: string,
      rawValue: number,
      allowedScopes: VariableScope[],
      semanticField: 'paddingX' | 'paddingY' | 'gap' | 'radius' | 'stroke'
    ) => {
      if (!options.forceRebind && boundVars[prop]) return;
      if (prop === 'cornerRadius' && !options.forceRebind && (boundVars.cornerRadius || boundVars.topLeftRadius)) return;

      const candidates = precomputedMetrics.filter((m) => checkScopeMatch(m.scopes, allowedScopes));

      let bestToken: PrecomputedMetric | null = null;
      let bestScore = -Infinity;
      let minDiff = Infinity;

      for (const item of candidates) {
        const vName = item.lowerName;

        if (rawValue > 0) {
          if (semanticField === 'paddingX' || semanticField === 'paddingY') {
            if (vName.includes('/gap/') || vName.startsWith('gap/') || vName.includes('gap')) continue;
          } else if (semanticField === 'gap') {
            if (
              vName.includes('inset') ||
              vName.includes('inline') ||
              vName.includes('block') ||
              vName.includes('padding')
            ) {
              continue;
            }
          }
        }

        const diff = Math.abs(item.value - rawValue);

        if (options.mode === 'exact') {
          if (diff > 0.5) continue;
        } else {
          if (diff > 6.5) continue;
        }

        let score = 100 - diff * 15;

        if (rawValue === 0) {
          if (
            vName === 'constant/none' ||
            vName.endsWith('/constant/none') ||
            vName === 'none' ||
            vName.endsWith('/none') ||
            vName.includes('none') ||
            vName.includes('zero')
          ) {
            score += 500;
          }
        }

        if (semanticField === 'paddingX') {
          if (isControl) {
            if (vName.startsWith('space/interactive/inline/')) score += 50;
            else if (vName.includes('padding/buttonx') || vName.includes('padding/inputx')) score += 40;
            else if (vName.startsWith('layout/')) score += 35;
            else if (vName.startsWith('space/inset/')) score += 10;
          } else {
            if (vName.startsWith('space/inset/')) score += 50;
            else if (vName.includes('padding/card')) score += 40;
            else if (vName.startsWith('layout/')) score += 35;
            else if (vName.startsWith('space/interactive/inline/')) score += 10;
          }
        } else if (semanticField === 'paddingY') {
          if (isControl) {
            if (vName.startsWith('space/interactive/block/')) score += 50;
            else if (vName.includes('padding/buttony') || vName.includes('padding/inputy')) score += 40;
            else if (vName.startsWith('layout/')) score += 35;
            else if (vName.startsWith('space/inset/')) score += 10;
          } else {
            if (vName.startsWith('space/inset/')) score += 50;
            else if (vName.includes('padding/card')) score += 40;
            else if (vName.startsWith('layout/')) score += 35;
            else if (vName.startsWith('space/interactive/block/')) score += 10;
          }
        } else if (semanticField === 'gap') {
          if (
            vName.startsWith('space/gap/component/') ||
            vName.startsWith('space/gap/layout/') ||
            vName.startsWith('gap/') ||
            vName.startsWith('layout/') ||
            vName.includes('/gap/') ||
            vName.includes('extrasmall')
          ) {
            score += 60;
          }
        } else if (semanticField === 'radius') {
          if (isControl) {
            if (vName.startsWith('radius/interactive/') || vName.startsWith('radius/special/')) score += 50;
            else if (vName.startsWith('radius/container/')) score += 10;
          } else {
            if (vName.startsWith('radius/container/')) score += 50;
            else if (vName.startsWith('radius/interactive/')) score += 10;
          }
        } else if (semanticField === 'stroke') {
          if (vName.startsWith('border/') || vName.startsWith('constant/1')) score += 50;
        }

        if (score > bestScore || (score === bestScore && diff < minDiff)) {
          bestScore = score;
          minDiff = diff;
          bestToken = item;
        }
      }

      if (bestToken) {
        if (prop === 'cornerRadius') {
          try {
            (node as any).setBoundVariable('cornerRadius', bestToken.variable);
            metricsBoundCount++;
          } catch (e) {
            try {
              (node as any).setBoundVariable('topLeftRadius', bestToken.variable);
              (node as any).setBoundVariable('topRightRadius', bestToken.variable);
              (node as any).setBoundVariable('bottomLeftRadius', bestToken.variable);
              (node as any).setBoundVariable('bottomRightRadius', bestToken.variable);
              metricsBoundCount++;
            } catch (err) {}
          }
        } else {
          try {
            (node as any).setBoundVariable(prop as VariableBindableNodeField, bestToken.variable);
            metricsBoundCount++;
          } catch (e) {}
        }
      }
    };

    if ('layoutMode' in node && (node as any).layoutMode !== 'NONE') {
      const autoNode = node as FrameNode;
      if (typeof autoNode.paddingLeft === 'number' && autoNode.paddingLeft >= 0) {
        bindNumericProperty('paddingLeft', autoNode.paddingLeft, ['GAP', 'WIDTH_HEIGHT'], 'paddingX');
      }
      if (typeof autoNode.paddingRight === 'number' && autoNode.paddingRight >= 0) {
        bindNumericProperty('paddingRight', autoNode.paddingRight, ['GAP', 'WIDTH_HEIGHT'], 'paddingX');
      }
      if (typeof autoNode.paddingTop === 'number' && autoNode.paddingTop >= 0) {
        bindNumericProperty('paddingTop', autoNode.paddingTop, ['GAP', 'WIDTH_HEIGHT'], 'paddingY');
      }
      if (typeof autoNode.paddingBottom === 'number' && autoNode.paddingBottom >= 0) {
        bindNumericProperty('paddingBottom', autoNode.paddingBottom, ['GAP', 'WIDTH_HEIGHT'], 'paddingY');
      }
      if (typeof autoNode.itemSpacing === 'number' && autoNode.itemSpacing >= 0) {
        bindNumericProperty('itemSpacing', autoNode.itemSpacing, ['GAP', 'WIDTH_HEIGHT'], 'gap');
      }
      if (typeof autoNode.counterAxisSpacing === 'number' && autoNode.counterAxisSpacing >= 0) {
        bindNumericProperty('counterAxisSpacing', autoNode.counterAxisSpacing, ['GAP', 'WIDTH_HEIGHT'], 'gap');
      }
    }

    if ('cornerRadius' in node) {
      const rNode = node as any;
      if (typeof rNode.cornerRadius === 'number' && rNode.cornerRadius >= 0) {
        bindNumericProperty('cornerRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius');
      } else {
        const tl = typeof rNode.topLeftRadius === 'number' ? rNode.topLeftRadius : null;
        const tr = typeof rNode.topRightRadius === 'number' ? rNode.topRightRadius : null;
        const bl = typeof rNode.bottomLeftRadius === 'number' ? rNode.bottomLeftRadius : null;
        const br = typeof rNode.bottomRightRadius === 'number' ? rNode.bottomRightRadius : null;

        if (tl !== null && tl === tr && tl === bl && tl === br && tl >= 0) {
          bindNumericProperty('cornerRadius', tl, ['CORNER_RADIUS'], 'radius');
        } else {
          if (tl !== null && tl >= 0) bindNumericProperty('topLeftRadius', tl, ['CORNER_RADIUS'], 'radius');
          if (tr !== null && tr >= 0) bindNumericProperty('topRightRadius', tr, ['CORNER_RADIUS'], 'radius');
          if (bl !== null && bl >= 0) bindNumericProperty('bottomLeftRadius', bl, ['CORNER_RADIUS'], 'radius');
          if (br !== null && br >= 0) bindNumericProperty('bottomRightRadius', br, ['CORNER_RADIUS'], 'radius');
        }
      }
    }

    if ('strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0) {
      const sNode = node as any;
      if (typeof sNode.strokeWeight === 'number' && sNode.strokeWeight > 0) {
        bindNumericProperty('strokeWeight', sNode.strokeWeight, ['STROKE_FLOAT'], 'stroke');
      }
    }

    // --- B. BIND COLORS (schemes) ---
    if (!isAppleNode) {
    const ancestorRole = getAncestorContainerRole(node);

    if ('fills' in node && Array.isArray((node as any).fills) && (node as any).fills.length > 0) {
      try {
        const fills = (node as any).fills as readonly Paint[];
        let requiredScope: VariableScope;

        if (
          node.type === 'FRAME' ||
          node.type === 'COMPONENT' ||
          node.type === 'COMPONENT_SET' ||
          node.type === 'INSTANCE'
        ) {
          requiredScope = 'FRAME_FILL';
        } else if (node.type === 'TEXT') {
          requiredScope = 'TEXT_FILL';
        } else {
          requiredScope = 'SHAPE_FILL';
        }

        const candidateColorTokens = precomputedColors.filter((c) => {
          if (!c.scopes || c.scopes.length === 0) return false;
          return (
            c.scopes.includes('ALL_SCOPES') ||
            c.scopes.includes('ALL_FILLS') ||
            c.scopes.includes(requiredScope)
          );
        });

        let modifiedFills = false;
        const newFills = JSON.parse(JSON.stringify(fills)) as Paint[];

        for (let i = 0; i < fills.length; i++) {
          const paint = fills[i];
          if (paint.type !== 'SOLID' || paint.visible === false) continue;
          if (!options.forceRebind && paint.boundVariables?.color) continue;

          const pr = paint.color.r;
          const pg = paint.color.g;
          const pb = paint.color.b;
          const pa = paint.opacity !== undefined ? paint.opacity : 1;

          let bestToken: PrecomputedColor | null = null;
          let bestDist = Infinity;
          let bestTieScore = -Infinity;

          for (const item of candidateColorTokens) {
            const resolved = item.color;
            const dist = Math.sqrt(
              Math.pow(pr - resolved.r, 2) +
                Math.pow(pg - resolved.g, 2) +
                Math.pow(pb - resolved.b, 2) +
                Math.pow(pa - resolved.a, 2)
            );

            const maxDist = options.mode === 'exact' ? 0.015 : 0.08;
            if (dist > maxDist) continue;

            let tieScore = 0;
            const vName = item.lowerName;

            if (node.type === 'TEXT') {
              if (vName.includes('onprimary') && !vName.includes('container') && ancestorRole === 'primary') {
                tieScore += 50;
              } else if (vName.includes('onprimarycontainer') && ancestorRole === 'primaryContainer') {
                tieScore += 50;
              } else if (
                (vName.includes('onsurface') || vName.includes('onbackground')) &&
                (ancestorRole === 'surface' || ancestorRole === 'background' || !ancestorRole)
              ) {
                tieScore += 40;
              }
              if (vName.startsWith('on') || vName.includes('/on')) {
                tieScore += 20;
              }
            } else if (
              node.type === 'FRAME' ||
              node.type === 'COMPONENT' ||
              node.type === 'COMPONENT_SET' ||
              node.type === 'INSTANCE'
            ) {
              if (vName.startsWith('on') || vName.includes('/on')) {
                tieScore -= 50;
              }
              if (vName.includes('surface')) tieScore += 15;
              if (vName.includes('primary')) tieScore += 10;
            }

            if (dist < bestDist - 0.005 || (Math.abs(dist - bestDist) <= 0.005 && tieScore > bestTieScore)) {
              bestDist = dist;
              bestTieScore = tieScore;
              bestToken = item;
            }
          }

          if (bestToken) {
            newFills[i] = figma.variables.setBoundVariableForPaint(
              newFills[i] as SolidPaint,
              'color',
              bestToken.variable
            );
            modifiedFills = true;
            colorsBoundCount++;
          }
        }

        if (modifiedFills) {
          (node as any).fills = newFills;
        }
      } catch (err) {}
    }

    if ('strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0) {
      try {
        const strokes = (node as any).strokes as readonly Paint[];
        const candidateStrokeTokens = precomputedColors.filter((c) => {
          if (!c.scopes || c.scopes.length === 0) return false;
          return c.scopes.includes('ALL_SCOPES') || c.scopes.includes('STROKE_COLOR');
        });

        let modifiedStrokes = false;
        const newStrokes = JSON.parse(JSON.stringify(strokes)) as Paint[];

        for (let i = 0; i < strokes.length; i++) {
          const paint = strokes[i];
          if (paint.type !== 'SOLID' || paint.visible === false) continue;
          if (!options.forceRebind && paint.boundVariables?.color) continue;

          const pr = paint.color.r;
          const pg = paint.color.g;
          const pb = paint.color.b;
          const pa = paint.opacity !== undefined ? paint.opacity : 1;

          let bestToken: PrecomputedColor | null = null;
          let bestDist = Infinity;
          let bestScore = -Infinity;

          for (const item of candidateStrokeTokens) {
            const resolved = item.color;
            const dist = Math.sqrt(
              Math.pow(pr - resolved.r, 2) +
                Math.pow(pg - resolved.g, 2) +
                Math.pow(pb - resolved.b, 2) +
                Math.pow(pa - resolved.a, 2)
            );

            const maxDist = options.mode === 'exact' ? 0.015 : 0.08;
            if (dist > maxDist) continue;

            let score = 0;
            const vName = item.lowerName;
            if (vName.includes('outline')) score += 30;
            if (vName.includes('border')) score += 20;

            if (dist < bestDist - 0.005 || (Math.abs(dist - bestDist) <= 0.005 && score > bestScore)) {
              bestDist = dist;
              bestScore = score;
              bestToken = item;
            }
          }

          if (bestToken) {
            newStrokes[i] = figma.variables.setBoundVariableForPaint(
              newStrokes[i] as SolidPaint,
              'color',
              bestToken.variable
            );
            modifiedStrokes = true;
            colorsBoundCount++;
          }
        }

        if (modifiedStrokes) {
          (node as any).strokes = newStrokes;
        }
      } catch (err) {}
    }
    }

    // --- C. BIND TEXT STYLES (ENTIRE STYLE ONLY - NO SINGLE-VARIABLE FALLBACK!) ---
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;

      const applyMatchedStyle = async (matched: IndexedTextStyle, range?: { start: number; end: number }) => {
        let styleObj: TextStyle | null = matched.style || null;

        if (!styleObj && matched.id) {
          try {
            styleObj = (await figma.getStyleByIdAsync(matched.id)) as TextStyle | null;
          } catch (e) {}
        }

        if (!styleObj && matched.key) {
          if (importedStylesCache.has(matched.key)) {
            styleObj = importedStylesCache.get(matched.key)!;
          } else {
            try {
              styleObj = (await figma.importStyleByKeyAsync(matched.key)) as TextStyle | null;
              if (styleObj) importedStylesCache.set(matched.key, styleObj);
            } catch (e) {
              console.warn(`Could not import remote style by key ${matched.key}:`, e);
            }
          }
        }

        if (styleObj) {
          const fullLabel = matched.description ? `${matched.name} ${matched.description}` : matched.name;
          CACHED_STYLE_ID_TO_LABEL_MAP.set(styleObj.id, fullLabel);
          try {
            await loadFontsForTextNode(textNode);
          } catch (e) {}
          try {
            if (styleObj.fontName) {
              await figma.loadFontAsync(styleObj.fontName);
            }
          } catch (e) {}
          try {
            if (range) {
              await textNode.setRangeTextStyleIdAsync(range.start, range.end, styleObj.id);
            } else {
              await textNode.setTextStyleIdAsync(styleObj.id);
            }
            return true;
          } catch (e) {
            console.warn(`[AutoBinder] Failed to set textStyleId on ${textNode.name}:`, e);
          }
        }
        return false;
      };

      if (
        textNode.fontName !== figma.mixed &&
        textNode.fontSize !== figma.mixed &&
        textNode.lineHeight !== figma.mixed
      ) {
        const currentStyleId = textNode.textStyleId;
        const fontName = textNode.fontName as FontName;
        const nodeSize = textNode.fontSize as number;
        const nodeLh = textNode.lineHeight as LineHeight;

        if (!currentStyleId || options.forceRebind) {
          const matched = matchTextStyleForSpec(
            fontName.family,
            fontName.style,
            nodeSize,
            nodeLh,
            textNode.name,
            availableTextStyles,
            options
          );

          if (matched) {
            const ok = await applyMatchedStyle(matched);
            if (ok) textStylesBoundCount++;
          }
        }
      } else {
        // Mixed text segments (Rich Text)
        try {
          if (typeof textNode.getStyledTextSegments === 'function') {
            const segments = textNode.getStyledTextSegments([
              'fontName',
              'fontSize',
              'lineHeight',
              'textStyleId',
            ]);
            let hasSegmentChange = false;

            for (const seg of segments) {
              if (seg.textStyleId && !options.forceRebind) continue;
              if (!seg.fontName || typeof seg.fontSize !== 'number') continue;

              const matched = matchTextStyleForSpec(
                seg.fontName.family,
                seg.fontName.style,
                seg.fontSize,
                seg.lineHeight,
                textNode.name,
                availableTextStyles,
                options
              );

              if (matched) {
                const ok = await applyMatchedStyle(matched, { start: seg.start, end: seg.end });
                if (ok) hasSegmentChange = true;
              }
            }

            if (hasSegmentChange) textStylesBoundCount++;
          }
        } catch (mixedErr) {}
      }
    }
  }

  // --- 5. NOTIFICATION & DIAGNOSTICS ---
  const textNodes = allNodesToProcess.filter((n): n is TextNode => n.type === 'TEXT');

  if (options.notify !== false) {
    if (textNodes.length > 0 && textStylesBoundCount === 0) {
      if (availableTextStyles.length === 0) {
        figma.notify(
          "Brak stylów tekstowych w pamięci. Otwórz plik biblioteki DS i kliknij '📥 Zapisz style z tego pliku DS'!",
          { timeout: 4500 }
        );
      } else {
        const first = textNodes[0];
        let specStr = '';
        if (first.fontName !== figma.mixed && first.fontSize !== figma.mixed && first.lineHeight !== figma.mixed) {
          const fn = first.fontName as FontName;
          const sz = first.fontSize as number;
          const lh = calculateLineHeightPx(sz, first.lineHeight as LineHeight);
          specStr = `${fn.family} ${fn.style} ${sz}px/${lh ? `${lh}px` : 'Auto'}`;
        }
        figma.notify(
          `Nie znaleziono stylu dla: ${specStr || 'warstwy tekstowej'} (W pamięci: ${availableTextStyles.length} stylów). Podpięto: ${metricsBoundCount} metryk, ${colorsBoundCount} kolorów.`,
          { timeout: 4500 }
        );
      }
    } else if (textStylesBoundCount > 0) {
      figma.notify(
        `Podpięto: ${metricsBoundCount} metryk, ${colorsBoundCount} kolorów oraz ${textStylesBoundCount} stylów tekstowych!`
      );
    } else {
      figma.notify(
        `Podpięto ${metricsBoundCount} zmiennych metrycznych (metrics) i ${colorsBoundCount} zmiennych kolorów (schemes) zgodnie ze Scopes!`
      );
    }
  }

  return {
    metricsBound: metricsBoundCount,
    colorsBound: colorsBoundCount,
    textStylesBound: textStylesBoundCount,
  };
}

type MetricSemanticField = 'paddingX' | 'paddingY' | 'gap' | 'radius' | 'stroke' | 'size' | 'opacity' | 'typography';

function isNodeControlCandidate(node: SceneNode): boolean {
  const nameLower = (node.name || '').toLowerCase();
  if (
    nameLower.includes('button') ||
    nameLower.includes('input') ||
    nameLower.includes('control') ||
    nameLower.includes('tag') ||
    nameLower.includes('badge') ||
    nameLower.includes('chip') ||
    nameLower.includes('tab') ||
    nameLower.includes('toggle') ||
    nameLower.includes('switch') ||
    nameLower.includes('checkbox') ||
    nameLower.includes('radio')
  ) {
    return true;
  }
  return (
    'height' in node &&
    'width' in node &&
    (node as any).height > 0 &&
    (node as any).height <= 56 &&
    (node as any).width > 0 &&
    (node as any).width <= 320
  );
}

function getAncestorColorRole(node: SceneNode): 'primary' | 'primaryContainer' | 'surface' | 'background' | null {
  let curr: BaseNode | null = node.parent;
  while (curr && curr.type !== 'PAGE') {
    const boundFillVar = (curr as any).boundVariables?.fills?.[0];
    if (boundFillVar) {
      const varObj = sessionAllVarsMap.get(boundFillVar.id);
      if (varObj) {
        const vName = varObj.name.toLowerCase();
        if (vName.includes('primarycontainer')) return 'primaryContainer';
        if (vName.includes('primary')) return 'primary';
        if (vName.includes('surface')) return 'surface';
        if (vName.includes('background')) return 'background';
      }
    }
    curr = curr.parent;
  }
  return null;
}

function findBestMetricToken(
  rawValue: number,
  allowedScopes: VariableScope[],
  semanticField: MetricSemanticField,
  options: {
    mode: 'exact' | 'snap';
    isControl: boolean;
    allowedIds?: Set<string>;
    hintName?: string;
  },
  precomputedMetrics: PrecomputedMetric[]
): PrecomputedMetric | null {
  const candidates = precomputedMetrics.filter((m) => {
    if (options.allowedIds && !options.allowedIds.has(m.variable.id)) return false;
    return checkScopeMatch(m.scopes, allowedScopes);
  });

  const hintLower = (options.hintName || '').toLowerCase();
  const maxSnapDiff = Math.min(24, Math.max(8, rawValue * 0.45));

  let bestToken: PrecomputedMetric | null = null;
  let bestScore = -Infinity;
  let minDiff = Infinity;

  for (const item of candidates) {
    const vName = item.lowerName;

    if (rawValue > 0) {
      if (semanticField === 'paddingX' || semanticField === 'paddingY') {
        if (vName.includes('/gap/') || vName.startsWith('gap/') || vName.includes('gap')) continue;
      } else if (semanticField === 'gap') {
        if (
          vName.includes('inset') ||
          vName.includes('inline') ||
          vName.includes('block') ||
          vName.includes('padding')
        ) {
          continue;
        }
      } else if (semanticField === 'stroke') {
        if (vName.includes('gap') || vName.includes('padding') || vName.includes('radius')) continue;
      }
    }

    const diff = Math.abs(item.value - rawValue);
    if (options.mode === 'exact') {
      if (diff > 0.5) continue;
    } else if (diff > maxSnapDiff) {
      continue;
    }

    // Prioritize exact Metrics values, then closest scoped Metrics tokens
    let score = diff <= 0.05 ? 1200 : diff <= 0.5 ? 900 - diff * 50 : 300 - diff * 25;
    if (item.isMetricsCollection) score += 400;
    if (item.isLocal) score += 200;

    if (rawValue === 0) {
      if (
        vName === 'constant/none' ||
        vName.endsWith('/constant/none') ||
        vName === 'none' ||
        vName.endsWith('/none') ||
        vName.includes('none') ||
        vName.includes('zero')
      ) {
        score += 500;
      }
    }

    if (semanticField === 'paddingX') {
      if (options.isControl) {
        if (vName.startsWith('space/interactive/inline/')) score += 60;
        else if (vName.includes('padding/buttonx') || vName.includes('padding/inputx')) score += 45;
        else if (vName.startsWith('layout/')) score += 35;
        else if (vName.startsWith('space/inset/')) score += 10;
      } else {
        if (vName.startsWith('space/inset/')) score += 60;
        else if (vName.includes('padding/card')) score += 45;
        else if (vName.startsWith('layout/')) score += 35;
        else if (vName.startsWith('space/interactive/inline/')) score += 10;
      }
    } else if (semanticField === 'paddingY') {
      if (options.isControl) {
        if (vName.startsWith('space/interactive/block/')) score += 60;
        else if (vName.includes('padding/buttony') || vName.includes('padding/inputy')) score += 45;
        else if (vName.startsWith('layout/')) score += 35;
        else if (vName.startsWith('space/inset/')) score += 10;
      } else {
        if (vName.startsWith('space/inset/')) score += 60;
        else if (vName.includes('padding/card')) score += 45;
        else if (vName.startsWith('layout/')) score += 35;
        else if (vName.startsWith('space/interactive/block/')) score += 10;
      }
    } else if (semanticField === 'gap') {
      if (
        vName.startsWith('space/gap/component/') ||
        vName.startsWith('space/gap/layout/') ||
        vName.startsWith('gap/') ||
        vName.startsWith('layout/') ||
        vName.includes('/gap/') ||
        vName.includes('extrasmall')
      ) {
        score += 65;
      }
    } else if (semanticField === 'radius') {
      if (options.isControl) {
        if (vName.startsWith('radius/interactive/') || vName.startsWith('radius/special/')) score += 60;
        else if (vName.startsWith('radius/container/')) score += 10;
      } else {
        if (vName.startsWith('radius/container/')) score += 60;
        else if (vName.startsWith('radius/interactive/')) score += 10;
      }
    } else if (semanticField === 'stroke') {
      if (vName.startsWith('border/') || vName.startsWith('constant/1')) score += 60;
    }

    if (hintLower) {
      const hintLeaf = hintLower.split('/').pop() || '';
      if (hintLeaf && vName.endsWith(hintLeaf)) score += 25;
    }

    if (score > bestScore || (score === bestScore && diff < minDiff)) {
      bestScore = score;
      minDiff = diff;
      bestToken = item;
    }
  }

  return bestToken;
}

function findBestColorToken(
  pr: number,
  pg: number,
  pb: number,
  pa: number,
  requiredScope: VariableScope,
  nodeType: NodeType,
  ancestorRole: 'primary' | 'primaryContainer' | 'surface' | 'background' | null,
  options: {
    mode: 'exact' | 'snap';
    allowedIds?: Set<string>;
    hintName?: string;
  },
  precomputedColors: PrecomputedColor[]
): PrecomputedColor | null {
  const candidates = precomputedColors.filter((c) => {
    if (options.allowedIds && !options.allowedIds.has(c.variable.id)) return false;
    if (!c.scopes || c.scopes.length === 0) return false;
    if (requiredScope === 'STROKE_COLOR') {
      return c.scopes.includes('ALL_SCOPES') || c.scopes.includes('STROKE_COLOR');
    }
    if (requiredScope === 'EFFECT_COLOR') {
      return c.scopes.includes('ALL_SCOPES') || c.scopes.includes('EFFECT_COLOR');
    }
    return c.scopes.includes('ALL_SCOPES') || c.scopes.includes('ALL_FILLS') || c.scopes.includes(requiredScope);
  });

  const maxDist = options.mode === 'exact' ? 0.015 : 0.14;
  const hintLower = (options.hintName || '').toLowerCase();

  let bestToken: PrecomputedColor | null = null;
  let bestScore = -Infinity;
  let bestDist = Infinity;

  for (const item of candidates) {
    const resolved = item.color;
    const dist = Math.sqrt(
      Math.pow(pr - resolved.r, 2) +
      Math.pow(pg - resolved.g, 2) +
      Math.pow(pb - resolved.b, 2) +
      Math.pow(pa - resolved.a, 2)
    );
    if (dist > maxDist) continue;

    let score = dist <= 0.015 ? 1000 - dist * 500 : 300 - dist * 400;
    if (item.isSchemesCollection) score += 300;
    if (item.isLocal) score += 200;

    const vName = item.lowerName;
    if (requiredScope === 'STROKE_COLOR') {
      if (vName.includes('outline')) score += 35;
      if (vName.includes('border')) score += 25;
    } else if (nodeType === 'TEXT') {
      if (vName.includes('onprimary') && !vName.includes('container') && ancestorRole === 'primary') score += 50;
      else if (vName.includes('onprimarycontainer') && ancestorRole === 'primaryContainer') score += 50;
      else if ((vName.includes('onsurface') || vName.includes('onbackground')) && (ancestorRole === 'surface' || ancestorRole === 'background' || !ancestorRole)) score += 40;
      if (vName.startsWith('on') || vName.includes('/on')) score += 20;
    } else if (nodeType === 'FRAME' || nodeType === 'COMPONENT' || nodeType === 'COMPONENT_SET' || nodeType === 'INSTANCE') {
      if (vName.startsWith('on') || vName.includes('/on')) score -= 50;
      if (vName.includes('surface')) score += 15;
      if (vName.includes('primary')) score += 10;
    }

    if (hintLower) {
      const hintLeaf = hintLower.split('/').pop() || '';
      if (hintLeaf && vName.endsWith(hintLeaf)) score += 20;
    }

    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      bestScore = score;
      bestDist = dist;
      bestToken = item;
    }
  }

  return bestToken;
}

export async function runAuditAutoFix(
  nodeIds: string[],
  options: AuditAutoFixOptions = { mode: 'snap', filter: 'all', detachUnmatchedForeign: true, notify: true }
): Promise<{ detachedCount: number; reboundCount: number; boundCount: number }> {
  const uniqueIds = Array.from(new Set((nodeIds || []).filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) {
    if (options.notify !== false) {
      figma.notify('Brak warstw do automatycznej naprawy w bieżącym widoku audytu.', { error: true });
    }
    return { detachedCount: 0, reboundCount: 0, boundCount: 0 };
  }

  const targetNodes: SceneNode[] = [];
  for (const id of uniqueIds) {
    try {
      const node = await figma.getNodeByIdAsync(id);
      if (node && !(node as any).removed && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
        targetNodes.push(node as SceneNode);
      }
    } catch (e) {}
  }

  if (targetNodes.length === 0) {
    if (options.notify !== false) {
      figma.notify('Nie znaleziono docelowych warstw na płótnie.', { error: true });
    }
    return { detachedCount: 0, reboundCount: 0, boundCount: 0 };
  }

  const auditCtx = await createAuditVariableContext(targetNodes);
  const { precomputedMetrics, precomputedColors } = await preloadAutoBinderCaches(true, targetNodes[0]);

  // Keep only variables from allowed local collections or trusted external libraries
  const allowedIds = new Set<string>();
  const checkedVarIds = new Set<string>();
  const registerAllowedBatch = async (items: Array<{ variable: Variable }>) => {
    await Promise.all(
      items.map(async (item) => {
        if (!item?.variable || checkedVarIds.has(item.variable.id)) return;
        checkedVarIds.add(item.variable.id);
        if (await auditCtx.isAllowedCandidateVariable(item.variable)) {
          allowedIds.add(item.variable.id);
        }
      })
    );
  };
  await registerAllowedBatch(precomputedMetrics);
  await registerAllowedBatch(precomputedColors);

  const filter = options.filter || 'all';
  const detachUnmatched = options.detachUnmatchedForeign !== false;
  const matchesFilter = (category: 'gap' | 'padding' | 'radius' | 'stroke' | 'color', issueType: 'unbound' | 'missing' | 'foreign'): boolean => {
    if (filter === 'all') return true;
    if (filter === 'unbound' || filter === 'missing' || filter === 'foreign') {
      return issueType === filter;
    }
    return category === filter;
  };

  const appleCaches = createAppleDetectionCaches();

  let detachedCount = 0;
  let reboundCount = 0;
  let boundCount = 0;

  for (let idx = 0; idx < targetNodes.length; idx++) {
    if (idx > 0 && idx % 20 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }

    const node = targetNodes[idx];
    const ignoredSet = getNodeIgnoredAuditKeys(node);
    const isIgnoredProp = (category: string, prop: string) =>
      ignoredSet.has('*') || ignoredSet.has(`${category}:*`) || ignoredSet.has(`${category}:${prop}`);

    const isAppleNode = await isInsideOfficialAppleSubtree(node, auditCtx.libraryInfoByKey, appleCaches);
    const boundVars = (node as any).boundVariables || {};
    const isControl = isNodeControlCandidate(node);
    const ancestorRole = getAncestorColorRole(node);

    const processNumericField = async (
      prop: string,
      rawValue: number,
      allowedScopes: VariableScope[],
      semanticField: MetricSemanticField,
      category: 'gap' | 'padding' | 'radius' | 'stroke'
    ) => {
      if (isIgnoredProp(category, prop)) return;
      const existingAlias = boundVars[prop];
      if (existingAlias && existingAlias.type === 'VARIABLE_ALIAS' && existingAlias.id) {
        const status = await auditCtx.checkVariableStatus(existingAlias.id, node);
        if (!status.isMissing && !status.isForeign) return;
        const issueKind: 'missing' | 'foreign' = status.isMissing ? 'missing' : 'foreign';
        if (!matchesFilter(category, issueKind)) return;

        const bestToken = findBestMetricToken(
          rawValue,
          allowedScopes,
          semanticField,
          { mode: options.mode, isControl, allowedIds, hintName: status.name },
          precomputedMetrics
        );

        if (bestToken) {
          try {
            (node as any).setBoundVariable(prop as VariableBindableNodeField, bestToken.variable);
            reboundCount++;
            return;
          } catch (e) {}
        }
        if (detachUnmatched) {
          try {
            (node as any).setBoundVariable(prop as VariableBindableNodeField, null);
            detachedCount++;
          } catch (e) {}
        }
        return;
      }

      if (!matchesFilter(category, 'unbound')) return;
      const bestToken = findBestMetricToken(
        rawValue,
        allowedScopes,
        semanticField,
        { mode: options.mode, isControl, allowedIds },
        precomputedMetrics
      );
      if (bestToken) {
        try {
          (node as any).setBoundVariable(prop as VariableBindableNodeField, bestToken.variable);
          boundCount++;
        } catch (e) {}
      }
    };

    // 1. Gap & Padding
    if (node.type !== 'COMPONENT_SET' && 'layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
      const frame = node as FrameNode;
      if (typeof frame.paddingLeft === 'number' && frame.paddingLeft >= 0) {
        await processNumericField('paddingLeft', frame.paddingLeft, ['GAP', 'WIDTH_HEIGHT'], 'paddingX', 'padding');
      }
      if (typeof frame.paddingRight === 'number' && frame.paddingRight >= 0) {
        await processNumericField('paddingRight', frame.paddingRight, ['GAP', 'WIDTH_HEIGHT'], 'paddingX', 'padding');
      }
      if (typeof frame.paddingTop === 'number' && frame.paddingTop >= 0) {
        await processNumericField('paddingTop', frame.paddingTop, ['GAP', 'WIDTH_HEIGHT'], 'paddingY', 'padding');
      }
      if (typeof frame.paddingBottom === 'number' && frame.paddingBottom >= 0) {
        await processNumericField('paddingBottom', frame.paddingBottom, ['GAP', 'WIDTH_HEIGHT'], 'paddingY', 'padding');
      }
      if (frame.primaryAxisAlignItems !== 'SPACE_BETWEEN' && typeof frame.itemSpacing === 'number' && frame.itemSpacing >= 0) {
        await processNumericField('itemSpacing', frame.itemSpacing, ['GAP', 'WIDTH_HEIGHT'], 'gap', 'gap');
      }
      if ((frame as any).counterAxisAlignContent !== 'SPACE_BETWEEN' && 'layoutWrap' in frame && frame.layoutWrap === 'WRAP' && typeof frame.counterAxisSpacing === 'number') {
        await processNumericField('counterAxisSpacing', frame.counterAxisSpacing, ['GAP', 'WIDTH_HEIGHT'], 'gap', 'gap');
      }
    }

    // 2. Corner Radius
    if (node.type !== 'COMPONENT_SET' && 'cornerRadius' in node) {
      const rNode = node as any;
      if (typeof rNode.cornerRadius === 'number' && rNode.cornerRadius >= 0) {
        const hasPerCornerBinding = Boolean(boundVars.topLeftRadius || boundVars.topRightRadius || boundVars.bottomLeftRadius || boundVars.bottomRightRadius);
        if (hasPerCornerBinding) {
          await processNumericField('topLeftRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius', 'radius');
          await processNumericField('topRightRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius', 'radius');
          await processNumericField('bottomLeftRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius', 'radius');
          await processNumericField('bottomRightRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        } else {
          await processNumericField('cornerRadius', rNode.cornerRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        }
      } else {
        if (typeof rNode.topLeftRadius === 'number' && rNode.topLeftRadius >= 0) {
          await processNumericField('topLeftRadius', rNode.topLeftRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        }
        if (typeof rNode.topRightRadius === 'number' && rNode.topRightRadius >= 0) {
          await processNumericField('topRightRadius', rNode.topRightRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        }
        if (typeof rNode.bottomLeftRadius === 'number' && rNode.bottomLeftRadius >= 0) {
          await processNumericField('bottomLeftRadius', rNode.bottomLeftRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        }
        if (typeof rNode.bottomRightRadius === 'number' && rNode.bottomRightRadius >= 0) {
          await processNumericField('bottomRightRadius', rNode.bottomRightRadius, ['CORNER_RADIUS'], 'radius', 'radius');
        }
      }
    }

    // 3. Stroke Weight
    if (node.type !== 'COMPONENT_SET' && 'strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0) {
      const sNode = node as any;
      if (typeof sNode.strokeWeight === 'number' && sNode.strokeWeight > 0) {
        await processNumericField('strokeWeight', sNode.strokeWeight, ['STROKE_FLOAT'], 'stroke', 'stroke');
      }
    }

    // 4. Colors (Fills, Strokes, Effects & Styles)
    const processColorPaints = async (field: 'fills' | 'strokes', styleField: 'fillStyleId' | 'strokeStyleId', requiredScope: VariableScope) => {
      if (isIgnoredProp('color', field) || !(field in node) || !Array.isArray((node as any)[field])) return;

      // Detach missing or foreign paint style if needed so paints can be rebound
      const styleId = (node as any)[styleField];
      if (typeof styleId === 'string' && styleId.length > 0) {
        try {
          const style = await figma.getStyleByIdAsync(styleId);
          let hasBadStyleBinding = !style;
          if (style && 'paints' in style && Array.isArray((style as any).paints)) {
            for (const sp of (style as any).paints) {
              const spBinding = sp?.boundVariables?.color;
              if (spBinding && spBinding.type === 'VARIABLE_ALIAS' && spBinding.id) {
                const st = await auditCtx.checkVariableStatus(spBinding.id, node);
                if (st.isMissing || st.isForeign) {
                  hasBadStyleBinding = true;
                  break;
                }
              }
            }
          }
          if (hasBadStyleBinding && matchesFilter('color', !style ? 'missing' : 'foreign')) {
            if (typeof (node as any)[`set${field === 'fills' ? 'Fill' : 'Stroke'}StyleIdAsync`] === 'function') {
              await (node as any)[`set${field === 'fills' ? 'Fill' : 'Stroke'}StyleIdAsync`]('');
            } else {
              (node as any)[styleField] = '';
            }
            detachedCount++;
          }
        } catch (e) {}
      }

      try {
        const paints = (node as any)[field] as readonly Paint[];
        if (!Array.isArray(paints) || paints.length === 0) return;
        let modified = false;
        const nextPaints = JSON.parse(JSON.stringify(paints)) as Paint[];

        for (let i = 0; i < paints.length; i++) {
          const paint = paints[i];
          if (!paint || paint.type !== 'SOLID' || paint.visible === false) continue;
          const pr = paint.color.r;
          const pg = paint.color.g;
          const pb = paint.color.b;
          const pa = paint.opacity !== undefined ? paint.opacity : 1;

          const existingBinding = paint.boundVariables?.color;
          if (existingBinding && existingBinding.type === 'VARIABLE_ALIAS' && existingBinding.id) {
            const status = await auditCtx.checkVariableStatus(existingBinding.id, node);
            if (!status.isMissing && !status.isForeign) continue;
            const issueKind: 'missing' | 'foreign' = status.isMissing ? 'missing' : 'foreign';
            if (!matchesFilter('color', issueKind)) continue;

            const bestColor = findBestColorToken(
              pr, pg, pb, pa,
              requiredScope,
              node.type,
              ancestorRole,
              { mode: options.mode, allowedIds, hintName: status.name },
              precomputedColors
            );

            if (bestColor) {
              nextPaints[i] = figma.variables.setBoundVariableForPaint(nextPaints[i] as SolidPaint, 'color', bestColor.variable);
              modified = true;
              reboundCount++;
            } else if (detachUnmatched) {
              nextPaints[i] = figma.variables.setBoundVariableForPaint(nextPaints[i] as SolidPaint, 'color', null);
              modified = true;
              detachedCount++;
            }
          } else if (matchesFilter('color', 'unbound')) {
            const bestColor = findBestColorToken(
              pr, pg, pb, pa,
              requiredScope,
              node.type,
              ancestorRole,
              { mode: options.mode, allowedIds },
              precomputedColors
            );
            if (bestColor) {
              nextPaints[i] = figma.variables.setBoundVariableForPaint(nextPaints[i] as SolidPaint, 'color', bestColor.variable);
              modified = true;
              boundCount++;
            }
          }
        }

        if (modified) {
          (node as any)[field] = nextPaints;
        }
      } catch (e) {}
    };

    if (!isAppleNode && node.type !== 'COMPONENT_SET') {
      const fillScope: VariableScope =
        node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
          ? 'FRAME_FILL'
          : node.type === 'TEXT'
          ? 'TEXT_FILL'
          : 'SHAPE_FILL';
      await processColorPaints('fills', 'fillStyleId', fillScope);
      await processColorPaints('strokes', 'strokeStyleId', 'STROKE_COLOR');

      // Shadow effect colors
      if (!isIgnoredProp('color', 'effects') && 'effects' in node && Array.isArray((node as any).effects)) {
        try {
          const effects = (node as any).effects as readonly Effect[];
          let effModified = false;
          const nextEffects = JSON.parse(JSON.stringify(effects)) as Effect[];
          for (let eIdx = 0; eIdx < effects.length; eIdx++) {
            const eff = effects[eIdx];
            if (!eff || eff.visible === false || (eff.type !== 'DROP_SHADOW' && eff.type !== 'INNER_SHADOW')) continue;
            const effBinding = (eff as any).boundVariables?.color;
            if (effBinding && effBinding.type === 'VARIABLE_ALIAS' && effBinding.id) {
              const status = await auditCtx.checkVariableStatus(effBinding.id, node);
              if (!status.isMissing && !status.isForeign) continue;
              const issueKind: 'missing' | 'foreign' = status.isMissing ? 'missing' : 'foreign';
              if (!matchesFilter('color', issueKind)) continue;

              const ea = eff.color.a !== undefined ? eff.color.a : 1;
              const bestColor = findBestColorToken(
                eff.color.r, eff.color.g, eff.color.b, ea,
                'EFFECT_COLOR',
                node.type,
                ancestorRole,
                { mode: options.mode, allowedIds, hintName: status.name },
                precomputedColors
              );
              if (bestColor && typeof figma.variables.setBoundVariableForEffect === 'function') {
                nextEffects[eIdx] = figma.variables.setBoundVariableForEffect(nextEffects[eIdx] as DropShadowEffect, 'color', bestColor.variable);
                effModified = true;
                reboundCount++;
              } else if (detachUnmatched && typeof figma.variables.setBoundVariableForEffect === 'function') {
                nextEffects[eIdx] = figma.variables.setBoundVariableForEffect(nextEffects[eIdx] as DropShadowEffect, 'color', null);
                effModified = true;
                detachedCount++;
              }
            }
          }
          if (effModified) {
            (node as any).effects = nextEffects;
          }
        } catch (e) {}
      }
    }

    // 5. Remaining invalid/foreign boundVariables (e.g. width, height, min/max, opacity, individual stroke weights, typography props)
    const handledKeys = new Set([
      'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
      'itemSpacing', 'counterAxisSpacing',
      'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
      'strokeWeight', 'fills', 'strokes', 'effects'
    ]);

    for (const [bKey, bVal] of Object.entries((node as any).boundVariables || {})) {
      if (handledKeys.has(bKey) || !bVal || Array.isArray(bVal)) continue;
      if (typeof bVal !== 'object' || (bVal as any).type !== 'VARIABLE_ALIAS' || !(bVal as any).id) continue;

      const cat: 'gap' | 'padding' | 'radius' | 'color' | 'stroke' = bKey.includes('radius')
        ? 'radius'
        : bKey.includes('spacing') || bKey.includes('gap')
        ? 'gap'
        : bKey.includes('padding')
        ? 'padding'
        : bKey.toLowerCase().includes('weight') || bKey.toLowerCase().includes('width') || bKey === 'strokeWeight'
        ? 'stroke'
        : 'color';

      if ((isAppleNode && cat === 'color') || isIgnoredProp(cat, bKey)) continue;
      const status = await auditCtx.checkVariableStatus((bVal as any).id, node);
      if (!status.isMissing && !status.isForeign) continue;
      const issueKind: 'missing' | 'foreign' = status.isMissing ? 'missing' : 'foreign';
      if (!matchesFilter(cat, issueKind)) continue;

      if (node.type === 'TEXT') {
        try { await loadFontsForTextNode(node as TextNode); } catch (e) {}
      }

      const numericVal = typeof (node as any)[bKey] === 'number' ? (node as any)[bKey] : null;
      let rebound = false;
      if (numericVal !== null) {
        const scopes: VariableScope[] =
          bKey === 'opacity'
            ? ['OPACITY']
            : bKey === 'fontSize'
            ? ['FONT_SIZE']
            : bKey === 'lineHeight'
            ? ['LINE_HEIGHT']
            : bKey === 'letterSpacing'
            ? ['LETTER_SPACING']
            : bKey.toLowerCase().includes('weight')
            ? ['STROKE_FLOAT']
            : ['WIDTH_HEIGHT'];
        const semanticField: MetricSemanticField =
          bKey === 'opacity'
            ? 'opacity'
            : bKey.toLowerCase().includes('weight')
            ? 'stroke'
            : /^(fontSize|lineHeight|letterSpacing|paragraphSpacing|paragraphIndent)$/.test(bKey)
            ? 'typography'
            : 'size';

        const bestToken = findBestMetricToken(
          numericVal,
          scopes,
          semanticField,
          { mode: options.mode, isControl, allowedIds, hintName: status.name },
          precomputedMetrics
        );
        if (bestToken) {
          try {
            (node as any).setBoundVariable(bKey as VariableBindableNodeField, bestToken.variable);
            reboundCount++;
            rebound = true;
          } catch (e) {}
        }
      }

      if (!rebound && detachUnmatched) {
        try {
          (node as any).setBoundVariable(bKey as VariableBindableNodeField, null);
          detachedCount++;
        } catch (e) {}
      }
    }
  }

  if (options.notify !== false) {
    const totalAssigned = reboundCount + boundCount;
    if (totalAssigned === 0 && detachedCount === 0) {
      figma.notify('Brak pasujących zmiennych w kolekcji Metrics/Schemes do przepisania w ramach obecnego filtra.');
    } else {
      figma.notify(
        `Audyt Auto-Fix: odpięto ${detachedCount}, podmieniono ${reboundCount}, dopięto ${boundCount} zmiennych (Metrics/Schemes wg Scopes). ✨`
      );
    }
  }

  return { detachedCount, reboundCount, boundCount };
}
