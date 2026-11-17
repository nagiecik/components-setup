import { parseHexOrRgb, rgbToHex } from '../utils/colors';
import { convertStringToCase } from '../utils/strings';

export interface PageSummaryItem {
  id: string;
  name: string;
  suggestedTitleCaseName: string;
  needsTitleCase: boolean;
  backgroundHex: string | null;
  isCurrent: boolean;
}

export interface PageScanResult {
  pages: PageSummaryItem[];
  currentPageHex: string;
}

export interface MultiPageUpdateOptions {
  hex?: string;
  applyBackground: boolean;
  applyTitleCase: boolean;
}

export interface MultiPageUpdateResult extends PageScanResult {
  updatedBackgroundCount: number;
  renamedPagesCount: number;
  appliedHex: string | null;
}

export function normalizeHexInput(rawHex: string): string | null {
  const clean = (rawHex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const expanded = clean
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase();
    return `#${expanded}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  return null;
}

function extractSolidBackgroundHex(page: PageNode): string | null {
  try {
    const bgs = page.backgrounds;
    if (Array.isArray(bgs) && bgs.length > 0) {
      const solid = bgs.find((p): p is SolidPaint => p.type === 'SOLID');
      if (solid) {
        return rgbToHex(solid.color.r, solid.color.g, solid.color.b);
      }
    }
  } catch (e) {}
  return null;
}

function buildPageSummaryItem(page: PageNode): PageSummaryItem {
  const suggestedTitleCaseName = convertStringToCase(page.name, 'title');
  return {
    id: page.id,
    name: page.name,
    suggestedTitleCaseName,
    needsTitleCase: suggestedTitleCaseName !== page.name,
    backgroundHex: extractSolidBackgroundHex(page),
    isCurrent: page.id === figma.currentPage.id,
  };
}

export async function scanAllPagesSummary(): Promise<PageScanResult> {
  if (typeof figma.loadAllPagesAsync === 'function') {
    await figma.loadAllPagesAsync();
  }

  const pages: PageSummaryItem[] = [];
  for (const page of figma.root.children) {
    if (page.isPageDivider) continue;
    pages.push(buildPageSummaryItem(page));
  }

  const currentPageHex = extractSolidBackgroundHex(figma.currentPage) || '#1E1E1E';
  return { pages, currentPageHex };
}

export async function applyMultiPageBackgroundAndTitleCase(
  options: MultiPageUpdateOptions
): Promise<MultiPageUpdateResult | null> {
  let normalizedHex: string | null = null;
  let solidPaint: SolidPaint | null = null;

  if (options.applyBackground) {
    normalizedHex = normalizeHexInput(options.hex || '');
    if (!normalizedHex) {
      figma.notify('Invalid HEX color. Use format like #1A1A1A.', { error: true });
      return null;
    }
    const rgb = parseHexOrRgb(normalizedHex);
    solidPaint = { type: 'SOLID', color: rgb, opacity: 1 };
  }

  if (typeof figma.loadAllPagesAsync === 'function') {
    await figma.loadAllPagesAsync();
  }

  let updatedBackgroundCount = 0;
  let renamedPagesCount = 0;

  for (const page of figma.root.children) {
    if (page.isPageDivider) continue;
    if (typeof page.loadAsync === 'function') {
      await page.loadAsync();
    }

    if (solidPaint) {
      try {
        page.backgrounds = [solidPaint];
        updatedBackgroundCount++;
      } catch (err) {
        console.warn(`Could not update background for page "${page.name}":`, err);
      }
    }

    if (options.applyTitleCase) {
      const nextName = convertStringToCase(page.name, 'title');
      if (nextName !== page.name) {
        try {
          page.name = nextName;
          renamedPagesCount++;
        } catch (err) {
          console.warn(`Could not rename page "${page.name}":`, err);
        }
      }
    }
  }

  const scan = await scanAllPagesSummary();
  return {
    ...scan,
    updatedBackgroundCount,
    renamedPagesCount,
    appliedHex: normalizedHex,
  };
}
