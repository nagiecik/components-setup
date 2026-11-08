export function toCamelCase(str: string): string {
  if (!str) return str;
  const withoutId = str.split('#')[0];
  const normalized = withoutId.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').trim();
  if (!cleaned) return str;

  if (cleaned.toLowerCase() === 'ios') {
    return 'iOS';
  }

  if (/^[a-z][a-zA-Z0-9]*$/.test(cleaned)) {
    return cleaned;
  }

  if (/^[A-Z][a-zA-Z0-9]*$/.test(cleaned)) {
    return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  const words = cleaned.split(/[\s\-_]+/).filter(Boolean);
  if (words.length === 0) return cleaned;

  return words
    .map((word, index) => {
      if (word.toLowerCase() === 'ios') {
        return 'iOS';
      }
      const lower = word.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function toPascalCase(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();
  if (!trimmed) return trimmed;

  // Ignore slashes: preserve slash path hierarchy untouched (e.g. "Icons / arrow-left" -> "Icons/ArrowLeft")
  if (trimmed.includes('/')) {
    return trimmed
      .split('/')
      .map((segment) => {
        const segTrim = segment.trim();
        return segTrim ? toPascalCase(segTrim) : segment;
      })
      .join('/');
  }

  const withoutId = trimmed.split('#')[0].trim();
  if (!withoutId) return trimmed;

  // Protect iOS from being split apart by camelCase regex (e.g. "iOS" -> "i OS")
  const protectedStr = withoutId
    .replace(/\b([iI][oO][sS])\b/g, ' ___IOS___ ')
    .replace(/(^|[^a-zA-Z])([iI][oO][sS])(?=[A-Z0-9])/g, '$1 ___IOS___ ')
    .replace(/([a-z0-9])([iI][oO][sS])(?=[^a-zA-Z]|$)/g, '$1 ___IOS___ ')
    .replace(/([a-z0-9])([iI][oO][sS])(?=[A-Z0-9])/g, '$1 ___IOS___ ');

  // Hyphens are removed and each word after a hyphen becomes a new word in PascalCase.
  // Also split on camelCase transitions, underscores, spaces, dots, and non-alphanumeric chars.
  const withSpaces = protectedStr
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-–—_.\s,:]+/g, ' ')
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\s_]+/g, ' ')
    .trim();

  const words = withSpaces.split(/\s+/).filter(Boolean);
  if (words.length === 0) return withoutId;

  const result = words
    .map((word) => {
      if (word === '___IOS___' || word.toLowerCase() === 'ios') {
        return 'iOS';
      }
      if (word === word.toUpperCase() && word.length > 1) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');

  // Final guarantee: any form of Ios/IOS/ios as a distinct token must always be written as iOS
  return result.replace(/(^|[^a-zA-Z]|(?<=[a-z0-9]))(Ios|IOS|ios)(?=[^a-zA-Z]|[A-Z0-9]|$)/g, '$1iOS');
}


export function sanitizePascalCase(str: string): string {
  if (!str) return 'Wrapper';
  let cleaned = str.trim()
    .replace(/[_\-\/\s]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '');
  
  if (!cleaned) return 'Wrapper';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const pascal = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return pascal || 'Wrapper';
}


export const TITLE_CASE_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of',
  'w', 'z', 'i', 'o', 'na', 'do', 'od', 'po', 'za', 'ze', 'we', 'dla', 'pod', 'nad', 'ku'
]);

export function extractWordsForCasing(text: string): string[] {
  if (!text) return [];
  const splitBoundaries = text
    .replace(/([a-z\p{Ll}])([A-Z\p{Lu}])/gu, '$1 $2')
    .replace(/([A-Z\p{Lu}]+)([A-Z\p{Lu}][a-z\p{Ll}])/gu, '$1 $2');
  const words = splitBoundaries.match(/[\p{L}\p{N}]+/gu);
  return words ? Array.from(words) : [];
}

export function convertStringToCase(text: string, caseType: string): string {
  if (!text) return text;
  switch (caseType) {
    case 'sentence': {
      const lower = text.toLowerCase();
      return lower.replace(/(^|[.!?\n]\s*[\s"'\(\[\{„”«»]*)([\p{L}])/gu, (_, prefix, char) => prefix + char.toUpperCase());
    }
    case 'title': {
      const wordRegex = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
      const matches: { word: string; index: number }[] = [];
      let m;
      while ((m = wordRegex.exec(text)) !== null) {
        matches.push({ word: m[0], index: m.index });
      }
      if (matches.length === 0) return text;

      const firstWordIndex = matches[0].index;
      const lastWordIndex = matches[matches.length - 1].index;

      return text.replace(wordRegex, (word, offset) => {
        const lower = word.toLowerCase();
        const isFirst = offset === firstWordIndex;
        const isLast = offset === lastWordIndex;

        const prevSlice = text.slice(0, offset).replace(/\s+$/, '');
        const isAfterSentence = prevSlice.length > 0 && /[.!?:\n]$/.test(prevSlice);

        if (!isFirst && !isLast && !isAfterSentence && TITLE_CASE_STOP_WORDS.has(lower)) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
    }
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'camel': {
      const words = extractWordsForCasing(text);
      if (words.length === 0) return text;
      return words
        .map((w, i) => {
          const lower = w.toLowerCase();
          if (i === 0) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('');
    }
    case 'pascal': {
      const words = extractWordsForCasing(text);
      if (words.length === 0) return text;
      return words
        .map((w) => {
          const lower = w.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('');
    }
    case 'kebab': {
      const words = extractWordsForCasing(text);
      if (words.length === 0) return text;
      return words.map((w) => w.toLowerCase()).join('-');
    }
    default:
      return text;
  }
}


export function isGenericLayerName(name: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  if (/^(frame|group|rectangle|vector|ellipse|line|star|polygon|auto layout|container|box|wrapper|div|element|stack|row|contentstack|contentrow|containerstack)[\s\d_#-]*$/i.test(n)) {
    return true;
  }
  if (/^frame\s*\d+$/i.test(n) || /^group\s*\d+$/i.test(n)) {
    return true;
  }
  return false;
}

