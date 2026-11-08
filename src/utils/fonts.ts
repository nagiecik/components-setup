export async function loadFontsForTextNode(node: TextNode): Promise<void> {
  if (node.fontName !== figma.mixed) {
    try {
      await figma.loadFontAsync(node.fontName as FontName);
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (e2) {}
    }
  } else {
    try {
      if (typeof (node as any).getStyledTextSegments === 'function') {
        const segments = (node as any).getStyledTextSegments(['fontName']);
        for (const seg of segments) {
          if (seg.fontName) {
            try {
              await figma.loadFontAsync(seg.fontName);
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    const len = node.characters.length;
    const loaded = new Set<string>();
    for (let i = 0; i < len; i++) {
      try {
        const font = node.getRangeFontName(i, i + 1) as FontName;
        if (font && font.family) {
          const key = `${font.family}::${font.style}`;
          if (!loaded.has(key)) {
            loaded.add(key);
            await figma.loadFontAsync(font);
          }
        }
      } catch (e) {}
    }
    if (loaded.size === 0) {
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (e) {}
    }
  }
}


export async function ensureFontLoaded(family?: string, style: string = 'Regular'): Promise<FontName> {
  const targetFamily = family && family.trim().length > 0 ? family.trim() : 'Inter';
  const candidates: FontName[] = [
    { family: targetFamily, style },
    { family: targetFamily, style: 'Bold' },
    { family: targetFamily, style: 'Medium' },
    { family: targetFamily, style: 'Regular' },
    { family: 'Inter', style },
    { family: 'Inter', style: 'Bold' },
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Arial', style: 'Regular' },
  ];

  for (const font of candidates) {
    try {
      await figma.loadFontAsync(font);
      return font;
    } catch {
      // try next fallback
    }
  }
  return { family: 'Inter', style: 'Regular' };
}


export async function safeLoadFontAndSetCharacters(textNode: TextNode, newText: string): Promise<boolean> {
  try {
    await loadFontsForTextNode(textNode);
    textNode.characters = newText;
    return true;
  } catch (err) {
    try {
      const fallbackFont = { family: 'Inter', style: 'Regular' };
      await figma.loadFontAsync(fallbackFont);
      textNode.fontName = fallbackFont;
      textNode.characters = newText;
      return true;
    } catch (fallbackErr) {
      console.warn(`[AutoProps] Could not set characters for text node ${textNode.name}:`, fallbackErr);
      return false;
    }
  }
}


export function syncSetCharacters(textNode: TextNode, newText: string): boolean {
  try {
    textNode.characters = newText;
    return true;
  } catch (err) {
    try {
      textNode.fontName = { family: 'Inter', style: 'Regular' };
      textNode.characters = newText;
      return true;
    } catch (fallbackErr) {
      console.warn(`[AutoProps] Could not set characters for text node ${textNode.name}:`, fallbackErr);
      return false;
    }
  }
}


export async function loadAllFontsForTextNode(node: TextNode): Promise<void> {
  if (node.fontName !== figma.mixed) {
    try {
      await figma.loadFontAsync(node.fontName as FontName);
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (_) {}
    }
  } else {
    let fontNames: FontName[] = [];
    if (typeof (node as any).getRangeAllFontNames === 'function') {
      try {
        fontNames = (node as any).getRangeAllFontNames(0, node.characters.length);
      } catch (e) {}
    }
    if (!fontNames || fontNames.length === 0) {
      const seen = new Set<string>();
      for (let i = 0; i < node.characters.length; i++) {
        try {
          const fn = node.getRangeFontName(i, i + 1) as FontName;
          if (fn && fn.family) {
            const key = `${fn.family}::${fn.style}`;
            if (!seen.has(key)) {
              seen.add(key);
              fontNames.push(fn);
            }
          }
        } catch (_) {}
      }
    }
    await Promise.all(
      fontNames.map(async (fn) => {
        try {
          await figma.loadFontAsync(fn);
        } catch (e) {
          try {
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          } catch (_) {}
        }
      })
    );
  }
}

