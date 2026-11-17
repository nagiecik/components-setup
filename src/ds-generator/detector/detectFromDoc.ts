// Document typography and color detection
import { getStepRawValue, stepRawValues, findLocalVarByNormName, migrateFallbackColorVariables } from '../variables/variableHelpers';
import { rgbToHex, resolveVarToHex } from '../utils/colorMath';
import { normalizePathForMatch } from '../utils/strings';

export async function detectTypographyFromDocument(): Promise<Record<string, any>> {
  const detected: Record<string, any> = {};
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allLocalVars = await figma.variables.getLocalVariablesAsync();

    // 1. Detect fonts from "_TypographyControls" or "_typographyControls"
    const typoCol = collections.find(c => c.name === "_TypographyControls" || c.name === "_typographyControls" || c.name === "TypographyControls" || c.name === "typographyControls");
    if (typoCol) {
      const headVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontFamily/heading", "fontFamily/header");
      const bodyVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontFamily/default", "fontFamily/body");
      const headRegVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/base", "fontWeight/header/base");
      const headMedVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/medium", "fontWeight/header/medium");
      const headBoldVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/bold", "fontWeight/header/bold");
      const bodyRegVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/base", "fontWeight/base", "fontWeight/regular");
      const bodyMedVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/medium", "fontWeight/medium");
      const bodyBoldVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/bold", "fontWeight/bold");

      const readModeFonts = (modeId: string) => {
        const result: {
          headersFont?: string;
          bodyFont?: string;
          headersStyles?: { regular: any; medium: any; bold: any };
          bodyStyles?: { regular: any; medium: any; bold: any };
        } = {};
        if (headVar) {
          const val = headVar.valuesByMode[modeId];
          if (typeof val === 'string') result.headersFont = val;
        }
        if (bodyVar) {
          const val = bodyVar.valuesByMode[modeId];
          if (typeof val === 'string') result.bodyFont = val;
        }
        if (headRegVar || headMedVar || headBoldVar) {
          result.headersStyles = {
            regular: headRegVar ? headRegVar.valuesByMode[modeId] : (bodyRegVar ? bodyRegVar.valuesByMode[modeId] : 'Regular'),
            medium: headMedVar ? headMedVar.valuesByMode[modeId] : (bodyMedVar ? bodyMedVar.valuesByMode[modeId] : 'Medium'),
            bold: headBoldVar ? headBoldVar.valuesByMode[modeId] : (bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : 'Bold')
          };
        } else if (bodyRegVar || bodyMedVar || bodyBoldVar) {
          result.headersStyles = {
            regular: bodyRegVar ? bodyRegVar.valuesByMode[modeId] : 'Regular',
            medium: bodyMedVar ? bodyMedVar.valuesByMode[modeId] : 'Medium',
            bold: bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : 'Bold'
          };
        }
        if (bodyRegVar || bodyMedVar || bodyBoldVar) {
          result.bodyStyles = {
            regular: bodyRegVar ? bodyRegVar.valuesByMode[modeId] : 'Regular',
            medium: bodyMedVar ? bodyMedVar.valuesByMode[modeId] : 'Medium',
            bold: bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : 'Bold'
          };
        }
        return result;
      };

      const defaultMode = typoCol.modes[0];
      if (defaultMode) {
        Object.assign(detected, readModeFonts(defaultMode.modeId));
      }

      const secondaryMode = typoCol.modes[1];
      if (secondaryMode) {
        const sec = readModeFonts(secondaryMode.modeId);
        detected.includeSecondaryFont = true;
        if (sec.headersFont) detected.secondaryHeadersFont = sec.headersFont;
        if (sec.bodyFont) detected.secondaryBodyFont = sec.bodyFont;
        if (sec.headersStyles) detected.secondaryHeadersStyles = sec.headersStyles;
        if (sec.bodyStyles) detected.secondaryBodyStyles = sec.bodyStyles;
      } else {
        detected.includeSecondaryFont = false;
      }
    }

    // 1.5. Detect Material Icons from "_MaterialIconsControls"
    const iconsCol = collections.find(c => c.name === "_MaterialIconsControls" || c.name === "_materialIconsControls" || c.name === "MaterialIconsControls" || c.name === "materialIconsControls");
    if (iconsCol) {
      detected.includeMaterialIcons = true;
      const defaultMode = iconsCol.modes[0];
      if (defaultMode) {
        const modeId = defaultMode.modeId;
        const famVar = findLocalVarByNormName(allLocalVars, iconsCol.id, "fontFamily/icon");
        if (famVar && typeof famVar.valuesByMode[modeId] === 'string') {
          detected.materialIconsFamily = famVar.valuesByMode[modeId];
        }
        const fillVar = findLocalVarByNormName(allLocalVars, iconsCol.id, "variableAxes/fill");
        if (fillVar && typeof fillVar.valuesByMode[modeId] === 'number') {
          detected.materialIconsFill = fillVar.valuesByMode[modeId];
        }
        const weightVar = findLocalVarByNormName(allLocalVars, iconsCol.id, "variableAxes/weight");
        if (weightVar && typeof weightVar.valuesByMode[modeId] === 'number') {
          detected.materialIconsWeight = weightVar.valuesByMode[modeId];
        }
      }
    }

    // 2. Detect stylePreset, spacing, indent from "Metrics" or "metrics"
    const metricsCol = collections.find(c => c.name === "Metrics" || c.name === "metrics" || c.name === "_metrics" || c.name === "_Metrics");
    if (metricsCol) {
      const defaultMode = metricsCol.modes[0];
      if (defaultMode) {
        const modeId = defaultMode.modeId;

        // Spacing, indent
        const lsHeadingVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/heading");
        const lsDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/display");
        const lsOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/default", "letterSpacing/others");
        const psDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphSpacing/heading", "paragraphSpacing/display");
        const psOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphSpacing/default", "paragraphSpacing/others");
        const piDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphIndent/heading", "paragraphIndent/display");
        const piOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphIndent/default", "paragraphIndent/others");

        if (lsHeadingVar && typeof lsHeadingVar.valuesByMode[modeId] === 'number') detected.lsHeading = lsHeadingVar.valuesByMode[modeId];
        if (lsDisplayVar && typeof lsDisplayVar.valuesByMode[modeId] === 'number') detected.lsDisplay = lsDisplayVar.valuesByMode[modeId];
        if (lsOthersVar && typeof lsOthersVar.valuesByMode[modeId] === 'number') detected.lsOthers = lsOthersVar.valuesByMode[modeId];
        if (psDisplayVar && typeof psDisplayVar.valuesByMode[modeId] === 'number') detected.psDisplay = psDisplayVar.valuesByMode[modeId];
        if (psOthersVar && typeof psOthersVar.valuesByMode[modeId] === 'number') detected.psOthers = psOthersVar.valuesByMode[modeId];
        if (piDisplayVar && typeof piDisplayVar.valuesByMode[modeId] === 'number') detected.piDisplay = piDisplayVar.valuesByMode[modeId];
        if (piOthersVar && typeof piOthersVar.valuesByMode[modeId] === 'number') detected.piOthers = piOthersVar.valuesByMode[modeId];

        // Radius preset based on radius/base (or fallback radius/regular) default value
        const radiusBaseVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "radius/base", "radius/regular");
        if (radiusBaseVar) {
          const radVal = radiusBaseVar.valuesByMode[modeId];
          if (radVal === 0) detected.radiusPreset = 'none';
          else if (radVal === 8) detected.radiusPreset = 'compact';
          else if (radVal === 12) detected.radiusPreset = 'default';
          else if (radVal === 16) detected.radiusPreset = 'relaxed';
          else if (radVal === 9999 || radVal === 24) detected.radiusPreset = 'full';
        }

        // Button hover preset detection based on radius/hover/base vs radius/base
        const radiusHoverVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "radius/hover/base", "radius/hover");
        if (radiusHoverVar && radiusBaseVar) {
          const hVal = radiusHoverVar.valuesByMode[modeId];
          const dVal = radiusBaseVar.valuesByMode[modeId];
          if (hVal !== undefined && dVal !== undefined && hVal < dVal) {
            const schemeCol = collections.find(c => c.name === "Schemes" || c.name === "schemes");
            if (schemeCol) {
              const primaryVar = findLocalVarByNormName(allLocalVars, schemeCol.id, "primary");
              const primaryHoverVar = findLocalVarByNormName(allLocalVars, schemeCol.id, "primaryHover");
              if (primaryVar && primaryHoverVar && primaryVar.valuesByMode && primaryHoverVar.valuesByMode) {
                const isColorSame = Object.keys(primaryVar.valuesByMode).every(m => {
                  const v1 = primaryVar.valuesByMode[m];
                  const v2 = primaryHoverVar.valuesByMode[m];
                  if (v1 && v2 && typeof v1 === 'object' && typeof v2 === 'object') {
                    return v1.id === v2.id;
                  }
                  return v1 === v2;
                });
                detected.buttonHoverPreset = isColorSame ? 'shape' : 'both';
              } else {
                detected.buttonHoverPreset = 'shape';
              }
            } else {
              detected.buttonHoverPreset = 'shape';
            }
          } else {
            detected.buttonHoverPreset = 'color';
          }
        }

        // Spacing preset based on layout/base (or fallback layout/regular) default value
        const layoutBaseVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "layout/base", "layout/regular");
        if (layoutBaseVar) {
          const gapVal = layoutBaseVar.valuesByMode[modeId];
          if (gapVal === 8) detected.spacingPreset = 'compact';
          else if (gapVal === 12) detected.spacingPreset = 'default';
          else if (gapVal === 16) detected.spacingPreset = 'relaxed';
        }

        // baseFontSize based on fontSize/body/large
        const fontSizeBodyLargeVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "fontSize/body/large");
        if (fontSizeBodyLargeVar) {
          const szVal = fontSizeBodyLargeVar.valuesByMode[modeId];
          if (szVal === 14 || szVal === 16 || szVal === 18) detected.baseFontSize = szVal;
        }

        const matchLhScale = (szVarName, lhVarName) => {
          const szV = findLocalVarByNormName(allLocalVars, metricsCol.id, szVarName);
          const lhV = findLocalVarByNormName(allLocalVars, metricsCol.id, lhVarName);
          if (szV && lhV) {
            const sz = szV.valuesByMode[modeId];
            const lh = lhV.valuesByMode[modeId];
            if (typeof sz === 'number' && typeof lh === 'number' && sz > 0) {
              const ratio = (lh / sz).toFixed(2);
              const scales = ['1', '1.1', '1.15', '1.2', '1.25', '1.33', '1.4', '1.5', '1.6', '1.75', '2'];
              return scales.find(s => parseFloat(s).toFixed(2) === ratio || Math.round(sz * parseFloat(s)) === lh);
            }
          }
          return undefined;
        };

        const detectedLhH = matchLhScale('fontSize/heading/h1', 'lineHeight/heading/h1');
        if (detectedLhH && detectedLhH !== '1') detected.lhHeading = detectedLhH;

        const detectedLhD = matchLhScale('fontSize/display/large', 'lineHeight/display/large');
        if (detectedLhD) detected.lhDisplay = detectedLhD;

        const bodySzV = findLocalVarByNormName(allLocalVars, metricsCol.id, 'fontSize/body/large');
        const bodyLhV = findLocalVarByNormName(allLocalVars, metricsCol.id, 'lineHeight/body/large');
        if (bodySzV && bodyLhV && (bodySzV.valuesByMode[modeId] + 16 === bodyLhV.valuesByMode[modeId])) {
          detected.lhOthers = 'default';
        } else if (bodySzV && bodyLhV && (bodySzV.valuesByMode[modeId] + 12 === bodyLhV.valuesByMode[modeId])) {
          detected.lhOthers = 'small';
        } else if (bodySzV && bodyLhV && (bodySzV.valuesByMode[modeId] + 8 === bodyLhV.valuesByMode[modeId])) {
          detected.lhOthers = 'extra-small';
        } else {
          const detectedLhO = matchLhScale('fontSize/body/large', 'lineHeight/body/large');
          if (detectedLhO) detected.lhOthers = detectedLhO;
        }
      }
    }

    // 3. Detect layout margin for lg, xl, 2xl from "Layout" or "layout"
    const layoutCol = collections.find(c => c.name === "Layout" || c.name === "layout" || c.name === "_layout" || c.name === "_Layout");
    if (layoutCol) {
      const marginVar = findLocalVarByNormName(allLocalVars, layoutCol.id, "margin");
      if (marginVar) {
        const xlMode = layoutCol.modes.find(m => m.name === 'XL' || m.name === 'xl');
        if (xlMode && typeof marginVar.valuesByMode[xlMode.modeId] === 'number') {
          detected.layoutMarginXl = marginVar.valuesByMode[xlMode.modeId];
        }
        const lgMode = layoutCol.modes.find(m => m.name === 'LG' || m.name === 'lg');
        if (lgMode && typeof marginVar.valuesByMode[lgMode.modeId] === 'number') {
          detected.layoutMarginLg = marginVar.valuesByMode[lgMode.modeId];
        }
        const m2xlMode = layoutCol.modes.find(m => m.name === '2XL' || m.name === '2xl');
        if (m2xlMode && typeof marginVar.valuesByMode[m2xlMode.modeId] === 'number') {
          detected.layoutMargin2xl = marginVar.valuesByMode[m2xlMode.modeId];
        }
      }

      const maxWidthVar = findLocalVarByNormName(allLocalVars, layoutCol.id, "maxwidth/screen");
      const maxHeightVar = findLocalVarByNormName(allLocalVars, layoutCol.id, "maxheight/screen");
      const smMode = layoutCol.modes.find(m => m.name === 'SM' || m.name === 'sm');
      if (smMode && maxWidthVar && maxHeightVar) {
        const w = maxWidthVar.valuesByMode[smMode.modeId];
        const h = maxHeightVar.valuesByMode[smMode.modeId];
        if (typeof w === 'number' && typeof h === 'number') {
          detected.smPhoneModel = `${w}x${h}`;
        }
      }
    }

    // 4. Detect textWrapStyle from existing local text styles if available
    const localStyles = await figma.getLocalTextStylesAsync();
    const displayStyle = localStyles.find(s => s.name.toLowerCase().startsWith('display/') || s.name.toLowerCase().includes('/display/'));
    if (displayStyle && 'textWrapStyle' in displayStyle && displayStyle.textWrapStyle) {
      detected.wrapDisplay = displayStyle.textWrapStyle;
    }
    const defaultStyle = localStyles.find(s => s.name.toLowerCase().includes('body/') || s.name.toLowerCase().includes('default/body/') || s.name.toLowerCase().startsWith('body/'));
    if (defaultStyle && 'textWrapStyle' in defaultStyle && defaultStyle.textWrapStyle) {
      detected.wrapOthers = defaultStyle.textWrapStyle;
    }
  } catch (e) {
    console.error("Error detecting typography from document:", e);
  }
  return detected;
}

const CANONICAL_ROLE_BY_NORM: Record<string, string> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'tertiary',
  neutral: 'neutral',
  accessibility: 'accessibility',
  action: 'action',
  actiondark: 'actionDark',
  success: 'success',
  successdark: 'successDark',
  warning: 'warning',
  warningdark: 'warningDark',
  error: 'error',
  errordark: 'errorDark',
};

export async function detectColorsFromDocument(): Promise<Record<string, any>> {
  const detected: Record<string, any> = {};
  const customColors: Array<{ name: string; color: string }> = [];
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allLocalVars = await figma.variables.getLocalVariablesAsync();
  migrateFallbackColorVariables(allLocalVars);

  // Track all normalized palette group names that belong to standard (possibly user-renamed) roles
  // so they are never misclassified as custom colors.
  const standardPaletteNorms = new Set<string>(Object.keys(CANONICAL_ROLE_BY_NORM));

  const registerStandardAliasName = (name?: string | null) => {
    if (!name || typeof name !== 'string') return;
    const norm = normalizePathForMatch(name);
    if (norm) standardPaletteNorms.add(norm);
  };

  const paletteCol = collections.find(
    c => c.name === "_Palettes" || c.name === "_palettes" || c.name === "Palettes" || c.name === "palettes"
  );

  const inspectControlCollection = async (controlsCol: VariableCollection, expectedRoles: string[]) => {
    const nameVar = findLocalVarByNormName(allLocalVars, controlsCol.id, "name");
    const colorVar = findLocalVarByNormName(allLocalVars, controlsCol.id, "50");
    if (!colorVar && !nameVar) return;

    type ModeEntry = {
      modeName: string;
      customName: string;
      hexColor: string | null;
      aliasedGroupName: string | null;
    };

    const entries: ModeEntry[] = [];
    for (const mode of controlsCol.modes) {
      const modeId = mode.modeId;
      const rawName = nameVar ? nameVar.valuesByMode[modeId] : undefined;
      const customName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : (mode.name || '').trim();

      let hexColor: string | null = null;
      let aliasedGroupName: string | null = null;
      const colorValue: any = colorVar ? colorVar.valuesByMode[modeId] : undefined;

      if (colorValue) {
        if (colorValue.type === 'VARIABLE_ALIAS') {
          const aliasedVar = allLocalVars.find(v => v.id === colorValue.id);
          if (aliasedVar) {
            if (aliasedVar.name.includes('/')) {
              aliasedGroupName = aliasedVar.name.substring(0, aliasedVar.name.lastIndexOf('/'));
            }
            if (paletteCol && paletteCol.modes.length > 0) {
              const resolvedColor: any = aliasedVar.valuesByMode[paletteCol.modes[0].modeId];
              if (resolvedColor && typeof resolvedColor === 'object' && 'r' in resolvedColor) {
                hexColor = rgbToHex(resolvedColor.r, resolvedColor.g, resolvedColor.b);
              }
            }
            if (!hexColor) {
              hexColor = await resolveVarToHex(aliasedVar, allLocalVars, collections);
            }
          }
        } else if (typeof colorValue === 'object' && 'r' in colorValue) {
          hexColor = rgbToHex(colorValue.r, colorValue.g, colorValue.b);
        }
      }

      entries.push({
        modeName: (mode.name || '').trim(),
        customName,
        hexColor,
        aliasedGroupName,
      });
    }

    const assignedRoles: Array<string | null> = new Array(entries.length).fill(null);
    const usedRoles = new Set<string>();

    // Pass 1: exact normalized match against role keys
    for (let i = 0; i < entries.length; i++) {
      const candidates = [entries[i].customName, entries[i].modeName, entries[i].aliasedGroupName];
      for (const cand of candidates) {
        if (!cand) continue;
        const matched = expectedRoles.find(
          r => !usedRoles.has(r) && normalizePathForMatch(r) === normalizePathForMatch(cand)
        );
        if (matched) {
          assignedRoles[i] = matched;
          usedRoles.add(matched);
          break;
        }
      }
    }

    // Pass 2: positional fallback for user-renamed standard roles (e.g. primary -> "Brand")
    for (let i = 0; i < entries.length; i++) {
      if (assignedRoles[i]) continue;
      const entry = entries[i];
      const wantsDark = normalizePathForMatch(entry.customName || entry.modeName).endsWith('dark');

      let fallbackRole: string | undefined;
      if (i < expectedRoles.length && !usedRoles.has(expectedRoles[i])) {
        const positionalRole = expectedRoles[i];
        const positionalIsDark = positionalRole.endsWith('Dark');
        if (positionalIsDark === wantsDark || entries.length === expectedRoles.length) {
          fallbackRole = positionalRole;
        }
      }
      if (!fallbackRole) {
        fallbackRole = expectedRoles.find(r => !usedRoles.has(r) && r.endsWith('Dark') === wantsDark)
          || expectedRoles.find(r => !usedRoles.has(r));
      }

      if (fallbackRole) {
        assignedRoles[i] = fallbackRole;
        usedRoles.add(fallbackRole);
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const role = assignedRoles[i];
      const entry = entries[i];
      if (!role) continue;
      registerStandardAliasName(role);
      registerStandardAliasName(entry.customName);
      registerStandardAliasName(entry.modeName);
      registerStandardAliasName(entry.aliasedGroupName);

      if (entry.customName && entry.hexColor) {
        detected[role] = { name: entry.customName, color: entry.hexColor };
      }
    }
  };

  // 1. Inspect _PaletteControls & _StatesControls first so custom-named standard roles are mapped accurately
  const paletteControlCols = collections.filter(
    c => c.name === "_PaletteControls" || c.name === "_paletteControls" || normalizePathForMatch(c.name) === "palettecontrols"
  );
  for (const col of paletteControlCols) {
    await inspectControlCollection(
      col,
      ['primary', 'secondary', 'tertiary', 'neutral', 'accessibility'],
    );
  }

  const statesControlCols = collections.filter(
    c => c.name === "_StatesControls" || c.name === "_statesControls" || normalizePathForMatch(c.name) === "statescontrols"
  );
  for (const col of statesControlCols) {
    await inspectControlCollection(
      col,
      ['action', 'actionDark', 'success', 'successDark', 'warning', 'warningDark', 'error', 'errorDark'],
    );
  }

  // 2. If control collections are missing, inspect Schemes ("Default/Surface") to detect renamed neutral palette
  const schemesCol = collections.find(
    c => c.name === "Schemes" || c.name === "schemes" || normalizePathForMatch(c.name) === "schemes"
  );
  if (schemesCol) {
    const schemeVars = allLocalVars.filter(v => v.variableCollectionId === schemesCol.id);
    const lightMode = schemesCol.modes.find(m => m.name === "Light" || m.name === "light");
    if (lightMode && !detected.neutral) {
      const surfaceVar = schemeVars.find(v => {
        const norm = normalizePathForMatch(v.name);
        return norm === 'default/surface' || norm === 'default/onsurface' || norm === 'default/surfacebackground';
      });
      const val: any = surfaceVar?.valuesByMode?.[lightMode.modeId];
      if (val && val.type === 'VARIABLE_ALIAS') {
        const aliasedVar = allLocalVars.find(v => v.id === val.id);
        if (aliasedVar && aliasedVar.name.includes('/')) {
          const groupName = aliasedVar.name.substring(0, aliasedVar.name.lastIndexOf('/'));
          registerStandardAliasName(groupName);
        }
      }
    }
  }

  // 3. Scan "_Palettes" collection directly for missing standard roles and genuine custom colors
  if (paletteCol && paletteCol.modes.length > 0) {
    const paletteVars = allLocalVars.filter(v => v.variableCollectionId === paletteCol.id);
    const defaultModeId = paletteCol.modes[0].modeId;
    const seenCustomNorms = new Set<string>();

    for (const v of paletteVars) {
      if (!v.name.endsWith("/50")) continue;
      const customName = v.name.substring(0, v.name.length - 3);
      const normName = normalizePathForMatch(customName);
      const lowerName = customName.toLowerCase();
      if (!normName || lowerName.startsWith('shades')) continue;

      const colorValue: any = v.valuesByMode[defaultModeId];
      if (!colorValue || typeof colorValue !== 'object' || !('r' in colorValue)) continue;
      const hexColor = rgbToHex(colorValue.r, colorValue.g, colorValue.b);

      if (standardPaletteNorms.has(normName)) {
        const canonicalRole = CANONICAL_ROLE_BY_NORM[normName];
        if (canonicalRole && !detected[canonicalRole]) {
          detected[canonicalRole] = { name: customName, color: hexColor };
        }
        continue;
      }

      if (!seenCustomNorms.has(normName)) {
        seenCustomNorms.add(normName);
        customColors.push({ name: customName, color: hexColor });
      }
    }
  }

  // 4. Final fallback to Schemes collection for standard roles if still undetected
  if (schemesCol) {
    const schemeVars = allLocalVars.filter(v => v.variableCollectionId === schemesCol.id);
    const lightMode = schemesCol.modes.find(m => m.name === "Light" || m.name === "light");
    if (lightMode) {
      const modeId = lightMode.modeId;
      const expectedRoles = ['primary', 'secondary', 'tertiary', 'neutral', 'action', 'success', 'warning', 'error'];
      for (const role of expectedRoles) {
        if (detected[role]) continue;
        for (const v of schemeVars) {
          const leafName = v.name.includes('/') ? v.name.split('/').pop()! : v.name;
          const normLeaf = normalizePathForMatch(leafName);
          if (normLeaf !== role && normLeaf !== `${role}default`) continue;

          const colorValue: any = v.valuesByMode[modeId];
          let hexColor: string | null = null;
          if (colorValue) {
            if (colorValue.type === 'VARIABLE_ALIAS') {
              const aliasedVar = allLocalVars.find(varInst => varInst.id === colorValue.id);
              if (aliasedVar) {
                hexColor = await resolveVarToHex(aliasedVar, allLocalVars, collections);
              }
            } else if (typeof colorValue === 'object' && 'r' in colorValue) {
              hexColor = rgbToHex(colorValue.r, colorValue.g, colorValue.b);
            }
          }
          if (hexColor) {
            const cleanName = leafName.endsWith('Default') && role !== 'primary'
              ? leafName.slice(0, -'Default'.length)
              : leafName;
            detected[role] = { name: cleanName || role, color: hexColor };
            break;
          }
        }
      }
    }
  }

  detected._customColors = customColors;
  return detected;
}

// ==========================================
