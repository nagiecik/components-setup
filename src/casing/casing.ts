import { loadAllFontsForTextNode } from '../utils/fonts';
import { convertStringToCase } from '../utils/strings';

export async function handleConvertCase(caseType: string, skipInstances: boolean): Promise<void> {
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    figma.notify('Zaznacz warstwę tekstową lub ramkę!', { error: true });
    return;
  }

  const collectedTextNodes: TextNode[] = [];
  const seenIds = new Set<string>();

  function collectTexts(node: SceneNode, isRoot: boolean) {
    if (node.locked) return;

    if (node.type === 'TEXT') {
      if (!seenIds.has(node.id)) {
        seenIds.add(node.id);
        collectedTextNodes.push(node as TextNode);
      }
      return;
    }

    if ('children' in node && Array.isArray((node as any).children)) {
      if (skipInstances && !isRoot && node.type === 'INSTANCE') {
        return;
      }
      for (const child of (node as any).children) {
        collectTexts(child as SceneNode, false);
      }
    }
  }

  for (const sel of selection) {
    collectTexts(sel as SceneNode, true);
  }

  const caseNameMap: Record<string, string> = {
    sentence: 'Sentence case',
    title: 'Title Case',
    upper: 'UPPERCASE',
    lower: 'lowercase',
    camel: 'camelCase',
    pascal: 'PascalCase',
    kebab: 'kebab-case'
  };
  const modeName = caseNameMap[caseType] || caseType;

  if (collectedTextNodes.length === 0) {
    figma.notify('Nie znaleziono odblokowanych warstw tekstowych w zaznaczeniu.', { error: true });
    return;
  }

  let convertedCount = 0;
  const isOneToOneLengthMode = ['sentence', 'title', 'upper', 'lower'].includes(caseType);

  for (const textNode of collectedTextNodes) {
    try {
      const origText = textNode.characters || '';
      if (!origText) continue;

      const newText = convertStringToCase(origText, caseType);

      await loadAllFontsForTextNode(textNode);

      // Reset textCase property to ORIGINAL
      if (textNode.textCase !== figma.mixed) {
        if (textNode.textCase !== 'ORIGINAL') {
          textNode.textCase = 'ORIGINAL';
        }
      } else {
        try {
          textNode.setRangeTextCase(0, textNode.characters.length, 'ORIGINAL');
        } catch (_) {}
      }

      if (newText === origText) {
        convertedCount++;
        continue;
      }

      // Check for rich text / mixed styles preservation
      const isExactSameLength = isOneToOneLengthMode && newText.length === origText.length;
      let segments: any[] = [];
      const hasMixed = textNode.fontName === figma.mixed ||
                       textNode.fills === figma.mixed ||
                       textNode.fontSize === figma.mixed ||
                       (textNode as any).textStyleId === figma.mixed ||
                       (textNode as any).fillStyleId === figma.mixed;

      if (isExactSameLength && hasMixed && typeof (textNode as any).getStyledTextSegments === 'function') {
        try {
          segments = (textNode as any).getStyledTextSegments([
            'fontName',
            'fontSize',
            'letterSpacing',
            'lineHeight',
            'fills',
            'textDecoration',
            'textStyleId',
            'fillStyleId'
          ]);
        } catch (_) {}
      }

      textNode.characters = newText;

      // Restore styled segments if length was 1:1 and had mixed styles
      if (segments && segments.length > 0) {
        for (const seg of segments) {
          const s = seg.start;
          const e = Math.min(seg.end, newText.length);
          if (e <= s) continue;
          if (seg.textStyleId) {
            try { textNode.setRangeTextStyleId(s, e, seg.textStyleId); } catch (_) {}
          } else {
            if (seg.fontName) try { textNode.setRangeFontName(s, e, seg.fontName); } catch (_) {}
            if (seg.fontSize) try { textNode.setRangeFontSize(s, e, seg.fontSize); } catch (_) {}
            if (seg.letterSpacing) try { textNode.setRangeLetterSpacing(s, e, seg.letterSpacing); } catch (_) {}
            if (seg.lineHeight) try { textNode.setRangeLineHeight(s, e, seg.lineHeight); } catch (_) {}
          }
          if (seg.fillStyleId) {
            try { textNode.setRangeFillStyleId(s, e, seg.fillStyleId); } catch (_) {}
          } else if (seg.fills) {
            try { textNode.setRangeFills(s, e, seg.fills); } catch (_) {}
          }
          if (seg.textDecoration) {
            try { textNode.setRangeTextDecoration(s, e, seg.textDecoration); } catch (_) {}
          }
        }
      }

      convertedCount++;
    } catch (nodeErr) {
      console.warn(`[TextCase] Error converting node ${textNode.name}:`, nodeErr);
    }
  }

  figma.notify(`Przekonwertowano ${convertedCount} warstw tekstowych na ${modeName}`);
}

// Message Router
