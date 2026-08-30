/// <reference types="../component-set/node_modules/@figma/plugin-typings" />

// Window size expanded in width and height for a spacious, modern UI
figma.showUI(__html__, { width: 520, height: 720, themeColors: true });

interface VariableSubUsageGroup {
  subProperty: string; // e.g. "Top-Left", "Top-Right", "Left", "Right", "Width", "Height" or ""
  layerTypeKey: string;
  layerTypeName: string;
  count: number;
  nodeIds: string[];
}

interface VariableCategoryGroup {
  categoryName: string; // e.g. "Radius", "Gap", "Padding", "Border", "Size", "Opacity"
  totalCount: number;
  allNodeIds: string[];
  subGroups: VariableSubUsageGroup[];
}

interface VariableResult {
  id: string;
  name: string;
  value: string | number;
  totalUsages: number;
  isMissing?: boolean;
  categories: VariableCategoryGroup[];
}

interface SerializedVariant {
  id: string;
  name: string;
  variantProperties: Record<string, string> | null;
  description: string;
}

interface SelectionData {
  hasSelection: boolean;
  count: number;
  type: 'NONE' | 'COMPONENT_SET' | 'COMPONENT' | 'VARIANT' | 'MULTIPLE_VARIANTS' | 'FRAME' | 'OTHER';
  typeName: string;
  nodeId: string | null;
  name: string;
  description: string;
  parentComponentSetName: string | null;
  variantProperties: Record<string, string> | null;
  variants: SerializedVariant[];
  canApplyMetrics: boolean;
}

const NON_NUMERIC_PROP_KEYS = new Set([
  'fills', 'strokes', 'effects', 'visible', 'characters', 'textdata', 'fontname',
  'fontsize', 'lineheight', 'letterspacing', 'paragraphspacing', 'paragraphindent',
  'fontweight', 'textcase', 'textdecoration', 'leading', 'tracking', 'font', 'typography', 'text'
]);

function getLayerTypeDisplayName(type: string): string {
  switch (type) {
    case 'SECTION':
      return 'Section Layers';
    case 'INSTANCE':
      return 'Instance Layers';
    case 'COMPONENT':
      return 'Component Layers';
    case 'RECTANGLE':
      return 'Rectangle Layers';
    case 'FRAME':
      return 'Frame Layers';
    case 'VECTOR':
      return 'Vector Layers';
    case 'COMPONENT_SET':
      return 'Component_set Layers';
    case 'TEXT':
      return 'Text Layers';
    case 'LINE':
      return 'Line Layers';
    case 'ELLIPSE':
      return 'Ellipse Layers';
    case 'STAR':
      return 'Star Layers';
    case 'POLYGON':
      return 'Polygon Layers';
    case 'GROUP':
      return 'Group Layers';
    case 'BOOLEAN_OPERATION':
      return 'Boolean Operation Layers';
    default:
      const lower = type.toLowerCase().replace(/_/g, ' ');
      const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
      return `${capitalized} Layers`;
  }
}

function isNonNumericProp(key: string): boolean {
  const k = key.toLowerCase();
  if (NON_NUMERIC_PROP_KEYS.has(k)) return true;
  if (k.includes('font') || k.includes('text') || k.includes('lineheight') || k.includes('letterspacing') || k.includes('typography')) {
    return true;
  }
  return false;
}

function parsePropertyInfo(propName: string): { category: string; detail: string } {
  const p = propName.toLowerCase();

  // Corner radii
  if (p.includes('topleftradius') || p.includes('topleft')) {
    return { category: 'Radius', detail: 'Top-Left' };
  }
  if (p.includes('toprightradius') || p.includes('topright')) {
    return { category: 'Radius', detail: 'Top-Right' };
  }
  if (p.includes('bottomleftradius') || p.includes('bottomleft')) {
    return { category: 'Radius', detail: 'Bottom-Left' };
  }
  if (p.includes('bottomrightradius') || p.includes('bottomright')) {
    return { category: 'Radius', detail: 'Bottom-Right' };
  }
  if (p.includes('radius') || p.includes('corner')) {
    return { category: 'Radius', detail: 'All Corners' };
  }

  // Padding
  if (p.includes('paddingleft')) return { category: 'Padding', detail: 'Left' };
  if (p.includes('paddingright')) return { category: 'Padding', detail: 'Right' };
  if (p.includes('paddingtop')) return { category: 'Padding', detail: 'Top' };
  if (p.includes('paddingbottom')) return { category: 'Padding', detail: 'Bottom' };
  if (p.includes('padding')) return { category: 'Padding', detail: 'All Sides' };

  // Gap / Spacing
  if (p.includes('itemspacing') || p === 'gap') return { category: 'Gap', detail: 'Gap' };
  if (p.includes('counteraxisspacing')) return { category: 'Gap', detail: 'Counter Gap' };
  if (p.includes('spacing')) return { category: 'Gap', detail: 'Gap' };

  // Border / Stroke Weight
  if (p.includes('stroketopweight')) return { category: 'Border', detail: 'Top' };
  if (p.includes('strokebottomweight')) return { category: 'Border', detail: 'Bottom' };
  if (p.includes('strokeleftweight')) return { category: 'Border', detail: 'Left' };
  if (p.includes('strokerightweight')) return { category: 'Border', detail: 'Right' };
  if (p.includes('stroke') || p.includes('border') || p.includes('weight')) return { category: 'Border', detail: 'All Sides' };

  // Size
  if (p.includes('width')) return { category: 'Size', detail: 'Width' };
  if (p.includes('height')) return { category: 'Size', detail: 'Height' };
  if (p.includes('size')) return { category: 'Size', detail: 'Size' };

  // Opacity
  if (p.includes('opacity')) return { category: 'Opacity', detail: 'Opacity' };

  // Effects / Shadows / Blurs / Glass
  if (p.includes('effect') || p.includes('shadow') || p.includes('blur') || p.includes('glass') || p.includes('frost')) {
    return { category: 'Effect', detail: propName || 'Effect' };
  }

  return { category: 'Property', detail: propName || 'Property' };
}

function isEffectRelated(varName: string, categoryNames: Iterable<string>): boolean {
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

function isTextOrTypographyRelated(varName: string, categoryNames: Iterable<string>): boolean {
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

function extractVariableAliases(
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

async function resolveVariableValueAndStatus(variable: Variable): Promise<{ value: string | number; isMissing: boolean }> {
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    if (!collection) {
      return { value: 'Missing Collection', isMissing: true };
    }

    const defaultModeId = collection.defaultModeId;
    let val = variable.valuesByMode[defaultModeId];

    if (val === undefined || val === null) {
      const modeKeys = Object.keys(variable.valuesByMode);
      if (modeKeys.length > 0) {
        val = variable.valuesByMode[modeKeys[0]];
      }
    }

    if (val === undefined || val === null) {
      return { value: 'Missing Value', isMissing: true };
    }

    let currentVal: any = val;
    let depth = 0;
    while (typeof currentVal === 'object' && currentVal !== null && currentVal.type === 'VARIABLE_ALIAS' && depth < 10) {
      depth++;
      const targetId = currentVal.id;
      if (!targetId) {
        return { value: 'Missing Target', isMissing: true };
      }
      const targetVar = await figma.variables.getVariableByIdAsync(targetId);
      if (!targetVar) {
        return { value: 'Missing Target Alias', isMissing: true };
      }
      const targetColl = await figma.variables.getVariableCollectionByIdAsync(targetVar.variableCollectionId);
      if (!targetColl) {
        return { value: 'Missing Target Collection', isMissing: true };
      }
      currentVal = targetVar.valuesByMode[targetColl.defaultModeId];
      if (currentVal === undefined || currentVal === null) {
        const targetModeKeys = Object.keys(targetVar.valuesByMode);
        if (targetModeKeys.length > 0) {
          currentVal = targetVar.valuesByMode[targetModeKeys[0]];
        }
      }
    }

    if (typeof currentVal === 'number') {
      return { value: currentVal, isMissing: false };
    }

    return { value: 'Missing Value', isMissing: true };
  } catch (e) {
    return { value: 'Missing', isMissing: true };
  }
}

const IGNORED_CONTAINER_FRAME_NAMES = new Set([
  'main', 'section', 'component', 'screen'
]);

function isInsideIgnoredSubtree(node: BaseNode): boolean {
  let curr: BaseNode | null = node;
  while (curr && curr.type !== 'PAGE' && curr.type !== 'DOCUMENT') {
    const name = (curr.name || '').trim().toLowerCase();
    if (name.startsWith('_')) {
      return true;
    }
    if (curr.type === 'INSTANCE') {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function shouldSkipNodeReporting(node: BaseNode): boolean {
  // Skip any node that starts with _, is an INSTANCE, or is inside an ancestor starting with _ / INSTANCE
  if (isInsideIgnoredSubtree(node)) return true;

  // Skip reporting variables directly on Figma SECTION containers
  if (node.type === 'SECTION') return true;

  // Skip reporting variables directly on COMPONENT_SET outer wrapper containers
  if (node.type === 'COMPONENT_SET') return true;

  // Skip reporting variables directly on wrapper FRAMEs named main, section, or component
  if (node.type === 'FRAME') {
    const nameLower = (node.name || '').trim().toLowerCase();
    if (IGNORED_CONTAINER_FRAME_NAMES.has(nameLower)) return true;
  }

  return false;
}

async function scanDocument(scope: 'page' | 'document' = 'page') {
  let rawNodes: SceneNode[] = [];
  if (scope === 'page') {
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

// ==========================================
// SELECTION TRACKING & AI INSPECTOR
// ==========================================
function getSelectionData(): Promise<SelectionData> {
  return (async () => {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      return {
        hasSelection: false,
        count: 0,
        type: 'NONE',
        typeName: 'No selection',
        nodeId: null,
        name: '',
        description: '',
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics: false,
      };
    }

    const firstNode = selection[0];
    const count = selection.length;
    const canApplyMetrics = selection.some(
      (n) =>
        n.type === 'COMPONENT_SET' ||
        n.type === 'FRAME' ||
        n.type === 'SECTION' ||
        n.type === 'COMPONENT',
    );

    // Helper to find enclosing component or component set
    async function findEnclosingComponent(node: BaseNode | null): Promise<{ comp: ComponentNode | null; compSet: ComponentSetNode | null; instance: InstanceNode | null }> {
      let curr: BaseNode | null = node;
      let comp: ComponentNode | null = null;
      let compSet: ComponentSetNode | null = null;
      let instance: InstanceNode | null = null;

      while (curr) {
        if (curr.type === 'COMPONENT_SET') {
          compSet = curr as ComponentSetNode;
          break;
        }
        if (curr.type === 'COMPONENT' && !comp) {
          comp = curr as ComponentNode;
          if (comp.parent && comp.parent.type === 'COMPONENT_SET') {
            compSet = comp.parent as ComponentSetNode;
            break;
          }
        }
        if (curr.type === 'INSTANCE' && !instance) {
          instance = curr as InstanceNode;
          try {
            if ('getMainComponentAsync' in instance && typeof (instance as any).getMainComponentAsync === 'function') {
              comp = await (instance as any).getMainComponentAsync();
            } else {
              comp = instance.mainComponent;
            }
          } catch (e) {
            try {
              comp = instance.mainComponent;
            } catch (err) {
              comp = null;
            }
          }
          if (comp && comp.parent && comp.parent.type === 'COMPONENT_SET') {
            compSet = comp.parent as ComponentSetNode;
            break;
          }
        }
        curr = curr.parent;
      }
      return { comp, compSet, instance };
    }

    // Single Component Set directly selected or enclosing
    if (count === 1 && firstNode.type === 'COMPONENT_SET') {
      const compSet = firstNode as ComponentSetNode;
      const variants: SerializedVariant[] = compSet.children
        .filter((c): c is ComponentNode => c.type === 'COMPONENT')
        .map((c) => ({
          id: c.id,
          name: c.name,
          variantProperties: c.variantProperties || null,
          description: c.description || '',
        }));

      return {
        hasSelection: true,
        count: 1,
        type: 'COMPONENT_SET',
        typeName: 'Component Set',
        nodeId: compSet.id,
        name: compSet.name,
        description: compSet.description || '',
        parentComponentSetName: null,
        variantProperties: null,
        variants,
        canApplyMetrics: true,
      };
    }

    // Check enclosing component structures if single node selected
    if (count === 1) {
      const { comp, compSet } = await findEnclosingComponent(firstNode);

      if (comp) {
        const isVariant = !!compSet;
        return {
          hasSelection: true,
          count: 1,
          type: isVariant ? 'VARIANT' : 'COMPONENT',
          typeName: isVariant ? 'Component Variant' : 'Component',
          nodeId: comp.id,
          name: comp.name,
          description: comp.description || (compSet ? compSet.description : '') || '',
          parentComponentSetName: compSet ? compSet.name : null,
          variantProperties: comp.variantProperties || null,
          variants: compSet ? compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT').map(c => ({
            id: c.id,
            name: c.name,
            variantProperties: c.variantProperties || null,
            description: c.description || ''
          })) : [],
          canApplyMetrics: true,
        };
      }

      if (compSet) {
        const variants: SerializedVariant[] = compSet.children
          .filter((c): c is ComponentNode => c.type === 'COMPONENT')
          .map((c) => ({
            id: c.id,
            name: c.name,
            variantProperties: c.variantProperties || null,
            description: c.description || '',
          }));

        return {
          hasSelection: true,
          count: 1,
          type: 'COMPONENT_SET',
          typeName: 'Component Set',
          nodeId: compSet.id,
          name: compSet.name,
          description: compSet.description || '',
          parentComponentSetName: null,
          variantProperties: null,
          variants,
          canApplyMetrics: true,
        };
      }
    }

    // Multiple variants of the same component set selected
    const allComponents = selection.filter((n): n is ComponentNode => n.type === 'COMPONENT');
    if (allComponents.length === count && allComponents.length > 1) {
      const variants: SerializedVariant[] = allComponents.map((c) => ({
        id: c.id,
        name: c.name,
        variantProperties: c.variantProperties || null,
        description: c.description || '',
      }));

      const parentSet = allComponents[0].parent?.type === 'COMPONENT_SET' ? allComponents[0].parent as ComponentSetNode : null;

      return {
        hasSelection: true,
        count,
        type: 'MULTIPLE_VARIANTS',
        typeName: `${count} Variants Selected`,
        nodeId: parentSet ? parentSet.id : firstNode.id,
        name: parentSet ? parentSet.name : firstNode.name,
        description: parentSet ? parentSet.description : '',
        parentComponentSetName: parentSet ? parentSet.name : null,
        variantProperties: null,
        variants,
        canApplyMetrics: true,
      };
    }

    // Frame or Section
    if (firstNode.type === 'FRAME' || firstNode.type === 'SECTION') {
      return {
        hasSelection: true,
        count,
        type: 'FRAME',
        typeName: count > 1 ? `${count} Frames` : `${firstNode.type.toLowerCase()}: ${firstNode.name}`,
        nodeId: firstNode.id,
        name: firstNode.name,
        description: '',
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics: true,
      };
    }

    return {
      hasSelection: true,
      count,
      type: 'OTHER',
      typeName: `${count} Layers selected`,
      nodeId: firstNode.id,
      name: firstNode.name,
      description: '',
      parentComponentSetName: null,
      variantProperties: null,
      variants: [],
      canApplyMetrics,
    };
  })();
}

async function sendSelectionToUI() {
  const selectionData = await getSelectionData();
  figma.ui.postMessage({
    type: 'selection-change',
    selection: selectionData,
  });
}

figma.on('selectionchange', () => {
  sendSelectionToUI();
});

// Send initial data to UI on startup
async function sendInitialData() {
  const apiKey = (await figma.clientStorage.getAsync('gemini_api_key')) || '';
  const selectedModel = (await figma.clientStorage.getAsync('gemini_selected_model')) || '';
  const promptTone = (await figma.clientStorage.getAsync('gemini_prompt_tone')) || 'balanced';

  figma.ui.postMessage({
    type: 'init-data',
    apiKey,
    selectedModel,
    promptTone,
    selection: await getSelectionData(),
  });
}

sendInitialData();

// ==========================================
// COMPONENT SET & METRICS LOGIC
// ==========================================
interface ResolvedVariable {
  variable: Variable;
  collectionName: string;
}

async function getAllRelevantVariablesForComponentSet(): Promise<ResolvedVariable[]> {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();

  let libraryCollections: LibraryVariableCollection[] = [];
  try {
    libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  } catch (e) {
    console.warn('Error fetching team library collections:', e);
  }

  const localVariablesNested = await Promise.all(
    localCollections.map(async (collection) => {
      const vars = await Promise.all(
        collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)),
      );
      const validVars = vars.filter((v): v is Variable => v !== null);
      return validVars.map((v) => ({
        variable: v,
        collectionName: collection.name,
      }));
    }),
  );

  const libraryVariablesNested = await Promise.all(
    libraryCollections.map(async (libCollection) => {
      try {
        const varsDescriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
          libCollection.key,
        );
        const importedVars = await Promise.all(
          varsDescriptors.map((v) => figma.variables.importVariableByKeyAsync(v.key)),
        );
        const validVars = importedVars.filter((v): v is Variable => v !== null);
        return validVars.map((v) => ({
          variable: v,
          collectionName: libCollection.name,
        }));
      } catch (e) {
        console.warn(`Error importing from library ${libCollection.name}:`, e);
        return [];
      }
    }),
  );

  const allVariables: ResolvedVariable[] = [];
  for (const group of localVariablesNested) {
    allVariables.push(...group);
  }
  for (const group of libraryVariablesNested) {
    allVariables.push(...group);
  }

  return allVariables;
}

async function setupComponentSets(nodes: readonly ComponentSetNode[]) {
  const allVars = await getAllRelevantVariablesForComponentSet();

  const metricsVars = allVars.filter(
    (item) => item.collectionName.toLowerCase() === 'metrics',
  );

  const getMetricsVar = (varName: string) => {
    let found = metricsVars.find(
      (item) =>
        item.variable.name === varName ||
        item.variable.name === `metrics/${varName}` ||
        item.variable.name.endsWith(`/${varName}`),
    );
    if (!found) {
      found = allVars.find(
        (item) =>
          item.variable.name === `metrics/${varName}` ||
          item.variable.name === varName ||
          item.variable.name.endsWith(`/${varName}`),
      );
    }
    return found ? found.variable : undefined;
  };

  const varGap = getMetricsVar('layout/base');
  const varPadding = getMetricsVar('layout/base');
  const varRadius = getMetricsVar('radius/container/base');
  const varBorder = getMetricsVar('constant/one');
  const varNone = getMetricsVar('constant/none');

  const schemesVars = allVars.filter(
    (item) => item.collectionName.toLowerCase() === 'schemes',
  );

  const foundBorderColor =
    schemesVars.find(
      (item) =>
        item.variable.name === 'outlineBase' ||
        item.variable.name === 'schemes/outlineBase' ||
        item.variable.name.endsWith('outlineBase') ||
        item.variable.name === 'outlineHighest' ||
        item.variable.name === 'schemes/outlineHighest' ||
        item.variable.name.endsWith('outlineHighest'),
    ) ||
    allVars.find(
      (item) =>
        item.variable.name === 'outlineBase' ||
        item.variable.name.endsWith('outlineBase') ||
        item.variable.name === 'outlineHighest' ||
        item.variable.name.endsWith('outlineHighest'),
    );

  const varBorderColor = foundBorderColor ? foundBorderColor.variable : undefined;

  if (!varGap || !varPadding || !varRadius || !varBorder || !varBorderColor) {
    const missing: string[] = [];
    if (!varGap) missing.push('layout/base (metrics)');
    if (!varPadding) missing.push('layout/base (metrics)');
    if (!varRadius) missing.push('radius/container/base (metrics)');
    if (!varBorder) missing.push('constant/one (metrics)');
    if (!varBorderColor) missing.push('outlineBase / outlineHighest (schemes)');
    figma.notify(`Missing variables: ${missing.join(', ')}.`, { error: true });
    return;
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
    ensureScope(varGap, 'GAP');
    ensureScope(varPadding, 'GAP');
    ensureScope(varRadius, 'CORNER_RADIUS');
    ensureScope(varBorder, 'STROKE_FLOAT');
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
    if ('name' in node && typeof node.name === 'string') {
      if (/^frame(\s*\d+)?$/i.test(node.name.trim())) {
        node.name = 'container';
      } else {
        const lower = node.name.toLowerCase();
        if (node.name !== lower) {
          node.name = lower;
        }
      }
    }

    if (node.layoutMode === 'NONE') {
      node.layoutMode = 'HORIZONTAL';
      node.layoutWrap = 'WRAP';
      node.primaryAxisSizingMode = 'AUTO';
      node.counterAxisSizingMode = 'AUTO';
      node.fills = [];
    }

    const safeBind = (prop: any, variable: Variable) => {
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
    safeBind('topLeftRadius', varRadius);
    safeBind('topRightRadius', varRadius);
    safeBind('bottomLeftRadius', varRadius);
    safeBind('bottomRightRadius', varRadius);

    if ('cornerSmoothing' in node) {
      node.cornerSmoothing = 0.6;
    }

    try {
      node.dashPattern = [4, 4];
      node.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      const newStrokes = [...(node.strokes as readonly Paint[])].map((paint) => {
        if (paint.type === 'SOLID') {
          return figma.variables.setBoundVariableForPaint(paint, 'color', varBorderColor);
        }
        return paint;
      });
      node.strokes = newStrokes;
      safeBind('strokeWeight', varBorder);
    } catch (e: any) {
      errors.push(`${node.name} [strokes] -> ${e.message}`);
    }

    totalSuccess++;
  }

  if (errors.length > 0) {
    figma.notify(`Configured ${totalSuccess} Component Set(s) with warnings: ${errors[0]}`);
  } else {
    figma.notify(`Configured ${totalSuccess} Component Set${totalSuccess > 1 ? 's' : ''}! ⚡`);
  }
}

async function applyVariantMetrics(selection: readonly SceneNode[]) {
  const allVars = await getAllRelevantVariablesForComponentSet();

  const metricsVars = allVars.filter(
    (item) => item.collectionName.toLowerCase() === 'metrics',
  );

  const getMetricsVar = (varName: string) => {
    let found = metricsVars.find(
      (item) =>
        item.variable.name === varName ||
        item.variable.name === `metrics/${varName}` ||
        item.variable.name.endsWith(`/${varName}`),
    );
    if (!found) {
      found = allVars.find(
        (item) =>
          item.variable.name === `metrics/${varName}` ||
          item.variable.name === varName ||
          item.variable.name.endsWith(`/${varName}`),
      );
    }
    return found ? found.variable : undefined;
  };

  const varNone = getMetricsVar('constant/none') || getMetricsVar('none') || getMetricsVar('constant/zero') || getMetricsVar('zero');
  const varLayoutBase = getMetricsVar('layout/base');
  const varLayoutMassive = getMetricsVar('layout/massive');
  const varLayoutLarge = getMetricsVar('layout/large');
  const varRadiusBase = getMetricsVar('radius/container/base');
  const varRadiusExtraHuge = getMetricsVar('radius/container/extraHuge');
  const varRadiusExtraLarge = getMetricsVar('radius/container/extraLarge');
  const varRadiusHuge = getMetricsVar('radius/container/huge') || getMetricsVar('radius/huge');
  const varBorderOne = getMetricsVar('constant/one');

  const schemesVars = allVars.filter(
    (item) => item.collectionName.toLowerCase() === 'schemes',
  );

  const foundOutlineBase =
    schemesVars.find(
      (item) =>
        item.variable.name === 'outlineBase' ||
        item.variable.name === 'schemes/outlineBase' ||
        item.variable.name.endsWith('outlineBase') ||
        item.variable.name === 'outlineHighest' ||
        item.variable.name === 'schemes/outlineHighest' ||
        item.variable.name.endsWith('outlineHighest'),
    ) ||
    allVars.find(
      (item) =>
        item.variable.name === 'outlineBase' ||
        item.variable.name.endsWith('outlineBase') ||
        item.variable.name === 'outlineHighest' ||
        item.variable.name.endsWith('outlineHighest'),
    );

  const varOutlineBase = foundOutlineBase ? foundOutlineBase.variable : undefined;

  const foundSurfaceBackground =
    schemesVars.find(
      (item) =>
        item.variable.name === 'surfaceBackground' ||
        item.variable.name === 'schemes/surfaceBackground' ||
        item.variable.name.endsWith('surfaceBackground') ||
        item.variable.name === 'background' ||
        item.variable.name === 'schemes/background' ||
        item.variable.name.endsWith('background'),
    ) ||
    allVars.find(
      (item) =>
        item.variable.name === 'surfaceBackground' ||
        item.variable.name.endsWith('surfaceBackground') ||
        item.variable.name === 'background' ||
        item.variable.name.endsWith('background'),
    );

  const varSurfaceBackground = foundSurfaceBackground ? foundSurfaceBackground.variable : undefined;

  const layoutVars = allVars.filter(
    (item) => item.collectionName.toLowerCase() === 'layout' || item.collectionName.toLowerCase() === '_layout',
  );

  const getLayoutVar = (varName: string) => {
    let found = layoutVars.find(
      (item) =>
        item.variable.name === varName ||
        item.variable.name === `layout/${varName}` ||
        item.variable.name === `_layout/${varName}` ||
        item.variable.name.endsWith(`/${varName}`),
    );
    if (!found) {
      found = allVars.find(
        (item) =>
          item.variable.name === varName ||
          item.variable.name === `layout/${varName}` ||
          item.variable.name === `_layout/${varName}` ||
          item.variable.name.endsWith(`/${varName}`),
      );
    }
    return found ? found.variable : undefined;
  };

  const varMaxWidthScreen = getLayoutVar('maxWidth/screen');
  const varMaxHeightScreen = getLayoutVar('maxHeight/screen');

  if (!varLayoutBase || !varRadiusBase) {
    const missing: string[] = [];
    if (!varLayoutBase) missing.push('layout/base (metrics)');
    if (!varRadiusBase) missing.push('radius/container/base (metrics)');
    figma.notify(`Missing variables: ${missing.join(', ')}.`, { error: true });
    return;
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
    if ('name' in node && typeof node.name === 'string') {
      if (/^frame(\s*\d+)?$/i.test(node.name.trim())) {
        node.name = 'container';
      } else {
        const lower = node.name.toLowerCase();
        if (node.name !== lower) {
          node.name = lower;
        }
      }
    }

    const isFigmaSection = node.type === 'SECTION';
    const isFrameSection = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'section';
    const isMainLayer = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'main';
    const isComponentLayer = node.type === 'FRAME' && node.name.trim().toLowerCase() === 'component';
    const isScreenLayer = (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || 'layoutMode' in node) && node.name.trim().toLowerCase() === 'screen';

    if (isFigmaSection) {
      const radiusToUse = varRadiusExtraHuge || varRadiusBase;
      try {
        if ('setBoundVariable' in node) {
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
        if ('layoutMode' in node && node.layoutMode !== 'NONE') {
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
        if ('topLeftRadius' in node) {
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
        if ('layoutMode' in node && node.layoutMode !== 'NONE') {
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
    } else if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
      try {
        if (varNone) {
          if ('layoutMode' in node && node.layoutMode !== 'NONE') {
            node.setBoundVariable('itemSpacing', varNone);
            node.setBoundVariable('counterAxisSpacing', varNone);
            node.setBoundVariable('paddingTop', varNone);
            node.setBoundVariable('paddingBottom', varNone);
            node.setBoundVariable('paddingLeft', varNone);
            node.setBoundVariable('paddingRight', varNone);
          }
          if ('cornerRadius' in node) {
            (node as any).setBoundVariable('cornerRadius', varNone);
          }
          if ('topLeftRadius' in node) {
            node.setBoundVariable('topLeftRadius', varNone);
            node.setBoundVariable('topRightRadius', varNone);
            node.setBoundVariable('bottomLeftRadius', varNone);
            node.setBoundVariable('bottomRightRadius', varNone);
          }
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
            node.setBoundVariable('itemSpacing', varNone);
            node.setBoundVariable('counterAxisSpacing', varNone);
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
          if ('cornerSmoothing' in node) {
            node.cornerSmoothing = 0.6;
          }
        }
        count++;
      } catch (e) {
        console.error('Error binding variable:', e);
      }
    }
  }

  figma.notify(`Updated ${count} elements with base metrics! ⚡`);
}

async function runComponentSetLogic() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('Please select something on the canvas to configure Component Set.', { error: true });
    return;
  }

  // 1. Identify standalone components that are not already part of a component set
  const standaloneComponents = selection.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT' && (!node.parent || node.parent.type !== 'COMPONENT_SET')
  );

  const newlyCreatedComponentSets: ComponentSetNode[] = [];

  for (const comp of standaloneComponents) {
    try {
      let originalName = comp.name.trim();
      if (/^frame(\s*\d+)?$/i.test(originalName)) {
        originalName = 'container';
      }
      const parent = (comp.parent && 'children' in comp.parent) ? comp.parent : figma.currentPage;
      const compSet = figma.combineAsVariants([comp], parent as BaseNode & ChildrenMixin);
      compSet.name = originalName.toLowerCase();
      comp.name = 'type=default';
      newlyCreatedComponentSets.push(compSet);
    } catch (err: any) {
      console.error('Error combining component into component set:', err);
      figma.notify(`Could not convert "${comp.name}" to Component Set: ${err.message}`, { error: true });
    }
  }

  // 2. Existing component sets selected directly
  const existingComponentSets = selection.filter(
    (node): node is ComponentSetNode => node.type === 'COMPONENT_SET',
  );

  const allComponentSets = [...existingComponentSets, ...newlyCreatedComponentSets];

  if (allComponentSets.length > 0) {
    await setupComponentSets(allComponentSets);
  }

  // 3. Other nodes (excluding component sets and standalone components that were converted)
  const otherNodes = selection.filter(
    (node) => node.type !== 'COMPONENT_SET' && !standaloneComponents.includes(node as ComponentNode)
  );

  if (otherNodes.length > 0) {
    await applyVariantMetrics(otherNodes);
  }

  // If new component sets were created, select them and update UI inspector
  if (newlyCreatedComponentSets.length > 0) {
    figma.currentPage.selection = allComponentSets;
    await sendSelectionToUI();
  }
}

async function organizeElementsOnCanvas() {
  const selection = figma.currentPage.selection;
  let nodes: SceneNode[] = [];

  if (selection.length > 1) {
    nodes = Array.from(selection);
  } else {
    // Top-level children on the current page
    nodes = figma.currentPage.children.filter(
      (n): n is SceneNode => !n.locked && 'x' in n && 'y' in n && 'width' in n && 'height' in n
    );
  }

  if (nodes.length === 0) {
    figma.notify('No elements found to arrange on canvas.', { error: true });
    return;
  }

  // Find start anchor position (minX, minY)
  let startX = Math.min(...nodes.map((n) => n.x));
  let startY = Math.min(...nodes.map((n) => n.y));
  if (!isFinite(startX)) startX = 0;
  if (!isFinite(startY)) startY = 0;

  // Group elements by primary name segment before the first slash ('/')
  const groupsMap = new Map<string, { displayKey: string; items: SceneNode[] }>();

  for (const node of nodes) {
    const rawName = (node.name || '').trim();
    const slashIndex = rawName.indexOf('/');
    const groupName = slashIndex !== -1 ? rawName.substring(0, slashIndex).trim() : rawName;
    const normalizedKey = groupName.toLowerCase();

    if (!groupsMap.has(normalizedKey)) {
      groupsMap.set(normalizedKey, { displayKey: groupName, items: [] });
    }
    groupsMap.get(normalizedKey)!.items.push(node);
  }

  // Sort groups alphabetically by group name
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) =>
    a.displayKey.localeCompare(b.displayKey, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Sort items within each group alphabetically by full name
  for (const grp of sortedGroups) {
    grp.items.sort((a, b) =>
      (a.name || '').localeCompare((b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  const GAP_X = 272;
  const GAP_Y = 272;

  let currentX = startX;

  for (const grp of sortedGroups) {
    const columnWidth = Math.max(...grp.items.map((n) => n.width || 0), 0);
    let currentY = startY;

    for (const item of grp.items) {
      try {
        item.x = currentX;
        item.y = currentY;
      } catch (err) {
        console.warn(`Could not set position for "${item.name}":`, err);
      }
      currentY += (item.height || 0) + GAP_Y;
    }

    currentX += columnWidth + GAP_X;
  }

  // Zoom/scroll viewport to show all arranged nodes
  figma.viewport.scrollAndZoomIntoView(nodes);

  // Collapse all container layers in the Layers panel (equivalent to Alt + L)
  function collapseContainers(node: BaseNode) {
    if ('expanded' in node) {
      try {
        (node as any).expanded = false;
      } catch (err) {}
    }
    if ('children' in node && Array.isArray((node as any).children)) {
      for (const child of (node as any).children) {
        collapseContainers(child);
      }
    }
  }

  collapseContainers(figma.currentPage);

  // Deselect all elements on canvas
  figma.currentPage.selection = [];
  await sendSelectionToUI();

  figma.notify(`Arranged ${nodes.length} element${nodes.length > 1 ? 's' : ''} in ${sortedGroups.length} column group${sortedGroups.length > 1 ? 's' : ''} & collapsed layers! 📐`);
}

// Message Router
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'scan') {
    await scanDocument(msg.scope || 'page');
  } else if (msg.type === 'arrange-grid') {
    await organizeElementsOnCanvas();
  } else if (msg.type === 'get-selection') {
    sendSelectionToUI();
  } else if (msg.type === 'select-nodes') {
    const ids: string[] = msg.nodeIds || [];
    const nodesToSelect: SceneNode[] = [];

    for (const id of ids) {
      const node = await figma.getNodeByIdAsync(id);
      if (node && 'visible' in node) {
        nodesToSelect.push(node as SceneNode);
      }
    }

    if (nodesToSelect.length > 0) {
      const firstNode = nodesToSelect[0];
      let parent: BaseNode | null = firstNode;
      while (parent && parent.type !== 'PAGE') {
        parent = parent.parent;
      }
      if (parent && parent.type === 'PAGE' && figma.currentPage !== parent) {
        figma.currentPage = parent as PageNode;
      }

      figma.currentPage.selection = nodesToSelect;
      figma.viewport.scrollAndZoomIntoView(nodesToSelect);
      figma.notify(`Selected ${nodesToSelect.length} layer${nodesToSelect.length > 1 ? 's' : ''}`);
    } else {
      figma.notify('Selected layers no longer exist on canvas', { error: true });
    }
  } else if (msg.type === 'run-component-set') {
    await runComponentSetLogic();
    await scanDocument('page');
  } else if (msg.type === 'save-description') {
    const descText = typeof msg.description === 'string' ? msg.description.trim() : '';

    if (!descText) {
      figma.notify('Description is empty.', { error: true });
      return;
    }

    let normalizedMarkdown = descText;
    if ('util' in figma && typeof (figma as any).util?.normalizeMarkdown === 'function') {
      try {
        normalizedMarkdown = (figma as any).util.normalizeMarkdown(descText);
      } catch (e) {
        console.warn('Markdown normalization error:', e);
      }
    }

    const targetsToUpdate = new Set<ComponentNode | ComponentSetNode>();

    function resolveTargetNodes(node: BaseNode | null) {
      if (!node) return;
      let curr: BaseNode | null = node;
      while (curr) {
        if (curr.type === 'COMPONENT_SET') {
          // Update ONLY the ComponentSetNode itself, NOT child variants
          targetsToUpdate.add(curr as ComponentSetNode);
          break;
        }
        if (curr.type === 'COMPONENT') {
          // Update ONLY the specific ComponentNode (variant)
          targetsToUpdate.add(curr as ComponentNode);
          break;
        }
        if (curr.type === 'INSTANCE') {
          const main = (curr as InstanceNode).mainComponent;
          if (main) {
            targetsToUpdate.add(main);
          }
          break;
        }
        curr = curr.parent;
      }
    }

    // 1. Resolve from nodeId asynchronously using getNodeByIdAsync
    if (msg.nodeId) {
      try {
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        resolveTargetNodes(node);
      } catch (err) {
        console.warn('Error fetching node by id:', err);
      }
    }

    // 2. Resolve from all nodes in active selection if targetsToUpdate is empty
    if (targetsToUpdate.size === 0) {
      for (const selNode of figma.currentPage.selection) {
        resolveTargetNodes(selNode);
      }
    }

    let updatedCount = 0;
    for (const target of targetsToUpdate) {
      try {
        if ('description' in target) {
          target.description = descText;
        }
        if ('descriptionMarkdown' in target) {
          (target as any).descriptionMarkdown = normalizedMarkdown;
        }
        updatedCount++;
      } catch (err) {
        console.warn('Could not set description on:', target.name, err);
      }
    }

    if (updatedCount > 0) {
      const firstName = Array.from(targetsToUpdate)[0].name;
      figma.notify(`Applied description to "${firstName}" ✨`);
      sendSelectionToUI();
      figma.ui.postMessage({
        type: 'description-saved',
        name: firstName,
        description: descText,
        success: true
      });
    } else {
      figma.notify('Please select a Component or Component Set on canvas.', {
        error: true,
      });
      figma.ui.postMessage({
        type: 'description-saved',
        success: false,
        message: 'No Component or Component Set found in selection.'
      });
    }
  } else if (msg.type === 'save-batch-descriptions') {
    const { items } = msg as { items: Array<{ nodeId: string; description: string }> };
    let savedCount = 0;

    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const node = await figma.getNodeByIdAsync(item.nodeId);
          if (node && ('description' in node)) {
            const comp = node as ComponentNode | ComponentSetNode;
            comp.description = item.description;
            if ('descriptionMarkdown' in comp) {
              let norm = item.description;
              if ('util' in figma && typeof (figma as any).util?.normalizeMarkdown === 'function') {
                try {
                  norm = (figma as any).util.normalizeMarkdown(item.description);
                } catch (e) {
                  // ignore
                }
              }
              (comp as any).descriptionMarkdown = norm;
            }
            savedCount++;
          }
        } catch (err) {
          console.warn('Batch item error:', err);
        }
      }
    }

    figma.notify(`Applied descriptions to ${savedCount} variants! ✨`);
    sendSelectionToUI();
  } else if (msg.type === 'save-api-config') {
    if (typeof msg.apiKey === 'string') {
      await figma.clientStorage.setAsync('gemini_api_key', msg.apiKey);
    }
    if (typeof msg.selectedModel === 'string') {
      await figma.clientStorage.setAsync('gemini_selected_model', msg.selectedModel);
    }
    if (typeof msg.promptTone === 'string') {
      await figma.clientStorage.setAsync('gemini_prompt_tone', msg.promptTone);
    }
    figma.notify('Google Gemini settings saved! ⚡');
  } else if (msg.type === 'clear-api-config') {
    await figma.clientStorage.deleteAsync('gemini_api_key');
    await figma.clientStorage.deleteAsync('gemini_selected_model');
    figma.notify('Google Gemini disconnected.');
  }
};

// Perform initial scan on launch
scanDocument('page');
