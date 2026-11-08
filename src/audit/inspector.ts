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

export async function runAuditTokens(scope: 'selection' | 'page' = 'selection') {
  try {
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
            gapCount: 0,
            paddingCount: 0,
            radiusCount: 0,
            colorCount: 0,
            strokeCount: 0,
            scannedNodesCount: 0,
            scope: 'selection',
          },
          issues: [],
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

    let availableLibraryCollectionKeys: Set<string> | null = null;
    try {
      if (figma.teamLibrary && typeof (figma.teamLibrary as any).getAvailableLibraryVariableCollectionsAsync === 'function') {
        const libs = await (figma.teamLibrary as any).getAvailableLibraryVariableCollectionsAsync();
        if (Array.isArray(libs)) {
          availableLibraryCollectionKeys = new Set(libs.map((l: any) => l.key));
        }
      }
    } catch (e) {
      availableLibraryCollectionKeys = null;
    }

    async function collectNodes(nodes: readonly SceneNode[] | null | undefined) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || visitedIds.has(node.id)) continue;
        visitedIds.add(node.id);

        if (await isRemoteInstance(node) || await isInsideRemoteSubtree(node)) {
          continue;
        }

        allNodes.push(node);
        if ('children' in node && (node as any).children && (node as any).children.length > 0) {
          try {
            await collectNodes((node as any).children);
          } catch (e) {}
        }
      }
    }

    await collectNodes(targetRoots);

    const varStatusCache = new Map<string, { variable: Variable | null; isMissing: boolean; name: string }>();

    async function checkVariableStatus(varId: string, consumerNode?: SceneNode): Promise<{ variable: Variable | null; isMissing: boolean; name: string }> {
      if (!varId || typeof varId !== 'string') {
        return { variable: null, isMissing: true, name: 'Unknown' };
      }
      if (varStatusCache.has(varId)) {
        const cached = varStatusCache.get(varId)!;
        if (cached.isMissing) return cached;
        if (cached.variable && consumerNode && typeof (cached.variable as any).resolveForConsumer === 'function') {
          try {
            const resolved = (cached.variable as any).resolveForConsumer(consumerNode);
            if (!resolved || resolved.value === undefined || resolved.value === null) {
              return { variable: cached.variable, isMissing: true, name: cached.name };
            }
          } catch (e) {
            return { variable: cached.variable, isMissing: true, name: cached.name };
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
          const res = { variable: null, isMissing: true, name: `Missing Variable (${varId})` };
          varStatusCache.set(varId, res);
          return res;
        }

        // Check if variable collection exists
        let collection: VariableCollection | null = null;
        try {
          collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        } catch (e) {
          collection = null;
        }
        if (!collection) {
          const res = { variable, isMissing: true, name: variable.name };
          varStatusCache.set(varId, res);
          return res;
        }

        // Check if variable is still in collection's variableIds
        if (collection && collection.variableIds && Array.isArray(collection.variableIds) && !collection.variableIds.includes(variable.id)) {
          const res = { variable, isMissing: true, name: variable.name };
          varStatusCache.set(varId, res);
          return res;
        }

        // Check if remote library collection is available in this file
        if (collection && collection.remote && availableLibraryCollectionKeys && !availableLibraryCollectionKeys.has(collection.key)) {
          const res = { variable, isMissing: true, name: variable.name };
          varStatusCache.set(varId, res);
          return res;
        }

        // Verify consumer resolution if node is provided
        if (consumerNode && typeof (variable as any).resolveForConsumer === 'function') {
          try {
            const resolved = (variable as any).resolveForConsumer(consumerNode);
            if (!resolved || resolved.value === undefined || resolved.value === null) {
              const res = { variable, isMissing: true, name: variable.name };
              varStatusCache.set(varId, res);
              return res;
            }
          } catch (e) {
            const res = { variable, isMissing: true, name: variable.name };
            varStatusCache.set(varId, res);
            return res;
          }
        }

        const { isMissing } = await resolveVariableValueAndStatus(variable);
        const res = { variable, isMissing, name: variable.name };
        varStatusCache.set(varId, res);
        return res;
      } catch (err) {
        const res = { variable: null, isMissing: true, name: `Missing (${varId})` };
        varStatusCache.set(varId, res);
        return res;
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

    const nodeIgnoredMap = new Map<string, Set<string>>();

    for (const node of allNodes) {
      try {
        if (!node || (node.type as string) === 'PAGE' || (node.type as string) === 'DOCUMENT') continue;
        if (await isRemoteInstance(node) || await isInsideRemoteSubtree(node)) continue;

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
              if (vStatus.isMissing && !markReported(node.id, `var:${gapBinding.id}`)) {
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
                  issueType: 'missing',
                  value: itemSpacing,
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: gapBinding.id,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid Spacing variable',
                });
              }
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
              if (vStatus.isMissing && !markReported(node.id, `var:${counterBinding.id}`)) {
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
                  issueType: 'missing',
                  value: counterSpacing,
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: counterBinding.id,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid Spacing variable',
                });
              }
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
              if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
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
                  issueType: 'missing',
                  value: p.val,
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: binding.id,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid Spacing variable',
                });
              }
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
                if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
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
                    issueType: 'missing',
                    value: c.val,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: binding.id,
                    varName: vStatus.name,
                    suggestion: 'Reassign to a valid Radius variable',
                  });
                }
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
              if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
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
                  issueType: 'missing',
                  value: cornerRadius,
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: binding.id,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid Radius variable',
                });
              }
            } else if (indBindings.length > 0) {
              for (const indBinding of indBindings) {
                if (indBinding.type === 'VARIABLE_ALIAS' && indBinding.id) {
                  const vStatus = await checkVariableStatus(indBinding.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${indBinding.id}`)) {
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
                      issueType: 'missing',
                      value: cornerRadius,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: indBinding.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid Radius variable',
                    });
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
                  if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
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
                      issueType: 'missing',
                      value: s.val,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: binding.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid Stroke variable',
                    });
                  }
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
              if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
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
                  issueType: 'missing',
                  value: sw,
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: binding.id,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid Stroke variable',
                });
              }
            } else if (indBindings.length > 0) {
              for (const indBinding of indBindings) {
                if (indBinding.type === 'VARIABLE_ALIAS' && indBinding.id) {
                  const vStatus = await checkVariableStatus(indBinding.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${indBinding.id}`)) {
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
                      issueType: 'missing',
                      value: sw,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: indBinding.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid Stroke variable',
                    });
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
                      if (vStatus.isMissing && !markReported(node.id, `var:${spBinding.id}`)) {
                        issues.push({
                          id: `issue_${++issueCounter}`,
                          nodeId: node.id,
                          nodeName: nodeName,
                          layerType: nodeType,
                          layerTypeName: layerTypeName,
                          category: 'color',
                          categoryLabel: 'Color',
                          property: 'fills',
                          propertyLabel: `Style "${style.name}"`,
                          issueType: 'missing',
                          value: sp.type === 'SOLID' ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : '#888888',
                          formattedValue: `Missing Variable (${vStatus.name}) in "${style.name}"`,
                          varId: spBinding.id,
                          varName: vStatus.name,
                          suggestion: 'Reassign to a valid Color variable',
                        });
                      }
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
                if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
                  const valHex = paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888';
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
                    issueType: 'missing',
                    value: valHex,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: colorBinding.id,
                    varName: vStatus.name,
                    suggestion: 'Reassign to a valid Color variable',
                  });
                }
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
                      if (vStatus.isMissing && !markReported(node.id, `var:${stopBinding.id}`)) {
                        issues.push({
                          id: `issue_${++issueCounter}`,
                          nodeId: node.id,
                          nodeName: nodeName,
                          layerType: nodeType,
                          layerTypeName: layerTypeName,
                          category: 'color',
                          categoryLabel: 'Color',
                          property: 'fills',
                          propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                          issueType: 'missing',
                          value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                          formattedValue: `Missing Variable (${vStatus.name})`,
                          varId: stopBinding.id,
                          varName: vStatus.name,
                          suggestion: 'Reassign to a valid Color variable',
                        });
                      }
                    }
                  }
                }
              }

              // Check paint opacity variable
              const paintOpBinding = (paint as any).boundVariables?.opacity;
              if (paintOpBinding && paintOpBinding.type === 'VARIABLE_ALIAS' && paintOpBinding.id) {
                const vStatus = await checkVariableStatus(paintOpBinding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${paintOpBinding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName: nodeName,
                    layerType: nodeType,
                    layerTypeName: layerTypeName,
                    category: 'color',
                    categoryLabel: 'Color',
                    property: 'fills',
                    propertyLabel: `${propLabel} Opacity`,
                    issueType: 'missing',
                    value: paint.opacity ?? 1,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: paintOpBinding.id,
                    varName: vStatus.name,
                    suggestion: 'Reassign to a valid Number variable',
                  });
                }
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
                      if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
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
                          issueType: 'missing',
                          value: paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888',
                          formattedValue: `Missing Variable (${vStatus.name})`,
                          varId: colorBinding.id,
                          varName: vStatus.name,
                          suggestion: 'Reassign to a valid Color variable',
                        });
                      }
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
                      if (vStatus.isMissing && !markReported(node.id, `var:${spBinding.id}`)) {
                        issues.push({
                          id: `issue_${++issueCounter}`,
                          nodeId: node.id,
                          nodeName: nodeName,
                          layerType: nodeType,
                          layerTypeName: layerTypeName,
                          category: 'color',
                          categoryLabel: 'Color',
                          property: 'strokes',
                          propertyLabel: `Style "${style.name}"`,
                          issueType: 'missing',
                          value: sp.type === 'SOLID' ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : '#888888',
                          formattedValue: `Missing Variable (${vStatus.name}) in "${style.name}"`,
                          varId: spBinding.id,
                          varName: vStatus.name,
                          suggestion: 'Reassign to a valid Color variable',
                        });
                      }
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
                  if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
                    const valHex = paint.type === 'SOLID' ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : '#888888';
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
                      issueType: 'missing',
                      value: valHex,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: colorBinding.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid Color variable',
                    });
                  }
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
                        if (vStatus.isMissing && !markReported(node.id, `var:${stopBinding.id}`)) {
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName: nodeName,
                            layerType: nodeType,
                            layerTypeName: layerTypeName,
                            category: 'color',
                            categoryLabel: 'Color',
                            property: 'strokes',
                            propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                            issueType: 'missing',
                            value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                            formattedValue: `Missing Variable (${vStatus.name})`,
                            varId: stopBinding.id,
                            varName: vStatus.name,
                            suggestion: 'Reassign to a valid Color variable',
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // 4e. EFFECTS (Drop & Inner Shadows)
          let hasRemoteOrValidEffectStyle = false;
          if (typeof (node as any).effectStyleId === 'string' && (node as any).effectStyleId.length > 0) {
            const styleId = (node as any).effectStyleId;
            try {
              const style = await figma.getStyleByIdAsync(styleId);
              if (style) {
                hasRemoteOrValidEffectStyle = true;
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
                  if (vStatus.isMissing && !markReported(node.id, `var:${effColorBinding.id}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName: nodeName,
                      layerType: nodeType,
                      layerTypeName: layerTypeName,
                      category: 'color',
                      categoryLabel: 'Color',
                      property: 'effects',
                      propertyLabel: effLabel,
                      issueType: 'missing',
                      value: rgbToHex(eff.color.r, eff.color.g, eff.color.b),
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: effColorBinding.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid Color variable',
                    });
                  }
                }
              }
            }
          }

          // 4f. SCAN ALL REMAINING BOUND VARIABLES ON NODE (Fills, Strokes, Effects, Opacity, Props)
          let hasRemoteOrValidTextStyle = false;
          if (node.type === 'TEXT') {
            const textStyleId = (node as any).textStyleId;
            if (typeof textStyleId === 'string' && textStyleId.length > 0) {
              try {
                const textStyle = await figma.getStyleByIdAsync(textStyleId);
                if (textStyle) {
                  hasRemoteOrValidTextStyle = true;
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
                for (const seg of segs) {
                  if (typeof seg.textStyleId === 'string' && seg.textStyleId.length > 0) {
                    const segStyle = await figma.getStyleByIdAsync(seg.textStyleId);
                    if (segStyle) {
                      hasRemoteOrValidTextStyle = true;
                      break;
                    }
                  }
                }
              } catch (e) {}
            }
          }

          for (const [bKey, bVal] of Object.entries(boundVars)) {
            if (!bVal) continue;
            if (bKey === 'effects' && hasRemoteOrValidEffectStyle) continue;
            if (hasRemoteOrValidTextStyle && /^(fontFamily|fontStyle|fontWeight|fontSize|lineHeight|letterSpacing|paragraphSpacing|paragraphIndent|textCase|textDecoration)$/i.test(bKey)) {
              continue;
            }
            if (Array.isArray(bVal)) {
              for (let idx = 0; idx < bVal.length; idx++) {
                const item = bVal[idx];
                if (item && item.type === 'VARIABLE_ALIAS' && item.id) {
                  const vStatus = await checkVariableStatus(item.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${item.id}`)) {
                    const cat: 'gap' | 'padding' | 'radius' | 'color' | 'stroke' = bKey.includes('radius')
                      ? 'radius'
                      : (bKey.includes('spacing') || bKey.includes('gap')
                        ? 'gap'
                        : (bKey.includes('padding')
                          ? 'padding'
                          : (bKey.toLowerCase().includes('weight') || bKey.toLowerCase().includes('width') || bKey === 'strokeWeight' ? 'stroke' : 'color')));
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName: nodeName,
                      layerType: nodeType,
                      layerTypeName: layerTypeName,
                      category: cat,
                      categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                      property: bKey,
                      propertyLabel: `${bKey} (${idx + 1})`,
                      issueType: 'missing',
                      value: 'Missing',
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: item.id,
                      varName: vStatus.name,
                      suggestion: 'Reassign to a valid variable',
                    });
                  }
                }
              }
            } else if (typeof bVal === 'object' && (bVal as any).type === 'VARIABLE_ALIAS' && (bVal as any).id) {
              const aliasId = (bVal as any).id;
              const vStatus = await checkVariableStatus(aliasId, node);
              if (vStatus.isMissing && !markReported(node.id, `var:${aliasId}`)) {
                const cat: 'gap' | 'padding' | 'radius' | 'color' | 'stroke' = bKey.includes('radius')
                  ? 'radius'
                  : (bKey.includes('spacing') || bKey.includes('gap')
                    ? 'gap'
                    : (bKey.includes('padding')
                      ? 'padding'
                      : (bKey.toLowerCase().includes('weight') || bKey.toLowerCase().includes('width') || bKey === 'strokeWeight' ? 'stroke' : 'color')));
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName: nodeName,
                  layerType: nodeType,
                  layerTypeName: layerTypeName,
                  category: cat,
                  categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                  property: bKey,
                  propertyLabel: bKey,
                  issueType: 'missing',
                  value: 'Missing',
                  formattedValue: `Missing Variable (${vStatus.name})`,
                  varId: aliasId,
                  varName: vStatus.name,
                  suggestion: 'Reassign to a valid variable',
                });
              }
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

    // Group identical issues across layers
    const rawIssues = issues;
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
        gapCount: 0,
        paddingCount: 0,
        radiusCount: 0,
        colorCount: 0,
        strokeCount: 0,
        scannedNodesCount: 0,
        scope,
      },
      issues: [],
      error: err ? err.message : String(err),
    });
  }
}

// ==========================================
// SELECTION TRACKING & AI INSPECTOR
// ==========================================
