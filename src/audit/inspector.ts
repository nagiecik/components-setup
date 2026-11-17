import {
  AuditIssue,
  AuditSummary,
  VariableCategoryGroup,
  VariableResult,
  VariableSubUsageGroup
} from '../types/audit';
import { rgbToHex } from '../utils/colors';
import {
  dsRegistry,
  getLayerTypeDisplayName,
  getNodeIgnoredAuditKeys,
  getTrustedAuditLibraries,
  isInsideIgnoredSubtree,
  isNonNumericProp,
  parsePropertyInfo,
  shouldSkipNodeReporting
} from './registry';

export function isEffectRelated(varName: string, categoryNames: Iterable<string>): boolean {
  const nameLower = varName.toLowerCase();
  const effectKeywords = ['shadow', 'glass', 'blur', 'effect', 'elevation', 'frost'];

  for (const keyword of effectKeywords) {
    if (nameLower.includes(keyword)) {
      return true;
    }
  }

  for (const cat of categoryNames) {
    const catLower = cat.toLowerCase();
    for (const keyword of effectKeywords) {
      if (catLower.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

export function isTextOrTypographyRelated(varName: string, categoryNames: Iterable<string>): boolean {
  const nameLower = varName.toLowerCase();
  const textKeywords = [
    'text', 'typography', 'font', 'line-height', 'lineheight',
    'letter-spacing', 'letterspacing', 'heading', 'subheading',
    'caption', 'display', 'body', 'title', 'label', 'paragraph',
    'leading', 'tracking', 'font-size', 'fontsize', 'font-weight', 'fontweight'
  ];

  for (const keyword of textKeywords) {
    if (nameLower.includes(keyword)) {
      return true;
    }
  }

  for (const cat of categoryNames) {
    const catLower = cat.toLowerCase();
    for (const keyword of textKeywords) {
      if (catLower.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

export function extractVariableAliases(
  obj: any,
  bindingsMap: Map<string, Set<string>>,
  numericVarIdsSet: Set<string>,
  currentKey = ''
): void {
  if (!obj || typeof obj !== 'object') return;

  if (obj.type === 'VARIABLE_ALIAS' && typeof obj.id === 'string') {
    const varId = obj.id;
    if (!bindingsMap.has(varId)) {
      bindingsMap.set(varId, new Set<string>());
    }
    bindingsMap.get(varId)!.add(currentKey);

    if (!isNonNumericProp(currentKey)) {
      numericVarIdsSet.add(varId);
    }
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractVariableAliases(item, bindingsMap, numericVarIdsSet, currentKey);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const nextKey = isNonNumericProp(key) ? key : (currentKey || key);
      extractVariableAliases(obj[key], bindingsMap, numericVarIdsSet, nextKey);
    }
  }
}

export async function resolveVariableValueAndStatus(variable: Variable): Promise<{ value: string | number; isMissing: boolean }> {
  try {
    if (!variable) {
      return { value: 'Missing', isMissing: true };
    }

    let collection: VariableCollection | null = null;
    try {
      collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    } catch (e) {
      collection = null;
    }

    if (!collection) {
      return { value: variable.name || 'Missing Collection', isMissing: true };
    }

    if (collection.variableIds && Array.isArray(collection.variableIds) && !collection.variableIds.includes(variable.id)) {
      return { value: variable.name || 'Deleted Variable', isMissing: true };
    }

    const defaultModeId = collection.defaultModeId;
    let val: any = undefined;

    if (variable.valuesByMode) {
      if (defaultModeId && variable.valuesByMode[defaultModeId] !== undefined) {
        val = variable.valuesByMode[defaultModeId];
      } else {
        const modeKeys = Object.keys(variable.valuesByMode);
        if (modeKeys.length > 0) {
          val = variable.valuesByMode[modeKeys[0]];
        }
      }
    }

    // If valuesByMode has no values for any mode, variable is unresolvable/missing
    if (val === undefined || val === null) {
      return { value: variable.name || 'Missing Value', isMissing: true };
    }

    let currentVal: any = val;
    let depth = 0;
    while (typeof currentVal === 'object' && currentVal !== null && currentVal.type === 'VARIABLE_ALIAS' && depth < 10) {
      depth++;
      const targetId = currentVal.id;
      if (!targetId) {
        return { value: 'Broken Target', isMissing: true };
      }
      let targetVar: Variable | null = null;
      try {
        targetVar = await figma.variables.getVariableByIdAsync(targetId);
      } catch (e) {
        targetVar = null;
      }
      if (!targetVar) {
        return { value: 'Missing Target Alias', isMissing: true };
      }

      let targetColl: VariableCollection | null = null;
      try {
        targetColl = await figma.variables.getVariableCollectionByIdAsync(targetVar.variableCollectionId);
      } catch (e) {
        targetColl = null;
      }

      if (!targetColl) {
        return { value: 'Missing Target Collection', isMissing: true };
      }

      if (targetColl.variableIds && Array.isArray(targetColl.variableIds) && !targetColl.variableIds.includes(targetVar.id)) {
        return { value: targetVar.name || 'Deleted Target Variable', isMissing: true };
      }

      let nextVal: any = undefined;
      if (targetVar.valuesByMode) {
        if (targetColl && targetColl.defaultModeId && targetVar.valuesByMode[targetColl.defaultModeId] !== undefined) {
          nextVal = targetVar.valuesByMode[targetColl.defaultModeId];
        } else {
          const targetModeKeys = Object.keys(targetVar.valuesByMode);
          if (targetModeKeys.length > 0) {
            nextVal = targetVar.valuesByMode[targetModeKeys[0]];
          }
        }
      }

      if (nextVal === undefined || nextVal === null) {
        return { value: targetVar.name, isMissing: true };
      }
      currentVal = nextVal;
    }

    if (typeof currentVal === 'number') {
      return { value: currentVal, isMissing: false };
    }
    if (typeof currentVal === 'string') {
      const num = parseFloat(currentVal);
      return { value: isNaN(num) ? currentVal : num, isMissing: false };
    }
    if (typeof currentVal === 'boolean') {
      return { value: currentVal ? 'true' : 'false', isMissing: false };
    }

    return { value: variable.name, isMissing: false };
  } catch (e) {
    return { value: variable ? variable.name : 'Unknown', isMissing: true };
  }
}


export async function scanDocument(scope: 'page' | 'document' | 'selection' = 'page') {
  let rawNodes: SceneNode[] = [];
  if (scope === 'selection') {
    const sel = figma.currentPage.selection;
    if (sel && sel.length > 0) {
      const visited = new Set<string>();
      const collect = (nodes: readonly SceneNode[]) => {
        for (const n of nodes) {
          if (!n || visited.has(n.id)) continue;
          visited.add(n.id);
          rawNodes.push(n);
          if ('children' in n && Array.isArray((n as any).children)) {
            collect((n as any).children);
          }
        }
      };
      collect(sel);
    }
  } else if (scope === 'page') {
    rawNodes = figma.currentPage.findAll() as SceneNode[];
  } else {
    const pages = figma.root.children;
    for (const page of pages) {
      const pageNodes = page.findAll() as SceneNode[];
      rawNodes = rawNodes.concat(pageNodes);
    }
  }

  const nodes = rawNodes.filter((node) => !shouldSkipNodeReporting(node));

  const varUsageMap = new Map<string, {
    categoriesMap: Map<string, {
      subGroupsMap: Map<string, {
        subProperty: string;
        layerTypeKey: string;
        layerTypeName: string;
        nodeIdsSet: Set<string>;
      }>;
      allNodeIdsSet: Set<string>;
    }>;
    totalCount: number;
  }>();

  const numericVarIdsSet = new Set<string>();

  for (const node of nodes) {
    const nodeType = node.type;
    const layerTypeKey = nodeType;
    const layerTypeName = getLayerTypeDisplayName(nodeType);

    const boundVariables = (node as any).boundVariables;
    if (boundVariables) {
      const bindingsMap = new Map<string, Set<string>>();
      extractVariableAliases(boundVariables, bindingsMap, numericVarIdsSet);

      for (const [varId, propNamesSet] of bindingsMap.entries()) {
        for (const propName of propNamesSet) {
          if (isNonNumericProp(propName)) continue;

          const { category, detail } = parsePropertyInfo(propName);

          if (!varUsageMap.has(varId)) {
            varUsageMap.set(varId, {
              categoriesMap: new Map(),
              totalCount: 0,
            });
          }

          const usageRecord = varUsageMap.get(varId)!;
          usageRecord.totalCount++;

          if (!usageRecord.categoriesMap.has(category)) {
            usageRecord.categoriesMap.set(category, {
              subGroupsMap: new Map(),
              allNodeIdsSet: new Set(),
            });
          }

          const catGroup = usageRecord.categoriesMap.get(category)!;
          catGroup.allNodeIdsSet.add(node.id);

          const subGroupKey = `${detail}:::${layerTypeKey}`;
          if (!catGroup.subGroupsMap.has(subGroupKey)) {
            catGroup.subGroupsMap.set(subGroupKey, {
              subProperty: detail,
              layerTypeKey: layerTypeKey,
              layerTypeName: layerTypeName,
              nodeIdsSet: new Set(),
            });
          }

          catGroup.subGroupsMap.get(subGroupKey)!.nodeIdsSet.add(node.id);
        }
      }
    }

    const explicitVariableIds = (node as any).explicitVariableModes;
    if (explicitVariableIds) {
      // reserved for future mode scans
    }
  }

  const results: VariableResult[] = [];

  for (const [varId, usageRecord] of varUsageMap.entries()) {
    if (!numericVarIdsSet.has(varId)) continue;

    let variable: Variable | null = null;
    try {
      variable = await figma.variables.getVariableByIdAsync(varId);
    } catch (e) {
      console.warn('Variable not found:', varId);
    }

    const categories: VariableCategoryGroup[] = [];
    for (const [catName, catData] of usageRecord.categoriesMap.entries()) {
      const subGroups: VariableSubUsageGroup[] = [];

      for (const sub of catData.subGroupsMap.values()) {
        subGroups.push({
          subProperty: sub.subProperty,
          layerTypeKey: sub.layerTypeKey,
          layerTypeName: sub.layerTypeName,
          count: sub.nodeIdsSet.size,
          nodeIds: Array.from(sub.nodeIdsSet),
        });
      }

      subGroups.sort((a, b) => b.count - a.count);

      categories.push({
        categoryName: catName,
        totalCount: catData.allNodeIdsSet.size,
        allNodeIds: Array.from(catData.allNodeIdsSet),
        subGroups: subGroups,
      });
    }

    categories.sort((a, b) => b.totalCount - a.totalCount);

    if (variable) {
      if (variable.resolvedType !== 'FLOAT') continue;
      const varName = variable.name;
      const catNames = categories.map(c => c.categoryName);
      if (isEffectRelated(varName, catNames)) continue;
      if (isTextOrTypographyRelated(varName, catNames)) continue;

      const { value, isMissing } = await resolveVariableValueAndStatus(variable);
      results.push({
        id: varId,
        name: variable.name,
        value: value,
        isMissing: isMissing,
        totalUsages: usageRecord.totalCount,
        categories: categories,
      });
    } else {
      results.push({
        id: varId,
        name: `Missing Variable (${varId})`,
        value: 'Missing',
        isMissing: true,
        totalUsages: usageRecord.totalCount,
        categories: categories,
      });
    }
  }

  results.sort((a, b) => b.totalUsages - a.totalUsages);

  figma.ui.postMessage({
    type: 'scan-results',
    variables: results,
    scope: scope,
  });
}

/**
 * Helper to determine if a Color/Paint Style represents a gradient.
 *
 * NOTE / TODO (Future): Figma currently does not support binding variables
 * directly to gradients or gradient styles. We skip auditing them as 'unbound'
 * legacy styles when assigned.
 * If Figma introduces native Gradient Variables in the future, revisit this exception.
 */
function isGradientColorStyle(style: any): boolean {
  if (!style) return false;
  // Check style name for keyword 'gradient' (e.g., 'Gradients/Primary/Angular/Bottom')
  if (typeof style.name === 'string' && /gradient/i.test(style.name)) {
    return true;
  }
  // Also check if paints inside style contain any gradient types
  if ('paints' in style && Array.isArray(style.paints)) {
    return style.paints.some((p: any) => p && typeof p.type === 'string' && p.type.startsWith('GRADIENT'));
  }
  return false;
}

export interface VariableAuditStatus {
  variable: Variable | null;
  isMissing: boolean;
  isForeign: boolean;
  foreignSource?: 'remote' | 'remote-unlinked' | 'local-other';
  foreignLibraryKey?: string;
  collectionName?: string;
  libraryName?: string;
  name: string;
}

export interface LibraryCollectionInfo {
  name: string;
  libraryName: string;
}

export interface AuditVariableContext {
  trustedLibraries: ReturnType<typeof getTrustedAuditLibraries>;
  trustedLibraryKeys: Set<string>;
  localCollectionIds: Set<string>;
  allowedLocalCollectionIds: Set<string>;
  libraryInfoByKey: Map<string, LibraryCollectionInfo>;
  checkVariableStatus: (varId: string, consumerNode?: SceneNode) => Promise<VariableAuditStatus>;
  isAllowedCandidateVariable: (variable: Variable) => Promise<boolean>;
}

const STANDARD_DS_COLLECTION_NAMES = new Set([
  'schemes',
  'metrics',
  '_metrics',
  'layout',
  'typography',
  'accessibility',
  'palettes',
  '_palettes',
  'schemes controls',
  'typography controls',
  'variables',
]);

const CORE_DS_COLLECTION_NAMES = new Set([
  'schemes',
  'metrics',
  '_metrics',
  'layout',
  'typography',
  'accessibility',
]);

export async function createAuditVariableContext(seedNodes: readonly SceneNode[] = []): Promise<AuditVariableContext> {
  const trustedLibraries = getTrustedAuditLibraries();
  const trustedLibraryKeys = new Set(trustedLibraries.map((t) => t.key));
  const hasTrustedRemoteLibrary = trustedLibraries.some(
    (t) => t.source === 'remote' || (typeof t.key === 'string' && t.key.startsWith('remote:'))
  );

  let availableLibraryCollectionKeys: Set<string> | null = null;
  const libraryInfoByKey = new Map<string, { name: string; libraryName: string }>();
  try {
    if (figma.teamLibrary && typeof (figma.teamLibrary as any).getAvailableLibraryVariableCollectionsAsync === 'function') {
      const libs = await (figma.teamLibrary as any).getAvailableLibraryVariableCollectionsAsync();
      if (Array.isArray(libs)) {
        availableLibraryCollectionKeys = new Set(libs.map((l: any) => l.key));
        for (const l of libs) {
          if (l && l.key) {
            libraryInfoByKey.set(l.key, {
              name: l.name || 'Remote Collection',
              libraryName: l.libraryName || 'External Library',
            });
          }
        }
      }
    }
  } catch (e) {
    availableLibraryCollectionKeys = null;
  }

  let localCollections: VariableCollection[] = [];
  try {
    localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  } catch (e) {
    localCollections = [];
  }
  const localCollectionIds = new Set<string>(localCollections.map(c => c.id));

  const allowedLocalCollectionIds = new Set<string>();
  const hasCoreLocalDsCollection = localCollections.some((c) =>
    CORE_DS_COLLECTION_NAMES.has((c.name || '').trim().toLowerCase())
  );
  if (hasCoreLocalDsCollection) {
    for (const c of localCollections) {
      if (STANDARD_DS_COLLECTION_NAMES.has((c.name || '').trim().toLowerCase())) {
        allowedLocalCollectionIds.add(c.id);
      }
    }
  } else if (localCollections.length === 1) {
    allowedLocalCollectionIds.add(localCollections[0].id);
  }

  // Fallback for custom-named files with multiple local collections: treat the most-used local collection as primary DS
  if (allowedLocalCollectionIds.size === 0 && localCollections.length > 1) {
    const localUsageCounts = new Map<string, number>();
    const localVarColMap = new Map<string, string>();
    try {
      const localVars = await figma.variables.getLocalVariablesAsync();
      for (const lv of localVars) {
        localVarColMap.set(lv.id, lv.variableCollectionId);
      }
      const scanBoundMap = new Map<string, Set<string>>();
      const unusedNumSet = new Set<string>();
      for (const n of seedNodes) {
        if ((n as any).boundVariables) {
          extractVariableAliases((n as any).boundVariables, scanBoundMap, unusedNumSet);
        }
      }
      for (const vId of scanBoundMap.keys()) {
        const cid = localVarColMap.get(vId);
        if (cid) {
          localUsageCounts.set(cid, (localUsageCounts.get(cid) || 0) + 1);
        }
      }
    } catch (e) {}

    let primaryColId = localCollections[0].id;
    let maxCount = -1;
    for (const c of localCollections) {
      const count = localUsageCounts.get(c.id) || 0;
      if (count > maxCount) {
        maxCount = count;
        primaryColId = c.id;
      }
    }
    allowedLocalCollectionIds.add(primaryColId);
  }

  const varStatusCache = new Map<string, VariableAuditStatus>();
  const collectionCache = new Map<string, VariableCollection | null>();

  async function getCollectionCached(colId: string): Promise<VariableCollection | null> {
    if (collectionCache.has(colId)) return collectionCache.get(colId)!;
    let collection: VariableCollection | null = null;
    try {
      collection = await figma.variables.getVariableCollectionByIdAsync(colId);
    } catch (e) {
      collection = null;
    }
    collectionCache.set(colId, collection);
    return collection;
  }

  async function checkVariableStatus(varId: string, consumerNode?: SceneNode): Promise<VariableAuditStatus> {
    if (!varId || typeof varId !== 'string') {
      return { variable: null, isMissing: true, isForeign: false, name: 'Unknown' };
    }
    if (varStatusCache.has(varId)) {
      const cached = varStatusCache.get(varId)!;
      if (cached.isMissing || cached.foreignSource === 'remote-unlinked') return cached;
      if (cached.variable && consumerNode && typeof (cached.variable as any).resolveForConsumer === 'function') {
        try {
          const resolved = (cached.variable as any).resolveForConsumer(consumerNode);
          if (!resolved || resolved.value === undefined || resolved.value === null) {
            return { variable: cached.variable, isMissing: true, isForeign: false, name: cached.name };
          }
        } catch (e) {
          return { variable: cached.variable, isMissing: true, isForeign: false, name: cached.name };
        }
      }
      return cached;
    }
    try {
      let variable: Variable | null = null;
      try {
        variable = await figma.variables.getVariableByIdAsync(varId);
      } catch (e) {
        variable = null;
      }
      if (!variable) {
        const res: VariableAuditStatus = { variable: null, isMissing: true, isForeign: false, name: `Missing Variable (${varId})` };
        varStatusCache.set(varId, res);
        return res;
      }

      const collection = await getCollectionCached(variable.variableCollectionId);
      if (!collection) {
        if ((variable as any).remote) {
          const res: VariableAuditStatus = {
            variable,
            isMissing: false,
            isForeign: true,
            foreignSource: 'remote-unlinked',
            collectionName: 'Unpublished / External File',
            libraryName: 'Unpublished / Unlinked File',
            name: variable.name,
          };
          varStatusCache.set(varId, res);
          return res;
        }
        const res: VariableAuditStatus = { variable, isMissing: true, isForeign: false, name: variable.name };
        varStatusCache.set(varId, res);
        return res;
      }

      const isRemoteOrigin = Boolean(
        collection.remote ||
        (variable as any).remote ||
        !localCollectionIds.has(collection.id)
      );
      const isSubscribedRemote = Boolean(
        isRemoteOrigin &&
        collection.remote &&
        availableLibraryCollectionKeys &&
        collection.key &&
        availableLibraryCollectionKeys.has(collection.key)
      );
      const isUnlinkedRemote = isRemoteOrigin && !isSubscribedRemote;
      const isPrivateUnderscoreCollection = (collection.name || '').trim().startsWith('_');
      const isTrustedPrivateRemoteCollection =
        isUnlinkedRemote && isPrivateUnderscoreCollection && hasTrustedRemoteLibrary;

      if (isUnlinkedRemote && !isTrustedPrivateRemoteCollection) {
        const collectionName = collection.name || 'External Collection';
        const res: VariableAuditStatus = {
          variable,
          isMissing: false,
          isForeign: true,
          foreignSource: 'remote-unlinked',
          collectionName,
          libraryName: 'Unpublished / Unlinked File',
          name: variable.name,
        };
        varStatusCache.set(varId, res);
        return res;
      }

      if (collection && collection.variableIds && Array.isArray(collection.variableIds) && !collection.variableIds.includes(variable.id)) {
        const res: VariableAuditStatus = { variable, isMissing: true, isForeign: false, name: variable.name };
        varStatusCache.set(varId, res);
        return res;
      }

      let isForeign = false;
      let foreignSource: 'remote' | 'remote-unlinked' | 'local-other' | undefined;
      let foreignLibraryKey: string | undefined;
      let collectionName = collection.name || undefined;
      let libraryName: string | undefined;

      if (isTrustedPrivateRemoteCollection) {
        isForeign = false;
      } else if (isRemoteOrigin) {
        foreignSource = 'remote';
        const libMeta = collection.key ? libraryInfoByKey.get(collection.key) : undefined;
        libraryName = libMeta?.libraryName || 'External Library';
        collectionName = collection.name || libMeta?.name || 'Remote Collection';
        foreignLibraryKey = `remote:${(libraryName || collectionName || 'External Library').trim()}`;
        isForeign = !trustedLibraryKeys.has(foreignLibraryKey);
      } else if (allowedLocalCollectionIds.size > 0 && !allowedLocalCollectionIds.has(collection.id)) {
        foreignSource = 'local-other';
        collectionName = collection.name || 'Other Collection';
        foreignLibraryKey = `local:${collectionName.trim()}`;
        isForeign = !trustedLibraryKeys.has(foreignLibraryKey);
      }

      if (consumerNode && typeof (variable as any).resolveForConsumer === 'function') {
        try {
          const resolved = (variable as any).resolveForConsumer(consumerNode);
          if (!resolved || resolved.value === undefined || resolved.value === null) {
            const res: VariableAuditStatus = { variable, isMissing: true, isForeign: false, name: variable.name };
            varStatusCache.set(varId, res);
            return res;
          }
        } catch (e) {
          const res: VariableAuditStatus = { variable, isMissing: true, isForeign: false, name: variable.name };
          varStatusCache.set(varId, res);
          return res;
        }
      }

      const { isMissing } = await resolveVariableValueAndStatus(variable);
      const res: VariableAuditStatus = {
        variable,
        isMissing,
        isForeign: isMissing ? false : isForeign,
        foreignSource: isMissing ? undefined : foreignSource,
        foreignLibraryKey: isMissing ? undefined : foreignLibraryKey,
        collectionName,
        libraryName,
        name: variable.name,
      };
      varStatusCache.set(varId, res);
      return res;
    } catch (err) {
      const res: VariableAuditStatus = { variable: null, isMissing: true, isForeign: false, name: `Missing (${varId})` };
      varStatusCache.set(varId, res);
      return res;
    }
  }

  async function isAllowedCandidateVariable(variable: Variable): Promise<boolean> {
    if (!variable || !variable.variableCollectionId) return false;
    const collection = await getCollectionCached(variable.variableCollectionId);
    if (!collection) return false;
    const isRemoteOrigin = Boolean(
      collection.remote ||
      (variable as any).remote ||
      !localCollectionIds.has(collection.id)
    );
    if (isRemoteOrigin) {
      if (!collection.remote || !availableLibraryCollectionKeys || !collection.key || !availableLibraryCollectionKeys.has(collection.key)) {
        return false;
      }
      const libMeta = libraryInfoByKey.get(collection.key);
      const libraryName = libMeta?.libraryName || 'External Library';
      const collectionName = collection.name || libMeta?.name || 'Remote Collection';
      const key = `remote:${(libraryName || collectionName || 'External Library').trim()}`;
      return trustedLibraryKeys.has(key);
    }
    if (allowedLocalCollectionIds.size === 0 || allowedLocalCollectionIds.has(collection.id)) {
      return true;
    }
    const localKey = `local:${(collection.name || 'Other Collection').trim()}`;
    return trustedLibraryKeys.has(localKey);
  }

  return {
    trustedLibraries,
    trustedLibraryKeys,
    localCollectionIds,
    allowedLocalCollectionIds,
    libraryInfoByKey,
    checkVariableStatus,
    isAllowedCandidateVariable,
  };
}

const APPLE_LIBRARY_NAME_REGEX = /\b(?:apple(?:\s+design(?:\s+resources)?)?|ios(?:\s*(?:and|&|\+)\s*ipados)?\s*\d+|ipados\s*\d+|macos\s*\d+|watchos\s*\d+|visionos\s*\d+|tvos\s*\d+)\b/i;
const APPLE_DOC_URL_REGEX = /(?:developer\.apple\.com|apple\.com\/design|\bapple\s+design\s+resources\b|\bios\s+and\s+ipados\b)/i;
const APPLE_EXPLICIT_COMPONENT_NAME_REGEX = /^(?:status\s*bar\s*[-–/]\s*(?:iphone|ipad)|iphone\s*[-–/]\s*status\s*bar|dynamic\s*island|home\s*indicator(?:\s*[-–/]\s*(?:iphone|ipad))?|tab\s*bar\s*[-–/]\s*(?:iphone|ipad)|navigation\s*bar\s*[-–/]\s*(?:iphone|ipad)|keyboard\s*[-–/]\s*(?:iphone|ipad)|bezel\s*[-–/]\s*(?:iphone|ipad)|iphone\s*\d{2}\b)/i;
const APPLE_SYSTEM_STYLE_PREFIX_REGEX = /^(?:labels|fills|separators|backgrounds|system\s+colors|vibrancy|materials|ios|apple)\s*\//i;

export interface AppleDetectionCaches {
  instanceCache: Map<string, boolean>;
  subtreeCache: Map<string, boolean>;
  varLibCache: Map<string, boolean>;
}

export function createAppleDetectionCaches(): AppleDetectionCaches {
  return {
    instanceCache: new Map<string, boolean>(),
    subtreeCache: new Map<string, boolean>(),
    varLibCache: new Map<string, boolean>(),
  };
}

async function isAppleBoundVariableId(
  varId: string,
  libraryInfoByKey?: Map<string, LibraryCollectionInfo>,
  varLibCache?: Map<string, boolean>
): Promise<boolean> {
  if (!varId) return false;
  if (varLibCache?.has(varId)) return varLibCache.get(varId)!;

  let matched = false;
  try {
    const variable = await figma.variables.getVariableByIdAsync(varId);
    if (variable?.variableCollectionId) {
      const col = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      if (col) {
        const libInfo = libraryInfoByKey?.get(col.key);
        const candidates = [libInfo?.libraryName, libInfo?.name, col.name].filter(Boolean) as string[];
        if (candidates.some((name) => APPLE_LIBRARY_NAME_REGEX.test(name))) {
          matched = true;
        }
      }
    }
  } catch (e) {}

  varLibCache?.set(varId, matched);
  return matched;
}

async function hasAppleLibrarySignalsOnNodeTree(
  root: SceneNode,
  libraryInfoByKey?: Map<string, LibraryCollectionInfo>,
  caches?: AppleDetectionCaches,
  depth = 0
): Promise<boolean> {
  if (!root || depth > 2) return false;

  const aliases = extractVariableAliases((root as any).boundVariables);
  for (const aliasId of aliases) {
    if (await isAppleBoundVariableId(aliasId, libraryInfoByKey, caches?.varLibCache)) {
      return true;
    }
  }

  for (const styleProp of ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId']) {
    const sid = (root as any)[styleProp];
    if (typeof sid === 'string' && sid.length > 0) {
      try {
        const style = await figma.getStyleByIdAsync(sid);
        if (style) {
          if (APPLE_LIBRARY_NAME_REGEX.test(style.name || '')) return true;
          if ((style as any).remote && APPLE_SYSTEM_STYLE_PREFIX_REGEX.test(style.name || '')) return true;
        }
      } catch (e) {}
    }
  }

  if ('children' in root && Array.isArray((root as any).children) && depth < 2) {
    // Check a bounded subset of immediate descendants so deep instances resolve quickly
    const children = (root as any).children as readonly SceneNode[];
    const limit = Math.min(children.length, 16);
    for (let i = 0; i < limit; i++) {
      if (await hasAppleLibrarySignalsOnNodeTree(children[i], libraryInfoByKey, caches, depth + 1)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether an INSTANCE node originates from official Apple UI kits
 * (e.g., "iOS and iPadOS 27", iOS/iPadOS/macOS/watchOS/visionOS Design Resources).
 */
export async function isOfficialAppleInstance(
  node: SceneNode,
  libraryInfoByKey?: Map<string, LibraryCollectionInfo>,
  caches?: AppleDetectionCaches
): Promise<boolean> {
  if (!node || node.type !== 'INSTANCE') return false;
  if (caches?.instanceCache.has(node.id)) {
    return caches.instanceCache.get(node.id)!;
  }

  let isApple = false;
  try {
    const inst = node as InstanceNode;
    let comp: ComponentNode | null = null;
    try {
      comp = typeof inst.getMainComponentAsync === 'function'
        ? await inst.getMainComponentAsync()
        : inst.mainComponent;
    } catch (e) {
      comp = inst.mainComponent;
    }

    const parentSet = comp?.parent && comp.parent.type === 'COMPONENT_SET'
      ? (comp.parent as ComponentSetNode)
      : null;

    const textSignals = [
      inst.name || '',
      comp?.name || '',
      parentSet?.name || '',
      comp?.description || '',
      parentSet?.description || '',
    ];

    const docLinks: any[] = [
      ...(((comp as any)?.documentationLinks as any[]) || []),
      ...(((parentSet as any)?.documentationLinks as any[]) || []),
    ];
    for (const link of docLinks) {
      if (link?.uri && APPLE_DOC_URL_REGEX.test(String(link.uri))) {
        isApple = true;
        break;
      }
    }

    if (!isApple) {
      if (textSignals.some((t) => APPLE_LIBRARY_NAME_REGEX.test(t) || APPLE_DOC_URL_REGEX.test(t))) {
        isApple = true;
      } else if (
        APPLE_EXPLICIT_COMPONENT_NAME_REGEX.test(inst.name || '') ||
        APPLE_EXPLICIT_COMPONENT_NAME_REGEX.test(comp?.name || '') ||
        APPLE_EXPLICIT_COMPONENT_NAME_REGEX.test(parentSet?.name || '')
      ) {
        isApple = true;
      }
    }

    if (!isApple && (!comp || comp.remote || parentSet?.remote)) {
      isApple = await hasAppleLibrarySignalsOnNodeTree(inst, libraryInfoByKey, caches, 0);
    }
  } catch (e) {
    isApple = false;
  }

  caches?.instanceCache.set(node.id, isApple);
  return isApple;
}

/**
 * Checks whether a node is an official Apple UI Kit instance or resides inside one.
 */
export async function isInsideOfficialAppleSubtree(
  node: SceneNode,
  libraryInfoByKey?: Map<string, LibraryCollectionInfo>,
  caches?: AppleDetectionCaches
): Promise<boolean> {
  if (!node) return false;
  if (caches?.subtreeCache.has(node.id)) {
    return caches.subtreeCache.get(node.id)!;
  }

  let curr: BaseNode | null = node;
  while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
    if (curr.type === 'INSTANCE') {
      if (await isOfficialAppleInstance(curr as SceneNode, libraryInfoByKey, caches)) {
        caches?.subtreeCache.set(node.id, true);
        return true;
      }
    }
    curr = curr.parent;
  }

  caches?.subtreeCache.set(node.id, false);
  return false;
}

export async function runAuditTokens(scope: 'selection' | 'page' = 'selection') {
  try {
    const trustedLibraries = getTrustedAuditLibraries();

    let targetRoots: readonly SceneNode[] = [];
    if (scope === 'selection') {
      targetRoots = figma.currentPage.selection || [];
      if (targetRoots.length === 0) {
        figma.ui.postMessage({
          type: 'audit-results',
          scope: 'selection',
          summary: {
            totalIssues: 0,
            unboundCount: 0,
            missingCount: 0,
            foreignCount: 0,
            gapCount: 0,
            paddingCount: 0,
            radiusCount: 0,
            colorCount: 0,
            strokeCount: 0,
            scannedNodesCount: 0,
            scope: 'selection',
          },
          issues: [],
          trustedLibraries,
          emptyReason: 'no-selection',
        });
        return;
      }
    } else {
      targetRoots = figma.currentPage.children || [];
    }

    const allNodes: SceneNode[] = [];
    const visitedIds = new Set<string>();
    const remoteInstanceCache = new Map<string, boolean>();

    async function isRemoteInstance(node: SceneNode): Promise<boolean> {
      if (node.type !== 'INSTANCE') return false;
      if (remoteInstanceCache.has(node.id)) {
        return remoteInstanceCache.get(node.id)!;
      }
      const inst = node as InstanceNode;
      try {
        let comp: ComponentNode | null = null;
        if ('getMainComponentAsync' in inst && typeof (inst as any).getMainComponentAsync === 'function') {
          try {
            comp = await (inst as any).getMainComponentAsync();
          } catch (e) {
            comp = inst.mainComponent;
          }
        } else {
          comp = inst.mainComponent;
        }

        if (!comp) {
          remoteInstanceCache.set(node.id, true);
          return true;
        }

        const isRemote = !!comp.remote || (comp.parent && comp.parent.type === 'COMPONENT_SET' && !!(comp.parent as ComponentSetNode).remote);
        remoteInstanceCache.set(node.id, isRemote);
        return isRemote;
      } catch (e) {
        try {
          const isRemote = !!(inst.mainComponent && inst.mainComponent.remote);
          remoteInstanceCache.set(node.id, isRemote);
          return isRemote;
        } catch (err) {
          remoteInstanceCache.set(node.id, false);
          return false;
        }
      }
    }

    const remoteSubtreeCache = new Map<string, boolean>();

    async function isInsideRemoteSubtree(node: SceneNode): Promise<boolean> {
      if (!node) return false;
      if (remoteSubtreeCache.has(node.id)) {
        return remoteSubtreeCache.get(node.id)!;
      }
      let curr: BaseNode | null = node.parent;
      while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
        if (curr.type === 'INSTANCE') {
          if (await isRemoteInstance(curr as SceneNode)) {
            remoteSubtreeCache.set(node.id, true);
            return true;
          }
        }
        curr = curr.parent;
      }
      remoteSubtreeCache.set(node.id, false);
      return false;
    }

    const remoteSubtreeNodeIds = new Set<string>();

    async function collectNodes(nodes: readonly SceneNode[] | null | undefined, inRemoteSubtree = false) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || visitedIds.has(node.id)) continue;
        visitedIds.add(node.id);

        const nodeInRemoteSubtree = inRemoteSubtree || await isRemoteInstance(node) || await isInsideRemoteSubtree(node);
        if (nodeInRemoteSubtree) {
          remoteSubtreeNodeIds.add(node.id);
        }

        allNodes.push(node);
        if ('children' in node && (node as any).children && (node as any).children.length > 0) {
          try {
            await collectNodes((node as any).children, nodeInRemoteSubtree);
          } catch (e) {}
        }
      }
    }

    await collectNodes(targetRoots);

    const { checkVariableStatus, libraryInfoByKey } = await createAuditVariableContext(allNodes);
    const appleSubtreeNodeIds = new Set<string>();
    const appleCaches = createAppleDetectionCaches();
    for (const node of allNodes) {
      if (await isInsideOfficialAppleSubtree(node, libraryInfoByKey, appleCaches)) {
        appleSubtreeNodeIds.add(node.id);
      }
    }

    function getNodeBoundVariables(node: SceneNode): Record<string, any> {
      try {
        const directBound = ('boundVariables' in node && (node as any).boundVariables) ? (node as any).boundVariables : {};
        if (node.type === 'INSTANCE') {
          try {
            const main = (node as InstanceNode).mainComponent;
            if (main && 'boundVariables' in main && (main as any).boundVariables) {
              return { ...(main as any).boundVariables, ...directBound };
            }
          } catch (e) {}
        }
        return directBound;
      } catch (e) {
        return {};
      }
    }

    const issues: AuditIssue[] = [];
    let issueCounter = 0;
    const reportedBindingsOnNode = new Set<string>();
    const markReported = (nodeId: string, key: string): boolean => {
      const k = `${nodeId}:${key}`;
      if (reportedBindingsOnNode.has(k)) return true;
      reportedBindingsOnNode.add(k);
      return false;
    };

    const reportBoundVariableIssue = (
      vStatus: VariableAuditStatus,
      opts: {
        nodeId: string;
        nodeName: string;
        layerType: string;
        layerTypeName: string;
        category: 'gap' | 'padding' | 'radius' | 'color' | 'stroke';
        categoryLabel: string;
        property: string;
        propertyLabel: string;
        value: number | string;
        varId: string;
        missingSuggestion: string;
        styleName?: string;
      }
    ): boolean => {
      if (appleSubtreeNodeIds.has(opts.nodeId) && opts.category === 'color') return false;
      if (!vStatus.isMissing && !vStatus.isForeign) return false;
      if (markReported(opts.nodeId, `var:${opts.varId}`)) return false;

      if (vStatus.isMissing) {
        issues.push({
          id: `issue_${++issueCounter}`,
          nodeId: opts.nodeId,
          nodeName: opts.nodeName,
          layerType: opts.layerType,
          layerTypeName: opts.layerTypeName,
          category: opts.category,
          categoryLabel: opts.categoryLabel,
          property: opts.property,
          propertyLabel: opts.propertyLabel,
          issueType: 'missing',
          value: opts.value,
          formattedValue: opts.styleName
            ? `Missing Variable (${vStatus.name}) in "${opts.styleName}"`
            : `Missing Variable (${vStatus.name})`,
          varId: opts.varId,
          varName: vStatus.name,
          suggestion: opts.missingSuggestion,
        });
        return true;
      }

      const sourceLabel =
        vStatus.foreignSource === 'remote-unlinked'
          ? `Unpublished / Unlinked${vStatus.collectionName ? ` · ${vStatus.collectionName}` : ''}`
          : vStatus.foreignSource === 'remote'
          ? `${vStatus.libraryName || 'External Library'}${vStatus.collectionName ? ` · ${vStatus.collectionName}` : ''}`
          : `Local: ${vStatus.collectionName || 'Other Collection'}`;

      issues.push({
        id: `issue_${++issueCounter}`,
        nodeId: opts.nodeId,
        nodeName: opts.nodeName,
        layerType: opts.layerType,
        layerTypeName: opts.layerTypeName,
        category: opts.category,
        categoryLabel: opts.categoryLabel,
        property: opts.property,
        propertyLabel: opts.propertyLabel,
        issueType: 'foreign',
        value: opts.value,
        formattedValue: opts.styleName
          ? `${vStatus.name} [${sourceLabel}] in "${opts.styleName}"`
          : `${vStatus.name} [${sourceLabel}]`,
        varId: opts.varId,
        varName: vStatus.name,
        foreignSource: vStatus.foreignSource,
        foreignLibraryKey: vStatus.foreignLibraryKey,
        collectionName: vStatus.collectionName,
        libraryName: vStatus.libraryName,
        suggestion:
          vStatus.foreignSource === 'remote-unlinked'
            ? `Variable from unpublished or unlinked file ("${vStatus.collectionName || 'External File'}") — replace with a local Design System token`
            : vStatus.foreignSource === 'remote'
            ? `External library variable ("${vStatus.libraryName || vStatus.collectionName}") — replace with a local Design System token`
            : `Variable from another local collection ("${vStatus.collectionName}") — replace with a token from the active Design System`,
      });
      return true;
    };

    const nodeIgnoredMap = new Map<string, Set<string>>();

    for (const node of allNodes) {
      try {
        if (!node || (node.type as string) === 'PAGE' || (node.type as string) === 'DOCUMENT') continue;

        const isAppleNode = appleSubtreeNodeIds.has(node.id);
        nodeIgnoredMap.set(node.id, getNodeIgnoredAuditKeys(node));

        const boundVars = getNodeBoundVariables(node);
        const nodeType = node.type;
        const layerTypeName = getLayerTypeDisplayName(nodeType);
        const nodeName = node.name || 'Unnamed Layer';

        // 1. GAP CHECK (itemSpacing & counterAxisSpacing)
        if (node.type !== 'COMPONENT_SET' && 'layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
          const frame = node as FrameNode;
          const isAutoGap = frame.primaryAxisAlignItems === 'SPACE_BETWEEN';

          if (!isAutoGap) {
            const itemSpacing = typeof frame.itemSpacing === 'number' ? frame.itemSpacing : 0;
            const gapBinding = boundVars.itemSpacing;

            if (gapBinding && gapBinding.type === 'VARIABLE_ALIAS' && gapBinding.id) {
              const vStatus = await checkVariableStatus(gapBinding.id, node);
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: 'gap',
                categoryLabel: 'Gap',
                property: 'itemSpacing',
                propertyLabel: 'Gap',
                value: itemSpacing,
                varId: gapBinding.id,
                missingSuggestion: 'Reassign to a valid Spacing variable',
              });
            } else {
              const tokenMatch = dsRegistry.matchSpacing(itemSpacing);
              const isArbitrary = tokenMatch.startsWith('[');
              issues.push({
                id: `issue_${++issueCounter}`,
                nodeId: node.id,
                nodeName: nodeName,
                layerType: nodeType,
                layerTypeName: layerTypeName,
                category: 'gap',
                categoryLabel: 'Gap',
                property: 'itemSpacing',
                propertyLabel: 'Gap',
                issueType: 'unbound',
                value: itemSpacing,
                formattedValue: `${itemSpacing}px`,
                suggestion: isArbitrary ? 'Arbitrary value — bind to Spacing variable' : `Matches token: ${tokenMatch} (${itemSpacing}px)`,
              });
            }
          }

          const isAutoCounterGap = (frame as any).counterAxisAlignContent === 'SPACE_BETWEEN';
          if (!isAutoCounterGap && 'layoutWrap' in frame && frame.layoutWrap === 'WRAP' && typeof frame.counterAxisSpacing === 'number') {
            const counterSpacing = frame.counterAxisSpacing;
            const counterBinding = boundVars.counterAxisSpacing;
            if (counterBinding && counterBinding.type === 'VARIABLE_ALIAS' && counterBinding.id) {
              const vStatus = await checkVariableStatus(counterBinding.id, node);
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: 'gap',
                categoryLabel: 'Gap',
                property: 'counterAxisSpacing',
                propertyLabel: 'Counter Gap',
                value: counterSpacing,
                varId: counterBinding.id,
                missingSuggestion: 'Reassign to a valid Spacing variable',
              });
            } else {
              const tokenMatch = dsRegistry.matchSpacing(counterSpacing);
              const isArbitrary = tokenMatch.startsWith('[');
              issues.push({
                id: `issue_${++issueCounter}`,
                nodeId: node.id,
                nodeName: nodeName,
                layerType: nodeType,
                layerTypeName: layerTypeName,
                category: 'gap',
                categoryLabel: 'Gap',
                property: 'counterAxisSpacing',
                propertyLabel: 'Counter Gap',
                issueType: 'unbound',
                value: counterSpacing,
                formattedValue: `${counterSpacing}px`,
                suggestion: isArbitrary ? 'Arbitrary value — bind to Spacing variable' : `Matches token: ${tokenMatch} (${counterSpacing}px)`,
              });
            }
          }
        }

        // 2. PADDING CHECK (paddingTop, paddingBottom, paddingLeft, paddingRight)
        if (node.type !== 'COMPONENT_SET' && 'layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
          const frame = node as FrameNode;
          const paddingProps: Array<{ key: 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight'; label: string; val: number }> = [
            { key: 'paddingTop', label: 'Padding Top', val: typeof frame.paddingTop === 'number' ? frame.paddingTop : 0 },
            { key: 'paddingBottom', label: 'Padding Bottom', val: typeof frame.paddingBottom === 'number' ? frame.paddingBottom : 0 },
            { key: 'paddingLeft', label: 'Padding Left', val: typeof frame.paddingLeft === 'number' ? frame.paddingLeft : 0 },
            { key: 'paddingRight', label: 'Padding Right', val: typeof frame.paddingRight === 'number' ? frame.paddingRight : 0 },
          ];

          for (const p of paddingProps) {
            const binding = boundVars[p.key];
            if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
              const vStatus = await checkVariableStatus(binding.id, node);
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: 'padding',
                categoryLabel: 'Padding',
                property: p.key,
                propertyLabel: p.label,
                value: p.val,
                varId: binding.id,
                missingSuggestion: 'Reassign to a valid Spacing variable',
              });
            } else {
              const tokenMatch = dsRegistry.matchSpacing(p.val);
              const isArbitrary = tokenMatch.startsWith('[');
              issues.push({
                id: `issue_${++issueCounter}`,
                nodeId: node.id,
                nodeName: nodeName,
                layerType: nodeType,
                layerTypeName: layerTypeName,
                category: 'padding',
                categoryLabel: 'Padding',
                property: p.key,
                propertyLabel: p.label,
                issueType: 'unbound',
                value: p.val,
                formattedValue: `${p.val}px`,
                suggestion: isArbitrary ? 'Arbitrary value — bind to Spacing variable' : `Matches token: ${tokenMatch} (${p.val}px)`,
              });
            }
          }
        }

        // 3. RADIUS CHECK (cornerRadius & individual corners)
        // Skip ELLIPSE shapes: in Figma, circle/ellipse shapes have disabled corner radius in the UI and cannot be bound to variables
        const isEllipseShape = node.type === 'ELLIPSE' || 'arcData' in node;
        if (node.type !== 'COMPONENT_SET' && !isEllipseShape && 'cornerRadius' in node) {
          const cornerRadius = (node as any).cornerRadius;

          if (cornerRadius === figma.mixed && 'topLeftRadius' in node) {
            const corners: Array<{ key: string; label: string; val: number }> = [
              { key: 'topLeftRadius', label: 'Top-Left Radius', val: typeof (node as any).topLeftRadius === 'number' ? (node as any).topLeftRadius : 0 },
              { key: 'topRightRadius', label: 'Top-Right Radius', val: typeof (node as any).topRightRadius === 'number' ? (node as any).topRightRadius : 0 },
              { key: 'bottomLeftRadius', label: 'Bottom-Left Radius', val: typeof (node as any).bottomLeftRadius === 'number' ? (node as any).bottomLeftRadius : 0 },
              { key: 'bottomRightRadius', label: 'Bottom-Right Radius', val: typeof (node as any).bottomRightRadius === 'number' ? (node as any).bottomRightRadius : 0 },
            ];

            for (const c of corners) {
              const binding = boundVars[c.key];
              if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
                const vStatus = await checkVariableStatus(binding.id, node);
                reportBoundVariableIssue(vStatus, {
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: 'radius',
                  categoryLabel: 'Radius',
                  property: c.key,
                  propertyLabel: c.label,
                  value: c.val,
                  varId: binding.id,
                  missingSuggestion: 'Reassign to a valid Radius variable',
                });
              } else {
                const tokenMatch = dsRegistry.matchRadius(c.val);
                const isArbitrary = tokenMatch.startsWith('[');
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName: nodeName,
                  layerType: nodeType,
                  layerTypeName: layerTypeName,
                  category: 'radius',
                  categoryLabel: 'Radius',
                  property: c.key,
                  propertyLabel: c.label,
                  issueType: 'unbound',
                  value: c.val,
                  formattedValue: `${c.val}px`,
                  suggestion: isArbitrary ? 'Arbitrary value — bind to Radius variable' : `Matches token: ${tokenMatch} (${c.val}px)`,
                });
              }
            }
          } else if (typeof cornerRadius === 'number') {
            const binding = boundVars.cornerRadius;
            const indBindings = [boundVars.topLeftRadius, boundVars.topRightRadius, boundVars.bottomLeftRadius, boundVars.bottomRightRadius].filter(Boolean);

            if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
              const vStatus = await checkVariableStatus(binding.id, node);
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: 'radius',
                categoryLabel: 'Radius',
                property: 'cornerRadius',
                propertyLabel: 'Corner Radius',
                value: cornerRadius,
                varId: binding.id,
                missingSuggestion: 'Reassign to a valid Radius variable',
              });
            } else if (indBindings.length > 0) {
              for (const indBinding of indBindings) {
                if (indBinding.type === 'VARIABLE_ALIAS' && indBinding.id) {
                  const vStatus = await checkVariableStatus(indBinding.id, node);
                  if (
                    reportBoundVariableIssue(vStatus, {
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: 'radius',
                      categoryLabel: 'Radius',
                      property: 'cornerRadius',
                      propertyLabel: 'Corner Radius',
                      value: cornerRadius,
                      varId: indBinding.id,
                      missingSuggestion: 'Reassign to a valid Radius variable',
                    })
                  ) {
                    break;
                  }
                }
              }
            } else {
              const tokenMatch = dsRegistry.matchRadius(cornerRadius);
              const isArbitrary = tokenMatch.startsWith('[');
              issues.push({
                id: `issue_${++issueCounter}`,
                nodeId: node.id,
                nodeName: nodeName,
                layerType: nodeType,
                layerTypeName: layerTypeName,
                category: 'radius',
                categoryLabel: 'Radius',
                property: 'cornerRadius',
                propertyLabel: 'Corner Radius',
                issueType: 'unbound',
                value: cornerRadius,
                formattedValue: `${cornerRadius}px`,
                suggestion: isArbitrary ? 'Arbitrary value — bind to Radius variable' : `Matches token: ${tokenMatch} (${cornerRadius}px)`,
              });
            }
          }
        }

        // 3b. STROKE WEIGHT CHECK
        const hasVisibleStrokes = 'strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.some((p: any) => p && p.visible !== false);
        if (hasVisibleStrokes && 'strokeWeight' in node) {
          const sw = (node as any).strokeWeight;
          if (sw === figma.mixed) {
            const sideConfigs = [
              { key: 'strokeTopWeight', label: 'Stroke Top Weight', val: (node as any).strokeTopWeight },
              { key: 'strokeRightWeight', label: 'Stroke Right Weight', val: (node as any).strokeRightWeight },
              { key: 'strokeBottomWeight', label: 'Stroke Bottom Weight', val: (node as any).strokeBottomWeight },
              { key: 'strokeLeftWeight', label: 'Stroke Left Weight', val: (node as any).strokeLeftWeight },
            ];

            for (const s of sideConfigs) {
              if (typeof s.val === 'number' && s.val > 0) {
                const binding = boundVars[s.key] || boundVars.strokeWeight;
                if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
                  const vStatus = await checkVariableStatus(binding.id, node);
                  reportBoundVariableIssue(vStatus, {
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: 'stroke',
                    categoryLabel: 'Stroke',
                    property: s.key,
                    propertyLabel: s.label,
                    value: s.val,
                    varId: binding.id,
                    missingSuggestion: 'Reassign to a valid Stroke variable',
                  });
                } else {
                  const tokenMatch = dsRegistry.matchStroke(s.val);
                  const isArbitrary = tokenMatch.startsWith('[');
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'stroke',
                    categoryLabel: 'Stroke',
                    property: s.key,
                    propertyLabel: s.label,
                    issueType: 'unbound',
                    value: s.val,
                    formattedValue: `${s.val}px`,
                    suggestion: isArbitrary
                      ? 'Arbitrary stroke weight — bind to Stroke variable'
                      : `Matches token: ${tokenMatch} (${s.val}px)`,
                  });
                }
              }
            }
          } else if (typeof sw === 'number' && sw > 0) {
            const binding = boundVars.strokeWeight;
            const indBindings = [boundVars.strokeTopWeight, boundVars.strokeRightWeight, boundVars.strokeBottomWeight, boundVars.strokeLeftWeight].filter(Boolean);

            if (binding && binding.type === 'VARIABLE_ALIAS' && binding.id) {
              const vStatus = await checkVariableStatus(binding.id, node);
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: 'stroke',
                categoryLabel: 'Stroke',
                property: 'strokeWeight',
                propertyLabel: 'Stroke Weight',
                value: sw,
                varId: binding.id,
                missingSuggestion: 'Reassign to a valid Stroke variable',
              });
            } else if (indBindings.length > 0) {
              for (const indBinding of indBindings) {
                if (indBinding.type === 'VARIABLE_ALIAS' && indBinding.id) {
                  const vStatus = await checkVariableStatus(indBinding.id, node);
                  if (
                    reportBoundVariableIssue(vStatus, {
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: 'stroke',
                      categoryLabel: 'Stroke',
                      property: 'strokeWeight',
                      propertyLabel: 'Stroke Weight',
                      value: sw,
                      varId: indBinding.id,
                      missingSuggestion: 'Reassign to a valid Stroke variable',
                    })
                  ) {
                    break;
                  }
                }
              }
            } else {
              const tokenMatch = dsRegistry.matchStroke(sw);
              const isArbitrary = tokenMatch.startsWith('[');
              issues.push({
                id: `issue_${++issueCounter}`,
                nodeId: node.id,
                nodeName: nodeName,
                layerType: nodeType,
                layerTypeName: layerTypeName,
                category: 'stroke',
                categoryLabel: 'Stroke',
                property: 'strokeWeight',
                propertyLabel: 'Stroke Weight',
                issueType: 'unbound',
                value: sw,
                formattedValue: `${sw}px`,
                suggestion: isArbitrary
                  ? 'Arbitrary stroke weight — bind to Stroke variable'
                  : `Matches token: ${tokenMatch} (${sw}px)`,
              });
            }
          }
        }

        // 4. COLOR CHECK (Fills, Strokes, Styles & Effects)
        if (node.type !== 'COMPONENT_SET') {
          if (!isAppleNode) {
          // 4a. FILL STYLE CHECK
          if (typeof (node as any).fillStyleId === 'string' && (node as any).fillStyleId.length > 0) {
            const styleId = (node as any).fillStyleId;
            try {
              const style = await figma.getStyleByIdAsync(styleId);
              if (!style) {
                if (!markReported(node.id, `style:${styleId}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'fills',
                    propertyLabel: 'Fill Style',
                    issueType: 'missing',
                    value: '#888888',
                    formattedValue: `Missing Style (${styleId})`,
                    suggestion: 'Reassign to a valid Color Style or Variable',
                  });
                }
              } else if (style.type === 'PAINT') {
                const isGrad = isGradientColorStyle(style);
                if (!isGrad && !markReported(node.id, `style:${styleId}`)) {
                  let hex = '#888888';
                  let tokenMatch = '';
                  if ('paints' in style && Array.isArray((style as any).paints)) {
                    const solidPaint = (style as any).paints.find((p: any) => p && p.visible !== false && p.type === 'SOLID');
                    if (solidPaint) {
                      hex = rgbToHex(solidPaint.color.r, solidPaint.color.g, solidPaint.color.b);
                      tokenMatch = dsRegistry.matchColor(hex, node.type === 'TEXT', false);
                    }
                  }
                  const isArbitrary = !tokenMatch || tokenMatch.startsWith('[');
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'fills',
                    propertyLabel: 'Fill Style',
                    issueType: 'unbound',
                    value: hex,
                    formattedValue: `Style: ${style.name}`,
                    suggestion: isArbitrary
                      ? `Legacy Color Style "${style.name}" — bind directly to Color variable`
                      : `Legacy Color Style "${style.name}" — matches token: ${tokenMatch} (${hex})`,
                  });
                }

                if ('paints' in style && Array.isArray((style as any).paints)) {
                  for (const sp of (style as any).paints) {
                    const spBinding = (sp as any).boundVariables?.color;
                    if (spBinding && spBinding.type === 'VARIABLE_ALIAS' && spBinding.id) {
                      const vStatus = await checkVariableStatus(spBinding.id, node);
                      reportBoundVariableIssue(vStatus, {
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: 'color',
                        categoryLabel: 'Color',
                        property: 'fills',
                        propertyLabel: `Style "${style.name}"`,
                        value: sp.type === 'SOLID' ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : '#888888',
                        varId: spBinding.id,
                        missingSuggestion: 'Reassign to a valid Color variable',
                        styleName: style.name,
                      });
                    }
                  }
                }
              }
            } catch (e) {}
          }

          // 4b. DIRECT FILLS
          if ('fills' in node && Array.isArray((node as any).fills)) {
            const fills = (node as any).fills as readonly Paint[];
            const boundFills = (boundVars as any).fills;

            for (let i = 0; i < fills.length; i++) {
              const paint = fills[i];
              if (!paint || paint.visible === false) continue;
              const propLabel = fills.length > 1 ? `Fill (${i + 1})` : 'Fill';

              const boundFill = Array.isArray(boundFills)
                ? boundFills[i]
                : (boundFills && typeof boundFills === 'object' ? (boundFills[i] || boundFills[String(i)]) : undefined);
              const colorBinding = (paint as any).boundVariables?.color || boundFill;

              if (colorBinding && colorBinding.type === 'VARIABLE_ALIAS' && colorBinding.id) {
                const vStatus = await checkVariableStatus(colorBinding.id, node);
                const valHex = paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888';
                reportBoundVariableIssue(vStatus, {
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: 'color',
                  categoryLabel: 'Color',
                  property: 'fills',
                  propertyLabel: propLabel,
                  value: valHex,
                  varId: colorBinding.id,
                  missingSuggestion: 'Reassign to a valid Color variable',
                });
              } else if (paint.type === 'SOLID') {
                const hasStyle = typeof (node as any).fillStyleId === 'string' && (node as any).fillStyleId.length > 0;
                if (!hasStyle) {
                  const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                  const opacityStr = typeof paint.opacity === 'number' && paint.opacity < 1
                    ? ` (${Math.round(paint.opacity * 100)}%)`
                    : '';
                  const isText = node.type === 'TEXT';
                  const tokenMatch = dsRegistry.matchColor(hex, isText, false);
                  const isArbitrary = tokenMatch.startsWith('[');

                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'fills',
                    propertyLabel: propLabel,
                    issueType: 'unbound',
                    value: hex,
                    formattedValue: `${hex}${opacityStr}`,
                    suggestion: isArbitrary
                      ? 'Arbitrary color — bind to Color variable'
                      : `Matches token: ${tokenMatch} (${hex})`,
                  });
                }
              } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
                if (Array.isArray(paint.gradientStops)) {
                  for (let sIdx = 0; sIdx < paint.gradientStops.length; sIdx++) {
                    const stop = paint.gradientStops[sIdx];
                    const stopBinding = (stop as any).boundVariables?.color;
                    if (stopBinding && stopBinding.type === 'VARIABLE_ALIAS' && stopBinding.id) {
                      const vStatus = await checkVariableStatus(stopBinding.id, node);
                      reportBoundVariableIssue(vStatus, {
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: 'color',
                        categoryLabel: 'Color',
                        property: 'fills',
                        propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                        value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                        varId: stopBinding.id,
                        missingSuggestion: 'Reassign to a valid Color variable',
                      });
                    }
                  }
                }
              }

              // Check paint opacity variable
              const paintOpBinding = (paint as any).boundVariables?.opacity;
              if (paintOpBinding && paintOpBinding.type === 'VARIABLE_ALIAS' && paintOpBinding.id) {
                const vStatus = await checkVariableStatus(paintOpBinding.id, node);
                reportBoundVariableIssue(vStatus, {
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: 'color',
                  categoryLabel: 'Color',
                  property: 'fills',
                  propertyLabel: `${propLabel} Opacity`,
                  value: paint.opacity ?? 1,
                  varId: paintOpBinding.id,
                  missingSuggestion: 'Reassign to a valid Number variable',
                });
              }
            }
          } else if (node.type === 'TEXT' && (node as any).fills === figma.mixed) {
            try {
              const textNode = node as TextNode;
              const segments = textNode.getStyledTextSegments(['fills', 'boundVariables', 'fillStyleId']);
              for (let sIdx = 0; sIdx < segments.length; sIdx++) {
                const seg = segments[sIdx];
                if (Array.isArray(seg.fills)) {
                  for (let pIdx = 0; pIdx < seg.fills.length; pIdx++) {
                    const paint = seg.fills[pIdx];
                    if (!paint || paint.visible === false) continue;
                    const colorBinding = (paint as any).boundVariables?.color || (seg.boundVariables as any)?.fills?.[pIdx];
                    const segLabel = segments.length > 1 ? `Text Segment (${sIdx + 1})` : 'Text Fill';

                    if (colorBinding && colorBinding.type === 'VARIABLE_ALIAS' && colorBinding.id) {
                      const vStatus = await checkVariableStatus(colorBinding.id, node);
                      reportBoundVariableIssue(vStatus, {
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: 'color',
                        categoryLabel: 'Color',
                        property: 'fills',
                        propertyLabel: segLabel,
                        value: paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888',
                        varId: colorBinding.id,
                        missingSuggestion: 'Reassign to a valid Color variable',
                      });
                    } else if (paint.type === 'SOLID') {
                      const hasSegStyle = typeof (seg as any).fillStyleId === 'string' && (seg as any).fillStyleId.length > 0;
                      if (!hasSegStyle) {
                        const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                        const opacityStr = typeof paint.opacity === 'number' && paint.opacity < 1
                          ? ` (${Math.round(paint.opacity * 100)}%)`
                          : '';
                        const tokenMatch = dsRegistry.matchColor(hex, true, false);
                        const isArbitrary = tokenMatch.startsWith('[');

                        issues.push({
                          id: `issue_${++issueCounter}`,
                          nodeId: node.id,
                          nodeName: nodeName,
                          layerType: nodeType,
                          layerTypeName: layerTypeName,
                          category: 'color',
                          categoryLabel: 'Color',
                          property: 'fills',
                          propertyLabel: segLabel,
                          issueType: 'unbound',
                          value: hex,
                          formattedValue: `${hex}${opacityStr}`,
                          suggestion: isArbitrary
                            ? 'Arbitrary color — bind to Color variable'
                            : `Matches token: ${tokenMatch} (${hex})`,
                        });
                      } else {
                        const segStyleId = (seg as any).fillStyleId;
                        if (!markReported(node.id, `segstyle:${segStyleId}`)) {
                          try {
                            const segStyle = await figma.getStyleByIdAsync(segStyleId);
                            const styleName = segStyle ? segStyle.name : segStyleId;
                            const isGrad = isGradientColorStyle(segStyle);
                            if (!isGrad) {
                              const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                              const tokenMatch = dsRegistry.matchColor(hex, true, false);
                              const isArbitrary = tokenMatch.startsWith('[');
                              issues.push({
                                id: `issue_${++issueCounter}`,
                                nodeId: node.id,
                                nodeName: nodeName,
                                layerType: nodeType,
                                layerTypeName: layerTypeName,
                                category: 'color',
                                categoryLabel: 'Color',
                                property: 'fills',
                                propertyLabel: segLabel,
                                issueType: 'unbound',
                                value: hex,
                                formattedValue: `Style: ${styleName}`,
                                suggestion: isArbitrary
                                  ? `Legacy Color Style "${styleName}" — bind directly to Color variable`
                                  : `Legacy Color Style "${styleName}" — matches token: ${tokenMatch} (${hex})`,
                              });
                            }
                          } catch (e) {}
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {}
          }

          // 4c. STROKE STYLE CHECK
          if (typeof (node as any).strokeStyleId === 'string' && (node as any).strokeStyleId.length > 0) {
            const styleId = (node as any).strokeStyleId;
            try {
              const style = await figma.getStyleByIdAsync(styleId);
              if (!style) {
                if (!markReported(node.id, `style:${styleId}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'strokes',
                    propertyLabel: 'Stroke Style',
                    issueType: 'missing',
                    value: '#888888',
                    formattedValue: `Missing Style (${styleId})`,
                    suggestion: 'Reassign to a valid Color Style or Variable',
                  });
                }
              } else if (style.type === 'PAINT') {
                const isGrad = isGradientColorStyle(style);
                if (!isGrad && !markReported(node.id, `style:${styleId}`)) {
                  let hex = '#888888';
                  let tokenMatch = '';
                  if ('paints' in style && Array.isArray((style as any).paints)) {
                    const solidPaint = (style as any).paints.find((p: any) => p && p.visible !== false && p.type === 'SOLID');
                    if (solidPaint) {
                      hex = rgbToHex(solidPaint.color.r, solidPaint.color.g, solidPaint.color.b);
                      tokenMatch = dsRegistry.matchColor(hex, false, true);
                    }
                  }
                  const isArbitrary = !tokenMatch || tokenMatch.startsWith('[');
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'strokes',
                    propertyLabel: 'Stroke Style',
                    issueType: 'unbound',
                    value: hex,
                    formattedValue: `Style: ${style.name}`,
                    suggestion: isArbitrary
                      ? `Legacy Color Style "${style.name}" — bind directly to Color variable`
                      : `Legacy Color Style "${style.name}" — matches token: ${tokenMatch} (${hex})`,
                  });
                }

                if ('paints' in style && Array.isArray((style as any).paints)) {
                  for (const sp of (style as any).paints) {
                    const spBinding = (sp as any).boundVariables?.color;
                    if (spBinding && spBinding.type === 'VARIABLE_ALIAS' && spBinding.id) {
                      const vStatus = await checkVariableStatus(spBinding.id, node);
                      reportBoundVariableIssue(vStatus, {
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: 'color',
                        categoryLabel: 'Color',
                        property: 'strokes',
                        propertyLabel: `Style "${style.name}"`,
                        value: sp.type === 'SOLID' ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : '#888888',
                        varId: spBinding.id,
                        missingSuggestion: 'Reassign to a valid Color variable',
                        styleName: style.name,
                      });
                    }
                  }
                }
              }
            } catch (e) {}
          }

          // 4d. DIRECT STROKES
          if ('strokes' in node && Array.isArray((node as any).strokes)) {
            const hasStrokeWeight = typeof (node as any).strokeWeight === 'number' ? (node as any).strokeWeight > 0 : true;
            if (hasStrokeWeight) {
              const strokes = (node as any).strokes as readonly Paint[];
              const boundStrokes = (boundVars as any).strokes;

              for (let i = 0; i < strokes.length; i++) {
                const paint = strokes[i];
                if (!paint || paint.visible === false) continue;
                const propLabel = strokes.length > 1 ? `Stroke (${i + 1})` : 'Stroke';

                const boundStroke = Array.isArray(boundStrokes)
                  ? boundStrokes[i]
                  : (boundStrokes && typeof boundStrokes === 'object' ? (boundStrokes[i] || boundStrokes[String(i)]) : undefined);
                const colorBinding = (paint as any).boundVariables?.color || boundStroke;

                if (colorBinding && colorBinding.type === 'VARIABLE_ALIAS' && colorBinding.id) {
                  const vStatus = await checkVariableStatus(colorBinding.id, node);
                  const valHex = paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888';
                  reportBoundVariableIssue(vStatus, {
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'strokes',
                    propertyLabel: propLabel,
                    value: valHex,
                    varId: colorBinding.id,
                    missingSuggestion: 'Reassign to a valid Color variable',
                  });
                } else if (paint.type === 'SOLID') {
                  const hasStyle = typeof (node as any).strokeStyleId === 'string' && (node as any).strokeStyleId.length > 0;
                  if (!hasStyle) {
                    const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                    const opacityStr = typeof paint.opacity === 'number' && paint.opacity < 1
                      ? ` (${Math.round(paint.opacity * 100)}%)`
                      : '';
                    const tokenMatch = dsRegistry.matchColor(hex, false, true);
                    const isArbitrary = tokenMatch.startsWith('[');

                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName: nodeName,
                      layerType: nodeType,
                      layerTypeName: layerTypeName,
                      category: 'color',
                      categoryLabel: 'Color',
                      property: 'strokes',
                      propertyLabel: propLabel,
                      issueType: 'unbound',
                      value: hex,
                      formattedValue: `${hex}${opacityStr}`,
                      suggestion: isArbitrary
                        ? 'Arbitrary color — bind to Color variable'
                        : `Matches token: ${tokenMatch} (${hex})`,
                    });
                  }
                } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
                  if (Array.isArray(paint.gradientStops)) {
                    for (let sIdx = 0; sIdx < paint.gradientStops.length; sIdx++) {
                      const stop = paint.gradientStops[sIdx];
                      const stopBinding = (stop as any).boundVariables?.color;
                      if (stopBinding && stopBinding.type === 'VARIABLE_ALIAS' && stopBinding.id) {
                        const vStatus = await checkVariableStatus(stopBinding.id, node);
                        reportBoundVariableIssue(vStatus, {
                          nodeId: node.id,
                          nodeName,
                          layerType: nodeType,
                          layerTypeName,
                          category: 'color',
                          categoryLabel: 'Color',
                          property: 'strokes',
                          propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                          value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                          varId: stopBinding.id,
                          missingSuggestion: 'Reassign to a valid Color variable',
                        });
                      }
                    }
                  }
                }
              }
            }
          }

          const auditStyleBoundVariables = async (styleBoundVars: any, styleName: string) => {
            if (!styleBoundVars || typeof styleBoundVars !== 'object') return;
            for (const [sKey, sVal] of Object.entries(styleBoundVars)) {
              if (!sVal) continue;
              const items = Array.isArray(sVal) ? sVal : [sVal];
              for (const item of items) {
                if (item && typeof item === 'object' && (item as any).type === 'VARIABLE_ALIAS' && (item as any).id) {
                  const vStatus = await checkVariableStatus((item as any).id, node);
                  reportBoundVariableIssue(vStatus, {
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: sKey,
                    propertyLabel: `Style "${styleName}" (${sKey})`,
                    value: vStatus.isMissing ? 'Missing' : vStatus.name,
                    varId: (item as any).id,
                    missingSuggestion: `Reassign variable in style "${styleName}" to a valid local token`,
                    styleName,
                  });
                }
              }
            }
          };

          // 4e. EFFECTS (Drop & Inner Shadows)
          let hasRemoteOrValidEffectStyle = false;
          if (typeof (node as any).effectStyleId === 'string' && (node as any).effectStyleId.length > 0) {
            const styleId = (node as any).effectStyleId;
            try {
              const style = await figma.getStyleByIdAsync(styleId);
              if (style) {
                hasRemoteOrValidEffectStyle = true;
                if ('effects' in style && Array.isArray((style as any).effects)) {
                  for (const eff of (style as any).effects) {
                    const effColorBinding = eff?.boundVariables?.color;
                    if (effColorBinding && effColorBinding.type === 'VARIABLE_ALIAS' && effColorBinding.id) {
                      const vStatus = await checkVariableStatus(effColorBinding.id, node);
                      reportBoundVariableIssue(vStatus, {
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: 'color',
                        categoryLabel: 'Color',
                        property: 'effects',
                        propertyLabel: `Effect Style "${style.name}"`,
                        value: eff.color ? rgbToHex(eff.color.r, eff.color.g, eff.color.b) : '#888888',
                        varId: effColorBinding.id,
                        missingSuggestion: 'Reassign to a valid Effect Style or Color variable',
                        styleName: style.name,
                      });
                    }
                  }
                }
                await auditStyleBoundVariables((style as any).boundVariables, style.name);
              } else if (!markReported(node.id, `style:${styleId}`)) {
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName: nodeName,
                  layerType: nodeType,
                  layerTypeName: layerTypeName,
                  category: 'color',
                  categoryLabel: 'Color',
                  property: 'effects',
                  propertyLabel: 'Effect Style',
                  issueType: 'missing',
                  value: '#888888',
                  formattedValue: `Missing Style (${styleId})`,
                  suggestion: 'Reassign to a valid Effect Style or Variable',
                });
              }
            } catch (e) {}
          }

          if (!hasRemoteOrValidEffectStyle && 'effects' in node && Array.isArray((node as any).effects)) {
            const effects = (node as any).effects as readonly Effect[];
            for (let eIdx = 0; eIdx < effects.length; eIdx++) {
              const eff = effects[eIdx];
              if (!eff || eff.visible === false) continue;
              if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
                const effColorBinding = (eff as any).boundVariables?.color;
                const effLabel = effects.length > 1 ? `Shadow (${eIdx + 1})` : 'Shadow';
                if (effColorBinding && effColorBinding.type === 'VARIABLE_ALIAS' && effColorBinding.id) {
                  const vStatus = await checkVariableStatus(effColorBinding.id, node);
                  reportBoundVariableIssue(vStatus, {
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'effects',
                    propertyLabel: effLabel,
                    value: rgbToHex(eff.color.r, eff.color.g, eff.color.b),
                    varId: effColorBinding.id,
                    missingSuggestion: 'Reassign to a valid Color variable',
                  });
                }
              }
            }
          }
          }

          // 4f. SCAN ALL REMAINING BOUND VARIABLES ON NODE (Fills, Strokes, Effects, Opacity, Props)
          let hasLocalValidTextStyle = false;
          if (!isAppleNode && node.type === 'TEXT') {
            const textStyleId = (node as any).textStyleId;
            if (typeof textStyleId === 'string' && textStyleId.length > 0) {
              try {
                const textStyle = await figma.getStyleByIdAsync(textStyleId);
                if (textStyle) {
                  hasLocalValidTextStyle = !(textStyle as any).remote;
                  await auditStyleBoundVariables((textStyle as any).boundVariables, textStyle.name);
                } else if (!markReported(node.id, `style:${textStyleId}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'textStyleId',
                    propertyLabel: 'Text Style',
                    issueType: 'missing',
                    value: '#888888',
                    formattedValue: `Missing Style (${textStyleId})`,
                    suggestion: 'Reassign to a valid Text Style or Variable',
                  });
                }
              } catch (e) {}
            } else if (textStyleId === figma.mixed) {
              try {
                const textNode = node as TextNode;
                const segs = textNode.getStyledTextSegments(['textStyleId']);
                const checkedStyleIds = new Set<string>();
                for (const seg of segs) {
                  if (typeof seg.textStyleId === 'string' && seg.textStyleId.length > 0 && !checkedStyleIds.has(seg.textStyleId)) {
                    checkedStyleIds.add(seg.textStyleId);
                    const segStyle = await figma.getStyleByIdAsync(seg.textStyleId);
                    if (segStyle) {
                      if (!(segStyle as any).remote) hasLocalValidTextStyle = true;
                      await auditStyleBoundVariables((segStyle as any).boundVariables, segStyle.name);
                    }
                  }
                }
              } catch (e) {}
            }
          }

          for (const [bKey, bVal] of Object.entries(boundVars)) {
            if (!bVal) continue;
            if (bKey === 'effects' && hasRemoteOrValidEffectStyle) continue;
            if (hasLocalValidTextStyle && /^(fontFamily|fontStyle|fontWeight|fontSize|lineHeight|letterSpacing|paragraphSpacing|paragraphIndent|textCase|textDecoration)$/i.test(bKey)) {
              continue;
            }
            if (Array.isArray(bVal)) {
              for (let idx = 0; idx < bVal.length; idx++) {
                const item = bVal[idx];
                if (item && item.type === 'VARIABLE_ALIAS' && item.id) {
                  const vStatus = await checkVariableStatus(item.id, node);
                  const cat: 'gap' | 'padding' | 'radius' | 'color' | 'stroke' = bKey.includes('radius')
                    ? 'radius'
                    : (bKey.includes('spacing') || bKey.includes('gap')
                      ? 'gap'
                      : (bKey.includes('padding')
                        ? 'padding'
                        : (bKey.toLowerCase().includes('weight') || bKey.toLowerCase().includes('width') || bKey === 'strokeWeight' ? 'stroke' : 'color')));
                  reportBoundVariableIssue(vStatus, {
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: cat,
                    categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                    property: bKey,
                    propertyLabel: `${bKey} (${idx + 1})`,
                    value: vStatus.isMissing ? 'Missing' : vStatus.name,
                    varId: item.id,
                    missingSuggestion: 'Reassign to a valid variable',
                  });
                }
              }
            } else if (typeof bVal === 'object' && (bVal as any).type === 'VARIABLE_ALIAS' && (bVal as any).id) {
              const aliasId = (bVal as any).id;
              const vStatus = await checkVariableStatus(aliasId, node);
              const cat: 'gap' | 'padding' | 'radius' | 'color' | 'stroke' = bKey.includes('radius')
                ? 'radius'
                : (bKey.includes('spacing') || bKey.includes('gap')
                  ? 'gap'
                  : (bKey.includes('padding')
                    ? 'padding'
                    : (bKey.toLowerCase().includes('weight') || bKey.toLowerCase().includes('width') || bKey === 'strokeWeight' ? 'stroke' : 'color')));
              reportBoundVariableIssue(vStatus, {
                nodeId: node.id,
                nodeName,
                layerType: nodeType,
                layerTypeName,
                category: cat,
                categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                property: bKey,
                propertyLabel: bKey,
                value: vStatus.isMissing ? 'Missing' : vStatus.name,
                varId: aliasId,
                missingSuggestion: 'Reassign to a valid variable',
              });
            }
          }
        }
      } catch (nodeErr) {
        console.warn('Error auditing node:', (node as any)?.name, nodeErr);
      }
    }

    // Mark issues as ignored or active based on node pluginData
    for (const issue of issues) {
      const ignoredSet = nodeIgnoredMap.get(issue.nodeId);
      if (ignoredSet) {
        issue.isIgnored = ignoredSet.has(`${issue.category}:${issue.property}`) ||
                          ignoredSet.has(`${issue.category}:*`) ||
                          ignoredSet.has('*');
      } else {
        issue.isIgnored = false;
      }
    }

    // Group identical issues across layers (report unbound raw values everywhere; suppress color issues on official Apple UI kits)
    const rawIssues = issues.filter(i => !(i.category === 'color' && appleSubtreeNodeIds.has(i.nodeId)));
    const groupedMap = new Map<string, AuditIssue>();
    for (const issue of rawIssues) {
      const groupKey = `${issue.isIgnored ? 'ignored' : 'active'}:${issue.issueType}:${issue.category}:${issue.property}:${issue.propertyLabel || ''}:${issue.layerType}:${(issue.nodeName || '').trim().toLowerCase()}:${issue.varId || ''}:${String(issue.value || '')}:${issue.formattedValue || ''}`;

      if (groupedMap.has(groupKey)) {
        const existing = groupedMap.get(groupKey)!;
        if (!existing.nodeIds) {
          existing.nodeIds = [existing.nodeId];
        }
        if (!existing.nodeIds.includes(issue.nodeId)) {
          existing.nodeIds.push(issue.nodeId);
        }
        existing.count = existing.nodeIds.length;
      } else {
        groupedMap.set(groupKey, {
          ...issue,
          count: 1,
          nodeIds: [issue.nodeId],
        });
      }
    }

    const groupedIssues: AuditIssue[] = Array.from(groupedMap.values());
    const activeIssues = groupedIssues.filter(i => !i.isIgnored);
    const ignoredIssues = groupedIssues.filter(i => !!i.isIgnored);

    const summary: AuditSummary = {
      totalIssues: activeIssues.length,
      totalOccurrences: rawIssues.filter(i => !i.isIgnored).length,
      unboundCount: activeIssues.filter(i => i.issueType === 'unbound').length,
      missingCount: activeIssues.filter(i => i.issueType === 'missing').length,
      foreignCount: activeIssues.filter(i => i.issueType === 'foreign').length,
      gapCount: activeIssues.filter(i => i.category === 'gap').length,
      paddingCount: activeIssues.filter(i => i.category === 'padding').length,
      radiusCount: activeIssues.filter(i => i.category === 'radius').length,
      colorCount: activeIssues.filter(i => i.category === 'color').length,
      strokeCount: activeIssues.filter(i => i.category === 'stroke').length,
      scannedNodesCount: allNodes.length,
      scope,
      activeCount: activeIssues.length,
      ignoredCount: ignoredIssues.length,
    };

    figma.ui.postMessage({
      type: 'audit-results',
      scope,
      summary,
      issues: groupedIssues,
      trustedLibraries,
    });
  } catch (err: any) {
    console.error('Audit error:', err);
    figma.ui.postMessage({
      type: 'audit-results',
      scope,
      summary: {
        totalIssues: 0,
        unboundCount: 0,
        missingCount: 0,
        foreignCount: 0,
        gapCount: 0,
        paddingCount: 0,
        radiusCount: 0,
        colorCount: 0,
        strokeCount: 0,
        scannedNodesCount: 0,
        scope,
      },
      issues: [],
      trustedLibraries: getTrustedAuditLibraries(),
      error: err ? err.message : String(err),
    });
  }
}

// ==========================================
// SELECTION TRACKING & AI INSPECTOR
// ==========================================
