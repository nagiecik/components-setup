// Curated Presets for Antigravity <-> Figma Bridge
// Pixel-perfect hand-crafted Figma component presets

const fs = require('fs');
const path = require('path');

function findWorkspaceRoot(startPath) {
  let curr = path.dirname(startPath);
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(startPath, '..', '..', '..');
}

const SPACING_TOKEN_MAP = {
  'none': { px: 0, token: 'constant/none' },
  '0': { px: 0, token: 'constant/none' },
  'nano': { px: 2, token: 'spacing/nano' },
  'pico': { px: 4, token: 'spacing/pico' },
  'extra-small': { px: 8, token: 'spacing/extra-small' },
  'small': { px: 12, token: 'spacing/small' },
  'base': { px: 16, token: 'spacing/base' },
  'medium': { px: 20, token: 'spacing/medium' },
  'semi-large': { px: 24, token: 'spacing/semi-large' },
  'large': { px: 32, token: 'spacing/large' },
  'extra-large': { px: 40, token: 'spacing/extra-large' },
  'huge': { px: 48, token: 'spacing/huge' },
  'massive': { px: 56, token: 'spacing/massive' },
  'extra-massive': { px: 64, token: 'spacing/extra-massive' },
};

const RADIUS_TOKEN_MAP = {
  'none': { px: 0, token: 'constant/none' },
  '0': { px: 0, token: 'constant/none' },
  'extra-small': { px: 2, token: 'radius/extra-small' },
  'small': { px: 4, token: 'radius/small' },
  'sm': { px: 4, token: 'radius/small' },
  'base': { px: 8, token: 'radius/base' },
  'md': { px: 8, token: 'radius/base' },
  'medium': { px: 12, token: 'radius/medium' },
  'large': { px: 16, token: 'radius/large' },
  'lg': { px: 16, token: 'radius/large' },
  'extra-large': { px: 24, token: 'radius/extra-large' },
  'xl': { px: 24, token: 'radius/extra-large' },
  '2xl': { px: 24, token: 'radius/extra-large' },
  'semi-large': { px: 32, token: 'radius/semi-large' },
  'full': { px: 9999, token: 'constant/full' },
};

function parseTailwindSpacingClasses(classStr) {
  const res = {
    paddingTop: undefined,
    paddingTopVar: undefined,
    paddingBottom: undefined,
    paddingBottomVar: undefined,
    paddingLeft: undefined,
    paddingLeftVar: undefined,
    paddingRight: undefined,
    paddingRightVar: undefined,
    itemSpacing: undefined,
    itemSpacingVar: undefined,
    cornerRadius: undefined,
    cornerRadiusVar: undefined,
  };

  if (!classStr) return res;
  const classes = classStr.split(/\s+/).filter(Boolean);

  for (const c of classes) {
    const py = c.match(/^py-([a-z0-9-]+)$/);
    if (py && SPACING_TOKEN_MAP[py[1]]) {
      res.paddingTop = SPACING_TOKEN_MAP[py[1]].px;
      res.paddingTopVar = SPACING_TOKEN_MAP[py[1]].token;
      res.paddingBottom = SPACING_TOKEN_MAP[py[1]].px;
      res.paddingBottomVar = SPACING_TOKEN_MAP[py[1]].token;
    }
    const pt = c.match(/^pt-([a-z0-9-]+)$/);
    if (pt && SPACING_TOKEN_MAP[pt[1]]) {
      res.paddingTop = SPACING_TOKEN_MAP[pt[1]].px;
      res.paddingTopVar = SPACING_TOKEN_MAP[pt[1]].token;
    }
    const pb = c.match(/^pb-([a-z0-9-]+)$/);
    if (pb && SPACING_TOKEN_MAP[pb[1]]) {
      res.paddingBottom = SPACING_TOKEN_MAP[pb[1]].px;
      res.paddingBottomVar = SPACING_TOKEN_MAP[pb[1]].token;
    }
    const px = c.match(/^px-([a-z0-9-]+)$/);
    if (px && SPACING_TOKEN_MAP[px[1]]) {
      res.paddingLeft = SPACING_TOKEN_MAP[px[1]].px;
      res.paddingLeftVar = SPACING_TOKEN_MAP[px[1]].token;
      res.paddingRight = SPACING_TOKEN_MAP[px[1]].px;
      res.paddingRightVar = SPACING_TOKEN_MAP[px[1]].token;
    }
    const pl = c.match(/^pl-([a-z0-9-]+)$/);
    if (pl && SPACING_TOKEN_MAP[pl[1]]) {
      res.paddingLeft = SPACING_TOKEN_MAP[pl[1]].px;
      res.paddingLeftVar = SPACING_TOKEN_MAP[pl[1]].token;
    }
    const pr = c.match(/^pr-([a-z0-9-]+)$/);
    if (pr && SPACING_TOKEN_MAP[pr[1]]) {
      res.paddingRight = SPACING_TOKEN_MAP[pr[1]].px;
      res.paddingRightVar = SPACING_TOKEN_MAP[pr[1]].token;
    }
    const p = c.match(/^p-([a-z0-9-]+)$/);
    if (p && SPACING_TOKEN_MAP[p[1]]) {
      res.paddingTop = SPACING_TOKEN_MAP[p[1]].px;
      res.paddingTopVar = SPACING_TOKEN_MAP[p[1]].token;
      res.paddingBottom = SPACING_TOKEN_MAP[p[1]].px;
      res.paddingBottomVar = SPACING_TOKEN_MAP[p[1]].token;
      res.paddingLeft = SPACING_TOKEN_MAP[p[1]].px;
      res.paddingLeftVar = SPACING_TOKEN_MAP[p[1]].token;
      res.paddingRight = SPACING_TOKEN_MAP[p[1]].px;
      res.paddingRightVar = SPACING_TOKEN_MAP[p[1]].token;
    }
    const gap = c.match(/^gap-([a-z0-9-]+)$/);
    if (gap && SPACING_TOKEN_MAP[gap[1]]) {
      res.itemSpacing = SPACING_TOKEN_MAP[gap[1]].px;
      res.itemSpacingVar = SPACING_TOKEN_MAP[gap[1]].token;
    }
    if (c === 'rounded-full') {
      res.cornerRadius = 9999;
      res.cornerRadiusVar = 'constant/full';
    } else if (c === 'rounded-none' || c === 'rounded-0') {
      res.cornerRadius = 0;
      res.cornerRadiusVar = 'constant/none';
    } else {
      const rounded = c.match(/^rounded(?:-([a-z0-9-]+))?$/);
      if (rounded) {
        const sub = rounded[1] || 'base';
        if (RADIUS_TOKEN_MAP[sub]) {
          res.cornerRadius = RADIUS_TOKEN_MAP[sub].px;
          res.cornerRadiusVar = RADIUS_TOKEN_MAP[sub].token;
        }
      }
    }
  }

  return res;
}

function getCuratedPreset(componentName, tsxPath, tokens, workspaceFonts) {
  const code = fs.readFileSync(tsxPath, 'utf8');
  const WORKSPACE_DIR = findWorkspaceRoot(tsxPath);

  if (componentName.toLowerCase() === 'marquee') {
    const rootName = 'Marquee';

    // Read current logo SVG if available
    let logoSvg = '';
    const logoSvgPath = path.join(WORKSPACE_DIR, 'src', 'images', 'svg', 'logo-full-light.svg');
    if (fs.existsSync(logoSvgPath)) {
      logoSvg = fs.readFileSync(logoSvgPath, 'utf8');
    }

    // Detect if MarqueeSeparator is present in the file
    const hasSeparator = /MarqueeSeparator/i.test(code);

    // Detect if outer Link / container has borders
    const linkMatch = code.match(/<Link[\s\S]*?className=\{`([^`]+)`\}/);
    const linkClass = linkMatch ? linkMatch[1] : '';
    const hasBorder = /border-y|border-white|border\b/i.test(linkClass);

    // Detect default text
    const textMatch = code.match(/text\s*=\s*['"]([^'"]+)['"]/);
    const defaultText = textMatch ? textMatch[1].toUpperCase() : '20 YEARS OF MAMF';

    // Parse dynamic variant classes from live TSX
    const typeClassesMatch = code.match(/(?:typeClasses|variantClasses)\s*(?::\s*Record<[^>]+,\s*string>)?\s*=\s*\{([^}]+)\}/);
    const parsedVariantClasses = {};
    if (typeClassesMatch) {
      const entries = typeClassesMatch[1].split(',');
      for (const entry of entries) {
        const parts = entry.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().replace(/['"]/g, '');
          const val = parts[1].trim().replace(/['"`]/g, '');
          if (key && val) {
            parsedVariantClasses[key.toLowerCase()] = val;
          }
        }
      }
    }

    const desktopCls = parsedVariantClasses.desktop || 'py-extra-small';
    const mobileCls = parsedVariantClasses.mobile || 'py-pico';

    const desktopSpacing = parseTailwindSpacingClasses(desktopCls);
    const mobileSpacing = parseTailwindSpacingClasses(mobileCls);

    console.log(`[Bridge] Parsed live ${componentName}.tsx: hasSeparator=${hasSeparator}, hasBorder=${hasBorder}, text="${defaultText}", desktop="${desktopCls}", mobile="${mobileCls}"`);

    const buildItemChildren = (textSize = 16, dotSize = 6) => {
      const children = [
        {
          type: 'TEXT',
          name: `${rootName}Text`,
          textStyleName: 'default/body/medium/bold',
          characters: defaultText,
          fontStyle: 'Bold',
          fontSize: 16,
          letterSpacing: 10,
          textCase: 'UPPER',
          fills: tokens.getFill('on-primary-unstable'),
        },
        {
          type: 'INSTANCE',
          name: `${rootName}Logo`,
          componentName: 'Logotype',
          variantProperties: {
            Size: 'SemiLarge',
            Schemes: 'OnSurfaceDarkWhite',
          },
          svgContent: logoSvg,
        },
      ];

      if (hasSeparator) {
        children.push({
          type: 'ELLIPSE',
          name: `${rootName}Separator`,
          width: dotSize,
          height: dotSize,
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: tokens.getFill('on-primary-unstable', 0.6),
        });
      }

      return children;
    };

    // Check MarqueeTrack.tsx
    let trackSpacing = {
      paddingTop: 0,
      paddingTopVar: 'constant/none',
      paddingBottom: 0,
      paddingBottomVar: 'constant/none',
      paddingLeft: 0,
      paddingLeftVar: 'constant/none',
      paddingRight: 0,
      paddingRightVar: 'constant/none',
      itemSpacing: 0,
      itemSpacingVar: 'constant/none',
      cornerRadius: 0,
      cornerRadiusVar: 'constant/none',
    };
    const trackFilePath = path.join(path.dirname(tsxPath), 'MarqueeTrack.tsx');
    if (fs.existsSync(trackFilePath)) {
      const trackCode = fs.readFileSync(trackFilePath, 'utf8');
      const trackClassMatch = trackCode.match(/className=\{?`?([^`"'}]+)`?\}?/);
      if (trackClassMatch) {
        const parsedTrack = parseTailwindSpacingClasses(trackClassMatch[1]);
        if (parsedTrack.paddingTop !== undefined) trackSpacing.paddingTop = parsedTrack.paddingTop;
        if (parsedTrack.paddingTopVar) trackSpacing.paddingTopVar = parsedTrack.paddingTopVar;
        if (parsedTrack.paddingBottom !== undefined) trackSpacing.paddingBottom = parsedTrack.paddingBottom;
        if (parsedTrack.paddingBottomVar) trackSpacing.paddingBottomVar = parsedTrack.paddingBottomVar;
        if (parsedTrack.paddingLeft !== undefined) trackSpacing.paddingLeft = parsedTrack.paddingLeft;
        if (parsedTrack.paddingLeftVar) trackSpacing.paddingLeftVar = parsedTrack.paddingLeftVar;
        if (parsedTrack.paddingRight !== undefined) trackSpacing.paddingRight = parsedTrack.paddingRight;
        if (parsedTrack.paddingRightVar) trackSpacing.paddingRightVar = parsedTrack.paddingRightVar;
        if (parsedTrack.itemSpacing !== undefined) trackSpacing.itemSpacing = parsedTrack.itemSpacing;
        if (parsedTrack.itemSpacingVar) trackSpacing.itemSpacingVar = parsedTrack.itemSpacingVar;
        if (parsedTrack.cornerRadius !== undefined) trackSpacing.cornerRadius = parsedTrack.cornerRadius;
        if (parsedTrack.cornerRadiusVar) trackSpacing.cornerRadiusVar = parsedTrack.cornerRadiusVar;
      }
    }

    const subComponents = [
      {
        type: 'COMPONENT',
        name: `${rootName}/Item`,
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'AUTO',
        itemSpacing: 24,
        itemSpacingVar: 'spacing/semi-large',
        paddingLeft: 24,
        paddingLeftVar: 'spacing/semi-large',
        paddingRight: 24,
        paddingRightVar: 'spacing/semi-large',
        paddingTop: 0,
        paddingBottom: 0,
        paddingTopVar: 'constant/none',
        paddingBottomVar: 'constant/none',
        cornerRadius: 0,
        cornerRadiusVar: 'constant/none',
        fills: [],
        children: buildItemChildren(16, 6),
      },
    ];

    const buildTickerItems = (count) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({
          type: 'INSTANCE',
          name: `${rootName}/Item`,
          componentName: `${rootName}/Item`,
        });
      }
      return items;
    };

    const strokes = hasBorder ? tokens.getStroke('white', 0.1) : [];
    const strokeWeight = hasBorder ? 1 : 0;

    return {
      name: rootName,
      description: `Animated ${rootName} component with continuous marquee motion (live from TSX).`,
      subComponents,
      variants: [
        {
          name: 'Type=Desktop',
          width: 1440,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'CENTER',
          paddingTop: desktopSpacing.paddingTop !== undefined ? desktopSpacing.paddingTop : 8,
          paddingTopVar: desktopSpacing.paddingTopVar || 'spacing/extra-small',
          paddingBottom: desktopSpacing.paddingBottom !== undefined ? desktopSpacing.paddingBottom : 8,
          paddingBottomVar: desktopSpacing.paddingBottomVar || 'spacing/extra-small',
          paddingLeft: desktopSpacing.paddingLeft !== undefined ? desktopSpacing.paddingLeft : 0,
          paddingRight: desktopSpacing.paddingRight !== undefined ? desktopSpacing.paddingRight : 0,
          paddingLeftVar: desktopSpacing.paddingLeftVar || 'constant/none',
          paddingRightVar: desktopSpacing.paddingRightVar || 'constant/none',
          cornerRadius: 0,
          cornerRadiusVar: 'constant/none',
          clipsContent: true,
          fills: tokens.getFill('primary'),
          strokes,
          strokeTopWeight: strokeWeight,
          strokeBottomWeight: strokeWeight,
          strokeLeftWeight: 0,
          strokeRightWeight: 0,
          children: [
            {
              type: 'FRAME',
              name: `${rootName}/Track`,
              layoutMode: 'HORIZONTAL',
              primaryAxisSizingMode: 'AUTO',
              counterAxisSizingMode: 'AUTO',
              primaryAxisAlignItems: 'CENTER',
              counterAxisAlignItems: 'CENTER',
              itemSpacing: trackSpacing.itemSpacing !== undefined ? trackSpacing.itemSpacing : 0,
              itemSpacingVar: trackSpacing.itemSpacingVar || 'constant/none',
              paddingTop: trackSpacing.paddingTop !== undefined ? trackSpacing.paddingTop : 0,
              paddingBottom: trackSpacing.paddingBottom !== undefined ? trackSpacing.paddingBottom : 0,
              paddingLeft: trackSpacing.paddingLeft !== undefined ? trackSpacing.paddingLeft : 0,
              paddingRight: trackSpacing.paddingRight !== undefined ? trackSpacing.paddingRight : 0,
              paddingTopVar: trackSpacing.paddingTopVar || 'constant/none',
              paddingBottomVar: trackSpacing.paddingBottomVar || 'constant/none',
              paddingLeftVar: trackSpacing.paddingLeftVar || 'constant/none',
              paddingRightVar: trackSpacing.paddingRightVar || 'constant/none',
              cornerRadius: trackSpacing.cornerRadius !== undefined ? trackSpacing.cornerRadius : 0,
              cornerRadiusVar: trackSpacing.cornerRadiusVar || 'constant/none',
              fills: [],
              children: buildTickerItems(6),
            },
          ],
        },
        {
          name: 'Type=Mobile',
          width: 393,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'CENTER',
          paddingTop: mobileSpacing.paddingTop !== undefined ? mobileSpacing.paddingTop : 4,
          paddingTopVar: mobileSpacing.paddingTopVar || 'spacing/pico',
          paddingBottom: mobileSpacing.paddingBottom !== undefined ? mobileSpacing.paddingBottom : 4,
          paddingBottomVar: mobileSpacing.paddingBottomVar || 'spacing/pico',
          paddingLeft: mobileSpacing.paddingLeft !== undefined ? mobileSpacing.paddingLeft : 0,
          paddingRight: mobileSpacing.paddingRight !== undefined ? mobileSpacing.paddingRight : 0,
          paddingLeftVar: mobileSpacing.paddingLeftVar || 'constant/none',
          paddingRightVar: mobileSpacing.paddingRightVar || 'constant/none',
          cornerRadius: 0,
          cornerRadiusVar: 'constant/none',
          clipsContent: true,
          fills: tokens.getFill('primary'),
          strokes,
          strokeTopWeight: strokeWeight,
          strokeBottomWeight: strokeWeight,
          strokeLeftWeight: 0,
          strokeRightWeight: 0,
          children: [
            {
              type: 'FRAME',
              name: `${rootName}/Track`,
              layoutMode: 'HORIZONTAL',
              primaryAxisSizingMode: 'AUTO',
              counterAxisSizingMode: 'AUTO',
              primaryAxisAlignItems: 'CENTER',
              counterAxisAlignItems: 'CENTER',
              itemSpacing: trackSpacing.itemSpacing !== undefined ? trackSpacing.itemSpacing : 0,
              itemSpacingVar: trackSpacing.itemSpacingVar || 'constant/none',
              paddingTop: trackSpacing.paddingTop !== undefined ? trackSpacing.paddingTop : 0,
              paddingBottom: trackSpacing.paddingBottom !== undefined ? trackSpacing.paddingBottom : 0,
              paddingLeft: trackSpacing.paddingLeft !== undefined ? trackSpacing.paddingLeft : 0,
              paddingRight: trackSpacing.paddingRight !== undefined ? trackSpacing.paddingRight : 0,
              paddingTopVar: trackSpacing.paddingTopVar || 'constant/none',
              paddingBottomVar: trackSpacing.paddingBottomVar || 'constant/none',
              paddingLeftVar: trackSpacing.paddingLeftVar || 'constant/none',
              paddingRightVar: trackSpacing.paddingRightVar || 'constant/none',
              cornerRadius: trackSpacing.cornerRadius !== undefined ? trackSpacing.cornerRadius : 0,
              cornerRadiusVar: trackSpacing.cornerRadiusVar || 'constant/none',
              fills: [],
              children: buildTickerItems(4),
            },
          ],
        },
      ],
    };
  }

  // Button Preset
  if (componentName.toLowerCase() === 'button') {
    const arrowSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="12" y2="4" /><polyline points="6 4 12 4 12 10" /></svg>`;
    return {
      name: 'Button',
      description: 'Design System Button component with variants (live from TSX).',
      variants: [
        {
          name: 'size=small, style=filled',
          height: 44,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 8,
          itemSpacingVar: 'spacing/small',
          paddingLeft: 16,
          paddingRight: 16,
          paddingLeftVar: 'spacing/base',
          paddingRightVar: 'spacing/base',
          cornerRadius: 22,
          cornerRadiusVar: 'radius/small',
          fills: tokens.getFill('primary'),
          children: [
            {
              type: 'TEXT',
              name: 'label',
              textStyleName: 'default/body/medium/bold',
              characters: 'Button',
              fontStyle: 'Bold',
              fontSize: 14,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'SVG',
              name: 'ArrowIcon',
              svgContent: arrowSvg,
              width: 16,
              height: 16,
            },
          ],
        },
        {
          name: 'size=medium, style=filled',
          height: 48,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 10,
          itemSpacingVar: 'spacing/small',
          paddingLeft: 20,
          paddingRight: 20,
          paddingLeftVar: 'spacing/medium',
          paddingRightVar: 'spacing/medium',
          cornerRadius: 24,
          cornerRadiusVar: 'radius/base',
          fills: tokens.getFill('primary'),
          children: [
            {
              type: 'TEXT',
              name: 'label',
              textStyleName: 'default/body/large/bold',
              characters: 'Button',
              fontStyle: 'Bold',
              fontSize: 16,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'SVG',
              name: 'ArrowIcon',
              svgContent: arrowSvg,
              width: 16,
              height: 16,
            },
          ],
        },
        {
          name: 'size=large, style=filled',
          height: 56,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 12,
          itemSpacingVar: 'spacing/base',
          paddingLeft: 24,
          paddingRight: 24,
          paddingLeftVar: 'spacing/semi-large',
          paddingRightVar: 'spacing/semi-large',
          cornerRadius: 28,
          cornerRadiusVar: 'radius/large',
          fills: tokens.getFill('primary'),
          children: [
            {
              type: 'TEXT',
              name: 'label',
              textStyleName: 'default/body/large/bold',
              characters: 'Button',
              fontStyle: 'Bold',
              fontSize: 16,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'SVG',
              name: 'ArrowIcon',
              svgContent: arrowSvg,
              width: 16,
              height: 16,
            },
          ],
        },
        {
          name: 'size=medium, style=outline',
          height: 48,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 10,
          itemSpacingVar: 'spacing/small',
          paddingLeft: 20,
          paddingRight: 20,
          paddingLeftVar: 'spacing/medium',
          paddingRightVar: 'spacing/medium',
          cornerRadius: 24,
          cornerRadiusVar: 'radius/base',
          fills: [],
          strokes: tokens.getStroke('outline-base', 0.6),
          strokeWeight: 1,
          children: [
            {
              type: 'TEXT',
              name: 'label',
              textStyleName: 'default/body/large/bold',
              characters: 'Button',
              fontStyle: 'Bold',
              fontSize: 16,
              fills: tokens.getFill('on-surface'),
            },
            {
              type: 'SVG',
              name: 'ArrowIcon',
              svgContent: arrowSvg,
              width: 16,
              height: 16,
            },
          ],
        },
      ],
    };
  }

  // Typography / Headings (H1 - H6, PageTitle)
  const headingMatch = componentName.match(/^H([1-6])$/i);
  if (headingMatch || /title/i.test(path.dirname(tsxPath)) || componentName.toLowerCase() === 'pagetitle') {
    const level = headingMatch ? parseInt(headingMatch[1], 10) : 1;
    const desktopSizes = { 1: 104, 2: 96, 3: 88, 4: 80, 5: 72, 6: 64 };
    const mobileSizes = { 1: 44, 2: 40, 3: 36, 4: 32, 5: 28, 6: 24 };

    const dSize = desktopSizes[level] || 104;
    const mSize = mobileSizes[level] || 44;
    const dGap = Math.round(dSize * 0.22);
    const mGap = Math.round(mSize * 0.25);

    const compTitle = componentName.toUpperCase();

    return {
      name: componentName,
      description: `Typography heading ${compTitle} component (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'theme=light, breakpoint=desktop',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'BASELINE',
          itemSpacing: dGap,
          itemSpacingVar: 'spacing/semi-large',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'firstPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'DIGITAL',
              fontStyle: 'Bold',
              fontSize: dSize,
              fills: tokens.getFill('on-surface'),
            },
            {
              type: 'TEXT',
              name: 'secondPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'EXPERIENCE',
              fontStyle: 'Bold',
              fontSize: dSize,
              fills: tokens.getFill('primary'),
            },
          ],
        },
        {
          name: 'theme=light, breakpoint=mobile',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'BASELINE',
          itemSpacing: mGap,
          itemSpacingVar: 'spacing/base',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'firstPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'DIGITAL',
              fontStyle: 'Bold',
              fontSize: mSize,
              fills: tokens.getFill('on-surface'),
            },
            {
              type: 'TEXT',
              name: 'secondPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'EXPERIENCE',
              fontStyle: 'Bold',
              fontSize: mSize,
              fills: tokens.getFill('primary'),
            },
          ],
        },
        {
          name: 'theme=dark, breakpoint=desktop',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'BASELINE',
          itemSpacing: dGap,
          itemSpacingVar: 'spacing/semi-large',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'firstPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'DIGITAL',
              fontStyle: 'Bold',
              fontSize: dSize,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'TEXT',
              name: 'secondPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'EXPERIENCE',
              fontStyle: 'Bold',
              fontSize: dSize,
              fills: tokens.getFill('primary'),
            },
          ],
        },
        {
          name: 'theme=dark, breakpoint=mobile',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'BASELINE',
          itemSpacing: mGap,
          itemSpacingVar: 'spacing/base',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'firstPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'DIGITAL',
              fontStyle: 'Bold',
              fontSize: mSize,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'TEXT',
              name: 'secondPart',
              textStyleName: `heading/h${level}/bold`,
              characters: 'EXPERIENCE',
              fontStyle: 'Bold',
              fontSize: mSize,
              fills: tokens.getFill('primary'),
            },
          ],
        },
      ],
    };
  }

  // Form Inputs & Selects (Input, Select, HeaderSearch)
  if (/(input|select|search)/i.test(componentName)) {
    const searchIconSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><line x1="15" y1="15" x2="11" y2="11"/></svg>`;
    const isSearch = /search/i.test(componentName);
    const placeholder = isSearch ? 'Search...' : 'Enter text...';

    const buildInputVariant = (vName, h, state, labelText = 'Input Label', captionText = '') => {
      const isError = state === 'error';
      const isFocus = state === 'focus';
      const strokeToken = isError ? 'error' : isFocus ? 'primary' : 'outline-base';
      const strokeW = isFocus ? 2 : 1;

      const children = [];

      // Label above
      children.push({
        type: 'TEXT',
        name: 'Label',
        textStyleName: 'default/label/large/bold',
        characters: labelText,
        fontStyle: 'Bold',
        fontSize: 12,
        fills: tokens.getFill('on-surface'),
      });

      // Field container
      const fieldChildren = [];
      if (isSearch) {
        fieldChildren.push({
          type: 'SVG',
          name: 'SearchIcon',
          svgContent: searchIconSvg,
          width: 16,
          height: 16,
        });
      }

      fieldChildren.push({
        type: 'TEXT',
        name: 'Placeholder',
        textStyleName: 'default/body/medium/regular',
        characters: placeholder,
        fontStyle: 'Regular',
        fontSize: h === 44 ? 13 : 15,
        fills: tokens.getFill('outline-highest'),
      });

      children.push({
        type: 'FRAME',
        name: 'InputField',
        width: 340,
        height: h,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'FIXED',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 10,
        itemSpacingVar: 'spacing/small',
        paddingLeft: 16,
        paddingRight: 16,
        paddingLeftVar: 'spacing/base',
        paddingRightVar: 'spacing/base',
        cornerRadius: 8,
        cornerRadiusVar: 'radius/base',
        fills: tokens.getFill('surface-subtle'),
        strokes: tokens.getStroke(strokeToken),
        strokeWeight: strokeW,
        children: fieldChildren,
      });

      // Caption below if error or specified
      if (captionText || isError) {
        children.push({
          type: 'TEXT',
          name: 'Caption',
          textStyleName: 'default/label/small/regular',
          characters: isError ? 'This field is required' : captionText,
          fontStyle: 'Regular',
          fontSize: 11,
          fills: tokens.getFill(isError ? 'error' : 'outline-highest'),
        });
      }

      return {
        name: vName,
        layoutMode: 'VERTICAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'AUTO',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        itemSpacing: 6,
        itemSpacingVar: 'spacing/small',
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        fills: [],
        children,
      };
    };

    return {
      name: componentName,
      description: `Form input control ${componentName} with validation states (live from ${path.basename(tsxPath)}).`,
      variants: [
        buildInputVariant('size=large, state=default', 56, 'default'),
        buildInputVariant('size=large, state=focus', 56, 'focus'),
        buildInputVariant('size=large, state=error', 56, 'error'),
        buildInputVariant('size=medium, state=default', 48, 'default'),
        buildInputVariant('size=small, state=default', 44, 'default'),
      ],
    };
  }

  // Badges & Chips (IsoBadge, AnniversaryBadge, *Badge)
  if (/badge/i.test(componentName)) {
    const isIso = /iso/i.test(componentName);
    const badgeText = isIso ? 'ISO 27001' : '20 YEARS';
    const subText = isIso ? 'Certified Security' : 'ANNIVERSARY';

    return {
      name: componentName,
      description: `Badge component ${componentName} (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'variant=primary, size=medium',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 8,
          itemSpacingVar: 'spacing/small',
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 14,
          paddingRight: 14,
          paddingLeftVar: 'spacing/base',
          paddingRightVar: 'spacing/base',
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: tokens.getFill('primary'),
          children: [
            {
              type: 'ELLIPSE',
              name: 'BadgeDot',
              width: 6,
              height: 6,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'TEXT',
              name: 'BadgeTitle',
              textStyleName: 'default/label/large/bold',
              characters: badgeText,
              fontStyle: 'Bold',
              fontSize: 12,
              letterSpacing: 4,
              textCase: 'UPPER',
              fills: tokens.getFill('on-primary-unstable'),
            },
          ],
        },
        {
          name: 'variant=outline, size=medium',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 8,
          itemSpacingVar: 'spacing/small',
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 14,
          paddingRight: 14,
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: [],
          strokes: tokens.getStroke('outline-base', 0.5),
          strokeWeight: 1,
          children: [
            {
              type: 'ELLIPSE',
              name: 'BadgeDot',
              width: 6,
              height: 6,
              fills: tokens.getFill('primary'),
            },
            {
              type: 'TEXT',
              name: 'BadgeTitle',
              textStyleName: 'default/label/large/bold',
              characters: badgeText,
              fontStyle: 'Bold',
              fontSize: 12,
              letterSpacing: 4,
              textCase: 'UPPER',
              fills: tokens.getFill('on-surface'),
            },
          ],
        },
        {
          name: 'variant=card, size=large',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 4,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          cornerRadius: 12,
          cornerRadiusVar: 'radius/base',
          fills: tokens.getFill('surface-inverse-subtle'),
          children: [
            {
              type: 'TEXT',
              name: 'BadgeTitle',
              textStyleName: 'default/body/large/bold',
              characters: badgeText,
              fontStyle: 'Bold',
              fontSize: 16,
              fills: tokens.getFill('primary'),
            },
            {
              type: 'TEXT',
              name: 'BadgeSubtitle',
              textStyleName: 'default/label/small/regular',
              characters: subText,
              fontStyle: 'Regular',
              fontSize: 11,
              fills: tokens.getFill('outline-base'),
            },
          ],
        },
      ],
    };
  }

  // Theme Controls (ThemeToggle, ThemeSwitches, ThemeCustomizer)
  if (/theme.*(toggle|switch|customizer)/i.test(componentName)) {
    const sunSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    return {
      name: componentName,
      description: `Theme switcher control with Light & Dark states (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'theme=light',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 8,
          itemSpacingVar: 'spacing/small',
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 14,
          paddingRight: 14,
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: tokens.getFill('surface-subtle'),
          strokes: tokens.getStroke('outline-base', 0.5),
          strokeWeight: 1,
          children: [
            {
              type: 'SVG',
              name: 'SunIcon',
              svgContent: sunSvg,
              width: 18,
              height: 18,
            },
            {
              type: 'TEXT',
              name: 'Label',
              textStyleName: 'default/label/large/bold',
              characters: 'Light',
              fontStyle: 'Bold',
              fontSize: 13,
              fills: tokens.getFill('on-surface'),
            },
          ],
        },
        {
          name: 'theme=dark',
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          itemSpacing: 8,
          itemSpacingVar: 'spacing/small',
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 14,
          paddingRight: 14,
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: tokens.getFill('surface-inverse-subtle'),
          strokes: tokens.getStroke('outline-highest', 0.3),
          strokeWeight: 1,
          children: [
            {
              type: 'SVG',
              name: 'MoonIcon',
              svgContent: moonSvg,
              width: 18,
              height: 18,
            },
            {
              type: 'TEXT',
              name: 'Label',
              textStyleName: 'default/label/large/bold',
              characters: 'Dark',
              fontStyle: 'Bold',
              fontSize: 13,
              fills: tokens.getFill('on-primary-unstable'),
            },
          ],
        },
      ],
    };
  }

  // Cards, Tiles & Statistics (Tile, StatItem, SingleTestimonial, FourHeadedItemsGrid, FramedIcon)
  if (/(tile|stat|testimonial|card|grid|framed)/i.test(componentName)) {
    const isStat = /stat/i.test(componentName);
    const metricText = isStat ? '150+' : '01';
    const titleText = isStat ? 'Completed Projects' : 'Strategy & Digital Execution';
    const descText = 'Delivering transformative digital solutions with measurable impact.';

    return {
      name: componentName,
      description: `Card/Tile component ${componentName} (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'style=default, theme=light',
          width: 360,
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 12,
          itemSpacingVar: 'spacing/base',
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTopVar: 'spacing/semi-large',
          paddingBottomVar: 'spacing/semi-large',
          paddingLeftVar: 'spacing/semi-large',
          paddingRightVar: 'spacing/semi-large',
          cornerRadius: 16,
          cornerRadiusVar: 'radius/large',
          fills: tokens.getFill('surface-subtle'),
          strokes: tokens.getStroke('outline-base', 0.4),
          strokeWeight: 1,
          children: [
            {
              type: 'FRAME',
              name: 'HeaderRow',
              layoutMode: 'HORIZONTAL',
              primaryAxisAlignItems: 'CENTER',
              counterAxisAlignItems: 'CENTER',
              itemSpacing: 8,
              fills: [],
              children: [
                {
                  type: 'TEXT',
                  name: 'Metric',
                  textStyleName: 'heading/h1/bold',
                  characters: metricText,
                  fontStyle: 'Bold',
                  fontSize: 48,
                  fills: tokens.getFill('primary'),
                },
                {
                  type: 'ELLIPSE',
                  name: 'RedDot',
                  width: 8,
                  height: 8,
                  fills: tokens.getFill('primary'),
                },
              ],
            },
            {
              type: 'TEXT',
              name: 'Title',
              textStyleName: 'heading/h5/bold',
              characters: titleText,
              fontStyle: 'Bold',
              fontSize: 20,
              fills: tokens.getFill('on-surface'),
            },
            {
              type: 'TEXT',
              name: 'Description',
              textStyleName: 'default/body/medium/regular',
              characters: descText,
              fontStyle: 'Regular',
              fontSize: 14,
              fills: tokens.getFill('outline-highest'),
            },
          ],
        },
        {
          name: 'style=default, theme=dark',
          width: 360,
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 12,
          itemSpacingVar: 'spacing/base',
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          cornerRadius: 16,
          cornerRadiusVar: 'radius/large',
          fills: tokens.getFill('surface-inverse-subtle'),
          strokes: tokens.getStroke('outline-highest', 0.3),
          strokeWeight: 1,
          children: [
            {
              type: 'FRAME',
              name: 'HeaderRow',
              layoutMode: 'HORIZONTAL',
              primaryAxisAlignItems: 'CENTER',
              counterAxisAlignItems: 'CENTER',
              itemSpacing: 8,
              fills: [],
              children: [
                {
                  type: 'TEXT',
                  name: 'Metric',
                  textStyleName: 'heading/h1/bold',
                  characters: metricText,
                  fontStyle: 'Bold',
                  fontSize: 48,
                  fills: tokens.getFill('primary'),
                },
                {
                  type: 'ELLIPSE',
                  name: 'RedDot',
                  width: 8,
                  height: 8,
                  fills: tokens.getFill('primary'),
                },
              ],
            },
            {
              type: 'TEXT',
              name: 'Title',
              textStyleName: 'heading/h5/bold',
              characters: titleText,
              fontStyle: 'Bold',
              fontSize: 20,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'TEXT',
              name: 'Description',
              textStyleName: 'default/body/medium/regular',
              characters: descText,
              fontStyle: 'Regular',
              fontSize: 14,
              fills: tokens.getFill('outline-base'),
            },
          ],
        },
      ],
    };
  }

  // Modals & Dialogs (Modal)
  if (/modal|dialog|drawer|popup/i.test(componentName)) {
    const closeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    return {
      name: componentName,
      description: `Modal dialog container with Header, Body, and Action buttons (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'size=default',
          width: 560,
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 20,
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 32,
          paddingRight: 32,
          cornerRadius: 20,
          cornerRadiusVar: 'radius/large',
          fills: tokens.getFill('surface-subtle'),
          strokes: tokens.getStroke('outline-base', 0.4),
          strokeWeight: 1,
          children: [
            {
              type: 'FRAME',
              name: 'ModalHeader',
              layoutMode: 'HORIZONTAL',
              primaryAxisAlignItems: 'SPACE_BETWEEN',
              counterAxisAlignItems: 'CENTER',
              primaryAxisSizingMode: 'AUTO',
              counterAxisSizingMode: 'AUTO',
              width: 496,
              fills: [],
              children: [
                {
                  type: 'TEXT',
                  name: 'ModalTitle',
                  textStyleName: 'heading/h4/bold',
                  characters: 'Modal Title',
                  fontStyle: 'Bold',
                  fontSize: 24,
                  fills: tokens.getFill('on-surface'),
                },
                {
                  type: 'SVG',
                  name: 'CloseButton',
                  svgContent: closeSvg,
                  width: 20,
                  height: 20,
                },
              ],
            },
            {
              type: 'TEXT',
              name: 'ModalDescription',
              textStyleName: 'default/body/medium/regular',
              characters: 'This is a modal dialog supporting rich content, forms, and custom actions within the application.',
              fontStyle: 'Regular',
              fontSize: 14,
              fills: tokens.getFill('outline-highest'),
            },
            {
              type: 'FRAME',
              name: 'ModalFooter',
              layoutMode: 'HORIZONTAL',
              primaryAxisAlignItems: 'MAX',
              counterAxisAlignItems: 'CENTER',
              itemSpacing: 12,
              fills: [],
              children: [
                {
                  type: 'FRAME',
                  name: 'SecondaryBtn',
                  layoutMode: 'HORIZONTAL',
                  primaryAxisAlignItems: 'CENTER',
                  counterAxisAlignItems: 'CENTER',
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 18,
                  paddingRight: 18,
                  cornerRadius: 24,
                  fills: [],
                  strokes: tokens.getStroke('outline-base', 0.6),
                  strokeWeight: 1,
                  children: [
                    {
                      type: 'TEXT',
                      name: 'CancelLabel',
                      textStyleName: 'default/body/medium/bold',
                      characters: 'Cancel',
                      fontStyle: 'Bold',
                      fontSize: 14,
                      fills: tokens.getFill('on-surface'),
                    },
                  ],
                },
                {
                  type: 'FRAME',
                  name: 'PrimaryBtn',
                  layoutMode: 'HORIZONTAL',
                  primaryAxisAlignItems: 'CENTER',
                  counterAxisAlignItems: 'CENTER',
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 22,
                  paddingRight: 22,
                  cornerRadius: 24,
                  fills: tokens.getFill('primary'),
                  children: [
                    {
                      type: 'TEXT',
                      name: 'ConfirmLabel',
                      textStyleName: 'default/body/medium/bold',
                      characters: 'Confirm Action',
                      fontStyle: 'Bold',
                      fontSize: 14,
                      fills: tokens.getFill('on-primary-unstable'),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // Marquees & Tickers (LogoMarquee, ScrollingMarquee)
  if (/marquee/i.test(componentName)) {
    const buildMarqueeItem = (txt) => ({
      type: 'FRAME',
      name: 'MarqueeItem',
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      itemSpacing: 20,
      paddingLeft: 24,
      paddingRight: 24,
      fills: [],
      children: [
        {
          type: 'TEXT',
          name: 'Text',
          textStyleName: 'default/body/large/bold',
          characters: txt,
          fontStyle: 'Bold',
          fontSize: 16,
          fills: tokens.getFill('on-surface'),
        },
        {
          type: 'ELLIPSE',
          name: 'Separator',
          width: 6,
          height: 6,
          fills: tokens.getFill('primary'),
        },
      ],
    });

    return {
      name: componentName,
      description: `Continuous marquee component (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'type=desktop',
          width: 1440,
          height: 56,
          layoutMode: 'HORIZONTAL',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          fills: tokens.getFill('surface-subtle'),
          strokes: tokens.getStroke('outline-base', 0.2),
          strokeTopWeight: 1,
          strokeBottomWeight: 1,
          children: [
            buildMarqueeItem('CREATIVE ENGINEERING'),
            buildMarqueeItem('DIGITAL TRANSFORMATION'),
            buildMarqueeItem('BRAND INNOVATION'),
            buildMarqueeItem('HIGH PERFORMANCE APPS'),
          ],
        },
      ],
    };
  }

  // Navigation & Headers (Header, Footer, side-navigation, bottom-menu)
  if (/(header|footer|menu|nav)/i.test(componentName) && !/section/i.test(componentName)) {
    const isFooter = /footer/i.test(componentName);

    if (isFooter) {
      return {
        name: componentName,
        description: `Website Footer component (live from ${path.basename(tsxPath)}).`,
        variants: [
          {
            name: 'type=desktop',
            width: 1440,
            height: 280,
            layoutMode: 'VERTICAL',
            primaryAxisSizingMode: 'FIXED',
            counterAxisSizingMode: 'FIXED',
            primaryAxisAlignItems: 'SPACE_BETWEEN',
            counterAxisAlignItems: 'MIN',
            paddingTop: 48,
            paddingBottom: 32,
            paddingLeft: 64,
            paddingRight: 64,
            fills: tokens.getFill('on-surface'),
            children: [
              {
                type: 'FRAME',
                name: 'FooterTopRow',
                layoutMode: 'HORIZONTAL',
                primaryAxisAlignItems: 'SPACE_BETWEEN',
                counterAxisAlignItems: 'MIN',
                width: 1312,
                fills: [],
                children: [
                  {
                    type: 'TEXT',
                    characters: 'me&my friends',
                    textStyleName: 'heading/h4/bold',
                    fontStyle: 'Bold',
                    fontSize: 24,
                    fills: tokens.getFill('on-primary-unstable'),
                  },
                  {
                    type: 'FRAME',
                    name: 'FooterLinks',
                    layoutMode: 'HORIZONTAL',
                    itemSpacing: 32,
                    fills: [],
                    children: ['About Us', 'Case Studies', 'Services', 'Careers', 'Contact'].map((txt) => ({
                      type: 'TEXT',
                      characters: txt,
                      textStyleName: 'default/body/medium/regular',
                      fontStyle: 'Regular',
                      fontSize: 14,
                      fills: tokens.getFill('outline-base'),
                    })),
                  },
                ],
              },
              {
                type: 'TEXT',
                characters: '© 2026 me&my friends. All rights reserved.',
                textStyleName: 'default/label/small/regular',
                fontStyle: 'Regular',
                fontSize: 12,
                fills: tokens.getFill('outline-highest'),
              },
            ],
          },
        ],
      };
    }

    // Default: Header / Navbar
    const navItems = ['Work', 'Expertise', 'About', 'Careers', 'Contact'];
    return {
      name: componentName,
      description: `Website Header navigation component (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'breakpoint=desktop, theme=dark',
          width: 1440,
          height: 72,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'SPACE_BETWEEN',
          counterAxisAlignItems: 'CENTER',
          paddingLeft: 48,
          paddingRight: 48,
          fills: tokens.getFill('on-surface'),
          children: [
            {
              type: 'TEXT',
              name: 'Logo',
              characters: 'me&my friends',
              textStyleName: 'heading/h5/bold',
              fontStyle: 'Bold',
              fontSize: 20,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'FRAME',
              name: 'NavLinks',
              layoutMode: 'HORIZONTAL',
              itemSpacing: 28,
              fills: [],
              children: navItems.map((n) => ({
                type: 'TEXT',
                characters: n,
                textStyleName: 'default/body/medium/bold',
                fontStyle: 'Bold',
                fontSize: 14,
                fills: tokens.getFill('on-primary-unstable'),
              })),
            },
            {
              type: 'FRAME',
              name: 'ContactCTA',
              layoutMode: 'HORIZONTAL',
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 18,
              paddingRight: 18,
              cornerRadius: 9999,
              fills: tokens.getFill('primary'),
              children: [
                {
                  type: 'TEXT',
                  characters: "Let's Talk",
                  textStyleName: 'default/label/large/bold',
                  fontStyle: 'Bold',
                  fontSize: 13,
                  fills: tokens.getFill('on-primary-unstable'),
                },
              ],
            },
          ],
        },
        {
          name: 'breakpoint=mobile, theme=dark',
          width: 393,
          height: 56,
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'FIXED',
          counterAxisSizingMode: 'FIXED',
          primaryAxisAlignItems: 'SPACE_BETWEEN',
          counterAxisAlignItems: 'CENTER',
          paddingLeft: 20,
          paddingRight: 20,
          fills: tokens.getFill('on-surface'),
          children: [
            {
              type: 'TEXT',
              name: 'Logo',
              characters: 'me&my friends',
              textStyleName: 'heading/h6/bold',
              fontStyle: 'Bold',
              fontSize: 16,
              fills: tokens.getFill('on-primary-unstable'),
            },
            {
              type: 'FRAME',
              name: 'Hamburger',
              layoutMode: 'VERTICAL',
              itemSpacing: 4,
              fills: [],
              children: [
                { type: 'RECTANGLE', width: 22, height: 2, fills: tokens.getFill('on-primary-unstable') },
                { type: 'RECTANGLE', width: 22, height: 2, fills: tokens.getFill('on-primary-unstable') },
              ],
            },
          ],
        },
      ],
    };
  }

  // Icons & Micro-controls (Morphing*, Animated*, *Icon, CustomCursor)
  if (/(icon|cursor|arrow|hamburger|close|rotate|share)/i.test(componentName)) {
    const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

    return {
      name: componentName,
      description: `Icon control ${componentName} (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'size=24',
          width: 24,
          height: 24,
          layoutMode: 'HORIZONTAL',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          fills: [],
          children: [
            {
              type: 'SVG',
              name: 'IconGraphic',
              svgContent: arrowSvg,
              width: 20,
              height: 20,
            },
          ],
        },
        {
          name: 'size=44, style=framed',
          width: 44,
          height: 44,
          layoutMode: 'HORIZONTAL',
          primaryAxisAlignItems: 'CENTER',
          counterAxisAlignItems: 'CENTER',
          cornerRadius: 9999,
          cornerRadiusVar: 'constant/full',
          fills: tokens.getFill('primary'),
          children: [
            {
              type: 'SVG',
              name: 'IconGraphic',
              svgContent: arrowSvg,
              width: 20,
              height: 20,
            },
          ],
        },
      ],
    };
  }

  // Section Headers & Subtitles (SectionHeader, Subtitle)
  if (/section.*header|subtitle/i.test(componentName)) {
    return {
      name: componentName,
      description: `Section header block (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'breakpoint=desktop',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 12,
          itemSpacingVar: 'spacing/base',
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'Eyebrow',
              textStyleName: 'default/label/large/bold',
              characters: 'ABOUT US',
              fontStyle: 'Bold',
              fontSize: 12,
              letterSpacing: 6,
              textCase: 'UPPER',
              fills: tokens.getFill('primary'),
            },
            {
              type: 'TEXT',
              name: 'Heading',
              textStyleName: 'heading/h2/bold',
              characters: 'We craft digital experiences that matter.',
              fontStyle: 'Bold',
              fontSize: 64,
              fills: tokens.getFill('on-surface'),
            },
            {
              type: 'TEXT',
              name: 'Description',
              textStyleName: 'default/body/large/regular',
              characters: 'Combining strategic design, robust engineering, and human-centric products.',
              fontStyle: 'Regular',
              fontSize: 18,
              fills: tokens.getFill('outline-highest'),
            },
          ],
        },
        {
          name: 'breakpoint=mobile',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 8,
          fills: [],
          children: [
            {
              type: 'TEXT',
              name: 'Eyebrow',
              textStyleName: 'default/label/large/bold',
              characters: 'ABOUT US',
              fontStyle: 'Bold',
              fontSize: 11,
              letterSpacing: 4,
              textCase: 'UPPER',
              fills: tokens.getFill('primary'),
            },
            {
              type: 'TEXT',
              name: 'Heading',
              textStyleName: 'heading/h2/bold',
              characters: 'We craft digital experiences that matter.',
              fontStyle: 'Bold',
              fontSize: 36,
              fills: tokens.getFill('on-surface'),
            },
          ],
        },
      ],
    };
  }

  // Lists & Bullet Points (RedBulletList, StyledBulletList)
  if (/list|bullet/i.test(componentName)) {
    const listItems = ['Strategic Product Design', 'Enterprise React Architecture', 'Performance Optimization'];
    return {
      name: componentName,
      description: `Bullet list component (live from ${path.basename(tsxPath)}).`,
      variants: [
        {
          name: 'type=default',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          itemSpacing: 10,
          itemSpacingVar: 'spacing/small',
          fills: [],
          children: listItems.map((txt) => ({
            type: 'FRAME',
            name: 'ListItem',
            layoutMode: 'HORIZONTAL',
            primaryAxisAlignItems: 'CENTER',
            counterAxisAlignItems: 'CENTER',
            itemSpacing: 10,
            fills: [],
            children: [
              {
                type: 'ELLIPSE',
                name: 'BulletDot',
                width: 6,
                height: 6,
                fills: tokens.getFill('primary'),
              },
              {
                type: 'TEXT',
                name: 'ItemText',
                textStyleName: 'default/body/medium/regular',
                characters: txt,
                fontStyle: 'Regular',
                fontSize: 14,
                fills: tokens.getFill('on-surface'),
              },
            ],
          })),
        },
      ],
    };
  }

  return null;
}

module.exports = {
  getCuratedPreset,
};
