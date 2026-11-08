import { loadFontsForTextNode } from '../utils/fonts';

export interface ScannedFontSpecGroup {
  specKey: string;
  familyKey: string;
  family: string;
  style: string;
  size: string;
  lineHeight: string;
  nodeIds: string[];
  layerCount: number;
}

export interface ScannedFontFamilyGroup {
  familyKey: string;
  family: string;
  styles: string[];
  specsSummary: string[];
  nodeIds: string[];
  layerCount: number;
}

export interface FontScanResult {
  hasSelection: boolean;
  selectionCount: number;
  totalTextNodes: number;
  specGroups: ScannedFontSpecGroup[];
  familyGroups: ScannedFontFamilyGroup[];
  detectedFamilies: string[];
  availableFonts?: Record<string, string[]>;
}

export interface FontSwapRule {
  mode: 'spec' | 'family-group' | 'bulk-family';
  specKey?: string;
  sourceFamily: string;
  sourceStyle?: string;
  sourceSize?: string;
  sourceLineHeight?: string;
  targetFamily: string;
  targetStyle?: string;
  nodeIds?: string[];
}

let cachedAvailableFontsMap: Record<string, string[]> | null = null;

const WEIGHT_RANK_MAP: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\b(thin|hairline|100)\b/i, weight: 100 },
  { pattern: /\b(extralight|extra\s*light|ultralight|ultra\s*light|200)\b/i, weight: 200 },
  { pattern: /\b(light|300)\b/i, weight: 300 },
  { pattern: /\b(regular|normal|book|roman|text|400)\b/i, weight: 400 },
  { pattern: /\b(medium|500)\b/i, weight: 500 },
  { pattern: /\b(semibold|semi\s*bold|demibold|demi\s*bold|600)\b/i, weight: 600 },
  { pattern: /\b(extrabold|extra\s*bold|ultrabold|ultra\s*bold|heavy|800)\b/i, weight: 800 },
  { pattern: /\b(bold|700)\b/i, weight: 700 },
  { pattern: /\b(black|extrablack|ultra\s*black|900)\b/i, weight: 900 },
];

export function estimateStyleWeight(styleName: string): { weight: number; isItalic: boolean } {
  const s = (styleName || 'Regular').trim();
  const isItalic = /\b(italic|oblique|slanted)\b/i.test(s);
  for (const entry of WEIGHT_RANK_MAP) {
    if (entry.pattern.test(s)) {
      return { weight: entry.weight, isItalic };
    }
  }
  return { weight: 400, isItalic };
}

export function findClosestFontStyle(sourceStyle: string, availableStyles: string[]): string {
  if (!availableStyles || availableStyles.length === 0) return 'Regular';
  if (availableStyles.includes(sourceStyle)) return sourceStyle;

  const lowerSource = (sourceStyle || '').trim().toLowerCase();
  const caseInsensitiveMatch = availableStyles.find((st) => st.toLowerCase() === lowerSource);
  if (caseInsensitiveMatch) return caseInsensitiveMatch;

  const sourceMeta = estimateStyleWeight(sourceStyle);

  let bestStyle = availableStyles[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of availableStyles) {
    const candMeta = estimateStyleWeight(candidate);
    const weightDiff = Math.abs(candMeta.weight - sourceMeta.weight);
    const italicPenalty = candMeta.isItalic !== sourceMeta.isItalic ? 150 : 0;
    const score = weightDiff + italicPenalty;
    if (score < bestScore) {
      bestScore = score;
      bestStyle = candidate;
    }
  }

  return bestStyle;
}

export async function getAvailableFontsMap(): Promise<Record<string, string[]>> {
  if (cachedAvailableFontsMap) {
    return cachedAvailableFontsMap;
  }

  const map: Record<string, string[]> = {};
  try {
    const availableFonts = await figma.listAvailableFontsAsync();
    for (const item of availableFonts) {
      if (!item || !item.fontName || !item.fontName.family) continue;
      const fam = item.fontName.family;
      const st = item.fontName.style || 'Regular';
      if (!map[fam]) {
        map[fam] = [];
      }
      if (!map[fam].includes(st)) {
        map[fam].push(st);
      }
    }
  } catch (err) {
    console.warn('[FontReplacer] Failed to list available fonts:', err);
  }

  cachedAvailableFontsMap = map;
  return map;
}

export function formatFontSize(size: number): string {
  const rounded = Math.round(Number(size) * 10) / 10;
  return `${rounded}px`;
}

export function formatLineHeight(lh: LineHeight | PluginAPI['mixed']): string {
  if (!lh || lh === figma.mixed) return 'Auto';
  if (lh.unit === 'AUTO') return 'Auto';
  if (lh.unit === 'PIXELS') {
    const val = Math.round(Number(lh.value) * 10) / 10;
    return `${val}px`;
  }
  if (lh.unit === 'PERCENT') {
    const val = Math.round(Number(lh.value) * 10) / 10;
    return `${val}%`;
  }
  return 'Auto';
}

export function buildSpecSignature(
  family: string,
  style: string,
  sizeStr: string,
  lineHeightStr: string
): string {
  return `${family}::${style}::${sizeStr}::${lineHeightStr}`;
}

function collectTextNodesRecursive(nodes: readonly SceneNode[], result: TextNode[] = []): TextNode[] {
  for (const node of nodes) {
    if (!node || node.removed) continue;
    if (node.type === 'TEXT') {
      result.push(node);
    } else if ('children' in node && Array.isArray(node.children)) {
      collectTextNodesRecursive(node.children as readonly SceneNode[], result);
    }
  }
  return result;
}

interface ExtractedSegmentSpec {
  family: string;
  style: string;
  size: string;
  lineHeight: string;
  specKey: string;
}

function extractSpecsFromTextNode(node: TextNode): ExtractedSegmentSpec[] {
  const specs: ExtractedSegmentSpec[] = [];

  if (
    node.fontName !== figma.mixed &&
    node.fontSize !== figma.mixed &&
    node.lineHeight !== figma.mixed
  ) {
    const fontName = node.fontName as FontName;
    const family = fontName.family || 'Unknown';
    const style = fontName.style || 'Regular';
    const size = formatFontSize(node.fontSize as number);
    const lineHeight = formatLineHeight(node.lineHeight as LineHeight);
    specs.push({
      family,
      style,
      size,
      lineHeight,
      specKey: buildSpecSignature(family, style, size, lineHeight),
    });
    return specs;
  }

  try {
    if (typeof node.getStyledTextSegments === 'function') {
      const segments = node.getStyledTextSegments(['fontName', 'fontSize', 'lineHeight']);
      const seenInNode = new Set<string>();
      for (const seg of segments) {
        if (!seg.fontName) continue;
        const family = seg.fontName.family || 'Unknown';
        const style = seg.fontName.style || 'Regular';
        const size = formatFontSize(seg.fontSize);
        const lineHeight = formatLineHeight(seg.lineHeight);
        const specKey = buildSpecSignature(family, style, size, lineHeight);
        if (!seenInNode.has(specKey)) {
          seenInNode.add(specKey);
          specs.push({ family, style, size, lineHeight, specKey });
        }
      }
    }
  } catch (err) {
    console.warn('[FontReplacer] Failed to read styled text segments for node:', node.id, err);
  }

  return specs;
}

export async function scanSelectionFonts(includeAvailableFonts: boolean = false): Promise<FontScanResult> {
  const selection = figma.currentPage.selection;
  const textNodes = collectTextNodesRecursive(selection);

  const specMap = new Map<string, ScannedFontSpecGroup>();
  const familyMap = new Map<string, {
    family: string;
    stylesSet: Set<string>;
    specsSet: Set<string>;
    nodeIdsSet: Set<string>;
  }>();

  for (const textNode of textNodes) {
    const nodeSpecs = extractSpecsFromTextNode(textNode);
    for (const sp of nodeSpecs) {
      let existingSpec = specMap.get(sp.specKey);
      if (!existingSpec) {
        existingSpec = {
          specKey: sp.specKey,
          familyKey: sp.family,
          family: sp.family,
          style: sp.style,
          size: sp.size,
          lineHeight: sp.lineHeight,
          nodeIds: [],
          layerCount: 0,
        };
        specMap.set(sp.specKey, existingSpec);
      }
      if (!existingSpec.nodeIds.includes(textNode.id)) {
        existingSpec.nodeIds.push(textNode.id);
        existingSpec.layerCount = existingSpec.nodeIds.length;
      }

      let famEntry = familyMap.get(sp.family);
      if (!famEntry) {
        famEntry = {
          family: sp.family,
          stylesSet: new Set<string>(),
          specsSet: new Set<string>(),
          nodeIdsSet: new Set<string>(),
        };
        familyMap.set(sp.family, famEntry);
      }
      famEntry.stylesSet.add(sp.style);
      famEntry.specsSet.add(`${sp.size} / ${sp.lineHeight} • ${sp.style}`);
      famEntry.nodeIdsSet.add(textNode.id);
    }
  }

  const specGroups = Array.from(specMap.values()).sort((a, b) => {
    if (b.layerCount !== a.layerCount) return b.layerCount - a.layerCount;
    const famCmp = a.family.localeCompare(b.family);
    if (famCmp !== 0) return famCmp;
    return parseFloat(b.size) - parseFloat(a.size);
  });

  const familyGroups: ScannedFontFamilyGroup[] = Array.from(familyMap.values())
    .map((entry) => {
      const nodeIds = Array.from(entry.nodeIdsSet);
      return {
        familyKey: entry.family,
        family: entry.family,
        styles: Array.from(entry.stylesSet),
        specsSummary: Array.from(entry.specsSet),
        nodeIds,
        layerCount: nodeIds.length,
      };
    })
    .sort((a, b) => {
      if (b.layerCount !== a.layerCount) return b.layerCount - a.layerCount;
      return a.family.localeCompare(b.family);
    });

  const detectedFamilies = familyGroups.map((g) => g.family);

  const result: FontScanResult = {
    hasSelection: selection.length > 0,
    selectionCount: selection.length,
    totalTextNodes: textNodes.length,
    specGroups,
    familyGroups,
    detectedFamilies,
  };

  if (includeAvailableFonts || !cachedAvailableFontsMap) {
    result.availableFonts = await getAvailableFontsMap();
  }

  return result;
}

function doesSegmentMatchRule(
  segFamily: string,
  segStyle: string,
  segSizeStr: string,
  segLineHeightStr: string,
  rule: FontSwapRule
): boolean {
  const segSpecKey = buildSpecSignature(segFamily, segStyle, segSizeStr, segLineHeightStr);
  if (rule.mode === 'spec') {
    if (rule.specKey) {
      return segSpecKey === rule.specKey;
    }
    return (
      segFamily === rule.sourceFamily &&
      segStyle === (rule.sourceStyle || segStyle) &&
      segSizeStr === (rule.sourceSize || segSizeStr) &&
      segLineHeightStr === (rule.sourceLineHeight || segLineHeightStr)
    );
  }
  return segFamily === rule.sourceFamily;
}

export async function executeFontSwapRules(
  rules: FontSwapRule[]
): Promise<{ updatedLayersCount: number; summaryText: string }> {
  if (!rules || rules.length === 0) {
    return { updatedLayersCount: 0, summaryText: '' };
  }

  const availableFonts = await getAvailableFontsMap();
  const selection = figma.currentPage.selection;
  const allSelectionTextNodes = collectTextNodesRecursive(selection);
  const textNodeById = new Map<string, TextNode>();
  for (const tn of allSelectionTextNodes) {
    textNodeById.set(tn.id, tn);
  }

  for (const rule of rules) {
    if (rule.nodeIds && rule.nodeIds.length > 0) {
      for (const id of rule.nodeIds) {
        if (!textNodeById.has(id)) {
          try {
            const fetched = await figma.getNodeByIdAsync(id);
            if (fetched && fetched.type === 'TEXT' && !fetched.removed) {
              textNodeById.set(fetched.id, fetched as TextNode);
            }
          } catch (e) {}
        }
      }
    }
  }

  const touchedNodeIds = new Set<string>();
  const fontPairsUsed: string[] = [];

  for (const rule of rules) {
    if (!rule.targetFamily) continue;
    const targetStylesForFamily = availableFonts[rule.targetFamily] || ['Regular'];

    const targetNodes: TextNode[] = [];
    if (rule.nodeIds && rule.nodeIds.length > 0) {
      for (const id of rule.nodeIds) {
        const tn = textNodeById.get(id);
        if (tn && !tn.removed) targetNodes.push(tn);
      }
    } else {
      targetNodes.push(...allSelectionTextNodes);
    }

    for (const node of targetNodes) {
      if (!node || node.removed) continue;

      try {
        await loadFontsForTextNode(node);
      } catch (e) {}

      if (
        node.fontName !== figma.mixed &&
        node.fontSize !== figma.mixed &&
        node.lineHeight !== figma.mixed
      ) {
        const currentFont = node.fontName as FontName;
        const sizeStr = formatFontSize(node.fontSize as number);
        const lhStr = formatLineHeight(node.lineHeight as LineHeight);

        if (doesSegmentMatchRule(currentFont.family, currentFont.style, sizeStr, lhStr, rule)) {
          const resolvedStyle =
            rule.targetStyle && targetStylesForFamily.includes(rule.targetStyle)
              ? rule.targetStyle
              : findClosestFontStyle(rule.targetStyle || currentFont.style, targetStylesForFamily);

          const targetFont: FontName = { family: rule.targetFamily, style: resolvedStyle };
          await figma.loadFontAsync(targetFont);

          if (node.textStyleId && node.textStyleId !== '') {
            try {
              await node.setTextStyleIdAsync('');
            } catch {
              try {
                node.textStyleId = '';
              } catch {}
            }
          }

          node.fontName = targetFont;
          touchedNodeIds.add(node.id);
          const pairLabel = `${currentFont.family} ➔ ${targetFont.family} (${targetFont.style})`;
          if (!fontPairsUsed.includes(pairLabel)) fontPairsUsed.push(pairLabel);
        }
      } else {
        try {
          if (typeof node.getStyledTextSegments === 'function') {
            const segments = node.getStyledTextSegments([
              'fontName',
              'fontSize',
              'lineHeight',
              'textStyleId',
            ]);
            let nodeModified = false;

            for (const seg of segments) {
              if (!seg.fontName) continue;
              const segFam = seg.fontName.family;
              const segStyle = seg.fontName.style;
              const segSize = formatFontSize(seg.fontSize);
              const segLh = formatLineHeight(seg.lineHeight);

              if (doesSegmentMatchRule(segFam, segStyle, segSize, segLh, rule)) {
                const resolvedStyle =
                  rule.targetStyle && targetStylesForFamily.includes(rule.targetStyle)
                    ? rule.targetStyle
                    : findClosestFontStyle(rule.targetStyle || segStyle, targetStylesForFamily);

                const targetFont: FontName = { family: rule.targetFamily, style: resolvedStyle };
                await figma.loadFontAsync(targetFont);

                if (seg.textStyleId && seg.textStyleId !== '') {
                  try {
                    if (typeof (node as any).setRangeTextStyleIdAsync === 'function') {
                      await (node as any).setRangeTextStyleIdAsync(seg.start, seg.end, '');
                    } else {
                      node.setRangeTextStyleId(seg.start, seg.end, '');
                    }
                  } catch {}
                }

                node.setRangeFontName(seg.start, seg.end, targetFont);
                nodeModified = true;
                const pairLabel = `${segFam} ➔ ${targetFont.family} (${targetFont.style})`;
                if (!fontPairsUsed.includes(pairLabel)) fontPairsUsed.push(pairLabel);
              }
            }

            if (nodeModified) {
              touchedNodeIds.add(node.id);
            }
          }
        } catch (segErr) {
          console.warn('[FontReplacer] Failed to swap mixed segments on node:', node.id, segErr);
        }
      }
    }
  }

  return {
    updatedLayersCount: touchedNodeIds.size,
    summaryText: fontPairsUsed.join(', '),
  };
}

