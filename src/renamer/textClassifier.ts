import {
  isGenericLayerName,
  sanitizePascalCase,
  toPascalCase
} from '../utils/strings';

const VALID_TEXT_ROLES: string[] = [
  'Title', 'Subtitle', 'Heading', 'Subheading', 'Headline', 'Display',
  'Eyebrow', 'Overline', 'Description', 'Body', 'BodyText', 'Label',
  'Value', 'Placeholder', 'Caption', 'MetaText', 'Timestamp', 'HelperText',
  'ErrorMessage', 'ButtonText', 'BadgeText', 'Prefix', 'Suffix', 'Unit',
  'Shortcut', 'Counter', 'CharacterCount', 'RequiredIndicator', 'OptionalTag',
  'SectionTitle', 'StatusText', 'Icon', 'LeadingIcon', 'TrailingIcon'
];

export const ALLOWED_TEXT_ROLES = new Set(VALID_TEXT_ROLES.map(r => r.toLowerCase()));

export function isAllowedTextRole(name: string): boolean {
  if (!name) return false;
  return ALLOWED_TEXT_ROLES.has(name.trim().toLowerCase());
}

export function getExistingSemanticRole(name: string, characters: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const match = VALID_TEXT_ROLES.find(r => r.toLowerCase() === lower);
  if (!match) return null;

  const chars = (characters || '').trim().toLowerCase();
  if (chars.length > 30 && chars.startsWith(lower)) {
    return null;
  }
  return match;
}

export function normalizeForComparison(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isNameDerivedFromCharacters(nodeName: string, characters: string): boolean {
  if (!nodeName || !characters) return false;
  if (isAllowedTextRole(nodeName)) {
    return false;
  }
  const normName = normalizeForComparison(nodeName);
  const normChars = normalizeForComparison(characters);
  if (!normName || !normChars) return false;

  if (normName === normChars) return true;
  if (normName.length >= 3 && normChars.startsWith(normName)) return true;
  if (normChars.length >= 3 && normName.startsWith(normChars)) return true;

  return false;
}

export function isTimeOrDatePattern(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  if (/\b\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?\b/i.test(t)) return true;
  if (/\b(dzis|dzisiaj|wczoraj|jutro|today|yesterday|tomorrow)\b/i.test(t)) return true;
  if (/\b\d+\s*(m|min|minut|minuty|godz|godzin|godziny|sek|sekund|dni|h|s|d)\s*(temu|ago)\b/i.test(t)) return true;
  if (/\b(teraz|przed chwila|just now|recently|chwile temu)\b/i.test(t)) return true;
  if (/\b\d{1,4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,4}\b/.test(t)) return true;
  if (/\b(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrzesnia|pazdziernika|listopada|grudnia)\b/i.test(t)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(t)) return true;
  if (/\b(logowanie|zalogowano|logowani[ae]|login|last login|updated|zaktualizowano|utworzono|created|timestamp|data|godzina)\b/i.test(t)) return true;
  return false;
}

export function isKeyValueStructure(text: string): boolean {
  if (!text) return false;
  if (/^https?:/i.test(text)) return false;
  return /^[^:\n\r]{2,30}:\s*.+$/i.test(text.trim());
}

export function isMutedColorOrStyle(fillTokenName: string, textStyleName: string): boolean {
  const f = (fillTokenName || '').toLowerCase();
  const s = (textStyleName || '').toLowerCase();
  return /muted|subtle|onsurfacevariant|variant|secondary|tertiary|disabled|placeholder/i.test(f) ||
         /muted|subtle|caption|small|helper/i.test(s);
}

export function getDeterministicTextFallback(item: {
  fontSize?: number | string;
  fontStyle?: string;
  textStyleName?: string;
  fillTokenName?: string;
  characters?: string;
}): string {
  const style = (item.textStyleName || '').toLowerCase();
  const fill = (item.fillTokenName || '').toLowerCase();
  const weight = (item.fontStyle || '').toLowerCase();
  const numSize = typeof item.fontSize === 'number' ? item.fontSize : 14;
  const chars = item.characters || '';

  if (isTimeOrDatePattern(chars)) {
    return 'Timestamp';
  }
  if (style.includes('display') || style.includes('headline') || numSize >= 20) {
    return 'Heading';
  }
  if (style.includes('title') || (numSize >= 16 && (weight.includes('bold') || weight.includes('medium') || weight.includes('semibold')))) {
    return 'Title';
  }
  if (style.includes('caption') || numSize <= 12 || isMutedColorOrStyle(fill, style)) {
    return 'Caption';
  }
  if (style.includes('label')) {
    return 'Label';
  }
  if (style.includes('body') || numSize >= 13) {
    return 'Description';
  }
  return 'Label';
}

export function guardContainerTextSiblingsDeduplication(
  items: Array<{
    node?: SceneNode;
    name: string;
    fontSize: number;
    fontStyle: string;
    textStyleName: string;
    isMuted?: boolean;
  }>
): void {
  const byName = new Map<string, typeof items>();
  for (const item of items) {
    const lower = item.name.toLowerCase();
    if (!byName.has(lower)) byName.set(lower, []);
    byName.get(lower)!.push(item);
  }

  for (const [nameLower, dupes] of byName.entries()) {
    if (dupes.length < 2) continue;

    dupes.sort((a, b) => {
      if (b.fontSize !== a.fontSize) return b.fontSize - a.fontSize;
      const bWeight = /bold|black|heavy|medium|semibold/i.test(b.fontStyle) ? 1 : 0;
      const aWeight = /bold|black|heavy|medium|semibold/i.test(a.fontStyle) ? 1 : 0;
      if (bWeight !== aWeight) return bWeight - aWeight;
      const bTitle = b.textStyleName.toLowerCase().includes('title') ? 1 : 0;
      const aTitle = a.textStyleName.toLowerCase().includes('title') ? 1 : 0;
      return bTitle - aTitle;
    });

    if (nameLower === 'caption') {
      dupes[0].name = dupes[0].textStyleName.toLowerCase().includes('title')
        ? 'Title'
        : (dupes[0].fontSize >= 16 ? 'Title' : 'Value');
      dupes[1].name = 'Caption';
      if (dupes.length > 2) dupes[2].name = 'MetaText';
    } else if (nameLower === 'title') {
      dupes[0].name = 'Title';
      dupes[1].name = dupes[1].textStyleName.toLowerCase().includes('body') ? 'Description' : 'Subtitle';
      if (dupes.length > 2) dupes[2].name = 'Caption';
    } else if (nameLower === 'label') {
      dupes[0].name = 'Label';
      dupes[1].name = 'Value';
    } else if (nameLower === 'value') {
      dupes[0].name = 'Value';
      dupes[1].name = 'Caption';
    }
  }
}

export function classifyTextLayerSemantic(item: {
  currentName?: string;
  characters?: string;
  fontSize?: number | string;
  fontStyle?: string;
  textStyleName?: string;
  fillTokenName?: string;
  parentName?: string;
  parentLayoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  siblingIndex?: number;
  totalSiblingTexts?: number;
  siblingTexts?: Array<{
    name: string;
    characters: string;
    fontSize: number;
    fontStyle: string;
    textStyleName: string;
    isMuted: boolean;
  }>;
  componentPropertyName?: string;
  rootComponentName?: string;
  isLooseText?: boolean;
  hasInstanceSibling?: boolean;
  prevSiblingType?: string;
  nextSiblingType?: string;
  indexInParent?: number;
}): string {
  // PRIORYTET 1: Poszanowanie istniejacej, semantycznej nazwy roboczej (Existing Semantic Name Lock)
  if (item.currentName) {
    const existingRole = getExistingSemanticRole(item.currentName, item.characters || '');
    if (existingRole) {
      return existingRole;
    }
  }
  if (item.componentPropertyName) {
    const propPascal = sanitizePascalCase(item.componentPropertyName);
    const existingRole = getExistingSemanticRole(propPascal, item.characters || '');
    if (existingRole) {
      return existingRole;
    }
  }

  const chars = (item.characters || '').trim();
  const charsLower = chars.toLowerCase();
  const parentName = (item.parentName || '').trim();
  const parentLower = parentName.toLowerCase();
  const rootCompName = (item.rootComponentName || '').trim();
  const rootLower = rootCompName.toLowerCase();
  const styleName = (item.textStyleName || '').toLowerCase();
  const fillName = (item.fillTokenName || '').toLowerCase();
  const weight = (item.fontStyle || '').toLowerCase();
  const fontSize = typeof item.fontSize === 'number' ? item.fontSize : 14;
  const siblingIndex = typeof item.siblingIndex === 'number' ? item.siblingIndex : 0;
  const totalSiblings = typeof item.totalSiblingTexts === 'number' ? item.totalSiblingTexts : 1;
  const isLoose = Boolean(item.isLooseText || item.hasInstanceSibling);
  const prevType = item.prevSiblingType || '';
  const nextType = item.nextSiblingType || '';
  const indexInParent = typeof item.indexInParent === 'number' ? item.indexInParent : siblingIndex;

  const isMuted = isMutedColorOrStyle(fillName, styleName);
  const isSmall = fontSize <= 12 || /small|caption|footnote/i.test(styleName);
  const isUnderComponent = prevType === 'INSTANCE' || prevType === 'FRAME' ||
                           (indexInParent > 0 && (Boolean(item.hasInstanceSibling) || item.parentLayoutMode === 'VERTICAL'));
  const isAboveComponent = indexInParent === 0 && (nextType === 'INSTANCE' || nextType === 'FRAME' || Boolean(item.hasInstanceSibling));

  const isDisplayOrHeadline = styleName.includes('display') || styleName.includes('headline');
  const isTitleStyle = styleName.includes('title');
  const isBodyStyle = styleName.includes('body');
  const isLabelStyle = styleName.includes('label');

  if (/^\d+\s*[\/|\\]\s*\d+$/.test(chars) || parentLower.includes('counter') || (parentLower.includes('footer') && /^\d+/.test(chars))) {
    return 'CharacterCount';
  }
  if (/^(ctrl|cmd|⌘|shift|alt|opt|tab|esc|enter|return)(\+[a-z0-9]+)?$/i.test(chars) || /^(⌘[a-z0-9]|ctrl\s*\+\s*[a-z0-9])$/i.test(chars)) {
    return 'Shortcut';
  }
  if (parentLower.includes('lead') || parentLower.includes('prefix') || parentLower.includes('addon')) {
    if (/^(https?:\/\/|\/|\$|€|£|#)/i.test(chars)) return 'Prefix';
  }
  if (parentLower.includes('trail') || parentLower.includes('suffix') || parentLower.includes('unit') || parentLower.includes('addon')) {
    if (/^(\.com|\.pl|\.org|\.io|pln|usd|eur|kg|g|cm|m|km|px|%|\/h|\/s)$/i.test(chars)) return 'Suffix';
  }
  if (/^(https?:\/\/)/i.test(chars)) return 'Prefix';
  if (/^(\.com|\.pl|\.org|\.io)$/i.test(chars)) return 'Suffix';
  if (/^(pln|usd|eur|\$|€|kg|cm|%|px)$/i.test(chars)) {
    return parentLower.includes('trail') ? 'Suffix' : 'Prefix';
  }
  if (chars === '*' || charsLower === '(opcjonalne)' || charsLower === 'opcjonalne' || charsLower === '(optional)' || charsLower === 'optional') {
    return chars === '*' ? 'RequiredIndicator' : 'OptionalTag';
  }
  if (rootLower.includes('button') || rootLower.includes('btn') || parentLower.includes('button') || parentLower.includes('btn')) {
    return 'ButtonText';
  }

  // Key: Value structure
  if (isKeyValueStructure(chars)) {
    if (isTimeOrDatePattern(chars)) {
      return 'Timestamp';
    }
    if (isUnderComponent || isMuted || isSmall) {
      return 'MetaText';
    }
    if (fontSize >= 15 || weight.includes('bold') || weight.includes('medium') || indexInParent === 0) {
      return 'StatusText';
    }
    return 'Value';
  }

  // PRIORYTET 3: Relacyjna hierarchia wewnatrz jednego kontenera (TextStack / ColumnStack / RowStack)
  if (totalSiblings >= 2 && item.siblingTexts && item.siblingTexts.length >= 2) {
    const siblings = item.siblingTexts;
    if (siblings.length === 2) {
      const top = siblings[0];
      const bot = siblings[1];
      const isTop = siblingIndex === 0;

      // Rozwiazywanie par Case 1: Gorna mniejsza/lzejsza, Dolna wieksza/grubsza/Title
      if (top.fontSize < bot.fontSize || (!top.textStyleName.toLowerCase().includes('title') && bot.textStyleName.toLowerCase().includes('title'))) {
        if (isTop) {
          return top.textStyleName.toLowerCase().includes('caption') ? 'Caption' : (top.textStyleName.toLowerCase().includes('label') ? 'Label' : 'Caption');
        } else {
          return 'Title';
        }
      }

      // Rozwiazywanie par Case 2: Gorna wieksza/Title, Dolna mniejsza/Body/Label
      if (top.fontSize > bot.fontSize || (top.textStyleName.toLowerCase().includes('title') && !bot.textStyleName.toLowerCase().includes('title'))) {
        if (isTop) {
          return 'Title';
        } else {
          if (bot.textStyleName.toLowerCase().includes('body') || (bot.characters && bot.characters.length > 30)) {
            return 'Description';
          }
          return bot.textStyleName.toLowerCase().includes('subtitle') ? 'Subtitle' : (bot.textStyleName.toLowerCase().includes('label') ? 'Subtitle' : 'Caption');
        }
      }

      // Rozwiazywanie par Case 3: Ten sam rozmiar, inna waga/kolor
      if (top.fontSize === bot.fontSize) {
        const topIsHeavier = /bold|black|heavy|medium|semibold/i.test(top.fontStyle);
        const botIsHeavier = /bold|black|heavy|medium|semibold/i.test(bot.fontStyle);
        if (topIsHeavier && !botIsHeavier) {
          return isTop ? 'Title' : (bot.isMuted ? 'Caption' : 'Description');
        }
        if (!topIsHeavier && botIsHeavier) {
          return isTop ? (top.isMuted ? 'Caption' : 'Label') : 'Value';
        }
        if (top.isMuted && !bot.isMuted) {
          return isTop ? 'Caption' : 'Value';
        }
        if (!top.isMuted && bot.isMuted) {
          return isTop ? 'Title' : 'Caption';
        }
      }
    }

    // Rozwiazywanie trojek: Eyebrow / Title / Description
    if (siblings.length === 3) {
      if (siblingIndex === 0) return 'Eyebrow';
      if (siblingIndex === 1) return 'Title';
      return 'Description';
    }
  }

  // PRIORYTET 2: Bezposrednie mapowanie z przypisanego Text Style (gdy brak relacji w parze)
  if (isDisplayOrHeadline) {
    return 'Heading';
  }
  if (isTitleStyle) {
    // Bezwzgledny zakaz nazywania warstwy ze stylem Title jako Caption lub MetaText!
    return (siblingIndex > 0 && parentLower.includes('stack')) ? 'Subtitle' : 'Title';
  }
  if (isBodyStyle) {
    return (parentLower.includes('title') || isUnderComponent) ? 'Description' : 'BodyText';
  }
  if (isLabelStyle) {
    if (isAboveComponent || siblingIndex === 0) return 'Label';
    return isUnderComponent ? 'Caption' : 'Label';
  }

  // Small, muted text (tylko jesli NIE styl Title ani Display!)
  if (!isTitleStyle && !isDisplayOrHeadline) {
    if (isTimeOrDatePattern(chars)) {
      return 'Timestamp';
    }
    if (isUnderComponent) {
      if (parentLower.includes('input') || parentLower.includes('field') || parentLower.includes('form') ||
          rootLower.includes('input') || rootLower.includes('textarea') || /help|hint|opis|err/i.test(charsLower)) {
        return 'HelperText';
      }
      return isSmall || isMuted ? 'Caption' : 'MetaText';
    }
  }

  // Loose text above component / group
  if (isAboveComponent || (isLoose && indexInParent === 0 && item.parentLayoutMode === 'VERTICAL')) {
    if (fontSize >= 16) {
      return fontSize >= 20 ? 'SectionTitle' : 'Title';
    }
    if (isSmall || styleName.includes('overline') || /overline/i.test(charsLower)) {
      return 'Overline';
    }
    return 'Label';
  }

  // Timestamp
  if (isTimeOrDatePattern(chars)) {
    return 'Timestamp';
  }

  // Input context
  if (rootLower.includes('input') || rootLower.includes('textarea') || rootLower.includes('select') || rootLower.includes('field') || rootLower.includes('combobox')) {
    if (parentLower.includes('label')) return 'Label';
    if (parentLower.includes('desc') || parentLower.includes('helper') || parentLower.includes('error') || parentLower.includes('hint')) return 'HelperText';
    if (parentLower.includes('footer') && /^\d+/.test(chars)) return 'CharacterCount';
    return 'Value';
  }

  if (parentLower.includes('label') || parentLower === 'fieldlabel') {
    return 'Label';
  }
  if (parentLower.includes('desc') || parentLower.includes('helper') || parentLower.includes('error') || parentLower.includes('hint') || parentLower.includes('message')) {
    return 'HelperText';
  }
  if (rootLower.includes('badge') || rootLower.includes('tag') || rootLower.includes('chip') || parentLower.includes('badge') || parentLower.includes('tag') || parentLower.includes('chip')) {
    return 'Label';
  }
  if (parentLower.includes('titlerow') || parentLower.includes('headerrow') || parentLower.includes('headergroup') || parentLower.includes('titlegroup')) {
    return 'Title';
  }

  if (totalSiblings === 3) {
    if (siblingIndex === 0) return 'Eyebrow';
    if (siblingIndex === 1) return 'Title';
    return 'Description';
  }
  if (totalSiblings === 2) {
    if (siblingIndex === 0) {
      return 'Title';
    } else {
      return 'Description';
    }
  }

  if (rootLower.includes('datapoint') || rootLower.includes('stat') || rootLower.includes('metric') || parentLower.includes('row') || parentLower.includes('item')) {
    if (fontSize > 16 || weight.includes('bold') || weight.includes('medium') || /^\d+/.test(chars)) {
      return 'Value';
    }
    return 'Label';
  }

  return getDeterministicTextFallback(item);
}

export async function getNodeFillTokenName(node: TextNode): Promise<string> {
  try {
    if (node.boundVariables && (node.boundVariables as any).fills) {
      const boundFills = (node.boundVariables as any).fills;
      if (Array.isArray(boundFills) && boundFills.length > 0 && boundFills[0]?.id) {
        const varId = boundFills[0].id;
        const variable = await figma.variables.getVariableByIdAsync(varId).catch(() => null);
        if (variable) return variable.name;
      }
    }
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const firstPaint = node.fills[0];
      if (firstPaint && typeof firstPaint === 'object' && (firstPaint as any).boundVariables?.color) {
        const colorVar = (firstPaint as any).boundVariables.color;
        const varId = colorVar.id;
        if (varId) {
          const variable = await figma.variables.getVariableByIdAsync(varId).catch(() => null);
          if (variable) return variable.name;
        }
      }
    }
    if (typeof (node as any).fillStyleId === 'string' && (node as any).fillStyleId) {
      const style = await figma.getStyleByIdAsync((node as any).fillStyleId).catch(() => null);
      if (style) return style.name;
    }
  } catch (_) {}
  return '';
}

export function getNodeFillTokenNameSync(node: TextNode): string {
  try {
    if (node.boundVariables && (node.boundVariables as any).fills) {
      const boundFills = (node.boundVariables as any).fills;
      if (Array.isArray(boundFills) && boundFills.length > 0 && boundFills[0]?.id) {
        const v = (figma.variables as any).getVariableById(boundFills[0].id);
        if (v) return v.name;
      }
    }
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const firstPaint = node.fills[0];
      if (firstPaint && typeof firstPaint === 'object' && (firstPaint as any).boundVariables?.color) {
        const colorVar = (firstPaint as any).boundVariables.color;
        if (colorVar.id) {
          const v = (figma.variables as any).getVariableById(colorVar.id);
          if (v) return v.name;
        }
      }
    }
    if (typeof (node as any).fillStyleId === 'string' && (node as any).fillStyleId) {
      const s = figma.getStyleById((node as any).fillStyleId);
      if (s) return s.name;
    }
  } catch (_) {}
  return '';
}

export function classifyTextNodeDirectly(txt: TextNode): string {
  let textStyleName = '';
  if (typeof txt.textStyleId === 'string' && txt.textStyleId) {
    try {
      const style = figma.getStyleById(txt.textStyleId);
      if (style) textStyleName = style.name;
    } catch (_) {}
  }

  const fillTokenName = getNodeFillTokenNameSync(txt);

  const parent = txt.parent;
  const parentName = parent ? (parent.name || '') : '';
  const parentLayoutMode = (parent && 'layoutMode' in parent) ? (parent.layoutMode as 'HORIZONTAL' | 'VERTICAL' | 'NONE') : 'NONE';
  const parentChildren = parent && 'children' in parent && Array.isArray(parent.children) ? parent.children : [];
  const indexInParent = parentChildren.indexOf(txt);
  const hasInstanceSibling = parentChildren.some(c => c !== txt && c.type === 'INSTANCE');
  const isLooseText = parentChildren.some(c => c !== txt && c.type !== 'TEXT');
  const prevSibling = indexInParent > 0 ? parentChildren[indexInParent - 1] : null;
  const nextSibling = indexInParent >= 0 && indexInParent < parentChildren.length - 1 ? parentChildren[indexInParent + 1] : null;
  const prevSiblingType = prevSibling ? prevSibling.type : '';
  const nextSiblingType = nextSibling ? nextSibling.type : '';

  const textSiblings = parentChildren.filter(c => c.type === 'TEXT');
  let siblingIndex = textSiblings.indexOf(txt);
  if (siblingIndex < 0) siblingIndex = 0;
  const totalSiblingTexts = textSiblings.length || 1;

  const siblingTexts = textSiblings.map(s => {
    let sStyle = '';
    if (typeof s.textStyleId === 'string' && s.textStyleId) {
      try {
        const st = figma.getStyleById(s.textStyleId);
        if (st) sStyle = st.name;
      } catch (_) {}
    }
    const sFill = getNodeFillTokenNameSync(s);
    const sWeight = (s.fontName && typeof s.fontName === 'object' && 'style' in s.fontName)
      ? (s.fontName as FontName).style
      : '';
    return {
      name: s.name || '',
      characters: s.characters || '',
      fontSize: typeof s.fontSize === 'number' ? s.fontSize : 14,
      fontStyle: sWeight,
      textStyleName: sStyle,
      isMuted: isMutedColorOrStyle(sFill, sStyle)
    };
  });

  let componentPropertyName = '';
  if (txt.componentPropertyReferences && typeof txt.componentPropertyReferences === 'object') {
    const charRef = (txt.componentPropertyReferences as any).characters;
    if (charRef && typeof charRef === 'string') {
      const rawProp = charRef.split('#')[0].trim();
      if (rawProp) {
        componentPropertyName = sanitizePascalCase(rawProp);
      }
    }
  }

  const fontStyle = (txt.fontName && typeof txt.fontName === 'object' && 'style' in txt.fontName)
    ? (txt.fontName as FontName).style
    : '';

  return classifyTextLayerSemantic({
    currentName: txt.name || '',
    characters: txt.characters || '',
    fontSize: typeof txt.fontSize === 'number' ? txt.fontSize : 14,
    fontStyle,
    textStyleName,
    fillTokenName,
    parentName,
    parentLayoutMode,
    siblingIndex,
    totalSiblingTexts,
    siblingTexts,
    componentPropertyName,
    isLooseText,
    hasInstanceSibling,
    prevSiblingType,
    nextSiblingType,
    indexInParent
  });
}

export async function sanitizeLayerNames(node: BaseNode, isPascalCaseOnly: boolean = false) {
  if (!node) return;

  // Skip instances of other components completely ("oprócz instancji komponentów")
  if (node.type === 'INSTANCE') {
    return;
  }

  if (node.type === 'TEXT') {
    const txt = node as TextNode;
    const rawName = (txt.name || '').trim();
    const chars = txt.characters || '';

    // PRIORYTET 1: Poszanowanie istniejącej, semantycznej nazwy roboczej
    const existing = getExistingSemanticRole(rawName, chars);
    if (existing) {
      if (txt.name !== existing) txt.name = existing;
      return;
    }

    // Requirement 1 & 4: Never concatenate raw characters into PascalCase.
    // If name is derived from characters, is generic, > 20 chars, or not an allowed UI role:
    if (isNameDerivedFromCharacters(rawName, chars) || rawName.length > 20 || isGenericLayerName(rawName) || !isAllowedTextRole(rawName)) {
      const semantic = classifyTextNodeDirectly(txt);
      if (txt.name !== semantic) {
        txt.name = semantic;
      }
    } else {
      const pascal = toPascalCase(rawName);
      if (pascal && txt.name !== pascal) {
        txt.name = pascal;
      }
    }
    return;
  }

  if ('name' in node && typeof (node as any).name === 'string') {
    const rawName = (node as any).name.trim();
    if (rawName) {
      const isVariantInSet = node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET';
      if (isVariantInSet) {
        // Sanitize variant property and value cases to PascalCase
        const parts = rawName.split(',').map((part) => {
          const eqIdx = part.indexOf('=');
          if (eqIdx === -1) {
            return toPascalCase(part.trim());
          }
          const k = part.substring(0, eqIdx).trim();
          const v = part.substring(eqIdx + 1).trim();
          const pascalK = /^property\s*\d+$/i.test(k) ? 'Type' : toPascalCase(k);
          const pascalV = toPascalCase(v);
          return pascalK ? `${pascalK}=${pascalV}` : `${k}=${pascalV}`;
        });
        const newName = parts.join(', ');
        if ((node as any).name !== newName) {
          (node as any).name = newName;
        }
      } else {
        if (!isPascalCaseOnly && /^frame(\s*\d+)?$/i.test(rawName)) {
          (node as any).name = 'Container';
        } else {
          const pascal = toPascalCase(rawName);
          if (pascal && (node as any).name !== pascal) {
            (node as any).name = pascal;
          }
        }
      }
    }
  }

  if ('children' in node && (node as any).children) {
    for (const child of (node as any).children) {
      await sanitizeLayerNames(child, isPascalCaseOnly);
    }
  }
}

