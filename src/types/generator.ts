export interface FillOrStrokeDef {
  type?: 'SOLID';
  color?: { r: number; g: number; b: number } | string;
  hex?: string;
  opacity?: number;
  variableName?: string;
}

export interface ComponentNodeDef {
  type?: 'FRAME' | 'TEXT' | 'VECTOR' | 'ELLIPSE' | 'RECTANGLE' | 'SVG' | 'COMPONENT' | 'INSTANCE';
  name?: string;
  componentName?: string;
  variantProperties?: Record<string, string>;
  textStyleName?: string;
  width?: number;
  height?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER';
  layoutGrow?: number;
  layoutAlign?: 'INHERIT' | 'STRETCH';
  itemSpacing?: number;
  itemSpacingVar?: string;
  paddingTop?: number;
  paddingTopVar?: string;
  paddingBottom?: number;
  paddingBottomVar?: string;
  paddingLeft?: number;
  paddingLeftVar?: string;
  paddingRight?: number;
  paddingRightVar?: string;
  maxWidth?: number;
  minWidth?: number;
  maxWidthVar?: string;
  minWidthVar?: string;
  clipsContent?: boolean;
  cornerRadius?: number;
  cornerRadiusVar?: string;
  fills?: FillOrStrokeDef[];
  strokes?: FillOrStrokeDef[];
  strokeWeight?: number;
  strokeTopWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  strokeRightWeight?: number;
  characters?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  letterSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  svgContent?: string;
  children?: ComponentNodeDef[];
}

export interface ComponentVariantDef extends ComponentNodeDef {
  name: string;
}

export interface ComponentSchemaDef {
  name: string;
  description?: string;
  subComponents?: ComponentNodeDef[];
  variants: ComponentVariantDef[];
}

