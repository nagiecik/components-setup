export function rgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) => Math.max(0, Math.min(255, Math.round(c > 1 ? c : c * 255)));
  const hex = (c: number) => to255(c).toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}


export function parseHexOrRgb(val: any): { r: number; g: number; b: number } {
  if (typeof val === 'string') {
    const clean = val.replace('#', '').trim();
    if (clean.length === 3) {
      return {
        r: parseInt(clean[0] + clean[0], 16) / 255,
        g: parseInt(clean[1] + clean[1], 16) / 255,
        b: parseInt(clean[2] + clean[2], 16) / 255,
      };
    }
    if (clean.length >= 6) {
      return {
        r: parseInt(clean.substring(0, 2), 16) / 255,
        g: parseInt(clean.substring(2, 4), 16) / 255,
        b: parseInt(clean.substring(4, 6), 16) / 255,
      };
    }
  }
  if (val && typeof val === 'object' && 'r' in val) {
    const r = val.r > 1 ? val.r / 255 : val.r;
    const g = val.g > 1 ? val.g / 255 : val.g;
    const b = val.b > 1 ? val.b / 255 : val.b;
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

