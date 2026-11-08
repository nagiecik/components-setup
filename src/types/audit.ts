export interface VariableSubUsageGroup {
  subProperty: string; // e.g. "Top-Left", "Top-Right", "Left", "Right", "Width", "Height" or ""
  layerTypeKey: string;
  layerTypeName: string;
  count: number;
  nodeIds: string[];
}

export interface VariableCategoryGroup {
  categoryName: string; // e.g. "Radius", "Gap", "Padding", "Border", "Size", "Opacity"
  totalCount: number;
  allNodeIds: string[];
  subGroups: VariableSubUsageGroup[];
}

export interface VariableResult {
  id: string;
  name: string;
  value: string | number;
  totalUsages: number;
  isMissing?: boolean;
  categories: VariableCategoryGroup[];
}

export interface AuditIssue {
  id: string;
  nodeId: string;
  nodeIds?: string[];
  count?: number;
  nodeName: string;
  layerType: string;
  layerTypeName: string;
  category: 'gap' | 'padding' | 'radius' | 'color' | 'stroke';
  categoryLabel: string;
  property: string;
  propertyLabel: string;
  issueType: 'unbound' | 'missing';
  value: number | string;
  formattedValue: string;
  varId?: string;
  varName?: string;
  suggestion?: string;
  isIgnored?: boolean;
}

export interface AuditSummary {
  totalIssues: number;
  totalOccurrences?: number;
  unboundCount: number;
  missingCount: number;
  gapCount: number;
  paddingCount: number;
  radiusCount: number;
  colorCount: number;
  strokeCount: number;
  scannedNodesCount: number;
  scope: 'selection' | 'page';
  activeCount?: number;
  ignoredCount?: number;
}

export interface SerializedVariant {
  id: string;
  name: string;
  parentComponentSetName?: string | null;
  variantProperties: Record<string, string> | null;
  description: string;
}

export interface SelectionData {
  hasSelection: boolean;
  count: number;
  type: 'NONE' | 'COMPONENT_SET' | 'COMPONENT' | 'VARIANT' | 'MULTIPLE_VARIANTS' | 'MULTIPLE_COMPONENTS' | 'FRAME' | 'OTHER';
  typeName: string;
  nodeId: string | null;
  name: string;
  description: string;
  documentationLink?: string | null;
  parentComponentSetName: string | null;
  variantProperties: Record<string, string> | null;
  variants: SerializedVariant[];
  canApplyMetrics: boolean;
}

// ==========================================
// UNIFIED DESIGN SYSTEM TOKEN REGISTRY
// ==========================================
export interface TokenColorDef {
  hex: string;
  variableName: string;
}

