export interface AiLayerScanItem {
  id: string;
  name: string;
  type: 'FRAME' | 'GROUP' | 'TEXT';
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutWrap?: 'WRAP' | 'NO_WRAP';
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  itemSpacing?: number;
  clipsContent?: boolean;
  isSlot?: boolean;
  parentPath: string;
  depth: number;
  childrenSummary?: Array<{
    type: string;
    name: string;
    characters?: string;
    fontSize?: number | string;
    fontStyle?: string;
    mainComponentName?: string;
    parentComponentName?: string;
  }>;
  peerIds: string[];
  width?: number;
  height?: number;
  containsText: boolean;
  rootComponentName: string;
  characters?: string;
  fontSize?: number | string;
  fontStyle?: string;
  textStyleName?: string;
  fillTokenName?: string;
  isLooseText?: boolean;
  hasInstanceSibling?: boolean;
  prevSiblingType?: string;
  nextSiblingType?: string;
  indexInParent?: number;
  parentName?: string;
  parentLayoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  siblingIndex?: number;
  totalSiblingTexts?: number;
  componentPropertyName?: string;
  suggestedName?: string;
  isDirectRootChild?: boolean;
  hasContentAncestor?: boolean;
}

