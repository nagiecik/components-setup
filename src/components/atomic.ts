import { ResolvedVariable } from '../types/variables';
import { applySlotMetricsAndVariables } from '../slots/slots';
import { toPascalCase } from '../utils/strings';
import { preloadBoundVariablesForRoots } from '../variables/variables';

export function convertFrameToComponentAtomic(
  sourceFrame: FrameNode,
  mode: 'clone-to-page' | 'replace-in-parent',
  preloadedVars?: Map<string, Variable>,
  targetPosition?: { x: number; y: number }
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = sourceFrame.name;

  // 1. Copy base visual & geometry properties BEFORE auto-layout so initial fixed dimensions match
  try {
    comp.resizeWithoutConstraints(Math.max(1, sourceFrame.width), Math.max(1, sourceFrame.height));
  } catch (e) {
    try { comp.resize(Math.max(1, sourceFrame.width), Math.max(1, sourceFrame.height)); } catch (e2) {}
  }

  try { comp.visible = sourceFrame.visible; } catch (e) {}
  try { comp.locked = sourceFrame.locked; } catch (e) {}
  try { comp.opacity = sourceFrame.opacity; } catch (e) {}
  try { comp.blendMode = sourceFrame.blendMode; } catch (e) {}
  try { comp.isMask = sourceFrame.isMask; } catch (e) {}
  try { comp.clipsContent = sourceFrame.clipsContent; } catch (e) {}
  try { comp.rotation = sourceFrame.rotation; } catch (e) {}

  // Fills & background style (clone array preserves paint boundVariables)
  try {
    if (sourceFrame.fillStyleId && typeof sourceFrame.fillStyleId === 'string') {
      comp.fillStyleId = sourceFrame.fillStyleId;
    } else if (sourceFrame.fills !== figma.mixed) {
      comp.fills = JSON.parse(JSON.stringify(sourceFrame.fills));
    }
  } catch (e) {}

  // Strokes & individual stroke weights
  try {
    if (sourceFrame.strokeStyleId && typeof sourceFrame.strokeStyleId === 'string') {
      comp.strokeStyleId = sourceFrame.strokeStyleId;
    } else if (sourceFrame.strokes) {
      comp.strokes = JSON.parse(JSON.stringify(sourceFrame.strokes));
    }
  } catch (e) {}
  try { comp.strokeAlign = sourceFrame.strokeAlign; } catch (e) {}
  try { comp.strokeCap = sourceFrame.strokeCap; } catch (e) {}
  try { comp.strokeJoin = sourceFrame.strokeJoin; } catch (e) {}
  try { comp.strokeMiterLimit = sourceFrame.strokeMiterLimit; } catch (e) {}
  try { comp.dashPattern = [...sourceFrame.dashPattern]; } catch (e) {}
  try {
    if (sourceFrame.strokeWeight !== figma.mixed) {
      comp.strokeWeight = sourceFrame.strokeWeight;
    } else {
      comp.strokeTopWeight = sourceFrame.strokeTopWeight;
      comp.strokeBottomWeight = sourceFrame.strokeBottomWeight;
      comp.strokeLeftWeight = sourceFrame.strokeLeftWeight;
      comp.strokeRightWeight = sourceFrame.strokeRightWeight;
    }
  } catch (e) {}

  // Effects & grids
  try {
    if (sourceFrame.effectStyleId && typeof sourceFrame.effectStyleId === 'string') {
      comp.effectStyleId = sourceFrame.effectStyleId;
    } else if (sourceFrame.effects) {
      comp.effects = JSON.parse(JSON.stringify(sourceFrame.effects));
    }
  } catch (e) {}
  try {
    if (sourceFrame.gridStyleId && typeof sourceFrame.gridStyleId === 'string') {
      comp.gridStyleId = sourceFrame.gridStyleId;
    } else if (sourceFrame.layoutGrids) {
      comp.layoutGrids = JSON.parse(JSON.stringify(sourceFrame.layoutGrids));
    }
  } catch (e) {}

  // Corner radii & smoothing
  try { comp.cornerSmoothing = sourceFrame.cornerSmoothing; } catch (e) {}
  try {
    if (sourceFrame.cornerRadius !== figma.mixed) {
      comp.cornerRadius = sourceFrame.cornerRadius;
    } else {
      comp.topLeftRadius = sourceFrame.topLeftRadius;
      comp.topRightRadius = sourceFrame.topRightRadius;
      comp.bottomLeftRadius = sourceFrame.bottomLeftRadius;
      comp.bottomRightRadius = sourceFrame.bottomRightRadius;
    }
  } catch (e) {}

  // Auto-layout properties
  const layoutMode = sourceFrame.layoutMode;
  if (layoutMode && layoutMode !== 'NONE') {
    try { comp.layoutMode = layoutMode; } catch (e) {}
    try { comp.layoutWrap = sourceFrame.layoutWrap; } catch (e) {}
    try { comp.primaryAxisSizingMode = sourceFrame.primaryAxisSizingMode; } catch (e) {}
    try { comp.counterAxisSizingMode = sourceFrame.counterAxisSizingMode; } catch (e) {}
    try { comp.primaryAxisAlignItems = sourceFrame.primaryAxisAlignItems; } catch (e) {}
    try { comp.counterAxisAlignItems = sourceFrame.counterAxisAlignItems; } catch (e) {}
    if (sourceFrame.layoutWrap === 'WRAP') {
      try { comp.counterAxisAlignContent = sourceFrame.counterAxisAlignContent; } catch (e) {}
      if (sourceFrame.counterAxisSpacing !== null) {
        try { comp.counterAxisSpacing = sourceFrame.counterAxisSpacing; } catch (e) {}
      }
    }
    try { comp.paddingTop = sourceFrame.paddingTop; } catch (e) {}
    try { comp.paddingBottom = sourceFrame.paddingBottom; } catch (e) {}
    try { comp.paddingLeft = sourceFrame.paddingLeft; } catch (e) {}
    try { comp.paddingRight = sourceFrame.paddingRight; } catch (e) {}
    try { comp.itemSpacing = sourceFrame.itemSpacing; } catch (e) {}
    try { comp.itemReverseZIndex = sourceFrame.itemReverseZIndex; } catch (e) {}
    try { comp.strokesIncludedInLayout = sourceFrame.strokesIncludedInLayout; } catch (e) {}
  }

  // Min / max constraints
  try { if (sourceFrame.minWidth !== null) comp.minWidth = sourceFrame.minWidth; } catch (e) {}
  try { if (sourceFrame.maxWidth !== null) comp.maxWidth = sourceFrame.maxWidth; } catch (e) {}
  try { if (sourceFrame.minHeight !== null) comp.minHeight = sourceFrame.minHeight; } catch (e) {}
  try { if (sourceFrame.maxHeight !== null) comp.maxHeight = sourceFrame.maxHeight; } catch (e) {}

  // Copy scalar boundVariables on the frame itself
  try {
    const bv = (sourceFrame as any).boundVariables;
    if (bv && typeof bv === 'object') {
      const scalarFields = [
        'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
        'itemSpacing', 'counterAxisSpacing',
        'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
        'strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight', 'strokeWeight',
        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
        'opacity', 'visible'
      ];
      for (const field of scalarFields) {
        const alias = bv[field];
        if (alias && typeof alias.id === 'string') {
          const v = (preloadedVars && preloadedVars.get(alias.id)) ||
            (figma.variables.getVariableById ? figma.variables.getVariableById(alias.id) : null);
          if (v) {
            try { comp.setBoundVariable(field as any, v); } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}

  // 2. Copy or move children and restore their child layout sizing / positioning
  const childrenSnapshot = [...sourceFrame.children];
  for (const child of childrenSnapshot) {
    const cSizingH = 'layoutSizingHorizontal' in child ? (child as any).layoutSizingHorizontal : undefined;
    const cSizingV = 'layoutSizingVertical' in child ? (child as any).layoutSizingVertical : undefined;
    const cPositioning = 'layoutPositioning' in child ? (child as any).layoutPositioning : undefined;
    const cAlign = 'layoutAlign' in child ? (child as any).layoutAlign : undefined;
    const cGrow = 'layoutGrow' in child ? (child as any).layoutGrow : undefined;
    const cX = child.x;
    const cY = child.y;

    const targetChild = mode === 'clone-to-page' ? child.clone() : child;
    comp.appendChild(targetChild);

    if (layoutMode && layoutMode !== 'NONE') {
      try {
        if (cPositioning === 'ABSOLUTE' && 'layoutPositioning' in targetChild) {
          (targetChild as any).layoutPositioning = 'ABSOLUTE';
          targetChild.x = cX;
          targetChild.y = cY;
        } else {
          if (cAlign !== undefined && 'layoutAlign' in targetChild) (targetChild as any).layoutAlign = cAlign;
          if (cGrow !== undefined && 'layoutGrow' in targetChild) (targetChild as any).layoutGrow = cGrow;
          if (cSizingH && 'layoutSizingHorizontal' in targetChild) (targetChild as any).layoutSizingHorizontal = cSizingH;
          if (cSizingV && 'layoutSizingVertical' in targetChild) (targetChild as any).layoutSizingVertical = cSizingV;
        }
      } catch (e) {}
    } else {
      try {
        targetChild.x = cX;
        targetChild.y = cY;
      } catch (e) {}
    }
  }

  // 3. Place component in scenegraph and restore outer sizing
  if (mode === 'clone-to-page') {
    figma.currentPage.appendChild(comp);
    if (targetPosition) {
      comp.x = targetPosition.x;
      comp.y = targetPosition.y;
    }
    if (layoutMode && layoutMode !== 'NONE') {
      try {
        if (sourceFrame.layoutSizingHorizontal === 'HUG') comp.layoutSizingHorizontal = 'HUG';
        if (sourceFrame.layoutSizingVertical === 'HUG') comp.layoutSizingVertical = 'HUG';
      } catch (e) {}
    }
  } else {
    const parent = sourceFrame.parent;
    const frameX = sourceFrame.x;
    const frameY = sourceFrame.y;
    const frameSizingH = sourceFrame.layoutSizingHorizontal;
    const frameSizingV = sourceFrame.layoutSizingVertical;
    const frameAlign = sourceFrame.layoutAlign;
    const frameGrow = sourceFrame.layoutGrow;
    const framePositioning = sourceFrame.layoutPositioning;

    if (parent && 'insertChild' in parent) {
      const idx = parent.children.indexOf(sourceFrame);
      if (idx >= 0) {
        parent.insertChild(idx, comp);
      } else {
        parent.appendChild(comp);
      }
      const parentHasAutoLayout = 'layoutMode' in parent && (parent as any).layoutMode && (parent as any).layoutMode !== 'NONE';
      if (parentHasAutoLayout) {
        try {
          if (framePositioning === 'ABSOLUTE') {
            comp.layoutPositioning = 'ABSOLUTE';
            comp.x = frameX;
            comp.y = frameY;
          } else {
            comp.layoutAlign = frameAlign;
            comp.layoutGrow = frameGrow;
            comp.layoutSizingHorizontal = frameSizingH;
            comp.layoutSizingVertical = frameSizingV;
          }
        } catch (e) {}
      } else {
        comp.x = frameX;
        comp.y = frameY;
        if (layoutMode && layoutMode !== 'NONE') {
          try {
            if (frameSizingH === 'HUG') comp.layoutSizingHorizontal = 'HUG';
            if (frameSizingV === 'HUG') comp.layoutSizingVertical = 'HUG';
          } catch (e) {}
        }
      }
    }
    try {
      sourceFrame.remove();
    } catch (e) {}
  }

  return comp;
}

