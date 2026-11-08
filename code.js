(() => {
  // ../../../../plugins/components-setup/src/audit/registry.ts
  var DEFAULT_DS_COLORS = {
    "primary": { hex: "#F04248", variableName: "primary" },
    "on-primary-unstable": { hex: "#FFFFFF", variableName: "on-primary-unstable" },
    "on-surface-primary": { hex: "#FFFFFF", variableName: "on-surface-primary" },
    "on-surface": { hex: "#181B1D", variableName: "on-surface" },
    "on-surface-subtle": { hex: "#485258", variableName: "on-surface-subtle" },
    "surface": { hex: "#FFFFFF", variableName: "surface" },
    "surface-subtle": { hex: "#E4E7E9", variableName: "surface-subtle" },
    "surface-inverse-subtle": { hex: "#24292C", variableName: "surface-inverse-subtle" },
    "surface-popout": { hex: "#AEB8BE", variableName: "surface-popout" },
    "outline-base": { hex: "#AEB8BE", variableName: "outline-base" },
    "outline-highest": { hex: "#788993", variableName: "outline-highest" },
    "secondary": { hex: "#59539F", variableName: "secondary" },
    "tertiary": { hex: "#EFF8E2", variableName: "tertiary" },
    "error": { hex: "#E7000B", variableName: "error" },
    "warning": { hex: "#F2C94C", variableName: "warning" },
    "success": { hex: "#27AE60", variableName: "success" },
    "action": { hex: "#2979FF", variableName: "action" },
    "white": { hex: "#FFFFFF", variableName: "white" },
    "black": { hex: "#000000", variableName: "black" }
  };
  var DEFAULT_DS_SPACING = {
    0: "0",
    4: "pico",
    8: "extra-small",
    10: "2.5",
    12: "small",
    14: "3.5",
    16: "base",
    18: "4.5",
    20: "medium",
    22: "5.5",
    24: "semi-large",
    32: "large",
    40: "extra-large",
    48: "huge",
    56: "extra-huge",
    64: "massive",
    72: "gigantic",
    80: "colossal"
  };
  var DEFAULT_DS_RADIUS = {
    0: "none",
    2: "extra-small",
    4: "small",
    8: "base",
    12: "medium",
    16: "large",
    20: "extra-large",
    32: "semi-large",
    999: "full",
    9999: "full"
  };
  var DEFAULT_DS_STROKE = {
    0: "0",
    1: "Constant/1",
    2: "Constant/2",
    4: "Constant/4",
    8: "Constant/8"
  };
  var DesignSystemRegistry = class {
    constructor() {
      this.colors = { ...DEFAULT_DS_COLORS };
      this.spacing = { ...DEFAULT_DS_SPACING };
      this.radius = { ...DEFAULT_DS_RADIUS };
      this.stroke = { ...DEFAULT_DS_STROKE };
      this.hexMap = /* @__PURE__ */ new Map();
      this.rebuildHexMap();
    }
    rebuildHexMap() {
      this.hexMap.clear();
      for (const [name, def] of Object.entries(this.colors)) {
        const h = def.hex.toUpperCase();
        if (!this.hexMap.has(h)) {
          this.hexMap.set(h, name);
        }
      }
    }
    updateTokens(remoteTokens) {
      if (remoteTokens.colors) {
        this.colors = { ...this.colors, ...remoteTokens.colors };
      }
      if (remoteTokens.spacing) {
        for (const [k, v] of Object.entries(remoteTokens.spacing)) {
          const num = Number(k);
          const name = typeof v === "object" && v !== null && "tailwind" in v ? v.tailwind : String(v);
          if (!isNaN(num)) this.spacing[num] = name;
        }
      }
      if (remoteTokens.radius) {
        for (const [k, v] of Object.entries(remoteTokens.radius)) {
          const num = Number(k);
          const name = typeof v === "object" && v !== null && "tailwind" in v ? v.tailwind : String(v);
          if (!isNaN(num)) this.radius[num] = name;
        }
      }
      if (remoteTokens.stroke) {
        for (const [k, v] of Object.entries(remoteTokens.stroke)) {
          const num = Number(k);
          const name = typeof v === "object" && v !== null && "tailwind" in v ? v.tailwind : String(v);
          if (!isNaN(num)) this.stroke[num] = name;
        }
      }
      this.rebuildHexMap();
    }
    getFill(tokenName, opacity = 1) {
      const key = (tokenName || "").toLowerCase().trim();
      const c = this.colors[key] || { hex: "#181B1D", variableName: tokenName };
      const fill = { hex: c.hex, variableName: c.variableName };
      if (opacity < 1) fill.opacity = opacity;
      return [fill];
    }
    getStroke(tokenName, opacity = 1) {
      const key = (tokenName || "").toLowerCase().trim();
      const c = this.colors[key] || { hex: "#AEB8BE", variableName: tokenName };
      const stroke = { hex: c.hex, variableName: c.variableName };
      if (opacity < 1) stroke.opacity = opacity;
      return [stroke];
    }
    matchColor(hex, isText = false, isStroke = false) {
      const cleanHex = hex.toUpperCase().trim();
      if (cleanHex === "#FFFFFF") {
        if (isText) return "on-surface-primary";
        if (isStroke) return "white";
        return "white";
      }
      if (this.hexMap.has(cleanHex)) {
        return this.hexMap.get(cleanHex);
      }
      return `[${cleanHex}]`;
    }
    matchSpacing(val) {
      if (this.spacing[val]) return this.spacing[val];
      for (const [k, name] of Object.entries(this.spacing)) {
        if (Math.abs(Number(k) - val) <= 1) return name;
      }
      return `[${val}px]`;
    }
    matchRadius(val) {
      if (this.radius[val]) return this.radius[val];
      for (const [k, name] of Object.entries(this.radius)) {
        if (Math.abs(Number(k) - val) <= 1) return name;
      }
      return `[${val}px]`;
    }
    matchStroke(val) {
      if (this.stroke[val]) return this.stroke[val];
      return `[${val}px]`;
    }
  };
  var dsRegistry = new DesignSystemRegistry();
  var NON_NUMERIC_PROP_KEYS = /* @__PURE__ */ new Set([
    "fills",
    "strokes",
    "effects",
    "visible",
    "characters",
    "textdata",
    "fontname",
    "fontsize",
    "lineheight",
    "letterspacing",
    "paragraphspacing",
    "paragraphindent",
    "fontweight",
    "textcase",
    "textdecoration",
    "leading",
    "tracking",
    "font",
    "typography",
    "text"
  ]);
  function getLayerTypeDisplayName(type) {
    switch (type) {
      case "SECTION":
        return "Section Layers";
      case "INSTANCE":
        return "Instance Layers";
      case "COMPONENT":
        return "Component Layers";
      case "RECTANGLE":
        return "Rectangle Layers";
      case "FRAME":
        return "Frame Layers";
      case "VECTOR":
        return "Vector Layers";
      case "COMPONENT_SET":
        return "Component_set Layers";
      case "TEXT":
        return "Text Layers";
      case "LINE":
        return "Line Layers";
      case "ELLIPSE":
        return "Ellipse Layers";
      case "STAR":
        return "Star Layers";
      case "POLYGON":
        return "Polygon Layers";
      case "GROUP":
        return "Group Layers";
      case "BOOLEAN_OPERATION":
        return "Boolean Operation Layers";
      default:
        const lower = type.toLowerCase().replace(/_/g, " ");
        const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
        return `${capitalized} Layers`;
    }
  }
  function isNonNumericProp(key) {
    const k = key.toLowerCase();
    if (NON_NUMERIC_PROP_KEYS.has(k)) return true;
    if (k.includes("font") || k.includes("text") || k.includes("lineheight") || k.includes("letterspacing") || k.includes("typography")) {
      return true;
    }
    return false;
  }
  function parsePropertyInfo(propName) {
    const p = propName.toLowerCase();
    if (p.includes("topleftradius") || p.includes("topleft")) {
      return { category: "Radius", detail: "Top-Left" };
    }
    if (p.includes("toprightradius") || p.includes("topright")) {
      return { category: "Radius", detail: "Top-Right" };
    }
    if (p.includes("bottomleftradius") || p.includes("bottomleft")) {
      return { category: "Radius", detail: "Bottom-Left" };
    }
    if (p.includes("bottomrightradius") || p.includes("bottomright")) {
      return { category: "Radius", detail: "Bottom-Right" };
    }
    if (p.includes("radius") || p.includes("corner")) {
      return { category: "Radius", detail: "All Corners" };
    }
    if (p.includes("paddingleft")) return { category: "Padding", detail: "Left" };
    if (p.includes("paddingright")) return { category: "Padding", detail: "Right" };
    if (p.includes("paddingtop")) return { category: "Padding", detail: "Top" };
    if (p.includes("paddingbottom")) return { category: "Padding", detail: "Bottom" };
    if (p.includes("padding")) return { category: "Padding", detail: "All Sides" };
    if (p.includes("itemspacing") || p === "gap") return { category: "Gap", detail: "Gap" };
    if (p.includes("counteraxisspacing")) return { category: "Gap", detail: "Counter Gap" };
    if (p.includes("spacing")) return { category: "Gap", detail: "Gap" };
    if (p.includes("stroketopweight")) return { category: "Border", detail: "Top" };
    if (p.includes("strokebottomweight")) return { category: "Border", detail: "Bottom" };
    if (p.includes("strokeleftweight")) return { category: "Border", detail: "Left" };
    if (p.includes("strokerightweight")) return { category: "Border", detail: "Right" };
    if (p.includes("stroke") || p.includes("border") || p.includes("weight")) return { category: "Border", detail: "All Sides" };
    if (p.includes("width")) return { category: "Size", detail: "Width" };
    if (p.includes("height")) return { category: "Size", detail: "Height" };
    if (p.includes("size")) return { category: "Size", detail: "Size" };
    if (p.includes("opacity")) return { category: "Opacity", detail: "Opacity" };
    if (p.includes("effect") || p.includes("shadow") || p.includes("blur") || p.includes("glass") || p.includes("frost")) {
      return { category: "Effect", detail: propName || "Effect" };
    }
    return { category: "Property", detail: propName || "Property" };
  }
  var IGNORED_CONTAINER_FRAME_NAMES = /* @__PURE__ */ new Set([
    "main",
    "section",
    "component",
    "screen"
  ]);
  function isInsideIgnoredSubtree(node) {
    let curr = node;
    while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
      const name = (curr.name || "").trim().toLowerCase();
      if (name.startsWith("_")) {
        return true;
      }
      if (curr.type === "INSTANCE") {
        return true;
      }
      curr = curr.parent;
    }
    return false;
  }
  function shouldSkipNodeReporting(node) {
    if (isInsideIgnoredSubtree(node)) return true;
    if (node.type === "SECTION") return true;
    if (node.type === "COMPONENT_SET") return true;
    if (node.type === "FRAME") {
      const nameLower = (node.name || "").trim().toLowerCase();
      if (IGNORED_CONTAINER_FRAME_NAMES.has(nameLower)) return true;
    }
    return false;
  }
  function getNodeIgnoredAuditKeys(node) {
    try {
      const raw = node.getPluginData ? node.getPluginData("ignored_audit_issues") : "";
      if (!raw) return /* @__PURE__ */ new Set();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    } catch (e) {
    }
    return /* @__PURE__ */ new Set();
  }
  function setNodeAuditIgnored(node, category, property, ignored) {
    try {
      if (!("getPluginData" in node) || !("setPluginData" in node)) return;
      const raw = node.getPluginData("ignored_audit_issues");
      let list = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {
          list = [];
        }
      }
      const key = `${category}:${property}`;
      if (ignored) {
        if (!list.includes(key)) list.push(key);
      } else {
        list = list.filter((k) => k !== key && k !== `${category}:*`);
      }
      node.setPluginData("ignored_audit_issues", JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to set pluginData for audit ignore on node:", node == null ? void 0 : node.id, e);
    }
  }

  // ../../../../plugins/components-setup/src/utils/colors.ts
  function rgbToHex(r, g, b) {
    const to255 = (c) => Math.max(0, Math.min(255, Math.round(c > 1 ? c : c * 255)));
    const hex = (c) => to255(c).toString(16).padStart(2, "0").toUpperCase();
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  function parseHexOrRgb(val) {
    if (typeof val === "string") {
      const clean = val.replace("#", "").trim();
      if (clean.length === 3) {
        return {
          r: parseInt(clean[0] + clean[0], 16) / 255,
          g: parseInt(clean[1] + clean[1], 16) / 255,
          b: parseInt(clean[2] + clean[2], 16) / 255
        };
      }
      if (clean.length >= 6) {
        return {
          r: parseInt(clean.substring(0, 2), 16) / 255,
          g: parseInt(clean.substring(2, 4), 16) / 255,
          b: parseInt(clean.substring(4, 6), 16) / 255
        };
      }
    }
    if (val && typeof val === "object" && "r" in val) {
      const r = val.r > 1 ? val.r / 255 : val.r;
      const g = val.g > 1 ? val.g / 255 : val.g;
      const b = val.b > 1 ? val.b / 255 : val.b;
      return { r, g, b };
    }
    return { r: 0, g: 0, b: 0 };
  }

  // ../../../../plugins/components-setup/src/audit/inspector.ts
  function isEffectRelated(varName, categoryNames) {
    const nameLower = varName.toLowerCase();
    const effectKeywords = ["shadow", "glass", "blur", "effect", "elevation", "frost"];
    for (const keyword of effectKeywords) {
      if (nameLower.includes(keyword)) {
        return true;
      }
    }
    for (const cat of categoryNames) {
      const catLower = cat.toLowerCase();
      for (const keyword of effectKeywords) {
        if (catLower.includes(keyword)) {
          return true;
        }
      }
    }
    return false;
  }
  function isTextOrTypographyRelated(varName, categoryNames) {
    const nameLower = varName.toLowerCase();
    const textKeywords = [
      "text",
      "typography",
      "font",
      "line-height",
      "lineheight",
      "letter-spacing",
      "letterspacing",
      "heading",
      "subheading",
      "caption",
      "display",
      "body",
      "title",
      "label",
      "paragraph",
      "leading",
      "tracking",
      "font-size",
      "fontsize",
      "font-weight",
      "fontweight"
    ];
    for (const keyword of textKeywords) {
      if (nameLower.includes(keyword)) {
        return true;
      }
    }
    for (const cat of categoryNames) {
      const catLower = cat.toLowerCase();
      for (const keyword of textKeywords) {
        if (catLower.includes(keyword)) {
          return true;
        }
      }
    }
    return false;
  }
  function extractVariableAliases(obj, bindingsMap, numericVarIdsSet, currentKey = "") {
    if (!obj || typeof obj !== "object") return;
    if (obj.type === "VARIABLE_ALIAS" && typeof obj.id === "string") {
      const varId = obj.id;
      if (!bindingsMap.has(varId)) {
        bindingsMap.set(varId, /* @__PURE__ */ new Set());
      }
      bindingsMap.get(varId).add(currentKey);
      if (!isNonNumericProp(currentKey)) {
        numericVarIdsSet.add(varId);
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        extractVariableAliases(item, bindingsMap, numericVarIdsSet, currentKey);
      }
    } else {
      for (const key of Object.keys(obj)) {
        const nextKey = isNonNumericProp(key) ? key : currentKey || key;
        extractVariableAliases(obj[key], bindingsMap, numericVarIdsSet, nextKey);
      }
    }
  }
  async function resolveVariableValueAndStatus(variable) {
    try {
      if (!variable) {
        return { value: "Missing", isMissing: true };
      }
      let collection = null;
      try {
        collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      } catch (e) {
        collection = null;
      }
      if (!collection) {
        return { value: variable.name || "Missing Collection", isMissing: true };
      }
      if (collection.variableIds && Array.isArray(collection.variableIds) && !collection.variableIds.includes(variable.id)) {
        return { value: variable.name || "Deleted Variable", isMissing: true };
      }
      const defaultModeId = collection.defaultModeId;
      let val = void 0;
      if (variable.valuesByMode) {
        if (defaultModeId && variable.valuesByMode[defaultModeId] !== void 0) {
          val = variable.valuesByMode[defaultModeId];
        } else {
          const modeKeys = Object.keys(variable.valuesByMode);
          if (modeKeys.length > 0) {
            val = variable.valuesByMode[modeKeys[0]];
          }
        }
      }
      if (val === void 0 || val === null) {
        return { value: variable.name || "Missing Value", isMissing: true };
      }
      let currentVal = val;
      let depth = 0;
      while (typeof currentVal === "object" && currentVal !== null && currentVal.type === "VARIABLE_ALIAS" && depth < 10) {
        depth++;
        const targetId = currentVal.id;
        if (!targetId) {
          return { value: "Broken Target", isMissing: true };
        }
        let targetVar = null;
        try {
          targetVar = await figma.variables.getVariableByIdAsync(targetId);
        } catch (e) {
          targetVar = null;
        }
        if (!targetVar) {
          return { value: "Missing Target Alias", isMissing: true };
        }
        let targetColl = null;
        try {
          targetColl = await figma.variables.getVariableCollectionByIdAsync(targetVar.variableCollectionId);
        } catch (e) {
          targetColl = null;
        }
        if (!targetColl) {
          return { value: "Missing Target Collection", isMissing: true };
        }
        if (targetColl.variableIds && Array.isArray(targetColl.variableIds) && !targetColl.variableIds.includes(targetVar.id)) {
          return { value: targetVar.name || "Deleted Target Variable", isMissing: true };
        }
        let nextVal = void 0;
        if (targetVar.valuesByMode) {
          if (targetColl && targetColl.defaultModeId && targetVar.valuesByMode[targetColl.defaultModeId] !== void 0) {
            nextVal = targetVar.valuesByMode[targetColl.defaultModeId];
          } else {
            const targetModeKeys = Object.keys(targetVar.valuesByMode);
            if (targetModeKeys.length > 0) {
              nextVal = targetVar.valuesByMode[targetModeKeys[0]];
            }
          }
        }
        if (nextVal === void 0 || nextVal === null) {
          return { value: targetVar.name, isMissing: true };
        }
        currentVal = nextVal;
      }
      if (typeof currentVal === "number") {
        return { value: currentVal, isMissing: false };
      }
      if (typeof currentVal === "string") {
        const num = parseFloat(currentVal);
        return { value: isNaN(num) ? currentVal : num, isMissing: false };
      }
      if (typeof currentVal === "boolean") {
        return { value: currentVal ? "true" : "false", isMissing: false };
      }
      return { value: variable.name, isMissing: false };
    } catch (e) {
      return { value: variable ? variable.name : "Unknown", isMissing: true };
    }
  }
  async function scanDocument(scope = "page") {
    let rawNodes = [];
    if (scope === "selection") {
      const sel = figma.currentPage.selection;
      if (sel && sel.length > 0) {
        const visited = /* @__PURE__ */ new Set();
        const collect = (nodes2) => {
          for (const n of nodes2) {
            if (!n || visited.has(n.id)) continue;
            visited.add(n.id);
            rawNodes.push(n);
            if ("children" in n && Array.isArray(n.children)) {
              collect(n.children);
            }
          }
        };
        collect(sel);
      }
    } else if (scope === "page") {
      rawNodes = figma.currentPage.findAll();
    } else {
      const pages = figma.root.children;
      for (const page of pages) {
        const pageNodes = page.findAll();
        rawNodes = rawNodes.concat(pageNodes);
      }
    }
    const nodes = rawNodes.filter((node) => !shouldSkipNodeReporting(node));
    const varUsageMap = /* @__PURE__ */ new Map();
    const numericVarIdsSet = /* @__PURE__ */ new Set();
    for (const node of nodes) {
      const nodeType = node.type;
      const layerTypeKey = nodeType;
      const layerTypeName = getLayerTypeDisplayName(nodeType);
      const boundVariables = node.boundVariables;
      if (boundVariables) {
        const bindingsMap = /* @__PURE__ */ new Map();
        extractVariableAliases(boundVariables, bindingsMap, numericVarIdsSet);
        for (const [varId, propNamesSet] of bindingsMap.entries()) {
          for (const propName of propNamesSet) {
            if (isNonNumericProp(propName)) continue;
            const { category, detail } = parsePropertyInfo(propName);
            if (!varUsageMap.has(varId)) {
              varUsageMap.set(varId, {
                categoriesMap: /* @__PURE__ */ new Map(),
                totalCount: 0
              });
            }
            const usageRecord = varUsageMap.get(varId);
            usageRecord.totalCount++;
            if (!usageRecord.categoriesMap.has(category)) {
              usageRecord.categoriesMap.set(category, {
                subGroupsMap: /* @__PURE__ */ new Map(),
                allNodeIdsSet: /* @__PURE__ */ new Set()
              });
            }
            const catGroup = usageRecord.categoriesMap.get(category);
            catGroup.allNodeIdsSet.add(node.id);
            const subGroupKey = `${detail}:::${layerTypeKey}`;
            if (!catGroup.subGroupsMap.has(subGroupKey)) {
              catGroup.subGroupsMap.set(subGroupKey, {
                subProperty: detail,
                layerTypeKey,
                layerTypeName,
                nodeIdsSet: /* @__PURE__ */ new Set()
              });
            }
            catGroup.subGroupsMap.get(subGroupKey).nodeIdsSet.add(node.id);
          }
        }
      }
      const explicitVariableIds = node.explicitVariableModes;
      if (explicitVariableIds) {
      }
    }
    const results = [];
    for (const [varId, usageRecord] of varUsageMap.entries()) {
      if (!numericVarIdsSet.has(varId)) continue;
      let variable = null;
      try {
        variable = await figma.variables.getVariableByIdAsync(varId);
      } catch (e) {
        console.warn("Variable not found:", varId);
      }
      const categories = [];
      for (const [catName, catData] of usageRecord.categoriesMap.entries()) {
        const subGroups = [];
        for (const sub of catData.subGroupsMap.values()) {
          subGroups.push({
            subProperty: sub.subProperty,
            layerTypeKey: sub.layerTypeKey,
            layerTypeName: sub.layerTypeName,
            count: sub.nodeIdsSet.size,
            nodeIds: Array.from(sub.nodeIdsSet)
          });
        }
        subGroups.sort((a, b) => b.count - a.count);
        categories.push({
          categoryName: catName,
          totalCount: catData.allNodeIdsSet.size,
          allNodeIds: Array.from(catData.allNodeIdsSet),
          subGroups
        });
      }
      categories.sort((a, b) => b.totalCount - a.totalCount);
      if (variable) {
        if (variable.resolvedType !== "FLOAT") continue;
        const varName = variable.name;
        const catNames = categories.map((c) => c.categoryName);
        if (isEffectRelated(varName, catNames)) continue;
        if (isTextOrTypographyRelated(varName, catNames)) continue;
        const { value, isMissing } = await resolveVariableValueAndStatus(variable);
        results.push({
          id: varId,
          name: variable.name,
          value,
          isMissing,
          totalUsages: usageRecord.totalCount,
          categories
        });
      } else {
        results.push({
          id: varId,
          name: `Missing Variable (${varId})`,
          value: "Missing",
          isMissing: true,
          totalUsages: usageRecord.totalCount,
          categories
        });
      }
    }
    results.sort((a, b) => b.totalUsages - a.totalUsages);
    figma.ui.postMessage({
      type: "scan-results",
      variables: results,
      scope
    });
  }
  function isGradientColorStyle(style) {
    if (!style) return false;
    if (typeof style.name === "string" && /gradient/i.test(style.name)) {
      return true;
    }
    if ("paints" in style && Array.isArray(style.paints)) {
      return style.paints.some((p) => p && typeof p.type === "string" && p.type.startsWith("GRADIENT"));
    }
    return false;
  }
  async function runAuditTokens(scope = "selection") {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    try {
      let getNodeBoundVariables = function(node) {
        try {
          const directBound = "boundVariables" in node && node.boundVariables ? node.boundVariables : {};
          if (node.type === "INSTANCE") {
            try {
              const main = node.mainComponent;
              if (main && "boundVariables" in main && main.boundVariables) {
                return { ...main.boundVariables, ...directBound };
              }
            } catch (e) {
            }
          }
          return directBound;
        } catch (e) {
          return {};
        }
      };
      let targetRoots = [];
      if (scope === "selection") {
        targetRoots = figma.currentPage.selection || [];
        if (targetRoots.length === 0) {
          figma.ui.postMessage({
            type: "audit-results",
            scope: "selection",
            summary: {
              totalIssues: 0,
              unboundCount: 0,
              missingCount: 0,
              gapCount: 0,
              paddingCount: 0,
              radiusCount: 0,
              colorCount: 0,
              strokeCount: 0,
              scannedNodesCount: 0,
              scope: "selection"
            },
            issues: [],
            emptyReason: "no-selection"
          });
          return;
        }
      } else {
        targetRoots = figma.currentPage.children || [];
      }
      const allNodes = [];
      const visitedIds = /* @__PURE__ */ new Set();
      const remoteInstanceCache = /* @__PURE__ */ new Map();
      async function isRemoteInstance(node) {
        if (node.type !== "INSTANCE") return false;
        if (remoteInstanceCache.has(node.id)) {
          return remoteInstanceCache.get(node.id);
        }
        const inst = node;
        try {
          let comp = null;
          if ("getMainComponentAsync" in inst && typeof inst.getMainComponentAsync === "function") {
            try {
              comp = await inst.getMainComponentAsync();
            } catch (e) {
              comp = inst.mainComponent;
            }
          } else {
            comp = inst.mainComponent;
          }
          if (!comp) {
            remoteInstanceCache.set(node.id, true);
            return true;
          }
          const isRemote = !!comp.remote || comp.parent && comp.parent.type === "COMPONENT_SET" && !!comp.parent.remote;
          remoteInstanceCache.set(node.id, isRemote);
          return isRemote;
        } catch (e) {
          try {
            const isRemote = !!(inst.mainComponent && inst.mainComponent.remote);
            remoteInstanceCache.set(node.id, isRemote);
            return isRemote;
          } catch (err) {
            remoteInstanceCache.set(node.id, false);
            return false;
          }
        }
      }
      const remoteSubtreeCache = /* @__PURE__ */ new Map();
      async function isInsideRemoteSubtree(node) {
        if (!node) return false;
        if (remoteSubtreeCache.has(node.id)) {
          return remoteSubtreeCache.get(node.id);
        }
        let curr = node.parent;
        while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
          if (curr.type === "INSTANCE") {
            if (await isRemoteInstance(curr)) {
              remoteSubtreeCache.set(node.id, true);
              return true;
            }
          }
          curr = curr.parent;
        }
        remoteSubtreeCache.set(node.id, false);
        return false;
      }
      let availableLibraryCollectionKeys = null;
      try {
        if (figma.teamLibrary && typeof figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync === "function") {
          const libs = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
          if (Array.isArray(libs)) {
            availableLibraryCollectionKeys = new Set(libs.map((l) => l.key));
          }
        }
      } catch (e) {
        availableLibraryCollectionKeys = null;
      }
      async function collectNodes(nodes) {
        if (!nodes) return;
        for (const node of nodes) {
          if (!node || visitedIds.has(node.id)) continue;
          visitedIds.add(node.id);
          if (await isRemoteInstance(node) || await isInsideRemoteSubtree(node)) {
            continue;
          }
          allNodes.push(node);
          if ("children" in node && node.children && node.children.length > 0) {
            try {
              await collectNodes(node.children);
            } catch (e) {
            }
          }
        }
      }
      await collectNodes(targetRoots);
      const varStatusCache = /* @__PURE__ */ new Map();
      async function checkVariableStatus(varId, consumerNode) {
        if (!varId || typeof varId !== "string") {
          return { variable: null, isMissing: true, name: "Unknown" };
        }
        if (varStatusCache.has(varId)) {
          const cached = varStatusCache.get(varId);
          if (cached.isMissing) return cached;
          if (cached.variable && consumerNode && typeof cached.variable.resolveForConsumer === "function") {
            try {
              const resolved = cached.variable.resolveForConsumer(consumerNode);
              if (!resolved || resolved.value === void 0 || resolved.value === null) {
                return { variable: cached.variable, isMissing: true, name: cached.name };
              }
            } catch (e) {
              return { variable: cached.variable, isMissing: true, name: cached.name };
            }
          }
          return cached;
        }
        try {
          let variable = null;
          try {
            variable = await figma.variables.getVariableByIdAsync(varId);
          } catch (e) {
            variable = null;
          }
          if (!variable) {
            const res2 = { variable: null, isMissing: true, name: `Missing Variable (${varId})` };
            varStatusCache.set(varId, res2);
            return res2;
          }
          let collection = null;
          try {
            collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
          } catch (e) {
            collection = null;
          }
          if (!collection) {
            const res2 = { variable, isMissing: true, name: variable.name };
            varStatusCache.set(varId, res2);
            return res2;
          }
          if (collection && collection.variableIds && Array.isArray(collection.variableIds) && !collection.variableIds.includes(variable.id)) {
            const res2 = { variable, isMissing: true, name: variable.name };
            varStatusCache.set(varId, res2);
            return res2;
          }
          if (collection && collection.remote && availableLibraryCollectionKeys && !availableLibraryCollectionKeys.has(collection.key)) {
            const res2 = { variable, isMissing: true, name: variable.name };
            varStatusCache.set(varId, res2);
            return res2;
          }
          if (consumerNode && typeof variable.resolveForConsumer === "function") {
            try {
              const resolved = variable.resolveForConsumer(consumerNode);
              if (!resolved || resolved.value === void 0 || resolved.value === null) {
                const res2 = { variable, isMissing: true, name: variable.name };
                varStatusCache.set(varId, res2);
                return res2;
              }
            } catch (e) {
              const res2 = { variable, isMissing: true, name: variable.name };
              varStatusCache.set(varId, res2);
              return res2;
            }
          }
          const { isMissing } = await resolveVariableValueAndStatus(variable);
          const res = { variable, isMissing, name: variable.name };
          varStatusCache.set(varId, res);
          return res;
        } catch (err) {
          const res = { variable: null, isMissing: true, name: `Missing (${varId})` };
          varStatusCache.set(varId, res);
          return res;
        }
      }
      const issues = [];
      let issueCounter = 0;
      const reportedBindingsOnNode = /* @__PURE__ */ new Set();
      const markReported = (nodeId, key) => {
        const k = `${nodeId}:${key}`;
        if (reportedBindingsOnNode.has(k)) return true;
        reportedBindingsOnNode.add(k);
        return false;
      };
      const nodeIgnoredMap = /* @__PURE__ */ new Map();
      for (const node of allNodes) {
        try {
          if (!node || node.type === "PAGE" || node.type === "DOCUMENT") continue;
          if (await isRemoteInstance(node) || await isInsideRemoteSubtree(node)) continue;
          nodeIgnoredMap.set(node.id, getNodeIgnoredAuditKeys(node));
          const boundVars = getNodeBoundVariables(node);
          const nodeType = node.type;
          const layerTypeName = getLayerTypeDisplayName(nodeType);
          const nodeName = node.name || "Unnamed Layer";
          if (node.type !== "COMPONENT_SET" && "layoutMode" in node && node.layoutMode !== "NONE") {
            const frame = node;
            const isAutoGap = frame.primaryAxisAlignItems === "SPACE_BETWEEN";
            if (!isAutoGap) {
              const itemSpacing = typeof frame.itemSpacing === "number" ? frame.itemSpacing : 0;
              const gapBinding = boundVars.itemSpacing;
              if (gapBinding && gapBinding.type === "VARIABLE_ALIAS" && gapBinding.id) {
                const vStatus = await checkVariableStatus(gapBinding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${gapBinding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "gap",
                    categoryLabel: "Gap",
                    property: "itemSpacing",
                    propertyLabel: "Gap",
                    issueType: "missing",
                    value: itemSpacing,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: gapBinding.id,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid Spacing variable"
                  });
                }
              } else {
                const tokenMatch = dsRegistry.matchSpacing(itemSpacing);
                const isArbitrary = tokenMatch.startsWith("[");
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: "gap",
                  categoryLabel: "Gap",
                  property: "itemSpacing",
                  propertyLabel: "Gap",
                  issueType: "unbound",
                  value: itemSpacing,
                  formattedValue: `${itemSpacing}px`,
                  suggestion: isArbitrary ? "Arbitrary value \u2014 bind to Spacing variable" : `Matches token: ${tokenMatch} (${itemSpacing}px)`
                });
              }
            }
            const isAutoCounterGap = frame.counterAxisAlignContent === "SPACE_BETWEEN";
            if (!isAutoCounterGap && "layoutWrap" in frame && frame.layoutWrap === "WRAP" && typeof frame.counterAxisSpacing === "number") {
              const counterSpacing = frame.counterAxisSpacing;
              const counterBinding = boundVars.counterAxisSpacing;
              if (counterBinding && counterBinding.type === "VARIABLE_ALIAS" && counterBinding.id) {
                const vStatus = await checkVariableStatus(counterBinding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${counterBinding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "gap",
                    categoryLabel: "Gap",
                    property: "counterAxisSpacing",
                    propertyLabel: "Counter Gap",
                    issueType: "missing",
                    value: counterSpacing,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: counterBinding.id,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid Spacing variable"
                  });
                }
              } else {
                const tokenMatch = dsRegistry.matchSpacing(counterSpacing);
                const isArbitrary = tokenMatch.startsWith("[");
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: "gap",
                  categoryLabel: "Gap",
                  property: "counterAxisSpacing",
                  propertyLabel: "Counter Gap",
                  issueType: "unbound",
                  value: counterSpacing,
                  formattedValue: `${counterSpacing}px`,
                  suggestion: isArbitrary ? "Arbitrary value \u2014 bind to Spacing variable" : `Matches token: ${tokenMatch} (${counterSpacing}px)`
                });
              }
            }
          }
          if (node.type !== "COMPONENT_SET" && "layoutMode" in node && node.layoutMode !== "NONE") {
            const frame = node;
            const paddingProps = [
              { key: "paddingTop", label: "Padding Top", val: typeof frame.paddingTop === "number" ? frame.paddingTop : 0 },
              { key: "paddingBottom", label: "Padding Bottom", val: typeof frame.paddingBottom === "number" ? frame.paddingBottom : 0 },
              { key: "paddingLeft", label: "Padding Left", val: typeof frame.paddingLeft === "number" ? frame.paddingLeft : 0 },
              { key: "paddingRight", label: "Padding Right", val: typeof frame.paddingRight === "number" ? frame.paddingRight : 0 }
            ];
            for (const p of paddingProps) {
              const binding = boundVars[p.key];
              if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
                const vStatus = await checkVariableStatus(binding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "padding",
                    categoryLabel: "Padding",
                    property: p.key,
                    propertyLabel: p.label,
                    issueType: "missing",
                    value: p.val,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: binding.id,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid Spacing variable"
                  });
                }
              } else {
                const tokenMatch = dsRegistry.matchSpacing(p.val);
                const isArbitrary = tokenMatch.startsWith("[");
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: "padding",
                  categoryLabel: "Padding",
                  property: p.key,
                  propertyLabel: p.label,
                  issueType: "unbound",
                  value: p.val,
                  formattedValue: `${p.val}px`,
                  suggestion: isArbitrary ? "Arbitrary value \u2014 bind to Spacing variable" : `Matches token: ${tokenMatch} (${p.val}px)`
                });
              }
            }
          }
          const isEllipseShape = node.type === "ELLIPSE" || "arcData" in node;
          if (node.type !== "COMPONENT_SET" && !isEllipseShape && "cornerRadius" in node) {
            const cornerRadius = node.cornerRadius;
            if (cornerRadius === figma.mixed && "topLeftRadius" in node) {
              const corners = [
                { key: "topLeftRadius", label: "Top-Left Radius", val: typeof node.topLeftRadius === "number" ? node.topLeftRadius : 0 },
                { key: "topRightRadius", label: "Top-Right Radius", val: typeof node.topRightRadius === "number" ? node.topRightRadius : 0 },
                { key: "bottomLeftRadius", label: "Bottom-Left Radius", val: typeof node.bottomLeftRadius === "number" ? node.bottomLeftRadius : 0 },
                { key: "bottomRightRadius", label: "Bottom-Right Radius", val: typeof node.bottomRightRadius === "number" ? node.bottomRightRadius : 0 }
              ];
              for (const c of corners) {
                const binding = boundVars[c.key];
                if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
                  const vStatus = await checkVariableStatus(binding.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "radius",
                      categoryLabel: "Radius",
                      property: c.key,
                      propertyLabel: c.label,
                      issueType: "missing",
                      value: c.val,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: binding.id,
                      varName: vStatus.name,
                      suggestion: "Reassign to a valid Radius variable"
                    });
                  }
                } else {
                  const tokenMatch = dsRegistry.matchRadius(c.val);
                  const isArbitrary = tokenMatch.startsWith("[");
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "radius",
                    categoryLabel: "Radius",
                    property: c.key,
                    propertyLabel: c.label,
                    issueType: "unbound",
                    value: c.val,
                    formattedValue: `${c.val}px`,
                    suggestion: isArbitrary ? "Arbitrary value \u2014 bind to Radius variable" : `Matches token: ${tokenMatch} (${c.val}px)`
                  });
                }
              }
            } else if (typeof cornerRadius === "number") {
              const binding = boundVars.cornerRadius;
              const indBindings = [boundVars.topLeftRadius, boundVars.topRightRadius, boundVars.bottomLeftRadius, boundVars.bottomRightRadius].filter(Boolean);
              if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
                const vStatus = await checkVariableStatus(binding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "radius",
                    categoryLabel: "Radius",
                    property: "cornerRadius",
                    propertyLabel: "Corner Radius",
                    issueType: "missing",
                    value: cornerRadius,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: binding.id,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid Radius variable"
                  });
                }
              } else if (indBindings.length > 0) {
                for (const indBinding of indBindings) {
                  if (indBinding.type === "VARIABLE_ALIAS" && indBinding.id) {
                    const vStatus = await checkVariableStatus(indBinding.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${indBinding.id}`)) {
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "radius",
                        categoryLabel: "Radius",
                        property: "cornerRadius",
                        propertyLabel: "Corner Radius",
                        issueType: "missing",
                        value: cornerRadius,
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: indBinding.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid Radius variable"
                      });
                      break;
                    }
                  }
                }
              } else {
                const tokenMatch = dsRegistry.matchRadius(cornerRadius);
                const isArbitrary = tokenMatch.startsWith("[");
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: "radius",
                  categoryLabel: "Radius",
                  property: "cornerRadius",
                  propertyLabel: "Corner Radius",
                  issueType: "unbound",
                  value: cornerRadius,
                  formattedValue: `${cornerRadius}px`,
                  suggestion: isArbitrary ? "Arbitrary value \u2014 bind to Radius variable" : `Matches token: ${tokenMatch} (${cornerRadius}px)`
                });
              }
            }
          }
          const hasVisibleStrokes = "strokes" in node && Array.isArray(node.strokes) && node.strokes.some((p) => p && p.visible !== false);
          if (hasVisibleStrokes && "strokeWeight" in node) {
            const sw = node.strokeWeight;
            if (sw === figma.mixed) {
              const sideConfigs = [
                { key: "strokeTopWeight", label: "Stroke Top Weight", val: node.strokeTopWeight },
                { key: "strokeRightWeight", label: "Stroke Right Weight", val: node.strokeRightWeight },
                { key: "strokeBottomWeight", label: "Stroke Bottom Weight", val: node.strokeBottomWeight },
                { key: "strokeLeftWeight", label: "Stroke Left Weight", val: node.strokeLeftWeight }
              ];
              for (const s of sideConfigs) {
                if (typeof s.val === "number" && s.val > 0) {
                  const binding = boundVars[s.key] || boundVars.strokeWeight;
                  if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
                    const vStatus = await checkVariableStatus(binding.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "stroke",
                        categoryLabel: "Stroke",
                        property: s.key,
                        propertyLabel: s.label,
                        issueType: "missing",
                        value: s.val,
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: binding.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid Stroke variable"
                      });
                    }
                  } else {
                    const tokenMatch = dsRegistry.matchStroke(s.val);
                    const isArbitrary = tokenMatch.startsWith("[");
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "stroke",
                      categoryLabel: "Stroke",
                      property: s.key,
                      propertyLabel: s.label,
                      issueType: "unbound",
                      value: s.val,
                      formattedValue: `${s.val}px`,
                      suggestion: isArbitrary ? "Arbitrary stroke weight \u2014 bind to Stroke variable" : `Matches token: ${tokenMatch} (${s.val}px)`
                    });
                  }
                }
              }
            } else if (typeof sw === "number" && sw > 0) {
              const binding = boundVars.strokeWeight;
              const indBindings = [boundVars.strokeTopWeight, boundVars.strokeRightWeight, boundVars.strokeBottomWeight, boundVars.strokeLeftWeight].filter(Boolean);
              if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
                const vStatus = await checkVariableStatus(binding.id, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${binding.id}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "stroke",
                    categoryLabel: "Stroke",
                    property: "strokeWeight",
                    propertyLabel: "Stroke Weight",
                    issueType: "missing",
                    value: sw,
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: binding.id,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid Stroke variable"
                  });
                }
              } else if (indBindings.length > 0) {
                for (const indBinding of indBindings) {
                  if (indBinding.type === "VARIABLE_ALIAS" && indBinding.id) {
                    const vStatus = await checkVariableStatus(indBinding.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${indBinding.id}`)) {
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "stroke",
                        categoryLabel: "Stroke",
                        property: "strokeWeight",
                        propertyLabel: "Stroke Weight",
                        issueType: "missing",
                        value: sw,
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: indBinding.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid Stroke variable"
                      });
                      break;
                    }
                  }
                }
              } else {
                const tokenMatch = dsRegistry.matchStroke(sw);
                const isArbitrary = tokenMatch.startsWith("[");
                issues.push({
                  id: `issue_${++issueCounter}`,
                  nodeId: node.id,
                  nodeName,
                  layerType: nodeType,
                  layerTypeName,
                  category: "stroke",
                  categoryLabel: "Stroke",
                  property: "strokeWeight",
                  propertyLabel: "Stroke Weight",
                  issueType: "unbound",
                  value: sw,
                  formattedValue: `${sw}px`,
                  suggestion: isArbitrary ? "Arbitrary stroke weight \u2014 bind to Stroke variable" : `Matches token: ${tokenMatch} (${sw}px)`
                });
              }
            }
          }
          if (node.type !== "COMPONENT_SET") {
            if (typeof node.fillStyleId === "string" && node.fillStyleId.length > 0) {
              const styleId = node.fillStyleId;
              try {
                const style = await figma.getStyleByIdAsync(styleId);
                if (!style) {
                  if (!markReported(node.id, `style:${styleId}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "fills",
                      propertyLabel: "Fill Style",
                      issueType: "missing",
                      value: "#888888",
                      formattedValue: `Missing Style (${styleId})`,
                      suggestion: "Reassign to a valid Color Style or Variable"
                    });
                  }
                } else if (style.type === "PAINT") {
                  const isGrad = isGradientColorStyle(style);
                  if (!isGrad && !markReported(node.id, `style:${styleId}`)) {
                    let hex = "#888888";
                    let tokenMatch = "";
                    if ("paints" in style && Array.isArray(style.paints)) {
                      const solidPaint = style.paints.find((p) => p && p.visible !== false && p.type === "SOLID");
                      if (solidPaint) {
                        hex = rgbToHex(solidPaint.color.r, solidPaint.color.g, solidPaint.color.b);
                        tokenMatch = dsRegistry.matchColor(hex, node.type === "TEXT", false);
                      }
                    }
                    const isArbitrary = !tokenMatch || tokenMatch.startsWith("[");
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "fills",
                      propertyLabel: "Fill Style",
                      issueType: "unbound",
                      value: hex,
                      formattedValue: `Style: ${style.name}`,
                      suggestion: isArbitrary ? `Legacy Color Style "${style.name}" \u2014 bind directly to Color variable` : `Legacy Color Style "${style.name}" \u2014 matches token: ${tokenMatch} (${hex})`
                    });
                  }
                  if ("paints" in style && Array.isArray(style.paints)) {
                    for (const sp of style.paints) {
                      const spBinding = (_a = sp.boundVariables) == null ? void 0 : _a.color;
                      if (spBinding && spBinding.type === "VARIABLE_ALIAS" && spBinding.id) {
                        const vStatus = await checkVariableStatus(spBinding.id, node);
                        if (vStatus.isMissing && !markReported(node.id, `var:${spBinding.id}`)) {
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName,
                            layerType: nodeType,
                            layerTypeName,
                            category: "color",
                            categoryLabel: "Color",
                            property: "fills",
                            propertyLabel: `Style "${style.name}"`,
                            issueType: "missing",
                            value: sp.type === "SOLID" ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : "#888888",
                            formattedValue: `Missing Variable (${vStatus.name}) in "${style.name}"`,
                            varId: spBinding.id,
                            varName: vStatus.name,
                            suggestion: "Reassign to a valid Color variable"
                          });
                        }
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
            if ("fills" in node && Array.isArray(node.fills)) {
              const fills = node.fills;
              const boundFills = boundVars.fills;
              for (let i = 0; i < fills.length; i++) {
                const paint = fills[i];
                if (!paint || paint.visible === false) continue;
                const propLabel = fills.length > 1 ? `Fill (${i + 1})` : "Fill";
                const boundFill = Array.isArray(boundFills) ? boundFills[i] : boundFills && typeof boundFills === "object" ? boundFills[i] || boundFills[String(i)] : void 0;
                const colorBinding = ((_b = paint.boundVariables) == null ? void 0 : _b.color) || boundFill;
                if (colorBinding && colorBinding.type === "VARIABLE_ALIAS" && colorBinding.id) {
                  const vStatus = await checkVariableStatus(colorBinding.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
                    const valHex = paint.type === "SOLID" ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : "#888888";
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "fills",
                      propertyLabel: propLabel,
                      issueType: "missing",
                      value: valHex,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: colorBinding.id,
                      varName: vStatus.name,
                      suggestion: "Reassign to a valid Color variable"
                    });
                  }
                } else if (paint.type === "SOLID") {
                  const hasStyle = typeof node.fillStyleId === "string" && node.fillStyleId.length > 0;
                  if (!hasStyle) {
                    const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                    const opacityStr = typeof paint.opacity === "number" && paint.opacity < 1 ? ` (${Math.round(paint.opacity * 100)}%)` : "";
                    const isText = node.type === "TEXT";
                    const tokenMatch = dsRegistry.matchColor(hex, isText, false);
                    const isArbitrary = tokenMatch.startsWith("[");
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "fills",
                      propertyLabel: propLabel,
                      issueType: "unbound",
                      value: hex,
                      formattedValue: `${hex}${opacityStr}`,
                      suggestion: isArbitrary ? "Arbitrary color \u2014 bind to Color variable" : `Matches token: ${tokenMatch} (${hex})`
                    });
                  }
                } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
                  if (Array.isArray(paint.gradientStops)) {
                    for (let sIdx = 0; sIdx < paint.gradientStops.length; sIdx++) {
                      const stop = paint.gradientStops[sIdx];
                      const stopBinding = (_c = stop.boundVariables) == null ? void 0 : _c.color;
                      if (stopBinding && stopBinding.type === "VARIABLE_ALIAS" && stopBinding.id) {
                        const vStatus = await checkVariableStatus(stopBinding.id, node);
                        if (vStatus.isMissing && !markReported(node.id, `var:${stopBinding.id}`)) {
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName,
                            layerType: nodeType,
                            layerTypeName,
                            category: "color",
                            categoryLabel: "Color",
                            property: "fills",
                            propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                            issueType: "missing",
                            value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                            formattedValue: `Missing Variable (${vStatus.name})`,
                            varId: stopBinding.id,
                            varName: vStatus.name,
                            suggestion: "Reassign to a valid Color variable"
                          });
                        }
                      }
                    }
                  }
                }
                const paintOpBinding = (_d = paint.boundVariables) == null ? void 0 : _d.opacity;
                if (paintOpBinding && paintOpBinding.type === "VARIABLE_ALIAS" && paintOpBinding.id) {
                  const vStatus = await checkVariableStatus(paintOpBinding.id, node);
                  if (vStatus.isMissing && !markReported(node.id, `var:${paintOpBinding.id}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "fills",
                      propertyLabel: `${propLabel} Opacity`,
                      issueType: "missing",
                      value: (_e = paint.opacity) != null ? _e : 1,
                      formattedValue: `Missing Variable (${vStatus.name})`,
                      varId: paintOpBinding.id,
                      varName: vStatus.name,
                      suggestion: "Reassign to a valid Number variable"
                    });
                  }
                }
              }
            } else if (node.type === "TEXT" && node.fills === figma.mixed) {
              try {
                const textNode = node;
                const segments = textNode.getStyledTextSegments(["fills", "boundVariables", "fillStyleId"]);
                for (let sIdx = 0; sIdx < segments.length; sIdx++) {
                  const seg = segments[sIdx];
                  if (Array.isArray(seg.fills)) {
                    for (let pIdx = 0; pIdx < seg.fills.length; pIdx++) {
                      const paint = seg.fills[pIdx];
                      if (!paint || paint.visible === false) continue;
                      const colorBinding = ((_f = paint.boundVariables) == null ? void 0 : _f.color) || ((_h = (_g = seg.boundVariables) == null ? void 0 : _g.fills) == null ? void 0 : _h[pIdx]);
                      const segLabel = segments.length > 1 ? `Text Segment (${sIdx + 1})` : "Text Fill";
                      if (colorBinding && colorBinding.type === "VARIABLE_ALIAS" && colorBinding.id) {
                        const vStatus = await checkVariableStatus(colorBinding.id, node);
                        if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName,
                            layerType: nodeType,
                            layerTypeName,
                            category: "color",
                            categoryLabel: "Color",
                            property: "fills",
                            propertyLabel: segLabel,
                            issueType: "missing",
                            value: paint.type === "SOLID" ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : "#888888",
                            formattedValue: `Missing Variable (${vStatus.name})`,
                            varId: colorBinding.id,
                            varName: vStatus.name,
                            suggestion: "Reassign to a valid Color variable"
                          });
                        }
                      } else if (paint.type === "SOLID") {
                        const hasSegStyle = typeof seg.fillStyleId === "string" && seg.fillStyleId.length > 0;
                        if (!hasSegStyle) {
                          const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                          const opacityStr = typeof paint.opacity === "number" && paint.opacity < 1 ? ` (${Math.round(paint.opacity * 100)}%)` : "";
                          const tokenMatch = dsRegistry.matchColor(hex, true, false);
                          const isArbitrary = tokenMatch.startsWith("[");
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName,
                            layerType: nodeType,
                            layerTypeName,
                            category: "color",
                            categoryLabel: "Color",
                            property: "fills",
                            propertyLabel: segLabel,
                            issueType: "unbound",
                            value: hex,
                            formattedValue: `${hex}${opacityStr}`,
                            suggestion: isArbitrary ? "Arbitrary color \u2014 bind to Color variable" : `Matches token: ${tokenMatch} (${hex})`
                          });
                        } else {
                          const segStyleId = seg.fillStyleId;
                          if (!markReported(node.id, `segstyle:${segStyleId}`)) {
                            try {
                              const segStyle = await figma.getStyleByIdAsync(segStyleId);
                              const styleName = segStyle ? segStyle.name : segStyleId;
                              const isGrad = isGradientColorStyle(segStyle);
                              if (!isGrad) {
                                const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                                const tokenMatch = dsRegistry.matchColor(hex, true, false);
                                const isArbitrary = tokenMatch.startsWith("[");
                                issues.push({
                                  id: `issue_${++issueCounter}`,
                                  nodeId: node.id,
                                  nodeName,
                                  layerType: nodeType,
                                  layerTypeName,
                                  category: "color",
                                  categoryLabel: "Color",
                                  property: "fills",
                                  propertyLabel: segLabel,
                                  issueType: "unbound",
                                  value: hex,
                                  formattedValue: `Style: ${styleName}`,
                                  suggestion: isArbitrary ? `Legacy Color Style "${styleName}" \u2014 bind directly to Color variable` : `Legacy Color Style "${styleName}" \u2014 matches token: ${tokenMatch} (${hex})`
                                });
                              }
                            } catch (e) {
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
            if (typeof node.strokeStyleId === "string" && node.strokeStyleId.length > 0) {
              const styleId = node.strokeStyleId;
              try {
                const style = await figma.getStyleByIdAsync(styleId);
                if (!style) {
                  if (!markReported(node.id, `style:${styleId}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "strokes",
                      propertyLabel: "Stroke Style",
                      issueType: "missing",
                      value: "#888888",
                      formattedValue: `Missing Style (${styleId})`,
                      suggestion: "Reassign to a valid Color Style or Variable"
                    });
                  }
                } else if (style.type === "PAINT") {
                  const isGrad = isGradientColorStyle(style);
                  if (!isGrad && !markReported(node.id, `style:${styleId}`)) {
                    let hex = "#888888";
                    let tokenMatch = "";
                    if ("paints" in style && Array.isArray(style.paints)) {
                      const solidPaint = style.paints.find((p) => p && p.visible !== false && p.type === "SOLID");
                      if (solidPaint) {
                        hex = rgbToHex(solidPaint.color.r, solidPaint.color.g, solidPaint.color.b);
                        tokenMatch = dsRegistry.matchColor(hex, false, true);
                      }
                    }
                    const isArbitrary = !tokenMatch || tokenMatch.startsWith("[");
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "strokes",
                      propertyLabel: "Stroke Style",
                      issueType: "unbound",
                      value: hex,
                      formattedValue: `Style: ${style.name}`,
                      suggestion: isArbitrary ? `Legacy Color Style "${style.name}" \u2014 bind directly to Color variable` : `Legacy Color Style "${style.name}" \u2014 matches token: ${tokenMatch} (${hex})`
                    });
                  }
                  if ("paints" in style && Array.isArray(style.paints)) {
                    for (const sp of style.paints) {
                      const spBinding = (_i = sp.boundVariables) == null ? void 0 : _i.color;
                      if (spBinding && spBinding.type === "VARIABLE_ALIAS" && spBinding.id) {
                        const vStatus = await checkVariableStatus(spBinding.id, node);
                        if (vStatus.isMissing && !markReported(node.id, `var:${spBinding.id}`)) {
                          issues.push({
                            id: `issue_${++issueCounter}`,
                            nodeId: node.id,
                            nodeName,
                            layerType: nodeType,
                            layerTypeName,
                            category: "color",
                            categoryLabel: "Color",
                            property: "strokes",
                            propertyLabel: `Style "${style.name}"`,
                            issueType: "missing",
                            value: sp.type === "SOLID" ? rgbToHex(sp.color.r, sp.color.g, sp.color.b) : "#888888",
                            formattedValue: `Missing Variable (${vStatus.name}) in "${style.name}"`,
                            varId: spBinding.id,
                            varName: vStatus.name,
                            suggestion: "Reassign to a valid Color variable"
                          });
                        }
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
            if ("strokes" in node && Array.isArray(node.strokes)) {
              const hasStrokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight > 0 : true;
              if (hasStrokeWeight) {
                const strokes = node.strokes;
                const boundStrokes = boundVars.strokes;
                for (let i = 0; i < strokes.length; i++) {
                  const paint = strokes[i];
                  if (!paint || paint.visible === false) continue;
                  const propLabel = strokes.length > 1 ? `Stroke (${i + 1})` : "Stroke";
                  const boundStroke = Array.isArray(boundStrokes) ? boundStrokes[i] : boundStrokes && typeof boundStrokes === "object" ? boundStrokes[i] || boundStrokes[String(i)] : void 0;
                  const colorBinding = ((_j = paint.boundVariables) == null ? void 0 : _j.color) || boundStroke;
                  if (colorBinding && colorBinding.type === "VARIABLE_ALIAS" && colorBinding.id) {
                    const vStatus = await checkVariableStatus(colorBinding.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${colorBinding.id}`)) {
                      const valHex = paint.type === "SOLID" ? rgbToHex(paint.color.r, paint.color.g, paint.color.b) : "#888888";
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "color",
                        categoryLabel: "Color",
                        property: "strokes",
                        propertyLabel: propLabel,
                        issueType: "missing",
                        value: valHex,
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: colorBinding.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid Color variable"
                      });
                    }
                  } else if (paint.type === "SOLID") {
                    const hasStyle = typeof node.strokeStyleId === "string" && node.strokeStyleId.length > 0;
                    if (!hasStyle) {
                      const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
                      const opacityStr = typeof paint.opacity === "number" && paint.opacity < 1 ? ` (${Math.round(paint.opacity * 100)}%)` : "";
                      const tokenMatch = dsRegistry.matchColor(hex, false, true);
                      const isArbitrary = tokenMatch.startsWith("[");
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "color",
                        categoryLabel: "Color",
                        property: "strokes",
                        propertyLabel: propLabel,
                        issueType: "unbound",
                        value: hex,
                        formattedValue: `${hex}${opacityStr}`,
                        suggestion: isArbitrary ? "Arbitrary color \u2014 bind to Color variable" : `Matches token: ${tokenMatch} (${hex})`
                      });
                    }
                  } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
                    if (Array.isArray(paint.gradientStops)) {
                      for (let sIdx = 0; sIdx < paint.gradientStops.length; sIdx++) {
                        const stop = paint.gradientStops[sIdx];
                        const stopBinding = (_k = stop.boundVariables) == null ? void 0 : _k.color;
                        if (stopBinding && stopBinding.type === "VARIABLE_ALIAS" && stopBinding.id) {
                          const vStatus = await checkVariableStatus(stopBinding.id, node);
                          if (vStatus.isMissing && !markReported(node.id, `var:${stopBinding.id}`)) {
                            issues.push({
                              id: `issue_${++issueCounter}`,
                              nodeId: node.id,
                              nodeName,
                              layerType: nodeType,
                              layerTypeName,
                              category: "color",
                              categoryLabel: "Color",
                              property: "strokes",
                              propertyLabel: `${propLabel} Stop (${sIdx + 1})`,
                              issueType: "missing",
                              value: rgbToHex(stop.color.r, stop.color.g, stop.color.b),
                              formattedValue: `Missing Variable (${vStatus.name})`,
                              varId: stopBinding.id,
                              varName: vStatus.name,
                              suggestion: "Reassign to a valid Color variable"
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            let hasRemoteOrValidEffectStyle = false;
            if (typeof node.effectStyleId === "string" && node.effectStyleId.length > 0) {
              const styleId = node.effectStyleId;
              try {
                const style = await figma.getStyleByIdAsync(styleId);
                if (style) {
                  hasRemoteOrValidEffectStyle = true;
                } else if (!markReported(node.id, `style:${styleId}`)) {
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: "color",
                    categoryLabel: "Color",
                    property: "effects",
                    propertyLabel: "Effect Style",
                    issueType: "missing",
                    value: "#888888",
                    formattedValue: `Missing Style (${styleId})`,
                    suggestion: "Reassign to a valid Effect Style or Variable"
                  });
                }
              } catch (e) {
              }
            }
            if (!hasRemoteOrValidEffectStyle && "effects" in node && Array.isArray(node.effects)) {
              const effects = node.effects;
              for (let eIdx = 0; eIdx < effects.length; eIdx++) {
                const eff = effects[eIdx];
                if (!eff || eff.visible === false) continue;
                if (eff.type === "DROP_SHADOW" || eff.type === "INNER_SHADOW") {
                  const effColorBinding = (_l = eff.boundVariables) == null ? void 0 : _l.color;
                  const effLabel = effects.length > 1 ? `Shadow (${eIdx + 1})` : "Shadow";
                  if (effColorBinding && effColorBinding.type === "VARIABLE_ALIAS" && effColorBinding.id) {
                    const vStatus = await checkVariableStatus(effColorBinding.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${effColorBinding.id}`)) {
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: "color",
                        categoryLabel: "Color",
                        property: "effects",
                        propertyLabel: effLabel,
                        issueType: "missing",
                        value: rgbToHex(eff.color.r, eff.color.g, eff.color.b),
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: effColorBinding.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid Color variable"
                      });
                    }
                  }
                }
              }
            }
            let hasRemoteOrValidTextStyle = false;
            if (node.type === "TEXT") {
              const textStyleId = node.textStyleId;
              if (typeof textStyleId === "string" && textStyleId.length > 0) {
                try {
                  const textStyle = await figma.getStyleByIdAsync(textStyleId);
                  if (textStyle) {
                    hasRemoteOrValidTextStyle = true;
                  } else if (!markReported(node.id, `style:${textStyleId}`)) {
                    issues.push({
                      id: `issue_${++issueCounter}`,
                      nodeId: node.id,
                      nodeName,
                      layerType: nodeType,
                      layerTypeName,
                      category: "color",
                      categoryLabel: "Color",
                      property: "textStyleId",
                      propertyLabel: "Text Style",
                      issueType: "missing",
                      value: "#888888",
                      formattedValue: `Missing Style (${textStyleId})`,
                      suggestion: "Reassign to a valid Text Style or Variable"
                    });
                  }
                } catch (e) {
                }
              } else if (textStyleId === figma.mixed) {
                try {
                  const textNode = node;
                  const segs = textNode.getStyledTextSegments(["textStyleId"]);
                  for (const seg of segs) {
                    if (typeof seg.textStyleId === "string" && seg.textStyleId.length > 0) {
                      const segStyle = await figma.getStyleByIdAsync(seg.textStyleId);
                      if (segStyle) {
                        hasRemoteOrValidTextStyle = true;
                        break;
                      }
                    }
                  }
                } catch (e) {
                }
              }
            }
            for (const [bKey, bVal] of Object.entries(boundVars)) {
              if (!bVal) continue;
              if (bKey === "effects" && hasRemoteOrValidEffectStyle) continue;
              if (hasRemoteOrValidTextStyle && /^(fontFamily|fontStyle|fontWeight|fontSize|lineHeight|letterSpacing|paragraphSpacing|paragraphIndent|textCase|textDecoration)$/i.test(bKey)) {
                continue;
              }
              if (Array.isArray(bVal)) {
                for (let idx = 0; idx < bVal.length; idx++) {
                  const item = bVal[idx];
                  if (item && item.type === "VARIABLE_ALIAS" && item.id) {
                    const vStatus = await checkVariableStatus(item.id, node);
                    if (vStatus.isMissing && !markReported(node.id, `var:${item.id}`)) {
                      const cat = bKey.includes("radius") ? "radius" : bKey.includes("spacing") || bKey.includes("gap") ? "gap" : bKey.includes("padding") ? "padding" : bKey.toLowerCase().includes("weight") || bKey.toLowerCase().includes("width") || bKey === "strokeWeight" ? "stroke" : "color";
                      issues.push({
                        id: `issue_${++issueCounter}`,
                        nodeId: node.id,
                        nodeName,
                        layerType: nodeType,
                        layerTypeName,
                        category: cat,
                        categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                        property: bKey,
                        propertyLabel: `${bKey} (${idx + 1})`,
                        issueType: "missing",
                        value: "Missing",
                        formattedValue: `Missing Variable (${vStatus.name})`,
                        varId: item.id,
                        varName: vStatus.name,
                        suggestion: "Reassign to a valid variable"
                      });
                    }
                  }
                }
              } else if (typeof bVal === "object" && bVal.type === "VARIABLE_ALIAS" && bVal.id) {
                const aliasId = bVal.id;
                const vStatus = await checkVariableStatus(aliasId, node);
                if (vStatus.isMissing && !markReported(node.id, `var:${aliasId}`)) {
                  const cat = bKey.includes("radius") ? "radius" : bKey.includes("spacing") || bKey.includes("gap") ? "gap" : bKey.includes("padding") ? "padding" : bKey.toLowerCase().includes("weight") || bKey.toLowerCase().includes("width") || bKey === "strokeWeight" ? "stroke" : "color";
                  issues.push({
                    id: `issue_${++issueCounter}`,
                    nodeId: node.id,
                    nodeName,
                    layerType: nodeType,
                    layerTypeName,
                    category: cat,
                    categoryLabel: cat.charAt(0).toUpperCase() + cat.slice(1),
                    property: bKey,
                    propertyLabel: bKey,
                    issueType: "missing",
                    value: "Missing",
                    formattedValue: `Missing Variable (${vStatus.name})`,
                    varId: aliasId,
                    varName: vStatus.name,
                    suggestion: "Reassign to a valid variable"
                  });
                }
              }
            }
          }
        } catch (nodeErr) {
          console.warn("Error auditing node:", node == null ? void 0 : node.name, nodeErr);
        }
      }
      for (const issue of issues) {
        const ignoredSet = nodeIgnoredMap.get(issue.nodeId);
        if (ignoredSet) {
          issue.isIgnored = ignoredSet.has(`${issue.category}:${issue.property}`) || ignoredSet.has(`${issue.category}:*`) || ignoredSet.has("*");
        } else {
          issue.isIgnored = false;
        }
      }
      const rawIssues = issues;
      const groupedMap = /* @__PURE__ */ new Map();
      for (const issue of rawIssues) {
        const groupKey = `${issue.isIgnored ? "ignored" : "active"}:${issue.issueType}:${issue.category}:${issue.property}:${issue.propertyLabel || ""}:${issue.layerType}:${(issue.nodeName || "").trim().toLowerCase()}:${issue.varId || ""}:${String(issue.value || "")}:${issue.formattedValue || ""}`;
        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey);
          if (!existing.nodeIds) {
            existing.nodeIds = [existing.nodeId];
          }
          if (!existing.nodeIds.includes(issue.nodeId)) {
            existing.nodeIds.push(issue.nodeId);
          }
          existing.count = existing.nodeIds.length;
        } else {
          groupedMap.set(groupKey, {
            ...issue,
            count: 1,
            nodeIds: [issue.nodeId]
          });
        }
      }
      const groupedIssues = Array.from(groupedMap.values());
      const activeIssues = groupedIssues.filter((i) => !i.isIgnored);
      const ignoredIssues = groupedIssues.filter((i) => !!i.isIgnored);
      const summary = {
        totalIssues: activeIssues.length,
        totalOccurrences: rawIssues.filter((i) => !i.isIgnored).length,
        unboundCount: activeIssues.filter((i) => i.issueType === "unbound").length,
        missingCount: activeIssues.filter((i) => i.issueType === "missing").length,
        gapCount: activeIssues.filter((i) => i.category === "gap").length,
        paddingCount: activeIssues.filter((i) => i.category === "padding").length,
        radiusCount: activeIssues.filter((i) => i.category === "radius").length,
        colorCount: activeIssues.filter((i) => i.category === "color").length,
        strokeCount: activeIssues.filter((i) => i.category === "stroke").length,
        scannedNodesCount: allNodes.length,
        scope,
        activeCount: activeIssues.length,
        ignoredCount: ignoredIssues.length
      };
      figma.ui.postMessage({
        type: "audit-results",
        scope,
        summary,
        issues: groupedIssues
      });
    } catch (err) {
      console.error("Audit error:", err);
      figma.ui.postMessage({
        type: "audit-results",
        scope,
        summary: {
          totalIssues: 0,
          unboundCount: 0,
          missingCount: 0,
          gapCount: 0,
          paddingCount: 0,
          radiusCount: 0,
          colorCount: 0,
          strokeCount: 0,
          scannedNodesCount: 0,
          scope
        },
        issues: [],
        error: err ? err.message : String(err)
      });
    }
  }

  // ../../../../plugins/components-setup/src/utils/fonts.ts
  async function loadFontsForTextNode(node) {
    if (node.fontName !== figma.mixed) {
      try {
        await figma.loadFontAsync(node.fontName);
      } catch (e) {
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        } catch (e2) {
        }
      }
    } else {
      try {
        if (typeof node.getStyledTextSegments === "function") {
          const segments = node.getStyledTextSegments(["fontName"]);
          for (const seg of segments) {
            if (seg.fontName) {
              try {
                await figma.loadFontAsync(seg.fontName);
              } catch (e) {
              }
            }
          }
        }
      } catch (e) {
      }
      const len = node.characters.length;
      const loaded = /* @__PURE__ */ new Set();
      for (let i = 0; i < len; i++) {
        try {
          const font = node.getRangeFontName(i, i + 1);
          if (font && font.family) {
            const key = `${font.family}::${font.style}`;
            if (!loaded.has(key)) {
              loaded.add(key);
              await figma.loadFontAsync(font);
            }
          }
        } catch (e) {
        }
      }
      if (loaded.size === 0) {
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        } catch (e) {
        }
      }
    }
  }
  async function ensureFontLoaded(family, style = "Regular") {
    const targetFamily = family && family.trim().length > 0 ? family.trim() : "Inter";
    const candidates = [
      { family: targetFamily, style },
      { family: targetFamily, style: "Bold" },
      { family: targetFamily, style: "Medium" },
      { family: targetFamily, style: "Regular" },
      { family: "Inter", style },
      { family: "Inter", style: "Bold" },
      { family: "Inter", style: "Regular" },
      { family: "Roboto", style: "Regular" },
      { family: "Arial", style: "Regular" }
    ];
    for (const font of candidates) {
      try {
        await figma.loadFontAsync(font);
        return font;
      } catch (e) {
      }
    }
    return { family: "Inter", style: "Regular" };
  }
  async function safeLoadFontAndSetCharacters(textNode, newText) {
    try {
      await loadFontsForTextNode(textNode);
      textNode.characters = newText;
      return true;
    } catch (err) {
      try {
        const fallbackFont = { family: "Inter", style: "Regular" };
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
  function syncSetCharacters(textNode, newText) {
    try {
      textNode.characters = newText;
      return true;
    } catch (err) {
      try {
        textNode.fontName = { family: "Inter", style: "Regular" };
        textNode.characters = newText;
        return true;
      } catch (fallbackErr) {
        console.warn(`[AutoProps] Could not set characters for text node ${textNode.name}:`, fallbackErr);
        return false;
      }
    }
  }
  async function loadAllFontsForTextNode(node) {
    if (node.fontName !== figma.mixed) {
      try {
        await figma.loadFontAsync(node.fontName);
      } catch (e) {
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        } catch (_) {
        }
      }
    } else {
      let fontNames = [];
      if (typeof node.getRangeAllFontNames === "function") {
        try {
          fontNames = node.getRangeAllFontNames(0, node.characters.length);
        } catch (e) {
        }
      }
      if (!fontNames || fontNames.length === 0) {
        const seen = /* @__PURE__ */ new Set();
        for (let i = 0; i < node.characters.length; i++) {
          try {
            const fn = node.getRangeFontName(i, i + 1);
            if (fn && fn.family) {
              const key = `${fn.family}::${fn.style}`;
              if (!seen.has(key)) {
                seen.add(key);
                fontNames.push(fn);
              }
            }
          } catch (_) {
          }
        }
      }
      await Promise.all(
        fontNames.map(async (fn) => {
          try {
            await figma.loadFontAsync(fn);
          } catch (e) {
            try {
              await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            } catch (_) {
            }
          }
        })
      );
    }
  }

  // ../../../../plugins/components-setup/src/generator/engine.ts
  function cleanUtilityColorToken(raw) {
    if (!raw) return "";
    return raw.trim().replace(/^var\(--(?:color-)?([^)]+)\)$/, "$1").replace(/^--(?:color-)?/, "").replace(/^(?:bg|text|border|stroke|fill)-/, "").replace(/\/\d+$/, "");
  }
  function extractNodeDescription(node) {
    try {
      if (node.parent && node.parent.type === "COMPONENT_SET" && node.parent.description) {
        const desc = String(node.parent.description).trim();
        if (desc) return desc;
      }
      if ("description" in node && node.description) {
        const desc = String(node.description).trim();
        if (desc) return desc;
      }
      if (node.type === "INSTANCE" && node.mainComponent) {
        const main = node.mainComponent;
        if (main.parent && main.parent.type === "COMPONENT_SET" && main.parent.description) {
          const desc = String(main.parent.description).trim();
          if (desc) return desc;
        }
        if (main.description) {
          const desc = String(main.description).trim();
          if (desc) return desc;
        }
      }
    } catch (e) {
      console.warn("[Export] Could not extract description:", e);
    }
    return "";
  }
  var VariableEngine = class {
    constructor() {
      this.allVars = [];
      this.allTextStyles = [];
      this.isInitialized = false;
    }
    resolveFontFamily(category = "body", hintFamily) {
      const varNames = category === "heading" ? ["fontfamily/heading", "fontfamily/header", "fontfamily/display", "fontfamily/head", "heading", "header"] : ["fontfamily/body", "fontfamily/default", "fontfamily/base", "fontfamily/sans", "body", "default"];
      for (const name of varNames) {
        const v = this.allVars.find(
          (x) => x.resolvedType === "STRING" && (x.name.toLowerCase() === name || x.name.toLowerCase().endsWith("/" + name))
        );
        if (v) {
          try {
            const keys = Object.keys(v.valuesByMode);
            if (keys.length > 0) {
              const val = v.valuesByMode[keys[0]];
              if (typeof val === "string" && val.trim().length > 0) {
                return val.trim();
              }
            }
          } catch (e) {
          }
        }
      }
      const matchingStyles = this.allTextStyles.filter((s) => {
        const sName = s.name.toLowerCase();
        if (category === "heading") {
          return sName.includes("heading") || sName.includes("display") || sName.includes("h1") || sName.includes("h2");
        }
        return sName.includes("body") || sName.includes("label") || sName.includes("default") || sName.includes("base");
      });
      for (const s of matchingStyles) {
        if (s.fontName && s.fontName.family && s.fontName.family.trim().length > 0) {
          return s.fontName.family.trim();
        }
      }
      for (const s of this.allTextStyles) {
        if (s.fontName && s.fontName.family && s.fontName.family.trim().length > 0) {
          return s.fontName.family.trim();
        }
      }
      if (hintFamily && hintFamily.trim().length > 0 && hintFamily !== "Inter") {
        return hintFamily.trim();
      }
      return hintFamily && hintFamily.trim().length > 0 ? hintFamily.trim() : "Inter";
    }
    async init() {
      if (this.isInitialized) return;
      try {
        const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
        const allowedColIds = /* @__PURE__ */ new Set();
        for (const col of localCollections) {
          if (!col.name.trim().startsWith("_")) {
            allowedColIds.add(col.id);
          }
        }
        const localVars = await figma.variables.getLocalVariablesAsync();
        for (const v of localVars) {
          if (allowedColIds.has(v.variableCollectionId) && !v.name.trim().startsWith("_")) {
            this.allVars.push(v);
          }
        }
      } catch (e) {
        console.warn("Error fetching local variables:", e);
      }
      try {
        const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        for (const libCollection of libraryCollections) {
          if (libCollection.name.trim().startsWith("_")) {
            continue;
          }
          try {
            const descriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCollection.key);
            const allowedDescriptors = descriptors.filter(
              (d) => !d.name.trim().startsWith("_") && (!/\/\d+$/.test(d.name.trim()) || d.name.toLowerCase().includes("constant"))
            );
            const imported = await Promise.all(
              allowedDescriptors.map((d) => figma.variables.importVariableByKeyAsync(d.key).catch(() => null))
            );
            for (const v of imported) {
              if (v && !this.allVars.some((x) => x.id === v.id) && !v.name.trim().startsWith("_")) {
                this.allVars.push(v);
              }
            }
          } catch (e) {
          }
        }
      } catch (e) {
        console.warn("Team library collections error:", e);
      }
      try {
        const localStyles = await figma.getLocalTextStylesAsync();
        for (const s of localStyles) {
          if (!this.allTextStyles.some((x) => x.id === s.id)) {
            this.allTextStyles.push(s);
          }
        }
      } catch (e) {
        console.warn("Error fetching local text styles:", e);
      }
      try {
        if (typeof figma.loadAllPagesAsync === "function") {
          await figma.loadAllPagesAsync();
        }
        for (const page of figma.root.children) {
          try {
            const textNodes = page.findAllWithCriteria({ types: ["TEXT"] });
            for (const tn of textNodes) {
              if (typeof tn.textStyleId === "string" && tn.textStyleId.length > 0) {
                try {
                  const style = await figma.getStyleByIdAsync(tn.textStyleId);
                  if (style && !this.allTextStyles.some((x) => x.id === style.id)) {
                    this.allTextStyles.push(style);
                  }
                } catch (e) {
                }
              }
            }
          } catch (e) {
          }
        }
      } catch (e) {
        console.warn("Error discovering document text styles across pages:", e);
      }
      await this.ensureCoreColorVariables();
      this.isInitialized = true;
    }
    async ensureCoreColorVariables() {
    }
    resolveColorVariableValue(v, visited = /* @__PURE__ */ new Set()) {
      if (visited.has(v.id)) return null;
      visited.add(v.id);
      try {
        const keys = Object.keys(v.valuesByMode);
        if (keys.length === 0) return null;
        const rawVal = v.valuesByMode[keys[0]];
        if (!rawVal) return null;
        if (typeof rawVal === "object") {
          if ("r" in rawVal && "g" in rawVal && "b" in rawVal) {
            return { r: rawVal.r, g: rawVal.g, b: rawVal.b };
          }
          if (rawVal.type === "VARIABLE_ALIAS" && rawVal.id) {
            const aliasVar = this.allVars.find((x) => x.id === rawVal.id);
            if (aliasVar) {
              return this.resolveColorVariableValue(aliasVar, visited);
            }
          }
        }
      } catch (e) {
      }
      return null;
    }
    findColorVariable(nameOrKeywords, hexOrRgb, scope) {
      const colorVars = this.allVars.filter(
        (v) => v.resolvedType === "COLOR" && !v.name.trim().startsWith("_") && !/\/\d+$/.test(v.name.trim())
      );
      if (colorVars.length === 0) return null;
      const normalize = (s) => {
        const clean = cleanUtilityColorToken(s);
        const leaf = clean.split("/").pop() || clean;
        return leaf.toLowerCase().replace(/[^a-z0-9]/g, "");
      };
      const kebabToCamel = (s) => {
        const clean = cleanUtilityColorToken(s);
        const leaf = clean.split("/").pop() || clean;
        return leaf.replace(/[-_]([a-z0-9])/g, (_, g) => g.toUpperCase());
      };
      const camelToKebab = (s) => {
        const clean = cleanUtilityColorToken(s);
        const leaf = clean.split("/").pop() || clean;
        return leaf.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      };
      if (nameOrKeywords) {
        const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
        const keywords = rawKeywords.filter(Boolean);
        for (const rawKw of keywords) {
          if (!rawKw || rawKw.trim().startsWith("_")) continue;
          const cleanKw = cleanUtilityColorToken(rawKw);
          const normKw = normalize(cleanKw);
          const simpleKw = cleanKw.split("/").pop() || cleanKw;
          const camelKw = kebabToCamel(simpleKw);
          const kebabKw = camelToKebab(simpleKw);
          const searchTerms = /* @__PURE__ */ new Set([
            rawKw.toLowerCase(),
            cleanKw.toLowerCase(),
            normKw,
            simpleKw.toLowerCase(),
            camelKw.toLowerCase(),
            kebabKw.toLowerCase()
          ]);
          const exact = colorVars.find((v) => {
            const vClean = cleanUtilityColorToken(v.name);
            const vSimple = vClean.split("/").pop() || vClean;
            const vNorm = normalize(v.name);
            const vCamel = kebabToCamel(vSimple);
            const vKebab = camelToKebab(vSimple);
            return searchTerms.has(vNorm) || searchTerms.has(vSimple.toLowerCase()) || searchTerms.has(vCamel.toLowerCase()) || searchTerms.has(vKebab.toLowerCase()) || vSimple === camelKw || vSimple === kebabKw;
          });
          if (exact) return exact;
        }
      }
      let targetRgb = null;
      if (typeof hexOrRgb === "string") {
        targetRgb = parseHexOrRgb(hexOrRgb);
      } else if (hexOrRgb && typeof hexOrRgb.r === "number") {
        targetRgb = hexOrRgb;
      }
      if (targetRgb) {
        for (const v of colorVars) {
          const val = this.resolveColorVariableValue(v);
          if (val) {
            const dr = Math.abs(val.r - targetRgb.r);
            const dg = Math.abs(val.g - targetRgb.g);
            const db = Math.abs(val.b - targetRgb.b);
            if (dr < 0.02 && dg < 0.02 && db < 0.02) {
              return v;
            }
          }
        }
      }
      return null;
    }
    findVariable(type, scope, nameOrKeywords, numericValue) {
      const candidates = this.allVars.filter((v) => v.resolvedType === type && !v.name.trim().startsWith("_"));
      const matchesScope = (v) => {
        if (!scope) return true;
        if (!v.scopes || v.scopes.length === 0 || v.scopes.includes("ALL_SCOPES")) return true;
        return v.scopes.includes(scope);
      };
      if (nameOrKeywords) {
        const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
        const keywords = rawKeywords.filter(Boolean).map((k) => k.toLowerCase().replace(/^[var(--]+/, "").replace(/[)]+$/, ""));
        for (const kw of keywords) {
          const exact = candidates.find((v) => matchesScope(v) && v.name.toLowerCase() === kw);
          if (exact) return exact;
          const partial = candidates.find(
            (v) => matchesScope(v) && (v.name.toLowerCase().endsWith("/" + kw) || v.name.toLowerCase().replace(/\//g, "-").endsWith(kw) || kw.endsWith(v.name.toLowerCase()))
          );
          if (partial) return partial;
        }
        for (const kw of keywords) {
          const exactAny = candidates.find((v) => v.name.toLowerCase() === kw);
          if (exactAny) {
            if (scope && exactAny.scopes && !exactAny.scopes.includes("ALL_SCOPES") && !exactAny.scopes.includes(scope)) {
              try {
                exactAny.scopes = [...exactAny.scopes, scope];
              } catch (e) {
              }
            }
            return exactAny;
          }
          const partialAny = candidates.find(
            (v) => v.name.toLowerCase().endsWith("/" + kw) || v.name.toLowerCase().replace(/\//g, "-").endsWith(kw) || kw.endsWith(v.name.toLowerCase())
          );
          if (partialAny) {
            if (scope && partialAny.scopes && !partialAny.scopes.includes("ALL_SCOPES") && !partialAny.scopes.includes(scope)) {
              try {
                partialAny.scopes = [...partialAny.scopes, scope];
              } catch (e) {
              }
            }
            return partialAny;
          }
        }
      }
      if (numericValue !== void 0 && type === "FLOAT") {
        const zeroNamed = candidates.find(
          (v) => (v.name.toLowerCase().includes("none") || v.name.toLowerCase().includes("zero")) && Math.abs(this.getVariableDefaultValue(v) - numericValue) < 1e-3
        );
        if (zeroNamed) {
          if (scope && zeroNamed.scopes && !zeroNamed.scopes.includes("ALL_SCOPES") && !zeroNamed.scopes.includes(scope)) {
            try {
              zeroNamed.scopes = [...zeroNamed.scopes, scope];
            } catch (e) {
            }
          }
          return zeroNamed;
        }
        for (const v of candidates) {
          if (!matchesScope(v)) continue;
          const val = this.getVariableDefaultValue(v);
          if (typeof val === "number" && Math.abs(val - numericValue) < 1e-3) {
            return v;
          }
        }
      }
      return null;
    }
    getVariableDefaultValue(variable) {
      try {
        const keys = Object.keys(variable.valuesByMode);
        if (keys.length > 0) return variable.valuesByMode[keys[0]];
      } catch (e) {
      }
      return void 0;
    }
    findTextStyle(nameOrKeywords, fontSize, fontStyle) {
      if (this.allTextStyles.length === 0) return null;
      if (nameOrKeywords) {
        const rawKeywords = Array.isArray(nameOrKeywords) ? nameOrKeywords : [nameOrKeywords];
        const queries = rawKeywords.filter(Boolean).map((k) => k.trim());
        for (const query of queries) {
          const qLower = query.toLowerCase();
          const qNormalized = qLower.replace(/^[./\-_]+|[./\-_]+$/g, "");
          const qNoPrefix = qNormalized.replace(/^default\//, "");
          const qWithPrefix = qNormalized.startsWith("default/") ? qNormalized : `default/${qNormalized}`;
          const qParts = qNormalized.split(/[/ _-]+/).filter(Boolean);
          const exact = this.allTextStyles.find((s) => {
            const sLower = s.name.toLowerCase();
            return sLower === qLower || sLower === qNormalized || sLower === qNoPrefix || sLower === qWithPrefix;
          });
          if (exact) return exact;
          const suffixMatch = this.allTextStyles.find((s) => {
            const sLower = s.name.toLowerCase();
            return sLower.endsWith("/" + qNoPrefix) || sLower.endsWith(qNoPrefix);
          });
          if (suffixMatch) return suffixMatch;
          if (qParts.length >= 2) {
            const allMatch = this.allTextStyles.find((s) => {
              const sLower = s.name.toLowerCase();
              return qParts.every((part) => sLower.includes(part));
            });
            if (allMatch) return allMatch;
          }
        }
        return null;
      }
      if (fontSize !== void 0) {
        const sizeCandidates = this.allTextStyles.filter(
          (s) => Math.abs(s.fontSize - fontSize) < 0.5
        );
        if (sizeCandidates.length > 0) {
          if (fontStyle) {
            const styleLower = fontStyle.toLowerCase();
            const match = sizeCandidates.find(
              (s) => s.name.toLowerCase().includes(styleLower) || s.fontName && s.fontName.style.toLowerCase().includes(styleLower)
            );
            if (match) return match;
          }
          return sizeCandidates[0];
        }
      }
      return null;
    }
    async bindNodeVariables(node, def) {
      var _a;
      if ("cornerRadius" in node && typeof node.setBoundVariable === "function") {
        const frameNode = node;
        if (def.cornerRadius !== void 0 || def.cornerRadiusVar) {
          const isNone = def.cornerRadius === 0 || def.cornerRadiusVar === "constant/none" || def.cornerRadiusVar === "none" || def.cornerRadiusVar === "radius/none" || def.cornerRadiusVar === "radius/container/none" || def.cornerRadiusVar === "constant-none";
          const targetVar = this.findVariable(
            "FLOAT",
            "CORNER_RADIUS",
            isNone ? ["constant/none", "none", "radius/none", "radius/container/none", "constant-none", "constants/none"] : def.cornerRadiusVar || [
              def.cornerRadius === 0 ? "constant/none" : "",
              def.cornerRadius === 0 ? "none" : "",
              def.cornerRadius === 4 ? "radius/container/pico" : "",
              def.cornerRadius === 8 ? "radius/container/small" : "",
              def.cornerRadius === 12 ? "radius/container/medium" : "",
              def.cornerRadius === 16 ? "radius/container/base" : "",
              def.cornerRadius === 24 ? "radius/container/large" : "",
              def.cornerRadius === 9999 ? "constant/full" : ""
            ],
            def.cornerRadius
          );
          if (targetVar) {
            try {
              frameNode.setBoundVariable("cornerRadius", targetVar);
            } catch (e) {
            }
            if ("topLeftRadius" in frameNode) {
              try {
                frameNode.setBoundVariable("topLeftRadius", targetVar);
                frameNode.setBoundVariable("topRightRadius", targetVar);
                frameNode.setBoundVariable("bottomLeftRadius", targetVar);
                frameNode.setBoundVariable("bottomRightRadius", targetVar);
              } catch (e) {
              }
            }
          }
        }
      }
      if ("layoutMode" in node && node.layoutMode !== "NONE" && typeof node.setBoundVariable === "function") {
        const alNode = node;
        if (def.itemSpacing !== void 0 || def.itemSpacingVar) {
          const isNone = def.itemSpacing === 0 || def.itemSpacingVar === "constant/none" || def.itemSpacingVar === "none" || def.itemSpacingVar === "spacing/none" || def.itemSpacingVar === "constant-none";
          const gapVar = this.findVariable(
            "FLOAT",
            "GAP",
            isNone ? ["constant/none", "none", "spacing/none", "constant-none", "constants/none"] : def.itemSpacingVar || [
              def.itemSpacing === 0 ? "constant/none" : "",
              def.itemSpacing === 0 ? "none" : "",
              def.itemSpacing === 4 ? "spacing/pico" : "",
              def.itemSpacing === 8 ? "spacing/extra-small" : "",
              def.itemSpacing === 12 ? "spacing/small" : "",
              def.itemSpacing === 16 ? "spacing/base" : "",
              def.itemSpacing === 20 ? "spacing/medium" : "",
              def.itemSpacing === 24 ? "spacing/semi-large" : "",
              def.itemSpacing === 32 ? "spacing/large" : "",
              def.itemSpacing === 48 ? "spacing/huge" : ""
            ],
            def.itemSpacing
          );
          if (gapVar) {
            try {
              alNode.setBoundVariable("itemSpacing", gapVar);
            } catch (e) {
            }
          }
        }
        const paddings = [
          { field: "paddingTop", val: def.paddingTop, varName: def.paddingTopVar },
          { field: "paddingBottom", val: def.paddingBottom, varName: def.paddingBottomVar },
          { field: "paddingLeft", val: def.paddingLeft, varName: def.paddingLeftVar },
          { field: "paddingRight", val: def.paddingRight, varName: def.paddingRightVar }
        ];
        for (const p of paddings) {
          if (p.val !== void 0 || p.varName) {
            const isNone = p.val === 0 || p.varName === "constant/none" || p.varName === "none" || p.varName === "spacing/none" || p.varName === "constant-none";
            const padVar = this.findVariable(
              "FLOAT",
              "GAP",
              isNone ? ["constant/none", "none", "spacing/none", "constant-none", "constants/none"] : p.varName || [
                p.val === 0 ? "constant/none" : "",
                p.val === 0 ? "none" : "",
                p.val === 4 ? "spacing/pico" : "",
                p.val === 8 ? "spacing/extra-small" : "",
                p.val === 10 ? "spacing/10" : "",
                p.val === 12 ? "spacing/small" : "",
                p.val === 16 ? "spacing/base" : "",
                p.val === 20 ? "spacing/medium" : "",
                p.val === 24 ? "spacing/semi-large" : "",
                p.val === 32 ? "spacing/large" : ""
              ],
              p.val
            );
            if (padVar) {
              try {
                alNode.setBoundVariable(p.field, padVar);
              } catch (e) {
              }
            }
          }
        }
      }
      if (typeof node.setBoundVariable === "function") {
        const dimNode = node;
        if (def.maxWidth !== void 0 || def.maxWidthVar) {
          const mwVar = this.findVariable("FLOAT", "WIDTH_HEIGHT", def.maxWidthVar, def.maxWidth);
          if (mwVar) {
            try {
              dimNode.setBoundVariable("maxWidth", mwVar);
            } catch (e) {
            }
          }
        }
        if (def.minWidth !== void 0 || def.minWidthVar) {
          const minWVar = this.findVariable("FLOAT", "WIDTH_HEIGHT", def.minWidthVar, def.minWidth);
          if (minWVar) {
            try {
              dimNode.setBoundVariable("minWidth", minWVar);
            } catch (e) {
            }
          }
        }
      }
      if ("fills" in node && Array.isArray(node.fills)) {
        const currentFills = node.fills.slice();
        let hasChange = false;
        const updatedFills = currentFills.map((paint, idx) => {
          var _a2, _b, _c, _d;
          if (paint.type !== "SOLID") return paint;
          const boundColorId = (_b = (_a2 = paint.boundVariables) == null ? void 0 : _a2.color) == null ? void 0 : _b.id;
          const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
          if (((_c = paint.boundVariables) == null ? void 0 : _c.color) && isBoundValid) return paint;
          const fillDef = def.fills && def.fills[idx] ? def.fills[idx] : void 0;
          const matchedToken = (fillDef == null ? void 0 : fillDef.hex) ? dsRegistry.matchColor(fillDef.hex, node.type === "TEXT", false) : "";
          const colorVar = this.findColorVariable(
            (fillDef == null ? void 0 : fillDef.variableName) || matchedToken,
            (fillDef == null ? void 0 : fillDef.hex) || (fillDef == null ? void 0 : fillDef.color) || paint.color,
            node.type === "TEXT" ? "TEXT_FILL" : "FRAME_FILL"
          );
          if (colorVar) {
            try {
              hasChange = true;
              return figma.variables.setBoundVariableForPaint(paint, "color", colorVar);
            } catch (e) {
              return paint;
            }
          } else if (((_d = paint.boundVariables) == null ? void 0 : _d.color) && !isBoundValid) {
            hasChange = true;
            const p = { ...paint };
            delete p.boundVariables;
            return p;
          }
          return paint;
        });
        if (hasChange) {
          node.fills = updatedFills;
        }
      }
      if ("strokes" in node && Array.isArray(node.strokes)) {
        const currentStrokes = node.strokes.slice();
        let hasChange = false;
        const updatedStrokes = currentStrokes.map((paint, idx) => {
          var _a2, _b, _c, _d;
          if (paint.type !== "SOLID") return paint;
          const boundColorId = (_b = (_a2 = paint.boundVariables) == null ? void 0 : _a2.color) == null ? void 0 : _b.id;
          const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
          if (((_c = paint.boundVariables) == null ? void 0 : _c.color) && isBoundValid) return paint;
          const strokeDef = def.strokes && def.strokes[idx] ? def.strokes[idx] : void 0;
          const strokeVar = this.findColorVariable(
            (strokeDef == null ? void 0 : strokeDef.variableName) || ["outline", "outlineBase", "outline-base", "border-white", "white"],
            (strokeDef == null ? void 0 : strokeDef.hex) || (strokeDef == null ? void 0 : strokeDef.color) || paint.color,
            "STROKE_COLOR"
          );
          if (strokeVar) {
            try {
              hasChange = true;
              return figma.variables.setBoundVariableForPaint(paint, "color", strokeVar);
            } catch (e) {
              return paint;
            }
          } else if (((_d = paint.boundVariables) == null ? void 0 : _d.color) && !isBoundValid) {
            hasChange = true;
            const p = { ...paint };
            delete p.boundVariables;
            return p;
          }
          return paint;
        });
        if (hasChange) {
          node.strokes = updatedStrokes;
        }
        if (def.strokeWeight === 1 && typeof node.setBoundVariable === "function") {
          const stVar = this.findVariable("FLOAT", "STROKE_FLOAT", ["constant/1", "1"], 1);
          if (stVar) {
            try {
              node.setBoundVariable("strokeWeight", stVar);
            } catch (e) {
            }
          }
        }
      }
      if (node.type === "TEXT") {
        const textNode = node;
        if (!textNode.textStyleId && typeof textNode.setBoundVariable === "function") {
          const stylePrefix = ((_a = def.textStyleName) == null ? void 0 : _a.replace(/^default\//, "")) || "";
          const category = stylePrefix.startsWith("heading") || stylePrefix.startsWith("display") ? "heading" : "body";
          const level = def.fontSize === 16 ? "large" : def.fontSize === 14 ? "medium" : def.fontSize === 12 ? "large" : "medium";
          const fsVar = this.findVariable("FLOAT", "FONT_SIZE", [
            `fontSize/${category}/${level}`,
            `fontSize/${stylePrefix.replace(/\/[^/]+$/, "")}`,
            def.fontSize === 16 ? "fontSize/body/large" : "",
            def.fontSize === 14 ? "fontSize/body/medium" : "",
            def.fontSize === 12 ? "fontSize/label/large" : ""
          ].filter(Boolean), def.fontSize);
          if (fsVar) {
            try {
              textNode.setBoundVariable("fontSize", fsVar);
            } catch (e) {
            }
          }
          const lhVar = this.findVariable("FLOAT", "LINE_HEIGHT", [
            `lineHeight/${category}/${level}`,
            `lineHeight/${stylePrefix.replace(/\/[^/]+$/, "")}`,
            def.fontSize === 16 ? "lineHeight/body/large" : "",
            def.fontSize === 14 ? "lineHeight/body/medium" : "",
            def.fontSize === 12 ? "lineHeight/label/large" : ""
          ].filter(Boolean));
          if (lhVar) {
            try {
              textNode.setBoundVariable("lineHeight", lhVar);
            } catch (e) {
            }
          }
          const ffVar = this.findVariable("STRING", "FONT_FAMILY", [
            category === "heading" ? "fontFamily/heading" : "fontFamily/body",
            category === "heading" ? "fontFamily/header" : "fontFamily/default"
          ].filter(Boolean));
          if (ffVar) {
            try {
              textNode.setBoundVariable("fontFamily", ffVar);
            } catch (e) {
            }
          }
        }
      }
    }
    async bindVariablesRecursively(node) {
      let boundCount = 0;
      const processNode = async (curr) => {
        if ("layoutMode" in curr && curr.layoutMode !== "NONE") {
          const alNode = curr;
          const boundVars = alNode.boundVariables || {};
          if (!boundVars.itemSpacing && alNode.itemSpacing > 0) {
            const gapVar = this.findVariable("FLOAT", "GAP", void 0, alNode.itemSpacing);
            if (gapVar) {
              try {
                alNode.setBoundVariable("itemSpacing", gapVar);
                boundCount++;
              } catch (e) {
              }
            }
          }
          const paddings = [
            { field: "paddingTop", val: alNode.paddingTop },
            { field: "paddingBottom", val: alNode.paddingBottom },
            { field: "paddingLeft", val: alNode.paddingLeft },
            { field: "paddingRight", val: alNode.paddingRight }
          ];
          for (const p of paddings) {
            if (!boundVars[p.field] && p.val > 0) {
              const pVar = this.findVariable("FLOAT", "GAP", void 0, p.val);
              if (pVar) {
                try {
                  curr.setBoundVariable(p.field, pVar);
                  boundCount++;
                } catch (e) {
                }
              }
            }
          }
        }
        if ("cornerRadius" in curr && typeof curr.cornerRadius === "number" && curr.cornerRadius > 0 && typeof curr.setBoundVariable === "function") {
          const boundVars = curr.boundVariables || {};
          if (!boundVars.cornerRadius) {
            const rVar = this.findVariable("FLOAT", "CORNER_RADIUS", void 0, curr.cornerRadius);
            if (rVar) {
              try {
                curr.setBoundVariable("cornerRadius", rVar);
                boundCount++;
              } catch (e) {
              }
            }
          }
        }
        if ("fills" in curr && Array.isArray(curr.fills) && curr.fills.length > 0) {
          const lowerName = curr.name.toLowerCase();
          if ((lowerName.includes("item") || lowerName.includes("track")) && curr.type === "FRAME") {
            curr.fills = [];
          } else {
            let hasFillChange = false;
            const newFills = curr.fills.map((paint) => {
              var _a, _b, _c;
              if (paint.type !== "SOLID") return paint;
              const boundColorId = (_b = (_a = paint.boundVariables) == null ? void 0 : _a.color) == null ? void 0 : _b.id;
              const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
              if (((_c = paint.boundVariables) == null ? void 0 : _c.color) && isBoundValid) return paint;
              const layerToken = cleanUtilityColorToken(curr.name);
              const candidates = layerToken && layerToken !== curr.name.toLowerCase() ? [layerToken] : [];
              if (curr.type === "TEXT") {
                candidates.push("on-primary-unstable", "onPrimaryUnstable");
              }
              const matchedVar = this.findColorVariable(
                candidates,
                paint.color,
                curr.type === "TEXT" ? "TEXT_FILL" : "FRAME_FILL"
              );
              if (matchedVar) {
                try {
                  hasFillChange = true;
                  boundCount++;
                  return figma.variables.setBoundVariableForPaint(paint, "color", matchedVar);
                } catch (e) {
                  return paint;
                }
              }
              return paint;
            });
            if (hasFillChange) {
              curr.fills = newFills;
            }
          }
        }
        if ("strokes" in curr && Array.isArray(curr.strokes) && curr.strokes.length > 0) {
          let hasStrokeChange = false;
          const newStrokes = curr.strokes.map((paint) => {
            var _a, _b, _c;
            if (paint.type !== "SOLID") return paint;
            const boundColorId = (_b = (_a = paint.boundVariables) == null ? void 0 : _a.color) == null ? void 0 : _b.id;
            const isBoundValid = boundColorId ? this.allVars.some((v) => v.id === boundColorId) : false;
            if (((_c = paint.boundVariables) == null ? void 0 : _c.color) && isBoundValid) return paint;
            const matchedVar = this.findColorVariable(["outline", "outlineBase", "outline-base", curr.name], paint.color, "STROKE_COLOR");
            if (matchedVar) {
              try {
                hasStrokeChange = true;
                boundCount++;
                return figma.variables.setBoundVariableForPaint(paint, "color", matchedVar);
              } catch (e) {
                return paint;
              }
            }
            return paint;
          });
          if (hasStrokeChange) {
            curr.strokes = newStrokes;
          }
        }
        if ("children" in curr && Array.isArray(curr.children)) {
          for (const ch of curr.children) {
            await processNode(ch);
          }
        }
      };
      await processNode(node);
      return boundCount;
    }
    async exportNodeToCode(node) {
      var _a, _b, _c, _d;
      const resolveVarName = async (varId) => {
        if (!varId) return null;
        try {
          const v = await figma.variables.getVariableByIdAsync(varId);
          if (!v) return null;
          let colName = "";
          if (v.variableCollectionId) {
            try {
              const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
              if (col) colName = col.name;
            } catch (e) {
            }
          }
          if (colName && !v.name.toLowerCase().startsWith(colName.toLowerCase())) {
            return `${colName}/${v.name}`;
          }
          return v.name;
        } catch (e) {
          return null;
        }
      };
      const sanitizeColorToken = (name) => {
        const base = name.split("/").pop() || name;
        return base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      };
      const sanitizeSpacingToken = (name) => {
        const clean = name.trim();
        if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
          const last = clean.split("/").pop() || clean;
          return `constant-${last.toLowerCase()}`;
        }
        const base = clean.split("/").pop() || clean;
        return base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      };
      const sanitizeRadiusToken = (name) => {
        const clean = name.trim();
        if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
          const last = clean.split("/").pop() || clean;
          return `constant-${last.toLowerCase()}`;
        }
        const parts = clean.split("/").filter(Boolean);
        while (parts.length > 1 && /^(radius|corner-?radius|tokens?|primitives?|metrics|_metrics)$/i.test(parts[0])) {
          parts.shift();
        }
        return parts.map((p) => p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()).join("-");
      };
      const tokenViolations = [];
      const matchSpacingToToken = (val, layerName = "", prop = "spacing") => {
        const s = dsRegistry.matchSpacing(val);
        if (s.startsWith("[")) {
          tokenViolations.push({
            layer: layerName || "Unknown Layer",
            property: prop,
            rawValue: `${val}px`,
            arbitraryClass: `${prop === "gap" ? "gap" : prop}-${s}`,
            suggestion: "Use design-system spacing token (pico, nano, micro, small, base, large, etc.)"
          });
        }
        return s;
      };
      const matchRadiusToToken = (val, layerName = "") => {
        const s = dsRegistry.matchRadius(val);
        if (s.startsWith("[")) {
          tokenViolations.push({
            layer: layerName || "Unknown Layer",
            property: "borderRadius",
            rawValue: `${val}px`,
            arbitraryClass: `rounded-${s}`,
            suggestion: "Use design-system radius token (none, small, medium, large, full)"
          });
        }
        return s;
      };
      const matchColorToToken = (color, layerName = "", isText = false, isStroke = false) => {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        const s = dsRegistry.matchColor(hex, isText, isStroke);
        if (s.startsWith("[")) {
          const prefix = isText ? "text" : isStroke ? "border" : "bg";
          tokenViolations.push({
            layer: layerName || "Unknown Layer",
            property: isText ? "textColor" : isStroke ? "borderColor" : "backgroundColor",
            rawValue: hex,
            arbitraryClass: `${prefix}-${s}`,
            suggestion: "Bind layer to a Figma Color Variable from Design System"
          });
        }
        return s;
      };
      const getCleanComponentName = (n) => {
        if (n.type === "COMPONENT" && n.parent && n.parent.type === "COMPONENT_SET" && n.name.includes("=")) {
          return getCleanComponentName(n.parent);
        }
        let nameStr = n.name.trim();
        if (nameStr.includes("=")) {
          nameStr = nameStr.split(",")[0].split("=")[0].trim();
        }
        if (nameStr.includes("/")) {
          const segments = nameStr.split("/").map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean);
          if (segments.length > 0) {
            return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
          }
        }
        const clean = nameStr.replace(/[^a-zA-Z0-9]/g, "");
        if (!clean) return "Component";
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      };
      let rootName = getCleanComponentName(node);
      const rawNodeName = node.name.trim();
      const parentNodeName = node.parent && node.parent.type === "COMPONENT_SET" ? node.parent.name.trim() : "";
      const isPrivate = rawNodeName.startsWith("_") || rawNodeName.startsWith(".") || parentNodeName.startsWith("_") || parentNodeName.startsWith(".");
      const internalJsDoc = isPrivate ? `/**
 * @internal
 * Private component (${rawNodeName}) - excluded from public Design System presentation.
 * Documented for internal codebase use only.
 */
` : "";
      const detectedSubcomponents = /* @__PURE__ */ new Map();
      const detectedLucideIcons = /* @__PURE__ */ new Set();
      const detectedExternalComponents = /* @__PURE__ */ new Set();
      let rootClassNames = [];
      const resolveTag = (curr, isRoot) => {
        const defaultHtmlTag = curr.name.toLowerCase().includes("button") ? "button" : "div";
        if (isRoot) {
          return { tag: rootName, isSub: false, defaultHtmlTag };
        }
        let raw = curr.name.trim();
        let extraProps = "";
        let isExternalComponent = false;
        let externalComponentName = "";
        if (curr.type === "INSTANCE") {
          const inst = curr;
          let masterName = "";
          if (inst.mainComponent) {
            const comp = inst.mainComponent;
            const parentCompSet = comp.parent && comp.parent.type === "COMPONENT_SET" ? comp.parent : null;
            masterName = parentCompSet ? parentCompSet.name : comp.name;
          } else {
            masterName = inst.name;
          }
          const isIconInstance = masterName.toLowerCase().includes("lucide") || raw.toLowerCase().includes("lucide") || masterName.toLowerCase().startsWith("icon") || raw.toLowerCase().startsWith("icon") || masterName.toLowerCase().includes("/icon") || inst.width <= 48 && inst.height <= 48 && Math.abs(inst.width - inst.height) <= 4 && !masterName.toLowerCase().includes("logo");
          let pascalMaster = "";
          if (isIconInstance) {
            const iconRaw = masterName.replace(/^(lucide|icons?)\//i, "").split(/[=,\s/]/)[0];
            const iconPascal = iconRaw.split(/[-_/\s]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
            if (iconPascal) {
              pascalMaster = iconPascal;
              detectedLucideIcons.add(iconPascal);
            }
          } else if (masterName.includes("/")) {
            const segments = masterName.split("/").map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean);
            pascalMaster = segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
          } else {
            const cleanMaster = masterName.split(/[=,\s]/)[0].replace(/[^a-zA-Z0-9]/g, "");
            pascalMaster = cleanMaster.charAt(0).toUpperCase() + cleanMaster.slice(1);
          }
          if (inst.variantProperties) {
            const propEntries = Object.entries(inst.variantProperties);
            if (propEntries.length > 0) {
              extraProps = propEntries.map(([k, v]) => `${k}="${v}"`).join(" ");
            }
          }
          const isPrivateInstance = masterName.startsWith("_") || masterName.startsWith(".") || raw.startsWith("_") || raw.startsWith(".");
          if (isIconInstance) {
          } else if (isPrivateInstance) {
            return {
              tag: pascalMaster,
              isSub: true,
              isExternal: false,
              subName: pascalMaster,
              defaultHtmlTag,
              extraProps
            };
          } else if (pascalMaster.toLowerCase().includes("logotype") || raw.toLowerCase().includes("logotype")) {
            isExternalComponent = true;
            externalComponentName = "Logotype";
            if (!extraProps) {
              extraProps = 'Size="Large" Schemes="OnSurfaceDarkWhite"';
            }
          } else if (masterName.toLowerCase().startsWith(rootName.toLowerCase()) || raw.toLowerCase().startsWith(rootName.toLowerCase())) {
            raw = masterName;
          } else if (pascalMaster && pascalMaster !== rootName) {
            isExternalComponent = true;
            externalComponentName = pascalMaster;
          }
        }
        if (isExternalComponent && externalComponentName) {
          detectedExternalComponents.add(externalComponentName);
          return {
            tag: externalComponentName,
            isSub: false,
            isExternal: true,
            defaultHtmlTag,
            extraProps
          };
        }
        if (raw === "MarqueeLogo" || raw.endsWith("/Logo") || raw.endsWith(".Logo") || raw.toLowerCase() === "logo" || raw.toLowerCase().includes("logo")) {
          return {
            tag: "Logotype",
            isSub: false,
            isExternal: true,
            defaultHtmlTag,
            extraProps: 'Size="SemiLarge" Schemes="OnSurfaceDarkWhite"'
          };
        }
        if (raw.startsWith(rootName) && raw.length > rootName.length) {
          const sub = raw.slice(rootName.length).replace(/^[._/ -]+/, "").replace(/[^a-zA-Z0-9]/g, "");
          if (sub) {
            const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
            return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
          }
        }
        if (raw.includes("/")) {
          const parts = raw.split("/");
          let sub = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, "");
          if (sub.toLowerCase().startsWith(rootName.toLowerCase())) {
            sub = sub.slice(rootName.length);
          }
          sub = sub.replace(/^[._/ -]+/, "").replace(/[^a-zA-Z0-9]/g, "");
          if (sub) {
            const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
            return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
          }
        }
        if (raw.includes(".")) {
          const parts = raw.split(".");
          let sub = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, "");
          if (sub.toLowerCase().startsWith(rootName.toLowerCase())) {
            sub = sub.slice(rootName.length);
          }
          sub = sub.replace(/^[._/ -]+/, "").replace(/[^a-zA-Z0-9]/g, "");
          if (sub) {
            const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
            return { tag: `${rootName}${cleanSub}`, isSub: true, subName: cleanSub, defaultHtmlTag };
          }
        }
        const clean = raw.toLowerCase().replace(/[-_ ]\d+$/, "").replace(/[^a-z]/g, "");
        const known = {
          track: "Track",
          item: "Item",
          content: "Content",
          trigger: "Trigger",
          header: "Header",
          footer: "Footer",
          separator: "Separator",
          dot: "Separator",
          body: "Body",
          card: "Card",
          badge: "Badge",
          text: "Text",
          label: "Text",
          logo: "Logo",
          icon: "Icon"
        };
        if (known[clean]) {
          const sub = known[clean];
          return { tag: `${rootName}${sub}`, isSub: true, subName: sub, defaultHtmlTag };
        }
        if (/^[A-Z][a-zA-Z0-9]*$/.test(raw) && raw !== rootName) {
          return { tag: `${rootName}${raw}`, isSub: true, subName: raw, defaultHtmlTag };
        }
        return { tag: defaultHtmlTag, isSub: false, defaultHtmlTag };
      };
      const formatDimClass = (val, axis) => {
        if (!val || val <= 0) return `${axis}-0`;
        const rounded = Math.round(val * 10) / 10;
        if (axis === "min-h" || axis === "max-h" || axis === "min-w" || axis === "max-w") {
          if (Math.round(rounded) === 44) return `${axis}-min-max-large`;
          if (Math.round(rounded) === 48) return `${axis}-min-max-extra-large`;
          if (Math.round(rounded) === 56) return `${axis}-min-max-huge`;
          if (Math.round(rounded) === 24) return `${axis}-6`;
          if (Math.round(rounded) === 32) return `${axis}-8`;
          if (Math.round(rounded) === 20) return `${axis}-5`;
          if (Math.round(rounded) === 16) return `${axis}-4`;
        }
        const twUnit = rounded / 4;
        if (Number.isInteger(twUnit) || Number.isInteger(twUnit * 2)) {
          return `${axis}-${twUnit}`;
        }
        return `${axis}-[${Math.round(rounded)}px]`;
      };
      const extractFrameClassNames = async (curr) => {
        var _a2, _b2, _c2, _d2, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
        const boundVars = curr.boundVariables || {};
        const classNames = [];
        if ("layoutMode" in curr && curr.layoutMode !== "NONE") {
          const fn = curr;
          classNames.push("flex");
          if (fn.layoutMode === "HORIZONTAL") {
            classNames.push("flex-row");
          } else {
            classNames.push("flex-col");
          }
          if (fn.primaryAxisAlignItems === "CENTER") classNames.push("justify-center");
          else if (fn.primaryAxisAlignItems === "SPACE_BETWEEN") classNames.push("justify-between");
          else if (fn.primaryAxisAlignItems === "MAX") classNames.push("justify-end");
          if (fn.counterAxisAlignItems === "CENTER") classNames.push("items-center");
          else if (fn.counterAxisAlignItems === "MAX") classNames.push("items-end");
          const gapVarId = (_a2 = boundVars.itemSpacing) == null ? void 0 : _a2.id;
          const gapVarName = await resolveVarName(gapVarId);
          if (gapVarName) {
            const s = sanitizeSpacingToken(gapVarName);
            classNames.push(s === "none" || s === "0" || s === "constant-none" ? "gap-none" : `gap-${s}`);
          } else if (fn.itemSpacing !== void 0 && fn.itemSpacing !== null) {
            if (fn.itemSpacing === 0) {
              classNames.push("gap-none");
            } else {
              const s = matchSpacingToToken(fn.itemSpacing, curr.name, "gap");
              classNames.push(s === "0" || s === "none" ? "gap-none" : `gap-${s}`);
            }
          }
          const pTopVar = await resolveVarName((_b2 = boundVars.paddingTop) == null ? void 0 : _b2.id);
          const pBottomVar = await resolveVarName((_c2 = boundVars.paddingBottom) == null ? void 0 : _c2.id);
          const pLeftVar = await resolveVarName((_d2 = boundVars.paddingLeft) == null ? void 0 : _d2.id);
          const pRightVar = await resolveVarName((_e = boundVars.paddingRight) == null ? void 0 : _e.id);
          const isNoneVar = (varName) => {
            if (!varName) return false;
            const s = sanitizeSpacingToken(varName);
            return s === "none" || s === "0" || s === "constant-none" || varName.toLowerCase().includes("none") || varName.toLowerCase().endsWith("/none");
          };
          const resolvePadToken = (varName, numVal, side = "p") => {
            if (varName) {
              const s = sanitizeSpacingToken(varName);
              return isNoneVar(varName) ? "none" : s;
            }
            if (numVal !== void 0 && numVal !== null) {
              if (numVal === 0) return "none";
              const s = matchSpacingToToken(numVal, curr.name, side);
              return s === "0" || s === "none" ? "none" : s;
            }
            return null;
          };
          const tPad = resolvePadToken(pTopVar, fn.paddingTop, "pt");
          const bPad = resolvePadToken(pBottomVar, fn.paddingBottom, "pb");
          const lPad = resolvePadToken(pLeftVar, fn.paddingLeft, "pl");
          const rPad = resolvePadToken(pRightVar, fn.paddingRight, "pr");
          const allFourEqual = tPad !== null && tPad === bPad && tPad === lPad && tPad === rPad;
          if (allFourEqual) {
            classNames.push(`p-${tPad}`);
          } else {
            const verticalEqual = tPad !== null && tPad === bPad;
            const horizontalEqual = lPad !== null && lPad === rPad;
            if (verticalEqual) {
              classNames.push(`py-${tPad}`);
            } else {
              if (tPad !== null) classNames.push(`pt-${tPad}`);
              if (bPad !== null) classNames.push(`pb-${bPad}`);
            }
            if (horizontalEqual) {
              classNames.push(`px-${lPad}`);
            } else {
              if (lPad !== null) classNames.push(`pl-${lPad}`);
              if (rPad !== null) classNames.push(`pr-${rPad}`);
            }
          }
        }
        let radVarName = await resolveVarName((_f = boundVars.cornerRadius) == null ? void 0 : _f.id);
        if (!radVarName) {
          radVarName = await resolveVarName((_g = boundVars.topLeftRadius) == null ? void 0 : _g.id);
        }
        if (!radVarName) {
          radVarName = await resolveVarName((_h = boundVars.topRightRadius) == null ? void 0 : _h.id);
        }
        const numRadius = "cornerRadius" in curr && typeof curr.cornerRadius === "number" ? curr.cornerRadius : "topLeftRadius" in curr && typeof curr.topLeftRadius === "number" ? curr.topLeftRadius : 0;
        let varNumVal = null;
        const varId = ((_i = boundVars.cornerRadius) == null ? void 0 : _i.id) || ((_j = boundVars.topLeftRadius) == null ? void 0 : _j.id) || ((_k = boundVars.topRightRadius) == null ? void 0 : _k.id);
        if (varId) {
          try {
            const v = await figma.variables.getVariableByIdAsync(varId);
            if (v && v.resolvedType === "FLOAT") {
              const mKeys = Object.keys(v.valuesByMode || {});
              if (mKeys.length > 0) {
                const val = v.valuesByMode[mKeys[0]];
                if (typeof val === "number") varNumVal = val;
              }
            }
          } catch (e) {
          }
        }
        const isFullPill = numRadius >= 999 || varNumVal !== null && varNumVal >= 999 || (radVarName ? /(\b|_)(full|pill)(\b|_)/i.test(radVarName) || radVarName.toLowerCase().endsWith("/full") || radVarName.toLowerCase().endsWith("/pill") : false);
        if (isFullPill) {
          let effectiveH = "height" in curr && typeof curr.height === "number" && curr.height > 0 ? curr.height : curr.parent && "height" in curr.parent && typeof curr.parent.height === "number" ? curr.parent.height : 0;
          if (effectiveH > 0) {
            const halfH = Math.round(effectiveH / 2);
            classNames.push(`rounded-[${halfH}px]`);
          } else {
            classNames.push("rounded-full");
          }
        } else if (radVarName) {
          const s = sanitizeRadiusToken(radVarName);
          const isNone = s === "none" || s === "0" || s === "constant-none" || radVarName.toLowerCase().includes("none") || radVarName.toLowerCase().endsWith("/none");
          classNames.push(isNone ? "rounded-none" : `rounded-${s}`);
        } else if (numRadius > 0) {
          const s = matchRadiusToToken(numRadius, curr.name);
          classNames.push(s === "none" ? "rounded-none" : `rounded-${s}`);
        }
        const formatDimToken = (varName) => {
          if (!varName) return null;
          const clean = varName.trim();
          const lower = clean.toLowerCase();
          if (lower.includes("wcag")) {
            return "wcag-min-target";
          }
          if (lower.includes("minmax") || lower.includes("min-max") || lower.startsWith("minmax/") || lower.startsWith("min-max/")) {
            const part = clean.split("/").pop() || clean;
            const kebabPart = part.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
            return `min-max-${kebabPart}`;
          }
          if (/^constant\//i.test(clean) || /\/constant\//i.test(clean)) {
            const last = clean.split("/").pop() || clean;
            return last.toLowerCase() === "6" ? "6" : `constant-${last.toLowerCase()}`;
          }
          const lastPart = clean.split("/").pop() || clean;
          return lastPart.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        };
        const minWVarName = await resolveVarName((_l = boundVars.minWidth) == null ? void 0 : _l.id);
        if (minWVarName) {
          const s = formatDimToken(minWVarName);
          classNames.push(s === "0" || s === "none" ? "min-w-0" : s === "full" ? "min-w-full" : `min-w-${s}`);
        } else if ("minWidth" in curr && typeof curr.minWidth === "number" && curr.minWidth !== null && curr.minWidth > 0) {
          classNames.push(formatDimClass(curr.minWidth, "min-w"));
        }
        const mwVarName = await resolveVarName((_m = boundVars.maxWidth) == null ? void 0 : _m.id);
        if (mwVarName) {
          const s = formatDimToken(mwVarName);
          classNames.push(s === "none" ? "max-w-none" : s === "full" ? "max-w-full" : `max-w-${s}`);
        } else if ("maxWidth" in curr && typeof curr.maxWidth === "number" && curr.maxWidth !== null && curr.maxWidth > 0) {
          classNames.push(formatDimClass(curr.maxWidth, "max-w"));
        }
        const wVarName = await resolveVarName((_n = boundVars.width) == null ? void 0 : _n.id);
        if (wVarName && (wVarName.toLowerCase().includes("full") || wVarName.toLowerCase().endsWith("/full"))) {
          classNames.push("w-full");
        } else if (wVarName && (wVarName.toLowerCase().includes("screen") || wVarName.toLowerCase().endsWith("/screen"))) {
          classNames.push("w-screen");
        } else if (wVarName && (wVarName.toLowerCase().includes("auto") || wVarName.toLowerCase().endsWith("/auto"))) {
          classNames.push("w-auto");
        } else if ("layoutAlign" in curr && curr.layoutAlign === "STRETCH") {
          classNames.push("w-full");
        } else if ("width" in curr && typeof curr.width === "number" && curr.width > 0) {
          if (!("layoutMode" in curr && curr.layoutMode !== "NONE")) {
            classNames.push(formatDimClass(curr.width, "w"));
          }
        }
        if ("layoutGrow" in curr && curr.layoutGrow === 1) {
          classNames.push("flex-1");
        }
        const minHVarName = await resolveVarName((_o = boundVars.minHeight) == null ? void 0 : _o.id);
        if (minHVarName) {
          const s = formatDimToken(minHVarName);
          classNames.push(s === "0" || s === "none" ? "min-h-0" : s === "full" ? "min-h-full" : s === "screen" ? "min-h-screen" : `min-h-${s}`);
        } else if ("minHeight" in curr && typeof curr.minHeight === "number" && curr.minHeight !== null && curr.minHeight > 0) {
          classNames.push(formatDimClass(curr.minHeight, "min-h"));
        }
        const maxHVarName = await resolveVarName((_p = boundVars.maxHeight) == null ? void 0 : _p.id);
        if (maxHVarName) {
          const s = formatDimToken(maxHVarName);
          classNames.push(s === "none" ? "max-h-none" : s === "full" ? "max-h-full" : s === "screen" ? "max-h-screen" : `max-h-${s}`);
        } else if ("maxHeight" in curr && typeof curr.maxHeight === "number" && curr.maxHeight !== null && curr.maxHeight > 0) {
          classNames.push(formatDimClass(curr.maxHeight, "max-h"));
        }
        const hVarName = await resolveVarName((_q = boundVars.height) == null ? void 0 : _q.id);
        if (hVarName && (hVarName.toLowerCase().includes("full") || hVarName.toLowerCase().endsWith("/full"))) {
          classNames.push("h-full");
        } else if (hVarName && (hVarName.toLowerCase().includes("screen") || hVarName.toLowerCase().endsWith("/screen"))) {
          classNames.push("h-screen");
        } else if (hVarName && (hVarName.toLowerCase().includes("auto") || hVarName.toLowerCase().endsWith("/auto"))) {
          classNames.push("h-auto");
        } else if ("height" in curr && typeof curr.height === "number" && curr.height > 0) {
          classNames.push(formatDimClass(curr.height, "h"));
        }
        if ("fills" in curr && Array.isArray(curr.fills) && curr.fills.length > 0) {
          const fill = curr.fills[0];
          if (fill.type === "SOLID") {
            const colorVarId = (_s = (_r = fill.boundVariables) == null ? void 0 : _r.color) == null ? void 0 : _s.id;
            const colorVarName = await resolveVarName(colorVarId);
            let tokenName = null;
            if (colorVarName) {
              tokenName = sanitizeColorToken(colorVarName);
            } else if (fill.color) {
              tokenName = matchColorToToken(fill.color, curr.name, curr.type === "TEXT", false);
            }
            if (tokenName) {
              const prefix = curr.type === "TEXT" ? "text" : "bg";
              classNames.push(`${prefix}-${tokenName}`);
            }
          }
        }
        if ("strokes" in curr && Array.isArray(curr.strokes) && curr.strokes.length > 0) {
          const stroke = curr.strokes[0];
          if (stroke.type === "SOLID") {
            const strokeVarId = (_u = (_t = stroke.boundVariables) == null ? void 0 : _t.color) == null ? void 0 : _u.id;
            const strokeVarName = await resolveVarName(strokeVarId);
            let strokeToken = null;
            if (strokeVarName) {
              strokeToken = sanitizeColorToken(strokeVarName);
            } else if (stroke.color) {
              strokeToken = matchColorToToken(stroke.color, curr.name, false, true);
            }
            if (strokeToken) {
              classNames.push(`border-${strokeToken}`);
            }
          }
          if ("strokeWeight" in curr && typeof curr.strokeWeight === "number" && curr.strokeWeight > 0) {
            classNames.push("border");
          } else if ("strokeTopWeight" in curr) {
            const fn = curr;
            if (fn.strokeTopWeight > 0 && fn.strokeBottomWeight > 0 && fn.strokeLeftWeight === 0 && fn.strokeRightWeight === 0) {
              classNames.push("border-y");
            } else {
              if (fn.strokeTopWeight > 0) classNames.push("border-t");
              if (fn.strokeBottomWeight > 0) classNames.push("border-b");
              if (fn.strokeLeftWeight > 0) classNames.push("border-l");
              if (fn.strokeRightWeight > 0) classNames.push("border-r");
            }
          }
        }
        return classNames;
      };
      const traverse = async (curr, indent = "  ", isRoot = false) => {
        const classNames = await extractFrameClassNames(curr);
        if (curr.type === "TEXT") {
          const tn = curr;
          let resolvedStyleName = null;
          if (typeof tn.textStyleId === "string" && tn.textStyleId.length > 0) {
            try {
              const st = await figma.getStyleByIdAsync(tn.textStyleId);
              if (st) resolvedStyleName = st.name;
            } catch (e) {
            }
          }
          const matchFontSizeToToken = (val) => {
            if (val >= 96) return "text-6xl";
            if (val >= 72) return "text-5xl";
            if (val >= 48) return "text-4xl";
            if (val >= 32) return "text-3xl";
            if (val >= 24) return "text-2xl";
            if (val >= 20) return "text-xl";
            if (val >= 18) return "text-lg";
            if (val >= 16) return "text-base";
            if (val >= 14) return "text-sm";
            if (val <= 12) return "text-xs";
            return `text-[${val}px]`;
          };
          if (resolvedStyleName) {
            const cleanStyle = resolvedStyleName.toLowerCase();
            if (cleanStyle.includes("heading/h1") || cleanStyle.includes("display/mega")) classNames.push("text-6xl");
            else if (cleanStyle.includes("heading/h2") || cleanStyle.includes("display/huge")) classNames.push("text-5xl");
            else if (cleanStyle.includes("heading/h3") || cleanStyle.includes("display/large")) classNames.push("text-4xl");
            else if (cleanStyle.includes("heading/h4")) classNames.push("text-3xl");
            else if (cleanStyle.includes("heading/h5")) classNames.push("text-2xl");
            else if (cleanStyle.includes("heading/h6")) classNames.push("text-xl");
            else if (cleanStyle.includes("headline/large")) classNames.push("text-2xl");
            else if (cleanStyle.includes("headline/medium")) classNames.push("text-xl");
            else if (cleanStyle.includes("title/large")) classNames.push("text-lg");
            else if (cleanStyle.includes("body/large")) classNames.push("text-body-large");
            else if (cleanStyle.includes("body/medium")) classNames.push("text-body-medium");
            else if (cleanStyle.includes("body/small")) classNames.push("text-body-small");
            else if (cleanStyle.includes("label/large")) classNames.push("text-label-large");
            else if (cleanStyle.includes("label/medium") || cleanStyle.includes("label/small")) classNames.push("text-label-small");
            else if (typeof tn.fontSize === "number") classNames.push(matchFontSizeToToken(tn.fontSize));
            const fam = tn.fontName && typeof tn.fontName === "object" ? tn.fontName.family || "" : "";
            if (fam) {
              const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, "");
              const fontClass = "font-" + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1);
              if (!classNames.includes(fontClass)) classNames.push(fontClass);
            }
            if (cleanStyle.includes("bold")) classNames.push("font-bold");
            else if (cleanStyle.includes("medium")) classNames.push("font-medium");
            else if (cleanStyle.includes("regular")) classNames.push("font-normal");
          } else {
            if (typeof tn.fontSize === "number") classNames.push(matchFontSizeToToken(tn.fontSize));
            if (typeof tn.fontName === "object" && tn.fontName !== null) {
              const fam = tn.fontName.family || "";
              if (fam) {
                const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, "");
                const fontClass = "font-" + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1);
                if (!classNames.includes(fontClass)) classNames.push(fontClass);
              }
              if ("style" in tn.fontName) {
                const st = (tn.fontName.style || "").toLowerCase();
                if (st.includes("bold")) classNames.push("font-bold");
                else if (st.includes("medium")) classNames.push("font-medium");
              }
            }
          }
          if (typeof tn.textCase === "string" && tn.textCase === "UPPER") classNames.push("uppercase");
          const dataStyleAttr = resolvedStyleName ? ` data-text-style="${resolvedStyleName}"` : "";
          return `${indent}<span className="${classNames.join(" ")}"${dataStyleAttr}>${tn.characters}</span>`;
        }
        if (curr.type === "ELLIPSE") {
          classNames.push("rounded-full", "shrink-0");
          if ("width" in curr && typeof curr.width === "number") {
            classNames.push(`w-[${curr.width}px]`);
          }
          if ("height" in curr && typeof curr.height === "number") {
            classNames.push(`h-[${curr.height}px]`);
          }
          return `${indent}<span className="${classNames.join(" ")}" aria-hidden="true" />`;
        }
        const { tag, isSub, isExternal, subName, defaultHtmlTag, extraProps } = resolveTag(curr, isRoot);
        const classAttr = classNames.length > 0 ? ` className="${classNames.join(" ")}"` : "";
        const propsAttr = extraProps ? ` ${extraProps}` : "";
        if (isRoot) {
          if (node.type !== "COMPONENT_SET") {
            rootClassNames = classNames;
          }
          if ("children" in curr && curr.children.length > 0) {
            const childStrs = [];
            const seenSignatures = /* @__PURE__ */ new Map();
            for (const ch of curr.children) {
              const str = await traverse(ch, indent + "  ", false);
              const count = seenSignatures.get(str) || 0;
              seenSignatures.set(str, count + 1);
              if (count < 2) {
                childStrs.push(str);
              }
            }
            const rootVariantProps2 = variantPropsDefs.map((v) => `${v.propName.charAt(0).toLowerCase() + v.propName.slice(1)}="${v.defaultVal || v.options[0]}"`).join(" ");
            const openTag = rootVariantProps2 ? `<${tag} ${rootVariantProps2}>` : `<${tag}>`;
            return `${indent}${openTag}
${childStrs.join("\n")}
${indent}</${tag}>`;
          }
          const rootVariantProps = variantPropsDefs.map((v) => `${v.propName.charAt(0).toLowerCase() + v.propName.slice(1)}="${v.defaultVal || v.options[0]}"`).join(" ");
          const selfCloseTag = rootVariantProps ? `<${tag} ${rootVariantProps} />` : `<${tag} />`;
          return `${indent}${selfCloseTag}`;
        } else if (isSub && subName) {
          const cleanSub = subName.replace(/^[._/ -]+/, "").replace(/[^a-zA-Z0-9]/g, "");
          if (!detectedSubcomponents.has(cleanSub)) {
            let finalClassNames = classNames;
            if (cleanSub.toLowerCase().includes("icon")) {
              finalClassNames = classNames.map((c) => {
                if (c.startsWith("bg-on-") || c.startsWith("bg-primary") || c.startsWith("bg-secondary") || c.startsWith("bg-error")) {
                  return "bg-current";
                }
                if (c.startsWith("text-on-") || c.startsWith("text-primary") || c.startsWith("text-secondary") || c.startsWith("text-error")) {
                  return "text-current";
                }
                return c;
              });
            }
            detectedSubcomponents.set(cleanSub, {
              subName: cleanSub,
              fullTag: tag,
              htmlTag: defaultHtmlTag,
              classNames: finalClassNames.join(" ")
            });
          }
        }
        if (isExternal) {
          return `${indent}<${tag}${propsAttr}${classAttr} />`;
        }
        if (isSub) {
          if ("children" in curr && curr.children.length > 0) {
            const childStrs = [];
            const seenSignatures = /* @__PURE__ */ new Map();
            for (const ch of curr.children) {
              const str = await traverse(ch, indent + "  ", false);
              const count = seenSignatures.get(str) || 0;
              seenSignatures.set(str, count + 1);
              if (count < 2) {
                childStrs.push(str);
              }
            }
            return `${indent}<${tag}${classAttr}>
${childStrs.join("\n")}
${indent}</${tag}>`;
          }
          return `${indent}<${tag}${classAttr} />`;
        }
        if ("children" in curr && curr.children.length > 0) {
          const childStrs = [];
          const seenSignatures = /* @__PURE__ */ new Map();
          for (const ch of curr.children) {
            const str = await traverse(ch, indent + "  ", false);
            const count = seenSignatures.get(str) || 0;
            seenSignatures.set(str, count + 1);
            if (count < 2) {
              childStrs.push(str);
            }
          }
          return `${indent}<${tag}${classAttr}>
${childStrs.join("\n")}
${indent}</${tag}>`;
        }
        return `${indent}<${tag}${classAttr} />`;
      };
      const variantPropsDefs = [];
      const booleanPropsDefs = [];
      const instanceSwapPropsDefs = [];
      const textPropsDefs = [];
      let variants = [];
      let defaultVariantNode = null;
      const preferredInstancesMap = {};
      const rawPropDefs = "componentPropertyDefinitions" in node ? node.componentPropertyDefinitions || {} : {};
      for (const [propKey, def] of Object.entries(rawPropDefs)) {
        const cleanKey = propKey.split("#")[0].replace(/[^a-zA-Z0-9]/g, "");
        const propPascal = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
        const pType = def.type;
        if (pType === "VARIANT" && Array.isArray(def.variantOptions)) {
          variantPropsDefs.push({
            propName: propPascal,
            options: def.variantOptions,
            defaultVal: def.defaultValue
          });
        } else if (pType === "BOOLEAN") {
          booleanPropsDefs.push({
            propName: propPascal,
            defaultVal: false
          });
        } else if (pType === "INSTANCE_SWAP") {
          instanceSwapPropsDefs.push({
            propName: propPascal,
            defaultVal: def.defaultValue
          });
          const preferredValues = def.preferredValues;
          if (Array.isArray(preferredValues) && preferredValues.length > 0) {
            const prefList = [];
            for (const pv of preferredValues) {
              try {
                if (pv.key) {
                  const local = figma.root.findOne((n) => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && n.key === pv.key);
                  if (local) {
                    prefList.push(local.name);
                  } else if (pv.type === "COMPONENT") {
                    const imported = await figma.importComponentByKeyAsync(pv.key);
                    if (imported) prefList.push(imported.name);
                  } else if (pv.type === "COMPONENT_SET") {
                    const importedSet = await figma.importComponentSetByKeyAsync(pv.key);
                    if (importedSet) prefList.push(importedSet.name);
                  }
                }
              } catch (e) {
              }
            }
            if (prefList.length > 0) {
              preferredInstancesMap[propPascal] = prefList;
            }
          }
        } else if (pType === "TEXT") {
          textPropsDefs.push({
            propName: propPascal,
            defaultVal: String(def.defaultValue || "")
          });
        }
      }
      if (node.type === "COMPONENT_SET") {
        const compSet = node;
        variants = compSet.children.filter((c) => c.type === "COMPONENT");
        defaultVariantNode = compSet.defaultVariant || (variants[0] || null);
      }
      try {
        if ("findAll" in node) {
          const slotNodes = node.findAll((n) => /slot/i.test(n.name));
          for (const slot of slotNodes) {
            const slotClean = slot.name.replace(/^[._/ -]+/, "").replace(/[^a-zA-Z0-9]/g, "");
            if ("children" in slot && Array.isArray(slot.children)) {
              const instanceChildren = slot.children.filter((c) => c.type === "INSTANCE");
              for (const inst of instanceChildren) {
                let compName = "";
                if (inst.mainComponent) {
                  const parentSet = inst.mainComponent.parent && inst.mainComponent.parent.type === "COMPONENT_SET" ? inst.mainComponent.parent : null;
                  compName = parentSet ? parentSet.name : inst.mainComponent.name;
                } else {
                  compName = inst.name;
                }
                if (compName) {
                  const cleanComp = compName.split(/[,=]/)[0].trim();
                  if (!preferredInstancesMap[slotClean]) {
                    preferredInstancesMap[slotClean] = [];
                  }
                  if (!preferredInstancesMap[slotClean].includes(cleanComp)) {
                    preferredInstancesMap[slotClean].push(cleanComp);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
      }
      let variantDictCode = "";
      let variantClassesLookup = "";
      let variantDefaultDestructure = "";
      const subcomponentUsageMap = /* @__PURE__ */ new Map();
      const extractDeepVariantClasses = async (variantNode) => {
        const classesSet = /* @__PURE__ */ new Set();
        const rootCls = await extractFrameClassNames(variantNode);
        rootCls.forEach((c) => classesSet.add(c));
        const resolveIconDimensions = async (iconNode) => {
          var _a2, _b2;
          if (!("width" in iconNode) || !("height" in iconNode) || !iconNode.width || !iconNode.height) return null;
          if (iconNode.width > 48 || iconNode.height > 48) return null;
          const boundVars = iconNode.boundVariables || (iconNode.type === "INSTANCE" && iconNode.mainComponent ? iconNode.mainComponent.boundVariables : {}) || {};
          let iconW = iconNode.width;
          let iconH = iconNode.height;
          if ((_a2 = boundVars.width) == null ? void 0 : _a2.id) {
            try {
              const v = await figma.variables.getVariableByIdAsync(boundVars.width.id);
              if (v && v.resolvedType === "FLOAT") {
                const mKeys = Object.keys(v.valuesByMode);
                if (mKeys.length > 0) {
                  const val = v.valuesByMode[mKeys[0]];
                  if (typeof val === "number") {
                    iconW = val;
                  }
                }
              }
            } catch (e) {
            }
          }
          if ((_b2 = boundVars.height) == null ? void 0 : _b2.id) {
            try {
              const v = await figma.variables.getVariableByIdAsync(boundVars.height.id);
              if (v && v.resolvedType === "FLOAT") {
                const mKeys = Object.keys(v.valuesByMode);
                if (mKeys.length > 0) {
                  const val = v.valuesByMode[mKeys[0]];
                  if (typeof val === "number") {
                    iconH = val;
                  }
                }
              }
            } catch (e) {
            }
          }
          const formatDimClass2 = (val, axis) => {
            if (!val || val <= 0) return `${axis}-0`;
            const rounded = Math.round(val * 10) / 10;
            const twUnit = rounded / 4;
            if (Number.isInteger(twUnit) || Number.isInteger(twUnit * 2)) {
              return `${axis}-${twUnit}`;
            }
            return `${axis}-[${Math.round(rounded)}px]`;
          };
          return `${formatDimClass2(iconW, "w")} ${formatDimClass2(iconH, "h")}`;
        };
        const inspectChildren = async (parent) => {
          var _a2, _b2, _c2, _d2;
          if (!("children" in parent)) return;
          for (const child of parent.children) {
            const isIconCandidate = child.name.toLowerCase().includes("icon") || child.name.toLowerCase().includes("lucide") || child.type === "INSTANCE" && child.width && child.height && child.width <= 48 && child.height <= 48 && !child.name.toLowerCase().includes("surface") && !child.name.toLowerCase().includes("container");
            if (isIconCandidate && child.width && child.height && child.width <= 48 && child.height <= 48) {
              const iconCls = await resolveIconDimensions(child);
              if (iconCls) {
                const sizeProp = ((_a2 = variantNode.variantProperties) == null ? void 0 : _a2.Size) || ((_b2 = variantNode.variantProperties) == null ? void 0 : _b2.size);
                if (sizeProp) {
                  iconSizeBySize.set(sizeProp, iconCls);
                }
              }
              const checkIconColors = async (n) => {
                var _a3, _b3, _c3, _d3;
                if ("fills" in n && Array.isArray(n.fills) && n.fills.length > 0) {
                  const fill = n.fills[0];
                  if (fill.type === "SOLID") {
                    const colorVarId = (_b3 = (_a3 = fill.boundVariables) == null ? void 0 : _a3.color) == null ? void 0 : _b3.id;
                    const colorVarName = await resolveVarName(colorVarId);
                    let token = colorVarName ? sanitizeColorToken(colorVarName) : null;
                    if (!token && fill.color) {
                      token = matchColorToToken(fill.color, n.name, true, false);
                    }
                    if (token) classesSet.add(`text-${token}`);
                  }
                }
                if ("strokes" in n && Array.isArray(n.strokes) && n.strokes.length > 0) {
                  const stroke = n.strokes[0];
                  if (stroke.type === "SOLID") {
                    const strokeVarId = (_d3 = (_c3 = stroke.boundVariables) == null ? void 0 : _c3.color) == null ? void 0 : _d3.id;
                    const strokeVarName = await resolveVarName(strokeVarId);
                    let token = strokeVarName ? sanitizeColorToken(strokeVarName) : null;
                    if (!token && stroke.color) {
                      token = matchColorToToken(stroke.color, n.name, true, false);
                    }
                    if (token) classesSet.add(`text-${token}`);
                  }
                }
                if ("children" in n) {
                  for (const c of n.children) {
                    await checkIconColors(c);
                  }
                }
              };
              await checkIconColors(child);
            } else if (child.type === "FRAME" || child.type === "GROUP") {
              const frameCls = await extractFrameClassNames(child);
              const isSurfaceOrContainer = /container|surface|background|content|item|box/i.test(child.name);
              frameCls.forEach((c) => {
                const isLayoutOrDim = /^(flex|w-|h-|min-w-|min-h-|max-w-|max-h-|p-|px-|py-|pt-|pb-|pl-|pr-|gap-|rounded-)/.test(c);
                if (!isLayoutOrDim) {
                  classesSet.add(c);
                } else if (isSurfaceOrContainer) {
                  if (/^(rounded-|p-|px-|py-|pt-|pb-|pl-|pr-|max-h-|min-h-)/.test(c)) {
                    classesSet.add(c);
                  }
                }
              });
              await inspectChildren(child);
            } else if (child.type === "INSTANCE") {
              const inst = child;
              let masterName = "";
              if (inst.mainComponent) {
                const comp = inst.mainComponent;
                const parentCompSet = comp.parent && comp.parent.type === "COMPONENT_SET" ? comp.parent : null;
                masterName = parentCompSet ? parentCompSet.name : comp.name;
              } else {
                masterName = inst.name;
              }
              const isIcon = isIconCandidate;
              const isSurface = masterName.toLowerCase().includes("surface") || inst.name.toLowerCase().includes("surface");
              if (!isIcon && !isSurface && masterName && masterName.toLowerCase() !== rootName.toLowerCase()) {
                const rawMaster = masterName.split(",")[0].split("=")[0].trim();
                const cleanSub = rawMaster.replace(/^[_./]+/, "").replace(/[^a-zA-Z0-9]/g, "");
                const isPriv = rawMaster.startsWith("_") || rawMaster.startsWith(".");
                const isSubOfRoot = cleanSub.toLowerCase().startsWith(rootName.toLowerCase()) || ["item", "track", "content", "separator", "trigger", "body", "slot", "leading", "trailing", "header", "footer"].includes(cleanSub.toLowerCase());
                const isKnownExternal = ["button", "buttonicon", "iconbutton", "logotype", "badge", "isobadge", "avatar", "tag", "tooltip", "input", "select"].includes(cleanSub.toLowerCase());
                const isExternal = !isPriv && !isSubOfRoot && (isKnownExternal || !cleanSub.toLowerCase().includes(rootName.toLowerCase()));
                const kebab = cleanSub.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
                const importPath = isPriv ? `./_${cleanSub}` : isExternal ? `../${kebab}` : `./${cleanSub}`;
                if (cleanSub && cleanSub.toLowerCase() !== rootName.toLowerCase()) {
                  if (!subcomponentUsageMap.has(cleanSub)) {
                    subcomponentUsageMap.set(cleanSub, {
                      name: cleanSub,
                      rawName: rawMaster,
                      isPrivate: isPriv,
                      isExternal,
                      importPath,
                      appearingVariants: [],
                      propsKeys: /* @__PURE__ */ new Set(),
                      fixedProps: /* @__PURE__ */ new Map(),
                      isAbsolute: inst.layoutPositioning === "ABSOLUTE" || cleanSub.toLowerCase().includes("background") || cleanSub.toLowerCase().includes("overlay") || cleanSub.toLowerCase().includes("ring")
                    });
                  }
                  const rec = subcomponentUsageMap.get(cleanSub);
                  if (!rec.appearingVariants.includes(variantNode)) {
                    rec.appearingVariants.push(variantNode);
                  }
                  if (inst.variantProperties) {
                    Object.entries(inst.variantProperties).forEach(([k, v]) => {
                      const cleanK = k.split("#")[0].replace(/[^a-zA-Z0-9]/g, "");
                      const pascalK = cleanK.charAt(0).toUpperCase() + cleanK.slice(1);
                      rec.propsKeys.add(pascalK);
                      if (!rec.fixedProps.has(pascalK) && v) {
                        rec.fixedProps.set(pascalK, v);
                      }
                    });
                  }
                }
              }
              if (isSurface) {
                if (inst.variantProperties) {
                  const rad = inst.variantProperties["Radius"] || inst.variantProperties["radius"];
                  if (rad) {
                    const radLower = rad.toLowerCase();
                    if (radLower === "full") {
                      const h = "height" in inst && typeof inst.height === "number" && inst.height > 0 ? inst.height : "height" in variantNode && typeof variantNode.height === "number" ? variantNode.height : 0;
                      if (h > 0) {
                        classesSet.add(`rounded-[${Math.round(h / 2)}px]`);
                      } else {
                        classesSet.add("rounded-full");
                      }
                    } else if (radLower === "large") classesSet.add("rounded-large");
                    else if (radLower === "base") classesSet.add("rounded-base");
                    else if (radLower === "small") classesSet.add("rounded-small");
                    else if (radLower === "extrasmall") classesSet.add("rounded-extra-small");
                    else if (radLower === "none") classesSet.add("rounded-none");
                  }
                  const border = inst.variantProperties["Border"] || inst.variantProperties["border"];
                  if (border && border.toLowerCase() !== "none") {
                    classesSet.add("border");
                  }
                }
                const surfCls = await extractFrameClassNames(inst);
                surfCls.forEach((c) => classesSet.add(c));
              }
              await inspectChildren(child);
            } else if (child.type === "TEXT") {
              const tn = child;
              let styleName = null;
              if (tn.textStyleId) {
                try {
                  const s = await figma.getStyleByIdAsync(tn.textStyleId);
                  if (s) styleName = s.name;
                } catch (e) {
                }
              }
              if (styleName) {
                const clean = styleName.toLowerCase();
                if (clean.includes("label/large") || clean.includes("label-large") || clean.includes("label large")) classesSet.add("text-label-large");
                else if (clean.includes("label/medium") || clean.includes("label-medium") || clean.includes("label medium")) classesSet.add("text-label-medium");
                else if (clean.includes("label/small") || clean.includes("label-small") || clean.includes("label small")) classesSet.add("text-label-small");
                else if (clean.includes("body/large") || clean.includes("body-large") || clean.includes("body large")) classesSet.add("text-body-large");
                else if (clean.includes("body/medium") || clean.includes("body-medium") || clean.includes("body medium")) classesSet.add("text-body-medium");
                else if (clean.includes("body/small") || clean.includes("body-small") || clean.includes("body small")) classesSet.add("text-body-small");
                else if (clean.includes("title/large") || clean.includes("title-large")) classesSet.add("text-title-large");
                else if (clean.includes("title/medium") || clean.includes("title-medium")) classesSet.add("text-title-medium");
                else if (clean.includes("title/small") || clean.includes("title-small")) classesSet.add("text-title-small");
                else if (clean.includes("headline/large") || clean.includes("headline-large")) classesSet.add("text-headline-large");
                else if (clean.includes("headline/medium") || clean.includes("headline-medium")) classesSet.add("text-headline-medium");
                else if (clean.includes("headline/small") || clean.includes("headline-small")) classesSet.add("text-headline-small");
                if (clean.includes("bold") || clean.includes("700")) classesSet.add("font-bold");
                else if (clean.includes("medium") || clean.includes("500")) classesSet.add("font-medium");
                else if (clean.includes("regular") || clean.includes("400")) classesSet.add("font-normal");
              } else if (typeof tn.fontSize === "number") {
                if (tn.fontSize <= 10) classesSet.add("text-label-small");
                else if (tn.fontSize <= 11) classesSet.add("text-label-medium");
                else if (tn.fontSize <= 12) classesSet.add("text-label-large");
                else if (tn.fontSize <= 13) classesSet.add("text-body-small");
                else if (tn.fontSize <= 14) classesSet.add("text-body-medium");
                else if (tn.fontSize <= 16) classesSet.add("text-body-large");
                else if (tn.fontSize <= 18) classesSet.add("text-title-small");
                else if (tn.fontSize <= 20) classesSet.add("text-title-medium");
                else if (tn.fontSize <= 22) classesSet.add("text-title-large");
                else classesSet.add("text-headline-small");
              }
              if (typeof tn.fontName === "object" && tn.fontName !== null) {
                const fam = tn.fontName.family || "";
                if (fam) {
                  const cleanFam = fam.replace(/[^a-zA-Z0-9]/g, "");
                  classesSet.add("font-" + cleanFam.charAt(0).toLowerCase() + cleanFam.slice(1));
                }
                if ("style" in tn.fontName) {
                  const st = (tn.fontName.style || "").toLowerCase();
                  if (st.includes("bold") || st.includes("700")) classesSet.add("font-bold");
                  else if (st.includes("medium") || st.includes("500")) classesSet.add("font-medium");
                }
              }
              if ("fills" in tn && Array.isArray(tn.fills) && tn.fills.length > 0) {
                const fill = tn.fills[0];
                if (fill.type === "SOLID") {
                  const colorVarId = (_d2 = (_c2 = fill.boundVariables) == null ? void 0 : _c2.color) == null ? void 0 : _d2.id;
                  const colorVarName = await resolveVarName(colorVarId);
                  let token = null;
                  if (colorVarName) {
                    token = sanitizeColorToken(colorVarName);
                  } else if (fill.color) {
                    token = matchColorToToken(fill.color, tn.name, true, false);
                  }
                  if (token) classesSet.add(`text-${token}`);
                }
              }
            }
          }
        };
        await inspectChildren(variantNode);
        return Array.from(classesSet);
      };
      const iconSizeBySize = /* @__PURE__ */ new Map();
      if (node.type === "COMPONENT_SET" && variants.length > 0) {
        const variantClassList = [];
        for (const v of variants) {
          const cls = await extractDeepVariantClasses(v);
          variantClassList.push({ variant: v, classes: cls });
        }
        const common = variantClassList[0].classes.filter(
          (c) => variantClassList.every((vc) => vc.classes.includes(c))
        );
        rootClassNames = common;
        const defaultVariant = variants.find((v) => {
          const vp = v.variantProperties;
          if (!vp) return false;
          const h = (vp["Hover"] || vp["hover"] || "false").toLowerCase();
          const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
          return (h === "false" || h === "default" || h === "") && (d === "false" || d === "default" || d === "");
        }) || variants[0];
        const defaultVariantObj = variantClassList.find((vc) => vc.variant === defaultVariant);
        const defaultVariantClasses = defaultVariantObj ? defaultVariantObj.classes : [];
        for (const vDef of variantPropsDefs) {
          const propNamePascal = vDef.propName.charAt(0).toUpperCase() + vDef.propName.slice(1);
          const propNameCamel = propNamePascal.charAt(0).toLowerCase() + propNamePascal.slice(1);
          const typeName = `${rootName}${propNamePascal}`;
          const dictName = `${propNameCamel}Classes`;
          const diffs = {};
          let hasAnyDiff = false;
          for (const opt of vDef.options) {
            const matching = variantClassList.filter((vc) => {
              const vp = vc.variant.variantProperties;
              if (!vp) return false;
              const val = vp[vDef.propName] || vp[vDef.propName.toLowerCase()] || vp[vDef.propName.toUpperCase()];
              return val && val.toLowerCase() === opt.toLowerCase();
            });
            const nonMatching = variantClassList.filter((vc) => {
              const vp = vc.variant.variantProperties;
              if (!vp) return true;
              const val = vp[vDef.propName] || vp[vDef.propName.toLowerCase()] || vp[vDef.propName.toUpperCase()];
              return !val || val.toLowerCase() !== opt.toLowerCase();
            });
            const isHoverProp = vDef.propName.toLowerCase() === "hover";
            const isDisabledProp = vDef.propName.toLowerCase() === "disabled";
            const isPressedProp = vDef.propName.toLowerCase() === "pressed";
            let targetMatching = matching;
            let targetNonMatching = nonMatching;
            if (isHoverProp) {
              targetMatching = matching.filter((vc) => {
                var _a2, _b2, _c2, _d2;
                const d = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2.Disabled) || ((_b2 = vc.variant.variantProperties) == null ? void 0 : _b2.disabled) || "").toLowerCase();
                const p = (((_c2 = vc.variant.variantProperties) == null ? void 0 : _c2.Pressed) || ((_d2 = vc.variant.variantProperties) == null ? void 0 : _d2.pressed) || "").toLowerCase();
                return d !== "true" && p !== "true";
              });
              targetNonMatching = nonMatching.filter((vc) => {
                var _a2, _b2, _c2, _d2;
                const d = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2.Disabled) || ((_b2 = vc.variant.variantProperties) == null ? void 0 : _b2.disabled) || "").toLowerCase();
                const p = (((_c2 = vc.variant.variantProperties) == null ? void 0 : _c2.Pressed) || ((_d2 = vc.variant.variantProperties) == null ? void 0 : _d2.pressed) || "").toLowerCase();
                return d !== "true" && p !== "true";
              });
            } else if (isPressedProp) {
              targetMatching = matching.filter((vc) => {
                var _a2, _b2;
                const d = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2.Disabled) || ((_b2 = vc.variant.variantProperties) == null ? void 0 : _b2.disabled) || "").toLowerCase();
                return d !== "true";
              });
              targetNonMatching = nonMatching.filter((vc) => {
                var _a2, _b2;
                const d = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2.Disabled) || ((_b2 = vc.variant.variantProperties) == null ? void 0 : _b2.disabled) || "").toLowerCase();
                return d !== "true";
              });
            } else if (!isDisabledProp) {
              const restingMatching = matching.filter((vc) => {
                const vp = vc.variant.variantProperties || {};
                const h = (vp["Hover"] || vp["hover"] || "false").toLowerCase();
                const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
                const p = (vp["Pressed"] || vp["pressed"] || "false").toLowerCase();
                return (h === "false" || h === "default" || h === "") && (d === "false" || d === "default" || d === "") && (p === "false" || p === "default" || p === "");
              });
              const restingNonMatching = nonMatching.filter((vc) => {
                const vp = vc.variant.variantProperties || {};
                const h = (vp["Hover"] || vp["hover"] || "false").toLowerCase();
                const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
                const p = (vp["Pressed"] || vp["pressed"] || "false").toLowerCase();
                return (h === "false" || h === "default" || h === "") && (d === "false" || d === "default" || d === "") && (p === "false" || p === "default" || p === "");
              });
              if (restingMatching.length > 0) targetMatching = restingMatching;
              if (restingNonMatching.length > 0) targetNonMatching = restingNonMatching;
            }
            const useMatching = targetMatching.length > 0 ? targetMatching : matching;
            const useNonMatching = targetNonMatching.length > 0 ? targetNonMatching : nonMatching;
            const diffClassesList = [];
            if (useMatching.length > 0) {
              for (const c of useMatching[0].classes) {
                if (common.includes(c)) continue;
                const inAllMatching = useMatching.every((vc) => vc.classes.includes(c));
                const inAllNonMatching = useNonMatching.length > 0 && useNonMatching.every((vc) => vc.classes.includes(c));
                const inAnyNonMatching = useNonMatching.some((vc) => vc.classes.includes(c));
                const isVisualOrDim = /^(bg-|border-|rounded-|p-|px-|py-|pt-|pb-|pl-|pr-|max-h-|min-h-|h-|w-|gap-)/.test(c);
                if (inAllMatching && !inAllNonMatching) {
                  diffClassesList.push(c);
                } else if (isVisualOrDim && !inAnyNonMatching && !diffClassesList.includes(c)) {
                  diffClassesList.push(c);
                }
              }
            }
            const hasDedicatedDisabledProp = variantPropsDefs.some((v) => v.propName.toLowerCase() === "disabled");
            const hasDedicatedHoverProp = variantPropsDefs.some((v) => v.propName.toLowerCase() === "hover");
            const hasDedicatedPressedProp = variantPropsDefs.some((v) => v.propName.toLowerCase() === "pressed");
            const isSizeProp = vDef.propName.toLowerCase() === "size";
            if (!isSizeProp) {
              if (!isHoverProp && !hasDedicatedHoverProp) {
                const hoverMatching = matching.filter((vc) => {
                  const vp = vc.variant.variantProperties || {};
                  const h = (vp["Hover"] || vp["hover"] || "false").toLowerCase();
                  const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
                  const p = (vp["Pressed"] || vp["pressed"] || "false").toLowerCase();
                  return (h === "true" || h === "hover") && (d === "false" || d === "default" || d === "") && (p === "false" || p === "default" || p === "");
                });
                if (hoverMatching.length > 0 && targetMatching.length > 0) {
                  const hoverClasses = hoverMatching[0].classes.filter(
                    (c) => hoverMatching.every((vc) => vc.classes.includes(c)) && !targetMatching.every((vc) => vc.classes.includes(c)) && !common.includes(c)
                  );
                  for (const c of hoverClasses) {
                    if (c.startsWith("bg-") || c.startsWith("text-") || c.startsWith("border-")) {
                      const pref = `hover:${c}`;
                      if (!diffClassesList.includes(pref)) {
                        diffClassesList.push(pref);
                      }
                    }
                  }
                }
              }
              if (!isPressedProp && !hasDedicatedPressedProp) {
                const pressedMatching = matching.filter((vc) => {
                  const vp = vc.variant.variantProperties || {};
                  const p = (vp["Pressed"] || vp["pressed"] || "false").toLowerCase();
                  const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
                  return (p === "true" || p === "pressed") && (d === "false" || d === "default" || d === "");
                });
                if (pressedMatching.length > 0 && targetMatching.length > 0) {
                  const pressedClasses = pressedMatching[0].classes.filter(
                    (c) => pressedMatching.every((vc) => vc.classes.includes(c)) && !targetMatching.every((vc) => vc.classes.includes(c)) && !common.includes(c)
                  );
                  for (const c of pressedClasses) {
                    if (c.startsWith("bg-") || c.startsWith("text-") || c.startsWith("border-") || c.startsWith("scale-")) {
                      const pref = `active:${c}`;
                      if (!diffClassesList.includes(pref)) {
                        diffClassesList.push(pref);
                      }
                    }
                  }
                }
              }
              if (!isDisabledProp && !hasDedicatedDisabledProp) {
                const disabledMatching = matching.filter((vc) => {
                  const vp = vc.variant.variantProperties || {};
                  const d = (vp["Disabled"] || vp["disabled"] || "false").toLowerCase();
                  return d === "true" || d === "disabled";
                });
                if (disabledMatching.length > 0 && targetMatching.length > 0) {
                  const disabledClasses = disabledMatching[0].classes.filter(
                    (c) => disabledMatching.every((vc) => vc.classes.includes(c)) && !targetMatching.every((vc) => vc.classes.includes(c)) && !common.includes(c)
                  );
                  for (const c of disabledClasses) {
                    if (c.startsWith("bg-") || c.startsWith("text-") || c.startsWith("border-")) {
                      const pref = `disabled:${c}`;
                      if (!diffClassesList.includes(pref)) {
                        diffClassesList.push(pref);
                      }
                    }
                  }
                }
              }
            }
            const diffClasses = diffClassesList.join(" ");
            diffs[opt] = diffClasses;
            if (diffClasses.length > 0) hasAnyDiff = true;
          }
          const trueOpt = vDef.options.find((o) => o.toLowerCase() === "true");
          const falseOpt = vDef.options.find((o) => o.toLowerCase() === "false");
          if (trueOpt && falseOpt) {
            const trueClasses = diffs[trueOpt] ? diffs[trueOpt].split(" ").filter(Boolean) : [];
            const falseClasses = diffs[falseOpt] ? diffs[falseOpt].split(" ").filter(Boolean) : [];
            const hasPaddingInTrue = trueClasses.some((c) => /^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c) && c !== "p-none");
            const hasPaddingInFalse = falseClasses.some((c) => /^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c));
            if (hasPaddingInTrue && !hasPaddingInFalse) {
              falseClasses.push("p-none");
            } else if (hasPaddingInFalse && !hasPaddingInTrue) {
              const matchingTrue = variantClassList.filter((vc) => {
                var _a2;
                const val = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2[vDef.propName]) || "").toLowerCase();
                return val === "true";
              });
              for (const vc of matchingTrue) {
                for (const c of vc.classes) {
                  if (/^(p-|px-|py-|pt-|pb-|pl-|pr-)/.test(c) && c !== "p-none" && !trueClasses.includes(c)) {
                    trueClasses.push(c);
                  }
                }
              }
            }
            const hasRadiusInTrue = trueClasses.some((c) => /^rounded-/.test(c) && c !== "rounded-none");
            const hasRadiusInFalse = falseClasses.some((c) => /^rounded-/.test(c));
            if (hasRadiusInTrue && !hasRadiusInFalse) {
              falseClasses.push("rounded-none");
            } else if (hasRadiusInFalse && !hasRadiusInTrue) {
              const matchingTrue = variantClassList.filter((vc) => {
                var _a2;
                const val = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2[vDef.propName]) || "").toLowerCase();
                return val === "true";
              });
              for (const vc of matchingTrue) {
                for (const c of vc.classes) {
                  if (/^rounded-/.test(c) && c !== "rounded-none" && !trueClasses.includes(c)) {
                    trueClasses.push(c);
                  }
                }
              }
            }
            const hasMaxHInTrue = trueClasses.some((c) => /^max-h-/.test(c) && c !== "max-h-none");
            const hasMaxHInFalse = falseClasses.some((c) => /^max-h-/.test(c));
            if (hasMaxHInTrue && !hasMaxHInFalse) {
              falseClasses.push("max-h-none");
            } else if (hasMaxHInFalse && !hasMaxHInTrue) {
              const matchingTrue = variantClassList.filter((vc) => {
                var _a2;
                const val = (((_a2 = vc.variant.variantProperties) == null ? void 0 : _a2[vDef.propName]) || "").toLowerCase();
                return val === "true";
              });
              for (const vc of matchingTrue) {
                for (const c of vc.classes) {
                  if (/^max-h-/.test(c) && c !== "max-h-none" && !trueClasses.includes(c)) {
                    trueClasses.push(c);
                  }
                }
              }
            }
            diffs[trueOpt] = trueClasses.join(" ");
            diffs[falseOpt] = falseClasses.join(" ");
            if (diffs[trueOpt] || diffs[falseOpt]) hasAnyDiff = true;
          }
          if (vDef.propName.toLowerCase() === "hover") {
            const activeOpt = vDef.options.find((o) => o.toLowerCase() === "true" || o.toLowerCase() === "hover") || vDef.options[1];
            const inactiveOpt = vDef.options.find((o) => o.toLowerCase() === "false" || o.toLowerCase() === "default") || vDef.options[0];
            if (activeOpt && inactiveOpt && diffs[activeOpt]) {
              const activeClasses = diffs[activeOpt].split(" ").filter(Boolean);
              const hoverPrefixed = activeClasses.map((c) => `hover:${c}`).join(" ");
              const restingPart = diffs[inactiveOpt] ? `${diffs[inactiveOpt]} ` : "";
              diffs[inactiveOpt] = `${restingPart}${hoverPrefixed}`.trim();
              hasAnyDiff = true;
            }
          }
          if (vDef.propName.toLowerCase() === "pressed") {
            const activeOpt = vDef.options.find((o) => o.toLowerCase() === "true" || o.toLowerCase() === "pressed") || vDef.options[1];
            const inactiveOpt = vDef.options.find((o) => o.toLowerCase() === "false" || o.toLowerCase() === "default") || vDef.options[0];
            if (activeOpt && inactiveOpt && diffs[activeOpt]) {
              const activeClasses = diffs[activeOpt].split(" ").filter(Boolean);
              const activePrefixed = activeClasses.map((c) => `active:${c}`).join(" ");
              const restingPart = diffs[inactiveOpt] ? `${diffs[inactiveOpt]} ` : "";
              diffs[inactiveOpt] = `${restingPart}${activePrefixed}`.trim();
              hasAnyDiff = true;
            } else if (activeOpt && inactiveOpt && !diffs[activeOpt]) {
              diffs[activeOpt] = "scale-95";
              diffs[inactiveOpt] = "active:scale-95";
              hasAnyDiff = true;
            }
          }
          if (hasAnyDiff) {
            variantDictCode += `const ${dictName}: Record<${typeName}, string> = {
` + vDef.options.map((opt) => `  ${opt}: '${diffs[opt] || ""}',`).join("\n") + "\n}\n\n";
            variantClassesLookup += ` \${${propNamePascal} ? (${dictName} as any)[${propNamePascal}] || '' : ''}`;
          }
          const defaultVal = vDef.defaultVal || vDef.options[0];
          variantDefaultDestructure += `  ${propNamePascal} = '${defaultVal}',
`;
        }
        const hasSchemeProp = variantPropsDefs.some((v) => v.propName.toLowerCase().includes("scheme"));
        if (!hasSchemeProp && defaultVariantClasses.length > 0) {
          for (const cls of defaultVariantClasses) {
            if ((cls.startsWith("bg-") || cls.startsWith("text-") || cls.startsWith("rounded-")) && !rootClassNames.includes(cls) && !variantDictCode.includes(`'${cls}'`) && !variantDictCode.includes(` ${cls}`) && !variantDictCode.includes(`${cls} `)) {
              rootClassNames.push(cls);
            }
          }
        }
        const sizeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "size");
        if (sizeDef && iconSizeBySize.size > 0) {
          const iconSizeTypeName = `${rootName}Size`;
          variantDictCode += `const iconSizeClasses: Record<${iconSizeTypeName}, string> = {
` + sizeDef.options.map((opt) => `  ${opt}: '${iconSizeBySize.get(opt) || "w-4 h-4"}',`).join("\n") + "\n}\n\n";
        }
      }
      const isSvgGraphic = !rootName.toLowerCase().includes("button") && /logo|logotype|icon|graphic|svg|mark|symbol|badge/i.test(rootName);
      let svgJsx = "";
      if (isSvgGraphic) {
        try {
          const sampleNode = node.type === "COMPONENT_SET" && node.children.length > 0 ? node.children[0] : node;
          const svgBytes = await sampleNode.exportAsync({ format: "SVG" });
          let rawSvg = "";
          for (let i = 0; i < svgBytes.length; i++) {
            rawSvg += String.fromCharCode(svgBytes[i]);
          }
          const viewBoxMatch = rawSvg.match(/viewBox="([^"]+)"/);
          const viewBoxAttr = viewBoxMatch ? `viewBox="${viewBoxMatch[1]}"` : 'viewBox="0 0 100 100"';
          const innerContent = rawSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
          let currentColorContent = innerContent.replace(
            /<path([^>]*?)(?:fill-opacity="0\.[0-9]+"|fillOpacity=\{0\.[0-9]+\})([^>]*?)\/?>/gi,
            (match, p1, p2) => {
              const combined = `${p1} ${p2}`.replace(/fill="[^"]*"/gi, "").replace(/fill-opacity="[^"]*"/gi, "").replace(/fillOpacity=\{[^}]*\}/gi, "").replace(/\s+/g, " ").trim();
              return `<path ${combined} fill="var(--color-elevation-higher)"/>`;
            }
          );
          currentColorContent = currentColorContent.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"').replace(/fill="black"/g, 'fill="currentColor"');
          const scaleDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "scale");
          const sizeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "size");
          const schemeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "schemes" || v.propName.toLowerCase() === "scheme");
          if (scaleDef && sizeDef) {
            const scaleTypeName = `${rootName}Scale`;
            const sizeTypeName = `${rootName}Size`;
            let matrixCode = `const sizeClasses: Record<${scaleTypeName}, Record<${sizeTypeName}, string>> = {
`;
            for (const sc of scaleDef.options) {
              matrixCode += `  ${sc}: {
`;
              for (const sz of sizeDef.options) {
                const matchedVariant = variants.find((v) => {
                  const vp = v.variantProperties;
                  if (!vp) return false;
                  const scVal = vp["Scale"] || vp["scale"];
                  const szVal = vp["Size"] || vp["size"];
                  return scVal && scVal.toLowerCase() === sc.toLowerCase() && szVal && szVal.toLowerCase() === sz.toLowerCase();
                });
                let hCls = "h-8";
                if (matchedVariant && typeof matchedVariant.height === "number" && matchedVariant.height > 0) {
                  hCls = formatDimClass(matchedVariant.height, "h");
                } else {
                  const szIdx = sizeDef.options.indexOf(sz);
                  const basePx = sc.toLowerCase() === "big" ? 32 : 16;
                  const stepPx = sc.toLowerCase() === "big" ? 16 : 8;
                  const totalH = basePx + (szIdx >= 0 ? szIdx : 0) * stepPx;
                  hCls = formatDimClass(totalH, "h");
                }
                matrixCode += `    ${sz}: '${hCls}',
`;
              }
              matrixCode += `  },
`;
            }
            matrixCode += `}

`;
            variantDictCode = matrixCode + variantDictCode.replace(/const sizeClasses[\s\S]*?\}\n\n/, "").replace(/const scaleClasses[\s\S]*?\}\n\n/, "");
          }
          const sizeLookup = scaleDef && sizeDef ? `\${Scale && Size ? (sizeClasses as any)[Scale]?.[Size] || '' : Size ? (sizeClasses as any).Small?.[Size] || '' : ''}` : sizeDef ? `\${Size ? (sizeClasses as any)[Size] || '' : ''}` : "";
          const schemeLookup = schemeDef ? `\${Schemes ? (schemeClasses as any)[Schemes] || '' : ''}` : "";
          svgJsx = `<svg
      role="img"
      aria-label={alt}
      ${viewBoxAttr}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={\`w-auto shrink-0 ${sizeLookup} ${schemeLookup} \${className}\`.trim()}
      {...props}
    >
      <title>{alt}</title>
      ${currentColorContent}
    </svg>`;
        } catch (err) {
          console.warn("[Export] SVG export failed:", err);
        }
      }
      const rootNodeToTraverse = node.type === "COMPONENT_SET" && defaultVariantNode ? defaultVariantNode : node;
      const usageJsx = await traverse(rootNodeToTraverse, "", true);
      const subList = Array.from(detectedSubcomponents.values());
      const subDefsCode = subList.map(
        (s) => `export const ${rootName}${s.subName}: FC<{ className?: string; children?: ReactNode }> = ({ className = '', children }) => (
  <${s.htmlTag} className={\`${s.classNames} \${className}\`.trim()}>
    {children}
  </${s.htmlTag}>
)`
      ).join("\n\n");
      const variantTypesCode = variantPropsDefs.length > 0 ? variantPropsDefs.map((v) => `export type ${rootName}${v.propName.charAt(0).toUpperCase() + v.propName.slice(1)} = ${v.options.map((o) => `'${o}'`).join(" | ")}`).join("\n") + "\n\n" : "";
      const variantPropsFields = [
        ...variantPropsDefs.map((v) => `  ${v.propName}?: ${rootName}${v.propName}`),
        ...booleanPropsDefs.map((b) => `  ${b.propName}?: boolean`),
        ...instanceSwapPropsDefs.map((i) => `  ${i.propName}?: React.ComponentType<{ className?: string }> | ReactNode`),
        ...textPropsDefs.map((t) => `  ${t.propName}?: string`)
      ].join("\n") + (variantPropsDefs.length || booleanPropsDefs.length || instanceSwapPropsDefs.length || textPropsDefs.length ? "\n" : "");
      let fullTsxModule = "";
      if (svgJsx) {
        const sizeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "size");
        const schemeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "schemes" || v.propName.toLowerCase() === "scheme");
        const sizeDictCode = sizeDef ? `const sizeClasses: Record<${rootName}Size, string> = {
` + sizeDef.options.map((opt) => {
          const kebab = opt.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          return `  ${opt}: 'h-${kebab}',`;
        }).join("\n") + "\n}\n\n" : "";
        const schemeDictCode = schemeDef ? `const schemeClasses: Record<${rootName}Schemes, string> = {
` + schemeDef.options.map((opt) => {
          const kebab = opt.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          return `  ${opt}: 'text-${kebab}',`;
        }).join("\n") + "\n}\n\n" : "";
        const defaultSize = sizeDef ? sizeDef.defaultVal || sizeDef.options[0] : "Base";
        const defaultScheme = schemeDef ? schemeDef.defaultVal || schemeDef.options[0] : "OnSurfaceDarkWhite";
        const defaultPropsDestructure = [
          sizeDef ? `  Size = '${defaultSize}',` : "",
          schemeDef ? `  Schemes = '${defaultScheme}',` : "",
          "  className = '',",
          `  alt = '${rootName}',`,
          "  ...props"
        ].filter(Boolean).join("\n");
        fullTsxModule = `import React, { FC, SVGProps } from 'react'

${variantTypesCode}${sizeDictCode}${schemeDictCode}export interface I${rootName}Props extends Omit<SVGProps<SVGSVGElement>, 'color' | 'size'> {
${variantPropsFields}  className?: string
  alt?: string
}

${internalJsDoc}export const ${rootName}: FC<I${rootName}Props> = ({
${defaultPropsDestructure}
}) => {
  return (
    ${svgJsx}
  )
}

export default ${rootName}

/*
 * ==========================================
 * Example Usage:
 * ==========================================
<${rootName}${sizeDef ? ` Size="${defaultSize}"` : ""}${schemeDef ? ` Schemes="${defaultScheme}"` : ""} />
 */
`;
      } else {
        const isButton = rootName.toLowerCase().includes("button");
        const hasHoverProp = variantPropsDefs.some((v) => v.propName.toLowerCase() === "hover");
        if (hasHoverProp || isButton) {
          rootClassNames.push(
            "transition-all",
            "duration-700",
            "ease-[cubic-bezier(0.25,1,0.5,1)]",
            "cursor-pointer",
            "disabled:cursor-not-allowed",
            "disabled:pointer-events-none"
          );
        }
        const detectedImportedSubcomponents = [];
        for (const [subKey, rec] of subcomponentUsageMap.entries()) {
          let conditionProp;
          let conditionVal;
          if (variants.length > 0 && rec.appearingVariants.length < variants.length) {
            for (const vDef of variantPropsDefs) {
              const propName = vDef.propName;
              const appearingVals = new Set(
                rec.appearingVariants.map((v) => {
                  var _a2, _b2;
                  return (((_a2 = v.variantProperties) == null ? void 0 : _a2[propName]) || ((_b2 = v.variantProperties) == null ? void 0 : _b2[propName.toLowerCase()]) || "").trim();
                })
              );
              if (appearingVals.size === 1) {
                const singleVal = Array.from(appearingVals)[0];
                const nonAppearingVariants = variants.filter((v) => !rec.appearingVariants.includes(v));
                const nonAppearingVals = new Set(
                  nonAppearingVariants.map((v) => {
                    var _a2, _b2;
                    return (((_a2 = v.variantProperties) == null ? void 0 : _a2[propName]) || ((_b2 = v.variantProperties) == null ? void 0 : _b2[propName.toLowerCase()]) || "").trim();
                  })
                );
                if (!nonAppearingVals.has(singleVal) && singleVal) {
                  conditionProp = propName;
                  conditionVal = singleVal;
                  break;
                }
              }
            }
          }
          const matchingProps = [];
          const parentPropNames = [
            ...variantPropsDefs.map((v) => v.propName),
            ...booleanPropsDefs.map((b) => b.propName),
            ...textPropsDefs.map((t) => t.propName)
          ];
          for (const pk of rec.propsKeys) {
            const matchedParentProp = parentPropNames.find((p) => p.toLowerCase() === pk.toLowerCase());
            if (matchedParentProp && !matchingProps.includes(matchedParentProp)) {
              matchingProps.push(matchedParentProp);
            }
          }
          detectedImportedSubcomponents.push({
            name: rec.name,
            rawName: rec.rawName,
            isPrivate: rec.isPrivate,
            isExternal: rec.isExternal,
            importPath: rec.importPath,
            conditionProp,
            conditionVal,
            matchingProps,
            fixedProps: rec.fixedProps,
            isAbsolute: rec.isAbsolute
          });
        }
        if (detectedImportedSubcomponents.some((s) => s.isAbsolute)) {
          if (!rootClassNames.includes("relative")) {
            rootClassNames.unshift("relative");
          }
        }
        const rootClassStr = rootClassNames.join(" ");
        const rootClassesCombined = `${rootClassStr}${variantClassesLookup}`.trim();
        const lucideImport = detectedLucideIcons.size > 0 ? `import { ${Array.from(detectedLucideIcons).sort().join(", ")} } from 'lucide-react'
` : "";
        const subcomponentImports = detectedImportedSubcomponents.length > 0 ? detectedImportedSubcomponents.map((s) => `import { ${s.name} } from '${s.importPath}'`).join("\n") + "\n" : "";
        const externalImports = detectedExternalComponents.size > 0 ? Array.from(detectedExternalComponents).filter((c) => c !== rootName && c !== "Surface" && !detectedLucideIcons.has(c) && !detectedImportedSubcomponents.some((s) => s.name === c)).map((c) => {
          const kebab = c.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          return `import { ${c} } from '../${kebab}'`;
        }).join("\n") + "\n" : "";
        const extendsInterface = isButton ? " extends React.ButtonHTMLAttributes<HTMLButtonElement>" : "";
        const extraPropsDestructure = [
          ...booleanPropsDefs.map((b) => `  ${b.propName} = ${b.defaultVal},`),
          ...instanceSwapPropsDefs.map((i) => `  ${i.propName},`),
          ...textPropsDefs.map((t) => `  ${t.propName} = '${t.defaultVal}',`)
        ].join("\n") + (booleanPropsDefs.length || instanceSwapPropsDefs.length || textPropsDefs.length ? "\n" : "");
        const hasText = textPropsDefs.some((t) => t.propName.toLowerCase() === "text");
        const showLeft = booleanPropsDefs.find((b) => b.propName.toLowerCase().includes("iconleft"));
        const showRight = booleanPropsDefs.find((b) => b.propName.toLowerCase().includes("iconright"));
        const leftIconProp = ((_a = instanceSwapPropsDefs.find((i) => i.propName.toLowerCase().includes("iconleft"))) == null ? void 0 : _a.propName) || "IconLeft";
        const rightIconProp = ((_b = instanceSwapPropsDefs.find((i) => i.propName.toLowerCase().includes("iconright"))) == null ? void 0 : _b.propName) || "IconRight";
        const defaultIcon = detectedLucideIcons.size > 0 ? Array.from(detectedLucideIcons)[0] : "";
        const sizeDef = variantPropsDefs.find((v) => v.propName.toLowerCase() === "size");
        const hasDynamicIconSizes = Boolean(sizeDef && iconSizeBySize.size > 0);
        const iconSizeClassProp = hasDynamicIconSizes ? "`${iconSizeClasses[Size] || 'w-4 h-4'} shrink-0`" : '"w-4 h-4 shrink-0"';
        const iconSizeJsxProp = hasDynamicIconSizes ? "{`${iconSizeClasses[Size] || 'w-4 h-4'} shrink-0`}" : '"w-4 h-4 shrink-0"';
        let innerJsx = "";
        for (const sub of detectedImportedSubcomponents) {
          const propAttrs = [];
          for (const p of sub.matchingProps) {
            propAttrs.push(`${p}={${p}}`);
          }
          for (const [k, v] of sub.fixedProps.entries()) {
            if (!sub.matchingProps.includes(k)) {
              propAttrs.push(`${k}="${v}"`);
            }
          }
          const propsAttr = propAttrs.length > 0 ? propAttrs.join(" ") : "";
          const clsAttr = sub.isAbsolute ? ' className="absolute -inset-[3px] pointer-events-none"' : "";
          const fullTag = `<${sub.name}${propsAttr ? " " + propsAttr : ""}${clsAttr} />`;
          if (sub.conditionProp && sub.conditionVal) {
            innerJsx += `
        {${sub.conditionProp} === '${sub.conditionVal}' && (
          ${fullTag}
        )}`;
          } else {
            innerJsx += `
        ${fullTag}`;
          }
        }
        const slotLeading = detectedSubcomponents.get("LeadingSlot") || detectedSubcomponents.get(`${rootName}LeadingSlot`);
        const slotContent = detectedSubcomponents.get("Content") || detectedSubcomponents.get(`${rootName}Content`);
        const slotTrailing = detectedSubcomponents.get("TrailingSlot") || detectedSubcomponents.get(`${rootName}TrailingSlot`);
        if (slotLeading || slotContent || slotTrailing) {
          const showLeading = (_c = booleanPropsDefs.find((b) => b.propName.toLowerCase().includes("leadingslot"))) == null ? void 0 : _c.propName;
          const showTrailing = (_d = booleanPropsDefs.find((b) => b.propName.toLowerCase().includes("trailingslot"))) == null ? void 0 : _d.propName;
          if (showLeading && slotLeading) {
            innerJsx += `
        {${showLeading} && <${slotLeading.fullTag} />}`;
          }
          if (slotContent) {
            const contentChild = hasText ? "<span>{children || Text || Placeholder}</span>" : "{children}";
            innerJsx += `
        <${slotContent.fullTag}>
          ${contentChild}
        </${slotContent.fullTag}>`;
          } else if (hasText) {
            innerJsx += `
        <span>{children || Text || Placeholder}</span>`;
          }
          if (showTrailing && slotTrailing) {
            innerJsx += `
        {${showTrailing} && <${slotTrailing.fullTag} />}`;
          }
          innerJsx += "\n      ";
        } else if (hasText || showLeft || showRight) {
          const leftSnippet = showLeft ? `
        {${showLeft.propName} && (${leftIconProp} ? (React.isValidElement(${leftIconProp}) ? ${leftIconProp} : React.createElement(${leftIconProp} as any, { className: ${iconSizeClassProp} })) : ${defaultIcon ? `<${defaultIcon} className=${iconSizeJsxProp} />` : "null"})}` : "";
          const textSnippet = hasText ? `
        <span>{children || Text}</span>` : `
        {children}`;
          const rightSnippet = showRight ? `
        {${showRight.propName} && (${rightIconProp} ? (React.isValidElement(${rightIconProp}) ? ${rightIconProp} : React.createElement(${rightIconProp} as any, { className: ${iconSizeClassProp} })) : ${defaultIcon ? `<${defaultIcon} className=${iconSizeJsxProp} />` : "null"})}` : "";
          innerJsx += `${leftSnippet}${textSnippet}${rightSnippet}
      `;
        } else {
          innerJsx += innerJsx ? "\n        {children}\n      " : "{children}";
        }
        const htmlTag = isButton ? "button" : "div";
        const hasDisabledProp = variantPropsDefs.some((v) => v.propName.toLowerCase() === "disabled");
        const extraHtmlProps = isButton ? `${hasDisabledProp ? " disabled={Disabled === 'True'}" : ""} type="button"` : "";
        fullTsxModule = `import React, { FC, ReactNode } from 'react'
${subcomponentImports}${lucideImport}${externalImports}
${variantTypesCode}${variantDictCode}export interface I${rootName}Props${extendsInterface} {
${variantPropsFields}  className?: string
  children?: ReactNode
}

${internalJsDoc}export const ${rootName}: FC<I${rootName}Props> = ({
${variantDefaultDestructure}${extraPropsDestructure}  className = '',
  children,
  ...props
}) => {
  return (
    <${htmlTag}${extraHtmlProps} className={\`${rootClassesCombined} \${className}\`.trim()} {...props}>
      ${innerJsx}
    </${htmlTag}>
  )
}

${subDefsCode}

export default ${rootName}

/*
 * ==========================================
 * Example Usage:
 * ==========================================
${usageJsx}
 */
`;
      }
      const compDesc = extractNodeDescription(node);
      return {
        code: fullTsxModule,
        name: rootName,
        rawName: rawNodeName,
        description: compDesc,
        isPrivate,
        preferredInstances: preferredInstancesMap,
        violations: tokenViolations
      };
    }
  };
  async function buildFigmaNode(def, parent, engine, subComponentMasters) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let node = null;
    if (def.type === "FRAME" || def.type === "COMPONENT") {
      const frame = figma.createFrame();
      frame.name = def.name || "frame";
      if (def.width && def.height) {
        frame.resize(def.width, def.height);
      }
      if (def.layoutMode && def.layoutMode !== "NONE") {
        frame.layoutMode = def.layoutMode;
        if (def.primaryAxisSizingMode) frame.primaryAxisSizingMode = def.primaryAxisSizingMode;
        if (def.counterAxisSizingMode) frame.counterAxisSizingMode = def.counterAxisSizingMode;
        if (def.primaryAxisAlignItems) frame.primaryAxisAlignItems = def.primaryAxisAlignItems;
        if (def.counterAxisAlignItems) frame.counterAxisAlignItems = def.counterAxisAlignItems;
        frame.itemSpacing = (_a = def.itemSpacing) != null ? _a : 0;
        frame.paddingTop = (_b = def.paddingTop) != null ? _b : 0;
        frame.paddingBottom = (_c = def.paddingBottom) != null ? _c : 0;
        frame.paddingLeft = (_d = def.paddingLeft) != null ? _d : 0;
        frame.paddingRight = (_e = def.paddingRight) != null ? _e : 0;
      }
      if (def.clipsContent !== void 0) {
        frame.clipsContent = def.clipsContent;
      }
      if (def.cornerRadius !== void 0) {
        frame.cornerRadius = def.cornerRadius;
        frame.cornerSmoothing = 0.6;
      }
      if (def.fills && def.fills.length > 0) {
        frame.fills = def.fills.map((f) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(f.color || f.hex),
            opacity: (_a2 = f.opacity) != null ? _a2 : 1
          };
        });
      } else {
        frame.fills = [];
      }
      if (def.strokes && def.strokes.length > 0) {
        frame.strokes = def.strokes.map((s) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(s.color || s.hex),
            opacity: (_a2 = s.opacity) != null ? _a2 : 1
          };
        });
        if (def.strokeWeight !== void 0) frame.strokeWeight = def.strokeWeight;
        if (def.strokeTopWeight !== void 0) frame.strokeTopWeight = def.strokeTopWeight;
        if (def.strokeBottomWeight !== void 0) frame.strokeBottomWeight = def.strokeBottomWeight;
        if (def.strokeLeftWeight !== void 0) frame.strokeLeftWeight = def.strokeLeftWeight;
        if (def.strokeRightWeight !== void 0) frame.strokeRightWeight = def.strokeRightWeight;
      }
      if (def.layoutGrow !== void 0) frame.layoutGrow = def.layoutGrow;
      if (def.layoutAlign !== void 0) frame.layoutAlign = def.layoutAlign;
      if (parent) {
        parent.appendChild(frame);
      }
      if (def.children && def.children.length > 0) {
        for (const childDef of def.children) {
          await buildFigmaNode(childDef, frame, engine, subComponentMasters);
        }
      }
      if (def.layoutMode && def.layoutMode !== "NONE") {
        if (def.primaryAxisSizingMode) frame.primaryAxisSizingMode = def.primaryAxisSizingMode;
        if (def.counterAxisSizingMode) frame.counterAxisSizingMode = def.counterAxisSizingMode;
      }
      if (engine) {
        await engine.bindNodeVariables(frame, def);
      }
      node = frame;
    } else if (def.type === "INSTANCE") {
      const targetName = def.componentName || def.name;
      let master = targetName && subComponentMasters ? subComponentMasters.get(targetName) : null;
      if (!master && targetName) {
        let found = figma.currentPage.findOne(
          (n) => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && (n.name.toLowerCase() === targetName.toLowerCase() || n.name.toLowerCase().startsWith(targetName.toLowerCase() + "/"))
        );
        if (!found) {
          for (const page of figma.root.children) {
            found = page.findOne(
              (n) => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && (n.name.toLowerCase() === targetName.toLowerCase() || n.name.toLowerCase().startsWith(targetName.toLowerCase() + "/"))
            );
            if (found) break;
          }
        }
        if (found) {
          if (found.type === "COMPONENT") {
            master = found;
          } else if (found.type === "COMPONENT_SET") {
            const compSet = found;
            if (def.variantProperties) {
              master = compSet.children.find((c) => {
                if (c.type !== "COMPONENT" || !c.variantProperties) return false;
                return Object.entries(def.variantProperties).every(([k, v]) => {
                  const actual = c.variantProperties[k] || c.variantProperties[k.toLowerCase()] || c.variantProperties[k.toUpperCase()];
                  return actual && actual.toLowerCase() === String(v).toLowerCase();
                });
              }) || compSet.defaultVariant || compSet.children[0];
            } else {
              master = compSet.defaultVariant || compSet.children[0];
            }
          }
        }
      }
      if (master) {
        const inst = master.createInstance();
        if (def.name) inst.name = def.name;
        if (def.variantProperties && "setProperties" in inst) {
          try {
            inst.setProperties(def.variantProperties);
          } catch (e) {
          }
        }
        if (parent) {
          parent.appendChild(inst);
        }
        if (engine) {
          await engine.bindNodeVariables(inst, def);
        }
        node = inst;
      } else if (def.svgContent) {
        try {
          const svgNode = figma.createNodeFromSvg(def.svgContent);
          svgNode.name = def.name || "icon";
          if (def.width && def.height) svgNode.resize(def.width, def.height);
          if (parent) parent.appendChild(svgNode);
          node = svgNode;
        } catch (e) {
        }
      }
    } else if (def.type === "TEXT") {
      const textNode = figma.createText();
      textNode.name = def.name || "label";
      let textStyleApplied = false;
      if (engine) {
        const candidates = [];
        if (def.textStyleName) candidates.push(def.textStyleName);
        if (def.fontSize) {
          const weight = (def.fontStyle || "Bold").toLowerCase().includes("bold") ? "bold" : "regular";
          if (def.fontSize >= 44) candidates.push(`heading/h1/${weight}`);
          else if (def.fontSize >= 36) candidates.push(`heading/h2/${weight}`);
          else if (def.fontSize >= 24) candidates.push(`heading/h4/${weight}`);
          else if (def.fontSize === 16) candidates.push(`default/body/large/${weight}`, `body/large/${weight}`);
          else if (def.fontSize === 14) candidates.push(`default/body/medium/${weight}`, `body/medium/${weight}`);
          else if (def.fontSize === 12) candidates.push(`default/label/large/${weight}`, `label/large/${weight}`);
          else if (def.fontSize === 11) candidates.push(`default/label/medium/${weight}`, `label/medium/${weight}`);
        }
        const matchedStyle = engine.findTextStyle(candidates, def.fontSize, def.fontStyle);
        if (matchedStyle) {
          try {
            if (matchedStyle.fontName) {
              await figma.loadFontAsync(matchedStyle.fontName);
            }
            await textNode.setTextStyleIdAsync(matchedStyle.id);
            textStyleApplied = true;
            console.log(`[Bridge] Bound text style "${matchedStyle.name}" to node "${textNode.name}"`);
          } catch (err) {
            console.warn(`[Bridge] Failed to set text style on "${textNode.name}":`, err);
          }
        }
      }
      if (!textStyleApplied) {
        const stylePrefix = ((_f = def.textStyleName) == null ? void 0 : _f.replace(/^default\//, "")) || "";
        const isHeading = stylePrefix.startsWith("heading") || stylePrefix.startsWith("display") || def.fontSize !== void 0 && def.fontSize >= 24;
        const category = isHeading ? "heading" : "body";
        const resolvedFamily = engine ? engine.resolveFontFamily(category, def.fontFamily) : def.fontFamily || "Inter";
        const targetWeight = def.fontStyle || (((_g = def.textStyleName) == null ? void 0 : _g.includes("bold")) ? "Bold" : ((_h = def.textStyleName) == null ? void 0 : _h.includes("medium")) ? "Medium" : "Regular");
        const font = await ensureFontLoaded(resolvedFamily, targetWeight);
        textNode.fontName = font;
        if (def.fontSize) textNode.fontSize = def.fontSize;
        if (def.letterSpacing !== void 0) {
          textNode.letterSpacing = { value: def.letterSpacing, unit: "PERCENT" };
        }
        if (def.textCase) textNode.textCase = def.textCase;
      }
      textNode.characters = def.characters || "";
      if (def.fills && def.fills.length > 0) {
        textNode.fills = def.fills.map((f) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(f.color || f.hex),
            opacity: (_a2 = f.opacity) != null ? _a2 : 1
          };
        });
      }
      if (parent) {
        parent.appendChild(textNode);
      }
      if (engine) {
        await engine.bindNodeVariables(textNode, def);
      }
      node = textNode;
    } else if (def.type === "ELLIPSE") {
      const ellipse = figma.createEllipse();
      ellipse.name = def.name || "dot";
      ellipse.resize(def.width || 6, def.height || 6);
      if (def.fills && def.fills.length > 0) {
        ellipse.fills = def.fills.map((f) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(f.color || f.hex),
            opacity: (_a2 = f.opacity) != null ? _a2 : 1
          };
        });
      }
      if (parent) {
        parent.appendChild(ellipse);
      }
      if (engine) {
        await engine.bindNodeVariables(ellipse, def);
      }
      node = ellipse;
    } else if (def.type === "RECTANGLE") {
      const rect = figma.createRectangle();
      rect.name = def.name || "rect";
      rect.resize(def.width || 10, def.height || 10);
      if (def.cornerRadius) rect.cornerRadius = def.cornerRadius;
      if (def.fills && def.fills.length > 0) {
        rect.fills = def.fills.map((f) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(f.color || f.hex),
            opacity: (_a2 = f.opacity) != null ? _a2 : 1
          };
        });
      }
      if (parent) {
        parent.appendChild(rect);
      }
      if (engine) {
        await engine.bindNodeVariables(rect, def);
      }
      node = rect;
    } else if (def.type === "SVG" && def.svgContent) {
      try {
        let svgStr = def.svgContent;
        if (def.width && def.height) {
          svgStr = svgStr.replace(/<svg\s+([^>]*)/i, (_match, attrs) => {
            let updated = attrs.replace(/\bwidth="[^"]*"/i, `width="${def.width}"`).replace(/\bheight="[^"]*"/i, `height="${def.height}"`);
            if (!/\bwidth="/i.test(updated)) updated += ` width="${def.width}"`;
            if (!/\bheight="/i.test(updated)) updated += ` height="${def.height}"`;
            return `<svg ${updated}`;
          });
        }
        const svgNode = figma.createNodeFromSvg(svgStr);
        svgNode.name = def.name || "icon";
        if (def.height && svgNode.height > 0) {
          const scale = def.height / svgNode.height;
          if (Math.abs(scale - 1) > 5e-3 && typeof svgNode.rescale === "function") {
            svgNode.rescale(scale);
          }
        }
        if (def.width && def.height) {
          svgNode.resize(def.width, def.height);
        }
        svgNode.layoutGrow = 0;
        if (parent) {
          parent.appendChild(svgNode);
        }
        node = svgNode;
      } catch (e) {
        console.warn("SVG parse error in buildFigmaNode:", e);
      }
    }
    return node;
  }

  // ../../../../plugins/components-setup/src/export/exporter.ts
  function findTopmostComponentOrSet(node) {
    if (!node) return null;
    let curr = node;
    let top = node;
    while (curr && curr.type !== "PAGE") {
      if (curr.type === "COMPONENT_SET") {
        return curr;
      }
      if (curr.type === "COMPONENT") {
        top = curr;
        if (curr.parent && curr.parent.type === "COMPONENT_SET") {
          return curr.parent;
        }
      }
      curr = curr.parent;
    }
    return top;
  }
  function getExportableRoots(nodes) {
    const roots = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const node of nodes) {
      const root = findTopmostComponentOrSet(node);
      if (root && !seenIds.has(root.id)) {
        seenIds.add(root.id);
        roots.push(root);
      }
    }
    return roots;
  }
  function isNodeOnCurrentPage(node) {
    if (!node) return false;
    try {
      let curr = node;
      while (curr) {
        if (curr === figma.currentPage) return true;
        curr = curr.parent;
      }
    } catch (e) {
    }
    return false;
  }
  function findExportableComponentsAndSets(nodes) {
    const result = [];
    const seenIds = /* @__PURE__ */ new Set();
    function processNode(node) {
      if (!node || seenIds.has(node.id)) return;
      if (node.type === "COMPONENT_SET") {
        if (isNodeOnCurrentPage(node)) {
          seenIds.add(node.id);
          result.push(node);
        }
        return;
      }
      if (node.type === "COMPONENT") {
        if (node.parent && node.parent.type === "COMPONENT_SET") {
          const parentSet = node.parent;
          if (!seenIds.has(parentSet.id) && isNodeOnCurrentPage(parentSet)) {
            seenIds.add(parentSet.id);
            result.push(parentSet);
          }
        } else {
          if (isNodeOnCurrentPage(node)) {
            seenIds.add(node.id);
            result.push(node);
          }
        }
        return;
      }
      if (node.type === "INSTANCE") {
        return;
      }
      if ("children" in node) {
        for (const child of node.children) {
          processNode(child);
        }
      }
    }
    const targetNodes = nodes && nodes.length > 0 ? nodes : figma.currentPage.children;
    for (const n of targetNodes) {
      processNode(n);
    }
    return result;
  }
  async function exportNodesToCode(roots) {
    var _a, _b;
    if (!roots || roots.length === 0) {
      figma.notify("Please select a component or frame to export code.", { error: true });
      return;
    }
    const engine = new VariableEngine();
    await engine.init();
    const exportedResults = [];
    for (let i = 0; i < roots.length; i++) {
      const selNode = roots[i];
      const rawNodeName = selNode.name.trim();
      const parentNodeName = selNode.parent && selNode.parent.type === "COMPONENT_SET" ? selNode.parent.name.trim() : "";
      const isPrivate = rawNodeName.startsWith("_") || rawNodeName.startsWith(".") || parentNodeName.startsWith("_") || parentNodeName.startsWith(".");
      const result = await engine.exportNodeToCode(selNode);
      const componentDescription = result.description || extractNodeDescription(selNode);
      figma.ui.postMessage({
        type: "code-exported",
        code: result.code,
        nodeName: result.name,
        rawName: result.rawName || rawNodeName,
        description: componentDescription,
        isPrivate: (_a = result.isPrivate) != null ? _a : isPrivate,
        preferredInstances: result.preferredInstances || {},
        violations: result.violations || [],
        itemIndex: i,
        totalItems: roots.length
      });
      exportedResults.push({
        name: result.name,
        isPrivate: (_b = result.isPrivate) != null ? _b : isPrivate,
        violationsCount: (result.violations || []).length
      });
    }
    if (roots.length === 1) {
      const res = exportedResults[0];
      if (res.isPrivate) {
        figma.notify(`Exported private component "${res.name}" (code documentation only) \u{1F512}`);
      } else if (res.violationsCount > 0) {
        figma.notify(`\u26A0\uFE0F Exported "${res.name}" with ${res.violationsCount} token warning(s)!`, { timeout: 5e3 });
      } else {
        figma.notify(`Exported 100% token-compliant code for "${res.name}"! \u{1F4BB}`);
      }
    } else {
      const names = exportedResults.map((r) => r.name).join(", ");
      figma.notify(`Exported ${roots.length} components (${names})! \u{1F680}`);
    }
  }
  function getSelectionData() {
    return (async () => {
      var _a;
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        return {
          hasSelection: false,
          count: 0,
          type: "NONE",
          typeName: "No selection",
          nodeId: null,
          name: "",
          description: "",
          documentationLink: null,
          parentComponentSetName: null,
          variantProperties: null,
          variants: [],
          canApplyMetrics: false
        };
      }
      const firstNode = selection[0];
      const count = selection.length;
      const canApplyMetrics = selection.some(
        (n) => n.type === "COMPONENT_SET" || n.type === "FRAME" || n.type === "SECTION" || n.type === "COMPONENT"
      );
      async function findEnclosingComponent(node) {
        let curr = node;
        let comp = null;
        let compSet = null;
        let instance = null;
        while (curr) {
          if (curr.type === "COMPONENT_SET") {
            compSet = curr;
            break;
          }
          if (curr.type === "COMPONENT" && !comp) {
            comp = curr;
            if (comp.parent && comp.parent.type === "COMPONENT_SET") {
              compSet = comp.parent;
              break;
            }
          }
          if (curr.type === "INSTANCE" && !instance) {
            instance = curr;
            try {
              if ("getMainComponentAsync" in instance && typeof instance.getMainComponentAsync === "function") {
                comp = await instance.getMainComponentAsync();
              } else {
                comp = instance.mainComponent;
              }
            } catch (e) {
              try {
                comp = instance.mainComponent;
              } catch (err) {
                comp = null;
              }
            }
            if (comp && comp.parent && comp.parent.type === "COMPONENT_SET") {
              compSet = comp.parent;
              break;
            }
          }
          curr = curr.parent;
        }
        return { comp, compSet, instance };
      }
      if (count === 1 && firstNode.type === "COMPONENT_SET") {
        const compSet = firstNode;
        const variants = compSet.children.filter((c) => c.type === "COMPONENT").map((c) => ({
          id: c.id,
          name: c.name,
          variantProperties: c.variantProperties || null,
          description: c.description || ""
        }));
        const docLink = compSet.documentationLinks && compSet.documentationLinks.length > 0 ? compSet.documentationLinks[0].uri : null;
        return {
          hasSelection: true,
          count: 1,
          type: "COMPONENT_SET",
          typeName: "Component Set",
          nodeId: compSet.id,
          name: compSet.name,
          description: compSet.description || "",
          documentationLink: docLink,
          parentComponentSetName: null,
          variantProperties: null,
          variants,
          canApplyMetrics: true
        };
      }
      if (count === 1) {
        const { comp, compSet } = await findEnclosingComponent(firstNode);
        if (comp) {
          const isVariant = !!compSet;
          const docLink = comp.documentationLinks && comp.documentationLinks.length > 0 ? comp.documentationLinks[0].uri : compSet && compSet.documentationLinks && compSet.documentationLinks.length > 0 ? compSet.documentationLinks[0].uri : null;
          return {
            hasSelection: true,
            count: 1,
            type: isVariant ? "VARIANT" : "COMPONENT",
            typeName: isVariant ? "Component Variant" : "Component",
            nodeId: comp.id,
            name: comp.name,
            description: comp.description || (compSet ? compSet.description : "") || "",
            documentationLink: docLink,
            parentComponentSetName: compSet ? compSet.name : null,
            variantProperties: comp.variantProperties || null,
            variants: isVariant ? [{
              id: comp.id,
              name: comp.name,
              parentComponentSetName: compSet ? compSet.name : null,
              variantProperties: comp.variantProperties || null,
              description: comp.description || ""
            }] : [],
            canApplyMetrics: true
          };
        }
        if (compSet) {
          const variants = compSet.children.filter((c) => c.type === "COMPONENT").map((c) => ({
            id: c.id,
            name: c.name,
            parentComponentSetName: compSet.name,
            variantProperties: c.variantProperties || null,
            description: c.description || ""
          }));
          const docLink = compSet.documentationLinks && compSet.documentationLinks.length > 0 ? compSet.documentationLinks[0].uri : null;
          return {
            hasSelection: true,
            count: 1,
            type: "COMPONENT_SET",
            typeName: "Component Set",
            nodeId: compSet.id,
            name: compSet.name,
            description: compSet.description || "",
            documentationLink: docLink,
            parentComponentSetName: null,
            variantProperties: null,
            variants,
            canApplyMetrics: true
          };
        }
      }
      const exportableRoots = getExportableRoots(selection);
      if (exportableRoots.length > 1) {
        const allCompSets = exportableRoots.every((r) => r.type === "COMPONENT_SET");
        const allComps = exportableRoots.every((r) => r.type === "COMPONENT");
        const typeLabel = allCompSets ? `${exportableRoots.length} Component Sets Selected` : allComps ? `${exportableRoots.length} Components Selected` : `${exportableRoots.length} Components/Sets Selected`;
        return {
          hasSelection: true,
          count: exportableRoots.length,
          type: "MULTIPLE_COMPONENTS",
          typeName: typeLabel,
          nodeId: exportableRoots.map((r) => r.id).join(","),
          name: exportableRoots.map((r) => r.name).join(", "),
          description: "",
          documentationLink: null,
          parentComponentSetName: null,
          variantProperties: null,
          variants: [],
          canApplyMetrics: true
        };
      }
      const allComponents = selection.filter((n) => n.type === "COMPONENT");
      if (allComponents.length > 1) {
        const variants = allComponents.map((c) => {
          var _a2;
          const pSet = ((_a2 = c.parent) == null ? void 0 : _a2.type) === "COMPONENT_SET" ? c.parent : null;
          return {
            id: c.id,
            name: c.name,
            parentComponentSetName: pSet ? pSet.name : null,
            variantProperties: c.variantProperties || null,
            description: c.description || ""
          };
        });
        const parentSet = ((_a = allComponents[0].parent) == null ? void 0 : _a.type) === "COMPONENT_SET" ? allComponents[0].parent : null;
        const docLink = parentSet && parentSet.documentationLinks && parentSet.documentationLinks.length > 0 ? parentSet.documentationLinks[0].uri : null;
        return {
          hasSelection: true,
          count,
          type: "MULTIPLE_VARIANTS",
          typeName: `${allComponents.length} Variants Selected`,
          nodeId: parentSet ? parentSet.id : firstNode.id,
          name: parentSet ? parentSet.name : firstNode.name,
          description: parentSet ? parentSet.description : "",
          documentationLink: docLink,
          parentComponentSetName: parentSet ? parentSet.name : null,
          variantProperties: null,
          variants,
          canApplyMetrics: true
        };
      }
      if (firstNode.type === "FRAME" || firstNode.type === "SECTION") {
        return {
          hasSelection: true,
          count,
          type: "FRAME",
          typeName: count > 1 ? `${count} Frames` : `${firstNode.type.toLowerCase()}: ${firstNode.name}`,
          nodeId: firstNode.id,
          name: firstNode.name,
          description: "",
          documentationLink: null,
          parentComponentSetName: null,
          variantProperties: null,
          variants: [],
          canApplyMetrics: true
        };
      }
      return {
        hasSelection: true,
        count,
        type: "OTHER",
        typeName: `${count} Layers selected`,
        nodeId: firstNode.id,
        name: firstNode.name,
        description: "",
        documentationLink: null,
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics
      };
    })();
  }

  // ../../../../plugins/components-setup/src/utils/strings.ts
  function toPascalCase(str) {
    if (!str) return str;
    const trimmed = str.trim();
    if (!trimmed) return trimmed;
    if (trimmed.includes("/")) {
      return trimmed.split("/").map((segment) => {
        const segTrim = segment.trim();
        return segTrim ? toPascalCase(segTrim) : segment;
      }).join("/");
    }
    const withoutId = trimmed.split("#")[0].trim();
    if (!withoutId) return trimmed;
    const protectedStr = withoutId.replace(/\b([iI][oO][sS])\b/g, " ___IOS___ ").replace(/(^|[^a-zA-Z])([iI][oO][sS])(?=[A-Z0-9])/g, "$1 ___IOS___ ").replace(/([a-z0-9])([iI][oO][sS])(?=[^a-zA-Z]|$)/g, "$1 ___IOS___ ").replace(/([a-z0-9])([iI][oO][sS])(?=[A-Z0-9])/g, "$1 ___IOS___ ");
    const withSpaces = protectedStr.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-–—_.\s,:]+/g, " ").replace(/[^a-zA-Z0-9\u00C0-\u024F\s_]+/g, " ").trim();
    const words = withSpaces.split(/\s+/).filter(Boolean);
    if (words.length === 0) return withoutId;
    const result = words.map((word) => {
      if (word === "___IOS___" || word.toLowerCase() === "ios") {
        return "iOS";
      }
      if (word === word.toUpperCase() && word.length > 1) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join("");
    return result.replace(/(^|[^a-zA-Z]|(?<=[a-z0-9]))(Ios|IOS|ios)(?=[^a-zA-Z]|[A-Z0-9]|$)/g, "$1iOS");
  }
  function sanitizePascalCase(str) {
    if (!str) return "Wrapper";
    let cleaned = str.trim().replace(/[_\-\/\s]+/g, " ").replace(/[^a-zA-Z0-9\s]/g, "");
    if (!cleaned) return "Wrapper";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
    return pascal || "Wrapper";
  }
  var TITLE_CASE_STOP_WORDS = /* @__PURE__ */ new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "to",
    "from",
    "by",
    "in",
    "of",
    "w",
    "z",
    "i",
    "o",
    "na",
    "do",
    "od",
    "po",
    "za",
    "ze",
    "we",
    "dla",
    "pod",
    "nad",
    "ku"
  ]);
  function extractWordsForCasing(text) {
    if (!text) return [];
    const splitBoundaries = text.replace(/([a-z\p{Ll}])([A-Z\p{Lu}])/gu, "$1 $2").replace(/([A-Z\p{Lu}]+)([A-Z\p{Lu}][a-z\p{Ll}])/gu, "$1 $2");
    const words = splitBoundaries.match(/[\p{L}\p{N}]+/gu);
    return words ? Array.from(words) : [];
  }
  function convertStringToCase(text, caseType) {
    if (!text) return text;
    switch (caseType) {
      case "sentence": {
        const lower = text.toLowerCase();
        return lower.replace(/(^|[.!?\n]\s*[\s"'\(\[\{„”«»]*)([\p{L}])/gu, (_, prefix, char) => prefix + char.toUpperCase());
      }
      case "title": {
        const wordRegex = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
        const matches = [];
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
          const prevSlice = text.slice(0, offset).replace(/\s+$/, "");
          const isAfterSentence = prevSlice.length > 0 && /[.!?:\n]$/.test(prevSlice);
          if (!isFirst && !isLast && !isAfterSentence && TITLE_CASE_STOP_WORDS.has(lower)) {
            return lower;
          }
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        });
      }
      case "upper":
        return text.toUpperCase();
      case "lower":
        return text.toLowerCase();
      case "camel": {
        const words = extractWordsForCasing(text);
        if (words.length === 0) return text;
        return words.map((w, i) => {
          const lower = w.toLowerCase();
          if (i === 0) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        }).join("");
      }
      case "pascal": {
        const words = extractWordsForCasing(text);
        if (words.length === 0) return text;
        return words.map((w) => {
          const lower = w.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        }).join("");
      }
      case "kebab": {
        const words = extractWordsForCasing(text);
        if (words.length === 0) return text;
        return words.map((w) => w.toLowerCase()).join("-");
      }
      default:
        return text;
    }
  }
  function isGenericLayerName(name) {
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

  // ../../../../plugins/components-setup/src/utils/geometry.ts
  function isNodeEffectivelyVisible(node) {
    let curr = node;
    while (curr && curr.type !== "PAGE") {
      if ("visible" in curr && curr.visible === false) {
        return false;
      }
      curr = curr.parent;
    }
    return true;
  }
  function getSafeNodeChildren(node) {
    if (!node) return [];
    try {
      if ("children" in node && node.children) {
        if (Array.isArray(node.children)) {
          return node.children;
        }
        if (typeof node.children.length === "number") {
          return Array.from(node.children);
        }
        if (typeof node.children[Symbol.iterator] === "function") {
          return Array.from(node.children);
        }
      }
    } catch (e) {
    }
    try {
      if (typeof node.findChildren === "function") {
        const found = node.findChildren(() => true);
        if (found && found.length > 0) return found;
      }
    } catch (e) {
    }
    return [];
  }
  function getStructuralSignature(frame) {
    if (frame.type !== "FRAME" || frame.type === "INSTANCE") return null;
    if (!("children" in frame) || !Array.isArray(frame.children) || frame.children.length === 0) return null;
    const textNodes = frame.findAll ? frame.findAll((n) => n.type === "TEXT") : [];
    if (textNodes.length === 0) return null;
    const directSig = frame.children.map((c) => `${c.type}:${c.name}`).join("|");
    const textSig = textNodes.map((t) => t.name).join("|");
    return `${frame.layoutMode || "NONE"}[${directSig}]<${textSig}>`;
  }
  function getInstanceBaseName(inst) {
    if (inst.mainComponent) {
      if (inst.mainComponent.parent && inst.mainComponent.parent.type === "COMPONENT_SET") {
        return inst.mainComponent.parent.name.trim();
      }
      const compName = (inst.mainComponent.name || "").trim();
      if (compName.includes("/")) {
        return compName.split("/")[0].trim();
      }
      if (compName.includes(",")) {
        return compName.split(",")[0].trim();
      }
      if (compName) return compName;
    }
    const nodeName = (inst.name || "").trim();
    if (nodeName.includes("/")) {
      return nodeName.split("/")[0].trim();
    }
    if (nodeName.includes(",")) {
      return nodeName.split(",")[0].trim();
    }
    return nodeName;
  }
  function checkChildrenHomogeneity(children) {
    var _a, _b, _c;
    if (!children || children.length < 2) {
      return { isHomogeneous: false, itemKind: "none", baseName: "" };
    }
    if (children.every((c) => c.type === "TEXT")) {
      return { isHomogeneous: true, itemKind: "text", baseName: "Text" };
    }
    if (children.every((c) => c.type === "INSTANCE")) {
      const baseNames = children.map((c) => getInstanceBaseName(c));
      const firstBase = baseNames[0] || "";
      const firstLower = firstBase.toLowerCase();
      const allSameBase = baseNames.every((b) => b.toLowerCase() === firstLower);
      const firstInst = children[0];
      const firstMainId = (_a = firstInst.mainComponent) == null ? void 0 : _a.id;
      const firstSetId = (_c = (_b = firstInst.mainComponent) == null ? void 0 : _b.parent) == null ? void 0 : _c.id;
      const allSameMain = firstMainId && children.every((c) => {
        var _a2;
        return ((_a2 = c.mainComponent) == null ? void 0 : _a2.id) === firstMainId;
      });
      const allSameSet = firstSetId && children.every((c) => {
        var _a2, _b2;
        return ((_b2 = (_a2 = c.mainComponent) == null ? void 0 : _a2.parent) == null ? void 0 : _b2.id) === firstSetId;
      });
      if (allSameBase || allSameMain || allSameSet) {
        let itemKind = "item";
        if (/card/i.test(firstLower)) itemKind = "card";
        else if (/button|btn|cta/i.test(firstLower)) itemKind = "button";
        else if (/badge|tag|chip/i.test(firstLower)) itemKind = "badge";
        else if (/input|field|select|textarea/i.test(firstLower)) itemKind = "input";
        else if (/tab/i.test(firstLower)) itemKind = "tab";
        return { isHomogeneous: true, itemKind, baseName: firstBase };
      }
    }
    if (children.every((c) => c.type === "FRAME")) {
      const firstFrameName = children[0].name.trim().toLowerCase();
      const allSameFrameName = children.every((c) => c.name.trim().toLowerCase() === firstFrameName);
      if (allSameFrameName && !isGenericLayerName(firstFrameName)) {
        let itemKind = "item";
        if (/card/i.test(firstFrameName)) itemKind = "card";
        return { isHomogeneous: true, itemKind, baseName: children[0].name.trim() };
      }
    }
    return { isHomogeneous: false, itemKind: "none", baseName: "" };
  }
  function hasContentAncestorNode(node) {
    let curr = node.parent;
    while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
      if (curr.type === "COMPONENT" || curr.type === "COMPONENT_SET") break;
      const pName = (curr.name || "").trim().toLowerCase();
      if (pName === "content") return true;
      curr = curr.parent;
    }
    return false;
  }

  // ../../../../plugins/components-setup/src/retextifier/retextifier.ts
  function buildRetextifierLayerPath(node, rootNode) {
    try {
      const parts = [];
      let curr = node;
      while (curr && curr.type !== "PAGE") {
        if ("name" in curr && typeof curr.name === "string") {
          parts.unshift(curr.name);
        }
        if (curr === rootNode) break;
        curr = curr.parent;
      }
      return parts.length > 0 ? parts.join(" > ") : ("name" in node ? node.name : "") || "Text";
    } catch (e) {
      return ("name" in node ? node.name : "") || "Text";
    }
  }
  function getChildrenInLayersPanelOrder(parent) {
    const children = getSafeNodeChildren(parent);
    if (children.length <= 1) return children;
    const layoutMode = "layoutMode" in parent ? parent.layoutMode : "NONE";
    const isAutoLayout = layoutMode === "HORIZONTAL" || layoutMode === "VERTICAL";
    if (isAutoLayout) {
      return children;
    }
    return [...children].reverse();
  }
  function getAncestryChainToPage(node) {
    const chain = [];
    let curr = node;
    while (curr && curr.type !== "DOCUMENT") {
      chain.unshift(curr);
      if (curr.type === "PAGE") break;
      curr = curr.parent;
    }
    return chain;
  }
  function compareNodesInLayersPanelOrder(a, b) {
    if (a.id === b.id) return 0;
    const chainA = getAncestryChainToPage(a);
    const chainB = getAncestryChainToPage(b);
    const minLen = Math.min(chainA.length, chainB.length);
    let lcaIndex = -1;
    for (let i = 0; i < minLen; i++) {
      if (chainA[i].id === chainB[i].id) {
        lcaIndex = i;
      } else {
        break;
      }
    }
    if (lcaIndex === -1) return 0;
    if (lcaIndex === chainA.length - 1) return -1;
    if (lcaIndex === chainB.length - 1) return 1;
    const lca = chainA[lcaIndex];
    const childA = chainA[lcaIndex + 1];
    const childB = chainB[lcaIndex + 1];
    const orderedChildren = getChildrenInLayersPanelOrder(lca);
    const idxA = orderedChildren.findIndex((c) => c.id === childA.id);
    const idxB = orderedChildren.findIndex((c) => c.id === childB.id);
    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    return 0;
  }
  function scanDeepTextLayers() {
    const selection = [...figma.currentPage.selection].sort(compareNodesInLayersPanelOrder);
    const result = [];
    const visited = /* @__PURE__ */ new Set();
    function registerTextNode(textNode, rootNode, pathPrefix) {
      if (!textNode || !textNode.id || visited.has(textNode.id)) return;
      if (!isNodeEffectivelyVisible(textNode)) return;
      visited.add(textNode.id);
      const layerPath = pathPrefix ? `${pathPrefix} > ${textNode.name || "Text"}` : buildRetextifierLayerPath(textNode, rootNode);
      const parentName = textNode.parent && "name" in textNode.parent ? String(textNode.parent.name) : "";
      const currentText = typeof textNode.characters === "string" ? textNode.characters : "";
      result.push({
        id: textNode.id,
        name: textNode.name || "Text",
        currentText,
        parentName,
        layerPath
      });
    }
    function traverseNode(node, rootNode, pathPrefix) {
      if (!node) return;
      if ("visible" in node && node.visible === false) return;
      if (node.type === "TEXT") {
        registerTextNode(node, rootNode, pathPrefix);
        return;
      }
      const currentPath = pathPrefix ? `${pathPrefix} > ${node.name}` : node.name;
      const orderedChildren = getChildrenInLayersPanelOrder(node);
      if (orderedChildren.length > 0) {
        for (const child of orderedChildren) {
          try {
            traverseNode(child, rootNode, currentPath);
          } catch (err) {
            console.warn("[Retextifier] Error traversing child node:", err);
          }
        }
        return;
      }
      if ("findAllWithCriteria" in node && typeof node.findAllWithCriteria === "function") {
        try {
          const found = node.findAllWithCriteria({ types: ["TEXT"] }).sort(
            compareNodesInLayersPanelOrder
          );
          for (const tn of found) {
            registerTextNode(tn, rootNode);
          }
        } catch (e) {
        }
      }
    }
    for (const rootNode of selection) {
      try {
        if ("visible" in rootNode && rootNode.visible === false) {
          continue;
        }
        if (rootNode.type === "TEXT") {
          registerTextNode(rootNode, rootNode);
          continue;
        }
        traverseNode(rootNode, rootNode, "");
        if ("findAllWithCriteria" in rootNode && typeof rootNode.findAllWithCriteria === "function") {
          try {
            const textNodes = rootNode.findAllWithCriteria({ types: ["TEXT"] }).sort(
              compareNodesInLayersPanelOrder
            );
            for (const tn of textNodes) {
              registerTextNode(tn, rootNode);
            }
          } catch (e) {
          }
        }
      } catch (err) {
        console.warn("[Retextifier] Error scanning selection node:", err);
      }
    }
    return result;
  }
  async function sendSelectionToUI() {
    const selectionData = await getSelectionData();
    const textLayers = scanDeepTextLayers();
    figma.ui.postMessage({
      type: "selection-change",
      selection: selectionData,
      textLayers
    });
  }
  async function sendInitialData() {
    const provider = await figma.clientStorage.getAsync("ai_provider") || "groq";
    const groqApiKey = await figma.clientStorage.getAsync("groq_api_key") || "";
    let groqModel = await figma.clientStorage.getAsync("groq_model") || "";
    if (!groqModel || groqModel.includes("llama-3.3-70b-versatile")) {
      groqModel = "openai/gpt-oss-120b";
      await figma.clientStorage.setAsync("groq_model", groqModel);
    }
    const apiKey = await figma.clientStorage.getAsync("gemini_api_key") || "";
    let selectedModel = await figma.clientStorage.getAsync("gemini_selected_model") || "";
    if (!selectedModel || selectedModel.includes("2.0") || selectedModel.includes("2.5") || selectedModel.includes("tts") || selectedModel.includes("exp") || selectedModel.includes("8b") || selectedModel.includes("high") || selectedModel.includes("preview")) {
      selectedModel = "models/gemini-3.5-flash-lite";
      await figma.clientStorage.setAsync("gemini_selected_model", selectedModel);
    }
    const promptTone = await figma.clientStorage.getAsync("gemini_prompt_tone") || "balanced";
    figma.ui.postMessage({
      type: "init-data",
      provider,
      groqApiKey,
      groqModel,
      apiKey,
      selectedModel,
      promptTone,
      selection: await getSelectionData(),
      textLayers: scanDeepTextLayers()
    });
  }

  // ../../../../plugins/components-setup/src/variables/variables.ts
  async function getAllRelevantVariablesForComponentSet() {
    const allVariables = [];
    try {
      const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
      const colMap = /* @__PURE__ */ new Map();
      for (const c of localCollections) {
        if (!c.name.trim().startsWith("_")) {
          colMap.set(c.id, c.name);
        }
      }
      const localVars = await figma.variables.getLocalVariablesAsync();
      for (const v of localVars) {
        const colName = colMap.get(v.variableCollectionId);
        if (!colName || colName.trim().startsWith("_")) continue;
        if (v.name.trim().startsWith("_")) continue;
        allVariables.push({
          variable: v,
          collectionName: colName
        });
      }
    } catch (err) {
      console.warn("Error fetching local variables:", err);
    }
    try {
      const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const libCollection of libraryCollections) {
        if (libCollection.name.trim().startsWith("_")) continue;
        try {
          const varsDescriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
            libCollection.key
          );
          const relevantDescriptors = varsDescriptors.filter((d) => {
            if (d.name.trim().startsWith("_")) return false;
            const lower = d.name.toLowerCase();
            if (!lower.includes("constant") && /\/\d+$/.test(d.name.trim())) return false;
            return lower.includes("layout") || lower.includes("base") || lower.includes("radius") || lower.includes("constant") || lower.includes("outline") || lower.includes("border") || lower.includes("surface") || lower.includes("background") || lower.includes("screen") || lower.includes("none");
          });
          const importedVars = await Promise.all(
            relevantDescriptors.map((v) => figma.variables.importVariableByKeyAsync(v.key).catch(() => null))
          );
          for (const v of importedVars) {
            if (v && !v.name.trim().startsWith("_")) {
              allVariables.push({
                variable: v,
                collectionName: libCollection.name
              });
            }
          }
        } catch (e) {
          console.warn(`Error importing from library ${libCollection.name}:`, e);
        }
      }
    } catch (e) {
    }
    return allVariables;
  }
  function cleanHiddenWhiteFills(node) {
    if ("fills" in node && Array.isArray(node.fills)) {
      try {
        const fills = node.fills;
        const filteredFills = fills.filter((paint) => {
          if (paint.type === "SOLID") {
            const isHidden = paint.visible === false;
            const isWhite = Math.abs(paint.color.r - 1) < 2e-3 && Math.abs(paint.color.g - 1) < 2e-3 && Math.abs(paint.color.b - 1) < 2e-3;
            if (isHidden && isWhite) {
              return false;
            }
          }
          return true;
        });
        if (filteredFills.length !== fills.length) {
          node.fills = filteredFills;
        }
      } catch (err) {
        console.warn("Could not clean hidden white fills on node:", node.name, err);
      }
    }
  }
  function isTemporaryCollection(name) {
    if (!name) return false;
    return name.trim().startsWith("_");
  }
  function isDefaultCollection(name) {
    if (!name) return false;
    return !isTemporaryCollection(name);
  }
  function isAllowedCollection(name) {
    if (!name) return false;
    return !name.trim().startsWith("_");
  }
  function normalizeVarPath(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[\s\-_–—.]+/g, "");
  }
  function findVariableWithPriority(allVars, varName, preferredCol = "metrics") {
    if (!varName || varName.trim().startsWith("_")) return void 0;
    const baseName = varName.split("/").pop() || varName;
    const normVarName = normalizeVarPath(varName);
    const normPrefVarName = normalizeVarPath(`${preferredCol}/${varName}`);
    const normBaseName = normalizeVarPath(baseName);
    const lowerPrefCol = preferredCol.toLowerCase();
    const isColMatch = (colName) => {
      const c = colName.toLowerCase();
      return c === lowerPrefCol || c.endsWith("/" + lowerPrefCol) || c.endsWith(" / " + lowerPrefCol);
    };
    const matchesExactOrPref = (vName) => {
      const norm = normalizeVarPath(vName);
      return vName === varName || vName === `${preferredCol}/${varName}` || vName.endsWith(`/${varName}`) || norm === normVarName || norm === normPrefVarName || norm.endsWith(`/${normVarName}`);
    };
    const matchesBase = (vName) => {
      const norm = normalizeVarPath(vName);
      return vName === baseName || vName.endsWith(`/${baseName}`) || norm === normBaseName || norm.endsWith(`/${normBaseName}`);
    };
    const colCandidates = allVars.filter(
      (item) => isDefaultCollection(item.collectionName) && !item.variable.name.trim().startsWith("_") && isColMatch(item.collectionName) && matchesExactOrPref(item.variable.name)
    );
    if (colCandidates.length > 0) {
      const remote = colCandidates.find((c) => c.variable.remote === true);
      return (remote || colCandidates[0]).variable;
    }
    const anyCandidates = allVars.filter(
      (item) => isDefaultCollection(item.collectionName) && !item.variable.name.trim().startsWith("_") && matchesExactOrPref(item.variable.name)
    );
    if (anyCandidates.length > 0) {
      const remote = anyCandidates.find((c) => c.variable.remote === true);
      return (remote || anyCandidates[0]).variable;
    }
    const baseCandidates = allVars.filter(
      (item) => isDefaultCollection(item.collectionName) && !item.variable.name.trim().startsWith("_") && matchesBase(item.variable.name)
    );
    if (baseCandidates.length > 0) {
      const remote = baseCandidates.find((c) => c.variable.remote === true);
      return (remote || baseCandidates[0]).variable;
    }
    return void 0;
  }
  function findColorVariableWithPriority(allVars, colorNames) {
    for (const name of colorNames) {
      if (!name || name.trim().startsWith("_")) continue;
      const normName = normalizeVarPath(name);
      const normSchemesName = normalizeVarPath(`schemes/${name}`);
      const matches = allVars.filter(
        (item) => isDefaultCollection(item.collectionName) && !item.variable.name.trim().startsWith("_") && !/\/\d+$/.test(item.variable.name.trim()) && (item.variable.name === name || item.variable.name === `schemes/${name}` || item.variable.name.endsWith(`/${name}`) || normalizeVarPath(item.variable.name) === normName || normalizeVarPath(item.variable.name) === normSchemesName || normalizeVarPath(item.variable.name).endsWith(`/${normName}`))
      );
      if (matches.length > 0) {
        const remote = matches.find((m) => m.variable.remote === true);
        return (remote || matches[0]).variable;
      }
    }
    return void 0;
  }
  async function isVariableFromAllowedCollection(varId, varCollectionCache) {
    let colName = varCollectionCache.get(varId);
    if (!colName) {
      try {
        const v = await figma.variables.getVariableByIdAsync(varId);
        if (v) {
          if (v.name.trim().startsWith("_")) return false;
          const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
          if (col) {
            colName = col.name;
            varCollectionCache.set(varId, col.name);
          }
        }
      } catch (e) {
      }
    }
    if (!colName) return false;
    return isAllowedCollection(colName);
  }
  async function bindOrReplaceField(node, fieldName, targetVariable, varCollectionCache) {
    if (!("setBoundVariable" in node)) return;
    const boundVars = node.boundVariables;
    const currentBinding = boundVars ? boundVars[fieldName] : void 0;
    if (currentBinding && currentBinding.type === "VARIABLE_ALIAS" && currentBinding.id) {
      const isAllowed = await isVariableFromAllowedCollection(currentBinding.id, varCollectionCache);
      if (!isAllowed) {
        if (targetVariable) {
          try {
            node.setBoundVariable(fieldName, targetVariable);
          } catch (e) {
            console.warn(`Could not replace foreign variable on ${fieldName}:`, e);
          }
        } else {
          try {
            node.setBoundVariable(fieldName, null);
          } catch (e) {
            console.warn(`Could not unbind foreign variable on ${fieldName}:`, e);
          }
        }
      }
      return;
    }
    if (targetVariable) {
      try {
        node.setBoundVariable(fieldName, targetVariable);
      } catch (e) {
        console.warn(`Could not bind ${fieldName}:`, e);
      }
    }
  }
  async function bindRadiusOrReplaceForeign(node, targetRadiusVariable, varCollectionCache) {
    if (node.type === "ELLIPSE" || "arcData" in node || !("setBoundVariable" in node)) return;
    const boundVars = node.boundVariables;
    const radiusFields = ["cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
    let hasForeignRadius = false;
    let hasAllowedRadius = false;
    if (boundVars) {
      for (const field of radiusFields) {
        const binding = boundVars[field];
        if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
          const isAllowed = await isVariableFromAllowedCollection(binding.id, varCollectionCache);
          if (!isAllowed) {
            hasForeignRadius = true;
            try {
              node.setBoundVariable(field, null);
            } catch (e) {
            }
          } else {
            hasAllowedRadius = true;
          }
        }
      }
    }
    if (hasForeignRadius || !hasAllowedRadius) {
      if (targetRadiusVariable) {
        if ("cornerRadius" in node) {
          try {
            node.setBoundVariable("cornerRadius", targetRadiusVariable);
            return;
          } catch (e) {
          }
        }
        if ("topLeftRadius" in node) {
          try {
            node.setBoundVariable("topLeftRadius", targetRadiusVariable);
            node.setBoundVariable("topRightRadius", targetRadiusVariable);
            node.setBoundVariable("bottomLeftRadius", targetRadiusVariable);
            node.setBoundVariable("bottomRightRadius", targetRadiusVariable);
          } catch (e) {
          }
        }
      }
    }
  }
  async function stripForeignVariablesFromNode(node, varCollectionCache, fallbackVars) {
    if (!node) return;
    if ("boundVariables" in node && node.boundVariables) {
      const bound = node.boundVariables;
      for (const field of Object.keys(bound)) {
        const binding = bound[field];
        if (binding && binding.type === "VARIABLE_ALIAS" && binding.id) {
          const isAllowed = await isVariableFromAllowedCollection(binding.id, varCollectionCache);
          if (!isAllowed) {
            if ((field.includes("Spacing") || field.includes("padding") || field.includes("Radius")) && fallbackVars.varNone && "setBoundVariable" in node) {
              try {
                node.setBoundVariable(field, fallbackVars.varNone);
              } catch (e) {
                try {
                  node.setBoundVariable(field, null);
                } catch (e2) {
                }
              }
            } else if ("setBoundVariable" in node) {
              try {
                node.setBoundVariable(field, null);
              } catch (e) {
              }
            }
          }
        }
      }
    }
    if ("fills" in node && Array.isArray(node.fills)) {
      try {
        const fills = node.fills;
        let fillsChanged = false;
        const newFills = fills.map((paint) => {
          var _a;
          if ((_a = paint.boundVariables) == null ? void 0 : _a.color) {
            const varId = paint.boundVariables.color.id;
            const colName = varCollectionCache.get(varId);
            if (colName && !isAllowedCollection(colName)) {
              fillsChanged = true;
              if (fallbackVars.varSurfaceBackground && paint.type === "SOLID") {
                return figma.variables.setBoundVariableForPaint(paint, "color", fallbackVars.varSurfaceBackground);
              } else {
                const p = { ...paint };
                delete p.boundVariables;
                return p;
              }
            }
          }
          return paint;
        });
        if (fillsChanged) {
          node.fills = newFills;
        }
      } catch (e) {
      }
    }
    if ("strokes" in node && Array.isArray(node.strokes)) {
      try {
        const strokes = node.strokes;
        let strokesChanged = false;
        const newStrokes = strokes.map((paint) => {
          var _a;
          if ((_a = paint.boundVariables) == null ? void 0 : _a.color) {
            const varId = paint.boundVariables.color.id;
            const colName = varCollectionCache.get(varId);
            if (colName && !isAllowedCollection(colName)) {
              strokesChanged = true;
              if (fallbackVars.varBorderColor && paint.type === "SOLID") {
                return figma.variables.setBoundVariableForPaint(paint, "color", fallbackVars.varBorderColor);
              } else {
                const p = { ...paint };
                delete p.boundVariables;
                return p;
              }
            }
          }
          return paint;
        });
        if (strokesChanged) {
          node.strokes = newStrokes;
        }
      } catch (e) {
      }
    }
    if ("children" in node && node.type !== "INSTANCE") {
      for (const child of node.children) {
        await stripForeignVariablesFromNode(child, varCollectionCache, fallbackVars);
      }
    }
  }
  async function bindColorVariablesRecursively(node, allVars) {
    const colorVars = allVars.filter((v) => v.variable.resolvedType === "COLOR");
    if (colorVars.length === 0) return;
    const matchColor = (paint, isText) => {
      const r = paint.color.r;
      const g = paint.color.g;
      const b = paint.color.b;
      for (const item of colorVars) {
        const v = item.variable;
        try {
          const keys = Object.keys(v.valuesByMode);
          if (keys.length > 0) {
            const val = v.valuesByMode[keys[0]];
            if (val && typeof val === "object" && "r" in val && "g" in val && "b" in val) {
              if (Math.abs(val.r - r) < 0.02 && Math.abs(val.g - g) < 0.02 && Math.abs(val.b - b) < 0.02) {
                return v;
              }
            }
          }
        } catch (e) {
        }
      }
      return null;
    };
    if ("fills" in node && Array.isArray(node.fills)) {
      try {
        const fills = node.fills;
        let changed = false;
        const newFills = fills.map((paint) => {
          var _a;
          if (paint.type === "SOLID" && !((_a = paint.boundVariables) == null ? void 0 : _a.color)) {
            const matchedVar = matchColor(paint, node.type === "TEXT");
            if (matchedVar) {
              changed = true;
              return figma.variables.setBoundVariableForPaint(paint, "color", matchedVar);
            }
          }
          return paint;
        });
        if (changed) node.fills = newFills;
      } catch (e) {
      }
    }
    if ("strokes" in node && Array.isArray(node.strokes)) {
      try {
        const strokes = node.strokes;
        let changed = false;
        const newStrokes = strokes.map((paint) => {
          var _a;
          if (paint.type === "SOLID" && !((_a = paint.boundVariables) == null ? void 0 : _a.color)) {
            const matchedVar = matchColor(paint, false);
            if (matchedVar) {
              changed = true;
              return figma.variables.setBoundVariableForPaint(paint, "color", matchedVar);
            }
          }
          return paint;
        });
        if (changed) node.strokes = newStrokes;
      } catch (e) {
      }
    }
    if ("children" in node && node.type !== "INSTANCE") {
      for (const child of node.children) {
        await bindColorVariablesRecursively(child, allVars);
      }
    }
  }
  async function preloadBoundVariablesForRoots(roots) {
    const varIds = /* @__PURE__ */ new Set();
    const collectFromNode = (n) => {
      const bv = n.boundVariables;
      if (bv && typeof bv === "object") {
        for (const val of Object.values(bv)) {
          if (!val) continue;
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item && typeof item.id === "string") varIds.add(item.id);
            }
          } else if (typeof val.id === "string") {
            varIds.add(val.id);
          }
        }
      }
    };
    for (const root of roots) {
      collectFromNode(root);
      if ("findAll" in root && typeof root.findAll === "function") {
        const descendants = root.findAll(() => true);
        for (const d of descendants) collectFromNode(d);
      }
    }
    const varMap = /* @__PURE__ */ new Map();
    await Promise.all(
      Array.from(varIds).map(async (id) => {
        try {
          const v = (figma.variables.getVariableById ? figma.variables.getVariableById(id) : null) || (figma.variables.getVariableByIdAsync ? await figma.variables.getVariableByIdAsync(id) : null);
          if (v) varMap.set(id, v);
        } catch (e) {
        }
      })
    );
    try {
      await ensureTemporaryMetricsCollection();
    } catch (_) {
    }
    try {
      const relevant = await getAllRelevantVariablesForComponentSet();
      for (const item of relevant) {
        if (item && item.variable) {
          varMap.set(item.variable.id, item.variable);
        }
      }
    } catch (_) {
    }
    return varMap;
  }
  var metricsCollectionPromise = null;
  async function ensureTemporaryMetricsCollection() {
    if (metricsCollectionPromise) {
      return metricsCollectionPromise;
    }
    metricsCollectionPromise = (async () => {
      try {
        const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
        let allVars = await getAllRelevantVariablesForComponentSet();
        let libraryConstantOne = allVars.find(
          (v) => isDefaultCollection(v.collectionName) && !v.variable.name.trim().startsWith("_") && (normalizeVarPath(v.variable.name) === "constant/1" || normalizeVarPath(v.variable.name) === "constant/one" || normalizeVarPath(v.variable.name).endsWith("/constant/1") || normalizeVarPath(v.variable.name).endsWith("/constant/one"))
        );
        if (!libraryConstantOne) {
          try {
            const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
            for (const libCollection of libraryCollections) {
              if (libCollection.name.trim().startsWith("_")) continue;
              try {
                const descriptors = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCollection.key);
                const constDesc = descriptors.find((d) => {
                  if (d.name.trim().startsWith("_")) return false;
                  const norm = normalizeVarPath(d.name);
                  return norm === "constant/1" || norm === "constant/one" || norm.endsWith("/constant/1") || norm.endsWith("/constant/one");
                });
                if (constDesc) {
                  const imported = await figma.variables.importVariableByKeyAsync(constDesc.key).catch(() => null);
                  if (imported) {
                    libraryConstantOne = {
                      variable: imported,
                      collectionName: libCollection.name
                    };
                    allVars.push(libraryConstantOne);
                    break;
                  }
                }
              } catch (e) {
                console.warn(`Error searching Constant/1 in library ${libCollection.name}:`, e);
              }
            }
          } catch (e) {
          }
        }
        const hasDefaultLayout = !!allVars.find(
          (v) => isDefaultCollection(v.collectionName) && (v.variable.name === "Layout/Base" || v.variable.name === "layout/base" || v.variable.name.endsWith("/Layout/Base") || v.variable.name.endsWith("/layout/base") || normalizeVarPath(v.variable.name) === "layout/base" || normalizeVarPath(v.variable.name).endsWith("/layout/base"))
        );
        const hasDefaultRadius = !!allVars.find(
          (v) => isDefaultCollection(v.collectionName) && (v.variable.name === "Radius/Container/Base" || v.variable.name === "radius/container/base" || v.variable.name === "Radius/Base" || v.variable.name === "radius/base" || v.variable.name.endsWith("/Radius/Container/Base") || v.variable.name.endsWith("/radius/container/base") || v.variable.name.endsWith("/Radius/Base") || v.variable.name.endsWith("/radius/base") || normalizeVarPath(v.variable.name) === "radius/container/base" || normalizeVarPath(v.variable.name) === "radius/base" || normalizeVarPath(v.variable.name).endsWith("/radius/container/base") || normalizeVarPath(v.variable.name).endsWith("/radius/base"))
        );
        const hasDefaultBorder = !!allVars.find(
          (v) => isDefaultCollection(v.collectionName) && (v.variable.name === "Constant/1" || v.variable.name === "constant/1" || v.variable.name === "Constant/One" || v.variable.name === "constant/one" || v.variable.name.endsWith("/Constant/1") || v.variable.name.endsWith("/constant/1") || v.variable.name.endsWith("/Constant/One") || v.variable.name.endsWith("/constant/one") || normalizeVarPath(v.variable.name) === "constant/1" || normalizeVarPath(v.variable.name) === "constant/one" || normalizeVarPath(v.variable.name).endsWith("/constant/1") || normalizeVarPath(v.variable.name).endsWith("/constant/one"))
        );
        const hasDefaultColor = !!allVars.find(
          (v) => isDefaultCollection(v.collectionName) && (v.variable.name === "OutlineBase" || v.variable.name === "outlineBase" || v.variable.name === "outlineHighest" || v.variable.name.endsWith("OutlineBase") || v.variable.name.endsWith("outlineBase") || normalizeVarPath(v.variable.name) === "outlinebase")
        );
        const hasDefaultSurface = !!allVars.find(
          (v) => isDefaultCollection(v.collectionName) && (v.variable.name === "SurfaceBackground" || v.variable.name === "surfaceBackground" || v.variable.name.endsWith("SurfaceBackground") || v.variable.name.endsWith("surfaceBackground") || normalizeVarPath(v.variable.name) === "surfacebackground")
        );
        if (hasDefaultLayout && hasDefaultRadius && hasDefaultBorder && hasDefaultColor && hasDefaultSurface) {
          return;
        }
        let targetCol = localCollections.find((c) => c.name.toLowerCase() === "metrics");
        if (!targetCol) {
          try {
            targetCol = figma.variables.createVariableCollection("Metrics");
          } catch (e) {
            console.warn("Could not create collection Metrics:", e);
            if (localCollections.length > 0) {
              targetCol = localCollections.find((c) => !c.name.trim().startsWith("_")) || null;
            }
            if (!targetCol) {
              return;
            }
          }
        } else if (targetCol.name !== "Metrics") {
          try {
            targetCol.name = "Metrics";
          } catch (e) {
          }
        }
        const defaultModeId = targetCol.modes[0].modeId;
        const existingVarsInCol = (await Promise.all(
          targetCol.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
        )).filter((v) => v !== null);
        for (const v of existingVarsInCol) {
          const lower = v.name.toLowerCase();
          if (lower === "outlinebase") {
            if (v.name !== "OutlineBase") {
              try {
                v.name = "OutlineBase";
              } catch (e) {
              }
            }
          } else if (lower === "surfacebackground") {
            if (v.name !== "SurfaceBackground") {
              try {
                v.name = "SurfaceBackground";
              } catch (e) {
              }
            }
          } else if (lower === "constant/1" || lower === "constant/one") {
            if (libraryConstantOne && libraryConstantOne.variable.id !== v.id) {
              try {
                allVars = allVars.filter((item) => item.variable.id !== v.id);
                v.remove();
              } catch (e) {
              }
            } else if (v.name !== "Constant/1") {
              try {
                v.name = "Constant/1";
              } catch (e) {
              }
            }
          } else if (lower === "layout/base") {
            if (v.name !== "Layout/Base") {
              try {
                v.name = "Layout/Base";
              } catch (e) {
              }
            }
          } else if (lower === "radius/container/base" || lower === "radius/base") {
            if (v.name !== "Radius/Container/Base") {
              try {
                v.name = "Radius/Container/Base";
              } catch (e) {
              }
            }
          } else {
            try {
              allVars = allVars.filter((item) => item.variable.id !== v.id);
              v.remove();
            } catch (e) {
            }
          }
        }
        const remainingVarsInCol = (await Promise.all(
          targetCol.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
        )).filter((v) => v !== null);
        const colVarMap = /* @__PURE__ */ new Map();
        for (const v of remainingVarsInCol) {
          colVarMap.set(v.name.toLowerCase(), v);
        }
        const ensureVar = (name, type, val, scopes, description) => {
          if (normalizeVarPath(name) === "constant/1") {
            if (libraryConstantOne) return libraryConstantOne.variable;
          }
          const inCol = colVarMap.get(name.toLowerCase());
          if (inCol) return inCol;
          const existing = allVars.find(
            (v) => (v.variable.name.toLowerCase() === name.toLowerCase() || normalizeVarPath(v.variable.name) === normalizeVarPath(name)) && isAllowedCollection(v.collectionName)
          );
          if (existing) return existing.variable;
          try {
            const v = figma.variables.createVariable(name, targetCol, type);
            v.setValueForMode(defaultModeId, val);
            if (scopes && scopes.length > 0) {
              v.scopes = scopes;
            }
            if (description) {
              v.description = description;
            }
            colVarMap.set(name.toLowerCase(), v);
            allVars.push({ variable: v, collectionName: targetCol.name });
            return v;
          } catch (err) {
            console.warn(`Could not create variable ${name}:`, err);
            return void 0;
          }
        };
        ensureVar("OutlineBase", "COLOR", { r: 0.85, g: 0.85, b: 0.85, a: 1 }, ["STROKE_COLOR"], "Baseline component outline");
        ensureVar("SurfaceBackground", "COLOR", { r: 1, g: 1, b: 1, a: 1 }, ["FRAME_FILL"], "Baseline surface background");
        ensureVar("Constant/1", "FLOAT", 1, ["STROKE_FLOAT", "GAP", "CORNER_RADIUS", "WIDTH_HEIGHT"], "Constant 1px border");
        ensureVar("Layout/Base", "FLOAT", 12, ["GAP"], "Base spacing (12px)");
        ensureVar("Radius/Container/Base", "FLOAT", 12, ["CORNER_RADIUS"], "Base container radius (12px)");
      } finally {
        metricsCollectionPromise = null;
      }
    })();
    return metricsCollectionPromise;
  }

  // ../../../../plugins/components-setup/src/slots/slots.ts
  function isSlotLayer(node) {
    const name = (node.name || "").trim().toLowerCase();
    if (name.includes("slot") || name === "actions") {
      return true;
    }
    if ("componentPropertyReferences" in node) {
      const refs = node.componentPropertyReferences;
      if (refs && typeof refs === "object" && Object.keys(refs).length > 0) {
        return true;
      }
    }
    return false;
  }
  function isSlotContainer(n) {
    if (!n) return false;
    if (n.type === "SLOT") return true;
    if (n.componentPropertyReferences && n.componentPropertyReferences.slot) return true;
    if (n.type !== "FRAME") return false;
    const name = (n.name || "").trim().toLowerCase();
    return name === "slot" || name === "itemsslot" || name === "contentslot" || name.endsWith("slot") || name.startsWith("slot") || name.includes("slot");
  }
  function isInsideSlot(n, root) {
    let curr = n.parent;
    while (curr && curr !== root && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
      if (isSlotContainer(curr)) {
        return true;
      }
      curr = curr.parent;
    }
    return false;
  }
  function findDirectSlotContainers(root) {
    const result = [];
    function recurse(n) {
      if (n.type === "INSTANCE") return;
      if (isSlotContainer(n)) {
        result.push(n);
        return;
      }
      if ("children" in n && Array.isArray(n.children)) {
        for (const ch of n.children) {
          recurse(ch);
        }
      }
    }
    if ("children" in root && Array.isArray(root.children)) {
      for (const ch of root.children) {
        recurse(ch);
      }
    }
    return result;
  }
  function getInstanceFamilyKey(inst) {
    if (inst.mainComponent && inst.mainComponent.parent && inst.mainComponent.parent.type === "COMPONENT_SET") {
      return `set:${inst.mainComponent.parent.name.trim().toLowerCase()}`;
    }
    if (inst.mainComponent) {
      const compName = inst.mainComponent.name.trim().toLowerCase();
      const baseName = compName.split(",")[0].split("=")[0].trim();
      if (baseName && baseName !== compName) {
        return `comp_base:${baseName}`;
      }
      return `comp:${compName}`;
    }
    return `name:${(inst.name || "").trim().toLowerCase()}`;
  }
  function normalizeSlotLayoutMode(slotNode, parent) {
    if (slotNode && "children" in slotNode && Array.isArray(slotNode.children) && slotNode.children.length >= 2) {
      const c0 = slotNode.children[0];
      const c1 = slotNode.children[1];
      if (c0 && c1 && typeof c0.x === "number" && typeof c1.x === "number") {
        const deltaY = Math.abs(c1.y - c0.y);
        const deltaX = Math.abs(c1.x - c0.x);
        if (deltaY > deltaX) return "VERTICAL";
        if (deltaX > deltaY) return "HORIZONTAL";
      }
    }
    if (parent && "layoutMode" in parent) {
      if (parent.layoutMode === "VERTICAL") return "VERTICAL";
      if (parent.layoutMode === "HORIZONTAL") return "HORIZONTAL";
    }
    return "HORIZONTAL";
  }
  function sanitizeSlotFrame(slotNode, parent) {
    if (!slotNode || slotNode.removed) return;
    try {
      if ("layoutGrids" in slotNode && Array.isArray(slotNode.layoutGrids) && slotNode.layoutGrids.length > 0) {
        slotNode.layoutGrids = [];
      }
    } catch (_) {
    }
    try {
      if ("gridStyleId" in slotNode && slotNode.gridStyleId) {
        slotNode.gridStyleId = "";
      }
    } catch (_) {
    }
    try {
      const currentMode = "layoutMode" in slotNode ? slotNode.layoutMode : "NONE";
      if (currentMode === "GRID" || currentMode === "NONE") {
        const desiredMode = normalizeSlotLayoutMode(slotNode, parent);
        slotNode.layoutMode = desiredMode;
      }
    } catch (err) {
      console.warn("[sanitizeSlotFrame] Could not set layoutMode:", err);
      try {
        slotNode.layoutMode = "HORIZONTAL";
      } catch (_) {
      }
    }
    try {
      if ("layoutWrap" in slotNode && slotNode.layoutWrap === "WRAP") {
        slotNode.layoutWrap = "NO_WRAP";
      }
    } catch (_) {
    }
  }
  function applySlotMetricsAndVariables(slotNode, parent, preloadedVars) {
    if (!slotNode || !("setBoundVariable" in slotNode)) return;
    sanitizeSlotFrame(slotNode, parent);
    try {
      slotNode.fills = [];
    } catch (_) {
    }
    try {
      slotNode.strokes = [];
    } catch (_) {
    }
    let varNone = void 0;
    if (preloadedVars) {
      for (const v of preloadedVars.values()) {
        if (!v || !v.name) continue;
        const lower = v.name.toLowerCase().trim();
        const norm = normalizeVarPath(v.name);
        if (norm === "constant/none" || norm === "none" || norm === "constant/zero" || lower === "constant/none" || lower === "none" || lower === "constant/zero" || lower.endsWith("/none") || lower.endsWith("/zero")) {
          varNone = v;
          break;
        }
      }
    }
    if (!varNone && figma.variables && typeof figma.variables.getLocalVariables === "function") {
      try {
        const localVars = figma.variables.getLocalVariables("FLOAT");
        for (const v of localVars) {
          if (!v || !v.name) continue;
          const lower = v.name.toLowerCase().trim();
          const norm = normalizeVarPath(v.name);
          if (norm === "constant/none" || norm === "none" || norm === "constant/zero" || lower === "constant/none" || lower === "none" || lower === "constant/zero" || lower.endsWith("/none") || lower.endsWith("/zero")) {
            varNone = v;
            break;
          }
        }
      } catch (_) {
      }
    }
    if (varNone) {
      try {
        const scopes = varNone.scopes || [];
        const neededScopes = ["GAP", "CORNER_RADIUS"];
        let changed = false;
        const newScopes = [...scopes];
        for (const s of neededScopes) {
          if (!newScopes.includes(s) && !newScopes.includes("ALL_SCOPES")) {
            newScopes.push(s);
            changed = true;
          }
        }
        if (changed) varNone.scopes = newScopes;
      } catch (_) {
      }
      try {
        slotNode.setBoundVariable("paddingTop", varNone);
      } catch (_) {
      }
      try {
        slotNode.setBoundVariable("paddingBottom", varNone);
      } catch (_) {
      }
      try {
        slotNode.setBoundVariable("paddingLeft", varNone);
      } catch (_) {
      }
      try {
        slotNode.setBoundVariable("paddingRight", varNone);
      } catch (_) {
      }
      try {
        slotNode.setBoundVariable("cornerRadius", varNone);
      } catch (_) {
        try {
          slotNode.setBoundVariable("topLeftRadius", varNone);
        } catch (_2) {
        }
        try {
          slotNode.setBoundVariable("topRightRadius", varNone);
        } catch (_2) {
        }
        try {
          slotNode.setBoundVariable("bottomLeftRadius", varNone);
        } catch (_2) {
        }
        try {
          slotNode.setBoundVariable("bottomRightRadius", varNone);
        } catch (_2) {
        }
      }
    }
    if ("cornerSmoothing" in slotNode) {
      try {
        slotNode.cornerSmoothing = 0.6;
      } catch (_) {
      }
    }
    const slotBv = slotNode.boundVariables;
    const isAlreadyBoundSpacing = Boolean(slotBv && (slotBv.itemSpacing || slotBv.counterAxisSpacing));
    if (!isAlreadyBoundSpacing) {
      let inheritedSpacingVar = void 0;
      const parentBv = parent ? parent.boundVariables : null;
      if (parentBv && parentBv.itemSpacing && typeof parentBv.itemSpacing.id === "string") {
        const pId = parentBv.itemSpacing.id;
        inheritedSpacingVar = preloadedVars && preloadedVars.get(pId) || (figma.variables && typeof figma.variables.getVariableById === "function" ? figma.variables.getVariableById(pId) : null) || void 0;
      }
      if (inheritedSpacingVar) {
        try {
          if (!inheritedSpacingVar.scopes.includes("GAP") && !inheritedSpacingVar.scopes.includes("ALL_SCOPES")) {
            inheritedSpacingVar.scopes = [...inheritedSpacingVar.scopes, "GAP"];
          }
        } catch (_) {
        }
        try {
          slotNode.setBoundVariable("itemSpacing", inheritedSpacingVar);
        } catch (_) {
        }
        try {
          slotNode.setBoundVariable("counterAxisSpacing", inheritedSpacingVar);
        } catch (_) {
        }
      } else if (slotNode.itemSpacing === 0 && varNone) {
        try {
          slotNode.setBoundVariable("itemSpacing", varNone);
        } catch (_) {
        }
        try {
          slotNode.setBoundVariable("counterAxisSpacing", varNone);
        } catch (_) {
        }
      } else if (slotNode.itemSpacing > 0 && preloadedVars) {
        let matchedSpacingVar = void 0;
        if (slotNode.itemSpacing === 12) {
          for (const v of preloadedVars.values()) {
            const norm = normalizeVarPath(v.name || "");
            if (norm === "layout/base" || norm.endsWith("/layout/base")) {
              matchedSpacingVar = v;
              break;
            }
          }
        }
        if (!matchedSpacingVar) {
          for (const v of preloadedVars.values()) {
            if (v && v.resolvedType === "FLOAT" && v.valuesByMode) {
              const vals = Object.values(v.valuesByMode);
              if (vals.includes(slotNode.itemSpacing)) {
                const lower = (v.name || "").toLowerCase();
                if (lower.includes("layout") || lower.includes("gap") || lower.includes("spacing")) {
                  matchedSpacingVar = v;
                  break;
                }
              }
            }
          }
        }
        if (matchedSpacingVar) {
          try {
            if (!matchedSpacingVar.scopes.includes("GAP") && !matchedSpacingVar.scopes.includes("ALL_SCOPES")) {
              matchedSpacingVar.scopes = [...matchedSpacingVar.scopes, "GAP"];
            }
          } catch (_) {
          }
          try {
            slotNode.setBoundVariable("itemSpacing", matchedSpacingVar);
          } catch (_) {
          }
          try {
            slotNode.setBoundVariable("counterAxisSpacing", matchedSpacingVar);
          } catch (_) {
          }
        }
      }
    }
  }
  function hasVisibleFillsOrStrokes(node) {
    if ("fills" in node && Array.isArray(node.fills)) {
      if (node.fills.some((f) => f && f.visible !== false && (typeof f.opacity !== "number" || f.opacity > 0))) {
        return true;
      }
    }
    if ("strokes" in node && Array.isArray(node.strokes)) {
      if (node.strokes.some((s) => s && s.visible !== false && (typeof s.opacity !== "number" || s.opacity > 0))) {
        return true;
      }
    }
    if ("effects" in node && Array.isArray(node.effects)) {
      if (node.effects.some((e) => e && e.visible !== false)) {
        return true;
      }
    }
    return false;
  }
  function isRedundantSlotWrapper(node, root) {
    if (!node || node.removed) return false;
    if (root && node === root) return false;
    if (node.type !== "FRAME" && node.type !== "GROUP") return false;
    if (isSlotContainer(node)) return false;
    const parent = node.parent;
    if (!parent || !("insertChild" in parent) || parent.type === "PAGE" || parent.type === "COMPONENT_SET") {
      return false;
    }
    if (!("children" in node) || !Array.isArray(node.children) || node.children.length !== 1) {
      return false;
    }
    if (!isSlotContainer(node.children[0])) {
      return false;
    }
    if (hasVisibleFillsOrStrokes(node)) {
      return false;
    }
    return true;
  }
  function unwrapRedundantSlotWrappers(root, preloadedVars) {
    let unwrappedCount = 0;
    if (!root || !("children" in root)) return 0;
    const slots = findDirectSlotContainers(root);
    for (const slotNode of slots) {
      while (slotNode && !slotNode.removed && isRedundantSlotWrapper(slotNode.parent, root)) {
        const wrapper = slotNode.parent;
        const grandParent = wrapper.parent;
        if (!grandParent || !("insertChild" in grandParent)) break;
        const wrapperIndex = grandParent.children.indexOf(wrapper);
        if (wrapperIndex === -1) break;
        const wrapperLayoutMode = "layoutMode" in wrapper ? wrapper.layoutMode : "NONE";
        const wrapperItemSpacing = "itemSpacing" in wrapper && typeof wrapper.itemSpacing === "number" ? wrapper.itemSpacing : 0;
        const wrapperPrimaryAlign = "primaryAxisAlignItems" in wrapper ? wrapper.primaryAxisAlignItems : void 0;
        const wrapperCounterAlign = "counterAxisAlignItems" in wrapper ? wrapper.counterAxisAlignItems : void 0;
        const wrapperSizingH = "layoutSizingHorizontal" in wrapper ? wrapper.layoutSizingHorizontal : void 0;
        const wrapperSizingV = "layoutSizingVertical" in wrapper ? wrapper.layoutSizingVertical : void 0;
        const wrapperLayoutAlign = "layoutAlign" in wrapper ? wrapper.layoutAlign : void 0;
        const wrapperLayoutGrow = "layoutGrow" in wrapper ? wrapper.layoutGrow : void 0;
        if (wrapperLayoutMode === "HORIZONTAL" || wrapperLayoutMode === "VERTICAL") {
          try {
            slotNode.layoutMode = wrapperLayoutMode;
          } catch (_) {
          }
        }
        if (wrapperItemSpacing > 0 && (!("itemSpacing" in slotNode) || slotNode.itemSpacing === 0)) {
          try {
            slotNode.itemSpacing = wrapperItemSpacing;
          } catch (_) {
          }
        }
        if (wrapperPrimaryAlign) {
          try {
            slotNode.primaryAxisAlignItems = wrapperPrimaryAlign;
          } catch (_) {
          }
        }
        if (wrapperCounterAlign) {
          try {
            slotNode.counterAxisAlignItems = wrapperCounterAlign;
          } catch (_) {
          }
        }
        applySlotMetricsAndVariables(slotNode, wrapper, preloadedVars);
        grandParent.insertChild(wrapperIndex, slotNode);
        try {
          if (wrapperSizingH) {
            slotNode.layoutSizingHorizontal = wrapperSizingH === "FIXED" ? "HUG" : wrapperSizingH;
          }
        } catch (_) {
        }
        try {
          if (wrapperSizingV) {
            slotNode.layoutSizingVertical = wrapperSizingV === "FIXED" ? "HUG" : wrapperSizingV;
          } else if (slotNode.layoutMode === "HORIZONTAL" && "layoutMode" in grandParent && grandParent.layoutMode === "VERTICAL") {
            slotNode.layoutSizingVertical = "HUG";
          }
        } catch (_) {
        }
        try {
          if (wrapperLayoutAlign) slotNode.layoutAlign = wrapperLayoutAlign;
        } catch (_) {
        }
        try {
          if (wrapperLayoutGrow !== void 0) slotNode.layoutGrow = wrapperLayoutGrow;
        } catch (_) {
        }
        try {
          wrapper.remove();
          unwrappedCount++;
        } catch (_) {
          break;
        }
      }
    }
    return unwrappedCount;
  }
  function consolidateRepeatingInstancesIntoSlot(root, preloadedVars) {
    const slotFrames = [];
    const candidateParents = [];
    unwrapRedundantSlotWrappers(root, preloadedVars);
    const inspectNode = (n) => {
      if (n.type === "INSTANCE") return;
      if (isSlotContainer(n)) return;
      if (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SLOT") {
        const frame = n;
        if ("children" in frame && Array.isArray(frame.children)) {
          candidateParents.push(frame);
          for (const ch of frame.children) {
            inspectNode(ch);
          }
        }
      }
    };
    inspectNode(root);
    for (const parent of candidateParents) {
      if (parent.removed || !parent.parent) continue;
      if (isSlotContainer(parent) || isInsideSlot(parent, root)) {
        if (isSlotContainer(parent)) {
          applySlotMetricsAndVariables(parent, parent.parent, preloadedVars);
          if ("children" in parent && Array.isArray(parent.children)) {
            for (const ch of parent.children) {
              if ("componentPropertyReferences" in ch) {
                try {
                  ch.componentPropertyReferences = {};
                } catch (_) {
                }
              }
            }
          }
          if (!slotFrames.includes(parent)) {
            slotFrames.push(parent);
          }
        }
        continue;
      }
      const existingSlots = (parent.children || []).filter(
        (c) => isSlotContainer(c) && (c.type === "FRAME" || c.type === "SLOT")
      );
      const hasLooseInstances = (parent.children || []).some(
        (c) => c.type === "INSTANCE" && !isSlotContainer(c)
      );
      let preservedSlotLayoutMode = null;
      let preservedSlotSpacing = null;
      if (existingSlots.length > 0) {
        if (hasLooseInstances) {
          for (const oldSlot of existingSlots) {
            if (!preservedSlotLayoutMode && "layoutMode" in oldSlot && (oldSlot.layoutMode === "HORIZONTAL" || oldSlot.layoutMode === "VERTICAL")) {
              preservedSlotLayoutMode = oldSlot.layoutMode;
            }
            if (preservedSlotSpacing === null && "itemSpacing" in oldSlot && typeof oldSlot.itemSpacing === "number") {
              preservedSlotSpacing = oldSlot.itemSpacing;
            }
            if ("children" in oldSlot && Array.isArray(oldSlot.children)) {
              const slotChildren = [...oldSlot.children];
              const oldIndex = parent.children.indexOf(oldSlot);
              for (let i = 0; i < slotChildren.length; i++) {
                parent.insertChild(oldIndex + i, slotChildren[i]);
              }
            }
            try {
              oldSlot.remove();
            } catch (_) {
            }
          }
        } else {
          let owningComp = null;
          let currNode = parent;
          while (currNode && currNode.type !== "PAGE" && currNode.type !== "DOCUMENT") {
            if (currNode.type === "COMPONENT") {
              owningComp = currNode;
              break;
            }
            currNode = currNode.parent;
          }
          for (const oldSlot of existingSlots) {
            if (oldSlot.type === "SLOT") {
              applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
              if ("children" in oldSlot && Array.isArray(oldSlot.children)) {
                for (const ch of oldSlot.children) {
                  if ("componentPropertyReferences" in ch) {
                    try {
                      ch.componentPropertyReferences = {};
                    } catch (_) {
                    }
                  }
                }
              }
              if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
            } else if (oldSlot.type === "FRAME" && owningComp && typeof owningComp.createSlot === "function") {
              try {
                const compMode = "layoutMode" in owningComp ? owningComp.layoutMode : "NONE";
                if (compMode !== "GRID") {
                  const upgradedSlot = owningComp.createSlot();
                  upgradedSlot.name = "Slot";
                  const oldIdx = parent.children.indexOf(oldSlot);
                  const oldMode = oldSlot.layoutMode === "VERTICAL" ? "VERTICAL" : "HORIZONTAL";
                  const oldSpacing = oldSlot.itemSpacing || 0;
                  const oldSizingH = oldSlot.layoutSizingHorizontal;
                  const oldSizingV = oldSlot.layoutSizingVertical;
                  try {
                    upgradedSlot.layoutMode = oldMode;
                  } catch (_) {
                  }
                  sanitizeSlotFrame(upgradedSlot, parent);
                  upgradedSlot.itemSpacing = oldSpacing;
                  try {
                    upgradedSlot.primaryAxisAlignItems = oldSlot.primaryAxisAlignItems;
                  } catch (_) {
                  }
                  try {
                    upgradedSlot.counterAxisAlignItems = oldSlot.counterAxisAlignItems;
                  } catch (_) {
                  }
                  upgradedSlot.paddingLeft = 0;
                  upgradedSlot.paddingRight = 0;
                  upgradedSlot.paddingTop = 0;
                  upgradedSlot.paddingBottom = 0;
                  parent.insertChild(oldIdx, upgradedSlot);
                  try {
                    if (oldSizingH) upgradedSlot.layoutSizingHorizontal = oldSizingH;
                  } catch (_) {
                  }
                  try {
                    if (oldSizingV) upgradedSlot.layoutSizingVertical = oldSizingV;
                  } catch (_) {
                  }
                  const slotChildren = [...oldSlot.children];
                  for (const ch of slotChildren) {
                    upgradedSlot.appendChild(ch);
                    if ("componentPropertyReferences" in ch) {
                      try {
                        ch.componentPropertyReferences = {};
                      } catch (_) {
                      }
                    }
                  }
                  applySlotMetricsAndVariables(upgradedSlot, oldSlot, preloadedVars);
                  try {
                    oldSlot.remove();
                  } catch (_) {
                  }
                  if (!slotFrames.includes(upgradedSlot)) slotFrames.push(upgradedSlot);
                  continue;
                }
              } catch (_) {
              }
              applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
              if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
            } else {
              applySlotMetricsAndVariables(oldSlot, parent, preloadedVars);
              if (!slotFrames.includes(oldSlot)) slotFrames.push(oldSlot);
            }
          }
        }
      }
      const children = parent.children || [];
      if (children.length < 2) continue;
      let currentRun = [];
      let currentCompKey = null;
      const instanceRuns = [];
      for (const child of children) {
        if (child.type === "INSTANCE") {
          const inst = child;
          const compKey = getInstanceFamilyKey(inst);
          if (currentCompKey && compKey === currentCompKey) {
            currentRun.push(inst);
          } else {
            if (currentRun.length >= 2) {
              instanceRuns.push([...currentRun]);
            }
            currentRun = [inst];
            currentCompKey = compKey;
          }
        } else {
          if (currentRun.length >= 2) {
            instanceRuns.push([...currentRun]);
          }
          currentRun = [];
          currentCompKey = null;
        }
      }
      if (currentRun.length >= 2) {
        instanceRuns.push([...currentRun]);
      }
      if (instanceRuns.length === 0) continue;
      let owningComponent = null;
      if (parent.type === "COMPONENT") {
        owningComponent = parent;
      } else {
        let curr = parent;
        while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
          if (curr.type === "COMPONENT") {
            owningComponent = curr;
            break;
          }
          curr = curr.parent;
        }
      }
      for (const run of instanceRuns) {
        let slotNode = null;
        if (owningComponent && owningComponent.parent && owningComponent.parent.type === "COMPONENT_SET") {
          const compSet = owningComponent.parent;
          for (const sibling of compSet.children) {
            if (sibling !== owningComponent && sibling.type === "COMPONENT") {
              const siblingSlots = findDirectSlotContainers(sibling);
              if (siblingSlots.length > 0) {
                const existingSiblingSlot = siblingSlots[0];
                if (existingSiblingSlot && typeof existingSiblingSlot.clone === "function") {
                  try {
                    slotNode = existingSiblingSlot.clone();
                    while (slotNode.children.length > 0) {
                      slotNode.children[0].remove();
                    }
                  } catch (cloneErr) {
                    slotNode = null;
                  }
                }
                if (slotNode) break;
              }
            }
          }
        }
        if (!slotNode && owningComponent && typeof owningComponent.createSlot === "function") {
          try {
            const compMode = "layoutMode" in owningComponent ? owningComponent.layoutMode : "NONE";
            if (compMode !== "GRID") {
              slotNode = owningComponent.createSlot();
            }
          } catch (err) {
            console.warn("[AutoProps] owningComponent.createSlot() error:", err);
            slotNode = null;
          }
        }
        if (!slotNode) {
          slotNode = figma.createFrame();
        }
        slotNode.name = "Slot";
        try {
          slotNode.fills = [];
        } catch (_) {
        }
        try {
          slotNode.strokes = [];
        } catch (_) {
        }
        let effectiveLayoutMode = "HORIZONTAL";
        if (preservedSlotLayoutMode) {
          effectiveLayoutMode = preservedSlotLayoutMode;
        } else if ("layoutMode" in parent && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL") && run.length === children.length) {
          effectiveLayoutMode = parent.layoutMode;
        } else if (run.length >= 2) {
          const deltaY = Math.abs(run[1].y - run[0].y);
          const deltaX = Math.abs(run[1].x - run[0].x);
          effectiveLayoutMode = deltaY > deltaX ? "VERTICAL" : "HORIZONTAL";
        } else if ("layoutMode" in parent && parent.layoutMode === "VERTICAL") {
          effectiveLayoutMode = "VERTICAL";
        } else if ("layoutMode" in parent && parent.layoutMode === "HORIZONTAL") {
          effectiveLayoutMode = "HORIZONTAL";
        }
        try {
          slotNode.layoutMode = effectiveLayoutMode;
        } catch (layoutErr) {
          console.warn("[AutoProps] slotNode.layoutMode error:", layoutErr);
          try {
            slotNode.layoutMode = "HORIZONTAL";
          } catch (_) {
          }
        }
        sanitizeSlotFrame(slotNode, parent);
        if (preservedSlotSpacing !== null) {
          slotNode.itemSpacing = preservedSlotSpacing;
        } else if ("itemSpacing" in parent && typeof parent.itemSpacing === "number") {
          slotNode.itemSpacing = parent.itemSpacing;
        } else {
          slotNode.itemSpacing = 0;
        }
        try {
          slotNode.primaryAxisAlignItems = parent.primaryAxisAlignItems;
        } catch (_) {
        }
        try {
          slotNode.counterAxisAlignItems = parent.counterAxisAlignItems;
        } catch (_) {
        }
        try {
          slotNode.layoutWrap = "NO_WRAP";
        } catch (_) {
        }
        slotNode.paddingLeft = 0;
        slotNode.paddingRight = 0;
        slotNode.paddingTop = 0;
        slotNode.paddingBottom = 0;
        slotNode.x = run[0].x;
        slotNode.y = run[0].y;
        const firstIndex = parent.children.indexOf(run[0]);
        parent.insertChild(firstIndex, slotNode);
        try {
          if (effectiveLayoutMode === "HORIZONTAL") {
            if (parent.layoutSizingHorizontal === "HUG") {
              slotNode.layoutSizingHorizontal = "HUG";
            } else {
              slotNode.layoutSizingHorizontal = "FILL";
            }
            try {
              slotNode.layoutSizingVertical = "FILL";
            } catch (_) {
              slotNode.layoutSizingVertical = "HUG";
            }
          } else {
            slotNode.layoutSizingHorizontal = "FILL";
            try {
              slotNode.layoutSizingVertical = "HUG";
            } catch (_) {
            }
          }
        } catch (e) {
          try {
            slotNode.layoutAlign = "STRETCH";
          } catch (e2) {
          }
        }
        for (const inst of run) {
          slotNode.appendChild(inst);
          try {
            inst.componentPropertyReferences = {};
          } catch (_) {
          }
          if (effectiveLayoutMode === "VERTICAL") {
            try {
              inst.layoutSizingHorizontal = "FILL";
            } catch (e) {
            }
          }
        }
        applySlotMetricsAndVariables(slotNode, parent, preloadedVars);
        if (!slotFrames.includes(slotNode)) slotFrames.push(slotNode);
      }
    }
    unwrapRedundantSlotWrappers(root, preloadedVars);
    return slotFrames;
  }

  // ../../../../plugins/components-setup/src/properties/collectors.ts
  function collectDirectTextNodes(root) {
    const result = [];
    function recurse(n) {
      if (n.type === "INSTANCE") return;
      if (isSlotContainer(n)) return;
      if (n.type === "TEXT") {
        result.push(n);
        return;
      }
      if ("children" in n && Array.isArray(n.children)) {
        for (const ch of n.children) {
          recurse(ch);
        }
      }
    }
    if ("children" in root && Array.isArray(root.children)) {
      for (const ch of root.children) {
        recurse(ch);
      }
    }
    return result;
  }
  function isIconInstanceNode(n) {
    const nameLower = (n.name || "").trim().toLowerCase();
    if (nameLower === "icon" || nameLower.includes("icon") || nameLower.startsWith("ico")) {
      return true;
    }
    const mainComp = n.mainComponent;
    if (mainComp) {
      const mainLower = (mainComp.name || "").trim().toLowerCase();
      if (mainLower === "icon" || mainLower.includes("icon") || mainLower.startsWith("ico")) {
        return true;
      }
      if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
        const parentLower = (mainComp.parent.name || "").trim().toLowerCase();
        if (parentLower === "icon" || parentLower.includes("icon") || parentLower.startsWith("ico") || parentLower.includes("lucide")) {
          return true;
        }
      }
    }
    if ("width" in n && "height" in n && n.width > 0 && n.height > 0 && n.width <= 48 && n.height <= 48) {
      const ratio = n.width / n.height;
      if (ratio >= 0.8 && ratio <= 1.25) {
        if (!nameLower.includes("avatar") && !nameLower.includes("badge") && !nameLower.includes("dot") && !nameLower.includes("item")) {
          return true;
        }
      }
    }
    return false;
  }
  function collectDirectInstances(root) {
    const result = [];
    function recurse(n) {
      if (isSlotContainer(n)) return;
      if (n.type === "INSTANCE") {
        const inst = n;
        const nameLower = (inst.name || "").trim().toLowerCase();
        if (!nameLower.includes("slot")) {
          result.push(inst);
        }
        return;
      }
      if ("children" in n && Array.isArray(n.children)) {
        for (const ch of n.children) {
          recurse(ch);
        }
      }
    }
    if ("children" in root && Array.isArray(root.children)) {
      for (const ch of root.children) {
        recurse(ch);
      }
    }
    return result;
  }
  function cleanInstancePropertyName(rawName) {
    let name = (rawName || "").trim();
    if (name.includes("/")) {
      const segments = name.split("/").map((s) => s.trim()).filter(Boolean);
      const filtered = segments.filter((s, idx) => {
        if (idx === segments.length - 1 && segments.length > 1 && /^(default|variant\d*|property\d*|state\d*|hover|active|focus|disabled|pressed|normal)$/i.test(s)) {
          return false;
        }
        return true;
      });
      name = filtered.length > 0 ? filtered.join(" ") : segments[segments.length - 1] || "Instance";
    }
    let pascal = sanitizePascalCase(name);
    if (!pascal || pascal === "Wrapper") {
      pascal = "Instance";
    }
    const isSlot = /slot/i.test(rawName) || /slot/i.test(pascal);
    return { propName: pascal, isSlot };
  }
  function getContainingVariantOrRoot(node) {
    let curr = node;
    while (curr) {
      if (curr.parent && curr.parent.type === "COMPONENT_SET") {
        return curr;
      }
      if (curr.type === "COMPONENT" || curr.type === "COMPONENT_SET") {
        return curr;
      }
      curr = curr.parent;
    }
    return node;
  }

  // ../../../../plugins/components-setup/src/utils/sorting.ts
  function getVisualSortScore(node, fallbackRoot) {
    const container = getContainingVariantOrRoot(node) || fallbackRoot || node;
    let nodeX = 0, nodeY = 0, contX = 0, contY = 0;
    if (node.absoluteBoundingBox) {
      nodeX = node.absoluteBoundingBox.x;
      nodeY = node.absoluteBoundingBox.y;
    } else if ("absoluteTransform" in node && node.absoluteTransform) {
      nodeX = node.absoluteTransform[0][2];
      nodeY = node.absoluteTransform[1][2];
    } else if ("x" in node && "y" in node) {
      nodeX = node.x || 0;
      nodeY = node.y || 0;
    }
    if (container.absoluteBoundingBox) {
      contX = container.absoluteBoundingBox.x;
      contY = container.absoluteBoundingBox.y;
    } else if ("absoluteTransform" in container && container.absoluteTransform) {
      contX = container.absoluteTransform[0][2];
      contY = container.absoluteTransform[1][2];
    } else if ("x" in container && "y" in container) {
      contX = container.x || 0;
      contY = container.y || 0;
    }
    return {
      relY: nodeY - contY,
      relX: nodeX - contX
    };
  }
  function compareVisualSortScore(nodeA, nodeB, rootComponent) {
    if (!nodeA && !nodeB) return 0;
    if (!nodeA) return 1;
    if (!nodeB) return -1;
    const scoreA = getVisualSortScore(nodeA, rootComponent);
    const scoreB = getVisualSortScore(nodeB, rootComponent);
    if (Math.abs(scoreA.relY - scoreB.relY) > 8) {
      return scoreA.relY < scoreB.relY ? -1 : 1;
    }
    if (Math.abs(scoreA.relX - scoreB.relX) > 1e-3) {
      return scoreA.relX < scoreB.relX ? -1 : 1;
    }
    return 0;
  }

  // ../../../../plugins/components-setup/src/properties/rebuilder.ts
  function cleanRebuildComponentProperties(propertyHost, variants, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    let textPropsCount = 0;
    let instanceSwapPropsCount = 0;
    let booleanPropsCount = 0;
    let nestedInstancesCount = 0;
    if (variants.length === 0) {
      return { textPropsCount: 0, instanceSwapPropsCount: 0, booleanPropsCount: 0, nestedInstancesCount: 0 };
    }
    let primaryVariant = propertyHost;
    if (propertyHost.type === "COMPONENT_SET") {
      const compSet = propertyHost;
      primaryVariant = compSet.defaultVariant || variants[0] || compSet;
    } else if (variants.length > 0) {
      primaryVariant = variants[0];
    }
    const oldDefs = propertyHost.componentPropertyDefinitions || {};
    const existingBindingsByPropKey = /* @__PURE__ */ new Map();
    for (const variant of variants) {
      const scanBindings = (n) => {
        var _a2;
        if (isInsideSlot(n, variant)) return;
        if (isSlotContainer(n)) {
          if ("componentPropertyReferences" in n && ((_a2 = n.componentPropertyReferences) == null ? void 0 : _a2.slot)) {
            const slotRef = n.componentPropertyReferences.slot;
            if (!existingBindingsByPropKey.has(slotRef)) existingBindingsByPropKey.set(slotRef, []);
            existingBindingsByPropKey.get(slotRef).push({ node: n, refType: "slot" });
          }
          return;
        }
        if ("componentPropertyReferences" in n && n.componentPropertyReferences) {
          const refs = n.componentPropertyReferences;
          if (refs.visible) {
            if (!existingBindingsByPropKey.has(refs.visible)) existingBindingsByPropKey.set(refs.visible, []);
            existingBindingsByPropKey.get(refs.visible).push({ node: n, refType: "visible" });
          }
          if (refs.characters) {
            if (!existingBindingsByPropKey.has(refs.characters)) existingBindingsByPropKey.set(refs.characters, []);
            existingBindingsByPropKey.get(refs.characters).push({ node: n, refType: "characters" });
          }
          if (refs.mainComponent) {
            if (!existingBindingsByPropKey.has(refs.mainComponent)) existingBindingsByPropKey.set(refs.mainComponent, []);
            existingBindingsByPropKey.get(refs.mainComponent).push({ node: n, refType: "mainComponent" });
          }
          if (refs.slot) {
            const slotRef = refs.slot;
            if (!existingBindingsByPropKey.has(slotRef)) existingBindingsByPropKey.set(slotRef, []);
            existingBindingsByPropKey.get(slotRef).push({ node: n, refType: "slot" });
          }
        }
        if ("children" in n && Array.isArray(n.children)) {
          for (const ch of n.children) {
            scanBindings(ch);
          }
        }
      };
      scanBindings(variant);
    }
    const maxTextOccurrences = /* @__PURE__ */ new Map();
    for (const variant of variants) {
      const texts = collectDirectTextNodes(variant);
      const countInVariant = /* @__PURE__ */ new Map();
      for (const t of texts) {
        countInVariant.set(t.name, (countInVariant.get(t.name) || 0) + 1);
      }
      for (const [name, count] of countInVariant.entries()) {
        if (count > (maxTextOccurrences.get(name) || 0)) {
          maxTextOccurrences.set(name, count);
        }
      }
    }
    const maxInstanceOccurrences = /* @__PURE__ */ new Map();
    for (const variant of variants) {
      const instances = collectDirectInstances(variant);
      const countInVariant = /* @__PURE__ */ new Map();
      for (const inst of instances) {
        const cleanInfo = cleanInstancePropertyName(inst.name);
        countInVariant.set(cleanInfo.propName, (countInVariant.get(cleanInfo.propName) || 0) + 1);
      }
      for (const [name, count] of countInVariant.entries()) {
        if (count > (maxInstanceOccurrences.get(name) || 0)) {
          maxInstanceOccurrences.set(name, count);
        }
      }
    }
    const defsByGroup = {
      group3: /* @__PURE__ */ new Map(),
      group4: /* @__PURE__ */ new Map(),
      group5: /* @__PURE__ */ new Map(),
      group6: /* @__PURE__ */ new Map()
    };
    if ((options == null ? void 0 : options.enableText) !== false) {
      for (const variant of variants) {
        const texts = collectDirectTextNodes(variant);
        texts.sort((a, b) => compareVisualSortScore(a, b, variant));
        const nameIndex = /* @__PURE__ */ new Map();
        for (const textNode of texts) {
          if ((options == null ? void 0 : options.disabledTextNames) && (options.disabledTextNames.includes(textNode.name) || options.disabledTextNames.includes(textNode.id))) {
            continue;
          }
          const maxCount = maxTextOccurrences.get(textNode.name) || 1;
          let propName = textNode.name;
          if (maxCount > 1) {
            const idx = (nameIndex.get(textNode.name) || 0) + 1;
            nameIndex.set(textNode.name, idx);
            propName = `${textNode.name} ${idx}`;
          }
          if (!defsByGroup.group4.has(propName)) {
            defsByGroup.group4.set(propName, {
              name: propName,
              group: 4,
              type: "TEXT",
              defaultValue: propName,
              representativeNode: textNode,
              bindings: []
            });
          }
          const def = defsByGroup.group4.get(propName);
          if (variant === primaryVariant) {
            def.representativeNode = textNode;
            def.defaultValue = propName;
          }
          if (!def.bindings.some((b) => b.node === textNode && b.refType === "characters")) {
            def.bindings.push({ node: textNode, refType: "characters" });
          }
          const hasExistingTextVisibilityBinding = Boolean(
            textNode.componentPropertyReferences && textNode.componentPropertyReferences.visible
          );
          const allowTextVisibility = (options == null ? void 0 : options.enableTextVisibility) === true || hasExistingTextVisibilityBinding || (options == null ? void 0 : options.textVisibilityDecisions) && (options.textVisibilityDecisions[propName] === true || options.textVisibilityDecisions[textNode.name] === true || options.textVisibilityDecisions[textNode.id] === true);
          if (allowTextVisibility && (options == null ? void 0 : options.enableBoolean) !== false) {
            const textBoolPropName = propName.startsWith("Show") ? propName : `Show${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
            if (!defsByGroup.group3.has(textBoolPropName)) {
              defsByGroup.group3.set(textBoolPropName, {
                name: textBoolPropName,
                group: 3,
                type: "BOOLEAN",
                defaultValue: textNode.visible !== false,
                representativeNode: textNode,
                bindings: []
              });
            }
            const textBoolDef = defsByGroup.group3.get(textBoolPropName);
            if (variant === primaryVariant) {
              textBoolDef.representativeNode = textNode;
              textBoolDef.defaultValue = textNode.visible !== false;
            }
            if (!textBoolDef.bindings.some((b) => b.node === textNode && b.refType === "visible")) {
              textBoolDef.bindings.push({ node: textNode, refType: "visible" });
            }
          }
        }
      }
    }
    for (const variant of variants) {
      const instances = collectDirectInstances(variant);
      instances.sort((a, b) => compareVisualSortScore(a, b, variant));
      const instanceNameIndex = /* @__PURE__ */ new Map();
      for (const inst of instances) {
        if (isInsideSlot(inst, variant)) continue;
        const cleanInfo = cleanInstancePropertyName(inst.name);
        if (cleanInfo.isSlot || /slot/i.test(inst.name)) continue;
        const maxCount = maxInstanceOccurrences.get(cleanInfo.propName) || 1;
        let propBaseName = cleanInfo.propName;
        if (maxCount > 1) {
          const idx = (instanceNameIndex.get(cleanInfo.propName) || 0) + 1;
          instanceNameIndex.set(cleanInfo.propName, idx);
          propBaseName = `${cleanInfo.propName} ${idx}`;
        }
        const allowSwap = (options == null ? void 0 : options.enableInstanceSwap) !== false;
        const isSpecificSwapDisabled = ((_a = options == null ? void 0 : options.disabledInstanceSwapNames) == null ? void 0 : _a.some((n) => n.toLowerCase() === propBaseName.toLowerCase() || n.toLowerCase() === cleanInfo.propName.toLowerCase())) || (options == null ? void 0 : options.instanceSwapDecisions) && (options.instanceSwapDecisions[propBaseName] === false || options.instanceSwapDecisions[cleanInfo.propName] === false);
        const mainComp = inst.mainComponent;
        if (allowSwap && !isSpecificSwapDisabled && mainComp && mainComp.id) {
          if (!defsByGroup.group5.has(propBaseName)) {
            defsByGroup.group5.set(propBaseName, {
              name: propBaseName,
              group: 5,
              type: "INSTANCE_SWAP",
              defaultValue: mainComp.id,
              representativeNode: inst,
              bindings: []
            });
          }
          const swapDef = defsByGroup.group5.get(propBaseName);
          if (variant === primaryVariant) {
            swapDef.representativeNode = inst;
            swapDef.defaultValue = mainComp.id;
          }
          if (!swapDef.bindings.some((b) => b.node === inst && b.refType === "mainComponent")) {
            swapDef.bindings.push({ node: inst, refType: "mainComponent" });
          }
        }
        if ((options == null ? void 0 : options.enableBoolean) !== false) {
          const boolPropName = propBaseName.startsWith("Show") ? propBaseName : `Show${propBaseName.charAt(0).toUpperCase() + propBaseName.slice(1)}`;
          if (!defsByGroup.group3.has(boolPropName)) {
            defsByGroup.group3.set(boolPropName, {
              name: boolPropName,
              group: 3,
              type: "BOOLEAN",
              defaultValue: inst.visible !== false,
              representativeNode: inst,
              bindings: []
            });
          }
          const boolDef = defsByGroup.group3.get(boolPropName);
          if (variant === primaryVariant) {
            boolDef.representativeNode = inst;
            boolDef.defaultValue = inst.visible !== false;
          }
          if (!boolDef.bindings.some((b) => b.node === inst && b.refType === "visible")) {
            boolDef.bindings.push({ node: inst, refType: "visible" });
          }
        }
        const explicitNestedDecision = (_h = (_f = (_d = (_b = options == null ? void 0 : options.nestedInstanceDecisions) == null ? void 0 : _b[propBaseName]) != null ? _d : (_c = options == null ? void 0 : options.nestedInstanceDecisions) == null ? void 0 : _c[cleanInfo.propName]) != null ? _f : (_e = options == null ? void 0 : options.nestedInstanceDecisions) == null ? void 0 : _e[inst.name]) != null ? _h : (_g = options == null ? void 0 : options.nestedInstanceDecisions) == null ? void 0 : _g[inst.id];
        const shouldExposeNested = explicitNestedDecision !== void 0 ? Boolean(explicitNestedDecision) : (options == null ? void 0 : options.enableNestedInstances) === true ? !isIconInstanceNode(inst) : Boolean(inst.isExposedInstance);
        try {
          const wasAlreadyExposed = Boolean(inst.isExposedInstance);
          if (wasAlreadyExposed !== shouldExposeNested) {
            inst.isExposedInstance = shouldExposeNested;
            if (shouldExposeNested && variant === primaryVariant) {
              nestedInstancesCount++;
            }
          }
        } catch (_) {
        }
      }
      const slotsInVariant = findDirectSlotContainers(variant);
      for (const slotContainer of slotsInVariant) {
        if ("children" in slotContainer && Array.isArray(slotContainer.children)) {
          for (const ch of slotContainer.children) {
            if (ch.type === "INSTANCE") {
              const slotInst = ch;
              const shouldExposeSlotInst = (options == null ? void 0 : options.enableNestedInstances) === true ? !isIconInstanceNode(slotInst) : Boolean(slotInst.isExposedInstance);
              try {
                const wasAlreadyExposed = Boolean(slotInst.isExposedInstance);
                if (wasAlreadyExposed !== shouldExposeSlotInst) {
                  slotInst.isExposedInstance = shouldExposeSlotInst;
                  if (shouldExposeSlotInst && variant === primaryVariant) {
                    nestedInstancesCount++;
                  }
                }
              } catch (_) {
              }
            }
          }
        }
      }
    }
    if ((options == null ? void 0 : options.enableSlotExtract) !== false) {
      for (const variant of variants) {
        const vSlots = findDirectSlotContainers(variant);
        for (const sf of vSlots) {
          sanitizeSlotFrame(sf, sf.parent);
        }
        if (vSlots.length === 1) {
          vSlots[0].name = "Slot";
        } else if (vSlots.length > 1) {
          vSlots.sort((a, b) => compareVisualSortScore(a, b, variant));
          vSlots.forEach((s, idx) => {
            s.name = idx === 0 ? "Slot" : `Slot ${idx + 1}`;
          });
        }
      }
      for (const variant of variants) {
        const slots = findDirectSlotContainers(variant);
        slots.sort((a, b) => compareVisualSortScore(a, b, variant));
        const slotNameIndex = /* @__PURE__ */ new Map();
        for (const slotFrame of slots) {
          sanitizeSlotFrame(slotFrame, slotFrame.parent);
          const rawName = slotFrame.name.trim();
          const baseSlotName = rawName || "Slot";
          let propName = baseSlotName;
          const countMatching = slots.filter((s) => s.name.trim().toLowerCase() === baseSlotName.toLowerCase()).length;
          if (countMatching > 1) {
            const idx = (slotNameIndex.get(baseSlotName) || 0) + 1;
            slotNameIndex.set(baseSlotName, idx);
            propName = `${baseSlotName} ${idx}`;
          }
          if (!defsByGroup.group6.has(propName)) {
            defsByGroup.group6.set(propName, {
              name: propName,
              group: 6,
              type: "SLOT",
              representativeNode: slotFrame,
              bindings: []
            });
          }
          const slotDef = defsByGroup.group6.get(propName);
          if (variant === primaryVariant) {
            slotDef.representativeNode = slotFrame;
          }
          if (!slotDef.bindings.some((b) => b.node === slotFrame && b.refType === "slot")) {
            slotDef.bindings.push({ node: slotFrame, refType: "slot" });
          }
        }
      }
    }
    const isDisallowedProp = (name, type) => {
      const lower = name.toLowerCase().replace(/[\s_#\d-]+/g, "");
      if (lower === "showslot" || lower.startsWith("showslot")) return true;
      if (lower === "slot" && type !== "SLOT") return true;
      if (lower === "showitem" || lower.startsWith("showitem")) return true;
      if (lower === "item" && (type === "INSTANCE_SWAP" || type === "BOOLEAN")) return true;
      return false;
    };
    for (const key of Object.keys(oldDefs)) {
      const oldDef = oldDefs[key];
      if (!oldDef || oldDef.type === "VARIANT" || oldDef.type === "SLOT") continue;
      const cleanName = key.split("#")[0].trim();
      if (isDisallowedProp(cleanName, oldDef.type)) continue;
      const bindings = (existingBindingsByPropKey.get(key) || []).filter((b) => !isInsideSlot(b.node, primaryVariant));
      if (bindings.length === 0) continue;
      const repNode = ((_i = bindings.find((b) => primaryVariant === propertyHost || !b.node.parent || b.node.id.startsWith(primaryVariant.id.split(";")[0]))) == null ? void 0 : _i.node) || bindings[0].node;
      if (isInsideSlot(repNode, primaryVariant)) continue;
      if (oldDef.type === "BOOLEAN") {
        if (!defsByGroup.group3.has(cleanName)) {
          defsByGroup.group3.set(cleanName, {
            name: cleanName,
            group: 3,
            type: "BOOLEAN",
            defaultValue: Boolean(oldDef.defaultValue),
            representativeNode: repNode,
            bindings
          });
        } else {
          const existing = defsByGroup.group3.get(cleanName);
          existing.defaultValue = Boolean(oldDef.defaultValue);
        }
      } else if (oldDef.type === "TEXT") {
        if (!defsByGroup.group4.has(cleanName)) {
          defsByGroup.group4.set(cleanName, {
            name: cleanName,
            group: 4,
            type: "TEXT",
            defaultValue: cleanName,
            representativeNode: repNode,
            bindings
          });
        } else {
          const existing = defsByGroup.group4.get(cleanName);
          existing.defaultValue = existing.name;
        }
      } else if (oldDef.type === "INSTANCE_SWAP") {
        if (!defsByGroup.group5.has(cleanName)) {
          defsByGroup.group5.set(cleanName, {
            name: cleanName,
            group: 5,
            type: "INSTANCE_SWAP",
            defaultValue: String(oldDef.defaultValue),
            preferredValues: oldDef.preferredValues,
            representativeNode: repNode,
            bindings
          });
        } else {
          const existing = defsByGroup.group5.get(cleanName);
          if (oldDef.preferredValues && !existing.preferredValues) {
            existing.preferredValues = oldDef.preferredValues;
          }
        }
      }
    }
    const sortGroup = (map) => {
      const list = Array.from(map.values());
      list.sort((a, b) => {
        if (a.representativeNode && b.representativeNode) {
          return compareVisualSortScore(a.representativeNode, b.representativeNode, primaryVariant);
        }
        if (a.representativeNode) return -1;
        if (b.representativeNode) return 1;
        return a.name.localeCompare(b.name);
      });
      return list;
    };
    const sortedGroup3 = sortGroup(defsByGroup.group3);
    const sortedGroup4 = sortGroup(defsByGroup.group4);
    const sortedGroup5 = sortGroup(defsByGroup.group5);
    const sortedGroup6 = sortGroup(defsByGroup.group6);
    const fullSortedList = [...sortedGroup3, ...sortedGroup4, ...sortedGroup5, ...sortedGroup6];
    const existingPropKeysByNameAndType = /* @__PURE__ */ new Map();
    const currentNonVariantOrder = [];
    for (const key of Object.keys(oldDefs)) {
      const d = oldDefs[key];
      if (!d || d.type === "VARIANT") continue;
      const clean = key.split("#")[0].trim().toLowerCase();
      existingPropKeysByNameAndType.set(`${d.type}:${clean}`, key);
      currentNonVariantOrder.push({ type: d.type, name: clean });
    }
    const usedPropNamesCheck = /* @__PURE__ */ new Set();
    const targetNonVariantOrder = [];
    for (const def of fullSortedList) {
      let fname = def.name;
      let cnt = 1;
      while (usedPropNamesCheck.has(fname.toLowerCase())) {
        cnt++;
        fname = `${def.name} ${cnt}`;
      }
      usedPropNamesCheck.add(fname.toLowerCase());
      targetNonVariantOrder.push({ type: def.type, name: fname.toLowerCase() });
    }
    const isOrderAlreadyExact = currentNonVariantOrder.length === targetNonVariantOrder.length && currentNonVariantOrder.every(
      (item, idx) => item.type === targetNonVariantOrder[idx].type && item.name === targetNonVariantOrder[idx].name
    );
    if (!isOrderAlreadyExact) {
      for (const key of Object.keys(oldDefs)) {
        const d = oldDefs[key];
        if (d && d.type !== "VARIANT" && d.type !== "SLOT") {
          try {
            propertyHost.deleteComponentProperty(key);
          } catch (delErr) {
            console.warn(`[AutoProps] Could not delete property ${key} on ${propertyHost.name}:`, delErr);
          }
        }
      }
      existingPropKeysByNameAndType.clear();
    }
    const usedPropNames = /* @__PURE__ */ new Set();
    const usedSlotKeys = /* @__PURE__ */ new Set();
    const usedExistingKeys = /* @__PURE__ */ new Set();
    for (const def of fullSortedList) {
      let finalPropName = def.name;
      let counter = 1;
      while (usedPropNames.has(finalPropName.toLowerCase())) {
        counter++;
        finalPropName = `${def.name} ${counter}`;
      }
      usedPropNames.add(finalPropName.toLowerCase());
      let newKey = null;
      const existingMatchedKey = existingPropKeysByNameAndType.get(`${def.type}:${finalPropName.toLowerCase()}`);
      try {
        if (existingMatchedKey && !usedExistingKeys.has(existingMatchedKey) && def.type !== "SLOT") {
          newKey = existingMatchedKey;
          usedExistingKeys.add(existingMatchedKey);
          if (def.type === "TEXT" && propertyHost.editComponentProperty) {
            const curDef = (propertyHost.componentPropertyDefinitions || {})[newKey];
            if (curDef && String(curDef.defaultValue) !== finalPropName) {
              try {
                propertyHost.editComponentProperty(newKey, { defaultValue: finalPropName });
              } catch (_) {
              }
            }
          }
        } else if (def.type === "BOOLEAN") {
          newKey = propertyHost.addComponentProperty(finalPropName, "BOOLEAN", Boolean(def.defaultValue));
          booleanPropsCount++;
        } else if (def.type === "TEXT") {
          newKey = propertyHost.addComponentProperty(finalPropName, "TEXT", finalPropName);
          textPropsCount++;
        } else if (def.type === "INSTANCE_SWAP") {
          newKey = propertyHost.addComponentProperty(
            finalPropName,
            "INSTANCE_SWAP",
            String(def.defaultValue),
            def.preferredValues ? { preferredValues: def.preferredValues } : void 0
          );
          instanceSwapPropsCount++;
        } else if (def.type === "SLOT") {
          const currentDefs = propertyHost.componentPropertyDefinitions || {};
          let matchedKey = Object.keys(currentDefs).find((k) => {
            if (usedSlotKeys.has(k)) return false;
            const d = currentDefs[k];
            if (!d || d.type !== "SLOT") return false;
            const clean = k.split("#")[0].trim().toLowerCase();
            return clean === finalPropName.toLowerCase();
          });
          if (!matchedKey) {
            matchedKey = Object.keys(currentDefs).find((k) => {
              if (usedSlotKeys.has(k)) return false;
              const d = currentDefs[k];
              return d && d.type === "SLOT";
            });
            if (matchedKey && propertyHost.editComponentProperty) {
              try {
                propertyHost.editComponentProperty(matchedKey, { name: finalPropName });
              } catch (_) {
              }
            }
          }
          if (matchedKey) {
            newKey = matchedKey;
          } else {
            try {
              newKey = propertyHost.addComponentProperty(finalPropName, "SLOT", "");
            } catch (e1) {
              try {
                newKey = propertyHost.addComponentProperty(finalPropName, "SLOT");
              } catch (e2) {
                console.warn(`[AutoProps] Failed to addComponentProperty SLOT "${finalPropName}":`, e2);
              }
            }
          }
          if (newKey) {
            usedSlotKeys.add(newKey);
            usedExistingKeys.add(newKey);
          }
        }
      } catch (addErr) {
        console.warn(`[AutoProps] Failed to addComponentProperty "${finalPropName}" on ${propertyHost.name}:`, addErr);
      }
      if (newKey) {
        for (const binding of def.bindings) {
          try {
            if (binding.refType === "characters" && binding.node.type === "TEXT") {
              const textNode = binding.node;
              if (textNode.characters !== finalPropName) {
                syncSetCharacters(textNode, finalPropName);
              }
            }
            if (binding.refType === "slot") {
              sanitizeSlotFrame(binding.node, binding.node.parent);
              const currentSlotRef = ((_j = binding.node.componentPropertyReferences) == null ? void 0 : _j.slot) || ((_k = binding.node.componentPropertyReferences) == null ? void 0 : _k.mainComponent);
              if (currentSlotRef !== newKey) {
                try {
                  binding.node.componentPropertyReferences = {
                    ...binding.node.componentPropertyReferences || {},
                    slot: newKey
                  };
                } catch (err1) {
                  try {
                    binding.node.componentPropertyReferences = {
                      ...binding.node.componentPropertyReferences || {},
                      mainComponent: newKey
                    };
                  } catch (err2) {
                    console.warn(`[AutoProps] Could not set slot reference on ${binding.node.name}:`, err2);
                  }
                }
              }
            } else {
              const currentRef = (_l = binding.node.componentPropertyReferences) == null ? void 0 : _l[binding.refType];
              if (currentRef !== newKey) {
                binding.node.componentPropertyReferences = {
                  ...binding.node.componentPropertyReferences || {},
                  [binding.refType]: newKey
                };
              }
            }
          } catch (bindErr) {
            console.warn(`[AutoProps] Could not set ${binding.refType} reference on ${binding.node.name}:`, bindErr);
          }
        }
      }
    }
    const postDefs = propertyHost.componentPropertyDefinitions || {};
    for (const k of Object.keys(postDefs)) {
      const d = postDefs[k];
      if (!d || d.type === "VARIANT") continue;
      if (d.type === "SLOT") {
        if (!usedSlotKeys.has(k)) {
          try {
            propertyHost.deleteComponentProperty(k);
          } catch (delSlotErr) {
            console.warn(`[AutoProps] Could not delete redundant slot property ${k} on ${propertyHost.name}:`, delSlotErr);
          }
        }
      } else if (!usedExistingKeys.has(k)) {
        const clean = k.split("#")[0].trim().toLowerCase();
        if (!usedPropNames.has(clean)) {
          try {
            propertyHost.deleteComponentProperty(k);
          } catch (delErr) {
            console.warn(`[AutoProps] Could not delete obsolete property ${k} on ${propertyHost.name}:`, delErr);
          }
        }
      }
    }
    return { textPropsCount, instanceSwapPropsCount, booleanPropsCount, nestedInstancesCount };
  }

  // ../../../../plugins/components-setup/src/components/canvas.ts
  function reorderComponentSetVariants(compSet) {
    const variants = compSet.children.filter((c) => c.type === "COMPONENT");
    if (variants.length === 0) return;
    const keyValuesMap = /* @__PURE__ */ new Map();
    const keyOrder = [];
    for (const v of variants) {
      const rawPairs = v.name.split(",").map((s) => s.trim()).filter(Boolean);
      for (const pair of rawPairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx !== -1) {
          const key = pair.slice(0, eqIdx).trim();
          const val = pair.slice(eqIdx + 1).trim();
          if (!keyValuesMap.has(key)) {
            keyValuesMap.set(key, /* @__PURE__ */ new Set());
            keyOrder.push(key);
          }
          keyValuesMap.get(key).add(val);
        }
      }
    }
    if (keyOrder.length <= 1) return;
    const isBoolValue = (v) => /^(true|false|yes|no|on|off)$/i.test(v.trim());
    const group1Keys = [];
    const group2Keys = [];
    for (const key of keyOrder) {
      const values = keyValuesMap.get(key);
      if (!values || values.size === 0) {
        group1Keys.push(key);
        continue;
      }
      const allBool = Array.from(values).every((v) => isBoolValue(v));
      if (allBool) {
        group2Keys.push(key);
      } else {
        group1Keys.push(key);
      }
    }
    const targetKeyOrder = [...group1Keys, ...group2Keys];
    for (const v of variants) {
      const rawPairs = v.name.split(",").map((s) => s.trim()).filter(Boolean);
      const pairMap = /* @__PURE__ */ new Map();
      for (const pair of rawPairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx !== -1) {
          const key = pair.slice(0, eqIdx).trim();
          const val = pair.slice(eqIdx + 1).trim();
          pairMap.set(key, val);
        }
      }
      const reorderedPairs = [];
      for (const key of targetKeyOrder) {
        if (pairMap.has(key)) {
          reorderedPairs.push(`${key}=${pairMap.get(key)}`);
        }
      }
      for (const [k, val] of pairMap.entries()) {
        if (!targetKeyOrder.includes(k)) {
          reorderedPairs.push(`${k}=${val}`);
        }
      }
      const newName = reorderedPairs.join(", ");
      if (newName && newName !== v.name) {
        v.name = newName;
      }
    }
  }
  async function organizeElementsOnCanvas(forceAll = false) {
    const selection = figma.currentPage.selection;
    let nodes = [];
    if (!forceAll && selection.length > 1) {
      nodes = Array.from(selection);
    } else {
      nodes = figma.currentPage.children.filter(
        (n) => !n.locked && "x" in n && "y" in n && "width" in n && "height" in n
      );
    }
    if (nodes.length === 0) {
      figma.notify("No elements found to arrange on canvas.", { error: true });
      return;
    }
    let startX = Math.min(...nodes.map((n) => n.x));
    let startY = Math.min(...nodes.map((n) => n.y));
    if (!isFinite(startX)) startX = 0;
    if (!isFinite(startY)) startY = 0;
    const groupsMap = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const rawName = (node.name || "").trim();
      const slashIndex = rawName.indexOf("/");
      const groupName = slashIndex !== -1 ? rawName.substring(0, slashIndex).trim() : rawName;
      const normalizedKey = groupName.toLowerCase();
      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, { displayKey: groupName, items: [] });
      }
      groupsMap.get(normalizedKey).items.push(node);
    }
    const sortedGroups = Array.from(groupsMap.values()).sort(
      (a, b) => a.displayKey.localeCompare(b.displayKey, void 0, { numeric: true, sensitivity: "base" })
    );
    for (const grp of sortedGroups) {
      grp.items.sort(
        (a, b) => (a.name || "").localeCompare(b.name || "", void 0, { numeric: true, sensitivity: "base" })
      );
    }
    const GAP_X = 272;
    const GAP_Y = 272;
    let currentX = startX;
    for (const grp of sortedGroups) {
      const columnWidth = Math.max(...grp.items.map((n) => n.width || 0), 0);
      let currentY = startY;
      for (const item of grp.items) {
        try {
          item.x = currentX;
          item.y = currentY;
        } catch (err) {
          console.warn(`Could not set position for "${item.name}":`, err);
        }
        currentY += (item.height || 0) + GAP_Y;
      }
      currentX += columnWidth + GAP_X;
    }
    figma.viewport.scrollAndZoomIntoView(nodes);
    function collapseContainers(node) {
      if ("expanded" in node) {
        try {
          node.expanded = false;
        } catch (err) {
        }
      }
      if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          collapseContainers(child);
        }
      }
    }
    collapseContainers(figma.currentPage);
    figma.currentPage.selection = [];
    await sendSelectionToUI();
    figma.notify(`Arranged ${nodes.length} element${nodes.length > 1 ? "s" : ""} in ${sortedGroups.length} column group${sortedGroups.length > 1 ? "s" : ""} & collapsed layers! \u{1F4D0}`);
  }
  function isLibraryComponentsPage(page = figma.currentPage) {
    const TARGET_PAGE_NAME = "    \u{1F537} Components";
    if (page.name === TARGET_PAGE_NAME) return true;
    const clean = page.name.trim().toLowerCase();
    if (clean === "\u{1F537} components" || clean === "\u{1F537}components" || clean === "components" || clean === "component") {
      return true;
    }
    return clean.includes("\u{1F537}") && clean.includes("component");
  }
  function getOrCreateTargetPage(pageType = "components") {
    const isScreens = pageType === "screens";
    const TARGET_PAGE_NAME = isScreens ? "    \u{1F537} screens" : "    \u{1F537} Components";
    let targetPage = figma.root.children.find((p) => p.name === TARGET_PAGE_NAME);
    if (!targetPage) {
      const targetTrimmed = isScreens ? "\u{1F537} screens" : "\u{1F537} components";
      const targetNoSpace = isScreens ? "\u{1F537}screens" : "\u{1F537}components";
      targetPage = figma.root.children.find((p) => {
        const clean = p.name.trim().toLowerCase();
        return clean === targetTrimmed || clean === targetNoSpace;
      });
    }
    if (!targetPage) {
      const keyword = isScreens ? "screen" : "component";
      targetPage = figma.root.children.find((p) => {
        const lower = p.name.toLowerCase();
        return lower.includes("\u{1F537}") && lower.includes(keyword);
      });
    }
    if (!targetPage) {
      targetPage = figma.root.children.find((p) => {
        const clean = p.name.trim().toLowerCase();
        return isScreens ? clean === "screens" || clean === "screen" : clean === "components" || clean === "component";
      });
    }
    if (!targetPage) {
      targetPage = figma.createPage();
      targetPage.name = TARGET_PAGE_NAME;
    } else if (targetPage.name !== TARGET_PAGE_NAME) {
      targetPage.name = TARGET_PAGE_NAME;
    }
    return targetPage;
  }
  async function moveSelectedToComponentsPage() {
    if (typeof figma.loadAllPagesAsync === "function") {
      await figma.loadAllPagesAsync();
    }
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Please select a Component or Component Set to move.", { error: true });
      return;
    }
    const nodesToMove = /* @__PURE__ */ new Set();
    for (const node of selection) {
      let curr = node;
      let enclosingCompSet = null;
      let enclosingComp = null;
      while (curr && curr.type !== "PAGE") {
        if (curr.type === "COMPONENT_SET") {
          enclosingCompSet = curr;
          break;
        }
        if (curr.type === "COMPONENT" && !enclosingComp) {
          enclosingComp = curr;
        }
        curr = curr.parent;
      }
      if (enclosingCompSet) {
        nodesToMove.add(enclosingCompSet);
      } else if (enclosingComp) {
        nodesToMove.add(enclosingComp);
      } else {
        nodesToMove.add(node);
      }
    }
    if (nodesToMove.size === 0) {
      figma.notify("No element found in selection to move.", { error: true });
      return;
    }
    const componentsTargetPage = getOrCreateTargetPage("components");
    const nodesToTransfer = [];
    for (const node of nodesToMove) {
      let nodePage = node;
      while (nodePage && nodePage.type !== "PAGE") {
        nodePage = nodePage.parent;
      }
      if (nodePage && nodePage.id === componentsTargetPage.id) {
        continue;
      }
      nodesToTransfer.push(node);
    }
    if (nodesToTransfer.length === 0) {
      figma.notify("Selected element(s) are already on the components page! \u2139\uFE0F");
      figma.currentPage = componentsTargetPage;
      await organizeElementsOnCanvas(true);
      return;
    }
    for (const nodeToMove of nodesToTransfer) {
      if (nodeToMove.type === "COMPONENT" || nodeToMove.type === "COMPONENT_SET") {
        try {
          const originalParent = nodeToMove.parent;
          if (originalParent && "children" in originalParent) {
            const originalIndex = originalParent.children.indexOf(nodeToMove);
            const originalX = nodeToMove.x;
            const originalY = nodeToMove.y;
            const originalWidth = nodeToMove.width;
            const originalHeight = nodeToMove.height;
            const originalName = nodeToMove.name;
            let instance = null;
            if (nodeToMove.type === "COMPONENT") {
              instance = nodeToMove.createInstance();
            } else if (nodeToMove.type === "COMPONENT_SET") {
              const compSet = nodeToMove;
              const comp = compSet.defaultVariant || compSet.children.find((c) => c.type === "COMPONENT");
              if (comp) {
                instance = comp.createInstance();
              }
            }
            if (instance) {
              if ("insertChild" in originalParent && originalIndex !== -1) {
                originalParent.insertChild(originalIndex, instance);
              } else if ("appendChild" in originalParent) {
                originalParent.appendChild(instance);
              }
              instance.x = originalX;
              instance.y = originalY;
              try {
                instance.resize(originalWidth, originalHeight);
              } catch (e) {
              }
              if ("layoutPositioning" in nodeToMove && "layoutPositioning" in instance) {
                try {
                  instance.layoutPositioning = nodeToMove.layoutPositioning;
                } catch (e) {
                }
              }
              if ("layoutAlign" in nodeToMove && "layoutAlign" in instance) {
                try {
                  instance.layoutAlign = nodeToMove.layoutAlign;
                } catch (e) {
                }
              }
              if ("layoutGrow" in nodeToMove && "layoutGrow" in instance) {
                try {
                  instance.layoutGrow = nodeToMove.layoutGrow;
                } catch (e) {
                }
              }
              if ("constraints" in nodeToMove && "constraints" in instance) {
                try {
                  instance.constraints = nodeToMove.constraints;
                } catch (e) {
                }
              }
              if ("rotation" in nodeToMove && "rotation" in instance) {
                try {
                  instance.rotation = nodeToMove.rotation;
                } catch (e) {
                }
              }
              if ("opacity" in nodeToMove && "opacity" in instance) {
                try {
                  instance.opacity = nodeToMove.opacity;
                } catch (e) {
                }
              }
              if ("visible" in nodeToMove && "visible" in instance) {
                try {
                  instance.visible = nodeToMove.visible;
                } catch (e) {
                }
              }
              instance.name = originalName;
            }
          }
        } catch (instErr) {
          console.warn(`Could not leave instance for "${nodeToMove.name}":`, instErr);
        }
      }
    }
    figma.currentPage = componentsTargetPage;
    let totalMoved = 0;
    const allSuccessfullyMoved = [];
    for (const nodeToMove of nodesToTransfer) {
      try {
        componentsTargetPage.appendChild(nodeToMove);
        totalMoved++;
        allSuccessfullyMoved.push(nodeToMove);
      } catch (err) {
        console.error(`Could not move "${nodeToMove.name}" to "${componentsTargetPage.name}":`, err);
        figma.notify(`Could not move "${nodeToMove.name}": ${err.message || err}`, { error: true });
      }
    }
    await organizeElementsOnCanvas(true);
    const selectionOnPage = allSuccessfullyMoved.filter(
      (n) => n.parent && n.parent.id === componentsTargetPage.id
    );
    if (selectionOnPage.length > 0) {
      figma.currentPage.selection = selectionOnPage;
      figma.viewport.scrollAndZoomIntoView(selectionOnPage);
    }
    await sendSelectionToUI();
    figma.notify(`Moved ${totalMoved} element${totalMoved > 1 ? "s" : ""} to "    \u{1F537} Components" & arranged grid! \u{1F680}\u{1F4D0}`);
  }

  // ../../../../plugins/components-setup/src/properties/sanitizer.ts
  function collectComponentTargets(nodes) {
    const targets = /* @__PURE__ */ new Set();
    function addComponentWithRelations(comp) {
      targets.add(comp);
      if (comp.parent && comp.parent.type === "COMPONENT_SET") {
        targets.add(comp.parent);
        for (const sibling of comp.parent.children) {
          if (sibling.type === "COMPONENT") {
            targets.add(sibling);
          }
        }
      }
    }
    function addComponentSetWithRelations(compSet) {
      targets.add(compSet);
      for (const child of compSet.children) {
        if (child.type === "COMPONENT") {
          targets.add(child);
        }
      }
    }
    function inspectNode(node) {
      if (!node) return;
      if (node.type === "COMPONENT_SET") {
        addComponentSetWithRelations(node);
      } else if (node.type === "COMPONENT") {
        addComponentWithRelations(node);
      } else if (node.type === "INSTANCE") {
        const main = node.mainComponent;
        if (main) {
          addComponentWithRelations(main);
        }
      }
      let curr = node.parent;
      while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
        if (curr.type === "COMPONENT_SET") {
          addComponentSetWithRelations(curr);
          break;
        } else if (curr.type === "COMPONENT") {
          addComponentWithRelations(curr);
          break;
        } else if (curr.type === "INSTANCE") {
          const main = curr.mainComponent;
          if (main) {
            addComponentWithRelations(main);
          }
          break;
        }
        curr = curr.parent;
      }
      if ("children" in node && (node.type === "FRAME" || node.type === "SECTION" || node.type === "GROUP")) {
        for (const child of node.children) {
          inspectNode(child);
        }
      }
    }
    for (const n of nodes) {
      inspectNode(n);
    }
    return targets;
  }
  async function resolveComponentSetConflicts(compSet) {
    var _a;
    if (!compSet || compSet.type !== "COMPONENT_SET") return 0;
    const variants = compSet.children.filter((c) => c.type === "COMPONENT");
    if (variants.length <= 1) return 0;
    let resolvedCount = 0;
    function parseVariantProps(name) {
      const rawParts = (name || "").split(",").map((p) => p.trim()).filter((p) => p.length > 0);
      if (rawParts.length === 0) {
        return [{ rawKey: "Type", rawVal: "Default", normKey: "type", normVal: "default" }];
      }
      return rawParts.map((part) => {
        const eqIdx = part.indexOf("=");
        let k = "Type";
        let v = part;
        if (eqIdx !== -1) {
          k = part.substring(0, eqIdx).trim();
          v = part.substring(eqIdx + 1).trim();
        }
        if (/^property\s*\d+$/i.test(k)) {
          k = "Type";
        }
        return {
          rawKey: k || "Type",
          rawVal: v || "Default",
          normKey: (k || "Type").toLowerCase(),
          normVal: (v || "Default").toLowerCase()
        };
      });
    }
    const allPropertyKeys = [];
    const allPropertyKeysLower = /* @__PURE__ */ new Set();
    try {
      const defs = compSet.componentPropertyDefinitions;
      if (defs) {
        for (const propKey of Object.keys(defs)) {
          if (((_a = defs[propKey]) == null ? void 0 : _a.type) === "VARIANT") {
            const rawName = propKey.split("#")[0].trim();
            const cleanName = /^property\s*\d+$/i.test(rawName) ? "Type" : rawName;
            if (!allPropertyKeysLower.has(cleanName.toLowerCase())) {
              allPropertyKeysLower.add(cleanName.toLowerCase());
              allPropertyKeys.push(cleanName);
            }
          }
        }
      }
    } catch (e) {
    }
    const variantParsedList = [];
    for (const v of variants) {
      const parsed = parseVariantProps(v.name);
      for (const p of parsed) {
        if (!allPropertyKeysLower.has(p.normKey)) {
          allPropertyKeysLower.add(p.normKey);
          allPropertyKeys.push(p.rawKey);
        }
      }
      variantParsedList.push({ variant: v, props: parsed });
    }
    if (allPropertyKeys.length === 0) {
      allPropertyKeys.push("Type");
    }
    for (const item of variantParsedList) {
      const existingKeys = new Set(item.props.map((p) => p.normKey));
      for (const expectedKey of allPropertyKeys) {
        if (!existingKeys.has(expectedKey.toLowerCase())) {
          item.props.push({
            rawKey: expectedKey,
            rawVal: "Default",
            normKey: expectedKey.toLowerCase(),
            normVal: "default"
          });
        }
      }
    }
    function makeSignature(props) {
      return props.slice().sort((a, b) => a.normKey.localeCompare(b.normKey)).map((p) => `${p.normKey}=${p.normVal}`).join("|");
    }
    const seenSignatures = /* @__PURE__ */ new Map();
    for (const item of variantParsedList) {
      let sig = makeSignature(item.props);
      if (seenSignatures.has(sig)) {
        const count = (seenSignatures.get(sig) || 1) + 1;
        seenSignatures.set(sig, count);
        const targetProp = item.props[item.props.length - 1];
        const baseVal = targetProp.rawVal.replace(/\s+\d+$/, "").trim() || "Variant";
        let counter = count;
        let newRawVal = `${baseVal} ${counter}`;
        targetProp.rawVal = newRawVal;
        targetProp.normVal = newRawVal.toLowerCase();
        sig = makeSignature(item.props);
        while (seenSignatures.has(sig)) {
          counter++;
          newRawVal = `${baseVal} ${counter}`;
          targetProp.rawVal = newRawVal;
          targetProp.normVal = newRawVal.toLowerCase();
          sig = makeSignature(item.props);
        }
        seenSignatures.set(sig, 1);
        const newName = item.props.map((p) => `${p.rawKey}=${p.rawVal}`).join(", ");
        try {
          if (item.variant.name !== newName) {
            item.variant.name = newName;
            resolvedCount++;
          }
        } catch (err) {
          console.warn(`Could not set unique name on variant "${item.variant.name}":`, err);
        }
      } else {
        seenSignatures.set(sig, 1);
        const expectedName = item.props.map((p) => `${p.rawKey}=${p.rawVal}`).join(", ");
        if (item.variant.name !== expectedName && item.props.length > 1) {
          try {
            item.variant.name = expectedName;
          } catch (e) {
          }
        }
      }
    }
    return resolvedCount;
  }
  async function sanitizeComponentProperties(root) {
    if (!root) return 0;
    const nodes = Array.isArray(root) ? root : [root];
    const targets = collectComponentTargets(nodes);
    let totalRenamed = 0;
    for (const target of targets) {
      if (!target) continue;
      try {
        if (target.type === "COMPONENT_SET") {
          const compSet = target;
          try {
            await resolveComponentSetConflicts(compSet);
          } catch (errConflicts) {
            console.warn("resolveComponentSetConflicts error:", errConflicts);
          }
          const seenNames = /* @__PURE__ */ new Set();
          for (const child of compSet.children) {
            if (child.type === "COMPONENT" && child.name) {
              const parts = child.name.split(",").map((part) => {
                const eqIdx = part.indexOf("=");
                if (eqIdx === -1) {
                  return toPascalCase(part.trim());
                }
                const k = part.substring(0, eqIdx).trim();
                const v = part.substring(eqIdx + 1).trim();
                const pascalK = /^property\s*\d+$/i.test(k) ? "Type" : toPascalCase(k);
                const pascalV = toPascalCase(v);
                return pascalK ? `${pascalK}=${pascalV}` : `${k}=${pascalV}`;
              });
              let newName = parts.join(", ");
              if (seenNames.has(newName.toLowerCase())) {
                let counter = 2;
                let candidate = `${newName} ${counter}`;
                while (seenNames.has(candidate.toLowerCase())) {
                  counter++;
                  candidate = `${newName} ${counter}`;
                }
                newName = candidate;
              }
              seenNames.add(newName.toLowerCase());
              if (child.name !== newName) {
                try {
                  child.name = newName;
                  totalRenamed++;
                } catch (errChildName) {
                  console.warn(`Could not set child name to "${newName}":`, errChildName);
                }
              }
            }
          }
          try {
            reorderComponentSetVariants(compSet);
          } catch (errReorder) {
            console.warn("reorderComponentSetVariants error:", errReorder);
          }
        }
        if (typeof target.editComponentProperty === "function") {
          if (target.type === "COMPONENT" && target.parent && target.parent.type === "COMPONENT_SET") {
            continue;
          }
          let changed = true;
          let iterations = 0;
          while (changed && iterations < 30) {
            changed = false;
            iterations++;
            const defs = target.componentPropertyDefinitions;
            if (!defs) break;
            for (const propKey of Object.keys(defs)) {
              const def = defs[propKey];
              const rawName = propKey.split("#")[0].trim();
              const pascalName = /^property\s*\d+$/i.test(rawName) ? "Type" : toPascalCase(rawName);
              const needsNameChange = pascalName && pascalName !== rawName;
              let needsValueChange = false;
              let pascalDefaultValue = void 0;
              if (def.type === "VARIANT" && typeof def.defaultValue === "string") {
                const val = toPascalCase(def.defaultValue);
                if (val && val !== def.defaultValue) {
                  needsValueChange = true;
                  pascalDefaultValue = val;
                }
              } else if (def.type === "TEXT") {
                const targetTextVal = pascalName || rawName;
                if (targetTextVal && def.defaultValue !== targetTextVal) {
                  needsValueChange = true;
                  pascalDefaultValue = targetTextVal;
                }
              }
              if (needsNameChange || needsValueChange) {
                const updatePayload = {};
                if (needsNameChange) updatePayload.name = pascalName;
                if (needsValueChange && pascalDefaultValue) updatePayload.defaultValue = pascalDefaultValue;
                let success = false;
                try {
                  target.editComponentProperty(propKey, updatePayload);
                  success = true;
                } catch (err1) {
                  try {
                    target.editComponentProperty(rawName, updatePayload);
                    success = true;
                  } catch (err2) {
                    if (needsValueChange && updatePayload.defaultValue) {
                      try {
                        target.editComponentProperty(propKey, { defaultValue: updatePayload.defaultValue });
                        success = true;
                      } catch (errVal1) {
                        try {
                          target.editComponentProperty(rawName, { defaultValue: updatePayload.defaultValue });
                          success = true;
                        } catch (errVal2) {
                        }
                      }
                    }
                    if (!success && needsNameChange && updatePayload.name) {
                      try {
                        target.editComponentProperty(propKey, { name: updatePayload.name });
                        success = true;
                      } catch (err3) {
                        try {
                          target.editComponentProperty(rawName, { name: updatePayload.name });
                          success = true;
                        } catch (err4) {
                          console.warn(`Could not rename component property "${propKey}" on "${target.name}":`, err4);
                        }
                      }
                    }
                  }
                }
                if (success) {
                  totalRenamed++;
                  changed = true;
                  break;
                }
              }
            }
          }
          try {
            const finalDefs = target.componentPropertyDefinitions || {};
            const nonVariantKeys = Object.keys(finalDefs).filter((k) => finalDefs[k] && finalDefs[k].type !== "VARIANT");
            if (nonVariantKeys.length > 1) {
              const variants = target.type === "COMPONENT_SET" ? target.children.filter((c) => c.type === "COMPONENT") : [target];
              cleanRebuildComponentProperties(target, variants, {
                enableText: false,
                enableInstanceSwap: false,
                enableBoolean: false,
                enableSlotExtract: true,
                enableNestedInstances: false
              });
            }
          } catch (errSortProps) {
            console.warn(`Could not sort component properties on "${target.name}":`, errSortProps);
          }
        }
      } catch (errTarget) {
        console.warn(`Error sanitizing component properties for target "${target.name}":`, errTarget);
      }
    }
    return totalRenamed;
  }
  async function sanitizeInstanceProperties(node) {
    if (!node) return;
    if (node.type === "INSTANCE") {
      const inst = node;
      try {
        const props = inst.componentProperties;
        if (props) {
          const toSet = {};
          for (const [key, prop] of Object.entries(props)) {
            if (prop.type === "VARIANT" && typeof prop.value === "string") {
              const pascalVal = toPascalCase(prop.value);
              if (pascalVal && pascalVal !== prop.value) {
                toSet[key] = pascalVal;
              }
            }
          }
          if (Object.keys(toSet).length > 0) {
            inst.setProperties(toSet);
          }
        }
      } catch (err) {
        console.warn(`Could not set properties on instance "${node.name}":`, err);
      }
    }
    if ("children" in node && node.children) {
      for (const child of node.children) {
        await sanitizeInstanceProperties(child);
      }
    }
  }

  // ../../../../plugins/components-setup/src/renamer/textClassifier.ts
  var VALID_TEXT_ROLES = [
    "Title",
    "Subtitle",
    "Heading",
    "Subheading",
    "Headline",
    "Display",
    "Eyebrow",
    "Overline",
    "Description",
    "Body",
    "BodyText",
    "Label",
    "Value",
    "Placeholder",
    "Caption",
    "MetaText",
    "Timestamp",
    "HelperText",
    "ErrorMessage",
    "ButtonText",
    "BadgeText",
    "Prefix",
    "Suffix",
    "Unit",
    "Shortcut",
    "Counter",
    "CharacterCount",
    "RequiredIndicator",
    "OptionalTag",
    "SectionTitle",
    "StatusText",
    "Icon",
    "LeadingIcon",
    "TrailingIcon"
  ];
  var ALLOWED_TEXT_ROLES = new Set(VALID_TEXT_ROLES.map((r) => r.toLowerCase()));
  function isAllowedTextRole(name) {
    if (!name) return false;
    return ALLOWED_TEXT_ROLES.has(name.trim().toLowerCase());
  }
  function getExistingSemanticRole(name, characters) {
    if (!name) return null;
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    const match = VALID_TEXT_ROLES.find((r) => r.toLowerCase() === lower);
    if (!match) return null;
    const chars = (characters || "").trim().toLowerCase();
    if (chars.length > 30 && chars.startsWith(lower)) {
      return null;
    }
    return match;
  }
  function normalizeForComparison(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "l").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function isNameDerivedFromCharacters(nodeName, characters) {
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
  function isTimeOrDatePattern(text) {
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
  function isKeyValueStructure(text) {
    if (!text) return false;
    if (/^https?:/i.test(text)) return false;
    return /^[^:\n\r]{2,30}:\s*.+$/i.test(text.trim());
  }
  function isMutedColorOrStyle(fillTokenName, textStyleName) {
    const f = (fillTokenName || "").toLowerCase();
    const s = (textStyleName || "").toLowerCase();
    return /muted|subtle|onsurfacevariant|variant|secondary|tertiary|disabled|placeholder/i.test(f) || /muted|subtle|caption|small|helper/i.test(s);
  }
  function getDeterministicTextFallback(item) {
    const style = (item.textStyleName || "").toLowerCase();
    const fill = (item.fillTokenName || "").toLowerCase();
    const weight = (item.fontStyle || "").toLowerCase();
    const numSize = typeof item.fontSize === "number" ? item.fontSize : 14;
    const chars = item.characters || "";
    if (isTimeOrDatePattern(chars)) {
      return "Timestamp";
    }
    if (style.includes("display") || style.includes("headline") || numSize >= 20) {
      return "Heading";
    }
    if (style.includes("title") || numSize >= 16 && (weight.includes("bold") || weight.includes("medium") || weight.includes("semibold"))) {
      return "Title";
    }
    if (style.includes("caption") || numSize <= 12 || isMutedColorOrStyle(fill, style)) {
      return "Caption";
    }
    if (style.includes("label")) {
      return "Label";
    }
    if (style.includes("body") || numSize >= 13) {
      return "Description";
    }
    return "Label";
  }
  function guardContainerTextSiblingsDeduplication(items) {
    const byName = /* @__PURE__ */ new Map();
    for (const item of items) {
      const lower = item.name.toLowerCase();
      if (!byName.has(lower)) byName.set(lower, []);
      byName.get(lower).push(item);
    }
    for (const [nameLower, dupes] of byName.entries()) {
      if (dupes.length < 2) continue;
      dupes.sort((a, b) => {
        if (b.fontSize !== a.fontSize) return b.fontSize - a.fontSize;
        const bWeight = /bold|black|heavy|medium|semibold/i.test(b.fontStyle) ? 1 : 0;
        const aWeight = /bold|black|heavy|medium|semibold/i.test(a.fontStyle) ? 1 : 0;
        if (bWeight !== aWeight) return bWeight - aWeight;
        const bTitle = b.textStyleName.toLowerCase().includes("title") ? 1 : 0;
        const aTitle = a.textStyleName.toLowerCase().includes("title") ? 1 : 0;
        return bTitle - aTitle;
      });
      if (nameLower === "caption") {
        dupes[0].name = dupes[0].textStyleName.toLowerCase().includes("title") ? "Title" : dupes[0].fontSize >= 16 ? "Title" : "Value";
        dupes[1].name = "Caption";
        if (dupes.length > 2) dupes[2].name = "MetaText";
      } else if (nameLower === "title") {
        dupes[0].name = "Title";
        dupes[1].name = dupes[1].textStyleName.toLowerCase().includes("body") ? "Description" : "Subtitle";
        if (dupes.length > 2) dupes[2].name = "Caption";
      } else if (nameLower === "label") {
        dupes[0].name = "Label";
        dupes[1].name = "Value";
      } else if (nameLower === "value") {
        dupes[0].name = "Value";
        dupes[1].name = "Caption";
      }
    }
  }
  function classifyTextLayerSemantic(item) {
    if (item.currentName) {
      const existingRole = getExistingSemanticRole(item.currentName, item.characters || "");
      if (existingRole) {
        return existingRole;
      }
    }
    if (item.componentPropertyName) {
      const propPascal = sanitizePascalCase(item.componentPropertyName);
      const existingRole = getExistingSemanticRole(propPascal, item.characters || "");
      if (existingRole) {
        return existingRole;
      }
    }
    const chars = (item.characters || "").trim();
    const charsLower = chars.toLowerCase();
    const parentName = (item.parentName || "").trim();
    const parentLower = parentName.toLowerCase();
    const rootCompName = (item.rootComponentName || "").trim();
    const rootLower = rootCompName.toLowerCase();
    const styleName = (item.textStyleName || "").toLowerCase();
    const fillName = (item.fillTokenName || "").toLowerCase();
    const weight = (item.fontStyle || "").toLowerCase();
    const fontSize = typeof item.fontSize === "number" ? item.fontSize : 14;
    const siblingIndex = typeof item.siblingIndex === "number" ? item.siblingIndex : 0;
    const totalSiblings = typeof item.totalSiblingTexts === "number" ? item.totalSiblingTexts : 1;
    const isLoose = Boolean(item.isLooseText || item.hasInstanceSibling);
    const prevType = item.prevSiblingType || "";
    const nextType = item.nextSiblingType || "";
    const indexInParent = typeof item.indexInParent === "number" ? item.indexInParent : siblingIndex;
    const isMuted = isMutedColorOrStyle(fillName, styleName);
    const isSmall = fontSize <= 12 || /small|caption|footnote/i.test(styleName);
    const isUnderComponent = prevType === "INSTANCE" || prevType === "FRAME" || indexInParent > 0 && (Boolean(item.hasInstanceSibling) || item.parentLayoutMode === "VERTICAL");
    const isAboveComponent = indexInParent === 0 && (nextType === "INSTANCE" || nextType === "FRAME" || Boolean(item.hasInstanceSibling));
    const isDisplayOrHeadline = styleName.includes("display") || styleName.includes("headline");
    const isTitleStyle = styleName.includes("title");
    const isBodyStyle = styleName.includes("body");
    const isLabelStyle = styleName.includes("label");
    if (/^\d+\s*[\/|\\]\s*\d+$/.test(chars) || parentLower.includes("counter") || parentLower.includes("footer") && /^\d+/.test(chars)) {
      return "CharacterCount";
    }
    if (/^(ctrl|cmd|⌘|shift|alt|opt|tab|esc|enter|return)(\+[a-z0-9]+)?$/i.test(chars) || /^(⌘[a-z0-9]|ctrl\s*\+\s*[a-z0-9])$/i.test(chars)) {
      return "Shortcut";
    }
    if (parentLower.includes("lead") || parentLower.includes("prefix") || parentLower.includes("addon")) {
      if (/^(https?:\/\/|\/|\$|€|£|#)/i.test(chars)) return "Prefix";
    }
    if (parentLower.includes("trail") || parentLower.includes("suffix") || parentLower.includes("unit") || parentLower.includes("addon")) {
      if (/^(\.com|\.pl|\.org|\.io|pln|usd|eur|kg|g|cm|m|km|px|%|\/h|\/s)$/i.test(chars)) return "Suffix";
    }
    if (/^(https?:\/\/)/i.test(chars)) return "Prefix";
    if (/^(\.com|\.pl|\.org|\.io)$/i.test(chars)) return "Suffix";
    if (/^(pln|usd|eur|\$|€|kg|cm|%|px)$/i.test(chars)) {
      return parentLower.includes("trail") ? "Suffix" : "Prefix";
    }
    if (chars === "*" || charsLower === "(opcjonalne)" || charsLower === "opcjonalne" || charsLower === "(optional)" || charsLower === "optional") {
      return chars === "*" ? "RequiredIndicator" : "OptionalTag";
    }
    if (rootLower.includes("button") || rootLower.includes("btn") || parentLower.includes("button") || parentLower.includes("btn")) {
      return "ButtonText";
    }
    if (isKeyValueStructure(chars)) {
      if (isTimeOrDatePattern(chars)) {
        return "Timestamp";
      }
      if (isUnderComponent || isMuted || isSmall) {
        return "MetaText";
      }
      if (fontSize >= 15 || weight.includes("bold") || weight.includes("medium") || indexInParent === 0) {
        return "StatusText";
      }
      return "Value";
    }
    if (totalSiblings >= 2 && item.siblingTexts && item.siblingTexts.length >= 2) {
      const siblings = item.siblingTexts;
      if (siblings.length === 2) {
        const top = siblings[0];
        const bot = siblings[1];
        const isTop = siblingIndex === 0;
        if (top.fontSize < bot.fontSize || !top.textStyleName.toLowerCase().includes("title") && bot.textStyleName.toLowerCase().includes("title")) {
          if (isTop) {
            return top.textStyleName.toLowerCase().includes("caption") ? "Caption" : top.textStyleName.toLowerCase().includes("label") ? "Label" : "Caption";
          } else {
            return "Title";
          }
        }
        if (top.fontSize > bot.fontSize || top.textStyleName.toLowerCase().includes("title") && !bot.textStyleName.toLowerCase().includes("title")) {
          if (isTop) {
            return "Title";
          } else {
            if (bot.textStyleName.toLowerCase().includes("body") || bot.characters && bot.characters.length > 30) {
              return "Description";
            }
            return bot.textStyleName.toLowerCase().includes("subtitle") ? "Subtitle" : bot.textStyleName.toLowerCase().includes("label") ? "Subtitle" : "Caption";
          }
        }
        if (top.fontSize === bot.fontSize) {
          const topIsHeavier = /bold|black|heavy|medium|semibold/i.test(top.fontStyle);
          const botIsHeavier = /bold|black|heavy|medium|semibold/i.test(bot.fontStyle);
          if (topIsHeavier && !botIsHeavier) {
            return isTop ? "Title" : bot.isMuted ? "Caption" : "Description";
          }
          if (!topIsHeavier && botIsHeavier) {
            return isTop ? top.isMuted ? "Caption" : "Label" : "Value";
          }
          if (top.isMuted && !bot.isMuted) {
            return isTop ? "Caption" : "Value";
          }
          if (!top.isMuted && bot.isMuted) {
            return isTop ? "Title" : "Caption";
          }
        }
      }
      if (siblings.length === 3) {
        if (siblingIndex === 0) return "Eyebrow";
        if (siblingIndex === 1) return "Title";
        return "Description";
      }
    }
    if (isDisplayOrHeadline) {
      return "Heading";
    }
    if (isTitleStyle) {
      return siblingIndex > 0 && parentLower.includes("stack") ? "Subtitle" : "Title";
    }
    if (isBodyStyle) {
      return parentLower.includes("title") || isUnderComponent ? "Description" : "BodyText";
    }
    if (isLabelStyle) {
      if (isAboveComponent || siblingIndex === 0) return "Label";
      return isUnderComponent ? "Caption" : "Label";
    }
    if (!isTitleStyle && !isDisplayOrHeadline) {
      if (isTimeOrDatePattern(chars)) {
        return "Timestamp";
      }
      if (isUnderComponent) {
        if (parentLower.includes("input") || parentLower.includes("field") || parentLower.includes("form") || rootLower.includes("input") || rootLower.includes("textarea") || /help|hint|opis|err/i.test(charsLower)) {
          return "HelperText";
        }
        return isSmall || isMuted ? "Caption" : "MetaText";
      }
    }
    if (isAboveComponent || isLoose && indexInParent === 0 && item.parentLayoutMode === "VERTICAL") {
      if (fontSize >= 16) {
        return fontSize >= 20 ? "SectionTitle" : "Title";
      }
      if (isSmall || styleName.includes("overline") || /overline/i.test(charsLower)) {
        return "Overline";
      }
      return "Label";
    }
    if (isTimeOrDatePattern(chars)) {
      return "Timestamp";
    }
    if (rootLower.includes("input") || rootLower.includes("textarea") || rootLower.includes("select") || rootLower.includes("field") || rootLower.includes("combobox")) {
      if (parentLower.includes("label")) return "Label";
      if (parentLower.includes("desc") || parentLower.includes("helper") || parentLower.includes("error") || parentLower.includes("hint")) return "HelperText";
      if (parentLower.includes("footer") && /^\d+/.test(chars)) return "CharacterCount";
      return "Value";
    }
    if (parentLower.includes("label") || parentLower === "fieldlabel") {
      return "Label";
    }
    if (parentLower.includes("desc") || parentLower.includes("helper") || parentLower.includes("error") || parentLower.includes("hint") || parentLower.includes("message")) {
      return "HelperText";
    }
    if (rootLower.includes("badge") || rootLower.includes("tag") || rootLower.includes("chip") || parentLower.includes("badge") || parentLower.includes("tag") || parentLower.includes("chip")) {
      return "Label";
    }
    if (parentLower.includes("titlerow") || parentLower.includes("headerrow") || parentLower.includes("headergroup") || parentLower.includes("titlegroup")) {
      return "Title";
    }
    if (totalSiblings === 3) {
      if (siblingIndex === 0) return "Eyebrow";
      if (siblingIndex === 1) return "Title";
      return "Description";
    }
    if (totalSiblings === 2) {
      if (siblingIndex === 0) {
        return "Title";
      } else {
        return "Description";
      }
    }
    if (rootLower.includes("datapoint") || rootLower.includes("stat") || rootLower.includes("metric") || parentLower.includes("row") || parentLower.includes("item")) {
      if (fontSize > 16 || weight.includes("bold") || weight.includes("medium") || /^\d+/.test(chars)) {
        return "Value";
      }
      return "Label";
    }
    return getDeterministicTextFallback(item);
  }
  async function getNodeFillTokenName(node) {
    var _a, _b;
    try {
      if (node.boundVariables && node.boundVariables.fills) {
        const boundFills = node.boundVariables.fills;
        if (Array.isArray(boundFills) && boundFills.length > 0 && ((_a = boundFills[0]) == null ? void 0 : _a.id)) {
          const varId = boundFills[0].id;
          const variable = await figma.variables.getVariableByIdAsync(varId).catch(() => null);
          if (variable) return variable.name;
        }
      }
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const firstPaint = node.fills[0];
        if (firstPaint && typeof firstPaint === "object" && ((_b = firstPaint.boundVariables) == null ? void 0 : _b.color)) {
          const colorVar = firstPaint.boundVariables.color;
          const varId = colorVar.id;
          if (varId) {
            const variable = await figma.variables.getVariableByIdAsync(varId).catch(() => null);
            if (variable) return variable.name;
          }
        }
      }
      if (typeof node.fillStyleId === "string" && node.fillStyleId) {
        const style = await figma.getStyleByIdAsync(node.fillStyleId).catch(() => null);
        if (style) return style.name;
      }
    } catch (_) {
    }
    return "";
  }
  function getNodeFillTokenNameSync(node) {
    var _a, _b;
    try {
      if (node.boundVariables && node.boundVariables.fills) {
        const boundFills = node.boundVariables.fills;
        if (Array.isArray(boundFills) && boundFills.length > 0 && ((_a = boundFills[0]) == null ? void 0 : _a.id)) {
          const v = figma.variables.getVariableById(boundFills[0].id);
          if (v) return v.name;
        }
      }
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const firstPaint = node.fills[0];
        if (firstPaint && typeof firstPaint === "object" && ((_b = firstPaint.boundVariables) == null ? void 0 : _b.color)) {
          const colorVar = firstPaint.boundVariables.color;
          if (colorVar.id) {
            const v = figma.variables.getVariableById(colorVar.id);
            if (v) return v.name;
          }
        }
      }
      if (typeof node.fillStyleId === "string" && node.fillStyleId) {
        const s = figma.getStyleById(node.fillStyleId);
        if (s) return s.name;
      }
    } catch (_) {
    }
    return "";
  }
  function classifyTextNodeDirectly(txt) {
    let textStyleName = "";
    if (typeof txt.textStyleId === "string" && txt.textStyleId) {
      try {
        const style = figma.getStyleById(txt.textStyleId);
        if (style) textStyleName = style.name;
      } catch (_) {
      }
    }
    const fillTokenName = getNodeFillTokenNameSync(txt);
    const parent = txt.parent;
    const parentName = parent ? parent.name || "" : "";
    const parentLayoutMode = parent && "layoutMode" in parent ? parent.layoutMode : "NONE";
    const parentChildren = parent && "children" in parent && Array.isArray(parent.children) ? parent.children : [];
    const indexInParent = parentChildren.indexOf(txt);
    const hasInstanceSibling = parentChildren.some((c) => c !== txt && c.type === "INSTANCE");
    const isLooseText = parentChildren.some((c) => c !== txt && c.type !== "TEXT");
    const prevSibling = indexInParent > 0 ? parentChildren[indexInParent - 1] : null;
    const nextSibling = indexInParent >= 0 && indexInParent < parentChildren.length - 1 ? parentChildren[indexInParent + 1] : null;
    const prevSiblingType = prevSibling ? prevSibling.type : "";
    const nextSiblingType = nextSibling ? nextSibling.type : "";
    const textSiblings = parentChildren.filter((c) => c.type === "TEXT");
    let siblingIndex = textSiblings.indexOf(txt);
    if (siblingIndex < 0) siblingIndex = 0;
    const totalSiblingTexts = textSiblings.length || 1;
    const siblingTexts = textSiblings.map((s) => {
      let sStyle = "";
      if (typeof s.textStyleId === "string" && s.textStyleId) {
        try {
          const st = figma.getStyleById(s.textStyleId);
          if (st) sStyle = st.name;
        } catch (_) {
        }
      }
      const sFill = getNodeFillTokenNameSync(s);
      const sWeight = s.fontName && typeof s.fontName === "object" && "style" in s.fontName ? s.fontName.style : "";
      return {
        name: s.name || "",
        characters: s.characters || "",
        fontSize: typeof s.fontSize === "number" ? s.fontSize : 14,
        fontStyle: sWeight,
        textStyleName: sStyle,
        isMuted: isMutedColorOrStyle(sFill, sStyle)
      };
    });
    let componentPropertyName = "";
    if (txt.componentPropertyReferences && typeof txt.componentPropertyReferences === "object") {
      const charRef = txt.componentPropertyReferences.characters;
      if (charRef && typeof charRef === "string") {
        const rawProp = charRef.split("#")[0].trim();
        if (rawProp) {
          componentPropertyName = sanitizePascalCase(rawProp);
        }
      }
    }
    const fontStyle = txt.fontName && typeof txt.fontName === "object" && "style" in txt.fontName ? txt.fontName.style : "";
    return classifyTextLayerSemantic({
      currentName: txt.name || "",
      characters: txt.characters || "",
      fontSize: typeof txt.fontSize === "number" ? txt.fontSize : 14,
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

  // ../../../../plugins/components-setup/src/renamer/frameClassifier.ts
  function nodeContainsText(node) {
    if (node.type === "TEXT") return true;
    if (node.type === "INSTANCE") return false;
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (nodeContainsText(child)) return true;
      }
    }
    return false;
  }
  function isGenericLayerName2(name) {
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
  var VALID_FRAME_SEMANTIC_NAMES = /* @__PURE__ */ new Set([
    "HeaderRow",
    "TitleRow",
    "HeaderGroup",
    "TitleGroup",
    "FooterRow",
    "BottomBar",
    "Actions",
    "ActionRow",
    "ActionGroup",
    "ButtonGroup",
    "TextStack",
    "ColumnStack",
    "RowStack",
    "CardGroup",
    "CardGrid",
    "ItemGroup",
    "ItemGrid",
    "BadgeGroup",
    "InputGroup",
    "TabGroup",
    "StepsGroup",
    "IndicatorsRow",
    "MarkersRow",
    "MediaWrapper",
    "IconWrapper",
    "LeadingIconWrapper",
    "TrailingIconWrapper",
    "Content",
    "Slot",
    "LeadingSlot",
    "TrailingSlot",
    "BottomSlot",
    "Divider",
    "Bar",
    "Track",
    "Fill",
    "Thumb",
    "Indicator",
    "Backdrop",
    "Surface",
    "FieldLabel",
    "FieldDescription"
  ]);
  var VALID_FRAME_SEMANTIC_LOOKUP = new Map(
    Array.from(VALID_FRAME_SEMANTIC_NAMES).map((n) => [n.toLowerCase(), n])
  );
  function getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor) {
    const rawName = (frame.name || "").trim();
    if (!rawName || isGenericLayerName2(rawName)) return null;
    if (isSlotContainer(frame)) {
      return "Slot";
    }
    const lower = rawName.toLowerCase();
    if (lower === "content" && (!isDirectRootChild || hasContentAncestor)) {
      return null;
    }
    const matched = VALID_FRAME_SEMANTIC_LOOKUP.get(lower);
    if (matched) {
      return matched;
    }
    if (/^slot(\s+\d+)?$/i.test(rawName)) {
      return rawName;
    }
    return null;
  }
  function classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor) {
    var _a;
    const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
    if (existingFrameRole) {
      return existingFrameRole;
    }
    const children = "children" in frame && Array.isArray(frame.children) ? frame.children : [];
    const mode = "layoutMode" in frame ? frame.layoutMode : "NONE";
    const wrap = "layoutWrap" in frame ? frame.layoutWrap : "NO_WRAP";
    const currentName = (frame.name || "").trim();
    const lowerName = currentName.toLowerCase();
    if (isDirectRootChild && !hasContentAncestor) {
      if (lowerName === "content" || isSlotLayer(frame)) {
        if (lowerName.includes("lead") && lowerName.includes("slot")) return "LeadingSlot";
        if (lowerName.includes("trail") && lowerName.includes("slot")) return "TrailingSlot";
        if (lowerName.includes("bottom") && lowerName.includes("slot")) return "BottomSlot";
        return "Content";
      }
    }
    if (isSlotContainer(frame)) {
      return "Slot";
    }
    const w = "width" in frame ? frame.width : 0;
    const h = "height" in frame ? frame.height : 0;
    if (h === 1 && w > 1 || w === 1 && h > 1 || lowerName.includes("divider") || lowerName.includes("separator")) {
      return "Divider";
    }
    if (w >= 36 && h > 0 && h <= 16 && w / h >= 2.5 || h >= 36 && w > 0 && w <= 16 && h / w >= 2.5) {
      if (lowerName.includes("bar") || lowerName.includes("track") || lowerName.includes("progress")) {
        return lowerName.includes("fill") ? "Fill" : "Bar";
      }
    }
    if (lowerName === "bar") {
      return "Bar";
    }
    if (children.length === 1) {
      const ch = children[0];
      if (ch.type === "INSTANCE") {
        const chName = (ch.name || "") + " " + (((_a = ch.mainComponent) == null ? void 0 : _a.name) || "");
        if (/icon/i.test(chName)) {
          if (/lead|left|start/i.test(currentName)) return "LeadingIconWrapper";
          if (/trail|right|end/i.test(currentName)) return "TrailingIconWrapper";
          return "IconWrapper";
        }
      }
      const clips = "clipsContent" in frame ? Boolean(frame.clipsContent) : false;
      const isMedia = ch.type === "RECTANGLE" || ch.type === "VECTOR" || /image|img|media|thumb|video|avatar|cover/i.test(ch.name || "");
      if (clips && isMedia && w > 30 && h > 30) {
        return "MediaWrapper";
      }
      return "Wrapper";
    }
    const homo = checkChildrenHomogeneity(children);
    if (homo.isHomogeneous && homo.itemKind !== "text") {
      if (wrap === "WRAP") {
        if (homo.itemKind === "card") return "CardGrid";
        return "ItemGrid";
      }
      if (homo.itemKind === "card") return "CardGroup";
      if (homo.itemKind === "button") return "ButtonGroup";
      if (homo.itemKind === "badge") return "BadgeGroup";
      if (homo.itemKind === "input") return "InputGroup";
      if (homo.itemKind === "tab") return "TabGroup";
      return "ItemGroup";
    }
    if (mode === "VERTICAL" && children.length >= 2 && children.every((c) => c.type === "TEXT")) {
      return "TextStack";
    }
    if (mode === "HORIZONTAL") {
      const isTopInParent = frame.parent && "children" in frame.parent && (frame.parent.children[0] === frame || frame.parent.children.filter((c) => c.type === "FRAME" || c.type === "GROUP")[0] === frame);
      const hasTextChild = children.some((c) => c.type === "TEXT" || c.type === "FRAME" && nodeContainsText(c));
      const hasHeaderName = /header|title|head/i.test(currentName);
      if (isTopInParent && hasTextChild || hasHeaderName) {
        return "HeaderRow";
      }
    }
    if (mode === "HORIZONTAL") {
      if (wrap === "WRAP") return "CardGrid";
      return "RowStack";
    }
    if (mode === "VERTICAL") {
      return "ColumnStack";
    }
    return "ColumnStack";
  }
  function sanitizeLayerNameByContext(rawNewName, node, rootCompName) {
    if (node.parent && (node.parent.type === "PAGE" || node.parent.type === "SECTION")) {
      return toPascalCase(node.name || rawNewName);
    }
    let name = sanitizePascalCase(rawNewName);
    const rootLower = (rootCompName || "").toLowerCase();
    if (!rootLower.includes("slider") && !rootLower.includes("range")) {
      name = name.replace(/^Slider([A-Z])/, "$1");
      if (name === "Slider") name = "Track";
      if (name === "Tick" || name === "TickMark") name = "Marker";
    }
    if (node.type === "TEXT") {
      const txt = node;
      const chars = txt.characters || "";
      const existingSemantic = getExistingSemanticRole(txt.name, chars);
      if (existingSemantic) {
        return existingSemantic;
      }
      if (name.length > 20 || isNameDerivedFromCharacters(name, chars) || !isAllowedTextRole(name)) {
        return classifyTextNodeDirectly(txt);
      }
      return name;
    }
    if (node.type === "FRAME" || node.type === "GROUP") {
      if (isSlotContainer(node)) {
        return "Slot";
      }
      const frame = node;
      const isDirectRootChild = Boolean(node.parent && (node.parent.type === "COMPONENT" || node.parent.type === "COMPONENT_SET"));
      const hasContentAncestor = hasContentAncestorNode(node);
      const lower = name.toLowerCase();
      const isBanned = [
        "containerstack",
        "stack",
        "row",
        "contentstack",
        "contentrow",
        "rowwrapper"
      ].includes(lower) || lower === "content" && hasContentAncestor;
      if (isBanned || !name) {
        name = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
      } else {
        const children = "children" in frame && Array.isArray(frame.children) ? frame.children : [];
        const homo = checkChildrenHomogeneity(children);
        if (homo.isHomogeneous && homo.itemKind !== "text") {
          if (/stack|row/i.test(name) || name === "Group" || isGenericLayerName2(name)) {
            name = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
          }
        }
      }
    }
    return name;
  }
  async function sanitizeLayerNames(node, isPascalCaseOnly = false) {
    if (!node) return;
    if (node.type === "INSTANCE") {
      return;
    }
    if (node.type === "TEXT") {
      const txt = node;
      const rawName = (txt.name || "").trim();
      const chars = txt.characters || "";
      const existing = getExistingSemanticRole(rawName, chars);
      if (existing) {
        if (txt.name !== existing) txt.name = existing;
        return;
      }
      if (isNameDerivedFromCharacters(rawName, chars) || rawName.length > 20 || isGenericLayerName2(rawName) || !isAllowedTextRole(rawName)) {
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
    if ("name" in node && typeof node.name === "string") {
      const rawName = node.name.trim();
      if (rawName) {
        const isVariantInSet = node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET";
        if (isVariantInSet) {
          const parts = rawName.split(",").map((part) => {
            const eqIdx = part.indexOf("=");
            if (eqIdx === -1) {
              return toPascalCase(part.trim());
            }
            const k = part.substring(0, eqIdx).trim();
            const v = part.substring(eqIdx + 1).trim();
            const pascalK = /^property\s*\d+$/i.test(k) ? "Type" : toPascalCase(k);
            const pascalV = toPascalCase(v);
            return pascalK ? `${pascalK}=${pascalV}` : `${k}=${pascalV}`;
          });
          const newName = parts.join(", ");
          if (node.name !== newName) {
            node.name = newName;
          }
        } else {
          if (!isPascalCaseOnly && /^frame(\s*\d+)?$/i.test(rawName)) {
            node.name = "Container";
          } else {
            const pascal = toPascalCase(rawName);
            if (pascal && node.name !== pascal) {
              node.name = pascal;
            }
          }
        }
      }
    }
    if ("children" in node && node.children) {
      for (const child of node.children) {
        await sanitizeLayerNames(child, isPascalCaseOnly);
      }
    }
  }

  // ../../../../plugins/components-setup/src/components/setup.ts
  async function setupComponentSets(nodes) {
    await ensureTemporaryMetricsCollection();
    let allVars = await getAllRelevantVariablesForComponentSet();
    let varGap = findVariableWithPriority(allVars, "Layout/Base", "Metrics") || findVariableWithPriority(allVars, "layout/base", "Metrics");
    let varPadding = findVariableWithPriority(allVars, "Layout/Base", "Metrics") || findVariableWithPriority(allVars, "layout/base", "Metrics");
    let varRadius = findVariableWithPriority(allVars, "Radius/Container/Base", "Metrics") || findVariableWithPriority(allVars, "radius/container/base", "Metrics") || findVariableWithPriority(allVars, "Radius/Base", "Metrics") || findVariableWithPriority(allVars, "radius/base", "Metrics");
    let varBorder = findVariableWithPriority(allVars, "Constant/1", "Metrics") || findVariableWithPriority(allVars, "constant/1", "Metrics") || findVariableWithPriority(allVars, "Constant/One", "Metrics") || findVariableWithPriority(allVars, "constant/one", "Metrics");
    let varNone = findVariableWithPriority(allVars, "constant/none", "Metrics") || findVariableWithPriority(allVars, "none", "Metrics") || findVariableWithPriority(allVars, "constant/zero", "Metrics");
    let varBorderColor = findColorVariableWithPriority(allVars, ["OutlineBase", "outlineBase", "outlineHighest", "outline"]);
    const varCollectionCache = /* @__PURE__ */ new Map();
    for (const item of allVars) {
      varCollectionCache.set(item.variable.id, item.collectionName);
    }
    const ensureScope = (variable, requiredScope) => {
      if (variable.scopes.indexOf(requiredScope) === -1 && variable.scopes.indexOf("ALL_SCOPES") === -1) {
        variable.scopes = [...variable.scopes, requiredScope];
      }
    };
    try {
      if (varGap) ensureScope(varGap, "GAP");
      if (varPadding) ensureScope(varPadding, "GAP");
      if (varRadius) ensureScope(varRadius, "CORNER_RADIUS");
      if (varBorder) ensureScope(varBorder, "STROKE_FLOAT");
      if (varNone) {
        ensureScope(varNone, "GAP");
        ensureScope(varNone, "CORNER_RADIUS");
      }
    } catch (e) {
      console.warn("Unable to update variable scopes:", e);
    }
    let totalSuccess = 0;
    const errors = [];
    for (const node of nodes) {
      try {
        try {
          await resolveComponentSetConflicts(node);
        } catch (errConflicts) {
          console.warn(`Could not auto-resolve conflicts on "${node.name}":`, errConflicts);
        }
        try {
          cleanHiddenWhiteFills(node);
        } catch (e) {
        }
        try {
          await sanitizeComponentProperties(node);
        } catch (e) {
          console.warn("sanitizeComponentProperties error:", e);
        }
        try {
          sanitizeLayerNames(node);
        } catch (e) {
        }
        try {
          await stripForeignVariablesFromNode(node, varCollectionCache, {
            varNone,
            varBorderColor
          });
        } catch (e) {
          console.warn("stripForeignVariablesFromNode error:", e);
        }
        try {
          node.layoutMode = "VERTICAL";
          node.layoutWrap = "NO_WRAP";
          node.primaryAxisSizingMode = "AUTO";
          node.counterAxisSizingMode = "AUTO";
        } catch (layoutErr) {
          console.warn(`Could not set layoutMode on "${node.name}":`, layoutErr);
          errors.push(`${node.name} [layoutMode] -> ${(layoutErr == null ? void 0 : layoutErr.message) || layoutErr}`);
        }
        try {
          node.fills = [];
        } catch (e) {
        }
        const safeBind = (prop, variable) => {
          if (!variable) return;
          try {
            node.setBoundVariable(prop, variable);
          } catch (e) {
            errors.push(`${node.name} [${prop}] -> ${e.message}`);
          }
        };
        safeBind("itemSpacing", varGap);
        safeBind("counterAxisSpacing", varGap);
        safeBind("paddingTop", varPadding);
        safeBind("paddingBottom", varPadding);
        safeBind("paddingLeft", varPadding);
        safeBind("paddingRight", varPadding);
        if (varRadius) {
          try {
            node.setBoundVariable("cornerRadius", varRadius);
          } catch (err) {
            safeBind("topLeftRadius", varRadius);
            safeBind("topRightRadius", varRadius);
            safeBind("bottomLeftRadius", varRadius);
            safeBind("bottomRightRadius", varRadius);
          }
        }
        if ("cornerSmoothing" in node) {
          try {
            node.cornerSmoothing = 0.6;
          } catch (e) {
          }
        }
        try {
          node.dashPattern = [4, 4];
          node.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
          if (varBorderColor) {
            const newStrokes = [...node.strokes].map((paint) => {
              if (paint.type === "SOLID") {
                return figma.variables.setBoundVariableForPaint(paint, "color", varBorderColor);
              }
              return paint;
            });
            node.strokes = newStrokes;
          }
          if (varBorder) {
            safeBind("strokeWeight", varBorder);
          }
        } catch (e) {
          errors.push(`${node.name} [strokes] -> ${e.message}`);
        }
        for (const child of node.children) {
          try {
            cleanHiddenWhiteFills(child);
          } catch (e) {
          }
          try {
            sanitizeLayerNames(child);
          } catch (e) {
          }
          if (child.type === "COMPONENT") {
            if (child.layoutMode === "NONE") {
              try {
                child.layoutMode = "HORIZONTAL";
                child.primaryAxisSizingMode = "AUTO";
                child.counterAxisSizingMode = "AUTO";
              } catch (e) {
                console.warn(`Could not set auto layout on variant "${child.name}":`, e);
              }
            }
            if (varNone) {
              try {
                if (child.layoutMode !== "NONE") {
                  await bindOrReplaceField(child, "itemSpacing", varNone, varCollectionCache);
                  await bindOrReplaceField(child, "counterAxisSpacing", varNone, varCollectionCache);
                  if (child.paddingTop === 0) await bindOrReplaceField(child, "paddingTop", varNone, varCollectionCache);
                  if (child.paddingBottom === 0) await bindOrReplaceField(child, "paddingBottom", varNone, varCollectionCache);
                  if (child.paddingLeft === 0) await bindOrReplaceField(child, "paddingLeft", varNone, varCollectionCache);
                  if (child.paddingRight === 0) await bindOrReplaceField(child, "paddingRight", varNone, varCollectionCache);
                }
                await bindRadiusOrReplaceForeign(child, varNone, varCollectionCache);
                if ("cornerSmoothing" in child) {
                  child.cornerSmoothing = 0.6;
                }
              } catch (e) {
                console.warn(`Could not bind varNone on variant "${child.name}":`, e);
              }
            }
          }
        }
        totalSuccess++;
      } catch (nodeErr) {
        console.error(`Error configuring component set "${node.name}":`, nodeErr);
        errors.push(`${node.name}: ${(nodeErr == null ? void 0 : nodeErr.message) || nodeErr}`);
      }
    }
    if (errors.length > 0) {
      figma.notify(`Configured ${totalSuccess} Component Set(s) with warnings: ${errors[0]}`);
    } else {
      figma.notify(`Configured ${totalSuccess} Component Set${totalSuccess > 1 ? "s" : ""}! \u26A1`);
    }
  }
  async function applyVariantMetrics(selection) {
    await ensureTemporaryMetricsCollection();
    let allVars = await getAllRelevantVariablesForComponentSet();
    let varNone = findVariableWithPriority(allVars, "constant/none", "Metrics") || findVariableWithPriority(allVars, "none", "Metrics") || findVariableWithPriority(allVars, "constant/zero", "Metrics");
    let varLayoutBase = findVariableWithPriority(allVars, "Layout/Base", "Metrics") || findVariableWithPriority(allVars, "layout/base", "Metrics");
    let varLayoutMassive = findVariableWithPriority(allVars, "layout/massive", "Metrics");
    let varLayoutLarge = findVariableWithPriority(allVars, "layout/large", "Metrics");
    let varRadiusBase = findVariableWithPriority(allVars, "Radius/Container/Base", "Metrics") || findVariableWithPriority(allVars, "radius/container/base", "Metrics") || findVariableWithPriority(allVars, "Radius/Base", "Metrics") || findVariableWithPriority(allVars, "radius/base", "Metrics");
    let varRadiusExtraHuge = findVariableWithPriority(allVars, "radius/container/extraHuge", "Metrics");
    let varRadiusExtraLarge = findVariableWithPriority(allVars, "radius/container/extraLarge", "Metrics");
    let varRadiusHuge = findVariableWithPriority(allVars, "radius/container/huge", "Metrics");
    let varBorderOne = findVariableWithPriority(allVars, "Constant/1", "Metrics") || findVariableWithPriority(allVars, "constant/1", "Metrics") || findVariableWithPriority(allVars, "Constant/One", "Metrics") || findVariableWithPriority(allVars, "constant/one", "Metrics");
    let varOutlineBase = findColorVariableWithPriority(allVars, ["OutlineBase", "outlineBase", "outlineHighest", "outline"]);
    let varSurfaceBackground = findColorVariableWithPriority(allVars, ["SurfaceBackground", "surfaceBackground", "background", "surface"]);
    let varMaxWidthScreen = findVariableWithPriority(allVars, "maxWidth/screen", "layout");
    let varMaxHeightScreen = findVariableWithPriority(allVars, "maxHeight/screen", "layout");
    const varCollectionCache = /* @__PURE__ */ new Map();
    for (const item of allVars) {
      varCollectionCache.set(item.variable.id, item.collectionName);
    }
    const ensureScope = (variable, requiredScope) => {
      if (variable.scopes.indexOf(requiredScope) === -1 && variable.scopes.indexOf("ALL_SCOPES") === -1) {
        variable.scopes = [...variable.scopes, requiredScope];
      }
    };
    try {
      if (varNone) ensureScope(varNone, "GAP");
      if (varRadiusBase) ensureScope(varRadiusBase, "CORNER_RADIUS");
      if (varRadiusExtraHuge) ensureScope(varRadiusExtraHuge, "CORNER_RADIUS");
      if (varRadiusExtraLarge) ensureScope(varRadiusExtraLarge, "CORNER_RADIUS");
      if (varRadiusHuge) ensureScope(varRadiusHuge, "CORNER_RADIUS");
      if (varBorderOne) ensureScope(varBorderOne, "STROKE_FLOAT");
      if (varLayoutBase) ensureScope(varLayoutBase, "GAP");
      if (varLayoutMassive) ensureScope(varLayoutMassive, "GAP");
      if (varLayoutLarge) ensureScope(varLayoutLarge, "GAP");
      if (varMaxWidthScreen) ensureScope(varMaxWidthScreen, "WIDTH_HEIGHT");
      if (varMaxHeightScreen) ensureScope(varMaxHeightScreen, "WIDTH_HEIGHT");
    } catch (e) {
      console.warn("Unable to update variable scopes:", e);
    }
    let count = 0;
    for (const node of selection) {
      try {
        try {
          cleanHiddenWhiteFills(node);
        } catch (e) {
        }
        try {
          await sanitizeComponentProperties(node);
        } catch (e) {
        }
        try {
          sanitizeLayerNames(node);
        } catch (e) {
        }
        try {
          await stripForeignVariablesFromNode(node, varCollectionCache, {
            varNone,
            varBorderColor: varOutlineBase,
            varSurfaceBackground
          });
        } catch (e) {
        }
        try {
          await bindColorVariablesRecursively(node, allVars);
        } catch (e) {
        }
        const isFigmaSection = node.type === "SECTION";
        const isFrameSection = node.type === "FRAME" && node.name.trim().toLowerCase() === "section";
        const isMainLayer = node.type === "FRAME" && node.name.trim().toLowerCase() === "main";
        const isComponentLayer = node.type === "FRAME" && node.name.trim().toLowerCase() === "component";
        const isScreenLayer = (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || "layoutMode" in node) && node.name.trim().toLowerCase() === "screen";
        if (isFigmaSection) {
          const radiusToUse = varRadiusExtraHuge || varRadiusBase;
          try {
            if ("setBoundVariable" in node && radiusToUse) {
              node.setBoundVariable("cornerRadius", radiusToUse);
            }
            if ("topLeftRadius" in node && radiusToUse) {
              node.setBoundVariable("topLeftRadius", radiusToUse);
              node.setBoundVariable("topRightRadius", radiusToUse);
              node.setBoundVariable("bottomLeftRadius", radiusToUse);
              node.setBoundVariable("bottomRightRadius", radiusToUse);
            }
            if ("cornerSmoothing" in node) {
              node.cornerSmoothing = 0.6;
            }
            if (varSurfaceBackground && "fills" in node) {
              node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
              const newFills = [...node.fills].map((paint) => {
                if (paint.type === "SOLID") {
                  return figma.variables.setBoundVariableForPaint(paint, "color", varSurfaceBackground);
                }
                return paint;
              });
              node.fills = newFills;
            }
            if ("strokes" in node) {
              try {
                node.strokes = [];
              } catch (err) {
              }
            }
            count++;
          } catch (e) {
            console.error("Error assigning radius to section:", e);
          }
        } else if (isFrameSection) {
          try {
            const layoutToUse = varLayoutMassive || varLayoutBase;
            if ("layoutMode" in node && node.layoutMode !== "NONE" && layoutToUse) {
              node.setBoundVariable("itemSpacing", layoutToUse);
              node.setBoundVariable("counterAxisSpacing", layoutToUse);
              node.setBoundVariable("paddingTop", layoutToUse);
              node.setBoundVariable("paddingBottom", layoutToUse);
              node.setBoundVariable("paddingLeft", layoutToUse);
              node.setBoundVariable("paddingRight", layoutToUse);
            }
            if (varNone) {
              if ("cornerRadius" in node) {
                node.setBoundVariable("cornerRadius", varNone);
              }
              if ("topLeftRadius" in node) {
                node.setBoundVariable("topLeftRadius", varNone);
                node.setBoundVariable("topRightRadius", varNone);
                node.setBoundVariable("bottomLeftRadius", varNone);
                node.setBoundVariable("bottomRightRadius", varNone);
              }
            }
            if (varSurfaceBackground && "fills" in node) {
              node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
              const newFills = [...node.fills].map((paint) => {
                if (paint.type === "SOLID") {
                  return figma.variables.setBoundVariableForPaint(paint, "color", varSurfaceBackground);
                }
                return paint;
              });
              node.fills = newFills;
            }
            if ("strokes" in node) {
              try {
                node.strokes = [];
              } catch (err) {
              }
            }
            count++;
          } catch (e) {
            console.error("Error configuring 'section' frame:", e);
          }
        } else if (isMainLayer) {
          try {
            if ("layoutMode" in node && node.layoutMode !== "NONE" && varNone) {
              node.setBoundVariable("itemSpacing", varNone);
              node.setBoundVariable("counterAxisSpacing", varNone);
              node.setBoundVariable("paddingTop", varNone);
              node.setBoundVariable("paddingBottom", varNone);
              node.setBoundVariable("paddingLeft", varNone);
              node.setBoundVariable("paddingRight", varNone);
            }
            const radiusToUse = varRadiusExtraLarge || varRadiusBase;
            if ("topLeftRadius" in node && radiusToUse) {
              node.setBoundVariable("topLeftRadius", radiusToUse);
              node.setBoundVariable("topRightRadius", radiusToUse);
              node.setBoundVariable("bottomLeftRadius", radiusToUse);
              node.setBoundVariable("bottomRightRadius", radiusToUse);
            }
            if ("cornerSmoothing" in node) {
              node.cornerSmoothing = 0.6;
            }
            if (varOutlineBase && varBorderOne && "strokes" in node) {
              node.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
              const newStrokes = [...node.strokes].map((paint) => {
                if (paint.type === "SOLID") {
                  return figma.variables.setBoundVariableForPaint(paint, "color", varOutlineBase);
                }
                return paint;
              });
              node.strokes = newStrokes;
              node.setBoundVariable("strokeWeight", varBorderOne);
            }
            count++;
          } catch (e) {
            console.error("Error configuring 'main' frame:", e);
          }
        } else if (isComponentLayer) {
          try {
            const gapToUse = varLayoutLarge || varLayoutBase;
            if ("layoutMode" in node && node.layoutMode !== "NONE" && gapToUse) {
              node.setBoundVariable("itemSpacing", gapToUse);
              node.setBoundVariable("counterAxisSpacing", gapToUse);
              if (varNone) {
                node.setBoundVariable("paddingTop", varNone);
                node.setBoundVariable("paddingBottom", varNone);
                node.setBoundVariable("paddingLeft", varNone);
                node.setBoundVariable("paddingRight", varNone);
              }
            }
            if (varNone) {
              if ("cornerRadius" in node) {
                node.setBoundVariable("cornerRadius", varNone);
              }
              if ("topLeftRadius" in node) {
                node.setBoundVariable("topLeftRadius", varNone);
                node.setBoundVariable("topRightRadius", varNone);
                node.setBoundVariable("bottomLeftRadius", varNone);
                node.setBoundVariable("bottomRightRadius", varNone);
              }
            }
            count++;
          } catch (e) {
            console.error("Error configuring 'component' frame:", e);
          }
        } else if (isScreenLayer) {
          try {
            if ("layoutMode" in node && node.layoutMode !== "NONE" && varNone) {
              node.setBoundVariable("itemSpacing", varNone);
              node.setBoundVariable("counterAxisSpacing", varNone);
              node.setBoundVariable("paddingTop", varNone);
              node.setBoundVariable("paddingBottom", varNone);
              node.setBoundVariable("paddingLeft", varNone);
              node.setBoundVariable("paddingRight", varNone);
            }
            const radiusToUse = varRadiusHuge || varRadiusExtraHuge || varRadiusBase;
            if (radiusToUse) {
              if ("cornerRadius" in node) {
                node.setBoundVariable("cornerRadius", radiusToUse);
              }
              if ("topLeftRadius" in node) {
                node.setBoundVariable("topLeftRadius", radiusToUse);
                node.setBoundVariable("topRightRadius", radiusToUse);
                node.setBoundVariable("bottomLeftRadius", radiusToUse);
                node.setBoundVariable("bottomRightRadius", radiusToUse);
              }
              if ("cornerSmoothing" in node) {
                node.cornerSmoothing = 0.6;
              }
            }
            if (varSurfaceBackground && "fills" in node) {
              node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
              const newFills = [...node.fills].map((paint) => {
                if (paint.type === "SOLID") {
                  return figma.variables.setBoundVariableForPaint(paint, "color", varSurfaceBackground);
                }
                return paint;
              });
              node.fills = newFills;
            }
            if (varMaxWidthScreen && "setBoundVariable" in node) {
              try {
                node.setBoundVariable("minWidth", varMaxWidthScreen);
                node.setBoundVariable("maxWidth", varMaxWidthScreen);
              } catch (err) {
                console.warn("Could not bind minWidth/maxWidth to screen:", err);
              }
            }
            if (varMaxHeightScreen && "setBoundVariable" in node) {
              try {
                node.setBoundVariable("minHeight", varMaxHeightScreen);
                node.setBoundVariable("maxHeight", varMaxHeightScreen);
              } catch (err) {
                console.warn("Could not bind minHeight/maxHeight to screen:", err);
              }
            }
            count++;
          } catch (e) {
            console.error("Error configuring 'screen' frame:", e);
          }
        } else if (node.type === "COMPONENT") {
          try {
            if ("layoutMode" in node && node.layoutMode === "NONE") {
              node.layoutMode = "HORIZONTAL";
              node.primaryAxisSizingMode = "AUTO";
              node.counterAxisSizingMode = "AUTO";
            }
            if (varNone) {
              if ("layoutMode" in node && node.layoutMode !== "NONE") {
                await bindOrReplaceField(node, "itemSpacing", varNone, varCollectionCache);
                await bindOrReplaceField(node, "counterAxisSpacing", varNone, varCollectionCache);
                if (node.paddingTop === 0) await bindOrReplaceField(node, "paddingTop", varNone, varCollectionCache);
                if (node.paddingBottom === 0) await bindOrReplaceField(node, "paddingBottom", varNone, varCollectionCache);
                if (node.paddingLeft === 0) await bindOrReplaceField(node, "paddingLeft", varNone, varCollectionCache);
                if (node.paddingRight === 0) await bindOrReplaceField(node, "paddingRight", varNone, varCollectionCache);
              }
              await bindRadiusOrReplaceForeign(node, varNone, varCollectionCache);
              if ("cornerSmoothing" in node) {
                node.cornerSmoothing = 0.6;
              }
            }
            count++;
          } catch (e) {
            console.error("Error configuring variant with varNone:", e);
          }
        } else if ("setBoundVariable" in node) {
          try {
            if ("layoutMode" in node && node.layoutMode !== "NONE") {
              if (varNone) {
                await bindOrReplaceField(node, "itemSpacing", varNone, varCollectionCache);
                await bindOrReplaceField(node, "counterAxisSpacing", varNone, varCollectionCache);
                await bindOrReplaceField(node, "paddingTop", varNone, varCollectionCache);
                await bindOrReplaceField(node, "paddingBottom", varNone, varCollectionCache);
                await bindOrReplaceField(node, "paddingLeft", varNone, varCollectionCache);
                await bindOrReplaceField(node, "paddingRight", varNone, varCollectionCache);
              }
            }
            if (varNone) {
              await bindRadiusOrReplaceForeign(node, varNone, varCollectionCache);
              if ("cornerSmoothing" in node) {
                node.cornerSmoothing = 0.6;
              }
            }
            count++;
          } catch (e) {
            console.error("Error binding variable:", e);
          }
        }
      } catch (errNode) {
        console.error(`Error applying metrics to node "${node.name}":`, errNode);
      }
    }
    figma.notify(`Updated ${count} elements with base metrics! \u26A1`);
  }
  function needsSmartSetup(selection) {
    if (!selection || selection.length === 0) return false;
    const hasRadiusBound = (n) => {
      const bv = n == null ? void 0 : n.boundVariables;
      if (!bv) return false;
      return Boolean(bv.cornerRadius || bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius);
    };
    const hasSpacingBound = (n) => {
      const bv = n == null ? void 0 : n.boundVariables;
      if (!bv) return false;
      return Boolean(bv.itemSpacing || bv.paddingTop || bv.paddingBottom || bv.paddingLeft || bv.paddingRight);
    };
    const checkComponentSet = (cs) => {
      if (cs.layoutMode === "NONE") return true;
      if (!cs.dashPattern || cs.dashPattern.length === 0) return true;
      if (!hasSpacingBound(cs) || !hasRadiusBound(cs)) return true;
      const defs = cs.componentPropertyDefinitions || {};
      for (const key of Object.keys(defs)) {
        const rawName = key.split("#")[0].trim();
        if (/^property\s*\d+$/i.test(rawName)) return true;
      }
      const variants = cs.children.filter((c) => c.type === "COMPONENT");
      for (const v of variants) {
        if (v.layoutMode === "NONE") return true;
        if (!hasRadiusBound(v)) return true;
      }
      return false;
    };
    for (const node of selection) {
      if (node.type === "COMPONENT" && (!node.parent || node.parent.type !== "COMPONENT_SET")) {
        return true;
      }
      let hostSet = null;
      if (node.type === "COMPONENT_SET") {
        hostSet = node;
      } else {
        let curr = node.parent;
        while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
          if (curr.type === "COMPONENT_SET") {
            hostSet = curr;
            break;
          }
          curr = curr.parent;
        }
      }
      if (hostSet) {
        if (checkComponentSet(hostSet)) return true;
        continue;
      }
      if (node.type === "FRAME") {
        if (node.layoutMode === "NONE") return true;
        if (!hasSpacingBound(node) && !hasRadiusBound(node)) return true;
      }
    }
    return false;
  }
  async function runComponentSetLogic() {
    try {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("Please select something on the canvas to configure Component Set.", { error: true });
        return;
      }
      await ensureTemporaryMetricsCollection();
      const standaloneComponents = selection.filter(
        (node) => node.type === "COMPONENT" && (!node.parent || node.parent.type !== "COMPONENT_SET")
      );
      const newlyCreatedComponentSets = [];
      const newlyCreatedVariants = [];
      for (const comp of standaloneComponents) {
        cleanHiddenWhiteFills(comp);
        try {
          let originalName = comp.name.trim();
          if (/^frame(\s*\d+)?$/i.test(originalName)) {
            originalName = "Container";
          } else {
            originalName = toPascalCase(originalName);
          }
          const parent = comp.parent && "children" in comp.parent ? comp.parent : figma.currentPage;
          const compSet = figma.combineAsVariants([comp], parent);
          compSet.name = originalName;
          try {
            if (typeof compSet.editComponentProperty === "function") {
              const defs = compSet.componentPropertyDefinitions;
              if (defs) {
                for (const propKey of Object.keys(defs)) {
                  const def = defs[propKey];
                  const rawName = propKey.split("#")[0].trim();
                  if (def.type === "VARIANT" || /^property\s*\d+$/i.test(rawName)) {
                    try {
                      compSet.editComponentProperty(propKey, { name: "Type", defaultValue: "Default" });
                    } catch (e1) {
                      try {
                        compSet.editComponentProperty(rawName, { name: "Type", defaultValue: "Default" });
                      } catch (e2) {
                      }
                    }
                  }
                }
              }
            }
          } catch (errProp) {
            console.warn("Could not edit component property to Type:", errProp);
          }
          comp.name = "Type=Default";
          if (comp.layoutMode === "NONE") {
            comp.layoutMode = "HORIZONTAL";
            comp.primaryAxisSizingMode = "AUTO";
            comp.counterAxisSizingMode = "AUTO";
          }
          newlyCreatedComponentSets.push(compSet);
          newlyCreatedVariants.push(comp);
        } catch (err) {
          console.error("Error combining component into component set:", err);
          figma.notify(`Could not convert "${comp.name}" to Component Set: ${err.message}`, { error: true });
        }
      }
      const existingComponentSets = /* @__PURE__ */ new Set();
      for (const node of selection) {
        if (node.type === "COMPONENT_SET") {
          existingComponentSets.add(node);
        } else {
          let curr = node;
          while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
            if (curr.type === "COMPONENT_SET") {
              existingComponentSets.add(curr);
              break;
            }
            curr = curr.parent;
          }
        }
      }
      const allComponentSets = [...Array.from(existingComponentSets), ...newlyCreatedComponentSets];
      for (const cs of allComponentSets) {
        try {
          await resolveComponentSetConflicts(cs);
        } catch (e) {
          console.warn("resolveComponentSetConflicts error:", e);
        }
      }
      if (allComponentSets.length > 0) {
        await setupComponentSets(allComponentSets);
      }
      const otherNodes = selection.filter(
        (node) => node.type !== "COMPONENT_SET" && !standaloneComponents.includes(node)
      );
      const nodesToApplyVariantMetrics = [...otherNodes, ...newlyCreatedVariants];
      if (nodesToApplyVariantMetrics.length > 0) {
        await applyVariantMetrics(nodesToApplyVariantMetrics);
      }
      for (const cs of allComponentSets) {
        try {
          await sanitizeComponentProperties(cs);
          await sanitizeLayerNames(cs);
        } catch (e) {
        }
      }
      for (const n of selection) {
        try {
          await sanitizeComponentProperties(n);
          await sanitizeLayerNames(n);
        } catch (e) {
        }
      }
      if (newlyCreatedComponentSets.length > 0) {
        figma.currentPage.selection = allComponentSets;
        await sendSelectionToUI();
      } else {
        try {
          const currentSelection = [...figma.currentPage.selection];
          if (currentSelection.length > 0) {
            figma.currentPage.selection = [];
            figma.currentPage.selection = currentSelection;
          }
        } catch (e) {
        }
        await sendSelectionToUI();
      }
    } catch (err) {
      console.error("runComponentSetLogic failed:", err);
      figma.notify(`Setup Component warning: ${(err == null ? void 0 : err.message) || err}`, { error: true });
    }
  }
  async function runRenamePascalCaseLogic() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("Please select elements on canvas to rename to PascalCase.", { error: true });
      return;
    }
    const nodesToSanitize = /* @__PURE__ */ new Set();
    const componentSets = /* @__PURE__ */ new Set();
    const componentTargets = /* @__PURE__ */ new Set();
    for (const node of selection) {
      let curr = node.parent;
      while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
        if (curr.type === "INSTANCE") {
          break;
        }
        nodesToSanitize.add(curr);
        if (curr.type === "COMPONENT_SET") {
          componentSets.add(curr);
          componentTargets.add(curr);
          for (const child of curr.children) {
            if (child.type === "COMPONENT") {
              componentTargets.add(child);
              nodesToSanitize.add(child);
            }
          }
        } else if (curr.type === "COMPONENT") {
          componentTargets.add(curr);
        }
        curr = curr.parent;
      }
    }
    function collectSubtree(n) {
      if (!n) return;
      if (n.type === "INSTANCE") {
        return;
      }
      nodesToSanitize.add(n);
      if (n.type === "COMPONENT_SET") {
        const cs = n;
        componentSets.add(cs);
        componentTargets.add(cs);
        for (const child of cs.children) {
          if (child.type === "COMPONENT") {
            componentTargets.add(child);
            nodesToSanitize.add(child);
            if ("children" in child && child.children) {
              for (const sub of child.children) {
                collectSubtree(sub);
              }
            }
          }
        }
        return;
      }
      if (n.type === "COMPONENT") {
        componentTargets.add(n);
        if (n.parent && n.parent.type === "COMPONENT_SET") {
          const parentSet = n.parent;
          componentSets.add(parentSet);
          componentTargets.add(parentSet);
          nodesToSanitize.add(parentSet);
        }
      }
      if ("children" in n && n.children) {
        for (const child of n.children) {
          collectSubtree(child);
        }
      }
    }
    for (const n of selection) {
      collectSubtree(n);
    }
    for (const cs of componentSets) {
      await sanitizeComponentProperties(cs);
    }
    for (const target of componentTargets) {
      await sanitizeComponentProperties(target);
    }
    for (const node of nodesToSanitize) {
      await sanitizeLayerNames(node, true);
    }
    for (const n of selection) {
      await sanitizeInstanceProperties(n);
    }
    try {
      const currentSelection = [...figma.currentPage.selection];
      if (currentSelection.length > 0) {
        figma.currentPage.selection = [];
        figma.currentPage.selection = currentSelection;
      }
    } catch (e) {
    }
    await sendSelectionToUI();
    figma.notify("Renamed layers, frames, sections & variant properties to PascalCase! \u{1F524}");
  }
  async function setupComponentSetOnlyHorizontal(nodes) {
    await ensureTemporaryMetricsCollection();
    const allVars = await getAllRelevantVariablesForComponentSet();
    const varGap = findVariableWithPriority(allVars, "Layout/Base", "Metrics") || findVariableWithPriority(allVars, "layout/base", "Metrics");
    const varPadding = findVariableWithPriority(allVars, "Layout/Base", "Metrics") || findVariableWithPriority(allVars, "layout/base", "Metrics");
    const varRadius = findVariableWithPriority(allVars, "Radius/Container/Base", "Metrics") || findVariableWithPriority(allVars, "radius/container/base", "Metrics") || findVariableWithPriority(allVars, "Radius/Base", "Metrics") || findVariableWithPriority(allVars, "radius/base", "Metrics");
    const varBorder = findVariableWithPriority(allVars, "Constant/1", "Metrics") || findVariableWithPriority(allVars, "constant/1", "Metrics") || findVariableWithPriority(allVars, "Constant/One", "Metrics") || findVariableWithPriority(allVars, "constant/one", "Metrics");
    const varBorderColor = findColorVariableWithPriority(allVars, ["OutlineBase", "outlineBase", "outlineHighest", "outline"]);
    const ensureScope = (variable, requiredScope) => {
      if (variable.scopes.indexOf(requiredScope) === -1 && variable.scopes.indexOf("ALL_SCOPES") === -1) {
        variable.scopes = [...variable.scopes, requiredScope];
      }
    };
    try {
      if (varGap) ensureScope(varGap, "GAP");
      if (varPadding) ensureScope(varPadding, "GAP");
      if (varRadius) ensureScope(varRadius, "CORNER_RADIUS");
      if (varBorder) ensureScope(varBorder, "STROKE_FLOAT");
    } catch (e) {
      console.warn("Unable to update variable scopes:", e);
    }
    let totalSuccess = 0;
    for (const node of nodes) {
      try {
        node.layoutMode = "HORIZONTAL";
        node.layoutWrap = "NO_WRAP";
        node.primaryAxisSizingMode = "AUTO";
        node.counterAxisSizingMode = "AUTO";
        node.fills = [];
        const safeBind = (prop, variable) => {
          if (!variable) return;
          try {
            node.setBoundVariable(prop, variable);
          } catch (e) {
            console.warn(`[safeBind] Failed to bind ${prop} on ${node.name}:`, e);
          }
        };
        safeBind("itemSpacing", varGap);
        safeBind("counterAxisSpacing", varGap);
        safeBind("paddingTop", varPadding);
        safeBind("paddingBottom", varPadding);
        safeBind("paddingLeft", varPadding);
        safeBind("paddingRight", varPadding);
        if (varRadius) {
          try {
            node.setBoundVariable("cornerRadius", varRadius);
          } catch (err) {
            safeBind("topLeftRadius", varRadius);
            safeBind("topRightRadius", varRadius);
            safeBind("bottomLeftRadius", varRadius);
            safeBind("bottomRightRadius", varRadius);
          }
        }
        if ("cornerSmoothing" in node) {
          try {
            node.cornerSmoothing = 0.6;
          } catch (e) {
          }
        }
        try {
          node.dashPattern = [4, 4];
          node.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
          if (varBorderColor) {
            const newStrokes = [...node.strokes].map((paint) => {
              if (paint.type === "SOLID") {
                return figma.variables.setBoundVariableForPaint(paint, "color", varBorderColor);
              }
              return paint;
            });
            node.strokes = newStrokes;
          }
          if (varBorder) {
            safeBind("strokeWeight", varBorder);
          }
        } catch (e) {
          console.warn(`[strokes] Failed to set strokes on ${node.name}:`, e);
        }
        totalSuccess++;
      } catch (err) {
        console.error(`Failed to setup ComponentSet "${node.name}":`, err);
      }
    }
    if (totalSuccess > 0) {
      figma.notify(`Skonfigurowano ${totalSuccess} Component Set${totalSuccess > 1 ? "\xF3w" : ""} (Horizontal Auto Layout & tokeny)! \u26A1`);
      sendSelectionToUI();
    }
  }
  async function runSetupComponentSetHorizontalLogic() {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Zaznacz Component Set na canvasie.", { error: true });
      return;
    }
    const compSets = /* @__PURE__ */ new Set();
    for (const node of selection) {
      if (node.type === "COMPONENT_SET") {
        compSets.add(node);
      } else {
        let curr = node;
        while (curr && curr.type !== "PAGE" && curr.type !== "DOCUMENT") {
          if (curr.type === "COMPONENT_SET") {
            compSets.add(curr);
            break;
          }
          curr = curr.parent;
        }
      }
    }
    const allSets = Array.from(compSets);
    if (allSets.length === 0) {
      figma.notify("Nie znaleziono Component Set w zaznaczeniu.", { error: true });
      return;
    }
    await setupComponentSetOnlyHorizontal(allSets);
  }

  // ../../../../plugins/components-setup/src/generator/presets.ts
  var MAMF_LOGO_LIGHT_SVG = `<svg width="287" height="112" viewBox="0 0 287 112" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M84.8816 100.903C84.8681 100.767 84.8004 100.631 84.7192 100.508L72.8756 86.3528C75.7722 83.195 77.8973 81.0853 80.1442 75.8314C85.0576 64.3164 73.7689 59.9336 70.0872 58.8447C69.7895 58.7631 69.4646 58.7903 69.1939 58.9264C68.9232 59.0761 68.7066 59.3075 68.5983 59.6069C67.1365 63.6494 65.9859 66.5214 65.1061 68.25C64.294 69.9378 63.2788 71.4894 62.0606 72.905L48.781 57.0505L46.9549 54.8703C46.7654 54.6525 46.6301 54.3939 46.5489 54.1081C46.4541 53.8358 46.4406 53.5364 46.4676 53.2506C46.5083 52.9647 46.603 52.6789 46.7384 52.4339C46.8873 52.1889 47.0903 51.9711 47.3204 51.7942C47.4815 51.6768 47.6412 51.5594 47.7993 51.4418C52.0249 48.3014 55.182 45.0982 57.2826 41.8444C59.7596 38.0061 60.9913 33.7322 60.9913 29.0092C60.9913 22.68 58.5955 17.4397 53.7904 13.2611C48.9988 9.09611 42.8266 7 35.2737 7C27.7209 7 22.1713 9.16417 17.4744 13.4925C12.7776 17.8072 10.4359 23.2381 10.4359 29.7714C10.4359 33.2422 11.1398 36.6722 12.4527 39.8844C13.7928 43.26 15.8231 46.5947 18.5437 49.875C12.1279 53.7542 7.44457 57.9328 4.46674 62.3972C1.48892 66.8617 0 71.925 0 77.56C0 85.4 3.07258 91.9333 9.2042 97.16C15.3493 102.387 23.2135 105 32.8103 105C37.0198 105 41.2023 104.415 45.2359 103.258C49.3237 102.101 53.5468 100.318 57.9052 97.9222C59.0557 99.1336 60.4499 100.114 61.9794 100.767C63.5225 101.434 65.1738 101.774 66.8522 101.774H84.1236C84.2725 101.774 84.4214 101.733 84.5432 101.652C84.6651 101.57 84.7598 101.461 84.814 101.325C84.8816 101.203 84.9087 101.053 84.8816 100.903ZM30.5227 23.0339C32.1064 21.5775 34.1503 20.8561 36.6544 20.8561C38.9148 20.8561 40.7962 21.5775 42.2851 23.0339C43.7876 24.4767 44.5321 26.3006 44.5185 28.5056C44.5185 30.6561 43.6793 32.7522 42.0009 34.8211C40.3225 36.8764 37.9132 38.7683 34.7729 40.5106C32.6343 38.36 30.9965 36.2775 29.873 34.2494C28.736 32.235 28.1675 30.3567 28.1675 28.6281C28.1675 26.355 28.9526 24.4903 30.5227 23.0339ZM39.9164 86.9925C37.9267 87.5097 35.8828 87.7819 33.8254 87.7956C29.7241 87.7956 26.3808 86.7067 23.7956 84.5153C21.2103 82.3239 19.9244 79.4792 19.9244 75.9811C19.8973 73.2997 20.7365 70.6728 22.3472 68.5222C23.958 66.3308 26.3808 64.4797 29.6023 62.9553L47.0903 84.4608C44.7757 85.4817 42.3664 86.3256 39.9164 86.9925Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M47.3204 51.7942L29.6023 62.9553L33.3914 67.5697L48.9709 57.2933C48.9257 57.2381 48.8607 57.155 48.781 57.0505L46.9549 54.8703C46.7654 54.6525 46.6301 54.3939 46.5489 54.1081C46.4541 53.8358 46.4406 53.5364 46.4676 53.2506C46.5083 52.9647 46.603 52.6789 46.7384 52.4339C46.8873 52.1889 47.0903 51.9711 47.3204 51.7942ZM47.3204 51.7942L47.7993 51.4418C47.6412 51.5594 47.4815 51.6768 47.3204 51.7942Z" fill="black" fill-opacity="0.22"/><path d="M57.9052 97.9222C57.9052 97.9222 66.3379 92.9269 72.8756 86.3528L77.6661 92.0695C77.6661 92.0695 69.6125 98.7526 60.0834 99.7326C59.1224 99.1609 57.9052 97.9222 57.9052 97.9222Z" fill="black" fill-opacity="0.22"/><path fill-rule="evenodd" clip-rule="evenodd" d="M106.663 0V112H105.287V0H106.663Z" fill="white"/><path d="M144.916 45.701H142.736V36.351C142.736 34.0715 141.723 32.9318 139.698 32.9318C139.137 32.8867 138.574 32.9694 138.05 33.1735C137.526 33.3777 137.055 33.6979 136.673 34.1102C136.028 34.8829 135.706 36.0742 135.706 37.684V45.701H133.493V36.351C133.565 35.4303 133.299 34.5148 132.745 33.7753C132.447 33.477 132.087 33.2471 131.69 33.1014C131.294 32.9558 130.87 32.8979 130.449 32.9318C129.883 32.8825 129.314 32.9683 128.788 33.1822C128.262 33.3961 127.794 33.7318 127.424 34.1617C126.779 34.9795 126.476 36.3189 126.476 38.1669V45.701H124.283V31.3477H126.07L126.418 33.3117H126.521C126.955 32.6038 127.584 32.0359 128.333 31.6761C129.11 31.2752 129.974 31.0717 130.849 31.0837C133.106 31.0837 134.581 31.8929 135.274 33.5113H135.39C135.836 32.7527 136.489 32.1363 137.273 31.734C138.13 31.2928 139.083 31.0715 140.046 31.0901C141.71 31.0901 142.942 31.5194 143.742 32.378C144.542 33.2365 144.942 34.5652 144.942 36.3639L144.916 45.701Z" fill="white"/><path d="M155.52 45.9457C154.586 45.9948 153.653 45.8483 152.78 45.5156C151.907 45.1829 151.113 44.6714 150.45 44.0139C149.216 42.7261 148.601 40.9273 148.605 38.6178C148.605 36.3125 149.179 34.4773 150.321 33.125C150.874 32.4628 151.571 31.9348 152.359 31.5812C153.147 31.2276 154.005 31.0574 154.868 31.0837C155.685 31.04 156.502 31.1765 157.26 31.4837C158.018 31.7909 158.699 32.2611 159.254 32.861C160.349 34.1639 160.913 35.8305 160.834 37.5295V38.9075H150.908C150.848 40.3099 151.307 41.6853 152.198 42.7711C152.657 43.2235 153.207 43.5725 153.813 43.7947C154.418 44.0168 155.064 44.1069 155.707 44.059C157.263 44.05 158.8 43.7189 160.222 43.0867V45.0185C159.508 45.324 158.765 45.5528 158.003 45.701C157.186 45.8667 156.354 45.9487 155.52 45.9457ZM158.493 37.1367C158.568 36.0132 158.241 34.8996 157.571 33.9943C157.241 33.6247 156.832 33.3347 156.374 33.1462C155.916 32.9577 155.421 32.8756 154.926 32.9061C154.412 32.8842 153.898 32.973 153.421 33.1663C152.943 33.3596 152.513 33.6529 152.159 34.0265C151.396 34.8888 150.954 35.9872 150.908 37.1367H158.493Z" fill="white"/><path d="M163.737 40.7234C163.722 39.6514 164.04 38.601 164.646 37.7163C165.54 36.6091 166.662 35.7065 167.936 35.0697C167.377 34.4817 166.859 33.8556 166.388 33.1958C165.85 32.3675 165.551 31.4073 165.523 30.4205C165.493 29.8455 165.593 29.2712 165.817 28.7404C166.04 28.2096 166.381 27.7361 166.813 27.3553C167.817 26.5788 169.067 26.1901 170.335 26.2607C171.581 26.1791 172.812 26.5675 173.786 27.3489C174.198 27.7361 174.52 28.209 174.73 28.7341C174.939 29.2593 175.031 29.8239 174.998 30.3883C174.995 31.3225 174.679 32.2289 174.102 32.964C173.275 33.9448 172.268 34.758 171.135 35.3595L176.507 40.5109C177.494 39.2609 178.158 37.7883 178.442 36.2223H180.655C180.245 38.3087 179.318 40.2592 177.959 41.8954L181.899 45.701H178.881L176.436 43.3764C175.518 44.2227 174.451 44.8928 173.289 45.3533C172.135 45.7754 170.913 45.9827 169.683 45.9651C168.096 46.0606 166.53 45.5676 165.285 44.5806C164.759 44.0902 164.348 43.4905 164.081 42.8239C163.813 42.1574 163.696 41.4403 163.737 40.7234ZM169.742 43.9946C170.71 44.0278 171.676 43.8665 172.581 43.5203C173.486 43.174 174.312 42.65 175.011 41.9791L169.258 36.4348C168.517 36.8555 167.82 37.3472 167.174 37.903C166.797 38.2501 166.496 38.6724 166.291 39.1426C166.087 39.6129 165.984 40.1207 165.988 40.6333C165.963 41.1004 166.043 41.5672 166.224 41.9987C166.405 42.4303 166.682 42.8154 167.033 43.1253C167.8 43.7331 168.763 44.042 169.742 43.9946ZM172.147 28.6818C171.642 28.2356 170.983 28.0045 170.309 28.0379C169.625 28.0091 168.954 28.239 168.432 28.6818C168.194 28.874 168.002 29.1175 167.872 29.394C167.741 29.6706 167.675 29.973 167.678 30.2788C167.673 30.9058 167.833 31.523 168.142 32.0689C168.595 32.7999 169.143 33.467 169.774 34.0523C170.678 33.5917 171.496 32.9797 172.192 32.2428C172.619 31.7122 172.847 31.0495 172.837 30.369C172.851 30.0547 172.797 29.7411 172.678 29.4498C172.559 29.1586 172.378 28.8966 172.147 28.6818Z" fill="white"/><path d="M204.861 45.701H202.681V36.3511C202.681 34.0716 201.67 32.9318 199.65 32.9318C199.089 32.8858 198.525 32.9681 198.001 33.1722C197.477 33.3764 197.006 33.6972 196.625 34.1102C195.975 34.8829 195.651 36.0742 195.651 37.6841V45.701H193.477V36.3511C193.551 35.4311 193.287 34.5157 192.735 33.7754C192.435 33.4769 192.074 33.2469 191.677 33.1013C191.279 32.9557 190.855 32.8978 190.433 32.9318C189.867 32.8825 189.297 32.9684 188.771 33.1822C188.245 33.3961 187.778 33.7318 187.408 34.1617C186.763 34.9795 186.466 36.3189 186.466 38.167V45.701H184.254V31.3477H186.04L186.395 33.3117H186.498C186.916 32.6114 187.524 32.0441 188.253 31.6761C189.032 31.276 189.898 31.0726 190.775 31.0837C193.026 31.0837 194.503 31.8951 195.193 33.5114H195.315C195.759 32.753 196.41 32.1365 197.192 31.7341C198.051 31.2939 199.006 31.0727 199.972 31.0902C201.627 31.0902 202.857 31.5194 203.661 32.378C204.465 33.2366 204.865 34.5653 204.861 36.364V45.701Z" fill="white"/><path d="M209.228 52.1404C208.562 52.1394 207.898 52.0682 207.248 51.9279V50.1635C207.783 50.2712 208.327 50.3252 208.873 50.3245C210.376 50.3245 211.453 49.4809 212.098 47.8067L212.904 45.759L207.099 31.3478H209.44L212.607 39.5193C213.126 40.8376 213.556 42.1885 213.897 43.5632H214.001C214.123 43.0674 214.355 42.3268 214.691 41.3352C215.026 40.3435 216.232 37.0208 218.303 31.3478H220.65L214.439 47.6779C214.023 48.9786 213.287 50.1543 212.298 51.0972C211.436 51.8067 210.344 52.1776 209.228 52.1404Z" fill="white"/><path d="M132.7 73.3901V85.2964H124.315V53.5826H142.975V60.4727H132.7V66.5257H142.149V73.3901H132.7Z" fill="white"/><path d="M162.414 60.2862C163.28 60.3141 164.142 60.4023 164.994 60.5502L164.253 68.5543C163.305 68.3586 162.338 68.27 161.37 68.2903C157.852 68.2903 156.094 69.9366 156.094 73.2293V85.3095H147.644V60.7177H153.926L155.216 64.6457H155.629C156.332 63.3383 157.375 62.244 158.648 61.4775C159.765 60.7323 161.071 60.3192 162.414 60.2862Z" fill="white"/><path d="M177.21 54.6194C177.21 57.0921 175.706 58.3285 172.696 58.3285C169.686 58.3285 168.181 57.0921 168.181 54.6194C168.135 54.092 168.207 53.5611 168.391 53.0646C168.575 52.5681 168.867 52.1183 169.245 51.7474C169.954 51.1035 171.096 50.8331 172.65 50.8331C174.205 50.8331 175.353 51.1422 176.082 51.7732C176.471 52.1331 176.775 52.5757 176.97 53.0683C177.165 53.5608 177.248 54.0909 177.21 54.6194ZM176.875 60.7175V85.3093H168.432V60.7175H176.875Z" fill="white"/><path d="M194.574 85.7474C190.497 85.7474 187.332 84.6613 185.079 82.4891C182.826 80.3169 181.697 77.1744 181.693 73.0618C181.693 68.9793 182.734 65.8283 184.815 63.6089C186.896 61.3895 189.829 60.2819 193.612 60.2862C197.405 60.2862 200.303 61.2585 202.307 63.2032C204.311 65.1479 205.315 67.9275 205.319 71.5422V75.3221H190.252C190.249 75.935 190.381 76.5411 190.638 77.0975C190.895 77.6539 191.272 78.147 191.742 78.5417C192.806 79.3622 194.127 79.7777 195.47 79.7137C198.337 79.7707 201.174 79.125 203.732 77.8334V83.9315C202.464 84.6031 201.1 85.0786 199.688 85.3417C197.999 85.6321 196.287 85.7679 194.574 85.7474ZM196.663 67.1312C196.338 66.7761 195.938 66.4969 195.492 66.3133C195.046 66.1297 194.565 66.0462 194.083 66.0687C193.609 66.0462 193.135 66.1215 192.691 66.2899C192.247 66.4583 191.843 66.7162 191.503 67.0475C190.786 67.8578 190.382 68.8964 190.362 69.9774H197.605C197.656 68.9449 197.32 67.9304 196.663 67.1312Z" fill="white"/><path d="M233.95 85.3095H225.513V71.9028C225.513 68.6144 224.529 66.9681 222.559 66.9638C221.937 66.9271 221.317 67.0673 220.771 67.3682C220.226 67.6691 219.777 68.1184 219.476 68.6638C218.831 69.7971 218.509 71.7611 218.509 74.5558V85.3095H210.066V60.7177H216.445L217.503 63.757H217.987C219.427 61.4389 221.889 60.2819 225.372 60.2862C228.072 60.2862 230.175 61.0761 231.679 62.6559C233.184 64.2357 233.935 66.4594 233.931 69.3271L233.95 85.3095Z" fill="white"/><path d="M247.656 60.2863C248.91 60.2557 250.151 60.5461 251.261 61.1298C252.411 61.8053 253.373 62.7571 254.061 63.8987H254.228C253.957 61.9788 253.819 60.0423 253.815 58.1033V51.5545H262.329V85.3096H255.95L254.106 82.1994H253.77C253.092 83.2719 252.156 84.1584 251.047 84.7784C249.939 85.3983 248.693 85.732 247.423 85.7493C246.152 85.7666 244.897 85.4668 243.772 84.8772C242.647 84.2877 241.688 83.427 240.98 82.3732C239.385 80.0551 238.594 76.9191 238.607 72.9653C238.62 69.0116 239.426 65.91 241.025 63.6605C241.751 62.581 242.742 61.7046 243.902 61.1141C245.062 60.5236 246.354 60.2387 247.656 60.2863ZM248.107 68.696C247.427 70.0813 247.114 71.6178 247.198 73.1585C247.106 74.6784 247.424 76.1952 248.12 77.5502C248.422 77.9885 248.822 78.351 249.288 78.6093C249.754 78.8676 250.273 79.0147 250.805 79.039C251.338 79.0634 251.868 78.9643 252.356 78.7495C252.844 78.5348 253.275 78.2102 253.615 77.8013C254.183 76.9706 254.486 75.6441 254.538 73.8089V73.1328C254.538 70.9863 254.23 69.4516 253.615 68.5286C253.296 68.0601 252.858 67.6841 252.346 67.4388C251.834 67.1934 251.266 67.0873 250.7 67.1313C250.159 67.1171 249.625 67.2566 249.16 67.5336C248.696 67.8107 248.351 68.2138 248.107 68.696Z" fill="white"/><path d="M284.53 72.0252C286.172 73.313 286.996 75.2448 287 77.8206C287.004 80.3963 286.121 82.3539 284.349 83.6933C282.582 85.0455 280.013 85.7216 276.641 85.7216C275.061 85.7362 273.481 85.6393 271.914 85.4319C270.51 85.2234 269.134 84.8583 267.812 84.3436V77.5952C269.221 78.2182 270.688 78.7034 272.191 79.044C273.539 79.3729 274.919 79.55 276.306 79.5721C278.125 79.5721 279.041 79.1535 279.041 78.3164C279.025 78.0783 278.947 77.8484 278.816 77.6488C278.685 77.4492 278.505 77.2866 278.293 77.1766C276.848 76.4069 275.35 75.742 273.81 75.1869C271.54 74.221 269.964 73.1478 269.082 71.9672C268.173 70.6688 267.72 69.1066 267.792 67.5241C267.753 66.4864 267.974 65.4553 268.434 64.5242C268.895 63.5932 269.581 62.7917 270.43 62.1923C272.193 60.9044 274.588 60.2605 277.615 60.2605C280.802 60.2948 283.944 61.0083 286.832 62.3533L284.53 67.8267C283.384 67.3136 282.203 66.8832 280.995 66.5388C279.997 66.2227 278.959 66.0451 277.912 66.0108C276.538 66.0108 275.848 66.3457 275.848 67.0218C275.863 67.2488 275.937 67.4678 276.064 67.6567C276.191 67.8456 276.366 67.9976 276.571 68.0972C277.924 68.7841 279.318 69.3905 280.744 69.913C282.1 70.4344 283.374 71.1456 284.53 72.0252Z" fill="white"/></svg>`;
  function getMarqueePreset(rootName = "Marquee") {
    const itemSubComponent = {
      type: "COMPONENT",
      name: `${rootName}/Item`,
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "CENTER",
      primaryAxisSizingMode: "AUTO",
      counterAxisSizingMode: "AUTO",
      itemSpacing: 24,
      itemSpacingVar: "spacing/semi-large",
      paddingLeft: 24,
      paddingLeftVar: "spacing/semi-large",
      paddingRight: 24,
      paddingRightVar: "spacing/semi-large",
      paddingTop: 0,
      paddingBottom: 0,
      paddingTopVar: "constant/none",
      paddingBottomVar: "constant/none",
      cornerRadius: 0,
      cornerRadiusVar: "constant/none",
      fills: [],
      children: [
        {
          type: "TEXT",
          name: `${rootName}Text`,
          textStyleName: "default/body/medium/bold",
          characters: "20 YEARS OF MAMF",
          fontStyle: "Bold",
          fontSize: 16,
          letterSpacing: 10,
          textCase: "UPPER",
          fills: dsRegistry.getFill("on-primary-unstable")
        },
        {
          type: "INSTANCE",
          name: `${rootName}Logo`,
          componentName: "Logotype",
          variantProperties: {
            Size: "SemiLarge",
            Schemes: "OnSurfaceDarkWhite"
          },
          svgContent: MAMF_LOGO_LIGHT_SVG
        }
      ]
    };
    const buildTickerItems = (count) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({
          type: "INSTANCE",
          name: `${rootName}/Item`,
          componentName: `${rootName}/Item`
        });
      }
      return items;
    };
    return {
      name: rootName,
      description: `Animated ${rootName} component with continuous marquee motion.`,
      subComponents: [itemSubComponent],
      variants: [
        {
          name: "Type=Desktop",
          width: 1440,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "FIXED",
          counterAxisSizingMode: "AUTO",
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "CENTER",
          paddingTop: 8,
          paddingBottom: 8,
          paddingTopVar: "spacing/extra-small",
          paddingBottomVar: "spacing/extra-small",
          paddingLeft: 0,
          paddingRight: 0,
          paddingLeftVar: "constant/none",
          paddingRightVar: "constant/none",
          cornerRadius: 0,
          cornerRadiusVar: "constant/none",
          clipsContent: true,
          fills: dsRegistry.getFill("primary"),
          strokes: [],
          strokeTopWeight: 0,
          strokeBottomWeight: 0,
          strokeLeftWeight: 0,
          strokeRightWeight: 0,
          children: [
            {
              type: "FRAME",
              name: `${rootName}/Track`,
              layoutMode: "HORIZONTAL",
              primaryAxisSizingMode: "AUTO",
              counterAxisSizingMode: "AUTO",
              primaryAxisAlignItems: "CENTER",
              counterAxisAlignItems: "CENTER",
              itemSpacing: 0,
              itemSpacingVar: "constant/none",
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
              paddingTopVar: "constant/none",
              paddingBottomVar: "constant/none",
              paddingLeftVar: "constant/none",
              paddingRightVar: "constant/none",
              cornerRadius: 0,
              cornerRadiusVar: "constant/none",
              fills: [],
              children: buildTickerItems(6)
            }
          ]
        },
        {
          name: "Type=Mobile",
          width: 393,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "FIXED",
          counterAxisSizingMode: "AUTO",
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "CENTER",
          paddingTop: 4,
          paddingBottom: 4,
          paddingTopVar: "spacing/pico",
          paddingBottomVar: "spacing/pico",
          paddingLeft: 0,
          paddingRight: 0,
          paddingLeftVar: "constant/none",
          paddingRightVar: "constant/none",
          cornerRadius: 0,
          cornerRadiusVar: "constant/none",
          clipsContent: true,
          fills: dsRegistry.getFill("primary"),
          strokes: [],
          strokeTopWeight: 0,
          strokeBottomWeight: 0,
          strokeLeftWeight: 0,
          strokeRightWeight: 0,
          children: [
            {
              type: "FRAME",
              name: `${rootName}/Track`,
              layoutMode: "HORIZONTAL",
              primaryAxisSizingMode: "AUTO",
              counterAxisSizingMode: "AUTO",
              primaryAxisAlignItems: "CENTER",
              counterAxisAlignItems: "CENTER",
              itemSpacing: 0,
              itemSpacingVar: "constant/none",
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
              paddingTopVar: "constant/none",
              paddingBottomVar: "constant/none",
              paddingLeftVar: "constant/none",
              paddingRightVar: "constant/none",
              cornerRadius: 0,
              cornerRadiusVar: "constant/none",
              fills: [],
              children: buildTickerItems(4)
            }
          ]
        }
      ]
    };
  }
  async function handleGenerateComponent(schema, force = false) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    if (!schema || !schema.variants || schema.variants.length === 0) {
      figma.notify("Invalid component schema: missing variants", { error: true });
      return;
    }
    const engine = new VariableEngine();
    await engine.init();
    if (!force) {
      const missingStyles = /* @__PURE__ */ new Set();
      const checkNode = (n) => {
        if (n.type === "TEXT" && n.textStyleName) {
          const found = engine.findTextStyle(n.textStyleName);
          if (!found) {
            missingStyles.add(n.textStyleName);
          }
        }
        if (n.children) {
          for (const c of n.children) checkNode(c);
        }
      };
      if (schema.subComponents) {
        for (const s of schema.subComponents) checkNode(s);
      }
      if (schema.variants) {
        for (const v of schema.variants) checkNode(v);
      }
      if (missingStyles.size > 0) {
        const missingList = Array.from(missingStyles);
        figma.ui.postMessage({
          type: "missing-text-styles-confirm",
          missingStyles: missingList,
          componentName: schema.name,
          schema
        });
        figma.notify(`\u26A0\uFE0F Nie odnaleziono stylu tekstu: ${missingList.join(", ")}`, { timeout: 6e3 });
        return;
      }
    }
    const subComponentMasters = /* @__PURE__ */ new Map();
    if (schema.subComponents && schema.subComponents.length > 0) {
      let subX = figma.viewport.center.x - 450;
      let subY = figma.viewport.center.y;
      for (const subDef of schema.subComponents) {
        const subName = subDef.name || "SubComponent";
        let compNode = null;
        const found = figma.currentPage.findOne((n) => n.type === "COMPONENT" && n.name === subName);
        if (found && found.type === "COMPONENT") {
          compNode = found;
        } else {
          compNode = figma.createComponent();
          compNode.name = subName;
          compNode.x = subX;
          compNode.y = subY;
        }
        if (subDef.width && subDef.height) {
          compNode.resize(subDef.width, subDef.height);
        }
        if (subDef.layoutMode && subDef.layoutMode !== "NONE") {
          compNode.layoutMode = subDef.layoutMode;
          if (subDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = subDef.primaryAxisSizingMode;
          if (subDef.counterAxisSizingMode) compNode.counterAxisSizingMode = subDef.counterAxisSizingMode;
          if (subDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = subDef.primaryAxisAlignItems;
          if (subDef.counterAxisAlignItems) compNode.counterAxisAlignItems = subDef.counterAxisAlignItems;
          compNode.itemSpacing = (_a = subDef.itemSpacing) != null ? _a : 0;
          compNode.paddingTop = (_b = subDef.paddingTop) != null ? _b : 0;
          compNode.paddingBottom = (_c = subDef.paddingBottom) != null ? _c : 0;
          compNode.paddingLeft = (_d = subDef.paddingLeft) != null ? _d : 0;
          compNode.paddingRight = (_e = subDef.paddingRight) != null ? _e : 0;
        }
        if (subDef.clipsContent !== void 0) {
          compNode.clipsContent = subDef.clipsContent;
        }
        if (subDef.cornerRadius !== void 0) {
          compNode.cornerRadius = subDef.cornerRadius;
          compNode.cornerSmoothing = 0.6;
        }
        if (subDef.fills && subDef.fills.length > 0) {
          compNode.fills = subDef.fills.map((f) => {
            var _a2;
            return {
              type: "SOLID",
              color: parseHexOrRgb(f.color || f.hex),
              opacity: (_a2 = f.opacity) != null ? _a2 : 1
            };
          });
        } else {
          compNode.fills = [];
        }
        if (subDef.strokes && subDef.strokes.length > 0) {
          compNode.strokes = subDef.strokes.map((s) => {
            var _a2;
            return {
              type: "SOLID",
              color: parseHexOrRgb(s.color || s.hex),
              opacity: (_a2 = s.opacity) != null ? _a2 : 1
            };
          });
          if (subDef.strokeWeight !== void 0) compNode.strokeWeight = subDef.strokeWeight;
        }
        while (compNode.children.length > 0) {
          compNode.children[0].remove();
        }
        if (subDef.children && subDef.children.length > 0) {
          for (const childDef of subDef.children) {
            await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
          }
        }
        await engine.bindNodeVariables(compNode, subDef);
        await engine.bindVariablesRecursively(compNode);
        subComponentMasters.set(subName, compNode);
        subY += compNode.height + 40;
      }
    }
    let existingSet = null;
    const currentSel = figma.currentPage.selection;
    for (const node of currentSel) {
      if (node.type === "COMPONENT_SET" && node.name.toLowerCase() === schema.name.toLowerCase()) {
        existingSet = node;
        break;
      }
      if (node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET" && node.parent.name.toLowerCase() === schema.name.toLowerCase()) {
        existingSet = node.parent;
        break;
      }
    }
    if (!existingSet) {
      const found = figma.currentPage.findOne((n) => n.type === "COMPONENT_SET" && n.name.toLowerCase() === schema.name.toLowerCase());
      if (found) existingSet = found;
    }
    if (existingSet) {
      figma.notify(`Updating existing "${existingSet.name}" with design system variables... \u23F3`);
      const variantsInSet = existingSet.children.filter((c) => c.type === "COMPONENT");
      const updatedVariants = [];
      for (const variantDef of schema.variants) {
        let compNode = variantsInSet.find((v) => v.name.toLowerCase() === (variantDef.name || "").toLowerCase());
        if (compNode) {
          if (variantDef.width && variantDef.height) {
            compNode.resize(variantDef.width, variantDef.height);
          }
          if (variantDef.layoutMode && variantDef.layoutMode !== "NONE") {
            compNode.layoutMode = variantDef.layoutMode;
            if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
            if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
            if (variantDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = variantDef.primaryAxisAlignItems;
            if (variantDef.counterAxisAlignItems) compNode.counterAxisAlignItems = variantDef.counterAxisAlignItems;
            compNode.itemSpacing = (_f = variantDef.itemSpacing) != null ? _f : 0;
            compNode.paddingTop = (_g = variantDef.paddingTop) != null ? _g : 0;
            compNode.paddingBottom = (_h = variantDef.paddingBottom) != null ? _h : 0;
            compNode.paddingLeft = (_i = variantDef.paddingLeft) != null ? _i : 0;
            compNode.paddingRight = (_j = variantDef.paddingRight) != null ? _j : 0;
          }
          if (variantDef.cornerRadius !== void 0) {
            compNode.cornerRadius = variantDef.cornerRadius;
            compNode.cornerSmoothing = 0.6;
          }
          if (variantDef.fills && variantDef.fills.length > 0) {
            compNode.fills = variantDef.fills.map((f) => {
              var _a2;
              return {
                type: "SOLID",
                color: parseHexOrRgb(f.color || f.hex),
                opacity: (_a2 = f.opacity) != null ? _a2 : 1
              };
            });
          }
          if (variantDef.strokes && variantDef.strokes.length > 0) {
            compNode.strokes = variantDef.strokes.map((s) => {
              var _a2;
              return {
                type: "SOLID",
                color: parseHexOrRgb(s.color || s.hex),
                opacity: (_a2 = s.opacity) != null ? _a2 : 1
              };
            });
            if (variantDef.strokeWeight !== void 0) compNode.strokeWeight = variantDef.strokeWeight;
            if (variantDef.strokeTopWeight !== void 0) compNode.strokeTopWeight = variantDef.strokeTopWeight;
            if (variantDef.strokeBottomWeight !== void 0) compNode.strokeBottomWeight = variantDef.strokeBottomWeight;
            if (variantDef.strokeLeftWeight !== void 0) compNode.strokeLeftWeight = variantDef.strokeLeftWeight;
            if (variantDef.strokeRightWeight !== void 0) compNode.strokeRightWeight = variantDef.strokeRightWeight;
          }
          if (variantDef.children && variantDef.children.length > 0) {
            while (compNode.children.length > 0) {
              compNode.children[0].remove();
            }
            for (const childDef of variantDef.children) {
              await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
            }
          }
          if (variantDef.layoutMode && variantDef.layoutMode !== "NONE") {
            if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
            if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
          }
          if (variantDef.width) {
            if (variantDef.counterAxisSizingMode === "AUTO") {
              compNode.resize(variantDef.width, compNode.height);
            } else if (variantDef.height) {
              compNode.resize(variantDef.width, variantDef.height);
            }
          }
          await engine.bindNodeVariables(compNode, variantDef);
          await engine.bindVariablesRecursively(compNode);
          updatedVariants.push(compNode);
        } else {
          const newComp = figma.createComponent();
          newComp.name = variantDef.name || "type=default";
          if (variantDef.width && variantDef.height) newComp.resize(variantDef.width, variantDef.height);
          if (variantDef.children && variantDef.children.length > 0) {
            for (const childDef of variantDef.children) {
              await buildFigmaNode(childDef, newComp, engine, subComponentMasters);
            }
          }
          if (variantDef.layoutMode && variantDef.layoutMode !== "NONE") {
            if (variantDef.primaryAxisSizingMode) newComp.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
            if (variantDef.counterAxisSizingMode) newComp.counterAxisSizingMode = variantDef.counterAxisSizingMode;
          }
          if (variantDef.width) {
            if (variantDef.counterAxisSizingMode === "AUTO") {
              newComp.resize(variantDef.width, newComp.height);
            } else if (variantDef.height) {
              newComp.resize(variantDef.width, variantDef.height);
            }
          }
          await engine.bindNodeVariables(newComp, variantDef);
          existingSet.appendChild(newComp);
          updatedVariants.push(newComp);
        }
      }
      await setupComponentSets([existingSet]);
      await applyVariantMetrics(existingSet.children.filter((c) => c.type === "COMPONENT"));
      sanitizeComponentProperties(existingSet);
      sanitizeLayerNames(existingSet);
      figma.currentPage.selection = [existingSet];
      figma.viewport.scrollAndZoomIntoView([existingSet]);
      figma.notify(`Updated existing "${schema.name}" with design system variables! \u2728`);
      return;
    }
    figma.notify(`Generating "${schema.name}" on canvas with design system variables... \u23F3`);
    const createdComponents = [];
    const startX = figma.viewport.center.x;
    let currentY = figma.viewport.center.y;
    for (const variantDef of schema.variants) {
      const compNode = figma.createComponent();
      compNode.name = variantDef.name || "type=default";
      compNode.x = startX;
      compNode.y = currentY;
      if (variantDef.width && variantDef.height) {
        compNode.resize(variantDef.width, variantDef.height);
      }
      if (variantDef.layoutMode && variantDef.layoutMode !== "NONE") {
        compNode.layoutMode = variantDef.layoutMode;
        if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
        if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
        if (variantDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = variantDef.primaryAxisAlignItems;
        if (variantDef.counterAxisAlignItems) compNode.counterAxisAlignItems = variantDef.counterAxisAlignItems;
        compNode.itemSpacing = (_k = variantDef.itemSpacing) != null ? _k : 0;
        compNode.paddingTop = (_l = variantDef.paddingTop) != null ? _l : 0;
        compNode.paddingBottom = (_m = variantDef.paddingBottom) != null ? _m : 0;
        compNode.paddingLeft = (_n = variantDef.paddingLeft) != null ? _n : 0;
        compNode.paddingRight = (_o = variantDef.paddingRight) != null ? _o : 0;
      }
      if (variantDef.clipsContent !== void 0) {
        compNode.clipsContent = variantDef.clipsContent;
      }
      if (variantDef.cornerRadius !== void 0) {
        compNode.cornerRadius = variantDef.cornerRadius;
        compNode.cornerSmoothing = 0.6;
      }
      if (variantDef.fills && variantDef.fills.length > 0) {
        compNode.fills = variantDef.fills.map((f) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(f.color || f.hex),
            opacity: (_a2 = f.opacity) != null ? _a2 : 1
          };
        });
      } else {
        compNode.fills = [];
      }
      if (variantDef.strokes && variantDef.strokes.length > 0) {
        compNode.strokes = variantDef.strokes.map((s) => {
          var _a2;
          return {
            type: "SOLID",
            color: parseHexOrRgb(s.color || s.hex),
            opacity: (_a2 = s.opacity) != null ? _a2 : 1
          };
        });
        if (variantDef.strokeWeight !== void 0) compNode.strokeWeight = variantDef.strokeWeight;
        if (variantDef.strokeTopWeight !== void 0) compNode.strokeTopWeight = variantDef.strokeTopWeight;
        if (variantDef.strokeBottomWeight !== void 0) compNode.strokeBottomWeight = variantDef.strokeBottomWeight;
        if (variantDef.strokeLeftWeight !== void 0) compNode.strokeLeftWeight = variantDef.strokeLeftWeight;
        if (variantDef.strokeRightWeight !== void 0) compNode.strokeRightWeight = variantDef.strokeRightWeight;
      }
      if (variantDef.children && variantDef.children.length > 0) {
        for (const childDef of variantDef.children) {
          await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
        }
      }
      if (variantDef.layoutMode && variantDef.layoutMode !== "NONE") {
        if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
        if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
      }
      if (variantDef.width) {
        if (variantDef.counterAxisSizingMode === "AUTO") {
          compNode.resize(variantDef.width, compNode.height);
        } else if (variantDef.height) {
          compNode.resize(variantDef.width, variantDef.height);
        }
      }
      await engine.bindNodeVariables(compNode, variantDef);
      createdComponents.push(compNode);
      currentY += compNode.height + 48;
    }
    let finalSelection;
    const parent = figma.currentPage;
    const componentSet = figma.combineAsVariants(createdComponents, parent);
    componentSet.name = schema.name;
    if (schema.description) {
      componentSet.description = schema.description;
    }
    await setupComponentSets([componentSet]);
    await applyVariantMetrics(createdComponents);
    sanitizeComponentProperties(componentSet);
    sanitizeLayerNames(componentSet);
    finalSelection = componentSet;
    figma.currentPage.selection = [finalSelection];
    figma.viewport.scrollAndZoomIntoView([finalSelection]);
    figma.notify(`Created Component Set "${schema.name}" with full Apply rules & variables! \u2728`);
  }
  function getButtonPreset() {
    const arrowSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="12" y2="4" /><polyline points="6 4 12 4 12 10" /></svg>`;
    return {
      name: "Button",
      description: "Design System Button component with variants & text styles.",
      variants: [
        {
          name: "size=small, style=filled",
          height: 44,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "AUTO",
          counterAxisSizingMode: "FIXED",
          primaryAxisAlignItems: "CENTER",
          counterAxisAlignItems: "CENTER",
          itemSpacing: 8,
          itemSpacingVar: "spacing/small",
          paddingLeft: 16,
          paddingRight: 16,
          paddingLeftVar: "spacing/base",
          paddingRightVar: "spacing/base",
          cornerRadius: 22,
          cornerRadiusVar: "radius/small",
          fills: dsRegistry.getFill("primary"),
          children: [
            {
              type: "TEXT",
              name: "label",
              textStyleName: "default/body/medium/bold",
              characters: "Button",
              fontStyle: "Bold",
              fontSize: 14,
              fills: dsRegistry.getFill("on-primary-unstable")
            },
            {
              type: "SVG",
              name: "ArrowIcon",
              svgContent: arrowSvg,
              width: 16,
              height: 16
            }
          ]
        },
        {
          name: "size=medium, style=filled",
          height: 48,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "AUTO",
          counterAxisSizingMode: "FIXED",
          primaryAxisAlignItems: "CENTER",
          counterAxisAlignItems: "CENTER",
          itemSpacing: 10,
          itemSpacingVar: "spacing/small",
          paddingLeft: 20,
          paddingRight: 20,
          paddingLeftVar: "spacing/medium",
          paddingRightVar: "spacing/medium",
          cornerRadius: 24,
          cornerRadiusVar: "radius/base",
          fills: dsRegistry.getFill("primary"),
          children: [
            {
              type: "TEXT",
              name: "label",
              textStyleName: "default/body/large/bold",
              characters: "Button",
              fontStyle: "Bold",
              fontSize: 16,
              fills: dsRegistry.getFill("on-primary-unstable")
            },
            {
              type: "SVG",
              name: "ArrowIcon",
              svgContent: arrowSvg,
              width: 16,
              height: 16
            }
          ]
        },
        {
          name: "size=large, style=filled",
          height: 56,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "AUTO",
          counterAxisSizingMode: "FIXED",
          primaryAxisAlignItems: "CENTER",
          counterAxisAlignItems: "CENTER",
          itemSpacing: 12,
          itemSpacingVar: "spacing/base",
          paddingLeft: 24,
          paddingRight: 24,
          paddingLeftVar: "spacing/semi-large",
          paddingRightVar: "spacing/semi-large",
          cornerRadius: 28,
          cornerRadiusVar: "radius/large",
          fills: dsRegistry.getFill("primary"),
          children: [
            {
              type: "TEXT",
              name: "label",
              textStyleName: "default/body/large/bold",
              characters: "Button",
              fontStyle: "Bold",
              fontSize: 16,
              fills: dsRegistry.getFill("on-primary-unstable")
            },
            {
              type: "SVG",
              name: "ArrowIcon",
              svgContent: arrowSvg,
              width: 16,
              height: 16
            }
          ]
        },
        {
          name: "size=medium, style=outline",
          height: 48,
          layoutMode: "HORIZONTAL",
          primaryAxisSizingMode: "AUTO",
          counterAxisSizingMode: "FIXED",
          primaryAxisAlignItems: "CENTER",
          counterAxisAlignItems: "CENTER",
          itemSpacing: 10,
          itemSpacingVar: "spacing/small",
          paddingLeft: 20,
          paddingRight: 20,
          paddingLeftVar: "spacing/medium",
          paddingRightVar: "spacing/medium",
          cornerRadius: 24,
          cornerRadiusVar: "radius/base",
          fills: [],
          strokes: dsRegistry.getStroke("outline-base", 0.6),
          strokeWeight: 1,
          children: [
            {
              type: "TEXT",
              name: "label",
              textStyleName: "default/body/large/bold",
              characters: "Button",
              fontStyle: "Bold",
              fontSize: 16,
              fills: dsRegistry.getFill("on-surface")
            },
            {
              type: "SVG",
              name: "ArrowIcon",
              svgContent: arrowSvg,
              width: 16,
              height: 16
            }
          ]
        }
      ]
    };
  }
  async function handleGeneratePreset(presetName, force = false) {
    if (presetName === "Marquee") {
      const schema = getMarqueePreset();
      await handleGenerateComponent(schema, force);
    } else if (presetName === "Button") {
      const schema = getButtonPreset();
      await handleGenerateComponent(schema, force);
    } else {
      figma.notify(`Preset "${presetName}" not found`, { error: true });
    }
  }

  // ../../../../plugins/components-setup/src/casing/casing.ts
  async function handleConvertCase(caseType, skipInstances) {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Zaznacz warstw\u0119 tekstow\u0105 lub ramk\u0119!", { error: true });
      return;
    }
    const collectedTextNodes = [];
    const seenIds = /* @__PURE__ */ new Set();
    function collectTexts(node, isRoot) {
      if (node.locked) return;
      if (node.type === "TEXT") {
        if (!seenIds.has(node.id)) {
          seenIds.add(node.id);
          collectedTextNodes.push(node);
        }
        return;
      }
      if ("children" in node && Array.isArray(node.children)) {
        if (skipInstances && !isRoot && node.type === "INSTANCE") {
          return;
        }
        for (const child of node.children) {
          collectTexts(child, false);
        }
      }
    }
    for (const sel of selection) {
      collectTexts(sel, true);
    }
    const caseNameMap = {
      sentence: "Sentence case",
      title: "Title Case",
      upper: "UPPERCASE",
      lower: "lowercase",
      camel: "camelCase",
      pascal: "PascalCase",
      kebab: "kebab-case"
    };
    const modeName = caseNameMap[caseType] || caseType;
    if (collectedTextNodes.length === 0) {
      figma.notify("Nie znaleziono odblokowanych warstw tekstowych w zaznaczeniu.", { error: true });
      return;
    }
    let convertedCount = 0;
    const isOneToOneLengthMode = ["sentence", "title", "upper", "lower"].includes(caseType);
    for (const textNode of collectedTextNodes) {
      try {
        const origText = textNode.characters || "";
        if (!origText) continue;
        const newText = convertStringToCase(origText, caseType);
        await loadAllFontsForTextNode(textNode);
        if (textNode.textCase !== figma.mixed) {
          if (textNode.textCase !== "ORIGINAL") {
            textNode.textCase = "ORIGINAL";
          }
        } else {
          try {
            textNode.setRangeTextCase(0, textNode.characters.length, "ORIGINAL");
          } catch (_) {
          }
        }
        if (newText === origText) {
          convertedCount++;
          continue;
        }
        const isExactSameLength = isOneToOneLengthMode && newText.length === origText.length;
        let segments = [];
        const hasMixed = textNode.fontName === figma.mixed || textNode.fills === figma.mixed || textNode.fontSize === figma.mixed || textNode.textStyleId === figma.mixed || textNode.fillStyleId === figma.mixed;
        if (isExactSameLength && hasMixed && typeof textNode.getStyledTextSegments === "function") {
          try {
            segments = textNode.getStyledTextSegments([
              "fontName",
              "fontSize",
              "letterSpacing",
              "lineHeight",
              "fills",
              "textDecoration",
              "textStyleId",
              "fillStyleId"
            ]);
          } catch (_) {
          }
        }
        textNode.characters = newText;
        if (segments && segments.length > 0) {
          for (const seg of segments) {
            const s = seg.start;
            const e = Math.min(seg.end, newText.length);
            if (e <= s) continue;
            if (seg.textStyleId) {
              try {
                textNode.setRangeTextStyleId(s, e, seg.textStyleId);
              } catch (_) {
              }
            } else {
              if (seg.fontName) try {
                textNode.setRangeFontName(s, e, seg.fontName);
              } catch (_) {
              }
              if (seg.fontSize) try {
                textNode.setRangeFontSize(s, e, seg.fontSize);
              } catch (_) {
              }
              if (seg.letterSpacing) try {
                textNode.setRangeLetterSpacing(s, e, seg.letterSpacing);
              } catch (_) {
              }
              if (seg.lineHeight) try {
                textNode.setRangeLineHeight(s, e, seg.lineHeight);
              } catch (_) {
              }
            }
            if (seg.fillStyleId) {
              try {
                textNode.setRangeFillStyleId(s, e, seg.fillStyleId);
              } catch (_) {
              }
            } else if (seg.fills) {
              try {
                textNode.setRangeFills(s, e, seg.fills);
              } catch (_) {
              }
            }
            if (seg.textDecoration) {
              try {
                textNode.setRangeTextDecoration(s, e, seg.textDecoration);
              } catch (_) {
              }
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

  // ../../../../plugins/components-setup/src/components/atomic.ts
  function convertFrameToComponentAtomic(sourceFrame, mode, preloadedVars, targetPosition) {
    const comp = figma.createComponent();
    comp.name = sourceFrame.name;
    try {
      comp.resizeWithoutConstraints(Math.max(1, sourceFrame.width), Math.max(1, sourceFrame.height));
    } catch (e) {
      try {
        comp.resize(Math.max(1, sourceFrame.width), Math.max(1, sourceFrame.height));
      } catch (e2) {
      }
    }
    try {
      comp.visible = sourceFrame.visible;
    } catch (e) {
    }
    try {
      comp.locked = sourceFrame.locked;
    } catch (e) {
    }
    try {
      comp.opacity = sourceFrame.opacity;
    } catch (e) {
    }
    try {
      comp.blendMode = sourceFrame.blendMode;
    } catch (e) {
    }
    try {
      comp.isMask = sourceFrame.isMask;
    } catch (e) {
    }
    try {
      comp.clipsContent = sourceFrame.clipsContent;
    } catch (e) {
    }
    try {
      comp.rotation = sourceFrame.rotation;
    } catch (e) {
    }
    try {
      if (sourceFrame.fillStyleId && typeof sourceFrame.fillStyleId === "string") {
        comp.fillStyleId = sourceFrame.fillStyleId;
      } else if (sourceFrame.fills !== figma.mixed) {
        comp.fills = JSON.parse(JSON.stringify(sourceFrame.fills));
      }
    } catch (e) {
    }
    try {
      if (sourceFrame.strokeStyleId && typeof sourceFrame.strokeStyleId === "string") {
        comp.strokeStyleId = sourceFrame.strokeStyleId;
      } else if (sourceFrame.strokes) {
        comp.strokes = JSON.parse(JSON.stringify(sourceFrame.strokes));
      }
    } catch (e) {
    }
    try {
      comp.strokeAlign = sourceFrame.strokeAlign;
    } catch (e) {
    }
    try {
      comp.strokeCap = sourceFrame.strokeCap;
    } catch (e) {
    }
    try {
      comp.strokeJoin = sourceFrame.strokeJoin;
    } catch (e) {
    }
    try {
      comp.strokeMiterLimit = sourceFrame.strokeMiterLimit;
    } catch (e) {
    }
    try {
      comp.dashPattern = [...sourceFrame.dashPattern];
    } catch (e) {
    }
    try {
      if (sourceFrame.strokeWeight !== figma.mixed) {
        comp.strokeWeight = sourceFrame.strokeWeight;
      } else {
        comp.strokeTopWeight = sourceFrame.strokeTopWeight;
        comp.strokeBottomWeight = sourceFrame.strokeBottomWeight;
        comp.strokeLeftWeight = sourceFrame.strokeLeftWeight;
        comp.strokeRightWeight = sourceFrame.strokeRightWeight;
      }
    } catch (e) {
    }
    try {
      if (sourceFrame.effectStyleId && typeof sourceFrame.effectStyleId === "string") {
        comp.effectStyleId = sourceFrame.effectStyleId;
      } else if (sourceFrame.effects) {
        comp.effects = JSON.parse(JSON.stringify(sourceFrame.effects));
      }
    } catch (e) {
    }
    try {
      if (sourceFrame.gridStyleId && typeof sourceFrame.gridStyleId === "string") {
        comp.gridStyleId = sourceFrame.gridStyleId;
      } else if (sourceFrame.layoutGrids) {
        comp.layoutGrids = JSON.parse(JSON.stringify(sourceFrame.layoutGrids));
      }
    } catch (e) {
    }
    try {
      comp.cornerSmoothing = sourceFrame.cornerSmoothing;
    } catch (e) {
    }
    try {
      if (sourceFrame.cornerRadius !== figma.mixed) {
        comp.cornerRadius = sourceFrame.cornerRadius;
      } else {
        comp.topLeftRadius = sourceFrame.topLeftRadius;
        comp.topRightRadius = sourceFrame.topRightRadius;
        comp.bottomLeftRadius = sourceFrame.bottomLeftRadius;
        comp.bottomRightRadius = sourceFrame.bottomRightRadius;
      }
    } catch (e) {
    }
    const layoutMode = sourceFrame.layoutMode;
    if (layoutMode && layoutMode !== "NONE") {
      try {
        comp.layoutMode = layoutMode;
      } catch (e) {
      }
      try {
        comp.layoutWrap = sourceFrame.layoutWrap;
      } catch (e) {
      }
      try {
        comp.primaryAxisSizingMode = sourceFrame.primaryAxisSizingMode;
      } catch (e) {
      }
      try {
        comp.counterAxisSizingMode = sourceFrame.counterAxisSizingMode;
      } catch (e) {
      }
      try {
        comp.primaryAxisAlignItems = sourceFrame.primaryAxisAlignItems;
      } catch (e) {
      }
      try {
        comp.counterAxisAlignItems = sourceFrame.counterAxisAlignItems;
      } catch (e) {
      }
      if (sourceFrame.layoutWrap === "WRAP") {
        try {
          comp.counterAxisAlignContent = sourceFrame.counterAxisAlignContent;
        } catch (e) {
        }
        if (sourceFrame.counterAxisSpacing !== null) {
          try {
            comp.counterAxisSpacing = sourceFrame.counterAxisSpacing;
          } catch (e) {
          }
        }
      }
      try {
        comp.paddingTop = sourceFrame.paddingTop;
      } catch (e) {
      }
      try {
        comp.paddingBottom = sourceFrame.paddingBottom;
      } catch (e) {
      }
      try {
        comp.paddingLeft = sourceFrame.paddingLeft;
      } catch (e) {
      }
      try {
        comp.paddingRight = sourceFrame.paddingRight;
      } catch (e) {
      }
      try {
        comp.itemSpacing = sourceFrame.itemSpacing;
      } catch (e) {
      }
      try {
        comp.itemReverseZIndex = sourceFrame.itemReverseZIndex;
      } catch (e) {
      }
      try {
        comp.strokesIncludedInLayout = sourceFrame.strokesIncludedInLayout;
      } catch (e) {
      }
    }
    try {
      if (sourceFrame.minWidth !== null) comp.minWidth = sourceFrame.minWidth;
    } catch (e) {
    }
    try {
      if (sourceFrame.maxWidth !== null) comp.maxWidth = sourceFrame.maxWidth;
    } catch (e) {
    }
    try {
      if (sourceFrame.minHeight !== null) comp.minHeight = sourceFrame.minHeight;
    } catch (e) {
    }
    try {
      if (sourceFrame.maxHeight !== null) comp.maxHeight = sourceFrame.maxHeight;
    } catch (e) {
    }
    try {
      const bv = sourceFrame.boundVariables;
      if (bv && typeof bv === "object") {
        const scalarFields = [
          "paddingTop",
          "paddingBottom",
          "paddingLeft",
          "paddingRight",
          "itemSpacing",
          "counterAxisSpacing",
          "topLeftRadius",
          "topRightRadius",
          "bottomLeftRadius",
          "bottomRightRadius",
          "strokeTopWeight",
          "strokeBottomWeight",
          "strokeLeftWeight",
          "strokeRightWeight",
          "strokeWeight",
          "width",
          "height",
          "minWidth",
          "maxWidth",
          "minHeight",
          "maxHeight",
          "opacity",
          "visible"
        ];
        for (const field of scalarFields) {
          const alias = bv[field];
          if (alias && typeof alias.id === "string") {
            const v = preloadedVars && preloadedVars.get(alias.id) || (figma.variables.getVariableById ? figma.variables.getVariableById(alias.id) : null);
            if (v) {
              try {
                comp.setBoundVariable(field, v);
              } catch (e) {
              }
            }
          }
        }
      }
    } catch (e) {
    }
    const childrenSnapshot = [...sourceFrame.children];
    for (const child of childrenSnapshot) {
      const cSizingH = "layoutSizingHorizontal" in child ? child.layoutSizingHorizontal : void 0;
      const cSizingV = "layoutSizingVertical" in child ? child.layoutSizingVertical : void 0;
      const cPositioning = "layoutPositioning" in child ? child.layoutPositioning : void 0;
      const cAlign = "layoutAlign" in child ? child.layoutAlign : void 0;
      const cGrow = "layoutGrow" in child ? child.layoutGrow : void 0;
      const cX = child.x;
      const cY = child.y;
      const targetChild = mode === "clone-to-page" ? child.clone() : child;
      comp.appendChild(targetChild);
      if (layoutMode && layoutMode !== "NONE") {
        try {
          if (cPositioning === "ABSOLUTE" && "layoutPositioning" in targetChild) {
            targetChild.layoutPositioning = "ABSOLUTE";
            targetChild.x = cX;
            targetChild.y = cY;
          } else {
            if (cAlign !== void 0 && "layoutAlign" in targetChild) targetChild.layoutAlign = cAlign;
            if (cGrow !== void 0 && "layoutGrow" in targetChild) targetChild.layoutGrow = cGrow;
            if (cSizingH && "layoutSizingHorizontal" in targetChild) targetChild.layoutSizingHorizontal = cSizingH;
            if (cSizingV && "layoutSizingVertical" in targetChild) targetChild.layoutSizingVertical = cSizingV;
          }
        } catch (e) {
        }
      } else {
        try {
          targetChild.x = cX;
          targetChild.y = cY;
        } catch (e) {
        }
      }
    }
    if (mode === "clone-to-page") {
      figma.currentPage.appendChild(comp);
      if (targetPosition) {
        comp.x = targetPosition.x;
        comp.y = targetPosition.y;
      }
      if (layoutMode && layoutMode !== "NONE") {
        try {
          if (sourceFrame.layoutSizingHorizontal === "HUG") comp.layoutSizingHorizontal = "HUG";
          if (sourceFrame.layoutSizingVertical === "HUG") comp.layoutSizingVertical = "HUG";
        } catch (e) {
        }
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
      if (parent && "insertChild" in parent) {
        const idx = parent.children.indexOf(sourceFrame);
        if (idx >= 0) {
          parent.insertChild(idx, comp);
        } else {
          parent.appendChild(comp);
        }
        const parentHasAutoLayout = "layoutMode" in parent && parent.layoutMode && parent.layoutMode !== "NONE";
        if (parentHasAutoLayout) {
          try {
            if (framePositioning === "ABSOLUTE") {
              comp.layoutPositioning = "ABSOLUTE";
              comp.x = frameX;
              comp.y = frameY;
            } else {
              comp.layoutAlign = frameAlign;
              comp.layoutGrow = frameGrow;
              comp.layoutSizingHorizontal = frameSizingH;
              comp.layoutSizingVertical = frameSizingV;
            }
          } catch (e) {
          }
        } else {
          comp.x = frameX;
          comp.y = frameY;
          if (layoutMode && layoutMode !== "NONE") {
            try {
              if (frameSizingH === "HUG") comp.layoutSizingHorizontal = "HUG";
              if (frameSizingV === "HUG") comp.layoutSizingVertical = "HUG";
            } catch (e) {
            }
          }
        }
      }
      try {
        sourceFrame.remove();
      } catch (e) {
      }
    }
    return comp;
  }

  // ../../../../plugins/components-setup/src/renamer/scanner.ts
  var lastAiRenamerPeerMap = /* @__PURE__ */ new Map();
  var lastAiRenamerRootIds = [];
  async function scanLayersForAiRenaming() {
    lastAiRenamerPeerMap.clear();
    lastAiRenamerRootIds = [];
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      return { items: [], totalVariantsCount: 0, targetRoots: [] };
    }
    const targetRoots = [];
    for (const node of selection) {
      if (node.type === "COMPONENT_SET") {
        if (!targetRoots.includes(node)) targetRoots.push(node);
      } else if (node.type === "COMPONENT") {
        const host = node.parent && node.parent.type === "COMPONENT_SET" ? node.parent : node;
        if (!targetRoots.includes(host)) targetRoots.push(host);
      } else {
        let host = null;
        let p = node;
        while (p && p.type !== "PAGE" && p.type !== "DOCUMENT") {
          if (p.type === "COMPONENT_SET") {
            host = p;
            break;
          }
          if (p.type === "COMPONENT") {
            host = p.parent && p.parent.type === "COMPONENT_SET" ? p.parent : p;
            break;
          }
          if (!host && (p.type === "FRAME" || p.type === "GROUP")) {
            host = p;
          }
          p = p.parent;
        }
        if (host && !targetRoots.includes(host)) {
          targetRoots.push(host);
        }
      }
    }
    lastAiRenamerRootIds = targetRoots.map((r) => r.id);
    const collectedItems = [];
    let totalVariants = 0;
    for (const root of targetRoots) {
      if (root.type === "COMPONENT_SET") {
        for (const child of root.children) {
          if (child.type === "COMPONENT") {
            unwrapRedundantSlotWrappers(child);
          }
        }
      } else {
        unwrapRedundantSlotWrappers(root);
      }
      if (root.type === "COMPONENT_SET") {
        const compSet = root;
        const rootCompName = compSet.name || "";
        const variants = compSet.children.filter((c) => c.type === "COMPONENT");
        totalVariants += variants.length;
        const nodesByRelPath = /* @__PURE__ */ new Map();
        const collectVariantTree = (node, relPath, depth) => {
          if (node.type === "INSTANCE" || isSlotContainer(node)) {
            return;
          }
          if (node.type === "FRAME" || node.type === "GROUP" || node.type === "TEXT") {
            const list = nodesByRelPath.get(relPath) || [];
            list.push(node);
            nodesByRelPath.set(relPath, list);
          }
          if ("children" in node && Array.isArray(node.children)) {
            node.children.forEach((child, index) => {
              const nextPath = relPath ? `${relPath}.${index}` : `${index}`;
              collectVariantTree(child, nextPath, depth + 1);
            });
          }
        };
        for (const variant of variants) {
          variant.children.forEach((child, index) => {
            collectVariantTree(child, `${index}`, 1);
          });
        }
        for (const [relPath, peerNodes] of nodesByRelPath.entries()) {
          if (!peerNodes || peerNodes.length === 0) continue;
          const rep = peerNodes[0];
          const peerIds = peerNodes.map((p) => p.id);
          for (const pid of peerIds) {
            lastAiRenamerPeerMap.set(pid, peerIds);
          }
          if (rep.type === "TEXT") {
            const txt = rep;
            const existingTextRole = getExistingSemanticRole(txt.name || "", txt.characters || "");
            const allPeersAlreadyNamed = existingTextRole && peerNodes.every((p) => p.name === existingTextRole);
            if (allPeersAlreadyNamed) {
              continue;
            }
            const parent = txt.parent;
            const parentName = parent ? parent.name || "" : "";
            const parentLayoutMode = parent && "layoutMode" in parent ? parent.layoutMode : "NONE";
            const parentChildren = parent && "children" in parent && Array.isArray(parent.children) ? parent.children : [];
            const indexInParent = parentChildren.indexOf(txt);
            const hasInstanceSibling = parentChildren.some((c) => c !== txt && c.type === "INSTANCE");
            const isLooseText = parentChildren.some((c) => c !== txt && c.type !== "TEXT");
            const prevSibling = indexInParent > 0 ? parentChildren[indexInParent - 1] : null;
            const nextSibling = indexInParent >= 0 && indexInParent < parentChildren.length - 1 ? parentChildren[indexInParent + 1] : null;
            const prevSiblingType = prevSibling ? prevSibling.type : "";
            const nextSiblingType = nextSibling ? nextSibling.type : "";
            let siblingIndex = 0;
            let totalSiblingTexts = 1;
            const textSiblings = parentChildren.filter((c) => c.type === "TEXT");
            totalSiblingTexts = textSiblings.length || 1;
            siblingIndex = textSiblings.indexOf(txt);
            if (siblingIndex < 0) siblingIndex = 0;
            const siblingTexts = textSiblings.map((s) => {
              let sStyleName = "";
              if (typeof s.textStyleId === "string" && s.textStyleId) {
                try {
                  const st = figma.getStyleById(s.textStyleId);
                  if (st) sStyleName = st.name;
                } catch (_) {
                }
              }
              const sFontStyle = s.fontName && typeof s.fontName === "object" && "style" in s.fontName ? s.fontName.style : "";
              return {
                name: s.name || "",
                characters: s.characters || "",
                fontSize: typeof s.fontSize === "number" ? s.fontSize : 14,
                fontStyle: sFontStyle,
                textStyleName: sStyleName,
                isMuted: /muted|subtle|secondary|tertiary/i.test(sStyleName)
              };
            });
            let textStyleName = "";
            if (typeof txt.textStyleId === "string" && txt.textStyleId) {
              try {
                const style = await figma.getStyleByIdAsync(txt.textStyleId);
                if (style) textStyleName = style.name;
              } catch (_) {
                try {
                  const style = figma.getStyleById(txt.textStyleId);
                  if (style) textStyleName = style.name;
                } catch (_2) {
                }
              }
            }
            const fillTokenName = await getNodeFillTokenName(txt);
            let componentPropertyName = "";
            if (txt.componentPropertyReferences && typeof txt.componentPropertyReferences === "object") {
              const charRef = txt.componentPropertyReferences.characters;
              if (charRef && typeof charRef === "string") {
                const rawProp = charRef.split("#")[0].trim();
                if (rawProp) {
                  componentPropertyName = sanitizePascalCase(rawProp);
                }
              }
            }
            const fontStyle = txt.fontName && typeof txt.fontName === "object" && "style" in txt.fontName ? txt.fontName.style : "";
            const suggestedName = classifyTextLayerSemantic({
              currentName: txt.name || "",
              characters: (txt.characters || "").slice(0, 100),
              fontSize: typeof txt.fontSize === "number" ? txt.fontSize : 14,
              fontStyle,
              textStyleName,
              fillTokenName,
              parentName,
              parentLayoutMode,
              siblingIndex,
              totalSiblingTexts,
              siblingTexts,
              componentPropertyName,
              rootComponentName: rootCompName,
              isLooseText,
              hasInstanceSibling,
              prevSiblingType,
              nextSiblingType,
              indexInParent
            });
            collectedItems.push({
              id: txt.id,
              name: txt.name || "",
              type: "TEXT",
              containsText: true,
              rootComponentName: rootCompName,
              width: Math.round("width" in txt ? txt.width : 0),
              height: Math.round("height" in txt ? txt.height : 0),
              characters: (txt.characters || "").slice(0, 100),
              fontSize: typeof txt.fontSize === "number" ? txt.fontSize : "mixed",
              fontStyle,
              textStyleName,
              fillTokenName,
              isLooseText,
              hasInstanceSibling,
              prevSiblingType,
              nextSiblingType,
              indexInParent,
              suggestedName,
              parentName,
              parentLayoutMode,
              siblingIndex,
              totalSiblingTexts,
              componentPropertyName,
              parentPath: `${compSet.name} [Variant AL] > ${parentName}`,
              depth: relPath.split(".").length,
              peerIds
            });
          } else {
            const frame = rep;
            const isDirectRootChild = relPath.split(".").length === 1;
            const hasContentAncestor = hasContentAncestorNode(frame);
            const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
            const allPeersAlreadyNamed = existingFrameRole && peerNodes.every((p) => p.name === existingFrameRole);
            if (allPeersAlreadyNamed) {
              continue;
            }
            const containsText = nodeContainsText(frame);
            const layoutMode = "layoutMode" in frame ? frame.layoutMode : "NONE";
            const layoutWrap = "layoutWrap" in frame ? frame.layoutWrap : "NO_WRAP";
            const paddingTop = "paddingTop" in frame ? frame.paddingTop : 0;
            const paddingBottom = "paddingBottom" in frame ? frame.paddingBottom : 0;
            const paddingLeft = "paddingLeft" in frame ? frame.paddingLeft : 0;
            const paddingRight = "paddingRight" in frame ? frame.paddingRight : 0;
            const itemSpacing = "itemSpacing" in frame ? frame.itemSpacing : 0;
            const clipsContent = "clipsContent" in frame ? frame.clipsContent : false;
            const isSlot = isSlotLayer(frame);
            const suggestedName = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
            const childrenSummary = [];
            if ("children" in frame && Array.isArray(frame.children)) {
              for (const ch of frame.children) {
                const sItem = { type: ch.type, name: ch.name || "" };
                if (ch.type === "TEXT") {
                  const txt = ch;
                  sItem.characters = (txt.characters || "").slice(0, 40);
                  sItem.fontSize = typeof txt.fontSize === "number" ? txt.fontSize : "mixed";
                  sItem.fontStyle = txt.fontName && typeof txt.fontName === "object" && "style" in txt.fontName ? txt.fontName.style : "";
                } else if (ch.type === "INSTANCE") {
                  const inst = ch;
                  if (inst.mainComponent) {
                    sItem.mainComponentName = inst.mainComponent.name || "";
                    if (inst.mainComponent.parent && inst.mainComponent.parent.type === "COMPONENT_SET") {
                      sItem.parentComponentName = inst.mainComponent.parent.name;
                    }
                  }
                  sItem.componentBaseName = getInstanceBaseName(inst);
                }
                childrenSummary.push(sItem);
              }
            }
            collectedItems.push({
              id: frame.id,
              name: frame.name || "",
              type: frame.type,
              containsText,
              rootComponentName: rootCompName,
              width: Math.round("width" in frame ? frame.width : 0),
              height: Math.round("height" in frame ? frame.height : 0),
              layoutMode,
              layoutWrap,
              paddingTop,
              paddingBottom,
              paddingLeft,
              paddingRight,
              itemSpacing,
              clipsContent,
              isSlot,
              parentPath: `${compSet.name} [Variant AL]`,
              depth: relPath.split(".").length,
              childrenSummary,
              peerIds,
              suggestedName,
              isDirectRootChild,
              hasContentAncestor
            });
          }
        }
      } else {
        const isStandaloneComp = root.type === "COMPONENT";
        const rootCompName = root.name || "";
        const scanSubtree = async (node, pathLabel, depth, isRootNode) => {
          if (node.type === "INSTANCE" || isSlotContainer(node)) {
            return;
          }
          const isQualifyingFrame = (node.type === "FRAME" || node.type === "GROUP") && !(isRootNode && isStandaloneComp);
          const isQualifyingText = node.type === "TEXT";
          if (isQualifyingFrame) {
            const frame = node;
            const isDirectRootChild = depth === 1 && !isRootNode || isRootNode && !isStandaloneComp;
            const hasContentAncestor = hasContentAncestorNode(frame);
            const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
            if (!existingFrameRole || frame.name !== existingFrameRole) {
              const containsText = nodeContainsText(frame);
              const peerIds = [frame.id];
              lastAiRenamerPeerMap.set(frame.id, peerIds);
              const layoutMode = "layoutMode" in frame ? frame.layoutMode : "NONE";
              const layoutWrap = "layoutWrap" in frame ? frame.layoutWrap : "NO_WRAP";
              const paddingTop = "paddingTop" in frame ? frame.paddingTop : 0;
              const paddingBottom = "paddingBottom" in frame ? frame.paddingBottom : 0;
              const paddingLeft = "paddingLeft" in frame ? frame.paddingLeft : 0;
              const paddingRight = "paddingRight" in frame ? frame.paddingRight : 0;
              const itemSpacing = "itemSpacing" in frame ? frame.itemSpacing : 0;
              const clipsContent = "clipsContent" in frame ? frame.clipsContent : false;
              const isSlot = isSlotLayer(frame);
              const suggestedName = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);
              const childrenSummary = [];
              if ("children" in frame && Array.isArray(frame.children)) {
                for (const ch of frame.children) {
                  const sItem = { type: ch.type, name: ch.name || "" };
                  if (ch.type === "TEXT") {
                    const txt = ch;
                    sItem.characters = (txt.characters || "").slice(0, 40);
                    sItem.fontSize = typeof txt.fontSize === "number" ? txt.fontSize : "mixed";
                    sItem.fontStyle = txt.fontName && typeof txt.fontName === "object" && "style" in txt.fontName ? txt.fontName.style : "";
                  } else if (ch.type === "INSTANCE") {
                    const inst = ch;
                    if (inst.mainComponent) {
                      sItem.mainComponentName = inst.mainComponent.name || "";
                      if (inst.mainComponent.parent && inst.mainComponent.parent.type === "COMPONENT_SET") {
                        sItem.parentComponentName = inst.mainComponent.parent.name;
                      }
                    }
                    sItem.componentBaseName = getInstanceBaseName(inst);
                  }
                  childrenSummary.push(sItem);
                }
              }
              collectedItems.push({
                id: frame.id,
                name: frame.name || "",
                type: frame.type,
                containsText,
                rootComponentName: rootCompName,
                width: Math.round("width" in frame ? frame.width : 0),
                height: Math.round("height" in frame ? frame.height : 0),
                layoutMode,
                layoutWrap,
                paddingTop,
                paddingBottom,
                paddingLeft,
                paddingRight,
                itemSpacing,
                clipsContent,
                isSlot,
                parentPath: pathLabel || root.name || "Component",
                depth,
                childrenSummary,
                peerIds,
                suggestedName,
                isDirectRootChild,
                hasContentAncestor
              });
            }
          } else if (isQualifyingText) {
            const txt = node;
            const existingTextRole = getExistingSemanticRole(txt.name || "", txt.characters || "");
            if (!existingTextRole || txt.name !== existingTextRole) {
              const peerIds = [txt.id];
              lastAiRenamerPeerMap.set(txt.id, peerIds);
              const parent = txt.parent;
              const parentName = parent ? parent.name || "" : "";
              const parentLayoutMode = parent && "layoutMode" in parent ? parent.layoutMode : "NONE";
              const parentChildren = parent && "children" in parent && Array.isArray(parent.children) ? parent.children : [];
              const indexInParent = parentChildren.indexOf(txt);
              const hasInstanceSibling = parentChildren.some((c) => c !== txt && c.type === "INSTANCE");
              const isLooseText = parentChildren.some((c) => c !== txt && c.type !== "TEXT");
              const prevSibling = indexInParent > 0 ? parentChildren[indexInParent - 1] : null;
              const nextSibling = indexInParent >= 0 && indexInParent < parentChildren.length - 1 ? parentChildren[indexInParent + 1] : null;
              const prevSiblingType = prevSibling ? prevSibling.type : "";
              const nextSiblingType = nextSibling ? nextSibling.type : "";
              let siblingIndex = 0;
              let totalSiblingTexts = 1;
              const textSiblings = parentChildren.filter((c) => c.type === "TEXT");
              totalSiblingTexts = textSiblings.length || 1;
              siblingIndex = textSiblings.indexOf(txt);
              if (siblingIndex < 0) siblingIndex = 0;
              const siblingTexts = textSiblings.map((s) => {
                let sStyleName = "";
                if (typeof s.textStyleId === "string" && s.textStyleId) {
                  try {
                    const st = figma.getStyleById(s.textStyleId);
                    if (st) sStyleName = st.name;
                  } catch (_) {
                  }
                }
                const sFontStyle = s.fontName && typeof s.fontName === "object" && "style" in s.fontName ? s.fontName.style : "";
                return {
                  name: s.name || "",
                  characters: s.characters || "",
                  fontSize: typeof s.fontSize === "number" ? s.fontSize : 14,
                  fontStyle: sFontStyle,
                  textStyleName: sStyleName,
                  isMuted: /muted|subtle|secondary|tertiary/i.test(sStyleName)
                };
              });
              let textStyleName = "";
              if (typeof txt.textStyleId === "string" && txt.textStyleId) {
                try {
                  const style = await figma.getStyleByIdAsync(txt.textStyleId);
                  if (style) textStyleName = style.name;
                } catch (_) {
                  try {
                    const style = figma.getStyleById(txt.textStyleId);
                    if (style) textStyleName = style.name;
                  } catch (_2) {
                  }
                }
              }
              const fillTokenName = await getNodeFillTokenName(txt);
              let componentPropertyName = "";
              if (txt.componentPropertyReferences && typeof txt.componentPropertyReferences === "object") {
                const charRef = txt.componentPropertyReferences.characters;
                if (charRef && typeof charRef === "string") {
                  const rawProp = charRef.split("#")[0].trim();
                  if (rawProp) {
                    componentPropertyName = sanitizePascalCase(rawProp);
                  }
                }
              }
              const fontStyle = txt.fontName && typeof txt.fontName === "object" && "style" in txt.fontName ? txt.fontName.style : "";
              const suggestedName = classifyTextLayerSemantic({
                currentName: txt.name || "",
                characters: (txt.characters || "").slice(0, 100),
                fontSize: typeof txt.fontSize === "number" ? txt.fontSize : 14,
                fontStyle,
                textStyleName,
                fillTokenName,
                parentName,
                parentLayoutMode,
                siblingIndex,
                totalSiblingTexts,
                siblingTexts,
                componentPropertyName,
                rootComponentName: rootCompName,
                isLooseText,
                hasInstanceSibling,
                prevSiblingType,
                nextSiblingType,
                indexInParent
              });
              collectedItems.push({
                id: txt.id,
                name: txt.name || "",
                type: "TEXT",
                containsText: true,
                rootComponentName: rootCompName,
                width: Math.round("width" in txt ? txt.width : 0),
                height: Math.round("height" in txt ? txt.height : 0),
                characters: (txt.characters || "").slice(0, 100),
                fontSize: typeof txt.fontSize === "number" ? txt.fontSize : "mixed",
                fontStyle,
                textStyleName,
                fillTokenName,
                isLooseText,
                hasInstanceSibling,
                prevSiblingType,
                nextSiblingType,
                indexInParent,
                suggestedName,
                parentName,
                parentLayoutMode,
                siblingIndex,
                totalSiblingTexts,
                componentPropertyName,
                parentPath: pathLabel || root.name || "Component",
                depth,
                peerIds
              });
            }
          }
          if ("children" in node && Array.isArray(node.children)) {
            const nextParent = isRootNode && isStandaloneComp ? root.name || "" : `${pathLabel} > ${node.name || ""}`;
            for (const ch of node.children) {
              await scanSubtree(ch, nextParent, depth + 1, false);
            }
          }
        };
        if ("children" in root && Array.isArray(root.children)) {
          for (const ch of root.children) {
            await scanSubtree(ch, root.name || "", 1, false);
          }
        }
      }
    }
    const textsByParent = /* @__PURE__ */ new Map();
    for (const it of collectedItems) {
      if (it.type === "TEXT") {
        const key = it.parentPath || "";
        if (!textsByParent.has(key)) textsByParent.set(key, []);
        textsByParent.get(key).push(it);
      }
    }
    for (const group of textsByParent.values()) {
      if (group.length > 1) {
        const mapped = group.map((g) => ({
          name: g.suggestedName || g.name,
          fontSize: typeof g.fontSize === "number" ? g.fontSize : 14,
          fontStyle: g.fontStyle || "",
          textStyleName: g.textStyleName || "",
          item: g
        }));
        guardContainerTextSiblingsDeduplication(mapped);
        for (const m of mapped) {
          m.item.suggestedName = m.name;
        }
      }
    }
    return { items: collectedItems, totalVariantsCount: totalVariants, targetRoots };
  }

  // ../../../../plugins/components-setup/src/auto-props/autoProps.ts
  function findRepeatingFrameRuns(parent) {
    const runs = [];
    if (!("children" in parent) || !Array.isArray(parent.children) || parent.children.length < 2) {
      return runs;
    }
    const children = parent.children;
    let currentRun = [];
    let currentSig = null;
    for (const child of children) {
      if (child.type === "FRAME" && child.type !== "INSTANCE") {
        const frame = child;
        const sig = getStructuralSignature(frame);
        if (sig) {
          if (sig === currentSig) {
            currentRun.push(frame);
            continue;
          } else {
            if (currentRun.length >= 2) {
              runs.push([...currentRun]);
            }
            currentRun = [frame];
            currentSig = sig;
            continue;
          }
        }
      }
      if (currentRun.length >= 2) {
        runs.push([...currentRun]);
      }
      currentRun = [];
      currentSig = null;
    }
    if (currentRun.length >= 2) {
      runs.push([...currentRun]);
    }
    return runs;
  }
  function autoCreateTextPropsAndExtractItemsSync(roots, preloadedVars, options) {
    let extractedItemsCount = 0;
    let textPropsCount = 0;
    let instanceSwapPropsCount = 0;
    let booleanPropsCount = 0;
    let slotsCreatedCount = 0;
    let nestedInstancesCount = 0;
    if (roots.length === 0) {
      return { extractedItemsCount: 0, textPropsCount: 0, instanceSwapPropsCount: 0, booleanPropsCount: 0, slotsCreatedCount: 0, nestedInstancesCount: 0 };
    }
    const processedHostIds = /* @__PURE__ */ new Set();
    const createdItemsByTargetName = /* @__PURE__ */ new Map();
    for (const root of roots) {
      const rootComponent = root;
      let rootName = rootComponent.name.trim();
      let propertyHost = null;
      let compSetParent = null;
      if (rootComponent.parent && rootComponent.parent.type === "COMPONENT_SET") {
        compSetParent = rootComponent.parent;
        propertyHost = compSetParent;
        rootName = compSetParent.name.trim();
      } else if (rootComponent.type === "COMPONENT_SET") {
        compSetParent = rootComponent;
        propertyHost = compSetParent;
      } else if (rootComponent.type === "COMPONENT") {
        propertyHost = rootComponent;
      } else {
        let p = rootComponent.parent;
        while (p && p.type !== "PAGE" && p.type !== "DOCUMENT") {
          if (p.type === "COMPONENT_SET") {
            compSetParent = p;
            propertyHost = compSetParent;
            rootName = compSetParent.name.trim();
            break;
          }
          if (p.type === "COMPONENT") {
            if (p.parent && p.parent.type === "COMPONENT_SET") {
              compSetParent = p.parent;
              propertyHost = compSetParent;
              rootName = compSetParent.name.trim();
            } else {
              propertyHost = p;
              rootName = p.name.trim();
            }
            break;
          }
          p = p.parent;
        }
      }
      const hostKey = (compSetParent || propertyHost || rootComponent).id;
      if (processedHostIds.has(hostKey)) continue;
      processedHostIds.add(hostKey);
      let variants = compSetParent ? compSetParent.children.filter((c) => c.type === "COMPONENT") : rootComponent.type === "COMPONENT_SET" ? rootComponent.children.filter((c) => c.type === "COMPONENT") : [rootComponent];
      if ((options == null ? void 0 : options.enableSlotExtract) !== false) {
        for (const variant of variants) {
          const containersWithRuns = [];
          const inspectNode = (n) => {
            if (n.type === "INSTANCE") return;
            if (n.type === "FRAME" || n.type === "COMPONENT") {
              const frame = n;
              if ("children" in frame && Array.isArray(frame.children)) {
                for (const ch of frame.children) {
                  inspectNode(ch);
                }
              }
              const runs = findRepeatingFrameRuns(frame);
              if (runs.length > 0) {
                containersWithRuns.push({ parent: frame, runs });
              }
            }
          };
          inspectNode(variant);
          for (const item of containersWithRuns) {
            for (const repeatingNodes of item.runs) {
              if (!repeatingNodes || repeatingNodes.length < 2) continue;
              const templateNode = repeatingNodes[0];
              if (!templateNode || !templateNode.parent) continue;
              const baseHostName = (propertyHost ? propertyHost.name : rootName).split(",")[0].trim();
              const targetItemName = `${baseHostName}/Item`;
              let cachedItem = createdItemsByTargetName.get(targetItemName);
              let itemComponent;
              let propMap;
              if (cachedItem) {
                itemComponent = cachedItem.itemComponent;
                propMap = cachedItem.propMap;
              } else {
                const existingOld = figma.currentPage.findOne((n) => n.type === "COMPONENT" && n.name === targetItemName);
                if (existingOld) {
                  try {
                    existingOld.remove();
                  } catch (e) {
                  }
                }
                let placeX = rootComponent.x + rootComponent.width + 100;
                let placeY = rootComponent.y;
                if (compSetParent) {
                  placeX = compSetParent.x + compSetParent.width + 100;
                  placeY = compSetParent.y;
                }
                itemComponent = convertFrameToComponentAtomic(
                  templateNode,
                  "clone-to-page",
                  preloadedVars,
                  { x: placeX, y: placeY }
                );
                itemComponent.name = targetItemName;
                extractedItemsCount++;
                const itemRebuild = cleanRebuildComponentProperties(itemComponent, [itemComponent], options);
                textPropsCount += itemRebuild.textPropsCount;
                instanceSwapPropsCount += itemRebuild.instanceSwapPropsCount;
                booleanPropsCount += itemRebuild.booleanPropsCount;
                propMap = /* @__PURE__ */ new Map();
                const itemDefs = itemComponent.componentPropertyDefinitions || {};
                for (const k of Object.keys(itemDefs)) {
                  const def = itemDefs[k];
                  if (def && def.type === "TEXT") {
                    const clean = k.split("#")[0].trim();
                    propMap.set(clean, k);
                  }
                }
                createdItemsByTargetName.set(targetItemName, { itemComponent, propMap });
              }
              let runParent = null;
              for (const oldContainer of repeatingNodes) {
                const parent = oldContainer.parent;
                if (!parent || !("insertChild" in parent)) continue;
                runParent = parent;
                const originalTexts = {};
                const oldTexts = oldContainer.findAll ? oldContainer.findAll((n) => n.type === "TEXT") : [];
                for (const t of oldTexts) {
                  originalTexts[t.name] = t.characters;
                }
                const index = parent.children.indexOf(oldContainer);
                const sizingH = oldContainer.layoutSizingHorizontal;
                const sizingV = oldContainer.layoutSizingVertical;
                const layoutAlign = oldContainer.layoutAlign;
                const layoutGrow = oldContainer.layoutGrow;
                const instance = itemComponent.createInstance();
                parent.insertChild(index, instance);
                try {
                  instance.layoutSizingHorizontal = sizingH;
                  instance.layoutSizingVertical = sizingV;
                  instance.layoutAlign = layoutAlign;
                  instance.layoutGrow = layoutGrow;
                } catch (e) {
                }
                const propsToSet = {};
                for (const [layerName, textVal] of Object.entries(originalTexts)) {
                  const propKey = propMap.get(layerName);
                  if (propKey && textVal) {
                    propsToSet[propKey] = textVal;
                  }
                }
                if (Object.keys(propsToSet).length > 0) {
                  try {
                    instance.setProperties(propsToSet);
                  } catch (e) {
                    console.warn("[AutoProps] Could not setProperties on instance:", e);
                  }
                }
                oldContainer.remove();
              }
              if (runParent && "children" in runParent) {
                const allChildrenAreItems = runParent.children.length > 0 && runParent.children.every(
                  (c) => {
                    var _a, _b;
                    return c.type === "INSTANCE" && (((_a = c.mainComponent) == null ? void 0 : _a.name) === targetItemName || ((_b = c.mainComponent) == null ? void 0 : _b.id) === itemComponent.id);
                  }
                );
                if (allChildrenAreItems) {
                  runParent.name = "Slot";
                  sanitizeSlotFrame(runParent, runParent.parent);
                  applySlotMetricsAndVariables(runParent, runParent.parent, preloadedVars);
                  for (const ch of runParent.children) {
                    if ("componentPropertyReferences" in ch) {
                      try {
                        ch.componentPropertyReferences = {};
                      } catch (_) {
                      }
                    }
                  }
                } else {
                  if ("layoutMode" in runParent && runParent.layoutMode === "HORIZONTAL") {
                    runParent.name = "RowStack";
                  } else {
                    runParent.name = "ColumnStack";
                  }
                }
              }
            }
          }
        }
      }
      if (!propertyHost && rootComponent.type === "FRAME") {
        try {
          const parentComp = convertFrameToComponentAtomic(
            rootComponent,
            "replace-in-parent",
            preloadedVars
          );
          propertyHost = parentComp;
          variants = [parentComp];
        } catch (e) {
          console.warn("[AutoProps] Could not convert parent frame to component:", e);
        }
      }
      if (propertyHost && (propertyHost.type === "COMPONENT_SET" || propertyHost.type === "COMPONENT")) {
        if (propertyHost.type === "COMPONENT_SET") {
          reorderComponentSetVariants(propertyHost);
        }
        if ((options == null ? void 0 : options.enableSlotExtract) !== false) {
          for (const v of variants) {
            if (v.type === "COMPONENT" || v.type === "FRAME") {
              const createdSlots = consolidateRepeatingInstancesIntoSlot(v, preloadedVars);
              slotsCreatedCount += createdSlots.length;
            }
          }
        } else {
          for (const v of variants) {
            if (v.type === "COMPONENT" || v.type === "FRAME") {
              unwrapRedundantSlotWrappers(v, preloadedVars);
            }
          }
        }
        const rebuildRes = cleanRebuildComponentProperties(propertyHost, variants, options);
        textPropsCount += rebuildRes.textPropsCount;
        instanceSwapPropsCount += rebuildRes.instanceSwapPropsCount;
        booleanPropsCount += rebuildRes.booleanPropsCount;
        nestedInstancesCount += rebuildRes.nestedInstancesCount;
      }
    }
    return { extractedItemsCount, textPropsCount, instanceSwapPropsCount, booleanPropsCount, slotsCreatedCount, nestedInstancesCount };
  }
  function collectAutoPropsPreviewData(roots) {
    const result = [];
    const seenHostIds = /* @__PURE__ */ new Set();
    for (const root of roots) {
      let host = root;
      if (root.parent && root.parent.type === "COMPONENT_SET") {
        host = root.parent;
      }
      if (seenHostIds.has(host.id)) continue;
      seenHostIds.add(host.id);
      let variants = [];
      if (host.type === "COMPONENT_SET") {
        variants = host.children.filter((c) => c.type === "COMPONENT");
      } else {
        variants = [host];
      }
      const primaryVariant = (host.type === "COMPONENT_SET" ? host.defaultVariant : null) || variants[0] || host;
      const instances = collectDirectInstances(primaryVariant).filter((inst) => {
        if (isInsideSlot(inst, primaryVariant)) return false;
        const parent = inst.parent;
        if (parent && "children" in parent && Array.isArray(parent.children)) {
          const siblings = parent.children.filter((c) => c.type === "INSTANCE");
          const sameCompSiblings = siblings.filter((s) => {
            return getInstanceFamilyKey(inst) === getInstanceFamilyKey(s);
          });
          if (sameCompSiblings.length >= 2) return false;
        }
        return true;
      });
      const texts = collectDirectTextNodes(primaryVariant);
      const instanceList = instances.map((inst) => {
        var _a, _b;
        const clean = cleanInstancePropertyName(inst.name);
        const isIcon = isIconInstanceNode(inst);
        return {
          id: inst.id,
          layerName: inst.name,
          propName: clean.propName,
          mainComponentName: ((_a = inst.mainComponent) == null ? void 0 : _a.name) || "",
          canSwap: Boolean((_b = inst.mainComponent) == null ? void 0 : _b.id),
          defaultSwap: true,
          defaultShow: true,
          canExposeNested: !isIcon,
          defaultNested: Boolean(inst.isExposedInstance)
        };
      });
      const textList = texts.map((t) => ({
        id: t.id,
        layerName: t.name,
        characters: (t.characters || "").slice(0, 40),
        defaultCreate: true,
        defaultShow: false
      }));
      result.push({
        rootId: host.id,
        rootName: host.name,
        instances: instanceList,
        texts: textList
      });
    }
    return result;
  }

  // ../../../../plugins/components-setup/src/components/smartSwap.ts
  function buildRelativePath(node, rootNode) {
    const parts = [];
    let curr = node;
    while (curr && curr !== rootNode) {
      if ("name" in curr && typeof curr.name === "string") {
        parts.unshift(curr.name);
      }
      curr = curr.parent;
    }
    return parts.join("/");
  }
  function extractContentMap(sourceNode) {
    const byPath = /* @__PURE__ */ new Map();
    const byParent = /* @__PURE__ */ new Map();
    const byLeafKey = /* @__PURE__ */ new Map();
    const byName = /* @__PURE__ */ new Map();
    const occurrenceCount = /* @__PURE__ */ new Map();
    let totalTexts = 0;
    function traverse(node) {
      if (node === sourceNode) {
        if ("children" in node && Array.isArray(node.children)) {
          for (const child of node.children) {
            traverse(child);
          }
        }
        return;
      }
      const name = node.name || "";
      const relPath = buildRelativePath(node, sourceNode);
      const parentName = node.parent && "name" in node.parent && node.parent !== sourceNode ? String(node.parent.name) : "";
      const parentPath = parentName ? `${parentName}/${name}` : name;
      const currentCount = occurrenceCount.get(name) || 0;
      const leafKey = `${name}#${currentCount}`;
      occurrenceCount.set(name, currentCount + 1);
      const layerData = {
        name,
        type: node.type,
        path: relPath,
        parentPath,
        leafKey,
        visible: "visible" in node ? node.visible : true
      };
      if (node.type === "TEXT") {
        totalTexts++;
        layerData.characters = node.characters;
      } else if (node.type === "INSTANCE") {
        const inst = node;
        layerData.variantProperties = inst.variantProperties;
        if (inst.mainComponent && inst.mainComponent.id) {
          layerData.mainComponentId = inst.mainComponent.id;
        }
      }
      if (relPath) byPath.set(relPath, layerData);
      if (parentPath) byParent.set(parentPath, layerData);
      byLeafKey.set(leafKey, layerData);
      const nameList = byName.get(name) || [];
      nameList.push(layerData);
      byName.set(name, nameList);
      if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
    traverse(sourceNode);
    return {
      byPath,
      byParent,
      byLeafKey,
      byName,
      totalTexts
    };
  }
  function findBestMatch(targetNode, rootInstance, sourceMap, occurrenceIndex) {
    const targetRelPath = buildRelativePath(targetNode, rootInstance);
    const targetParentName = targetNode.parent && "name" in targetNode.parent && targetNode.parent !== rootInstance ? String(targetNode.parent.name) : "";
    const targetParentPath = targetParentName ? `${targetParentName}/${targetNode.name}` : targetNode.name;
    const targetLeafKey = `${targetNode.name}#${occurrenceIndex}`;
    if (targetRelPath && sourceMap.byPath.has(targetRelPath)) {
      return sourceMap.byPath.get(targetRelPath);
    }
    if (targetParentPath && sourceMap.byParent.has(targetParentPath)) {
      return sourceMap.byParent.get(targetParentPath);
    }
    if (sourceMap.byLeafKey.has(targetLeafKey)) {
      return sourceMap.byLeafKey.get(targetLeafKey);
    }
    const candidates = sourceMap.byName.get(targetNode.name);
    if (candidates && candidates.length > 0) {
      return candidates[Math.min(occurrenceIndex, candidates.length - 1)];
    }
    return null;
  }
  async function resolveMainComponent(templateNode) {
    if (templateNode.type === "COMPONENT") {
      return templateNode;
    }
    if (templateNode.type === "INSTANCE") {
      const inst = templateNode;
      const mainComp = await inst.getMainComponentAsync();
      if (mainComp) return mainComp;
    }
    if (templateNode.type === "COMPONENT_SET") {
      const setNode = templateNode;
      if (setNode.defaultVariant) return setNode.defaultVariant;
      const firstComp = setNode.children.find((c) => c.type === "COMPONENT");
      if (firstComp) return firstComp;
    }
    throw new Error(`Target object "${templateNode.name}" must be an Instance or Component.`);
  }
  async function calculateMatchStats(sourceNode, templateNode) {
    try {
      const mainComp = await resolveMainComponent(templateNode);
      const sourceMap = extractContentMap(sourceNode);
      let totalTargetTexts = 0;
      let matchedTexts = 0;
      const sampleMatches = [];
      const targetTexts = [];
      if ("findAllWithCriteria" in templateNode && typeof templateNode.findAllWithCriteria === "function") {
        try {
          const found = templateNode.findAllWithCriteria({ types: ["TEXT"] });
          if (Array.isArray(found)) targetTexts.push(...found);
        } catch (e) {
        }
      }
      if (targetTexts.length === 0 && "findAllWithCriteria" in mainComp && typeof mainComp.findAllWithCriteria === "function") {
        try {
          const found = mainComp.findAllWithCriteria({ types: ["TEXT"] });
          if (Array.isArray(found)) targetTexts.push(...found);
        } catch (e) {
        }
      }
      const occurrenceTracker = /* @__PURE__ */ new Map();
      for (const tNode of targetTexts) {
        totalTargetTexts++;
        const name = tNode.name || "";
        const idx = occurrenceTracker.get(name) || 0;
        occurrenceTracker.set(name, idx + 1);
        const match = findBestMatch(tNode, templateNode, sourceMap, idx);
        if (match && match.characters !== void 0) {
          matchedTexts++;
          if (sampleMatches.length < 5) {
            sampleMatches.push({
              targetName: name,
              sourceText: match.characters.length > 30 ? match.characters.slice(0, 27) + "..." : match.characters
            });
          }
        }
      }
      const percent = totalTargetTexts > 0 ? Math.round(matchedTexts / totalTargetTexts * 100) : 100;
      return {
        totalTargetTexts,
        matchedTexts,
        percent,
        sampleMatches,
        isCompatible: percent > 0 || totalTargetTexts === 0
      };
    } catch (err) {
      return {
        totalTargetTexts: 0,
        matchedTexts: 0,
        percent: 0,
        sampleMatches: [],
        isCompatible: false
      };
    }
  }
  async function smartSwapSingleNode(sourceNode, templateNode, options = {}) {
    const matchCascade = options.matchCascade !== false;
    const copyLayout = options.copyLayout !== false;
    const preserveVisibility = options.preserveVisibility !== false;
    const parent = sourceNode.parent;
    if (!parent || parent.type === "DOCUMENT") {
      throw new Error(`Cannot replace node "${sourceNode.name}" because it has no parent container.`);
    }
    const index = parent.children.indexOf(sourceNode);
    if (index === -1) {
      throw new Error(`Node "${sourceNode.name}" not found in parent hierarchy.`);
    }
    const mainComp = await resolveMainComponent(templateNode);
    const sourceMap = extractContentMap(sourceNode);
    const origX = sourceNode.x;
    const origY = sourceNode.y;
    const origWidth = sourceNode.width;
    const origHeight = sourceNode.height;
    const layoutProps = {};
    if ("layoutSizingHorizontal" in sourceNode) {
      layoutProps.layoutSizingHorizontal = sourceNode.layoutSizingHorizontal;
    }
    if ("layoutSizingVertical" in sourceNode) {
      layoutProps.layoutSizingVertical = sourceNode.layoutSizingVertical;
    }
    if ("layoutAlign" in sourceNode) {
      layoutProps.layoutAlign = sourceNode.layoutAlign;
    }
    if ("layoutGrow" in sourceNode) {
      layoutProps.layoutGrow = sourceNode.layoutGrow;
    }
    if ("layoutPositioning" in sourceNode) {
      layoutProps.layoutPositioning = sourceNode.layoutPositioning;
    }
    const newInstance = mainComp.createInstance();
    if (templateNode.type === "INSTANCE" && templateNode.variantProperties) {
      try {
        newInstance.setProperties(templateNode.variantProperties);
      } catch (e) {
        console.warn("[SmartSwap] Could not set variant properties on new instance:", e);
      }
    }
    parent.insertChild(index, newInstance);
    newInstance.x = origX;
    newInstance.y = origY;
    if (copyLayout) {
      if (layoutProps.layoutPositioning) {
        try {
          newInstance.layoutPositioning = layoutProps.layoutPositioning;
        } catch (e) {
        }
      }
      if (layoutProps.layoutAlign) {
        try {
          newInstance.layoutAlign = layoutProps.layoutAlign;
        } catch (e) {
        }
      }
      if (layoutProps.layoutGrow !== void 0) {
        try {
          newInstance.layoutGrow = layoutProps.layoutGrow;
        } catch (e) {
        }
      }
      try {
        newInstance.resize(origWidth, origHeight);
      } catch (e) {
      }
      if (layoutProps.layoutSizingHorizontal) {
        try {
          newInstance.layoutSizingHorizontal = layoutProps.layoutSizingHorizontal;
        } catch (e) {
        }
      }
      if (layoutProps.layoutSizingVertical) {
        try {
          newInstance.layoutSizingVertical = layoutProps.layoutSizingVertical;
        } catch (e) {
        }
      }
    }
    let overridesCount = 0;
    const appliedComponentPropKeys = /* @__PURE__ */ new Set();
    if (newInstance.componentProperties) {
      const propUpdates = {};
      for (const [propKey, propDef] of Object.entries(newInstance.componentProperties)) {
        const cleanPropName = propKey.split("#")[0].trim();
        if (propDef.type === "TEXT") {
          const candidate = sourceMap.byName.get(cleanPropName);
          if (candidate && candidate.length > 0 && candidate[0].characters !== void 0) {
            propUpdates[propKey] = candidate[0].characters;
            appliedComponentPropKeys.add(propKey);
            overridesCount++;
          }
        } else if (propDef.type === "BOOLEAN" && preserveVisibility) {
          const candidate = sourceMap.byName.get(cleanPropName);
          if (candidate && candidate.length > 0 && candidate[0].visible !== void 0) {
            propUpdates[propKey] = candidate[0].visible;
            appliedComponentPropKeys.add(propKey);
            overridesCount++;
          }
        }
      }
      if (Object.keys(propUpdates).length > 0) {
        try {
          newInstance.setProperties(propUpdates);
        } catch (e) {
          console.warn("[SmartSwap] Error applying component properties:", e);
        }
      }
    }
    const targetOccurrenceTracker = /* @__PURE__ */ new Map();
    async function applyOverrides(targetNode) {
      if (targetNode !== newInstance) {
        const name = targetNode.name || "";
        const idx = targetOccurrenceTracker.get(name) || 0;
        targetOccurrenceTracker.set(name, idx + 1);
        const matched = findBestMatch(targetNode, newInstance, sourceMap, idx);
        if (matched) {
          if (targetNode.type === "TEXT" && matched.characters !== void 0) {
            const textNode = targetNode;
            if (textNode.characters !== matched.characters) {
              try {
                const success = await safeLoadFontAndSetCharacters(textNode, matched.characters);
                if (success) overridesCount++;
              } catch (fontErr) {
                console.warn("[SmartSwap] Could not set text on:", textNode.name, fontErr);
              }
            }
          }
          if (preserveVisibility && matched.visible !== void 0 && "visible" in targetNode) {
            if (targetNode.visible !== matched.visible) {
              targetNode.visible = matched.visible;
              overridesCount++;
            }
          }
          if (targetNode.type === "INSTANCE" && matched.mainComponentId) {
            const instNode = targetNode;
            const currentMainId = instNode.mainComponent ? instNode.mainComponent.id : null;
            if (currentMainId && currentMainId !== matched.mainComponentId) {
              try {
                const compToSwap = await figma.getNodeByIdAsync(matched.mainComponentId);
                if (compToSwap && compToSwap.type === "COMPONENT") {
                  instNode.swapComponent(compToSwap);
                  overridesCount++;
                }
              } catch (swapErr) {
                console.warn("[SmartSwap] Nested component swap failed:", swapErr);
              }
            }
          }
        }
      }
      if ("children" in targetNode && Array.isArray(targetNode.children)) {
        for (const child of targetNode.children) {
          await applyOverrides(child);
        }
      }
    }
    await applyOverrides(newInstance);
    try {
      sourceNode.remove();
    } catch (err) {
      console.warn("[SmartSwap] Could not remove old source node:", err);
    }
    return { newInstance, overridesCount };
  }
  async function executeSmartSwapBatch(sourceIds, templateId, options = {}) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new Error("No target objects selected to replace.");
    }
    if (!templateId) {
      throw new Error("No reference template instance or component selected.");
    }
    const templateNode = await figma.getNodeByIdAsync(templateId);
    if (!templateNode || templateNode.type !== "INSTANCE" && templateNode.type !== "COMPONENT" && templateNode.type !== "COMPONENT_SET") {
      throw new Error("Target template must be a valid Component or Instance on the page.");
    }
    const createdInstances = [];
    let totalOverrides = 0;
    for (const id of sourceIds) {
      if (id === templateId) continue;
      const src = await figma.getNodeByIdAsync(id);
      if (!src || src.removed) continue;
      try {
        const result = await smartSwapSingleNode(src, templateNode, options);
        createdInstances.push(result.newInstance);
        totalOverrides += result.overridesCount;
      } catch (nodeErr) {
        console.warn(`[SmartSwap] Failed to replace node ${id}:`, nodeErr);
      }
    }
    if (createdInstances.length === 0) {
      return {
        success: false,
        replacedCount: 0,
        totalOverrides: 0,
        createdInstanceIds: [],
        message: "Could not replace any of the selected objects."
      };
    }
    figma.currentPage.selection = createdInstances;
    const count = createdInstances.length;
    const msg = count === 1 ? `Podmieniono na instancj\u0119 z zachowaniem ${totalOverrides} nadpisa\u0144! \u2728` : `Podmieniono ${count} obiekt\xF3w na instancje z zachowaniem ${totalOverrides} nadpisa\u0144! \u2728`;
    figma.notify(msg);
    return {
      success: true,
      replacedCount: count,
      totalOverrides,
      createdInstanceIds: createdInstances.map((n) => n.id),
      message: msg
    };
  }

  // ../../../../plugins/components-setup/src/components/fontReplacer.ts
  var cachedAvailableFontsMap = null;
  var WEIGHT_RANK_MAP = [
    { pattern: /\b(thin|hairline|100)\b/i, weight: 100 },
    { pattern: /\b(extralight|extra\s*light|ultralight|ultra\s*light|200)\b/i, weight: 200 },
    { pattern: /\b(light|300)\b/i, weight: 300 },
    { pattern: /\b(regular|normal|book|roman|text|400)\b/i, weight: 400 },
    { pattern: /\b(medium|500)\b/i, weight: 500 },
    { pattern: /\b(semibold|semi\s*bold|demibold|demi\s*bold|600)\b/i, weight: 600 },
    { pattern: /\b(extrabold|extra\s*bold|ultrabold|ultra\s*bold|heavy|800)\b/i, weight: 800 },
    { pattern: /\b(bold|700)\b/i, weight: 700 },
    { pattern: /\b(black|extrablack|ultra\s*black|900)\b/i, weight: 900 }
  ];
  function estimateStyleWeight(styleName) {
    const s = (styleName || "Regular").trim();
    const isItalic = /\b(italic|oblique|slanted)\b/i.test(s);
    for (const entry of WEIGHT_RANK_MAP) {
      if (entry.pattern.test(s)) {
        return { weight: entry.weight, isItalic };
      }
    }
    return { weight: 400, isItalic };
  }
  function findClosestFontStyle(sourceStyle, availableStyles) {
    if (!availableStyles || availableStyles.length === 0) return "Regular";
    if (availableStyles.includes(sourceStyle)) return sourceStyle;
    const lowerSource = (sourceStyle || "").trim().toLowerCase();
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
  async function getAvailableFontsMap() {
    if (cachedAvailableFontsMap) {
      return cachedAvailableFontsMap;
    }
    const map = {};
    try {
      const availableFonts = await figma.listAvailableFontsAsync();
      for (const item of availableFonts) {
        if (!item || !item.fontName || !item.fontName.family) continue;
        const fam = item.fontName.family;
        const st = item.fontName.style || "Regular";
        if (!map[fam]) {
          map[fam] = [];
        }
        if (!map[fam].includes(st)) {
          map[fam].push(st);
        }
      }
    } catch (err) {
      console.warn("[FontReplacer] Failed to list available fonts:", err);
    }
    cachedAvailableFontsMap = map;
    return map;
  }
  function formatFontSize(size) {
    const rounded = Math.round(Number(size) * 10) / 10;
    return `${rounded}px`;
  }
  function formatLineHeight(lh) {
    if (!lh || lh === figma.mixed) return "Auto";
    if (lh.unit === "AUTO") return "Auto";
    if (lh.unit === "PIXELS") {
      const val = Math.round(Number(lh.value) * 10) / 10;
      return `${val}px`;
    }
    if (lh.unit === "PERCENT") {
      const val = Math.round(Number(lh.value) * 10) / 10;
      return `${val}%`;
    }
    return "Auto";
  }
  function buildSpecSignature(family, style, sizeStr, lineHeightStr) {
    return `${family}::${style}::${sizeStr}::${lineHeightStr}`;
  }
  function collectTextNodesRecursive(nodes, result = []) {
    for (const node of nodes) {
      if (!node || node.removed) continue;
      if (node.type === "TEXT") {
        result.push(node);
      } else if ("children" in node && Array.isArray(node.children)) {
        collectTextNodesRecursive(node.children, result);
      }
    }
    return result;
  }
  function extractSpecsFromTextNode(node) {
    const specs = [];
    if (node.fontName !== figma.mixed && node.fontSize !== figma.mixed && node.lineHeight !== figma.mixed) {
      const fontName = node.fontName;
      const family = fontName.family || "Unknown";
      const style = fontName.style || "Regular";
      const size = formatFontSize(node.fontSize);
      const lineHeight = formatLineHeight(node.lineHeight);
      specs.push({
        family,
        style,
        size,
        lineHeight,
        specKey: buildSpecSignature(family, style, size, lineHeight)
      });
      return specs;
    }
    try {
      if (typeof node.getStyledTextSegments === "function") {
        const segments = node.getStyledTextSegments(["fontName", "fontSize", "lineHeight"]);
        const seenInNode = /* @__PURE__ */ new Set();
        for (const seg of segments) {
          if (!seg.fontName) continue;
          const family = seg.fontName.family || "Unknown";
          const style = seg.fontName.style || "Regular";
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
      console.warn("[FontReplacer] Failed to read styled text segments for node:", node.id, err);
    }
    return specs;
  }
  async function scanSelectionFonts(includeAvailableFonts = false) {
    const selection = figma.currentPage.selection;
    const textNodes = collectTextNodesRecursive(selection);
    const specMap = /* @__PURE__ */ new Map();
    const familyMap = /* @__PURE__ */ new Map();
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
            layerCount: 0
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
            stylesSet: /* @__PURE__ */ new Set(),
            specsSet: /* @__PURE__ */ new Set(),
            nodeIdsSet: /* @__PURE__ */ new Set()
          };
          familyMap.set(sp.family, famEntry);
        }
        famEntry.stylesSet.add(sp.style);
        famEntry.specsSet.add(`${sp.size} / ${sp.lineHeight} \u2022 ${sp.style}`);
        famEntry.nodeIdsSet.add(textNode.id);
      }
    }
    const specGroups = Array.from(specMap.values()).sort((a, b) => {
      if (b.layerCount !== a.layerCount) return b.layerCount - a.layerCount;
      const famCmp = a.family.localeCompare(b.family);
      if (famCmp !== 0) return famCmp;
      return parseFloat(b.size) - parseFloat(a.size);
    });
    const familyGroups = Array.from(familyMap.values()).map((entry) => {
      const nodeIds = Array.from(entry.nodeIdsSet);
      return {
        familyKey: entry.family,
        family: entry.family,
        styles: Array.from(entry.stylesSet),
        specsSummary: Array.from(entry.specsSet),
        nodeIds,
        layerCount: nodeIds.length
      };
    }).sort((a, b) => {
      if (b.layerCount !== a.layerCount) return b.layerCount - a.layerCount;
      return a.family.localeCompare(b.family);
    });
    const detectedFamilies = familyGroups.map((g) => g.family);
    const result = {
      hasSelection: selection.length > 0,
      selectionCount: selection.length,
      totalTextNodes: textNodes.length,
      specGroups,
      familyGroups,
      detectedFamilies
    };
    if (includeAvailableFonts || !cachedAvailableFontsMap) {
      result.availableFonts = await getAvailableFontsMap();
    }
    return result;
  }
  function doesSegmentMatchRule(segFamily, segStyle, segSizeStr, segLineHeightStr, rule) {
    const segSpecKey = buildSpecSignature(segFamily, segStyle, segSizeStr, segLineHeightStr);
    if (rule.mode === "spec") {
      if (rule.specKey) {
        return segSpecKey === rule.specKey;
      }
      return segFamily === rule.sourceFamily && segStyle === (rule.sourceStyle || segStyle) && segSizeStr === (rule.sourceSize || segSizeStr) && segLineHeightStr === (rule.sourceLineHeight || segLineHeightStr);
    }
    return segFamily === rule.sourceFamily;
  }
  async function executeFontSwapRules(rules) {
    if (!rules || rules.length === 0) {
      return { updatedLayersCount: 0, summaryText: "" };
    }
    const availableFonts = await getAvailableFontsMap();
    const selection = figma.currentPage.selection;
    const allSelectionTextNodes = collectTextNodesRecursive(selection);
    const textNodeById = /* @__PURE__ */ new Map();
    for (const tn of allSelectionTextNodes) {
      textNodeById.set(tn.id, tn);
    }
    for (const rule of rules) {
      if (rule.nodeIds && rule.nodeIds.length > 0) {
        for (const id of rule.nodeIds) {
          if (!textNodeById.has(id)) {
            try {
              const fetched = await figma.getNodeByIdAsync(id);
              if (fetched && fetched.type === "TEXT" && !fetched.removed) {
                textNodeById.set(fetched.id, fetched);
              }
            } catch (e) {
            }
          }
        }
      }
    }
    const touchedNodeIds = /* @__PURE__ */ new Set();
    const fontPairsUsed = [];
    for (const rule of rules) {
      if (!rule.targetFamily) continue;
      const targetStylesForFamily = availableFonts[rule.targetFamily] || ["Regular"];
      const targetNodes = [];
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
        } catch (e) {
        }
        if (node.fontName !== figma.mixed && node.fontSize !== figma.mixed && node.lineHeight !== figma.mixed) {
          const currentFont = node.fontName;
          const sizeStr = formatFontSize(node.fontSize);
          const lhStr = formatLineHeight(node.lineHeight);
          if (doesSegmentMatchRule(currentFont.family, currentFont.style, sizeStr, lhStr, rule)) {
            const resolvedStyle = rule.targetStyle && targetStylesForFamily.includes(rule.targetStyle) ? rule.targetStyle : findClosestFontStyle(rule.targetStyle || currentFont.style, targetStylesForFamily);
            const targetFont = { family: rule.targetFamily, style: resolvedStyle };
            await figma.loadFontAsync(targetFont);
            if (node.textStyleId && node.textStyleId !== "") {
              try {
                await node.setTextStyleIdAsync("");
              } catch (e) {
                try {
                  node.textStyleId = "";
                } catch (e2) {
                }
              }
            }
            node.fontName = targetFont;
            touchedNodeIds.add(node.id);
            const pairLabel = `${currentFont.family} \u2794 ${targetFont.family} (${targetFont.style})`;
            if (!fontPairsUsed.includes(pairLabel)) fontPairsUsed.push(pairLabel);
          }
        } else {
          try {
            if (typeof node.getStyledTextSegments === "function") {
              const segments = node.getStyledTextSegments([
                "fontName",
                "fontSize",
                "lineHeight",
                "textStyleId"
              ]);
              let nodeModified = false;
              for (const seg of segments) {
                if (!seg.fontName) continue;
                const segFam = seg.fontName.family;
                const segStyle = seg.fontName.style;
                const segSize = formatFontSize(seg.fontSize);
                const segLh = formatLineHeight(seg.lineHeight);
                if (doesSegmentMatchRule(segFam, segStyle, segSize, segLh, rule)) {
                  const resolvedStyle = rule.targetStyle && targetStylesForFamily.includes(rule.targetStyle) ? rule.targetStyle : findClosestFontStyle(rule.targetStyle || segStyle, targetStylesForFamily);
                  const targetFont = { family: rule.targetFamily, style: resolvedStyle };
                  await figma.loadFontAsync(targetFont);
                  if (seg.textStyleId && seg.textStyleId !== "") {
                    try {
                      if (typeof node.setRangeTextStyleIdAsync === "function") {
                        await node.setRangeTextStyleIdAsync(seg.start, seg.end, "");
                      } else {
                        node.setRangeTextStyleId(seg.start, seg.end, "");
                      }
                    } catch (e) {
                    }
                  }
                  node.setRangeFontName(seg.start, seg.end, targetFont);
                  nodeModified = true;
                  const pairLabel = `${segFam} \u2794 ${targetFont.family} (${targetFont.style})`;
                  if (!fontPairsUsed.includes(pairLabel)) fontPairsUsed.push(pairLabel);
                }
              }
              if (nodeModified) {
                touchedNodeIds.add(node.id);
              }
            }
          } catch (segErr) {
            console.warn("[FontReplacer] Failed to swap mixed segments on node:", node.id, segErr);
          }
        }
      }
    }
    return {
      updatedLayersCount: touchedNodeIds.size,
      summaryText: fontPairsUsed.join(", ")
    };
  }

  // ../../../../plugins/components-setup/src/ds-generator/utils/equality.ts
  function isColorEqual(c1, c2) {
    if (!c1 || !c2) return c1 === c2;
    if (typeof c1 !== "object" || typeof c2 !== "object") return c1 === c2;
    const a1 = c1.a !== void 0 ? c1.a : 1;
    const a2 = c2.a !== void 0 ? c2.a : 1;
    return Math.abs(c1.r - c2.r) < 2e-3 && Math.abs(c1.g - c2.g) < 2e-3 && Math.abs(c1.b - c2.b) < 2e-3 && Math.abs(a1 - a2) < 2e-3;
  }
  function isValueEqual(v1, v2) {
    if (v1 === v2) return true;
    if (v1 == null || v2 == null) return v1 === v2;
    if (typeof v1 === "object" && typeof v2 === "object") {
      if (v1.type === "VARIABLE_ALIAS" && v2.type === "VARIABLE_ALIAS") {
        return v1.id === v2.id;
      }
      if ("r" in v1 && "r" in v2) {
        return isColorEqual(v1, v2);
      }
    }
    if (typeof v1 === "number" && typeof v2 === "number") {
      return Math.abs(v1 - v2) < 1e-4;
    }
    return false;
  }
  function isScopesEqual(s1, s2) {
    if (!s1 && !s2) return true;
    if (!s1 || !s2) return false;
    if (s1.includes("ALL_SCOPES") && s2.includes("ALL_SCOPES")) return true;
    if (s1.length !== s2.length) return false;
    const set1 = new Set(s1);
    return s2.every((s) => set1.has(s));
  }
  function isLineHeightEqual(lh1, lh2) {
    if (!lh1 && !lh2) return true;
    if (!lh1 || !lh2) return false;
    if (lh1.unit !== lh2.unit) return false;
    if (lh1.unit === "PIXELS" || lh1.unit === "PERCENT") {
      return Math.abs((lh1.value || 0) - (lh2.value || 0)) < 0.01;
    }
    return true;
  }
  function arePaintsEqual(p1, p2) {
    if (!p1 || !p2) return p1 === p2;
    if (p1.length !== p2.length) return false;
    for (let i = 0; i < p1.length; i++) {
      const a = p1[i], b = p2[i];
      if (a.type !== b.type) return false;
      if (a.gradientTransform && b.gradientTransform) {
        if (a.gradientTransform.length !== b.gradientTransform.length) return false;
        for (let r = 0; r < a.gradientTransform.length; r++) {
          if (a.gradientTransform[r].length !== b.gradientTransform[r].length) return false;
          for (let c = 0; c < a.gradientTransform[r].length; c++) {
            if (Math.abs(a.gradientTransform[r][c] - b.gradientTransform[r][c]) > 1e-4) return false;
          }
        }
      } else if (a.gradientTransform || b.gradientTransform) {
        return false;
      }
      if (a.gradientStops && b.gradientStops) {
        if (a.gradientStops.length !== b.gradientStops.length) return false;
        for (let s = 0; s < a.gradientStops.length; s++) {
          const sa = a.gradientStops[s], sb = b.gradientStops[s];
          if (Math.abs(sa.position - sb.position) > 1e-3) return false;
          if (!isColorEqual(sa.color, sb.color)) return false;
          const bva = sa.boundVariables && sa.boundVariables.color ? sa.boundVariables.color.id : void 0;
          const bvb = sb.boundVariables && sb.boundVariables.color ? sb.boundVariables.color.id : void 0;
          if (bva !== bvb) return false;
        }
      }
    }
    return true;
  }
  function areEffectsEqual(e1, e2) {
    if (!e1 || !e2) return e1 === e2;
    if (e1.length !== e2.length) return false;
    for (let i = 0; i < e1.length; i++) {
      const a = e1[i], b = e2[i];
      if (a.type !== b.type) return false;
      if (a.radius !== b.radius) return false;
      if (a.offset && b.offset) {
        if (a.offset.x !== b.offset.x || a.offset.y !== b.offset.y) return false;
      }
      if (a.spread !== void 0 && b.spread !== void 0 && a.spread !== b.spread) return false;
      if (a.lightAngle !== void 0 && b.lightAngle !== void 0 && a.lightAngle !== b.lightAngle) return false;
      if (a.depth !== void 0 && b.depth !== void 0 && a.depth !== b.depth) return false;
      const bva = a.boundVariables && a.boundVariables.color ? a.boundVariables.color.id : void 0;
      const bvb = b.boundVariables && b.boundVariables.color ? b.boundVariables.color.id : void 0;
      if (bva !== bvb) return false;
      const bvrA = a.boundVariables && a.boundVariables.radius ? a.boundVariables.radius.id : void 0;
      const bvrB = b.boundVariables && b.boundVariables.radius ? b.boundVariables.radius.id : void 0;
      if (bvrA !== bvrB) return false;
    }
    return true;
  }

  // ../../../../plugins/components-setup/src/ds-generator/utils/strings.ts
  function toPascalCase3(str) {
    if (!str && str !== 0) return "";
    const trimmed = str.toString().trim();
    if (!trimmed) return "";
    if (trimmed.includes("/")) {
      return trimmed.split("/").map((segment) => {
        const segTrim = segment.trim();
        if (segTrim.startsWith("_")) {
          return "_" + toPascalCase3(segTrim.slice(1));
        }
        return segTrim ? toPascalCase3(segTrim) : segment;
      }).join("/");
    }
    const withoutId = trimmed.split("#")[0].trim();
    if (!withoutId) return "";
    if (withoutId.startsWith("_")) {
      return "_" + toPascalCase3(withoutId.slice(1));
    }
    if (/^\d+$/.test(withoutId)) {
      return withoutId;
    }
    const withSpaces = withoutId.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[–—\-_.\s,:]+/g, " ").replace(/[^a-zA-Z0-9\u00C0-\u024F\s]+/g, " ").trim();
    const words = withSpaces.split(/\s+/).filter(Boolean);
    if (words.length === 0) return withoutId;
    return words.map((word) => {
      if (/^\d+$/.test(word)) return word;
      if (word === word.toUpperCase() && word.length > 1 && !/\d/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join("");
  }
  function formatModeName(modeName) {
    if (!modeName && modeName !== 0) return "";
    const trimmed = modeName.toString().trim();
    if (!trimmed) return "";
    if (/^(\d+)?(xs|sm|md|lg|xl|xxl)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return toPascalCase3(trimmed);
  }
  function normalizePathForMatch(str) {
    if (!str && str !== 0) return "";
    return str.toString().split("/").map((seg) => seg.toLowerCase().replace(/[\s\-_–—.]+/g, "")).join("/");
  }
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ../../../../plugins/components-setup/src/ds-generator/variables/variableHelpers.ts
  var stepRawValues = {
    none: 0,
    pico: 1,
    quarck: 2,
    tri: 3,
    nano: 4,
    micro: 8,
    extraSmall: 12,
    small: 16,
    medium: 20,
    semiLarge: 24,
    large: 24,
    extraLarge: 32,
    macro: 40,
    mega: 48,
    huge: 64,
    massive: 96,
    gigantic: 128
  };
  function getStepRawValue(stepName) {
    if (!stepName) return 0;
    if (stepName === "none") return 0;
    if (stepName === "full") return 9999;
    if (stepName.startsWith("minusPx")) {
      return -parseInt(stepName.replace("minusPx", ""), 10);
    }
    if (stepName.startsWith("px")) {
      return parseInt(stepName.replace("px", ""), 10);
    }
    if (stepName.startsWith("minus")) {
      const cleanName = stepName.replace("minus", "");
      const positiveName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
      return -(stepRawValues[positiveName] || 0);
    }
    return stepRawValues[stepName] || 0;
  }
  function updateExistingCollectionModes(collections) {
    let updatedCount = 0;
    if (!collections || !Array.isArray(collections)) return updatedCount;
    for (const col of collections) {
      if (!col || !col.modes || !Array.isArray(col.modes)) continue;
      const existingNames = new Set(col.modes.map((m) => m.name));
      for (const mode of col.modes) {
        const formatted = formatModeName(mode.name);
        if (formatted && mode.name !== formatted) {
          if (!existingNames.has(formatted)) {
            try {
              col.renameMode(mode.modeId, formatted);
              existingNames.delete(mode.name);
              existingNames.add(formatted);
              updatedCount++;
            } catch (e) {
              console.warn(`[DesignSystem] Could not rename mode "${mode.name}" to "${formatted}" in collection "${col.name}":`, e);
            }
          }
        }
      }
    }
    return updatedCount;
  }
  function ensureLayoutStringVariable(collections, allLocalVars) {
    if (!collections || !Array.isArray(collections)) return;
    const layoutCol = collections.find((c) => c.name === "Layout" || c.name === "layout" || c.name === "_layout" || normalizePathForMatch(c.name) === "layout");
    if (!layoutCol) return;
    const vars = allLocalVars || [];
    let layoutVar = vars.find((v) => v.variableCollectionId === layoutCol.id && (v.name === "Layout" || v.name === "layout"));
    if (!layoutVar) {
      try {
        layoutVar = figma.variables.createVariable("Layout", layoutCol, "STRING");
      } catch (e) {
        return;
      }
    }
    if (layoutVar) {
      smartSetVariableMeta(layoutVar, {
        description: "Layout mode name identifier.",
        hiddenFromPublishing: false,
        scopes: ["ALL_SCOPES"]
      });
      for (const mode of layoutCol.modes) {
        const modeName = formatModeName(mode.name);
        smartSetValueForMode(layoutVar, mode.modeId, modeName);
      }
    }
    let platformVar = vars.find((v) => v.variableCollectionId === layoutCol.id && (v.name === "Platform" || v.name === "platform" || v.name === "Platfform" || v.name === "platfform"));
    if (!platformVar) {
      try {
        platformVar = figma.variables.createVariable("Platform", layoutCol, "STRING");
      } catch (e) {
      }
    }
    if (platformVar) {
      if (platformVar.name !== "Platform") platformVar.name = "Platform";
      smartSetVariableMeta(platformVar, {
        description: "Layout platform category (Mobile, Tablet, Desktop).",
        hiddenFromPublishing: false,
        scopes: ["ALL_SCOPES"]
      });
      const platformByMode = {
        SM: "Mobile",
        MD: "Tablet",
        LG: "Desktop",
        XL: "Desktop",
        "2XL": "Desktop"
      };
      for (const mode of layoutCol.modes) {
        const modeKey = formatModeName(mode.name);
        const platVal = platformByMode[modeKey] || "Desktop";
        smartSetValueForMode(platformVar, mode.modeId, platVal);
      }
    }
    const visibilityDefinitions = [
      {
        name: "Visibility/Mobile",
        aliases: ["Visibility/Mobile", "visibility/mobile", "IsMobile", "isMobile", "Mobile", "mobile", "Visible/Mobile", "visible/mobile"],
        description: "Element visibility on Mobile layout.",
        check: (plat, mode) => plat === "Mobile" || mode === "SM"
      },
      {
        name: "Visibility/Tablet",
        aliases: ["Visibility/Tablet", "visibility/tablet", "IsTablet", "isTablet", "Tablet", "tablet", "Visible/Tablet", "visible/tablet"],
        description: "Element visibility on Tablet layout.",
        check: (plat, mode) => plat === "Tablet" || mode === "MD"
      },
      {
        name: "Visibility/Desktop",
        aliases: ["Visibility/Desktop", "visibility/desktop", "IsDesktop", "isDesktop", "Desktop", "desktop", "Visible/Desktop", "visible/desktop"],
        description: "Element visibility on Desktop layout.",
        check: (plat, mode) => plat === "Desktop" || mode === "LG" || mode === "XL" || mode === "2XL"
      }
    ];
    for (const def of visibilityDefinitions) {
      let visVar = vars.find((v) => v.variableCollectionId === layoutCol.id && def.aliases.includes(v.name));
      if (!visVar) {
        try {
          visVar = figma.variables.createVariable(def.name, layoutCol, "BOOLEAN");
        } catch (e) {
        }
      }
      if (visVar) {
        smartSetVariableMeta(visVar, {
          description: def.description,
          hiddenFromPublishing: false,
          scopes: ["ALL_SCOPES"]
        });
        const platformByMode = {
          SM: "Mobile",
          MD: "Tablet",
          LG: "Desktop",
          XL: "Desktop",
          "2XL": "Desktop"
        };
        for (const mode of layoutCol.modes) {
          const modeKey = formatModeName(mode.name);
          const platVal = platformByMode[modeKey] || "Desktop";
          const isVisible = def.check(platVal, modeKey);
          smartSetValueForMode(visVar, mode.modeId, isVisible);
        }
      }
    }
    const contentVar = vars.find((v) => v.variableCollectionId === layoutCol.id && (v.name === "MaxWidth/Content" || v.name === "maxWidth/content"));
    const screenVar = vars.find((v) => v.variableCollectionId === layoutCol.id && (v.name === "MaxWidth/Screen" || v.name === "maxWidth/screen"));
    const marginVar = vars.find((v) => v.variableCollectionId === layoutCol.id && (v.name === "Margin" || v.name === "margin"));
    if (contentVar && screenVar && marginVar) {
      for (const mode of layoutCol.modes) {
        let screenVal = screenVar.valuesByMode ? screenVar.valuesByMode[mode.modeId] : void 0;
        let marginVal = marginVar.valuesByMode ? marginVar.valuesByMode[mode.modeId] : void 0;
        if (screenVal && typeof screenVal === "object" && screenVal.type === "VARIABLE_ALIAS") {
          const aliased = vars.find((v) => v.id === screenVal.id);
          if (aliased && aliased.valuesByMode) screenVal = Object.values(aliased.valuesByMode)[0];
        }
        if (marginVal && typeof marginVal === "object" && marginVal.type === "VARIABLE_ALIAS") {
          const aliased = vars.find((v) => v.id === marginVal.id);
          if (aliased && aliased.valuesByMode) marginVal = Object.values(aliased.valuesByMode)[0];
        }
        if (typeof screenVal === "number" && typeof marginVal === "number") {
          smartSetValueForMode(contentVar, mode.modeId, screenVal - 2 * marginVal);
        }
      }
    }
  }
  function ensureCollectionModes(collection, modeNames) {
    const formattedModeNames = (modeNames || []).map(formatModeName);
    const existingModes = collection.modes || [];
    const matchedModeIds = /* @__PURE__ */ new Set();
    const matchedTargetIndices = /* @__PURE__ */ new Set();
    for (let i = 0; i < formattedModeNames.length; i++) {
      const targetName = formattedModeNames[i];
      const targetNorm = targetName.toLowerCase();
      const match = existingModes.find(
        (em) => !matchedModeIds.has(em.modeId) && (em.name === targetName || formatModeName(em.name) === targetName || em.name.toLowerCase() === targetNorm)
      );
      if (match) {
        if (match.name !== targetName) {
          try {
            collection.renameMode(match.modeId, targetName);
          } catch (e) {
            console.warn(`[DesignSystem] renameMode failed for ${match.name} -> ${targetName}:`, e);
          }
        }
        matchedModeIds.add(match.modeId);
        matchedTargetIndices.add(i);
      }
    }
    for (let i = 0; i < formattedModeNames.length; i++) {
      if (matchedTargetIndices.has(i)) continue;
      const targetName = formattedModeNames[i];
      const unusedExisting = existingModes.find((em) => !matchedModeIds.has(em.modeId));
      if (unusedExisting) {
        try {
          collection.renameMode(unusedExisting.modeId, targetName);
        } catch (e) {
          console.warn(`[DesignSystem] renameMode fallback failed:`, e);
        }
        matchedModeIds.add(unusedExisting.modeId);
        matchedTargetIndices.add(i);
      } else {
        try {
          collection.addMode(targetName);
        } catch (e) {
          console.warn(`[DesignSystem] addMode failed for ${targetName}:`, e);
        }
      }
    }
    for (let i = collection.modes.length - 1; i >= formattedModeNames.length; i--) {
      try {
        collection.removeMode(collection.modes[i].modeId);
      } catch (e) {
      }
    }
    const mapping = {};
    for (const m of collection.modes) {
      mapping[m.name] = m.modeId;
      mapping[m.name.toLowerCase()] = m.modeId;
      const firstLower = m.name.charAt(0).toLowerCase() + m.name.slice(1);
      mapping[firstLower] = m.modeId;
      const firstUpper = m.name.charAt(0).toUpperCase() + m.name.slice(1);
      mapping[firstUpper] = m.modeId;
    }
    return mapping;
  }
  function smartSetValueForMode(variable, modeId, newValue) {
    if (!variable || !modeId) return false;
    const currentVal = variable.valuesByMode ? variable.valuesByMode[modeId] : void 0;
    if (!isValueEqual(currentVal, newValue)) {
      variable.setValueForMode(modeId, newValue);
      return true;
    }
    return false;
  }
  function smartSetVariableMeta(variable, meta) {
    if (!variable || !meta) return;
    if (meta.description !== void 0 && variable.description !== meta.description) {
      variable.description = meta.description;
    }
    if (meta.hiddenFromPublishing !== void 0 && variable.hiddenFromPublishing !== meta.hiddenFromPublishing) {
      variable.hiddenFromPublishing = meta.hiddenFromPublishing;
    }
    if (meta.scopes !== void 0 && !isScopesEqual(variable.scopes, meta.scopes)) {
      variable.scopes = meta.scopes;
    }
  }
  function smartSetBoundVariable(target, field, variable) {
    if (!target || !variable) return;
    try {
      if (field === "letterSpacing" && target.letterSpacing && target.letterSpacing.unit !== "PIXELS") {
        target.letterSpacing = { value: target.letterSpacing.value || 0, unit: "PIXELS" };
      }
      const currentBound = target.boundVariables ? target.boundVariables[field] : null;
      const currentId = currentBound ? currentBound.id : null;
      if (currentId !== variable.id) {
        target.setBoundVariable(field, variable);
      }
    } catch (e) {
    }
  }
  function migrateFallbackColorVariables(variables) {
    const renamedMap = /* @__PURE__ */ new Map();
    if (!variables || !Array.isArray(variables)) return renamedMap;
    for (const v of variables) {
      if (!v.removed && v.resolvedType === "COLOR") {
        const parts = v.name.split("/");
        if (parts.length >= 2 && parts[0].toLowerCase() === "fallback") {
          const oldName = v.name;
          const leaf = parts[parts.length - 1];
          if (!leaf.toLowerCase().endsWith("fallback")) {
            const newLeaf = `${toPascalCase3(leaf)}Fallback`;
            const newParts = ["Fallback", ...parts.slice(1, -1), newLeaf];
            v.name = newParts.join("/");
            renamedMap.set(v.id, oldName);
          } else if (parts[0] !== "Fallback") {
            parts[0] = "Fallback";
            v.name = parts.join("/");
            renamedMap.set(v.id, oldName);
          }
          const currentLeaf = v.name.split("/").pop().toLowerCase();
          if (currentLeaf.startsWith("on")) {
            v.scopes = ["SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"];
          } else {
            v.scopes = ["FRAME_FILL"];
          }
        }
      }
    }
    return renamedMap;
  }
  function migrateHighlightVariables(variables) {
    const renamedMap = /* @__PURE__ */ new Map();
    if (!variables || !Array.isArray(variables)) return renamedMap;
    const hasOldSubtle = variables.some((v) => !v.removed && /highlightsubtle/i.test(v.name));
    if (!hasOldSubtle) return renamedMap;
    const migrationSteps = [
      { target: "Highlight/HighlightExtraHigh", patterns: ["highlight/highlighthigher", "highlighthigher"] },
      { target: "Highlight/HighlightVeryHigh", patterns: ["highlight/highlighthigh", "highlighthigh"] },
      { target: "Highlight/HighlightHigher", patterns: ["highlight/highlightbase", "highlightbase"] },
      { target: "Highlight/HighlightHigh", patterns: ["highlight/highlightlow", "highlightlow"] },
      { target: "Highlight/HighlightBase", patterns: ["highlight/highlightlower", "highlightlower"] },
      { target: "Highlight/HighlightLow", patterns: ["highlight/highlightlowest", "highlightlowest"] },
      { target: "Highlight/HighlightLower", patterns: ["highlightsubtle/highlightsubtlehigh", "highlight/highlightsubtlehigh", "highlightsubtlehigh", "highlightssubtle/highlightsubtlehigh"] },
      { target: "Highlight/HighlightVeryLow", patterns: ["highlightsubtle/highlightsubtlebase", "highlight/highlightsubtlebase", "highlightsubtlebase", "highlightssubtle/highlightsubtlebase"] },
      { target: "Highlight/HighlightExtraLow", patterns: ["highlightsubtle/highlightsubtlelow", "highlight/highlightsubtlelow", "highlightsubtlelow", "highlightssubtle/highlightsubtlelow"] },
      { target: "Highlight/HighlightUltraLow", patterns: ["highlightsubtle/highlightsubtlelower", "highlight/highlightsubtlelower", "highlightsubtlelower", "highlightssubtle/highlightsubtlelower"] },
      { target: "Highlight/HighlightLowest", patterns: ["highlightsubtle/highlightsubtlelowest", "highlight/highlightsubtlelowest", "highlightsubtlelowest", "highlightssubtle/highlightsubtlelowest"] }
    ];
    for (const step of migrationSteps) {
      const foundVar = variables.find((v) => !v.removed && v.resolvedType === "COLOR" && step.patterns.includes(v.name.toLowerCase()));
      if (foundVar && foundVar.name !== step.target) {
        const oldName = foundVar.name;
        foundVar.name = step.target;
        renamedMap.set(foundVar.id, oldName);
      }
    }
    return renamedMap;
  }
  function ensureVariable(name, collection, type, varsSource, oldName) {
    let v = null;
    const isMap = varsSource instanceof Map;
    const key = `${collection.id}:${name}`;
    if (isMap) {
      v = varsSource.get(key);
      if (!v && oldName) {
        const oldNames = Array.isArray(oldName) ? oldName : [oldName];
        for (const on of oldNames) {
          const oldKey = `${collection.id}:${on}`;
          v = varsSource.get(oldKey);
          if (v) {
            varsSource.delete(oldKey);
            if (v.name !== name) v.name = name;
            varsSource.set(key, v);
            break;
          }
        }
      }
      if (!v) {
        const targetNorm = normalizePathForMatch(name);
        for (const [existingKey, existingVar] of varsSource.entries()) {
          if (existingKey.startsWith(`${collection.id}:`)) {
            if (normalizePathForMatch(existingVar.name) === targetNorm) {
              v = existingVar;
              varsSource.delete(existingKey);
              if (v.name !== name) v.name = name;
              varsSource.set(key, v);
              break;
            }
          }
        }
      }
      if (!v && oldName) {
        const oldNames = Array.isArray(oldName) ? oldName : [oldName];
        for (const on of oldNames) {
          const oldNorm = normalizePathForMatch(on);
          for (const [existingKey, existingVar] of varsSource.entries()) {
            if (existingKey.startsWith(`${collection.id}:`)) {
              if (normalizePathForMatch(existingVar.name) === oldNorm) {
                v = existingVar;
                varsSource.delete(existingKey);
                if (v.name !== name) v.name = name;
                varsSource.set(key, v);
                break;
              }
            }
          }
          if (v) break;
        }
      }
    } else if (Array.isArray(varsSource)) {
      v = varsSource.find((iv) => iv.name === name && iv.variableCollectionId === collection.id);
      if (!v && oldName) {
        const oldNames = Array.isArray(oldName) ? oldName : [oldName];
        for (const on of oldNames) {
          v = varsSource.find((iv) => iv.name === on && iv.variableCollectionId === collection.id);
          if (v) {
            if (v.name !== name) v.name = name;
            break;
          }
        }
      }
      if (!v) {
        const targetNorm = normalizePathForMatch(name);
        v = varsSource.find((iv) => iv.variableCollectionId === collection.id && normalizePathForMatch(iv.name) === targetNorm);
        if (v) {
          if (v.name !== name) v.name = name;
        }
      }
      if (!v && oldName) {
        const oldNames = Array.isArray(oldName) ? oldName : [oldName];
        for (const on of oldNames) {
          const oldNorm = normalizePathForMatch(on);
          v = varsSource.find((iv) => iv.variableCollectionId === collection.id && normalizePathForMatch(iv.name) === oldNorm);
          if (v) {
            if (v.name !== name) v.name = name;
            break;
          }
        }
      }
    }
    if (v && v.resolvedType !== type) {
      v.remove();
      if (isMap) varsSource.delete(key);
      v = null;
    }
    if (!v) {
      v = figma.variables.createVariable(name, collection, type);
      if (isMap) varsSource.set(key, v);
    }
    return v;
  }
  function findLocalVarByNormName(allVars, colId, ...names) {
    for (const n of names) {
      const norm = normalizePathForMatch(n);
      const found = allVars.find((v) => v.variableCollectionId === colId && normalizePathForMatch(v.name) === norm);
      if (found) return found;
    }
    return null;
  }

  // ../../../../plugins/components-setup/src/ds-generator/utils/colorMath.ts
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : { r: 0, g: 0, b: 0 };
  }
  function rgbToHex2(r, g, b) {
    const toHex = (v) => {
      const hex = Math.round(v * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }
  function rgbaToHex(r, g, b, a) {
    const toHex = (v) => {
      const hex = Math.round(v * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return ("#" + toHex(r) + toHex(g) + toHex(b) + toHex(a)).toUpperCase();
  }
  function calculateTone(base, tone) {
    if (tone === 50) return base;
    if (tone === 100) return { r: 1, g: 1, b: 1 };
    if (tone === 0) return { r: 0, g: 0, b: 0 };
    if (tone > 50) {
      const amount = (tone - 50) / 50;
      return { r: base.r + (1 - base.r) * amount, g: base.g + (1 - base.g) * amount, b: base.b + (1 - base.b) * amount };
    } else {
      const amount = (50 - tone) / 50;
      return { r: base.r * (1 - amount), g: base.g * (1 - amount), b: base.b * (1 - amount) };
    }
  }
  function getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function findAccessibleOnTone(seedRgb, baseTone, defaultOnTone, minContrast = 4.5) {
    const baseRgb = calculateTone(seedRgb, baseTone);
    const defaultOnColor = calculateTone(seedRgb, defaultOnTone);
    const defaultContrast = getContrastRatio(baseRgb, defaultOnColor);
    if (defaultContrast >= minContrast) return defaultOnTone;
    const darkCandidates = [20, 15, 10, 5, 0];
    const lightCandidates = [100, 98, 95, 90];
    const candidates = defaultOnTone >= 50 ? [...darkCandidates, ...lightCandidates] : [...lightCandidates, ...darkCandidates];
    for (const t of candidates) {
      const c = calculateTone(seedRgb, t);
      if (getContrastRatio(baseRgb, c) >= minContrast) return t;
    }
    let bestTone = defaultOnTone;
    let maxRatio = defaultContrast;
    const allTones = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];
    for (const t of allTones) {
      const c = calculateTone(seedRgb, t);
      const ratio = getContrastRatio(baseRgb, c);
      if (ratio > maxRatio) {
        maxRatio = ratio;
        bestTone = t;
      }
    }
    return bestTone;
  }
  function findAccessibleDarkBaseTone(seedRgb, neutralRgb, defaultTone = 50) {
    const darkSurface = calculateTone(neutralRgb, 10);
    const darkBg = calculateTone(neutralRgb, 5);
    const checkContrast = (tone) => {
      const color = calculateTone(seedRgb, tone);
      return Math.min(getContrastRatio(color, darkSurface), getContrastRatio(color, darkBg));
    };
    if (checkContrast(defaultTone) >= 3) {
      return defaultTone;
    }
    const candidateTones = [55, 60, 65, 70, 75, 80, 85, 90, 95, 98, 99, 100];
    for (const t of candidateTones) {
      if (checkContrast(t) >= 3) {
        return t;
      }
    }
    return 100;
  }
  function findAccessibleLightBaseTone(seedRgb, defaultTone = 50) {
    const whiteRgb = { r: 1, g: 1, b: 1 };
    const checkContrast = (tone) => {
      const color = calculateTone(seedRgb, tone);
      return getContrastRatio(color, whiteRgb);
    };
    if (checkContrast(defaultTone) >= 4.5) {
      return defaultTone;
    }
    const candidateTones = [45, 40, 35, 30, 25, 20];
    for (const t of candidateTones) {
      if (checkContrast(t) >= 4.5) {
        return t;
      }
    }
    return 20;
  }
  function isLightColorRole(seedRgb) {
    if (!seedRgb) return false;
    const lum = getLuminance(seedRgb.r, seedRgb.g, seedRgb.b);
    if (lum >= 0.42) return true;
    const contrastWithBlack = getContrastRatio(seedRgb, { r: 0, g: 0, b: 0 });
    const accessibleToneForWhite = findAccessibleLightBaseTone(seedRgb, 50);
    return accessibleToneForWhite < 40 && contrastWithBlack >= 4;
  }
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }
  function hexToHSL(H) {
    let r = 0, g = 0, b = 0;
    if (H.length === 4) {
      r = parseInt("0x" + H[1] + H[1], 16);
      g = parseInt("0x" + H[2] + H[2], 16);
      b = parseInt("0x" + H[3] + H[3], 16);
    } else if (H.length === 7) {
      r = parseInt("0x" + H[1] + H[2], 16);
      g = parseInt("0x" + H[3] + H[4], 16);
      b = parseInt("0x" + H[5] + H[6], 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
    let h = 0, s = 0, l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = (g - b) / delta % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return [Math.round(h), Math.round(s), Math.round(l)];
  }
  function deriveDarkBaseColor(lightHex) {
    if (!lightHex) return "#FF6669";
    const [h, s, l] = hexToHSL(lightHex);
    const hDark = (h + 10) % 360;
    const sDark = s;
    const lDark = Math.min(95, Math.max(0, Math.round(l + 25)));
    return hslToHex(hDark, sDark, lDark);
  }
  function getDarkRoleName(role, seeds) {
    if (seeds) {
      if (role === "action" && seeds.actionDark) return seeds.actionDark.name;
      if (role === "success" && seeds.successDark) return seeds.successDark.name;
      if (role === "warning" && seeds.warningDark) return seeds.warningDark.name;
      if (role === "error" && seeds.errorDark) return seeds.errorDark.name;
    }
    return `${role}Dark`;
  }
  function getShortCode(role, tone, seeds) {
    if (!role || tone === void 0) return "";
    if (role === "neutral") return `n-${tone}`;
    if (role.startsWith("shade")) return `${role.replace("shade", "sh")}-${tone}`;
    const customName = seeds[role] ? seeds[role].name : role;
    if (["action", "success", "warning", "error"].includes(role)) {
      return `${customName.substring(0, 3).toLowerCase()}-${tone}`;
    }
    return `${customName.charAt(0).toLowerCase()}-${tone}`;
  }
  function parseSystemTarget(str) {
    if (!str) return null;
    const parts = str.split("/");
    return { role: parts[0], tone: parts[1] };
  }
  function getHexStringForTarget(target, seeds, customColors = null) {
    if (!target) return "";
    const role = target.role;
    const tone = parseInt(target.tone, 10);
    if (role === "shadesLight") {
      const neutralHex = seeds && seeds.neutral && seeds.neutral.color ? seeds.neutral.color : "#000000";
      const neutral5Rgb = calculateTone(hexToRgb(neutralHex), 5);
      return rgbaToHex(neutral5Rgb.r, neutral5Rgb.g, neutral5Rgb.b, tone / 100);
    }
    if (role === "shadesDark") return rgbaToHex(1, 1, 1, tone / 100);
    if (role.startsWith("shades")) {
      const baseRole = role.replace("shades", "").toLowerCase();
      if (seeds && seeds[baseRole]) {
        const baseRgb = hexToRgb(seeds[baseRole].color);
        return rgbaToHex(baseRgb.r, baseRgb.g, baseRgb.b, tone / 100);
      }
    }
    let seedHex = seeds && seeds[role] ? seeds[role].color : null;
    if (!seedHex && customColors && Array.isArray(customColors)) {
      const found = customColors.find((cc) => cc.name && (cc.name === role || toPascalCase3(cc.name) === role || cc.name.toLowerCase() === role.toLowerCase()));
      if (found) seedHex = found.color;
    }
    if (seedHex) {
      const baseRgb = hexToRgb(seedHex);
      const finalColor = calculateTone(baseRgb, tone);
      return rgbToHex2(finalColor.r, finalColor.g, finalColor.b);
    }
    return "";
  }
  async function resolveVarToHex(variable, allLocalVars, collections) {
    if (!variable) return null;
    const collection = collections.find((c) => c.id === variable.variableCollectionId);
    if (!collection) return null;
    const modeId = collection.modes[0].modeId;
    const value = variable.valuesByMode[modeId];
    if (!value) return null;
    if (value.type === "VARIABLE_ALIAS") {
      const nextVar = allLocalVars.find((v) => v.id === value.id);
      return resolveVarToHex(nextVar, allLocalVars, collections);
    }
    if (typeof value === "object" && "r" in value && "g" in value && "b" in value) {
      return rgbToHex2(value.r, value.g, value.b);
    }
    return null;
  }

  // ../../../../plugins/components-setup/src/ds-generator/detector/detectFromDoc.ts
  async function detectTypographyFromDocument() {
    const detected = {};
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const allLocalVars = await figma.variables.getLocalVariablesAsync();
      const typoCol = collections.find((c) => c.name === "_TypographyControls" || c.name === "_typographyControls" || c.name === "TypographyControls" || c.name === "typographyControls");
      if (typoCol) {
        const defaultMode = typoCol.modes[0];
        if (defaultMode) {
          const modeId = defaultMode.modeId;
          const headVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontFamily/heading", "fontFamily/header");
          const bodyVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontFamily/default", "fontFamily/body");
          if (headVar) {
            const val = headVar.valuesByMode[modeId];
            if (typeof val === "string") {
              detected.headersFont = val;
            }
          }
          if (bodyVar) {
            const val = bodyVar.valuesByMode[modeId];
            if (typeof val === "string") {
              detected.bodyFont = val;
            }
          }
          const headRegVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/base", "fontWeight/header/base");
          const headMedVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/medium", "fontWeight/header/medium");
          const headBoldVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/heading/bold", "fontWeight/header/bold");
          const bodyRegVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/base", "fontWeight/base", "fontWeight/regular");
          const bodyMedVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/medium", "fontWeight/medium");
          const bodyBoldVar = findLocalVarByNormName(allLocalVars, typoCol.id, "fontWeight/default/bold", "fontWeight/bold");
          if (headRegVar || headMedVar || headBoldVar) {
            detected.headersStyles = {
              regular: headRegVar ? headRegVar.valuesByMode[modeId] : bodyRegVar ? bodyRegVar.valuesByMode[modeId] : "Regular",
              medium: headMedVar ? headMedVar.valuesByMode[modeId] : bodyMedVar ? bodyMedVar.valuesByMode[modeId] : "Medium",
              bold: headBoldVar ? headBoldVar.valuesByMode[modeId] : bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : "Bold"
            };
          } else if (bodyRegVar || bodyMedVar || bodyBoldVar) {
            detected.headersStyles = {
              regular: bodyRegVar ? bodyRegVar.valuesByMode[modeId] : "Regular",
              medium: bodyMedVar ? bodyMedVar.valuesByMode[modeId] : "Medium",
              bold: bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : "Bold"
            };
          }
          if (bodyRegVar || bodyMedVar || bodyBoldVar) {
            detected.bodyStyles = {
              regular: bodyRegVar ? bodyRegVar.valuesByMode[modeId] : "Regular",
              medium: bodyMedVar ? bodyMedVar.valuesByMode[modeId] : "Medium",
              bold: bodyBoldVar ? bodyBoldVar.valuesByMode[modeId] : "Bold"
            };
          }
        }
      }
      const metricsCol = collections.find((c) => c.name === "Metrics" || c.name === "metrics" || c.name === "_metrics" || c.name === "_Metrics");
      if (metricsCol) {
        const defaultMode = metricsCol.modes[0];
        if (defaultMode) {
          const modeId = defaultMode.modeId;
          const lsHeadingVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/heading");
          const lsDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/display");
          const lsOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "letterSpacing/default", "letterSpacing/others");
          const psDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphSpacing/heading", "paragraphSpacing/display");
          const psOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphSpacing/default", "paragraphSpacing/others");
          const piDisplayVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphIndent/heading", "paragraphIndent/display");
          const piOthersVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "paragraphIndent/default", "paragraphIndent/others");
          if (lsHeadingVar && typeof lsHeadingVar.valuesByMode[modeId] === "number") detected.lsHeading = lsHeadingVar.valuesByMode[modeId];
          if (lsDisplayVar && typeof lsDisplayVar.valuesByMode[modeId] === "number") detected.lsDisplay = lsDisplayVar.valuesByMode[modeId];
          if (lsOthersVar && typeof lsOthersVar.valuesByMode[modeId] === "number") detected.lsOthers = lsOthersVar.valuesByMode[modeId];
          if (psDisplayVar && typeof psDisplayVar.valuesByMode[modeId] === "number") detected.psDisplay = psDisplayVar.valuesByMode[modeId];
          if (psOthersVar && typeof psOthersVar.valuesByMode[modeId] === "number") detected.psOthers = psOthersVar.valuesByMode[modeId];
          if (piDisplayVar && typeof piDisplayVar.valuesByMode[modeId] === "number") detected.piDisplay = piDisplayVar.valuesByMode[modeId];
          if (piOthersVar && typeof piOthersVar.valuesByMode[modeId] === "number") detected.piOthers = piOthersVar.valuesByMode[modeId];
          const radiusBaseVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "radius/base", "radius/regular");
          if (radiusBaseVar) {
            const radVal = radiusBaseVar.valuesByMode[modeId];
            if (radVal === 0) detected.radiusPreset = "none";
            else if (radVal === 8) detected.radiusPreset = "compact";
            else if (radVal === 12) detected.radiusPreset = "default";
            else if (radVal === 16) detected.radiusPreset = "relaxed";
            else if (radVal === 9999 || radVal === 24) detected.radiusPreset = "full";
          }
          const radiusHoverVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "radius/hover/base", "radius/hover");
          if (radiusHoverVar && radiusBaseVar) {
            const hVal = radiusHoverVar.valuesByMode[modeId];
            const dVal = radiusBaseVar.valuesByMode[modeId];
            if (hVal !== void 0 && dVal !== void 0 && hVal < dVal) {
              const schemeCol = collections.find((c) => c.name === "Schemes" || c.name === "schemes");
              if (schemeCol) {
                const primaryVar = findLocalVarByNormName(allLocalVars, schemeCol.id, "primary");
                const primaryHoverVar = findLocalVarByNormName(allLocalVars, schemeCol.id, "primaryHover");
                if (primaryVar && primaryHoverVar && primaryVar.valuesByMode && primaryHoverVar.valuesByMode) {
                  const isColorSame = Object.keys(primaryVar.valuesByMode).every((m) => {
                    const v1 = primaryVar.valuesByMode[m];
                    const v2 = primaryHoverVar.valuesByMode[m];
                    if (v1 && v2 && typeof v1 === "object" && typeof v2 === "object") {
                      return v1.id === v2.id;
                    }
                    return v1 === v2;
                  });
                  detected.buttonHoverPreset = isColorSame ? "shape" : "both";
                } else {
                  detected.buttonHoverPreset = "shape";
                }
              } else {
                detected.buttonHoverPreset = "shape";
              }
            } else {
              detected.buttonHoverPreset = "color";
            }
          }
          const layoutBaseVar = findLocalVarByNormName(allLocalVars, metricsCol.id, "layout/base", "layout/regular");
          if (layoutBaseVar) {
            const gapVal = layoutBaseVar.valuesByMode[modeId];
            if (gapVal === 8) detected.spacingPreset = "compact";
            else if (gapVal === 12) detected.spacingPreset = "default";
            else if (gapVal === 16) detected.spacingPreset = "relaxed";
          }
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
              if (typeof sz === "number" && typeof lh === "number" && sz > 0) {
                const ratio = (lh / sz).toFixed(2);
                const scales = ["1", "1.1", "1.15", "1.2", "1.25", "1.33", "1.4", "1.5", "1.6", "1.75", "2"];
                return scales.find((s) => parseFloat(s).toFixed(2) === ratio || Math.round(sz * parseFloat(s)) === lh);
              }
            }
            return void 0;
          };
          const detectedLhH = matchLhScale("fontSize/heading/h1", "lineHeight/heading/h1");
          if (detectedLhH && detectedLhH !== "1") detected.lhHeading = detectedLhH;
          const detectedLhD = matchLhScale("fontSize/display/large", "lineHeight/display/large");
          if (detectedLhD) detected.lhDisplay = detectedLhD;
          const bodySzV = findLocalVarByNormName(allLocalVars, metricsCol.id, "fontSize/body/large");
          const bodyLhV = findLocalVarByNormName(allLocalVars, metricsCol.id, "lineHeight/body/large");
          if (bodySzV && bodyLhV && bodySzV.valuesByMode[modeId] + 16 === bodyLhV.valuesByMode[modeId]) {
            detected.lhOthers = "default";
          } else if (bodySzV && bodyLhV && bodySzV.valuesByMode[modeId] + 12 === bodyLhV.valuesByMode[modeId]) {
            detected.lhOthers = "small";
          } else if (bodySzV && bodyLhV && bodySzV.valuesByMode[modeId] + 8 === bodyLhV.valuesByMode[modeId]) {
            detected.lhOthers = "extra-small";
          } else {
            const detectedLhO = matchLhScale("fontSize/body/large", "lineHeight/body/large");
            if (detectedLhO) detected.lhOthers = detectedLhO;
          }
        }
      }
      const layoutCol = collections.find((c) => c.name === "Layout" || c.name === "layout" || c.name === "_layout" || c.name === "_Layout");
      if (layoutCol) {
        const marginVar = findLocalVarByNormName(allLocalVars, layoutCol.id, "margin");
        if (marginVar) {
          const xlMode = layoutCol.modes.find((m) => m.name === "XL" || m.name === "xl");
          if (xlMode && typeof marginVar.valuesByMode[xlMode.modeId] === "number") {
            detected.layoutMarginXl = marginVar.valuesByMode[xlMode.modeId];
          }
          const lgMode = layoutCol.modes.find((m) => m.name === "LG" || m.name === "lg");
          if (lgMode && typeof marginVar.valuesByMode[lgMode.modeId] === "number") {
            detected.layoutMarginLg = marginVar.valuesByMode[lgMode.modeId];
          }
          const m2xlMode = layoutCol.modes.find((m) => m.name === "2XL" || m.name === "2xl");
          if (m2xlMode && typeof marginVar.valuesByMode[m2xlMode.modeId] === "number") {
            detected.layoutMargin2xl = marginVar.valuesByMode[m2xlMode.modeId];
          }
        }
      }
      const localStyles = await figma.getLocalTextStylesAsync();
      const displayStyle = localStyles.find((s) => s.name.toLowerCase().startsWith("display/") || s.name.toLowerCase().includes("/display/"));
      if (displayStyle && "textWrapStyle" in displayStyle && displayStyle.textWrapStyle) {
        detected.wrapDisplay = displayStyle.textWrapStyle;
      }
      const defaultStyle = localStyles.find((s) => s.name.toLowerCase().includes("body/") || s.name.toLowerCase().includes("default/body/") || s.name.toLowerCase().startsWith("body/"));
      if (defaultStyle && "textWrapStyle" in defaultStyle && defaultStyle.textWrapStyle) {
        detected.wrapOthers = defaultStyle.textWrapStyle;
      }
    } catch (e) {
      console.error("Error detecting typography from document:", e);
    }
    return detected;
  }
  async function detectColorsFromDocument() {
    const detected = {};
    const customColors = [];
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allLocalVars = await figma.variables.getLocalVariablesAsync();
    migrateFallbackColorVariables(allLocalVars);
    const controlCols = collections.filter(
      (c) => c.name === "_PaletteControls" || c.name === "_paletteControls" || c.name === "_StatesControls" || c.name === "_statesControls" || c.name === "_ShadesControls" || c.name === "_shadesControls"
    );
    for (const controlsCol of controlCols) {
      const nameVar = findLocalVarByNormName(allLocalVars, controlsCol.id, "name");
      const colorVar = findLocalVarByNormName(allLocalVars, controlsCol.id, "50");
      if (nameVar && colorVar) {
        const expectedRoles = ["primary", "secondary", "tertiary", "neutral", "accessibility", "action", "success", "warning", "error", "errorDark"];
        const modes = controlsCol.modes;
        for (let i = 0; i < modes.length; i++) {
          const modeId = modes[i].modeId;
          const customName = nameVar.valuesByMode[modeId];
          const colorValue = colorVar.valuesByMode[modeId];
          let hexColor = null;
          if (colorValue) {
            if (colorValue.type === "VARIABLE_ALIAS") {
              const aliasedVar = allLocalVars.find((v) => v.id === colorValue.id);
              if (aliasedVar) {
                const paletteCol2 = collections.find((c) => c.name === "_Palettes" || c.name === "_palettes" || c.name === "Palettes" || c.name === "palettes");
                if (paletteCol2) {
                  const defaultModeId = paletteCol2.modes[0].modeId;
                  const resolvedColor = aliasedVar.valuesByMode[defaultModeId];
                  if (resolvedColor && typeof resolvedColor === "object") {
                    hexColor = rgbToHex2(resolvedColor.r, resolvedColor.g, resolvedColor.b);
                  }
                }
              }
            } else if (typeof colorValue === "object") {
              hexColor = rgbToHex2(colorValue.r, colorValue.g, colorValue.b);
            }
          }
          if (customName && hexColor) {
            const matchedRole = expectedRoles.find((r) => r === customName || r.toLowerCase() === customName.toLowerCase());
            if (matchedRole) {
              detected[matchedRole] = { name: customName, color: hexColor };
            }
          }
        }
      }
    }
    const paletteCol = collections.find((c) => c.name === "_Palettes" || c.name === "_palettes" || c.name === "Palettes" || c.name === "palettes");
    if (paletteCol) {
      const paletteVars = allLocalVars.filter((v) => v.variableCollectionId === paletteCol.id);
      const defaultModeId = paletteCol.modes[0].modeId;
      for (const v of paletteVars) {
        if (v.name.endsWith("/50")) {
          const customName = v.name.substring(0, v.name.length - 3);
          const colorValue = v.valuesByMode[defaultModeId];
          if (colorValue && typeof colorValue === "object") {
            const hexColor = rgbToHex2(colorValue.r, colorValue.g, colorValue.b);
            const lowerName = customName.toLowerCase();
            const expectedRoles = ["primary", "secondary", "tertiary", "neutral", "accessibility", "action", "success", "warning", "error", "errordark", "actiondark", "successdark", "warningdark"];
            let matchedRole = expectedRoles.find((r) => r === lowerName || lowerName.includes(r));
            if (matchedRole) {
              if (!detected[matchedRole]) {
                detected[matchedRole] = { name: customName, color: hexColor };
              }
            } else if (!lowerName.startsWith("shades")) {
              if (!customColors.some((c) => c.name.toLowerCase() === customName.toLowerCase())) {
                customColors.push({ name: customName, color: hexColor });
              }
            }
          }
        }
      }
    }
    const schemesCol = collections.find((c) => c.name === "Schemes" || c.name === "schemes");
    if (schemesCol) {
      const schemeVars = allLocalVars.filter((v) => v.variableCollectionId === schemesCol.id);
      const lightMode = schemesCol.modes.find((m) => m.name === "Light" || m.name === "light");
      if (lightMode) {
        const modeId = lightMode.modeId;
        const expectedRoles = ["primary", "secondary", "tertiary", "neutral", "action", "success", "warning", "error"];
        for (const role of expectedRoles) {
          if (!detected[role]) {
            for (const v of schemeVars) {
              const lowerName = v.name.toLowerCase();
              if (lowerName === role || lowerName.includes(role)) {
                const colorValue = v.valuesByMode[modeId];
                let hexColor = null;
                if (colorValue) {
                  if (colorValue.type === "VARIABLE_ALIAS") {
                    const aliasedVar = allLocalVars.find((varInst) => varInst.id === colorValue.id);
                    if (aliasedVar) {
                      hexColor = await resolveVarToHex(aliasedVar, allLocalVars, collections);
                    }
                  } else if (typeof colorValue === "object") {
                    hexColor = rgbToHex2(colorValue.r, colorValue.g, colorValue.b);
                  }
                }
                if (hexColor) {
                  detected[role] = { name: v.name, color: hexColor };
                }
              }
            }
          }
        }
      }
    }
    detected._customColors = customColors;
    return detected;
  }

  // ../../../../plugins/components-setup/src/ds-generator/init.ts
  async function initDsGeneratorUI() {
    try {
      const savedSettings = await figma.clientStorage.getAsync("pluginSettings");
      const savedRadiusPreset = await figma.clientStorage.getAsync("pluginRadiusPreset");
      const savedSpacingPreset = await figma.clientStorage.getAsync("pluginSpacingPreset");
      const savedButtonHoverPreset = await figma.clientStorage.getAsync("pluginButtonHoverPreset");
      const savedStylePreset = await figma.clientStorage.getAsync("pluginStylePreset");
      const savedBaseFontSize = await figma.clientStorage.getAsync("pluginBaseFontSize");
      const savedLH_H = await figma.clientStorage.getAsync("pluginLH_H");
      const savedLH_D = await figma.clientStorage.getAsync("pluginLH_D");
      const savedLH_O = await figma.clientStorage.getAsync("pluginLH_O");
      const savedHeadersFont = await figma.clientStorage.getAsync("pluginHeadersFont");
      const savedBodyFont = await figma.clientStorage.getAsync("pluginBodyFont");
      const savedLS_H = await figma.clientStorage.getAsync("pluginLS_H");
      const savedLS_D = await figma.clientStorage.getAsync("pluginLS_D");
      const savedLS_O = await figma.clientStorage.getAsync("pluginLS_O");
      const savedPS_D = await figma.clientStorage.getAsync("pluginPS_D");
      const savedPS_O = await figma.clientStorage.getAsync("pluginPS_O");
      const savedPI_D = await figma.clientStorage.getAsync("pluginPI_D");
      const savedPI_O = await figma.clientStorage.getAsync("pluginPI_O");
      const savedWrap_D = await figma.clientStorage.getAsync("pluginWrap_D");
      const savedWrap_O = await figma.clientStorage.getAsync("pluginWrap_O");
      const savedLayoutMarginXl = await figma.clientStorage.getAsync("pluginLayoutMarginXl");
      const savedLayoutMarginLg = await figma.clientStorage.getAsync("pluginLayoutMarginLg");
      const savedLayoutMargin2xl = await figma.clientStorage.getAsync("pluginLayoutMargin2xl");
      const savedHeadersStyles = await figma.clientStorage.getAsync("pluginHeadersStyles");
      const savedBodyStyles = await figma.clientStorage.getAsync("pluginBodyStyles");
      const savedCustomGradients = await figma.clientStorage.getAsync("pluginCustomGradients");
      const savedCustomColors = await figma.clientStorage.getAsync("pluginCustomColors");
      const initialCollections = await figma.variables.getLocalVariableCollectionsAsync();
      const updatedModesCount = updateExistingCollectionModes(initialCollections);
      const initialVars = await figma.variables.getLocalVariablesAsync();
      ensureLayoutStringVariable(initialCollections, initialVars);
      if (updatedModesCount > 0) {
        figma.notify(`Zaktualizowano ${updatedModesCount} tryb\xF3w (modes) w kolekcjach na PascalCase / ALLCAPS. \u2728`);
      }
      const detectedSeeds = await detectColorsFromDocument();
      const seeds = Object.assign({}, savedSettings);
      for (const [role, data] of Object.entries(detectedSeeds)) {
        seeds[role] = data;
      }
      const detectedTypo = await detectTypographyFromDocument();
      const availableFonts = await figma.listAvailableFontsAsync();
      const fontFamiliesMap = {};
      for (const f of availableFonts) {
        const fam = f.fontName.family;
        if (!fontFamiliesMap[fam]) fontFamiliesMap[fam] = [];
        if (!fontFamiliesMap[fam].includes(f.fontName.style)) {
          fontFamiliesMap[fam].push(f.fontName.style);
        }
      }
      for (const fam in fontFamiliesMap) {
        fontFamiliesMap[fam].sort();
      }
      const uniqueFamilies = Object.keys(fontFamiliesMap).sort();
      const legacyMap = {
        default: { radius: "default", spacing: "default" },
        sharp: { radius: "none", spacing: "compact" },
        playful: { radius: "full", spacing: "relaxed" },
        compact: { radius: "compact", spacing: "compact" },
        elegant: { radius: "relaxed", spacing: "relaxed" }
      };
      const legacyRadius = savedStylePreset && legacyMap[savedStylePreset] ? legacyMap[savedStylePreset].radius : "default";
      const legacySpacing = savedStylePreset && legacyMap[savedStylePreset] ? legacyMap[savedStylePreset].spacing : "default";
      figma.ui.postMessage({
        type: "load-settings",
        seeds,
        radiusPreset: detectedTypo.radiusPreset || savedRadiusPreset || legacyRadius,
        spacingPreset: detectedTypo.spacingPreset || savedSpacingPreset || legacySpacing,
        buttonHoverPreset: detectedTypo.buttonHoverPreset || savedButtonHoverPreset || "color",
        baseFontSize: detectedTypo.baseFontSize || savedBaseFontSize || 16,
        lhHeading: detectedTypo.lhHeading || savedLH_H || "default",
        lhDisplay: detectedTypo.lhDisplay || savedLH_D || "default",
        lhOthers: detectedTypo.lhOthers || savedLH_O || "default",
        headersFont: detectedTypo.headersFont || savedHeadersFont,
        headersStyles: detectedTypo.headersStyles || savedHeadersStyles,
        bodyFont: detectedTypo.bodyFont || savedBodyFont,
        bodyStyles: detectedTypo.bodyStyles || savedBodyStyles,
        fontStyles: fontFamiliesMap,
        lsHeading: detectedTypo.lsHeading !== void 0 ? detectedTypo.lsHeading : savedLS_H,
        lsDisplay: detectedTypo.lsDisplay !== void 0 ? detectedTypo.lsDisplay : savedLS_D,
        lsOthers: detectedTypo.lsOthers !== void 0 ? detectedTypo.lsOthers : savedLS_O,
        psDisplay: detectedTypo.psDisplay !== void 0 ? detectedTypo.psDisplay : savedPS_D,
        psOthers: detectedTypo.psOthers !== void 0 ? detectedTypo.psOthers : savedPS_O,
        piDisplay: detectedTypo.piDisplay !== void 0 ? detectedTypo.piDisplay : savedPI_D,
        piOthers: detectedTypo.piOthers !== void 0 ? detectedTypo.piOthers : savedPI_O,
        wrapDisplay: detectedTypo.wrapDisplay || savedWrap_D || "BALANCE",
        wrapOthers: detectedTypo.wrapOthers || savedWrap_O || "BALANCE",
        layoutMarginXl: detectedTypo.layoutMarginXl !== void 0 ? detectedTypo.layoutMarginXl : savedLayoutMarginXl !== void 0 ? savedLayoutMarginXl : 72,
        layoutMarginLg: detectedTypo.layoutMarginLg !== void 0 ? detectedTypo.layoutMarginLg : savedLayoutMarginLg !== void 0 ? savedLayoutMarginLg : null,
        layoutMargin2xl: detectedTypo.layoutMargin2xl !== void 0 ? detectedTypo.layoutMargin2xl : savedLayoutMargin2xl !== void 0 ? savedLayoutMargin2xl : null,
        customGradients: savedCustomGradients || [],
        customColors: savedCustomColors && savedCustomColors.length > 0 ? savedCustomColors : detectedSeeds._customColors || []
      });
      figma.ui.postMessage({
        type: "fonts-loaded",
        fonts: uniqueFamilies,
        fontStyles: fontFamiliesMap
      });
    } catch (err) {
      console.error("Error loading DS Generator settings:", err);
    }
  }

  // ../../../../plugins/components-setup/src/ds-generator/bridge/exportJson.ts
  async function exportVariablesToJson(options = {}) {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const allVars = await figma.variables.getLocalVariablesAsync();
      migrateFallbackColorVariables(allVars);
      if (!collections || collections.length === 0) {
        if (!options.silent) figma.notify("No variable collections found in current file.");
        return;
      }
      const colMap = /* @__PURE__ */ new Map();
      for (const c of collections) {
        colMap.set(c.id, c.name);
      }
      const varMap = /* @__PURE__ */ new Map();
      for (const v of allVars) {
        varMap.set(v.id, {
          collectionName: colMap.get(v.variableCollectionId) || "",
          name: v.name
        });
      }
      const orderPreference = [
        "_Palettes",
        "_palettes",
        "Schemes",
        "schemes",
        "_PaletteControls",
        "_paletteControls",
        "_SchemesControls",
        "_schemesControls",
        "Metrics",
        "metrics",
        "_BlursControls",
        "_blursControls",
        "_GlassControls",
        "_glassControls",
        "_TypographyControls",
        "_typographyControls",
        "Layout",
        "layout",
        "_StatesControls",
        "_statesControls",
        "Accessibility",
        "accessibility"
      ];
      const sortedCollections = [...collections].sort((a, b) => {
        let idxA = orderPreference.indexOf(a.name);
        let idxB = orderPreference.indexOf(b.name);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        if (idxA !== idxB) return idxA - idxB;
        return a.name.localeCompare(b.name);
      });
      const exportCollections = [];
      for (const col of sortedCollections) {
        const colVars = allVars.filter((v) => v.variableCollectionId === col.id && !v.removed);
        const modesList = [];
        for (const mode of col.modes) {
          const modeVariables = [];
          for (const v of colVars) {
            const rawVal = v.valuesByMode ? v.valuesByMode[mode.modeId] : void 0;
            let isAlias = false;
            let finalVal = null;
            if (rawVal && typeof rawVal === "object" && rawVal.type === "VARIABLE_ALIAS") {
              isAlias = true;
              const targetInfo = varMap.get(rawVal.id);
              if (targetInfo) {
                finalVal = {
                  collection: targetInfo.collectionName,
                  name: targetInfo.name
                };
              } else {
                finalVal = {
                  collection: "",
                  name: "unknown"
                };
              }
            } else if (v.resolvedType === "COLOR") {
              isAlias = false;
              if (rawVal && typeof rawVal === "object" && "r" in rawVal) {
                const alpha = rawVal.a !== void 0 ? rawVal.a : 1;
                if (alpha < 0.999) {
                  finalVal = rgbaToHex(rawVal.r, rawVal.g, rawVal.b, alpha);
                } else {
                  finalVal = rgbToHex2(rawVal.r, rawVal.g, rawVal.b);
                }
              } else {
                finalVal = "#000000";
              }
            } else {
              isAlias = false;
              finalVal = rawVal !== void 0 ? rawVal : v.resolvedType === "FLOAT" ? 0 : v.resolvedType === "BOOLEAN" ? false : "";
            }
            let varType = "string";
            if (v.resolvedType === "COLOR") varType = "color";
            else if (v.resolvedType === "FLOAT") varType = "number";
            else if (v.resolvedType === "BOOLEAN") varType = "boolean";
            else if (v.resolvedType === "STRING") varType = "string";
            modeVariables.push({
              name: v.name,
              type: varType,
              isAlias,
              value: finalVal,
              scopes: v.scopes || [],
              description: v.description || ""
            });
          }
          modesList.push({
            name: mode.name,
            variables: modeVariables
          });
        }
        exportCollections.push({
          name: col.name,
          modes: modesList
        });
      }
      try {
        const textStyles = await (figma.getLocalTextStylesAsync ? figma.getLocalTextStylesAsync() : Promise.resolve(figma.getLocalTextStyles()));
        if (textStyles && textStyles.length > 0) {
          const typoVars = textStyles.map((ts) => {
            const fontFam = ts.fontName ? ts.fontName.family : "Google Sans";
            const fontStyle = ts.fontName ? ts.fontName.style : "Regular";
            const lh = ts.lineHeight || { unit: "AUTO" };
            let lhVal = 0;
            let lhUnit = "AUTO";
            if (lh.unit === "PIXELS") {
              lhVal = Math.round(lh.value);
              lhUnit = "PIXELS";
            } else if (lh.unit === "PERCENT") {
              lhVal = Math.round(lh.value);
              lhUnit = "PERCENT";
            }
            const ls = ts.letterSpacing || { unit: "PIXELS", value: 0 };
            let lsVal = ls.value || 0;
            let lsUnit = ls.unit || "PIXELS";
            let textCase = "ORIGINAL";
            if (ts.textCase === "UPPER") textCase = "UPPER";
            else if (ts.textCase === "LOWER") textCase = "LOWER";
            else if (ts.textCase === "TITLE") textCase = "TITLE";
            let textDecoration = "NONE";
            if (ts.textDecoration === "UNDERLINE") textDecoration = "UNDERLINE";
            else if (ts.textDecoration === "STRIKETHROUGH") textDecoration = "STRIKETHROUGH";
            return {
              name: ts.name,
              type: "typography",
              isAlias: false,
              value: {
                fontSize: ts.fontSize,
                fontFamily: fontFam,
                fontWeight: fontStyle,
                lineHeight: lhVal,
                lineHeightUnit: lhUnit,
                letterSpacing: lsVal,
                letterSpacingUnit: lsUnit,
                textCase,
                textDecoration
              }
            };
          });
          exportCollections.push({
            name: "Typography",
            modes: [
              {
                name: "Style",
                variables: typoVars
              }
            ]
          });
        }
      } catch (e) {
        console.warn("Could not export text styles:", e);
      }
      try {
        const effectStyles = await (figma.getLocalEffectStylesAsync ? figma.getLocalEffectStylesAsync() : Promise.resolve(figma.getLocalEffectStyles()));
        if (effectStyles && effectStyles.length > 0) {
          const effectVars = effectStyles.map((es) => {
            return {
              name: es.name,
              type: "effect",
              isAlias: false,
              value: {
                effects: (es.effects || []).map((ef) => {
                  const mapped = { type: ef.type };
                  if (ef.color) {
                    mapped.color = {
                      r: Math.round(ef.color.r * 255),
                      g: Math.round(ef.color.g * 255),
                      b: Math.round(ef.color.b * 255),
                      a: ef.color.a !== void 0 ? +ef.color.a.toFixed(2) : 1
                    };
                  }
                  if (ef.offset) mapped.offset = { x: ef.offset.x, y: ef.offset.y };
                  if (ef.radius !== void 0) mapped.radius = ef.radius;
                  if (ef.spread !== void 0) mapped.spread = ef.spread;
                  return mapped;
                })
              }
            };
          });
          exportCollections.push({
            name: "Effects",
            modes: [
              {
                name: "Style",
                variables: effectVars
              }
            ]
          });
        }
      } catch (e) {
        console.warn("Could not export effect styles:", e);
      }
      try {
        const gridStyles = await (figma.getLocalGridStylesAsync ? figma.getLocalGridStylesAsync() : Promise.resolve(figma.getLocalGridStyles()));
        if (gridStyles && gridStyles.length > 0) {
          const gridVars = gridStyles.map((gs) => {
            return {
              name: gs.name,
              type: "grid",
              isAlias: false,
              value: {
                layoutGrids: (gs.layoutGrids || []).map((lg) => {
                  const mapped = { pattern: lg.pattern };
                  if (lg.color) {
                    mapped.color = {
                      r: Math.round(lg.color.r * 255),
                      g: Math.round(lg.color.g * 255),
                      b: Math.round(lg.color.b * 255),
                      a: lg.color.a !== void 0 ? +lg.color.a.toFixed(2) : 1
                    };
                  }
                  if (lg.alignment) mapped.alignment = lg.alignment;
                  if (lg.gutterSize !== void 0) mapped.gutterSize = lg.gutterSize;
                  if (lg.offset !== void 0) mapped.offset = lg.offset;
                  if (lg.count !== void 0) mapped.count = lg.count;
                  return mapped;
                })
              }
            };
          });
          exportCollections.push({
            name: "Grids",
            modes: [
              {
                name: "Style",
                variables: gridVars
              }
            ]
          });
        }
      } catch (e) {
        console.warn("Could not export grid styles:", e);
      }
      const exportPayload = {
        version: "1.0.4",
        metadata: {
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          generator: "me&my Friends - design system generator"
        },
        collections: exportCollections
      };
      figma.ui.postMessage({
        type: "export-variables-result",
        json: JSON.stringify(exportPayload, null, 2),
        filename: "variables.json",
        autoSync: options.autoSync || false
      });
      if (!options.silent) {
        figma.notify("Variables exported successfully!");
      }
    } catch (err) {
      console.error("Export variables error:", err);
      if (!options.silent) {
        figma.notify("Export failed: " + err.message);
      }
    }
  }

  // ../../../../plugins/components-setup/src/ds-generator/generator/createPalette.ts
  async function handleCreatePalette(msg) {
    const seeds = msg.seeds;
    const remValue = 16;
    const { radiusPreset: msgRadiusPreset, spacingPreset: msgSpacingPreset, buttonHoverPreset: msgButtonHoverPreset, stylePreset, baseFontSize, lhHeading, lhDisplay, lhOthers, lsHeading, lsDisplay, lsOthers, psDisplay, psOthers, piDisplay, piOthers, wrapDisplay, wrapOthers, layoutMarginXl, layoutMarginLg, layoutMargin2xl, customGradients, customColors } = msg;
    const buttonHoverPreset = msgButtonHoverPreset || "color";
    const targetWrapDisplay = wrapDisplay || "BALANCE";
    const targetWrapOthers = wrapOthers || "BALANCE";
    const legacyMap = {
      default: { radius: "default", spacing: "default", border: "default" },
      sharp: { radius: "none", spacing: "compact", border: "thin" },
      playful: { radius: "full", spacing: "relaxed", border: "default" },
      compact: { radius: "compact", spacing: "compact", border: "thin" },
      elegant: { radius: "relaxed", spacing: "relaxed", border: "default" }
    };
    const legacyPreset = stylePreset && legacyMap[stylePreset] ? legacyMap[stylePreset] : legacyMap.default;
    const radiusPreset = msgRadiusPreset || legacyPreset.radius || "default";
    const gapPreset = msgSpacingPreset || legacyPreset.spacing || "default";
    const paddingPreset = gapPreset;
    const borderPreset = gapPreset === "compact" || radiusPreset === "none" ? "thin" : "default";
    try {
      const expectedRoles = [
        "primary",
        "secondary",
        "tertiary",
        "neutral",
        "accessibility",
        "action",
        "actionDark",
        "success",
        "successDark",
        "warning",
        "warningDark",
        "error",
        "errorDark"
      ];
      const defaultTones = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
      const neutralTones = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98, 99, 100];
      const stateTones = [0, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98, 99, 100];
      const tones = neutralTones;
      const opacitySteps = [0, 3, 4, 6, 8, 12, 14, 16, 18, 22, 24];
      for (let i = 5; i <= 95; i += 5) {
        if (!opacitySteps.includes(i)) opacitySteps.push(i);
      }
      opacitySteps.push(98, 99, 100);
      opacitySteps.sort((a, b) => a - b);
      const createdVariablesMap = /* @__PURE__ */ new Map();
      const metricsMap = /* @__PURE__ */ new Map();
      const allLocalVars = await figma.variables.getLocalVariablesAsync();
      const fallbackRenamedMap = migrateFallbackColorVariables(allLocalVars);
      const highlightRenamedMap = migrateHighlightVariables(allLocalVars);
      const varLookupMap = /* @__PURE__ */ new Map();
      for (const v of allLocalVars) {
        if (!v.removed) {
          varLookupMap.set(`${v.variableCollectionId}:${v.name}`, v);
          if (fallbackRenamedMap.has(v.id)) {
            varLookupMap.set(`${v.variableCollectionId}:${fallbackRenamedMap.get(v.id)}`, v);
          }
          if (highlightRenamedMap.has(v.id)) {
            varLookupMap.set(`${v.variableCollectionId}:${highlightRenamedMap.get(v.id)}`, v);
          }
        }
      }
      const activeVariableNames = /* @__PURE__ */ new Map();
      const trackVariable = (colId, name) => {
        if (!activeVariableNames.has(colId)) activeVariableNames.set(colId, /* @__PURE__ */ new Set());
        activeVariableNames.get(colId).add(name);
      };
      const headersFont = msg.headersFont || "Inter";
      const bodyFont = msg.bodyFont || "Inter";
      const headersStyles = msg.headersStyles || { regular: "Regular", medium: "Medium", bold: "Bold" };
      const bodyStyles = msg.bodyStyles || { regular: "Regular", medium: "Medium", bold: "Bold" };
      if (!seeds.accessibility) seeds.accessibility = { name: "accessibility", color: "#ffed00" };
      const baseActionColor = seeds.action ? seeds.action.color : "#2979FF";
      const baseSuccessColor = seeds.success ? seeds.success.color : "#27AE60";
      const baseWarningColor = seeds.warning ? seeds.warning.color : "#F2C94C";
      let baseErrorColor = seeds.error && seeds.error.color ? seeds.error.color : "#e7000b";
      if (baseErrorColor.toUpperCase() === "#E6453B" || baseErrorColor.toUpperCase() === "#FF6467") baseErrorColor = "#e7000b";
      seeds.error.color = baseErrorColor;
      seeds.actionDark = { name: seeds.actionDark && seeds.actionDark.name ? seeds.actionDark.name : "actionDark", color: deriveDarkBaseColor(baseActionColor) };
      seeds.successDark = { name: seeds.successDark && seeds.successDark.name ? seeds.successDark.name : "successDark", color: deriveDarkBaseColor(baseSuccessColor) };
      seeds.warningDark = { name: seeds.warningDark && seeds.warningDark.name ? seeds.warningDark.name : "warningDark", color: deriveDarkBaseColor(baseWarningColor) };
      seeds.errorDark = { name: seeds.errorDark && seeds.errorDark.name ? seeds.errorDark.name : "errorDark", color: deriveDarkBaseColor(baseErrorColor) };
      await figma.clientStorage.setAsync("pluginSettings", seeds);
      await figma.clientStorage.setAsync("pluginRadiusPreset", radiusPreset);
      await figma.clientStorage.setAsync("pluginSpacingPreset", gapPreset);
      await figma.clientStorage.setAsync("pluginButtonHoverPreset", buttonHoverPreset);
      await figma.clientStorage.setAsync("pluginBaseFontSize", baseFontSize || 16);
      await figma.clientStorage.setAsync("pluginLH_H", lhHeading || "default");
      await figma.clientStorage.setAsync("pluginLH_D", lhDisplay || "default");
      await figma.clientStorage.setAsync("pluginLH_O", lhOthers || "default");
      await figma.clientStorage.setAsync("pluginHeadersFont", headersFont);
      await figma.clientStorage.setAsync("pluginHeadersStyles", headersStyles);
      await figma.clientStorage.setAsync("pluginBodyFont", bodyFont);
      await figma.clientStorage.setAsync("pluginBodyStyles", bodyStyles);
      await figma.clientStorage.setAsync("pluginLS_H", lsHeading !== void 0 ? lsHeading : 0);
      await figma.clientStorage.setAsync("pluginLS_D", lsDisplay);
      await figma.clientStorage.setAsync("pluginLS_O", lsOthers);
      await figma.clientStorage.setAsync("pluginPS_D", psDisplay);
      await figma.clientStorage.setAsync("pluginPS_O", psOthers);
      await figma.clientStorage.setAsync("pluginPI_D", piDisplay);
      await figma.clientStorage.setAsync("pluginPI_O", piOthers);
      await figma.clientStorage.setAsync("pluginWrap_D", targetWrapDisplay);
      await figma.clientStorage.setAsync("pluginWrap_O", targetWrapOthers);
      await figma.clientStorage.setAsync("pluginLayoutMarginXl", layoutMarginXl);
      await figma.clientStorage.setAsync("pluginLayoutMarginLg", layoutMarginLg);
      await figma.clientStorage.setAsync("pluginLayoutMargin2xl", layoutMargin2xl);
      await figma.clientStorage.setAsync("pluginCustomGradients", customGradients || []);
      await figma.clientStorage.setAsync("pluginCustomColors", customColors || []);
      async function resolveMetric(value, col, modeId) {
        return null;
      }
      const allAvailableFonts = await figma.listAvailableFontsAsync();
      const fontsToLoad = allAvailableFonts.filter(
        (f) => f.fontName.family === headersFont || f.fontName.family === bodyFont
      );
      await Promise.all(fontsToLoad.map((f) => figma.loadFontAsync(f.fontName).catch(() => {
      })));
      const existingLocalTextStyles = await figma.getLocalTextStylesAsync();
      await Promise.all(existingLocalTextStyles.map((s) => {
        if (s.fontName && s.fontName.family && s.fontName.style) {
          return figma.loadFontAsync(s.fontName).catch(() => {
          });
        }
        return Promise.resolve();
      }));
      async function safeLoadFont(family, style, fallbackStyle = "Regular") {
        try {
          await figma.loadFontAsync({ family, style });
          return style;
        } catch (e1) {
          try {
            if (fallbackStyle && fallbackStyle !== style) {
              await figma.loadFontAsync({ family, style: fallbackStyle });
              return fallbackStyle;
            }
          } catch (e2) {
          }
          try {
            const match = allAvailableFonts.find((f) => f.fontName.family === family && !f.fontName.style.toLowerCase().includes("italic"));
            if (match) {
              await figma.loadFontAsync(match.fontName);
              return match.fontName.style;
            }
          } catch (e3) {
          }
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          return "Regular";
        }
      }
      const loadedHeadReg = await safeLoadFont(headersFont, headersStyles.regular, "Regular");
      const loadedHeadMed = await safeLoadFont(headersFont, headersStyles.medium, loadedHeadReg);
      const loadedHeadBold = await safeLoadFont(headersFont, headersStyles.bold, loadedHeadMed);
      const loadedBodyReg = await safeLoadFont(bodyFont, bodyStyles.regular, "Regular");
      const loadedBodyMed = await safeLoadFont(bodyFont, bodyStyles.medium, loadedBodyReg);
      const loadedBodyBold = await safeLoadFont(bodyFont, bodyStyles.bold, loadedBodyMed);
      const paletteCollectionName = "_Palettes";
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      updateExistingCollectionModes(collections);
      let paletteCollection = collections.find((c) => c.name === paletteCollectionName || c.name === "_palettes" || c.name === "palettes" || c.name === "Palettes");
      if (paletteCollection) {
        if (paletteCollection.name !== paletteCollectionName) paletteCollection.name = paletteCollectionName;
      } else {
        paletteCollection = figma.variables.createVariableCollection(paletteCollectionName);
      }
      const paletteModesMap = ensureCollectionModes(paletteCollection, ["Default"]);
      const paletteModeId = paletteModesMap["Default"] || paletteModesMap["default"];
      for (const role of expectedRoles) {
        if (!seeds[role]) continue;
        let hex = seeds[role].color;
        const customName = seeds[role].name;
        const pascalName = toPascalCase3(customName);
        const baseRgb = hexToRgb(hex);
        const activeTones = neutralTones;
        for (const tone of activeTones) {
          const variableName = `${pascalName}/${tone}`;
          const oldVarName = `${customName}/${tone}`;
          const finalColor = calculateTone(baseRgb, tone);
          let variable = ensureVariable(variableName, paletteCollection, "COLOR", varLookupMap, oldVarName);
          smartSetVariableMeta(variable, {
            description: `Raw primitive color token for ${variableName}. Do not use directly.`,
            hiddenFromPublishing: true,
            scopes: []
          });
          smartSetValueForMode(variable, paletteModeId, finalColor);
          trackVariable(paletteCollection.id, variableName);
          createdVariablesMap.set(`${role}/${tone}`, variable.id);
          createdVariablesMap.set(`${toPascalCase3(role)}/${tone}`, variable.id);
          if (customName) {
            createdVariablesMap.set(`${customName}/${tone}`, variable.id);
            createdVariablesMap.set(`${pascalName}/${tone}`, variable.id);
          }
        }
      }
      if (customColors && Array.isArray(customColors) && customColors.length > 0) {
        for (const cc of customColors) {
          const rawName = (cc.name || "custom").trim();
          if (!rawName) continue;
          const pascalName = toPascalCase3(rawName);
          const hex = cc.color || "#6750A4";
          const baseRgb = hexToRgb(hex);
          const activeTones = neutralTones;
          for (const tone of activeTones) {
            const variableName = `${pascalName}/${tone}`;
            const oldVarName = `${rawName}/${tone}`;
            const finalColor = calculateTone(baseRgb, tone);
            let variable = ensureVariable(variableName, paletteCollection, "COLOR", varLookupMap, oldVarName);
            smartSetVariableMeta(variable, {
              description: `Raw primitive color token for ${variableName}. Do not use directly.`,
              hiddenFromPublishing: true,
              scopes: []
            });
            smartSetValueForMode(variable, paletteModeId, finalColor);
            trackVariable(paletteCollection.id, variableName);
            createdVariablesMap.set(`${rawName}/${tone}`, variable.id);
            createdVariablesMap.set(`${pascalName}/${tone}`, variable.id);
            createdVariablesMap.set(`${rawName.toLowerCase()}/${tone}`, variable.id);
            createdVariablesMap.set(`${pascalName.toLowerCase()}/${tone}`, variable.id);
          }
        }
      }
      const createPaletteShade = async (groupName, step, colorVal) => {
        const pascalGroupName = toPascalCase3(groupName);
        const varName = `${pascalGroupName}/${step}`;
        const oldVarName = `${groupName}/${step}`;
        let shadeVar = ensureVariable(varName, paletteCollection, "COLOR", varLookupMap, oldVarName);
        smartSetVariableMeta(shadeVar, {
          description: `Primitive alpha ${step}% for ${varName}.`,
          hiddenFromPublishing: true,
          scopes: []
        });
        smartSetValueForMode(shadeVar, paletteModeId, colorVal);
        trackVariable(paletteCollection.id, varName);
        createdVariablesMap.set(`${groupName}/${step}`, shadeVar.id);
        createdVariablesMap.set(`${pascalGroupName}/${step}`, shadeVar.id);
      };
      const neutralHex = seeds.neutral && seeds.neutral.color ? seeds.neutral.color : "#000000";
      const neutral5Rgb = calculateTone(hexToRgb(neutralHex), 5);
      for (const step of opacitySteps) {
        await createPaletteShade("shadesLight", step, { r: neutral5Rgb.r, g: neutral5Rgb.g, b: neutral5Rgb.b, a: step / 100 });
        await createPaletteShade("shadesDark", step, { r: 1, g: 1, b: 1, a: step / 100 });
        for (const role of ["primary", "secondary", "tertiary"]) {
          if (seeds[role] && seeds[role].color) {
            const baseRgb = hexToRgb(seeds[role].color);
            const groupName = `shades${capitalize(role)}`;
            await createPaletteShade(groupName, step, { r: baseRgb.r, g: baseRgb.g, b: baseRgb.b, a: step / 100 });
          }
        }
        if (customColors && Array.isArray(customColors) && customColors.length > 0) {
          for (const cc of customColors) {
            const rawName = (cc.name || "custom").trim();
            if (!rawName || !cc.color) continue;
            const pascalName = toPascalCase3(rawName);
            const baseRgb = hexToRgb(cc.color);
            const groupName = `shades${pascalName}`;
            await createPaletteShade(groupName, step, { r: baseRgb.r, g: baseRgb.g, b: baseRgb.b, a: step / 100 });
          }
        }
      }
      const controlGroups = [
        {
          name: "_PaletteControls",
          oldNames: ["_paletteControls"],
          roles: ["primary", "secondary", "tertiary", "neutral", "accessibility"]
        },
        {
          name: "_StatesControls",
          oldNames: ["_statesControls"],
          roles: ["action", "actionDark", "success", "successDark", "warning", "warningDark", "error", "errorDark"]
        },
        {
          name: "_ShadesControls",
          oldNames: ["_shadesControls"],
          roles: ["shadesLight", "shadesDark", "shadesPrimary", "shadesSecondary", "shadesTertiary"]
        }
      ];
      for (const group of controlGroups) {
        const controlsCollectionName = group.name;
        let controlsCollection = collections.find((c) => c.name === controlsCollectionName || group.oldNames && group.oldNames.includes(c.name) || normalizePathForMatch(c.name) === normalizePathForMatch(controlsCollectionName));
        if (controlsCollection) {
          if (controlsCollection.name !== controlsCollectionName) controlsCollection.name = controlsCollectionName;
        } else {
          controlsCollection = figma.variables.createVariableCollection(controlsCollectionName);
        }
        const groupRoles = group.roles;
        const controlsModesList = [];
        const roleToModeName = {};
        for (const role of groupRoles) {
          let modeName = role;
          if (role !== "shadesLight" && role !== "shadesDark") {
            if (role.startsWith("shades")) {
              const baseRole = role.replace("shades", "").toLowerCase();
              const seedName = seeds[baseRole] ? seeds[baseRole].name : baseRole;
              modeName = `shades${capitalize(seedName)}`;
            } else {
              modeName = seeds[role] ? seeds[role].name : role;
            }
          }
          const formatted = formatModeName(modeName);
          controlsModesList.push(formatted);
          roleToModeName[role] = formatted;
        }
        const controlsModesMap = ensureCollectionModes(controlsCollection, controlsModesList);
        const controlsModeIds = {};
        for (const role of groupRoles) {
          if (role.startsWith("shades") || seeds[role]) {
            controlsModeIds[role] = controlsModesMap[roleToModeName[role]] || controlsModesMap[role];
          }
        }
        const groupTones = group.name === "_ShadesControls" ? opacitySteps : tones;
        for (const tone of groupTones) {
          const colorVarName = tone.toString();
          let colorVar = ensureVariable(colorVarName, controlsCollection, "COLOR", varLookupMap);
          smartSetVariableMeta(colorVar, {
            description: `Palette tonal step ${tone}. Maps to current mode palette.`,
            hiddenFromPublishing: true,
            scopes: []
          });
          const hexVarName = `${tone}Hex`;
          let hexVar = ensureVariable(hexVarName, controlsCollection, "STRING", varLookupMap, [`${tone} hex`, `${tone}Hex`]);
          smartSetVariableMeta(hexVar, {
            description: `String readout of HEX value for step ${tone}.`,
            hiddenFromPublishing: true,
            scopes: []
          });
          const labelVarName = `${tone}Label`;
          let labelVar = ensureVariable(labelVarName, controlsCollection, "STRING", varLookupMap, [`${tone} label`, `${tone}Label`]);
          smartSetVariableMeta(labelVar, {
            description: `String readout of tone step ${tone}.`,
            hiddenFromPublishing: true,
            scopes: []
          });
          for (const role of groupRoles) {
            if (controlsModeIds[role]) {
              const modeId = controlsModeIds[role];
              const sourceId = createdVariablesMap.get(`${role}/${tone}`) || createdVariablesMap.get(`${toPascalCase3(role)}/${tone}`);
              if (sourceId) {
                smartSetValueForMode(colorVar, modeId, { type: "VARIABLE_ALIAS", id: sourceId });
                trackVariable(controlsCollection.id, colorVarName);
                if (role.startsWith("shades")) {
                  let val;
                  if (role === "shadesLight") {
                    const neutralHex2 = seeds.neutral && seeds.neutral.color ? seeds.neutral.color : "#000000";
                    const neutral5Rgb2 = calculateTone(hexToRgb(neutralHex2), 5);
                    val = { r: neutral5Rgb2.r, g: neutral5Rgb2.g, b: neutral5Rgb2.b, a: tone / 100 };
                  } else if (role === "shadesDark") {
                    val = { r: 1, g: 1, b: 1, a: tone / 100 };
                  } else {
                    const baseRole = role.replace("shades", "").toLowerCase();
                    const hex = seeds[baseRole] && seeds[baseRole].color ? seeds[baseRole].color : "#000000";
                    const baseRgb = hexToRgb(hex);
                    val = { r: baseRgb.r, g: baseRgb.g, b: baseRgb.b, a: tone / 100 };
                  }
                  smartSetValueForMode(hexVar, modeId, rgbaToHex(val.r, val.g, val.b, val.a));
                } else {
                  const hex = seeds[role] && seeds[role].color ? seeds[role].color : "#2979FF";
                  const baseRgb = hexToRgb(hex);
                  const finalColor = calculateTone(baseRgb, tone);
                  smartSetValueForMode(hexVar, modeId, rgbToHex2(finalColor.r, finalColor.g, finalColor.b));
                }
                trackVariable(controlsCollection.id, hexVarName);
                smartSetValueForMode(labelVar, modeId, tone.toString());
                trackVariable(controlsCollection.id, labelVarName);
              }
            }
          }
        }
        const nameVarName = "Name";
        let stringVarName = ensureVariable(nameVarName, controlsCollection, "STRING", varLookupMap, ["name", "Name"]);
        smartSetVariableMeta(stringVarName, {
          hiddenFromPublishing: true,
          scopes: []
        });
        for (const role of groupRoles) {
          if (controlsModeIds[role]) {
            const modeName = roleToModeName[role] || role;
            smartSetValueForMode(stringVarName, controlsModeIds[role], toPascalCase3(modeName));
            trackVariable(controlsCollection.id, nameVarName);
          }
        }
      }
      const schemesMap = /* @__PURE__ */ new Map();
      const genericMapping = {
        base: { light: 50, lightContrast: 35, dark: 50, darkContrast: 70, accessibility: 60 },
        onDefault: { light: 100, lightContrast: 100, dark: 100, darkContrast: 10, accessibility: 0 },
        hover: { light: 60, lightContrast: 45, dark: 65, darkContrast: 85, accessibility: 65 },
        onRaised: { light: 60, lightContrast: 40, dark: 60, darkContrast: 50, accessibility: 70 },
        onDim: { light: 40, lightContrast: 30, dark: 40, darkContrast: 80, accessibility: 60 },
        onSubtle: { light: 50, lightContrast: 30, dark: 50, darkContrast: 60, accessibility: 60 },
        disabled: { light: 90, lightContrast: 80, dark: 30, darkContrast: 35, accessibility: 30 },
        onDisabled: { light: 70, lightContrast: 50, dark: 60, darkContrast: 65, accessibility: 60 }
      };
      const stateMapping = genericMapping;
      const isShapeOnlyHover = buttonHoverPreset === "shape";
      const systemVariablesMapping = [
        // 1. Core Surfaces (Default Background & Base Card)
        { name: "surfaceBackground", oldName: "background", light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/5", darkContrast: "neutral/0", accessibility: "neutral/0" },
        { name: "onSurfaceBackground", oldName: "onBackground", light: "neutral/0", lightContrast: "neutral/0", dark: "neutral/100", darkContrast: "neutral/100", accessibility: "neutral/100" },
        { name: "surface", light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/10", darkContrast: "neutral/15", accessibility: "neutral/5" },
        { name: "onSurface", light: "neutral/10", lightContrast: "neutral/5", dark: "neutral/90", darkContrast: "neutral/100", accessibility: "neutral/100" },
        // 2. Subtle & Secondary Containers (Light: 90 / Dark: 25)
        { name: "surfaceSubtle", oldName: ["surfaceVariant", "canvas"], light: "neutral/90", lightContrast: "neutral/90", dark: "neutral/25", darkContrast: "neutral/30", accessibility: "neutral/30" },
        { name: "onSurfaceSubtle", oldName: ["onSurfaceVariant", "onCanvas"], light: "neutral/30", lightContrast: "neutral/0", dark: "neutral/80", darkContrast: "neutral/90", accessibility: "neutral/90" },
        { name: "onSurfaceSubtleMuted", oldName: ["onSurfaceVariantMuted", "onCanvasVariant"], light: "neutral/50", lightContrast: "neutral/30", dark: "neutral/50", darkContrast: "neutral/60", accessibility: "neutral/60" },
        // 3. Dim & Mid-tone Surfaces (Light: 70 / Dark: 50)
        { name: "surfaceDim", oldName: ["canvasDim"], light: "neutral/70", lightContrast: "neutral/60", dark: "neutral/50", darkContrast: "neutral/60", accessibility: "neutral/60" },
        { name: "onSurfaceDim", light: "neutral/10", lightContrast: "neutral/0", dark: "neutral/98", darkContrast: "neutral/100", accessibility: "neutral/100" },
        // 4. Popout / Floating Surfaces (Light: 70 / Dark: 10, or match surfaceSubtle when shape-only morph hover)
        {
          name: "surfacePopout",
          oldName: ["canvasPopout"],
          light: isShapeOnlyHover ? "neutral/90" : "neutral/70",
          lightContrast: isShapeOnlyHover ? "neutral/90" : "neutral/60",
          dark: isShapeOnlyHover ? "neutral/25" : "neutral/10",
          darkContrast: isShapeOnlyHover ? "neutral/30" : "neutral/10",
          accessibility: isShapeOnlyHover ? "neutral/30" : "neutral/10"
        },
        { name: "onSurfacePopout", light: "neutral/10", lightContrast: "neutral/0", dark: "neutral/90", darkContrast: "neutral/100", accessibility: "neutral/100" },
        // 5. Inactive / Disabled Surfaces (Light: 90 / Dark: 20)
        { name: "surfaceDisabled", light: "neutral/90", lightContrast: "neutral/80", dark: "neutral/20", darkContrast: "neutral/15", accessibility: "neutral/15" },
        { name: "onSurfaceDisabled", light: "neutral/60", lightContrast: "neutral/40", dark: "neutral/40", darkContrast: "neutral/50", accessibility: "neutral/50" },
        { name: "onSurfaceDisabledMuted", light: "neutral/80", lightContrast: "neutral/55", dark: "neutral/45", darkContrast: "neutral/75", accessibility: "accessibility/60" },
        // 6. Inverted / High-Contrast Surfaces (Light: Dark tones / Dark: Light tones)
        // 6A. Strong Inverted Surface (Light: Neutral/10 -> Dark: Neutral/95)
        { name: "surfaceInverse", light: "neutral/10", lightContrast: "neutral/5", dark: "neutral/95", darkContrast: "neutral/100", accessibility: "neutral/100" },
        { name: "onSurfaceInverse", light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/10", darkContrast: "neutral/0", accessibility: "neutral/0" },
        // 6B. Subtle Inverted Surface (Light: 15 / Dark: 90)
        { name: "surfaceInverseSubtle", oldName: ["surfaceContrast", "canvasContrast"], light: "neutral/15", lightContrast: "neutral/15", dark: "neutral/90", darkContrast: "neutral/90", accessibility: "neutral/90" },
        { name: "onSurfaceInverseSubtle", oldName: ["onSurfaceContrast", "onCanvasContrast"], light: "neutral/98", lightContrast: "neutral/100", dark: "neutral/15", darkContrast: "neutral/0", accessibility: "neutral/0" },
        // 7. Constant / Static Surfaces (Theme-independent)
        { name: "surfaceDark", oldName: ["surfaceDark", "surfaceStaticDark"], light: "neutral/5", lightContrast: "neutral/0", dark: "neutral/5", darkContrast: "neutral/0", accessibility: "neutral/0" },
        { name: "onSurfaceDark", oldName: ["onSurfaceDark", "onSurfaceStaticDark"], light: "neutral/90", lightContrast: "neutral/98", dark: "neutral/90", darkContrast: "neutral/98", accessibility: "neutral/100" },
        { name: "onSurfaceDarkWhite", oldName: ["onSurfaceDarkWhite", "onSurfaceDarkBright"], light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/100", darkContrast: "neutral/100", accessibility: "neutral/100" },
        { name: "surfaceBright", oldName: ["surfaceLow", "surfaceMax", "layerLow", "layerLower", "layerMax", "canvasMax"], light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/100", darkContrast: "neutral/100", accessibility: "neutral/100" },
        { name: "onSurfaceBright", light: "neutral/10", lightContrast: "neutral/5", dark: "neutral/10", darkContrast: "neutral/5", accessibility: "neutral/5" },
        // 8. Layer Elevation Scale (canvas -> surface -> layer scale)
        { name: "layerLowest", oldName: ["surfaceLowest", "canvasSunken"], light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/5", darkContrast: "neutral/0", accessibility: "neutral/0" },
        { name: "layerLower", oldName: ["surfaceLower"], light: "neutral/98", lightContrast: "neutral/95", dark: "neutral/10", darkContrast: "neutral/5", accessibility: "neutral/5" },
        { name: "layerLow", oldName: ["surfaceLow", "surfaceBase", "canvasDefault"], light: "neutral/95", lightContrast: "neutral/90", dark: "neutral/25", darkContrast: "neutral/30", accessibility: "neutral/30" },
        { name: "layerBase", oldName: ["surfaceBase", "surfaceHigh", "canvasSubtle"], light: "neutral/90", lightContrast: "neutral/80", dark: "neutral/25", darkContrast: "neutral/25", accessibility: "neutral/25" },
        { name: "layerHigh", oldName: ["surfaceHigh", "surfaceHigher", "canvasSurface"], light: "neutral/80", lightContrast: "neutral/70", dark: "neutral/25", darkContrast: "neutral/20", accessibility: "neutral/20" },
        { name: "layerHigher", oldName: ["surfaceHigher", "surfaceHighest", "canvasRaised"], light: "neutral/75", lightContrast: "neutral/65", dark: "neutral/20", darkContrast: "neutral/15", accessibility: "neutral/15" },
        { name: "layerHighest", oldName: ["surfaceHighest", "canvasOverlay"], light: "neutral/70", lightContrast: "neutral/60", dark: "neutral/15", darkContrast: "neutral/10", accessibility: "neutral/10" },
        { name: "layerMax", oldName: ["surfaceMax"], light: "neutral/65", lightContrast: "neutral/55", dark: "neutral/10", darkContrast: "neutral/5", accessibility: "neutral/5" },
        //outline
        { name: "outlineLowest", light: "neutral/100", lightContrast: "neutral/100", dark: "neutral/5", darkContrast: "neutral/0", accessibility: "accessibility/60" },
        { name: "outlineSubtle", oldName: ["outlineExtraLow"], light: "neutral/90", lightContrast: "neutral/80", dark: "neutral/25", darkContrast: "neutral/35", accessibility: "accessibility/60" },
        { name: "outlineLower", light: "neutral/80", lightContrast: "neutral/55", dark: "neutral/45", darkContrast: "neutral/75", accessibility: "accessibility/60" },
        { name: "outlineLow", light: "neutral/75", lightContrast: "neutral/50", dark: "neutral/30", darkContrast: "neutral/40", accessibility: "accessibility/60" },
        { name: "outlineBase", light: "neutral/70", lightContrast: "neutral/50", dark: "neutral/40", darkContrast: "neutral/70", accessibility: "accessibility/60" },
        { name: "outlineHigh", light: "neutral/65", lightContrast: "neutral/35", dark: "neutral/45", darkContrast: "neutral/85", accessibility: "accessibility/60" },
        { name: "outlineHigher", light: "neutral/60", lightContrast: "neutral/15", dark: "neutral/50", darkContrast: "neutral/95", accessibility: "accessibility/60" },
        { name: "outlineHighest", light: "neutral/50", lightContrast: "neutral/10", dark: "neutral/60", darkContrast: "neutral/100", accessibility: "accessibility/60" },
        { name: "outlineMax", light: "neutral/40", lightContrast: "neutral/5", dark: "neutral/70", darkContrast: "neutral/100", accessibility: "accessibility/60" },
        //focus
        { name: "focusErrorBase", light: "error/60", lightContrast: "error/40", dark: "error/70", darkContrast: "error/50", accessibility: "error/50" },
        { name: "focusErrorLow", light: "error/80", lightContrast: "error/70", dark: "error/25", darkContrast: "error/35", accessibility: "error/35" },
        { name: "focusBase", light: "neutral/65", lightContrast: "neutral/65", dark: "neutral/20", darkContrast: "neutral/20", accessibility: "warning/50" },
        { name: "focusLow", light: "neutral/80", lightContrast: "neutral/80", dark: "neutral/40", darkContrast: "neutral/40", accessibility: "warning/30" }
      ];
      const semanticShadesMapping = [
        { name: "elevationLowest", oldName: ["shadowLowest"], light: "shadesLight/3", lightContrast: "shadesLight/10", dark: "shadesLight/15", darkContrast: "shadesLight/35", accessibility: "shadesLight/0" },
        { name: "elevationLower", oldName: ["shadowLower"], light: "shadesLight/6", lightContrast: "shadesLight/15", dark: "shadesLight/20", darkContrast: "shadesLight/40", accessibility: "shadesLight/0" },
        { name: "elevationLow", oldName: ["shadowLow", "shadowBase"], light: "shadesLight/10", lightContrast: "shadesLight/20", dark: "shadesLight/25", darkContrast: "shadesLight/45", accessibility: "shadesLight/0" },
        { name: "elevationBase", oldName: ["shadowBase", "shadowHigh"], light: "shadesLight/14", lightContrast: "shadesLight/25", dark: "shadesLight/30", darkContrast: "shadesLight/50", accessibility: "shadesLight/0" },
        { name: "elevationHigh", oldName: ["shadowHigh", "shadowHigher"], light: "shadesLight/18", lightContrast: "shadesLight/30", dark: "shadesLight/35", darkContrast: "shadesLight/55", accessibility: "shadesLight/0" },
        { name: "elevationHigher", oldName: ["shadowHigher", "shadowHighest"], light: "shadesLight/22", lightContrast: "shadesLight/35", dark: "shadesLight/40", darkContrast: "shadesLight/60", accessibility: "shadesLight/0" },
        { name: "elevationHighest", oldName: ["shadowHighest"], light: "shadesLight/30", lightContrast: "shadesLight/40", dark: "shadesLight/45", darkContrast: "shadesLight/70", accessibility: "shadesLight/0" },
        { name: "elevationMax", oldName: ["shadowMax"], light: "shadesLight/40", lightContrast: "shadesLight/50", dark: "shadesLight/50", darkContrast: "shadesLight/80", accessibility: "shadesLight/0" },
        // elevationInverse
        { name: "elevationInverseLowest", light: "shadesLight/3", lightContrast: "shadesLight/10", dark: "shadesDark/15", darkContrast: "shadesDark/35", accessibility: "shadesLight/0" },
        { name: "elevationInverseLower", light: "shadesLight/6", lightContrast: "shadesLight/15", dark: "shadesDark/20", darkContrast: "shadesDark/40", accessibility: "shadesLight/0" },
        { name: "elevationInverseLow", light: "shadesLight/10", lightContrast: "shadesLight/20", dark: "shadesDark/25", darkContrast: "shadesDark/45", accessibility: "shadesLight/0" },
        { name: "elevationInverseBase", light: "shadesLight/14", lightContrast: "shadesLight/25", dark: "shadesDark/30", darkContrast: "shadesDark/50", accessibility: "shadesLight/0" },
        { name: "elevationInverseHigh", light: "shadesLight/18", lightContrast: "shadesLight/30", dark: "shadesDark/35", darkContrast: "shadesDark/55", accessibility: "shadesLight/0" },
        { name: "elevationInverseHigher", light: "shadesLight/22", lightContrast: "shadesLight/35", dark: "shadesDark/40", darkContrast: "shadesDark/60", accessibility: "shadesLight/0" },
        { name: "elevationInverseHighest", light: "shadesLight/30", lightContrast: "shadesLight/40", dark: "shadesDark/45", darkContrast: "shadesDark/70", accessibility: "shadesLight/0" },
        { name: "elevationInverseMax", light: "shadesLight/40", lightContrast: "shadesLight/50", dark: "shadesDark/50", darkContrast: "shadesDark/80", accessibility: "shadesLight/0" },
        // Highlights (unified 5% to 65% scale from Lowest to Max)
        { name: "highlightLowest", oldName: ["highlightSubtleLowest", "highlightSubtle5"], light: "shadesDark/5", lightContrast: "shadesDark/15", dark: "shadesLight/3", darkContrast: "shadesLight/6", accessibility: "shadesLight/6" },
        { name: "highlightUltraLow", oldName: ["highlightSubtleLower", "highlightSubtle10"], light: "shadesDark/10", lightContrast: "shadesDark/20", dark: "shadesLight/3", darkContrast: "shadesLight/8", accessibility: "shadesLight/8" },
        { name: "highlightExtraLow", oldName: ["highlightSubtleLow", "highlightSubtle15"], light: "shadesDark/15", lightContrast: "shadesDark/25", dark: "shadesLight/4", darkContrast: "shadesLight/12", accessibility: "shadesLight/12" },
        { name: "highlightVeryLow", oldName: ["highlightSubtleBase", "highlightSubtle20"], light: "shadesDark/20", lightContrast: "shadesDark/30", dark: "shadesLight/6", darkContrast: "shadesLight/14", accessibility: "shadesLight/14" },
        { name: "highlightLower", oldName: ["highlightSubtleHigh", "highlightSubtle25"], light: "shadesDark/25", lightContrast: "shadesDark/35", dark: "shadesLight/8", darkContrast: "shadesLight/18", accessibility: "shadesLight/18" },
        { name: "highlightLow", oldName: ["highlightLowest"], light: "shadesDark/30", lightContrast: "shadesDark/40", dark: "shadesLight/10", darkContrast: "shadesLight/20", accessibility: "shadesLight/20" },
        { name: "highlightBase", oldName: ["highlightLower"], light: "shadesDark/35", lightContrast: "shadesDark/45", dark: "shadesLight/15", darkContrast: "shadesLight/25", accessibility: "shadesLight/25" },
        { name: "highlightHigh", oldName: ["highlightLow"], light: "shadesDark/40", lightContrast: "shadesDark/50", dark: "shadesLight/20", darkContrast: "shadesLight/30", accessibility: "shadesLight/30" },
        { name: "highlightHigher", oldName: ["highlightBase"], light: "shadesDark/45", lightContrast: "shadesDark/55", dark: "shadesLight/25", darkContrast: "shadesLight/35", accessibility: "shadesLight/35" },
        { name: "highlightVeryHigh", oldName: ["highlightHigh"], light: "shadesDark/50", lightContrast: "shadesDark/60", dark: "shadesLight/30", darkContrast: "shadesLight/40", accessibility: "shadesLight/40" },
        { name: "highlightExtraHigh", oldName: ["highlightHigher"], light: "shadesDark/55", lightContrast: "shadesDark/65", dark: "shadesLight/35", darkContrast: "shadesLight/45", accessibility: "shadesLight/45" },
        { name: "highlightHighest", oldName: ["highlightHighest"], light: "shadesDark/60", lightContrast: "shadesDark/70", dark: "shadesLight/40", darkContrast: "shadesLight/50", accessibility: "shadesLight/50" },
        { name: "highlightMax", oldName: ["highlightMax"], light: "shadesDark/65", lightContrast: "shadesDark/75", dark: "shadesLight/45", darkContrast: "shadesLight/55", accessibility: "shadesLight/55" }
      ];
      const schemeCollectionName = "Schemes";
      let schemeCollection = collections.find((c) => c.name === schemeCollectionName || c.name === "schemes" || normalizePathForMatch(c.name) === "schemes");
      if (schemeCollection) {
        if (schemeCollection.name !== schemeCollectionName) schemeCollection.name = schemeCollectionName;
      } else {
        schemeCollection = figma.variables.createVariableCollection(schemeCollectionName);
      }
      const schemeModesMap = ensureCollectionModes(schemeCollection, ["Light", "LightContrast", "Dark", "DarkContrast", "Accessibility"]);
      const modeIds = {
        light: schemeModesMap["Light"] || schemeModesMap["light"],
        lightContrast: schemeModesMap["LightContrast"] || schemeModesMap["lightContrast"],
        dark: schemeModesMap["Dark"] || schemeModesMap["dark"],
        darkContrast: schemeModesMap["DarkContrast"] || schemeModesMap["darkContrast"],
        accessibility: schemeModesMap["Accessibility"] || schemeModesMap["accessibility"]
      };
      const setScopes = (variable, name) => {
        const parts = name.split("/");
        const leaf = parts[parts.length - 1].toLowerCase();
        const lower = name.toLowerCase();
        if (leaf.startsWith("outline") || lower.startsWith("outline")) variable.scopes = ["STROKE_COLOR"];
        else if (leaf.startsWith("focus") || lower.startsWith("focus")) variable.scopes = ["STROKE_COLOR"];
        else if (leaf.startsWith("on") || lower.startsWith("on")) variable.scopes = ["SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"];
        else if (leaf.startsWith("elevation") || leaf.startsWith("shadow") || leaf.startsWith("highlight") || lower.startsWith("elevation") || lower.startsWith("shadow") || lower.startsWith("highlight")) variable.scopes = ["ALL_SCOPES"];
        else variable.scopes = ["FRAME_FILL"];
      };
      const createdUserTokens = [];
      const createdSystemTokens = [];
      const createdShadeTokens = [];
      const schemeRoles = ["primary", "secondary", "tertiary", "action", "success", "warning", "error"];
      for (const role of schemeRoles) {
        if (!seeds[role]) continue;
        const customName = seeds[role].name;
        const pascalCustomName = toPascalCase3(customName);
        const capitalizedName = capitalize(customName);
        const isState = ["action", "success", "warning", "error"].includes(role);
        const mapping = genericMapping;
        let isLightRole = false;
        let baseRules = { ...mapping.base };
        let accessibleBaseLight = mapping.base.light;
        let darkBaseTone = mapping.base.dark;
        let isWcagAdjusted = false;
        const seedRgb = hexToRgb(seeds[role].color);
        const neutralHex2 = seeds.neutral && seeds.neutral.color ? seeds.neutral.color : "#000000";
        const neutralRgb = hexToRgb(neutralHex2);
        const darkRoleName = getDarkRoleName(role, seeds);
        const darkSeedRgb = seeds[darkRoleName] && seeds[darkRoleName].color ? hexToRgb(seeds[darkRoleName].color) : seedRgb;
        if (seeds[role] && seeds[role].color) {
          darkBaseTone = findAccessibleDarkBaseTone(seedRgb, neutralRgb, mapping.base.dark);
          isLightRole = isLightColorRole(seedRgb);
          if (isLightRole) {
            baseRules = { light: 50, lightContrast: 45, dark: darkBaseTone || 50, darkContrast: 70, accessibility: 60 };
            isWcagAdjusted = true;
          } else {
            accessibleBaseLight = findAccessibleLightBaseTone(seedRgb, mapping.base.light);
            const lightContrastTone = Math.min(35, accessibleBaseLight - 10);
            baseRules = { ...mapping.base, light: accessibleBaseLight, lightContrast: lightContrastTone, dark: darkBaseTone };
            if (accessibleBaseLight !== mapping.base.light || darkBaseTone !== null && darkBaseTone !== mapping.base.dark) {
              isWcagAdjusted = true;
            }
          }
        }
        const darkRules = isLightRole ? {
          light: 35,
          lightContrast: 25,
          dark: Math.max(15, (darkBaseTone || 50) - 15),
          darkContrast: 30,
          accessibility: 35
        } : {
          light: Math.max(10, accessibleBaseLight - 10),
          lightContrast: Math.max(5, accessibleBaseLight - 15),
          dark: Math.max(15, (darkBaseTone || 50) - 10),
          darkContrast: 30,
          accessibility: 35
        };
        const lightRules = isLightRole ? {
          light: 85,
          lightContrast: 95,
          dark: Math.min(90, (darkBaseTone || 50) + 15),
          darkContrast: 80,
          accessibility: 70
        } : {
          light: Math.min(85, accessibleBaseLight + 10),
          lightContrast: Math.min(95, accessibleBaseLight + 20),
          dark: Math.min(85, (darkBaseTone || 50) + 10),
          darkContrast: 80,
          accessibility: 70
        };
        const hoverRules = isShapeOnlyHover ? baseRules : isLightRole ? {
          light: 45,
          lightContrast: 40,
          dark: Math.min(90, (darkBaseTone || 50) + 10),
          darkContrast: 85,
          accessibility: 65
        } : mapping.hover;
        const disabledRules = isLightRole ? {
          light: 90,
          lightContrast: 85,
          dark: 25,
          darkContrast: 20,
          accessibility: 20
        } : mapping.disabled;
        const onDefaultRules = {
          light: findAccessibleOnTone(seedRgb, baseRules.light, isLightRole ? 20 : 100, 4.5),
          lightContrast: findAccessibleOnTone(seedRgb, baseRules.lightContrast, isLightRole ? 10 : 100, 7),
          dark: findAccessibleOnTone(darkSeedRgb, baseRules.dark, isLightRole ? 20 : 100, 4.5),
          darkContrast: findAccessibleOnTone(darkSeedRgb, baseRules.darkContrast, isLightRole ? 0 : 10, 7),
          accessibility: findAccessibleOnTone(darkSeedRgb, baseRules.accessibility, 0, 7)
        };
        const onDimRules = isLightRole ? {
          light: 30,
          lightContrast: 15,
          dark: 30,
          darkContrast: 10,
          accessibility: 10
        } : mapping.onDim;
        const onSubtleRules = isLightRole ? {
          light: 35,
          lightContrast: 20,
          dark: 35,
          darkContrast: 20,
          accessibility: 20
        } : mapping.onSubtle;
        const onRaisedRules = isLightRole ? {
          light: 40,
          lightContrast: 25,
          dark: 40,
          darkContrast: 30,
          accessibility: 30
        } : mapping.onRaised;
        const onDisabledRules = isLightRole ? {
          light: 35,
          lightContrast: 25,
          dark: 65,
          darkContrast: 75,
          accessibility: 85
        } : mapping.onDisabled;
        const paleRules = {
          light: 98,
          lightContrast: 90,
          dark: 20,
          darkContrast: 25,
          accessibility: 25
        };
        const subtleRules = isLightRole ? {
          light: 95,
          lightContrast: 88,
          dark: 22,
          darkContrast: 22,
          accessibility: 22
        } : {
          light: 95,
          lightContrast: 85,
          dark: 25,
          darkContrast: 30,
          accessibility: 25
        };
        const tokensToCreate = isState ? [
          { name: `${pascalCustomName}Default`, oldName: [`${customName}Default`, customName, pascalCustomName], rules: baseRules },
          { name: `${pascalCustomName}Dark`, oldName: [`${customName}Dark`, `${pascalCustomName}Dark`, `${customName}DefaultDark`, `${pascalCustomName}DefaultDark`], rules: darkRules, description: `Deepened ${pascalCustomName} shade for active/pressed states and high-contrast accents.` },
          { name: `${pascalCustomName}Light`, oldName: [`${customName}Light`, `${pascalCustomName}Light`, `${customName}DefaultLight`, `${pascalCustomName}DefaultLight`], rules: lightRules, description: `Lightened ${pascalCustomName} tint for highlights, badges and decorative surfaces.` },
          { name: `${pascalCustomName}Pale`, oldName: [`${customName}Pale`, `${pascalCustomName}Pale`, `${customName}UltraLight`, `${pascalCustomName}UltraLight`], rules: paleRules, description: `Ultra-light ${pascalCustomName} tint (tone 98) for subtle alert/badge backgrounds and containers.` },
          { name: `${pascalCustomName}Subtle`, oldName: [`${customName}Subtle`, `${pascalCustomName}Subtle`, `${customName}Solid`, `${pascalCustomName}Solid`], rules: subtleRules, description: `Subtle tonal tint (${pascalCustomName} tone 95) between disabled and pale for container backgrounds.` },
          { name: `On${pascalCustomName}Default`, oldName: `on${capitalizedName}Default`, rules: onDefaultRules },
          { name: `On${pascalCustomName}Dim`, oldName: `on${capitalizedName}Dim`, rules: onDimRules },
          { name: `On${pascalCustomName}Subtle`, oldName: `on${capitalizedName}Subtle`, rules: onSubtleRules },
          { name: `On${pascalCustomName}Raised`, oldName: `on${capitalizedName}Raised`, rules: onRaisedRules },
          { name: `${pascalCustomName}Hover`, oldName: `${customName}Hover`, rules: hoverRules },
          { name: `${pascalCustomName}Disabled`, oldName: `${customName}Disabled`, rules: disabledRules },
          { name: `On${pascalCustomName}Disabled`, oldName: `on${capitalizedName}Disabled`, rules: onDisabledRules }
        ] : [
          { name: pascalCustomName, oldName: customName, rules: baseRules },
          { name: `${pascalCustomName}Dark`, oldName: [`${customName}Dark`, `${pascalCustomName}Dark`], rules: darkRules, description: `Deepened ${pascalCustomName} shade for active/pressed states and high-contrast accents.` },
          { name: `${pascalCustomName}Light`, oldName: [`${customName}Light`, `${pascalCustomName}Light`], rules: lightRules, description: `Lightened ${pascalCustomName} tint for highlights, badges and decorative surfaces.` },
          { name: `${pascalCustomName}Pale`, oldName: [`${customName}Pale`, `${pascalCustomName}Pale`, `${customName}UltraLight`, `${pascalCustomName}UltraLight`], rules: paleRules, description: `Ultra-light ${pascalCustomName} tint (tone 98) for subtle backgrounds, containers, and badges.` },
          { name: `On${pascalCustomName}Default`, oldName: `on${capitalizedName}Default`, rules: onDefaultRules },
          { name: `${pascalCustomName}Hover`, oldName: `${customName}Hover`, rules: hoverRules },
          { name: `On${pascalCustomName}Raised`, oldName: `on${capitalizedName}Raised`, rules: onRaisedRules },
          { name: `On${pascalCustomName}Dim`, oldName: `on${capitalizedName}Dim`, rules: onDimRules },
          { name: `On${pascalCustomName}Subtle`, oldName: `on${capitalizedName}Subtle`, rules: onSubtleRules },
          { name: `On${pascalCustomName}Disabled`, oldName: `on${capitalizedName}Disabled`, rules: onDisabledRules },
          { name: `${pascalCustomName}Disabled`, oldName: `${customName}Disabled`, rules: disabledRules }
        ];
        const unadjustedBaseRules = genericMapping.base;
        const unadjustedDarkRules = {
          light: Math.max(10, genericMapping.base.light - 10),
          lightContrast: Math.max(5, genericMapping.base.light - 15),
          dark: Math.max(15, genericMapping.base.dark - 10),
          darkContrast: 30,
          accessibility: 35
        };
        const unadjustedLightRules = {
          light: Math.min(85, genericMapping.base.light + 10),
          lightContrast: Math.min(95, genericMapping.base.light + 20),
          dark: Math.min(85, genericMapping.base.dark + 10),
          darkContrast: 80,
          accessibility: 70
        };
        const unadjustedHoverRules = isShapeOnlyHover ? unadjustedBaseRules : genericMapping.hover;
        const unadjustedDisabledRules = genericMapping.disabled;
        const unadjustedSubtleRules = {
          light: 95,
          lightContrast: 85,
          dark: 25,
          darkContrast: 30,
          accessibility: 25
        };
        const unadjustedOnDefaultRules = genericMapping.onDefault;
        const unadjustedOnDimRules = genericMapping.onDim;
        const unadjustedOnSubtleRules = genericMapping.onSubtle;
        const unadjustedOnRaisedRules = genericMapping.onRaised;
        const unadjustedOnDisabledRules = genericMapping.onDisabled;
        const tokensConfigForFallback = isState ? [
          { name: `${pascalCustomName}Default`, rules: baseRules, unadjusted: unadjustedBaseRules },
          { name: `${pascalCustomName}Dark`, rules: darkRules, unadjusted: unadjustedDarkRules },
          { name: `${pascalCustomName}Light`, rules: lightRules, unadjusted: unadjustedLightRules },
          { name: `${pascalCustomName}Pale`, rules: paleRules, unadjusted: paleRules },
          { name: `${pascalCustomName}Subtle`, rules: subtleRules, unadjusted: unadjustedSubtleRules },
          { name: `On${pascalCustomName}Default`, rules: onDefaultRules, unadjusted: unadjustedOnDefaultRules },
          { name: `${pascalCustomName}Hover`, rules: hoverRules, unadjusted: unadjustedHoverRules },
          { name: `On${pascalCustomName}Raised`, rules: onRaisedRules, unadjusted: unadjustedOnRaisedRules },
          { name: `On${pascalCustomName}Dim`, rules: onDimRules, unadjusted: unadjustedOnDimRules },
          { name: `On${pascalCustomName}Subtle`, rules: onSubtleRules, unadjusted: unadjustedOnSubtleRules },
          { name: `On${pascalCustomName}Disabled`, rules: onDisabledRules, unadjusted: unadjustedOnDisabledRules },
          { name: `${pascalCustomName}Disabled`, rules: disabledRules, unadjusted: unadjustedDisabledRules }
        ] : [
          { name: pascalCustomName, rules: baseRules, unadjusted: unadjustedBaseRules },
          { name: `${pascalCustomName}Dark`, rules: darkRules, unadjusted: unadjustedDarkRules },
          { name: `${pascalCustomName}Light`, rules: lightRules, unadjusted: unadjustedLightRules },
          { name: `${pascalCustomName}Pale`, rules: paleRules, unadjusted: paleRules },
          { name: `On${pascalCustomName}Default`, rules: onDefaultRules, unadjusted: unadjustedOnDefaultRules },
          { name: `${pascalCustomName}Hover`, rules: hoverRules, unadjusted: unadjustedHoverRules },
          { name: `On${pascalCustomName}Raised`, rules: onRaisedRules, unadjusted: unadjustedOnRaisedRules },
          { name: `On${pascalCustomName}Dim`, rules: onDimRules, unadjusted: unadjustedOnDimRules },
          { name: `On${pascalCustomName}Subtle`, rules: onSubtleRules, unadjusted: unadjustedOnSubtleRules },
          { name: `On${pascalCustomName}Disabled`, rules: onDisabledRules, unadjusted: unadjustedOnDisabledRules },
          { name: `${pascalCustomName}Disabled`, rules: disabledRules, unadjusted: unadjustedDisabledRules }
        ];
        for (const item of tokensConfigForFallback) {
          const isChangedForWcag = item.rules.light !== item.unadjusted.light || item.rules.dark !== item.unadjusted.dark;
          if (isChangedForWcag) {
            const fallbackLeafName = item.name.endsWith("Fallback") ? item.name : `${item.name}Fallback`;
            tokensToCreate.push({
              name: `Fallback/${fallbackLeafName}`,
              oldName: [
                `fallback/${item.name}`,
                `Fallback/${item.name}`,
                `fallback/${item.name.toLowerCase()}`,
                `fallback/${fallbackLeafName}`,
                `Fallback/${fallbackLeafName}`,
                `fallback/${fallbackLeafName.toLowerCase()}`
              ],
              rules: item.unadjusted,
              description: `Fallback unadjusted ${item.name} token (without WCAG recalculation).`
            });
          }
        }
        const isStateRole2 = ["action", "success", "warning", "error"].includes(role);
        const groupName = isStateRole2 ? "States" : "Default";
        for (const token of tokensToCreate) {
          const fullVarName = `${groupName}/${token.name}`;
          const oldNames = token.oldName ? Array.isArray(token.oldName) ? [...token.oldName, token.name] : [token.oldName, token.name] : [token.name];
          let semanticVar = ensureVariable(fullVarName, schemeCollection, "COLOR", varLookupMap, oldNames);
          smartSetVariableMeta(semanticVar, {
            description: token.description || `Semantic color token: ${fullVarName}.`
          });
          setScopes(semanticVar, token.name.toLowerCase());
          schemesMap.set(fullVarName, semanticVar.id);
          schemesMap.set(fullVarName.toLowerCase(), semanticVar.id);
          schemesMap.set(token.name, semanticVar.id);
          schemesMap.set(token.name.toLowerCase(), semanticVar.id);
          schemesMap.set(token.name.charAt(0).toLowerCase() + token.name.slice(1), semanticVar.id);
          if (token.name.endsWith("Default")) {
            const baseName = token.name.replace(/Default$/, "");
            schemesMap.set(`${groupName}/${baseName}`, semanticVar.id);
            schemesMap.set(baseName, semanticVar.id);
            schemesMap.set(baseName.toLowerCase(), semanticVar.id);
            schemesMap.set(baseName.charAt(0).toLowerCase() + baseName.slice(1), semanticVar.id);
          }
          if (token.name.endsWith("Pale")) {
            const ultraName = token.name.replace(/Pale$/, "UltraLight");
            schemesMap.set(`${groupName}/${ultraName}`, semanticVar.id);
            schemesMap.set(ultraName, semanticVar.id);
            schemesMap.set(ultraName.toLowerCase(), semanticVar.id);
            schemesMap.set(ultraName.charAt(0).toLowerCase() + ultraName.slice(1), semanticVar.id);
          }
          if (token.oldName) {
            const oldList = Array.isArray(token.oldName) ? token.oldName : [token.oldName];
            for (const on of oldList) {
              schemesMap.set(on, semanticVar.id);
              schemesMap.set(`${groupName}/${on}`, semanticVar.id);
            }
          }
          const assignAlias = (modeId, toneValue, isAccessibility = false, darkContrastTone = null, useDarkRole = false) => {
            if (modeId) {
              let targetRole = role;
              let finalTone = toneValue;
              const isAccessRole = ["primary", "secondary", "tertiary"].includes(role);
              const accessRoleName = seeds.accessibility ? seeds.accessibility.name : "accessibility";
              const isFallbackToken = token.name.toLowerCase().includes("fallback");
              if (isAccessibility && isAccessRole && !isFallbackToken) {
                targetRole = accessRoleName;
              } else if (useDarkRole && ["action", "success", "warning", "error"].includes(role)) {
                targetRole = getDarkRoleName(role, seeds);
              } else if (isAccessibility && ["action", "success", "warning", "error"].includes(role)) {
                targetRole = getDarkRoleName(role, seeds);
              }
              const mapKey = `${targetRole}/${finalTone}`;
              let targetId = createdVariablesMap.get(mapKey);
              if (!targetId) targetId = createdVariablesMap.get(`${toPascalCase3(targetRole)}/${finalTone}`);
              if (targetId) smartSetValueForMode(semanticVar, modeId, { type: "VARIABLE_ALIAS", id: targetId });
              return { role: targetRole, tone: finalTone };
            }
            return null;
          };
          const pathLight = assignAlias(modeIds.light, token.rules.light);
          const pathLightC = assignAlias(modeIds.lightContrast, token.rules.lightContrast);
          const pathDark = assignAlias(modeIds.dark, token.rules.dark, false, null, true);
          const pathDarkC = assignAlias(modeIds.darkContrast, token.rules.darkContrast, false, null, true);
          const pathAccessibility = assignAlias(modeIds.accessibility, token.rules.accessibility, true, token.rules.darkContrast, true);
          trackVariable(schemeCollection.id, fullVarName);
          createdUserTokens.push({ name: fullVarName, light: pathLight, lightC: pathLightC, dark: pathDark, darkC: pathDarkC, accessibility: pathAccessibility });
        }
      }
      if (customColors && Array.isArray(customColors) && customColors.length > 0) {
        for (const cc of customColors) {
          const customName = (cc.name || "custom").trim();
          if (!customName || !cc.color) continue;
          const pascalCustomName = toPascalCase3(customName);
          const capitalizedName = capitalize(customName);
          const hex = cc.color;
          const baseRgb = hexToRgb(hex);
          const neutralHex2 = seeds.neutral && seeds.neutral.color ? seeds.neutral.color : "#000000";
          const neutralRgb = hexToRgb(neutralHex2);
          const darkBaseTone = findAccessibleDarkBaseTone(baseRgb, neutralRgb, genericMapping.base.dark);
          const isLightRole = isLightColorRole(baseRgb);
          const accessibleBaseLight = isLightRole ? 50 : findAccessibleLightBaseTone(baseRgb, genericMapping.base.light);
          const baseRules = isLightRole ? { light: 50, lightContrast: 45, dark: darkBaseTone || 50, darkContrast: 70, accessibility: 60 } : { ...genericMapping.base, light: accessibleBaseLight, lightContrast: Math.min(35, accessibleBaseLight - 10), dark: darkBaseTone };
          const isWcagAdjusted = isLightRole || accessibleBaseLight !== genericMapping.base.light || darkBaseTone !== null && darkBaseTone !== genericMapping.base.dark;
          const darkRules = isLightRole ? {
            light: 35,
            lightContrast: 25,
            dark: Math.max(15, (darkBaseTone || 50) - 15),
            darkContrast: 30,
            accessibility: 35
          } : {
            light: Math.max(10, accessibleBaseLight - 10),
            lightContrast: Math.max(5, accessibleBaseLight - 15),
            dark: Math.max(15, (darkBaseTone || 50) - 10),
            darkContrast: 30,
            accessibility: 35
          };
          const lightRules = isLightRole ? {
            light: 85,
            lightContrast: 95,
            dark: Math.min(90, (darkBaseTone || 50) + 15),
            darkContrast: 80,
            accessibility: 70
          } : {
            light: Math.min(85, accessibleBaseLight + 10),
            lightContrast: Math.min(95, accessibleBaseLight + 20),
            dark: Math.min(85, (darkBaseTone || 50) + 10),
            darkContrast: 80,
            accessibility: 70
          };
          const hoverRules = isShapeOnlyHover ? baseRules : isLightRole ? {
            light: 45,
            lightContrast: 40,
            dark: Math.min(90, (darkBaseTone || 50) + 10),
            darkContrast: 85,
            accessibility: 65
          } : genericMapping.hover;
          const disabledRules = isLightRole ? {
            light: 90,
            lightContrast: 85,
            dark: 25,
            darkContrast: 20,
            accessibility: 20
          } : genericMapping.disabled;
          const onDefaultRules = {
            light: findAccessibleOnTone(baseRgb, baseRules.light, isLightRole ? 20 : 100, 4.5),
            lightContrast: findAccessibleOnTone(baseRgb, baseRules.lightContrast, isLightRole ? 10 : 100, 7),
            dark: findAccessibleOnTone(baseRgb, baseRules.dark, isLightRole ? 20 : 100, 4.5),
            darkContrast: findAccessibleOnTone(baseRgb, baseRules.darkContrast, isLightRole ? 0 : 10, 7),
            accessibility: findAccessibleOnTone(baseRgb, baseRules.accessibility, 0, 7)
          };
          const onDimRules = isLightRole ? {
            light: 30,
            lightContrast: 15,
            dark: 30,
            darkContrast: 10,
            accessibility: 10
          } : genericMapping.onDim;
          const onSubtleRules = isLightRole ? {
            light: 35,
            lightContrast: 20,
            dark: 35,
            darkContrast: 20,
            accessibility: 20
          } : genericMapping.onSubtle;
          const onRaisedRules = isLightRole ? {
            light: 40,
            lightContrast: 25,
            dark: 40,
            darkContrast: 30,
            accessibility: 30
          } : genericMapping.onRaised;
          const onDisabledRules = isLightRole ? {
            light: 35,
            lightContrast: 25,
            dark: 65,
            darkContrast: 75,
            accessibility: 85
          } : genericMapping.onDisabled;
          const paleRules = {
            light: 98,
            lightContrast: 90,
            dark: 20,
            darkContrast: 25,
            accessibility: 25
          };
          const subtleRules = isLightRole ? {
            light: 95,
            lightContrast: 88,
            dark: 22,
            darkContrast: 22,
            accessibility: 22
          } : {
            light: 95,
            lightContrast: 85,
            dark: 25,
            darkContrast: 30,
            accessibility: 25
          };
          const customTokensToCreate = [
            { name: pascalCustomName, oldName: customName, rules: baseRules },
            { name: `${pascalCustomName}Dark`, oldName: [`${customName}Dark`, `${pascalCustomName}Dark`], rules: darkRules, description: `Deepened ${pascalCustomName} shade for active/pressed states and high-contrast accents.` },
            { name: `${pascalCustomName}Light`, oldName: [`${customName}Light`, `${pascalCustomName}Light`], rules: lightRules, description: `Lightened ${pascalCustomName} tint for highlights, badges and decorative surfaces.` },
            { name: `${pascalCustomName}Pale`, oldName: [`${customName}Pale`, `${pascalCustomName}Pale`, `${customName}UltraLight`, `${pascalCustomName}UltraLight`], rules: paleRules, description: `Ultra-light ${pascalCustomName} tint (tone 98) for subtle backgrounds, containers, and badges.` },
            { name: `${pascalCustomName}Subtle`, oldName: [`${customName}Subtle`, `${pascalCustomName}Subtle`, `${customName}Solid`, `${pascalCustomName}Solid`], rules: subtleRules, description: `Subtle tonal tint (${pascalCustomName} tone 95) between disabled and pale for container backgrounds.` },
            { name: `On${pascalCustomName}Default`, oldName: `on${capitalizedName}Default`, rules: onDefaultRules },
            { name: `${pascalCustomName}Hover`, oldName: `${customName}Hover`, rules: hoverRules },
            { name: `On${pascalCustomName}Raised`, oldName: `on${capitalizedName}Raised`, rules: onRaisedRules },
            { name: `On${pascalCustomName}Dim`, oldName: `on${capitalizedName}Dim`, rules: onDimRules },
            { name: `On${pascalCustomName}Subtle`, oldName: `on${capitalizedName}Subtle`, rules: onSubtleRules },
            { name: `On${pascalCustomName}Disabled`, oldName: `on${capitalizedName}Disabled`, rules: onDisabledRules },
            { name: `${pascalCustomName}Disabled`, oldName: `${customName}Disabled`, rules: disabledRules }
          ];
          const unadjustedBaseRules = genericMapping.base;
          const unadjustedDarkRules = {
            light: Math.max(10, genericMapping.base.light - 10),
            lightContrast: Math.max(5, genericMapping.base.light - 15),
            dark: Math.max(15, genericMapping.base.dark - 10),
            darkContrast: 30,
            accessibility: 35
          };
          const unadjustedLightRules = {
            light: Math.min(85, genericMapping.base.light + 10),
            lightContrast: Math.min(95, genericMapping.base.light + 20),
            dark: Math.min(85, genericMapping.base.dark + 10),
            darkContrast: 80,
            accessibility: 70
          };
          const unadjustedHoverRules = isShapeOnlyHover ? unadjustedBaseRules : genericMapping.hover;
          const unadjustedDisabledRules = genericMapping.disabled;
          const unadjustedSubtleRules = {
            light: 95,
            lightContrast: 85,
            dark: 25,
            darkContrast: 30,
            accessibility: 25
          };
          const unadjustedOnDefaultRules = genericMapping.onDefault;
          const unadjustedOnDimRules = genericMapping.onDim;
          const unadjustedOnSubtleRules = genericMapping.onSubtle;
          const unadjustedOnRaisedRules = genericMapping.onRaised;
          const unadjustedOnDisabledRules = genericMapping.onDisabled;
          const customGenericTokensConfig = [
            { name: pascalCustomName, rules: baseRules, unadjusted: unadjustedBaseRules },
            { name: `${pascalCustomName}Dark`, rules: darkRules, unadjusted: unadjustedDarkRules },
            { name: `${pascalCustomName}Light`, rules: lightRules, unadjusted: unadjustedLightRules },
            { name: `${pascalCustomName}Pale`, rules: paleRules, unadjusted: paleRules },
            { name: `${pascalCustomName}Subtle`, rules: subtleRules, unadjusted: unadjustedSubtleRules },
            { name: `On${pascalCustomName}Default`, rules: onDefaultRules, unadjusted: unadjustedOnDefaultRules },
            { name: `${pascalCustomName}Hover`, rules: hoverRules, unadjusted: unadjustedHoverRules },
            { name: `On${pascalCustomName}Raised`, rules: onRaisedRules, unadjusted: unadjustedOnRaisedRules },
            { name: `On${pascalCustomName}Dim`, rules: onDimRules, unadjusted: unadjustedOnDimRules },
            { name: `On${pascalCustomName}Subtle`, rules: onSubtleRules, unadjusted: unadjustedOnSubtleRules },
            { name: `On${pascalCustomName}Disabled`, rules: onDisabledRules, unadjusted: unadjustedOnDisabledRules },
            { name: `${pascalCustomName}Disabled`, rules: disabledRules, unadjusted: unadjustedDisabledRules }
          ];
          for (const item of customGenericTokensConfig) {
            const isChangedForWcag = item.rules.light !== item.unadjusted.light || item.rules.dark !== item.unadjusted.dark;
            if (isChangedForWcag) {
              const fallbackLeafName = item.name.endsWith("Fallback") ? item.name : `${item.name}Fallback`;
              customTokensToCreate.push({
                name: `Fallback/${fallbackLeafName}`,
                oldName: [
                  `fallback/${item.name}`,
                  `Fallback/${item.name}`,
                  `fallback/${item.name.toLowerCase()}`,
                  `fallback/${fallbackLeafName}`,
                  `Fallback/${fallbackLeafName}`,
                  `fallback/${fallbackLeafName.toLowerCase()}`
                ],
                rules: item.unadjusted,
                description: `Fallback unadjusted ${item.name} token (without WCAG recalculation).`
              });
            }
          }
          const groupName = "Default";
          for (const token of customTokensToCreate) {
            const fullVarName = `${groupName}/${token.name}`;
            const oldNames = token.oldName ? Array.isArray(token.oldName) ? [...token.oldName, token.name] : [token.oldName, token.name] : [token.name];
            let semanticVar = ensureVariable(fullVarName, schemeCollection, "COLOR", varLookupMap, oldNames);
            smartSetVariableMeta(semanticVar, {
              description: token.description || `Semantic color token: ${fullVarName}.`
            });
            setScopes(semanticVar, token.name.toLowerCase());
            schemesMap.set(fullVarName, semanticVar.id);
            schemesMap.set(fullVarName.toLowerCase(), semanticVar.id);
            schemesMap.set(token.name, semanticVar.id);
            schemesMap.set(token.name.toLowerCase(), semanticVar.id);
            schemesMap.set(token.name.charAt(0).toLowerCase() + token.name.slice(1), semanticVar.id);
            if (token.name.endsWith("Pale")) {
              const ultraName = token.name.replace(/Pale$/, "UltraLight");
              schemesMap.set(`${groupName}/${ultraName}`, semanticVar.id);
              schemesMap.set(ultraName, semanticVar.id);
              schemesMap.set(ultraName.toLowerCase(), semanticVar.id);
              schemesMap.set(ultraName.charAt(0).toLowerCase() + ultraName.slice(1), semanticVar.id);
            }
            if (token.oldName) {
              const oldList = Array.isArray(token.oldName) ? token.oldName : [token.oldName];
              for (const on of oldList) {
                schemesMap.set(on, semanticVar.id);
                schemesMap.set(`${groupName}/${on}`, semanticVar.id);
              }
            }
            const assignAlias = (modeId, toneValue) => {
              if (modeId) {
                const mapKey = `${pascalCustomName}/${toneValue}`;
                let targetId = createdVariablesMap.get(mapKey);
                if (!targetId) targetId = createdVariablesMap.get(`${customName}/${toneValue}`);
                if (targetId) smartSetValueForMode(semanticVar, modeId, { type: "VARIABLE_ALIAS", id: targetId });
                return { role: pascalCustomName, tone: toneValue };
              }
              return null;
            };
            const pathLight = assignAlias(modeIds.light, token.rules.light);
            const pathLightC = assignAlias(modeIds.lightContrast, token.rules.lightContrast);
            const pathDark = assignAlias(modeIds.dark, token.rules.dark);
            const pathDarkC = assignAlias(modeIds.darkContrast, token.rules.darkContrast);
            const pathAccessibility = assignAlias(modeIds.accessibility, token.rules.accessibility);
            trackVariable(schemeCollection.id, fullVarName);
            createdUserTokens.push({ name: fullVarName, light: pathLight, lightC: pathLightC, dark: pathDark, darkC: pathDarkC, accessibility: pathAccessibility });
          }
        }
      }
      const getSystemGroupName = (rawName) => {
        const lower = rawName.toLowerCase();
        if (lower.includes("surface")) return "Neutral";
        if (lower.includes("outline")) return "Outline";
        if (lower.includes("layer")) return "Layer";
        if (lower.includes("elevation") || lower.includes("shadow")) return "Elevation";
        if (lower.includes("highlight")) return "Highlight";
        if (lower.includes("focus")) return "Focus";
        return "Neutral";
      };
      const applySystemMapping = async (mappingList, outputTokensArray) => {
        for (const item of mappingList) {
          const groupName = getSystemGroupName(item.name);
          const pascalItemName = toPascalCase3(item.name);
          const fullVarName = `${groupName}/${pascalItemName}`;
          const oldNames = item.oldName ? Array.isArray(item.oldName) ? [...item.oldName, item.name, pascalItemName] : [item.oldName, item.name, pascalItemName] : [item.name, pascalItemName];
          let sysVar = ensureVariable(fullVarName, schemeCollection, "COLOR", varLookupMap, oldNames);
          smartSetVariableMeta(sysVar, {
            description: `Semantic color token: ${fullVarName}.`
          });
          setScopes(sysVar, item.name.toLowerCase());
          schemesMap.set(fullVarName, sysVar.id);
          schemesMap.set(fullVarName.toLowerCase(), sysVar.id);
          schemesMap.set(pascalItemName, sysVar.id);
          schemesMap.set(item.name, sysVar.id);
          schemesMap.set(item.name.toLowerCase(), sysVar.id);
          const assignAliasByString = (variable, modeId, aliasString, isDarkOrAccessibility = false) => {
            if (modeId && aliasString) {
              let finalAlias = aliasString;
              if (isDarkOrAccessibility) {
                for (const st of ["action", "success", "warning", "error"]) {
                  if (aliasString.startsWith(`${st}/`)) {
                    const darkRole = getDarkRoleName(st, seeds);
                    finalAlias = aliasString.replace(`${st}/`, `${darkRole}/`);
                    break;
                  }
                }
              }
              let targetId = createdVariablesMap.get(finalAlias);
              if (!targetId) targetId = createdVariablesMap.get(toPascalCase3(finalAlias));
              if (targetId) smartSetValueForMode(variable, modeId, { type: "VARIABLE_ALIAS", id: targetId });
            }
          };
          let effectiveAccessibility = item.accessibility || item.darkContrast;
          assignAliasByString(sysVar, modeIds.light, item.light, false);
          assignAliasByString(sysVar, modeIds.lightContrast, item.lightContrast, false);
          assignAliasByString(sysVar, modeIds.dark, item.dark, true);
          assignAliasByString(sysVar, modeIds.darkContrast, item.darkContrast, true);
          assignAliasByString(sysVar, modeIds.accessibility, effectiveAccessibility, false);
          trackVariable(schemeCollection.id, fullVarName);
          outputTokensArray.push({
            name: fullVarName,
            oldName: item.oldName,
            light: parseSystemTarget(item.light),
            lightC: parseSystemTarget(item.lightContrast),
            dark: parseSystemTarget(item.dark),
            darkC: parseSystemTarget(item.darkContrast),
            accessibility: parseSystemTarget(effectiveAccessibility)
          });
        }
      };
      await applySystemMapping(systemVariablesMapping, createdSystemTokens);
      await applySystemMapping(semanticShadesMapping, createdShadeTokens);
      const schemeNameVarName = "Name";
      let schemeNameVar = ensureVariable(schemeNameVarName, schemeCollection, "STRING", varLookupMap, ["name", "Name"]);
      smartSetVariableMeta(schemeNameVar, {
        description: `String readout of current scheme mode name (${schemeNameVarName}).`,
        scopes: ["TEXT_CONTENT"]
      });
      for (const mKey of ["light", "lightContrast", "dark", "darkContrast", "accessibility"]) {
        if (modeIds[mKey]) {
          smartSetValueForMode(schemeNameVar, modeIds[mKey], toPascalCase3(mKey));
          trackVariable(schemeCollection.id, schemeNameVarName);
        }
      }
      const schemesControlsCollectionName = "_SchemesControls";
      let schemesControlsCollection = collections.find((c) => c.name === schemesControlsCollectionName || c.name === "_schemesControls" || c.name === "_schemesCodes" || normalizePathForMatch(c.name) === "schemescontrols");
      if (schemesControlsCollection) {
        if (schemesControlsCollection.name !== schemesControlsCollectionName) schemesControlsCollection.name = schemesControlsCollectionName;
      } else {
        schemesControlsCollection = figma.variables.createVariableCollection(schemesControlsCollectionName);
      }
      const schemesControlsModesMap = ensureCollectionModes(schemesControlsCollection, ["Light", "LightContrast", "Dark", "DarkContrast", "Accessibility"]);
      const controlModeIds = {
        light: schemesControlsModesMap["Light"] || schemesControlsModesMap["light"],
        lightContrast: schemesControlsModesMap["LightContrast"] || schemesControlsModesMap["lightContrast"],
        dark: schemesControlsModesMap["Dark"] || schemesControlsModesMap["dark"],
        darkContrast: schemesControlsModesMap["DarkContrast"] || schemesControlsModesMap["darkContrast"],
        accessibility: schemesControlsModesMap["Accessibility"] || schemesControlsModesMap["accessibility"]
      };
      const allTokens = [...createdUserTokens, ...createdSystemTokens, ...createdShadeTokens];
      const getGroupName = (name) => {
        const leaf = name.includes("/") ? name.split("/").pop() : name;
        const lower = leaf.toLowerCase();
        if (lower.startsWith("fallback")) return "Fallback";
        const roleGroups = ["primary", "secondary", "tertiary", "action", "success", "warning", "error"];
        for (const g of roleGroups) {
          const customG = seeds && seeds[g] && seeds[g].name ? seeds[g].name : g;
          const lowerName = leaf.toLowerCase();
          const lowerCustomG = customG.toLowerCase();
          if (lowerName.startsWith(lowerCustomG) || lowerName.startsWith(`on${lowerCustomG}`) || lowerName === `onsurface${lowerCustomG}`) return toPascalCase3(customG);
        }
        if (customColors && Array.isArray(customColors)) {
          for (const cc of customColors) {
            const customG = (cc.name || "").trim();
            if (!customG) continue;
            const lowerName = leaf.toLowerCase();
            const lowerCustomG = customG.toLowerCase();
            if (lowerName.startsWith(lowerCustomG) || lowerName.startsWith(`on${lowerCustomG}`)) return toPascalCase3(customG);
          }
        }
        if (lower.startsWith("surface") || lower.startsWith("onsurface") || lower.startsWith("background") || lower.startsWith("onbackground") || lower.startsWith("inverse") || lower.startsWith("oninverse")) return "Neutral";
        if (lower.startsWith("outline")) return "Outline";
        if (lower.startsWith("layer")) return "Layer";
        if (lower.startsWith("elevationinverse") || lower.startsWith("shadowinverse")) return "ElevationInverse";
        if (lower.startsWith("elevation") || lower.startsWith("shadow")) return "Elevation";
        if (lower.startsWith("highlight")) return "Highlight";
        if (lower.startsWith("focus")) return "Focus";
        if (lower.startsWith("canvas") || lower.startsWith("oncanvas")) return "Canvas";
        return "Other";
      };
      const canvasRenames = {
        "SurfaceSubtle": "Canvas",
        "OnSurfaceSubtle": "OnCanvas",
        "OnSurfaceSubtleMuted": "OnCanvasVariant",
        "SurfaceInverseSubtle": "CanvasContrast",
        "OnSurfaceInverseSubtle": "OnCanvasContrast",
        "LayerLowest": "CanvasSunken",
        "LayerLower": "CanvasLower",
        "LayerLow": "CanvasDefault",
        "LayerBase": "CanvasSubtle",
        "LayerHigh": "CanvasSurface",
        "LayerHigher": "CanvasRaised",
        "LayerHighest": "CanvasOverlay",
        "LayerMax": "CanvasMax",
        "SurfacePopout": "CanvasPopout",
        "SurfaceDim": "CanvasDim",
        "SurfaceBright": "CanvasMax"
      };
      for (const token of allTokens) {
        const leafTokenName = token.name.includes("/") ? token.name.split("/").pop() : token.name;
        const groupFolder = getGroupName(token.name);
        const cleanTokenName = leafTokenName.startsWith(`${groupFolder}/`) ? leafTokenName.slice(groupFolder.length + 1) : leafTokenName;
        const oldTokenNames = token.oldName ? Array.isArray(token.oldName) ? token.oldName : [token.oldName] : canvasRenames[token.name] ? [canvasRenames[token.name]] : canvasRenames[leafTokenName] ? [canvasRenames[leafTokenName]] : [];
        const createStringVar = (suffix, fallbackValueFactory) => {
          const pascalSuffix = toPascalCase3(suffix);
          const varName = `${groupFolder}/${toPascalCase3(cleanTokenName)}${pascalSuffix}`;
          const oldVarNames = [
            `${groupFolder}/${cleanTokenName} ${suffix}`,
            `${groupFolder.toLowerCase()}/${cleanTokenName} ${suffix}`,
            `Default/${toPascalCase3(cleanTokenName)}${pascalSuffix}`,
            `Default/${cleanTokenName} ${suffix}`,
            `States/${toPascalCase3(cleanTokenName)}${pascalSuffix}`,
            `States/${cleanTokenName} ${suffix}`,
            `Surface/${toPascalCase3(cleanTokenName)}${pascalSuffix}`,
            `Surface/${cleanTokenName} ${suffix}`,
            `Elevation/${toPascalCase3(cleanTokenName)}${pascalSuffix}`,
            `Elevation/${cleanTokenName} ${suffix}`,
            `Highlight/${toPascalCase3(cleanTokenName)}${pascalSuffix}`,
            `Highlight/${cleanTokenName} ${suffix}`,
            ...oldTokenNames.flatMap((otn) => {
              const oldGroupFolder = getGroupName(otn);
              const cleanOtn = otn.includes("/") ? otn.split("/").pop() : otn;
              return [
                `${oldGroupFolder}/${cleanOtn} ${suffix}`,
                `${oldGroupFolder.toLowerCase()}/${cleanOtn} ${suffix}`,
                `${toPascalCase3(oldGroupFolder)}/${toPascalCase3(cleanOtn)}${pascalSuffix}`
              ];
            })
          ];
          let strVar = ensureVariable(varName, schemesControlsCollection, "STRING", varLookupMap, oldVarNames);
          smartSetVariableMeta(strVar, {
            description: `Semantic system text string: ${varName}.`,
            scopes: [],
            hiddenFromPublishing: true
          });
          if (controlModeIds.light) smartSetValueForMode(strVar, controlModeIds.light, fallbackValueFactory(token.light));
          if (controlModeIds.lightContrast) smartSetValueForMode(strVar, controlModeIds.lightContrast, fallbackValueFactory(token.lightC));
          if (controlModeIds.dark) smartSetValueForMode(strVar, controlModeIds.dark, fallbackValueFactory(token.dark));
          if (controlModeIds.darkContrast) smartSetValueForMode(strVar, controlModeIds.darkContrast, fallbackValueFactory(token.darkC));
          if (controlModeIds.accessibility) smartSetValueForMode(strVar, controlModeIds.accessibility, fallbackValueFactory(token.accessibility));
          trackVariable(schemesControlsCollection.id, varName);
        };
        createStringVar("code", (t) => t ? getShortCode(t.role, t.tone, seeds) : "-");
        createStringVar("name", () => toPascalCase3(cleanTokenName));
        createStringVar("hex", (t) => t ? getHexStringForTarget(t, seeds, customColors) : "-");
      }
      const oldMetricsControlsCol = collections.find((c) => c.name === "_metricsControls" || c.name === "_metricsPrimitives");
      if (oldMetricsControlsCol) {
        oldMetricsControlsCol.remove();
      }
      const metricsColName = "Metrics";
      let metricsCol = collections.find((c) => c.name === metricsColName || c.name === "metrics" || normalizePathForMatch(c.name) === "metrics");
      if (metricsCol) {
        if (metricsCol.name !== metricsColName) metricsCol.name = metricsColName;
      } else {
        metricsCol = figma.variables.createVariableCollection(metricsColName);
      }
      const metricsModesMap = ensureCollectionModes(metricsCol, ["Default"]);
      const mModeIds = {
        default: metricsModesMap["Default"] || metricsModesMap["default"]
      };
      const presetConfigs = {
        radiusExtraSmall: {
          none: { default: 0 },
          compact: { default: 2 },
          default: { default: 4 },
          relaxed: { default: 8 },
          full: { default: 9999 }
        },
        radiusSmall: {
          none: { default: 0 },
          compact: { default: 4 },
          default: { default: 8 },
          relaxed: { default: 12 },
          full: { default: 9999 }
        },
        radiusBase: {
          none: { default: 0 },
          compact: { default: 8 },
          default: { default: 12 },
          relaxed: { default: 16 },
          full: { default: 9999 }
        },
        get radiusRegular() {
          return this.radiusBase;
        },
        radiusLarge: {
          none: { default: 0 },
          compact: { default: 16 },
          default: { default: 24 },
          relaxed: { default: 32 },
          full: { default: 9999 }
        },
        radiusHoverExtraSmall: {
          none: { default: 0 },
          compact: { default: 1 },
          default: { default: 2 },
          relaxed: { default: 4 },
          full: { default: 8 }
        },
        radiusHoverSmall: {
          none: { default: 0 },
          compact: { default: 2 },
          default: { default: 4 },
          relaxed: { default: 8 },
          full: { default: 12 }
        },
        radiusHoverBase: {
          none: { default: 0 },
          compact: { default: 4 },
          default: { default: 8 },
          relaxed: { default: 12 },
          full: { default: 16 }
        },
        radiusHoverLarge: {
          none: { default: 0 },
          compact: { default: 8 },
          default: { default: 12 },
          relaxed: { default: 16 },
          full: { default: 24 }
        },
        radiusContainerPico: {
          none: { default: 0 },
          compact: { default: 1 },
          default: { default: 2 },
          relaxed: { default: 4 },
          full: { default: 8 }
        },
        radiusContainerExtraSmall: {
          none: { default: 0 },
          compact: { default: 2 },
          default: { default: 4 },
          relaxed: { default: 8 },
          full: { default: 12 }
        },
        radiusContainerSmall: {
          none: { default: 0 },
          compact: { default: 4 },
          default: { default: 8 },
          relaxed: { default: 12 },
          full: { default: 16 }
        },
        radiusContainerBase: {
          none: { default: 0 },
          compact: { default: 8 },
          default: { default: 12 },
          relaxed: { default: 16 },
          full: { default: 20 }
        },
        get radiusContainerRegular() {
          return this.radiusContainerBase;
        },
        radiusContainerMedium: {
          none: { default: 0 },
          compact: { default: 12 },
          default: { default: 16 },
          relaxed: { default: 20 },
          full: { default: 24 }
        },
        radiusContainerSemiLarge: {
          none: { default: 0 },
          compact: { default: 16 },
          default: { default: 20 },
          relaxed: { default: 24 },
          full: { default: 32 }
        },
        radiusContainerLarge: {
          none: { default: 0 },
          compact: { default: 20 },
          default: { default: 24 },
          relaxed: { default: 32 },
          full: { default: 40 }
        },
        radiusContainerExtraLarge: {
          none: { default: 0 },
          compact: { default: 24 },
          default: { default: 32 },
          relaxed: { default: 40 },
          full: { default: 48 }
        },
        radiusContainerHuge: {
          none: { default: 0 },
          compact: { default: 32 },
          default: { default: 40 },
          relaxed: { default: 48 },
          full: { default: 56 }
        },
        radiusContainerExtraHuge: {
          none: { default: 0 },
          compact: { default: 40 },
          default: { default: 48 },
          relaxed: { default: 56 },
          full: { default: 64 }
        },
        radiusContainerMassive: {
          none: { default: 0 },
          compact: { default: 48 },
          default: { default: 56 },
          relaxed: { default: 64 },
          full: { default: 72 }
        },
        radiusContainerGigantic: {
          none: { default: 0 },
          compact: { default: 56 },
          default: { default: 64 },
          relaxed: { default: 72 },
          full: { default: 80 }
        },
        radiusContainerColossal: {
          none: { default: 0 },
          compact: { default: 64 },
          default: { default: 72 },
          relaxed: { default: 80 },
          full: { default: 88 }
        },
        radiusContainerTitanic: {
          none: { default: 0 },
          compact: { default: 72 },
          default: { default: 80 },
          relaxed: { default: 88 },
          full: { default: 96 }
        },
        radiusContainerMonumental: {
          none: { default: 0 },
          compact: { default: 80 },
          default: { default: 88 },
          relaxed: { default: 96 },
          full: { default: 104 }
        },
        radiusContainerGargantuan: {
          none: { default: 0 },
          compact: { default: 88 },
          default: { default: 96 },
          relaxed: { default: 104 },
          full: { default: 112 }
        },
        layoutPico: {
          compact: { default: 1 },
          default: { default: 2 },
          relaxed: { default: 4 }
        },
        layoutExtraSmall: {
          compact: { default: 2 },
          default: { default: 4 },
          relaxed: { default: 8 }
        },
        layoutSmall: {
          compact: { default: 4 },
          default: { default: 8 },
          relaxed: { default: 12 }
        },
        layoutBase: {
          compact: { default: 8 },
          default: { default: 12 },
          relaxed: { default: 16 }
        },
        get layoutRegular() {
          return this.layoutBase;
        },
        layoutMedium: {
          compact: { default: 12 },
          default: { default: 16 },
          relaxed: { default: 20 }
        },
        layoutSemiLarge: {
          compact: { default: 16 },
          default: { default: 20 },
          relaxed: { default: 24 }
        },
        layoutLarge: {
          compact: { default: 20 },
          default: { default: 24 },
          relaxed: { default: 32 }
        },
        layoutExtraLarge: {
          compact: { default: 24 },
          default: { default: 32 },
          relaxed: { default: 40 }
        },
        layoutHuge: {
          compact: { default: 32 },
          default: { default: 40 },
          relaxed: { default: 48 }
        },
        layoutExtraHuge: {
          compact: { default: 40 },
          default: { default: 48 },
          relaxed: { default: 56 }
        },
        layoutMassive: {
          compact: { default: 48 },
          default: { default: 56 },
          relaxed: { default: 64 }
        },
        layoutGigantic: {
          compact: { default: 56 },
          default: { default: 64 },
          relaxed: { default: 72 }
        },
        layoutColossal: {
          compact: { default: 64 },
          default: { default: 72 },
          relaxed: { default: 80 }
        },
        layoutTitanic: {
          compact: { default: 72 },
          default: { default: 80 },
          relaxed: { default: 88 }
        },
        layoutMonumental: {
          compact: { default: 80 },
          default: { default: 88 },
          relaxed: { default: 96 }
        },
        layoutGargantuan: {
          compact: { default: 88 },
          default: { default: 96 },
          relaxed: { default: 104 }
        },
        border: {
          thin: { default: 1 },
          default: { default: 1 },
          thick: { default: 2 }
        },
        icon: {
          compact: { default: 14 },
          default: { default: 14 },
          relaxed: { default: 16 }
        }
      };
      const getFocusRadiusConfig = (config) => ({
        default: config.default === 9999 ? 9999 : config.default + 1
      });
      const getNegativeLayoutConfig = (config) => ({
        default: -(config.default || 0)
      });
      const isShapeMorph = buttonHoverPreset === "shape" || buttonHoverPreset === "both";
      const semanticMetrics = [
        // --- Promienie zaokrągleń (Radii) ---
        { name: "radius/extraSmall", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusExtraSmall[radiusPreset] || presetConfigs.radiusExtraSmall.default },
        { name: "radius/small", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusSmall[radiusPreset] || presetConfigs.radiusSmall.default },
        { name: "radius/base", oldName: "radius/regular", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusBase[radiusPreset] || presetConfigs.radiusBase.default },
        { name: "radius/large", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusLarge[radiusPreset] || presetConfigs.radiusLarge.default },
        // --- Promienie zaokrągleń Hover (Grupa radius/hover: extraSmall, small, base, large) ---
        { name: "radius/hover/extraSmall", scope: ["CORNER_RADIUS"], values: isShapeMorph ? presetConfigs.radiusHoverExtraSmall[radiusPreset] || presetConfigs.radiusHoverExtraSmall.default : presetConfigs.radiusExtraSmall[radiusPreset] || presetConfigs.radiusExtraSmall.default },
        { name: "radius/hover/small", scope: ["CORNER_RADIUS"], values: isShapeMorph ? presetConfigs.radiusHoverSmall[radiusPreset] || presetConfigs.radiusHoverSmall.default : presetConfigs.radiusSmall[radiusPreset] || presetConfigs.radiusSmall.default },
        { name: "radius/hover/base", oldName: "radius/hover", scope: ["CORNER_RADIUS"], values: isShapeMorph ? presetConfigs.radiusHoverBase[radiusPreset] || presetConfigs.radiusHoverBase.default : presetConfigs.radiusBase[radiusPreset] || presetConfigs.radiusBase.default },
        { name: "radius/hover/large", scope: ["CORNER_RADIUS"], values: isShapeMorph ? presetConfigs.radiusHoverLarge[radiusPreset] || presetConfigs.radiusHoverLarge.default : presetConfigs.radiusLarge[radiusPreset] || presetConfigs.radiusLarge.default },
        // --- Promienie zaokrągleń dla kontenerów (Container Radii) ---
        { name: "radius/container/pico", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerPico[radiusPreset] || presetConfigs.radiusContainerPico.default },
        { name: "radius/container/extraSmall", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerExtraSmall[radiusPreset] || presetConfigs.radiusContainerExtraSmall.default },
        { name: "radius/container/small", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerSmall[radiusPreset] || presetConfigs.radiusContainerSmall.default },
        { name: "radius/container/base", oldName: "radius/container/regular", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerBase[radiusPreset] || presetConfigs.radiusContainerBase.default },
        { name: "radius/container/medium", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerMedium[radiusPreset] || presetConfigs.radiusContainerMedium.default },
        { name: "radius/container/semiLarge", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerSemiLarge[radiusPreset] || presetConfigs.radiusContainerSemiLarge.default },
        { name: "radius/container/large", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerLarge[radiusPreset] || presetConfigs.radiusContainerLarge.default },
        { name: "radius/container/extraLarge", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerExtraLarge[radiusPreset] || presetConfigs.radiusContainerExtraLarge.default },
        { name: "radius/container/huge", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerHuge[radiusPreset] || presetConfigs.radiusContainerHuge.default },
        { name: "radius/container/extraHuge", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerExtraHuge[radiusPreset] || presetConfigs.radiusContainerExtraHuge.default },
        { name: "radius/container/massive", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerMassive[radiusPreset] || presetConfigs.radiusContainerMassive.default },
        { name: "radius/container/gigantic", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerGigantic[radiusPreset] || presetConfigs.radiusContainerGigantic.default },
        { name: "radius/container/colossal", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerColossal[radiusPreset] || presetConfigs.radiusContainerColossal.default },
        { name: "radius/container/titanic", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerTitanic[radiusPreset] || presetConfigs.radiusContainerTitanic.default },
        { name: "radius/container/monumental", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerMonumental[radiusPreset] || presetConfigs.radiusContainerMonumental.default },
        { name: "radius/container/gargantuan", scope: ["CORNER_RADIUS"], values: presetConfigs.radiusContainerGargantuan[radiusPreset] || presetConfigs.radiusContainerGargantuan.default },
        // --- Promienie zaokrągleń Focus (Radii Focus) ---
        { name: "radius/_focus/extraSmall", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusExtraSmall[radiusPreset] || presetConfigs.radiusExtraSmall.default) },
        { name: "radius/_focus/small", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusSmall[radiusPreset] || presetConfigs.radiusSmall.default) },
        { name: "radius/_focus/base", oldName: "radius/_focus/regular", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusBase[radiusPreset] || presetConfigs.radiusBase.default) },
        { name: "radius/_focus/large", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusLarge[radiusPreset] || presetConfigs.radiusLarge.default) },
        // --- Promienie zaokrągleń Focus dla kontenerów (Container Focus Radii) ---
        { name: "radius/_focus/container/pico", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerPico[radiusPreset] || presetConfigs.radiusContainerPico.default) },
        { name: "radius/_focus/container/extraSmall", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerExtraSmall[radiusPreset] || presetConfigs.radiusContainerExtraSmall.default) },
        { name: "radius/_focus/container/small", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerSmall[radiusPreset] || presetConfigs.radiusContainerSmall.default) },
        { name: "radius/_focus/container/base", oldName: "radius/_focus/container/regular", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerBase[radiusPreset] || presetConfigs.radiusContainerBase.default) },
        { name: "radius/_focus/container/medium", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerMedium[radiusPreset] || presetConfigs.radiusContainerMedium.default) },
        { name: "radius/_focus/container/semiLarge", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerSemiLarge[radiusPreset] || presetConfigs.radiusContainerSemiLarge.default) },
        { name: "radius/_focus/container/large", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerLarge[radiusPreset] || presetConfigs.radiusContainerLarge.default) },
        { name: "radius/_focus/container/extraLarge", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerExtraLarge[radiusPreset] || presetConfigs.radiusContainerExtraLarge.default) },
        { name: "radius/_focus/container/huge", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerHuge[radiusPreset] || presetConfigs.radiusContainerHuge.default) },
        { name: "radius/_focus/container/extraHuge", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerExtraHuge[radiusPreset] || presetConfigs.radiusContainerExtraHuge.default) },
        { name: "radius/_focus/container/massive", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerMassive[radiusPreset] || presetConfigs.radiusContainerMassive.default) },
        { name: "radius/_focus/container/gigantic", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerGigantic[radiusPreset] || presetConfigs.radiusContainerGigantic.default) },
        { name: "radius/_focus/container/colossal", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerColossal[radiusPreset] || presetConfigs.radiusContainerColossal.default) },
        { name: "radius/_focus/container/titanic", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerTitanic[radiusPreset] || presetConfigs.radiusContainerTitanic.default) },
        { name: "radius/_focus/container/monumental", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerMonumental[radiusPreset] || presetConfigs.radiusContainerMonumental.default) },
        { name: "radius/_focus/container/gargantuan", scope: [], hidden: true, values: getFocusRadiusConfig(presetConfigs.radiusContainerGargantuan[radiusPreset] || presetConfigs.radiusContainerGargantuan.default) },
        // --- Odstępy (Layout) ---
        { name: "layout/pico", scope: ["GAP"], values: presetConfigs.layoutPico[gapPreset] || presetConfigs.layoutPico.default },
        { name: "layout/extraSmall", scope: ["GAP"], values: presetConfigs.layoutExtraSmall[gapPreset] || presetConfigs.layoutExtraSmall.default },
        { name: "layout/small", scope: ["GAP"], values: presetConfigs.layoutSmall[gapPreset] || presetConfigs.layoutSmall.default },
        { name: "layout/base", oldName: "layout/regular", scope: ["GAP"], values: presetConfigs.layoutBase[gapPreset] || presetConfigs.layoutBase.default },
        { name: "layout/medium", scope: ["GAP"], values: presetConfigs.layoutMedium[gapPreset] || presetConfigs.layoutMedium.default },
        { name: "layout/semiLarge", scope: ["GAP"], values: presetConfigs.layoutSemiLarge[gapPreset] || presetConfigs.layoutSemiLarge.default },
        { name: "layout/large", scope: ["GAP"], values: presetConfigs.layoutLarge[gapPreset] || presetConfigs.layoutLarge.default },
        { name: "layout/extraLarge", scope: ["GAP"], values: presetConfigs.layoutExtraLarge[gapPreset] || presetConfigs.layoutExtraLarge.default },
        { name: "layout/huge", scope: ["GAP"], values: presetConfigs.layoutHuge[gapPreset] || presetConfigs.layoutHuge.default },
        { name: "layout/extraHuge", scope: ["GAP"], values: presetConfigs.layoutExtraHuge[gapPreset] || presetConfigs.layoutExtraHuge.default },
        { name: "layout/massive", scope: ["GAP"], values: presetConfigs.layoutMassive[gapPreset] || presetConfigs.layoutMassive.default },
        { name: "layout/gigantic", scope: ["GAP"], values: presetConfigs.layoutGigantic[gapPreset] || presetConfigs.layoutGigantic.default },
        { name: "layout/colossal", scope: ["GAP"], values: presetConfigs.layoutColossal[gapPreset] || presetConfigs.layoutColossal.default },
        { name: "layout/titanic", scope: ["GAP"], values: presetConfigs.layoutTitanic[gapPreset] || presetConfigs.layoutTitanic.default },
        { name: "layout/monumental", scope: ["GAP"], values: presetConfigs.layoutMonumental[gapPreset] || presetConfigs.layoutMonumental.default },
        { name: "layout/gargantuan", scope: ["GAP"], values: presetConfigs.layoutGargantuan[gapPreset] || presetConfigs.layoutGargantuan.default },
        // --- Ujemne odstępy (Negative Layout - niepublikowalne) ---
        { name: "layout/_negative/extraSmall", scope: [], hidden: true, values: getNegativeLayoutConfig(presetConfigs.layoutExtraSmall[gapPreset] || presetConfigs.layoutExtraSmall.default) },
        { name: "layout/_negative/small", scope: [], hidden: true, values: getNegativeLayoutConfig(presetConfigs.layoutSmall[gapPreset] || presetConfigs.layoutSmall.default) },
        { name: "layout/_negative/base", oldName: "layout/_negative/regular", scope: [], hidden: true, values: getNegativeLayoutConfig(presetConfigs.layoutBase[gapPreset] || presetConfigs.layoutBase.default) },
        { name: "layout/_negative/medium", scope: [], hidden: true, values: getNegativeLayoutConfig(presetConfigs.layoutMedium[gapPreset] || presetConfigs.layoutMedium.default) },
        // --- Stałe pomocnicze (Constants) ---
        { name: "constant/none", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 0 } },
        { name: "constant/full", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 9999 } },
        { name: "constant/1", oldName: "constant/one", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 1 } },
        { name: "constant/2", oldName: "constant/two", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 2 } },
        { name: "constant/3", oldName: "constant/three", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 3 } },
        { name: "constant/4", oldName: "constant/four", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 4 } },
        { name: "constant/6", oldName: "constant/six", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 6 } },
        { name: "constant/8", oldName: "constant/eight", scope: ["CORNER_RADIUS", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"], values: { default: 8 } },
        { name: "constant/wcagMinTarget", scope: ["WIDTH_HEIGHT"], values: { default: 44 }, description: "WCAG 2.1/2.2 minimum target size for interactive elements (44x44px)." }
      ];
      let constantNoneVar = null;
      let constantOneVar = null;
      for (const item of semanticMetrics) {
        const pascalName = toPascalCase3(item.name);
        const oldNames = item.oldName ? Array.isArray(item.oldName) ? [...item.oldName, item.name] : [item.oldName, item.name] : [item.name];
        let semVar = ensureVariable(pascalName, metricsCol, "FLOAT", varLookupMap, oldNames);
        if (pascalName === "Constant/None" || item.name === "constant/none") constantNoneVar = semVar;
        if (pascalName === "Constant/1" || item.name === "constant/1" || item.name === "constant/one") constantOneVar = semVar;
        const isHidden = item.hidden || pascalName.toLowerCase().includes("_focus") || pascalName.toLowerCase().includes("_negative");
        smartSetVariableMeta(semVar, {
          description: item.description || `Semantic metric token for ${pascalName}. Maps preset configurations.`,
          hiddenFromPublishing: isHidden,
          scopes: isHidden ? [] : item.scope
        });
        if (mModeIds.default) smartSetValueForMode(semVar, mModeIds.default, item.values.default);
        trackVariable(metricsCol.id, pascalName);
      }
      const accessibilityColName = "Accessibility";
      let accessibilityCol = collections.find((c) => c.name === accessibilityColName || c.name === "accessibility" || normalizePathForMatch(c.name) === "accessibility");
      if (accessibilityCol) {
        if (accessibilityCol.name !== accessibilityColName) accessibilityCol.name = accessibilityColName;
      } else {
        accessibilityCol = figma.variables.createVariableCollection(accessibilityColName);
      }
      const accessibilityModesList = ["Default", "Accessibility"];
      const accessibilityModesMap = ensureCollectionModes(accessibilityCol, accessibilityModesList);
      let borderVar = ensureVariable("Border", accessibilityCol, "FLOAT", varLookupMap, ["border", "Border"]);
      smartSetVariableMeta(borderVar, {
        description: "Accessibility border metric token. None (0) for default mode, 1 for accessibility mode.",
        scopes: ["STROKE_FLOAT"],
        hiddenFromPublishing: false
      });
      let accessibilityVar = ensureVariable("Accessibility", accessibilityCol, "BOOLEAN", varLookupMap, ["accessibility", "Accessibility"]);
      smartSetVariableMeta(accessibilityVar, {
        description: "Accessibility boolean status token. false for default mode, true for accessibility mode.",
        scopes: ["ALL_SCOPES"],
        hiddenFromPublishing: false
      });
      const noneVal = constantNoneVar ? { type: "VARIABLE_ALIAS", id: constantNoneVar.id } : 0;
      const oneVal = constantOneVar ? { type: "VARIABLE_ALIAS", id: constantOneVar.id } : 1;
      const defAccModeId = accessibilityModesMap["Default"] || accessibilityModesMap["default"];
      const accAccModeId = accessibilityModesMap["Accessibility"] || accessibilityModesMap["accessibility"];
      if (defAccModeId) {
        smartSetValueForMode(borderVar, defAccModeId, noneVal);
        smartSetValueForMode(accessibilityVar, defAccModeId, false);
      }
      if (accAccModeId) {
        smartSetValueForMode(borderVar, accAccModeId, oneVal);
        smartSetValueForMode(accessibilityVar, accAccModeId, true);
      }
      trackVariable(accessibilityCol.id, "Border");
      trackVariable(accessibilityCol.id, "Accessibility");
      const localEffectStyles = await figma.getLocalEffectStylesAsync();
      const localPaintStyles = await figma.getLocalPaintStylesAsync();
      const gradientRoles = ["primary", "secondary", "tertiary"];
      const gradientDefinitions = [
        // Liniowe Osiowe
        {
          key: "to-bottom",
          label: "To Bottom (90\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[0, 1, 0], [-1, 0, 1]],
          oldKeys: ["default", "50-70"]
        },
        {
          key: "to-top",
          label: "To Top (270\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 70,
          toTone: 50,
          transform: [[0, 1, 0], [-1, 0, 1]],
          oldKeys: ["reverse", "70-50"]
        },
        {
          key: "to-right",
          label: "To Right (0\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[1, 0, 0], [0, 1, 0]],
          oldKeys: []
        },
        {
          key: "to-left",
          label: "To Left (180\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[-1, 0, 1], [0, 1, 0]],
          oldKeys: []
        },
        // Liniowe Przekątne
        {
          key: "to-bottom-right",
          label: "To Bottom Right (45\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[1, -1, 0], [1, 1, 0]],
          oldKeys: []
        },
        {
          key: "to-bottom-left",
          label: "To Bottom Left (135\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[-1, -1, 1], [1, -1, 0]],
          oldKeys: []
        },
        {
          key: "to-top-left",
          label: "To Top Left (225\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[-1, 1, 1], [-1, -1, 1]],
          oldKeys: []
        },
        {
          key: "to-top-right",
          label: "To Top Right (315\xB0)",
          type: "GRADIENT_LINEAR",
          fromTone: 50,
          toTone: 70,
          transform: [[1, 1, 0], [-1, 1, 1]],
          oldKeys: []
        },
        // Angular (Stożkowe)
        {
          key: "angular/top",
          label: "Angular Top (0\xB0)",
          type: "GRADIENT_ANGULAR",
          fromTone: 50,
          toTone: 70,
          transform: [[0, -1, 1], [1, 0, 0]],
          oldKeys: ["angular/default", "angular"]
        },
        {
          key: "angular/left",
          label: "Angular left (270\xB0)",
          type: "GRADIENT_ANGULAR",
          fromTone: 70,
          toTone: 50,
          transform: [[-1, 0, 1], [0, -1, 1]],
          oldKeys: ["angular/reverse", "angular-reverse"]
        },
        {
          key: "angular/right",
          label: "Angular Right (90\xB0)",
          type: "GRADIENT_ANGULAR",
          fromTone: 50,
          toTone: 70,
          transform: [[1, 0, 0], [0, 1, 0]],
          oldKeys: ["angular/standard"]
        },
        {
          key: "angular/bottom",
          label: "Angular Bottom (180\xB0)",
          type: "GRADIENT_ANGULAR",
          fromTone: 50,
          toTone: 70,
          transform: [[0, 1, 0], [-1, 0, 1]],
          oldKeys: ["angular/rotated"]
        }
      ];
      for (const role of gradientRoles) {
        if (!seeds[role]) continue;
        const customName = seeds[role].name;
        const pascalRole = toPascalCase3(role);
        const pascalCustom = toPascalCase3(customName);
        for (const def of gradientDefinitions) {
          const pascalKey = toPascalCase3(def.key);
          const styleName = `Gradients/${pascalRole}/${pascalKey}`;
          const targetNorm = normalizePathForMatch(styleName);
          let paintStyle = localPaintStyles.find(
            (s) => s.name === styleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${role}/${def.key}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${customName}/${def.key}`) || def.oldKeys && def.oldKeys.some(
              (oldK) => normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${role}/${oldK}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${customName}/${oldK}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${oldK}/${role}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${role}`)
            )
          );
          if (!paintStyle) {
            paintStyle = figma.createPaintStyle();
            paintStyle.name = styleName;
            localPaintStyles.push(paintStyle);
          } else {
            paintStyle.name = styleName;
          }
          const gradDesc = `Semantic ${def.type.toLowerCase().replace("gradient_", "")} gradient (${def.label}) for ${pascalRole} (palette ${def.fromTone} to ${def.toTone}).`;
          if (paintStyle.description !== gradDesc) paintStyle.description = gradDesc;
          const baseRgb = hexToRgb(seeds[role].color);
          const cFrom = calculateTone(baseRgb, def.fromTone);
          const cTo = calculateTone(baseRgb, def.toTone);
          const varIdFrom = createdVariablesMap.get(`${role}/${def.fromTone}`) || createdVariablesMap.get(`${pascalRole}/${def.fromTone}`);
          const varIdTo = createdVariablesMap.get(`${role}/${def.toTone}`) || createdVariablesMap.get(`${pascalRole}/${def.toTone}`);
          const stopFrom = {
            position: 0,
            color: { r: cFrom.r, g: cFrom.g, b: cFrom.b, a: 1 }
          };
          if (varIdFrom) {
            stopFrom.boundVariables = { color: { type: "VARIABLE_ALIAS", id: varIdFrom } };
          }
          const stopTo = {
            position: 1,
            color: { r: cTo.r, g: cTo.g, b: cTo.b, a: 1 }
          };
          if (varIdTo) {
            stopTo.boundVariables = { color: { type: "VARIABLE_ALIAS", id: varIdTo } };
          }
          const newPaints = [{
            type: def.type,
            gradientTransform: def.transform,
            gradientStops: [stopFrom, stopTo]
          }];
          if (!arePaintsEqual(paintStyle.paints, newPaints)) {
            paintStyle.paints = newPaints;
          }
        }
      }
      if (customGradients && Array.isArray(customGradients) && customGradients.length > 0) {
        let computeGradientTransform = function(angleDeg, scalePct, offsetXPct, offsetYPct) {
          const rad = (angleDeg !== void 0 ? angleDeg : 90) * (Math.PI / 180);
          const s = Math.max(0.01, (scalePct !== void 0 ? scalePct : 100) / 100);
          const ox = (offsetXPct || 0) / 100;
          const oy = (offsetYPct || 0) / 100;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const m00 = cos / s;
          const m01 = sin / s;
          const m02 = 0.5 - m00 * (0.5 + ox) - m01 * (0.5 + oy);
          const m10 = -sin / s;
          const m11 = cos / s;
          const m12 = 0.5 - m10 * (0.5 + ox) - m11 * (0.5 + oy);
          return [[m00, m01, m02], [m10, m11, m12]];
        };
        const customDirections = [
          { key: "to-bottom", label: "To Bottom (90\xB0)", transform: [[0, 1, 0], [-1, 0, 1]] },
          { key: "to-top", label: "To Top (270\xB0)", transform: [[0, -1, 1], [1, 0, 0]] },
          { key: "to-right", label: "To Right (0\xB0)", transform: [[1, 0, 0], [0, 1, 0]] },
          { key: "to-left", label: "To Left (180\xB0)", transform: [[-1, 0, 1], [0, 1, 0]] },
          { key: "to-bottom-right", label: "To Bottom Right (45\xB0)", transform: [[0.5, 0.5, 0], [-0.5, 0.5, 0.5]] },
          { key: "to-bottom-left", label: "To Bottom Left (135\xB0)", transform: [[-0.5, 0.5, 0.5], [-0.5, -0.5, 1]] },
          { key: "to-top-left", label: "To Top Left (225\xB0)", transform: [[-0.5, -0.5, 1], [0.5, -0.5, 0.5]] },
          { key: "to-top-right", label: "To Top Right (315\xB0)", transform: [[0.5, -0.5, 0.5], [0.5, 0.5, 0]] }
        ];
        for (const cg of customGradients) {
          const cgName = (cg.name || "custom").trim().toLowerCase().replace(/\s+/g, "-");
          const colors = cg.stops || [];
          if (colors.length < 2) continue;
          const stopsCount = colors.length;
          const isCustomMode = cg.mode === "custom";
          const dirDefs = isCustomMode ? [
            {
              key: "custom",
              label: `Custom angle & position (${cg.angle || 90}\xB0, scale: ${cg.scale || 100}%, offset: ${cg.offsetX || 0}%,${cg.offsetY || 0}%)`,
              transform: computeGradientTransform(cg.angle, cg.scale, cg.offsetX, cg.offsetY)
            }
          ] : customDirections;
          for (const def of dirDefs) {
            const pascalCgName = toPascalCase3(cgName);
            const pascalDefKey = toPascalCase3(def.key);
            const styleName = `Gradients/${pascalCgName}/${pascalDefKey}`;
            const targetNorm = normalizePathForMatch(styleName);
            let paintStyle = localPaintStyles.find(
              (s) => s.name === styleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${cgName}/${def.key}`) || isCustomMode && (normalizePathForMatch(s.name).startsWith(normalizePathForMatch(`gradients/${cgName}/custom`)) || normalizePathForMatch(s.name) === normalizePathForMatch(`gradients/${cgName}`))
            );
            if (!paintStyle) {
              paintStyle = figma.createPaintStyle();
              paintStyle.name = styleName;
              localPaintStyles.push(paintStyle);
            } else {
              paintStyle.name = styleName;
            }
            const gradDesc = `Custom linear gradient (${def.label}) for ${pascalCgName} with ${stopsCount} stops.`;
            if (paintStyle.description !== gradDesc) paintStyle.description = gradDesc;
            const gradientStops = colors.map((s, idx) => {
              const hex = typeof s === "string" ? s : s.color || "#000000";
              let pos = typeof s === "object" && s.position !== void 0 ? parseFloat(s.position) / 100 : idx / Math.max(1, stopsCount - 1);
              if (isNaN(pos)) pos = idx / Math.max(1, stopsCount - 1);
              const rgb = hexToRgb(hex);
              return {
                position: Math.max(0, Math.min(1, pos)),
                color: { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 }
              };
            });
            gradientStops.sort((a, b) => a.position - b.position);
            const newPaints = [{
              type: "GRADIENT_LINEAR",
              gradientTransform: def.transform,
              gradientStops
            }];
            if (!arePaintsEqual(paintStyle.paints, newPaints)) {
              paintStyle.paints = newPaints;
            }
          }
        }
      }
      const elevationLevels = [
        { level: "lowest", colorVar: "elevationLowest", oldLevel: "shadowLowest", layers: [{ y: 1, blur: 4 }, { y: 2, blur: 8 }, { y: 4, blur: 12 }, { y: 8, blur: 16 }] },
        { level: "lower", colorVar: "elevationLowest", oldLevel: "shadowLower", layers: [{ y: 2, blur: 6 }, { y: 3, blur: 10 }, { y: 6, blur: 14 }, { y: 10, blur: 18 }] },
        { level: "low", colorVar: "elevationLowest", oldLevel: "shadowLow", layers: [{ y: 2, blur: 8 }, { y: 4, blur: 12 }, { y: 8, blur: 16 }, { y: 12, blur: 20 }] },
        { level: "base", colorVar: "elevationLowest", oldLevel: "shadowBase", layers: [{ y: 4, blur: 12 }, { y: 8, blur: 16 }, { y: 12, blur: 20 }, { y: 16, blur: 24 }] },
        { level: "high", colorVar: "elevationLowest", oldLevel: "shadowHigh", layers: [{ y: 8, blur: 16 }, { y: 12, blur: 20 }, { y: 16, blur: 24 }, { y: 20, blur: 32 }] },
        { level: "higher", colorVar: "elevationLowest", oldLevel: "shadowHigher", layers: [{ y: 12, blur: 20 }, { y: 16, blur: 24 }, { y: 20, blur: 32 }, { y: 24, blur: 40 }] },
        { level: "highest", colorVar: "elevationLowest", oldLevel: "shadowHighest", layers: [{ y: 16, blur: 24 }, { y: 20, blur: 32 }, { y: 24, blur: 40 }, { y: 32, blur: 48 }] },
        { level: "max", colorVar: "elevationLowest", oldLevel: "shadowMax", layers: [{ y: 24, blur: 32 }, { y: 32, blur: 40 }, { y: 40, blur: 48 }, { y: 48, blur: 64 }] }
      ];
      const directions = ["bottom", "top"];
      for (const dir of directions) {
        for (const conf of elevationLevels) {
          const pascalDir = toPascalCase3(dir);
          const pascalLevel = toPascalCase3(conf.level);
          const styleName = `Elevation/${pascalDir}/${pascalLevel}`;
          const targetNorm = normalizePathForMatch(styleName);
          let effectStyle = localEffectStyles.find(
            (s) => s.name === styleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch(`elevation/${dir}/${conf.level}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`elevation/${dir}/${conf.oldLevel}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`shadow/${dir}/${conf.oldLevel}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`shadow/${dir}/${conf.level}`)
          );
          if (!effectStyle) {
            effectStyle = figma.createEffectStyle();
            effectStyle.name = styleName;
            localEffectStyles.push(effectStyle);
          } else {
            effectStyle.name = styleName;
          }
          const effDesc = `Semantic systematic elevation effect style: ${styleName}`;
          if (effectStyle.description !== effDesc) effectStyle.description = effDesc;
          const effects = [];
          for (const layer of conf.layers) {
            const colorAliasId = schemesMap.get(toPascalCase3(conf.colorVar)) || schemesMap.get(conf.colorVar);
            const rawY = dir === "top" ? -layer.y : layer.y;
            const rawBlur = layer.blur;
            const effectDef = {
              type: "DROP_SHADOW",
              color: { r: 0, g: 0, b: 0, a: 0.08 },
              offset: { x: 0, y: rawY },
              radius: rawBlur,
              spread: 0,
              blendMode: "NORMAL",
              visible: true,
              boundVariables: {}
            };
            if (colorAliasId) effectDef.boundVariables.color = { type: "VARIABLE_ALIAS", id: colorAliasId };
            effects.push(effectDef);
          }
          if (!areEffectsEqual(effectStyle.effects, effects)) {
            effectStyle.effects = effects;
          }
        }
      }
      {
        const focusStyleName = "_Other/Focus";
        const targetNorm = normalizePathForMatch(focusStyleName);
        let focusStyle = localEffectStyles.find(
          (s) => s.name === focusStyleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch("_other/focus") || normalizePathForMatch(s.name) === normalizePathForMatch("shadow/focus")
        );
        if (!focusStyle) {
          focusStyle = figma.createEffectStyle();
          focusStyle.name = focusStyleName;
          localEffectStyles.push(focusStyle);
        } else {
          focusStyle.name = focusStyleName;
        }
        if (focusStyle.description !== "Focus shadow style (focus ring)") {
          focusStyle.description = "Focus shadow style (focus ring)";
        }
        const colorAliasId = schemesMap.get("OutlineLow") || schemesMap.get("outlineLow");
        const effectDef = {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 1 },
          offset: { x: 0, y: 0 },
          radius: 0,
          spread: 3,
          blendMode: "NORMAL",
          visible: true,
          boundVariables: {}
        };
        if (colorAliasId) effectDef.boundVariables.color = { type: "VARIABLE_ALIAS", id: colorAliasId };
        if (!areEffectsEqual(focusStyle.effects, [effectDef])) {
          focusStyle.effects = [effectDef];
        }
      }
      const blurControlsCollectionName = "_BlursControls";
      let blurControlsCollection = collections.find((c) => c.name === blurControlsCollectionName || c.name === "_blursControls" || normalizePathForMatch(c.name) === "blurscontrols");
      if (blurControlsCollection) {
        if (blurControlsCollection.name !== blurControlsCollectionName) blurControlsCollection.name = blurControlsCollectionName;
      } else {
        blurControlsCollection = figma.variables.createVariableCollection(blurControlsCollectionName);
      }
      const blurControlsModesMap = ensureCollectionModes(blurControlsCollection, ["Default"]);
      const blurControlsModeId = blurControlsModesMap["Default"] || blurControlsModesMap["default"];
      const blurControlsMap = /* @__PURE__ */ new Map();
      const blurLevels = [
        { level: "blurLowest", blurValue: 4 },
        { level: "blurLower", blurValue: 6 },
        { level: "blurLow", blurValue: 8 },
        { level: "blurBase", blurValue: 12 },
        { level: "blurHigh", blurValue: 16 },
        { level: "blurHigher", blurValue: 24 },
        { level: "blurHighest", blurValue: 32 },
        { level: "blurMax", blurValue: 48 }
      ];
      for (const conf of blurLevels) {
        const groupName = toPascalCase3(conf.level.replace("blur", ""));
        const rawGroup = conf.level.replace("blur", "").toLowerCase();
        const blurVarName = `${groupName}/Blur`;
        let numVar = ensureVariable(blurVarName, blurControlsCollection, "FLOAT", varLookupMap, [`${rawGroup}/blur`, `${groupName}/Blur`]);
        smartSetVariableMeta(numVar, {
          description: `Structural blur dimension for ${blurVarName}.`,
          scopes: [],
          hiddenFromPublishing: true
        });
        const pxValue = conf.blurValue;
        smartSetValueForMode(numVar, blurControlsModeId, pxValue);
        trackVariable(blurControlsCollection.id, blurVarName);
        blurControlsMap.set(conf.level, numVar.id);
        blurControlsMap.set(groupName, numVar.id);
        const nameVarName = `${groupName}/Name`;
        let nameVar = ensureVariable(nameVarName, blurControlsCollection, "STRING", varLookupMap, [`${rawGroup}/name`, `${groupName}/Name`]);
        smartSetVariableMeta(nameVar, {
          description: `String identifier for blur level: ${blurVarName}.`,
          scopes: [],
          hiddenFromPublishing: true
        });
        smartSetValueForMode(nameVar, blurControlsModeId, toPascalCase3(conf.level));
        trackVariable(blurControlsCollection.id, nameVarName);
        const valueVarName = `${groupName}/Value`;
        let valueVar = ensureVariable(valueVarName, blurControlsCollection, "STRING", varLookupMap, [`${rawGroup}/value`, `${rawGroup}/radius`, `${groupName}/Value`]);
        smartSetVariableMeta(valueVar, {
          description: `String readout for blur value: ${blurVarName}.`,
          scopes: [],
          hiddenFromPublishing: true
        });
        smartSetValueForMode(valueVar, blurControlsModeId, `${pxValue}px`);
        trackVariable(blurControlsCollection.id, valueVarName);
      }
      const glassControlsCollectionName = "_GlassControls";
      let glassControlsCollection = collections.find((c) => c.name === glassControlsCollectionName || c.name === "_glassControls" || normalizePathForMatch(c.name) === "glasscontrols");
      if (glassControlsCollection) {
        if (glassControlsCollection.name !== glassControlsCollectionName) glassControlsCollection.name = glassControlsCollectionName;
      } else {
        glassControlsCollection = figma.variables.createVariableCollection(glassControlsCollectionName);
      }
      const glassControlsModesMap = ensureCollectionModes(glassControlsCollection, ["Default"]);
      const glassControlsModeId = glassControlsModesMap["Default"] || glassControlsModesMap["default"];
      const glassControlsMap = /* @__PURE__ */ new Map();
      const glassLevels = [
        { name: "lowest", frost: 8, ref: "px10", depth: "px5", disp: "px10", splay: "none", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassLowest"] },
        { name: "lower", frost: 9, ref: "px15", depth: "px8", disp: "px15", splay: "hairline", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassLower"] },
        { name: "low", frost: 10, ref: "px20", depth: "px10", disp: "px20", splay: "hairline", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassLow"] },
        { name: "base", frost: 12, ref: "px40", depth: "px20", disp: "px30", splay: "px2", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassBase"] },
        { name: "high", frost: 14, ref: "px60", depth: "px30", disp: "px40", splay: "px3", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassHigh"] },
        { name: "higher", frost: 16, ref: "px80", depth: "px40", disp: "px50", splay: "px4", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassHigher"] },
        { name: "highest", frost: 18, ref: "px100", depth: "px50", disp: "px60", splay: "px5", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassHighest"] },
        { name: "max", frost: 24, ref: "px120", depth: "px60", disp: "px80", splay: "px8", lightAngle: "minusPx45", lightOpacity: "px80", oldNames: ["glassMax"] }
      ];
      for (const glass of glassLevels) {
        const groupName = toPascalCase3(glass.name);
        const rawGroup = glass.name.toLowerCase();
        const createFloatAlias = (varName, valOrAliasId, legacyVarName) => {
          const pascalVarName = `${groupName}/${toPascalCase3(varName)}`;
          const oldVarNames = [
            `${rawGroup}/${varName}`,
            `${rawGroup}/${legacyVarName || varName}`,
            ...glass.oldNames ? glass.oldNames.map((on) => on.replace("glass", "").toLowerCase() + "/" + (legacyVarName || varName)) : []
          ];
          let numVar = ensureVariable(pascalVarName, glassControlsCollection, "FLOAT", varLookupMap, oldVarNames);
          smartSetVariableMeta(numVar, {
            description: `Structural glass dimension parameter: ${pascalVarName}.`,
            scopes: [],
            hiddenFromPublishing: true
          });
          if (typeof valOrAliasId === "string" && valOrAliasId.length > 20) {
            smartSetValueForMode(numVar, glassControlsModeId, { type: "VARIABLE_ALIAS", id: valOrAliasId });
          } else if (typeof valOrAliasId === "string") {
            smartSetValueForMode(numVar, glassControlsModeId, getStepRawValue(valOrAliasId));
          } else {
            smartSetValueForMode(numVar, glassControlsModeId, valOrAliasId);
          }
          trackVariable(glassControlsCollection.id, pascalVarName);
          return numVar;
        };
        createFloatAlias(`LightAngle`, glass.lightAngle, "light angle");
        createFloatAlias(`LightOpacity`, glass.lightOpacity, "light opacity");
        createFloatAlias(`Refraction`, glass.ref, "refraction");
        createFloatAlias(`Depth`, glass.depth, "depth");
        createFloatAlias(`Dispersion`, glass.disp, "dispersion");
        const frostVar = createFloatAlias(`Frost`, glass.frost, "frost");
        createFloatAlias(`Splay`, glass.splay, "splay");
        if (frostVar) {
          glassControlsMap.set(glass.name, frostVar.id);
          glassControlsMap.set(groupName, frostVar.id);
        }
        const createStringReadout = (varName, stepName, legacyVarName) => {
          const newName = `${groupName}/${toPascalCase3(varName)}`;
          const oldNames = [
            `${rawGroup}/${legacyVarName || varName}`,
            `${rawGroup}/${varName}`
          ];
          let strVar = ensureVariable(newName, glassControlsCollection, "STRING", varLookupMap, oldNames);
          smartSetVariableMeta(strVar, {
            description: `String readout for glass parameter: ${newName}.`,
            scopes: [],
            hiddenFromPublishing: true
          });
          if (stepName === "name") {
            const formattedName = "Glass" + toPascalCase3(glass.name);
            smartSetValueForMode(strVar, glassControlsModeId, formattedName);
          } else if (typeof stepName === "number") {
            smartSetValueForMode(strVar, glassControlsModeId, `${stepName}px`);
          } else if (typeof stepName === "string" && stepName.startsWith("blur")) {
            smartSetValueForMode(strVar, glassControlsModeId, toPascalCase3(stepName));
          } else if (stepName) {
            const pxValue = getStepRawValue(stepName);
            let suffix = "px";
            if (varName.toLowerCase().includes("opacity")) suffix = "%";
            if (varName.toLowerCase().includes("angle")) suffix = "\xB0";
            if (stepName === "none") {
              smartSetValueForMode(strVar, glassControlsModeId, "0px");
            } else {
              smartSetValueForMode(strVar, glassControlsModeId, `${pxValue}${suffix}`);
            }
          }
          trackVariable(glassControlsCollection.id, newName);
        };
        createStringReadout("NameText", "name", "name text");
        createStringReadout("LightAngleText", glass.lightAngle, "light angle text");
        createStringReadout("LightOpacityText", glass.lightOpacity, "light opacity text");
        createStringReadout("RefractionText", glass.ref, "refraction text");
        createStringReadout("DepthText", glass.depth, "depth text");
        createStringReadout("DispersionText", glass.disp, "dispersion text");
        createStringReadout("FrostText", glass.frost, "frost text");
        createStringReadout("SplayText", glass.splay, "splay text");
      }
      const blurTypes = [
        { prefix: "Blurs/Layer", rawPrefix: "blurs/layer", type: "LAYER_BLUR" },
        { prefix: "Blurs/Background", rawPrefix: "blurs/background", type: "BACKGROUND_BLUR" }
      ];
      for (const bType of blurTypes) {
        for (const conf of blurLevels) {
          const cleanLevel = toPascalCase3(conf.level.replace("blur", ""));
          const rawCleanLevel = conf.level.replace("blur", "").toLowerCase();
          const styleName = `${bType.prefix}/${cleanLevel}`;
          const targetNorm = normalizePathForMatch(styleName);
          let effectStyle = localEffectStyles.find(
            (s) => s.name === styleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch(`${bType.rawPrefix}/${rawCleanLevel}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`${bType.rawPrefix}/${conf.level}`)
          );
          if (!effectStyle) {
            effectStyle = figma.createEffectStyle();
            effectStyle.name = styleName;
            localEffectStyles.push(effectStyle);
          } else {
            effectStyle.name = styleName;
          }
          const blurDesc = `Semantic generic blur effect style: ${styleName}`;
          if (effectStyle.description !== blurDesc) effectStyle.description = blurDesc;
          const newEffects = [{
            type: bType.type,
            radius: conf.blurValue,
            visible: true,
            boundVariables: blurControlsMap.has(conf.level) || blurControlsMap.has(cleanLevel) ? {
              radius: { type: "VARIABLE_ALIAS", id: blurControlsMap.get(cleanLevel) || blurControlsMap.get(conf.level) }
            } : {}
          }];
          if (!areEffectsEqual(effectStyle.effects, newEffects)) {
            effectStyle.effects = newEffects;
          }
        }
      }
      for (const glass of glassLevels) {
        const pascalGlassName = toPascalCase3(glass.name);
        const styleName = `Glass/${pascalGlassName}`;
        const targetNorm = normalizePathForMatch(styleName);
        let effectStyle = localEffectStyles.find(
          (s) => s.name === styleName || normalizePathForMatch(s.name) === targetNorm || normalizePathForMatch(s.name) === normalizePathForMatch(`glass/${glass.name}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`glass/glass${glass.name.charAt(0).toUpperCase() + glass.name.slice(1)}`) || normalizePathForMatch(s.name) === normalizePathForMatch(`blurs/glass/${glass.name}`)
        );
        if (!effectStyle) {
          effectStyle = figma.createEffectStyle();
          effectStyle.name = styleName;
          localEffectStyles.push(effectStyle);
        } else {
          effectStyle.name = styleName;
        }
        const glassDesc = `Semantic glass effect style: ${styleName}`;
        if (effectStyle.description !== glassDesc) effectStyle.description = glassDesc;
        const lightAngleVal = getStepRawValue(glass.lightAngle);
        const lightOpacityVal = getStepRawValue(glass.lightOpacity);
        const refVal = getStepRawValue(glass.ref);
        const depthVal = getStepRawValue(glass.depth);
        const dispVal = getStepRawValue(glass.disp);
        const frostVal = typeof glass.frost === "number" ? glass.frost : getStepRawValue(glass.frost);
        const splayVal = getStepRawValue(glass.splay);
        const newGlassEffects = [{
          type: "GLASS",
          visible: true,
          lightAngle: lightAngleVal,
          lightIntensity: Math.min(1, Math.max(0, lightOpacityVal / 100)),
          refraction: Math.min(1, Math.max(0, refVal / 100)),
          depth: depthVal,
          dispersion: Math.min(1, Math.max(0, dispVal / 100)),
          radius: frostVal,
          splay: Math.min(1, Math.max(0, splayVal > 1 ? splayVal / 100 : splayVal))
        }];
        if (!areEffectsEqual(effectStyle.effects, newGlassEffects)) {
          effectStyle.effects = newGlassEffects;
        }
      }
      const typoControlsCollectionName = "_TypographyControls";
      let typoControlsCollection = collections.find((c) => c.name === typoControlsCollectionName || c.name === "_typographyControls" || normalizePathForMatch(c.name) === "typographycontrols");
      if (typoControlsCollection) {
        if (typoControlsCollection.name !== typoControlsCollectionName) typoControlsCollection.name = typoControlsCollectionName;
      } else {
        typoControlsCollection = figma.variables.createVariableCollection(typoControlsCollectionName);
      }
      const typoModesMap = ensureCollectionModes(typoControlsCollection, ["Default"]);
      const typoModeId = typoModesMap["Default"] || typoModesMap["default"];
      const createTypoString = (varName, value, scope, oldName) => {
        let strVar = ensureVariable(varName, typoControlsCollection, "STRING", varLookupMap, oldName);
        smartSetVariableMeta(strVar, {
          description: `Typography structural binding: ${varName}.`,
          scopes: scope ? [scope] : []
        });
        smartSetValueForMode(strVar, typoModeId, value);
        trackVariable(typoControlsCollection.id, varName);
        return strVar;
      };
      const headFontVar = createTypoString("FontFamily/Heading", headersFont, "FONT_FAMILY", ["fontFamily/header", "fontFamily/heading", "FontFamily/Heading"]);
      const bodyFontVar = createTypoString("FontFamily/Default", bodyFont, "FONT_FAMILY", ["fontFamily/body", "fontFamily/default", "FontFamily/Default"]);
      const headRegWeightVar = createTypoString("FontWeight/Heading/Base", loadedHeadReg, "FONT_STYLE", ["fontWeight/header/base", "fontWeight/heading/base", "FontWeight/Heading/Base"]);
      const headMedWeightVar = createTypoString("FontWeight/Heading/Medium", loadedHeadMed, "FONT_STYLE", ["fontWeight/header/medium", "fontWeight/heading/medium", "FontWeight/Heading/Medium"]);
      const headBoldWeightVar = createTypoString("FontWeight/Heading/Bold", loadedHeadBold, "FONT_STYLE", ["fontWeight/header/bold", "fontWeight/heading/bold", "FontWeight/Heading/Bold"]);
      const regWeightVar = createTypoString("FontWeight/Default/Base", loadedBodyReg, "FONT_STYLE", ["fontWeight/base", "fontWeight/regular", "fontWeight/default/base", "FontWeight/Default/Base"]);
      const medWeightVar = createTypoString("FontWeight/Default/Medium", loadedBodyMed, "FONT_STYLE", ["fontWeight/medium", "fontWeight/default/medium", "FontWeight/Default/Medium"]);
      const boldWeightVar = createTypoString("FontWeight/Default/Bold", loadedBodyBold, "FONT_STYLE", ["fontWeight/bold", "fontWeight/default/bold", "FontWeight/Default/Bold"]);
      const lsId_H = await resolveMetric(lsHeading, null, null);
      const lsId_D = await resolveMetric(lsDisplay, null, null);
      const lsId_O = await resolveMetric(lsOthers, null, null);
      const psId_D = await resolveMetric(psDisplay, null, null);
      const psId_O = await resolveMetric(psOthers, null, null);
      const piId_D = await resolveMetric(piDisplay, null, null);
      const piId_O = await resolveMetric(piOthers, null, null);
      const createTypoGlobal = (name, category, aliasId, fallbackValue, oldCategory) => {
        const pascalName = toPascalCase3(name);
        const pascalCat = toPascalCase3(category);
        const varName = `${pascalName}/${pascalCat}`;
        const oldVarNames = [
          `${name}/${category}`,
          `${pascalName}/${category}`,
          `${name}/${pascalCat}`
        ];
        if (oldCategory) {
          oldVarNames.push(`${name}/${oldCategory}`, `${pascalName}/${toPascalCase3(oldCategory)}`);
        }
        let v = ensureVariable(varName, metricsCol, "FLOAT", varLookupMap, oldVarNames);
        const val = parseFloat(fallbackValue) || 0;
        const scopeMap = {
          "LetterSpacing": "LETTER_SPACING",
          "ParagraphSpacing": "PARAGRAPH_SPACING",
          "ParagraphIndent": "PARAGRAPH_INDENT",
          "letterSpacing": "LETTER_SPACING",
          "paragraphSpacing": "PARAGRAPH_SPACING",
          "paragraphIndent": "PARAGRAPH_INDENT"
        };
        smartSetVariableMeta(v, {
          description: `Global typography ${varName}.`,
          scopes: [scopeMap[pascalName] || "LETTER_SPACING"]
        });
        if (mModeIds.default) smartSetValueForMode(v, mModeIds.default, val);
        trackVariable(metricsCol.id, varName);
        return v;
      };
      const lsHeadingVar = createTypoGlobal("LetterSpacing", "Heading", lsId_H, lsHeading);
      const lsDisplayVar = createTypoGlobal("LetterSpacing", "Display", lsId_D, lsDisplay);
      const lsOthersVar = createTypoGlobal("LetterSpacing", "Default", lsId_O, lsOthers, "others");
      const psDisplayVar = createTypoGlobal("ParagraphSpacing", "Heading", psId_D, psDisplay, "display");
      const piDisplayVar = createTypoGlobal("ParagraphIndent", "Heading", piId_D, piDisplay, "display");
      const psOthersVar = createTypoGlobal("ParagraphSpacing", "Default", psId_O, psOthers, "others");
      const piOthersVar = createTypoGlobal("ParagraphIndent", "Default", piId_O, piOthers, "others");
      const selectedBaseSize = parseInt(baseFontSize, 10) || 16;
      let headingLevels, displayLevels, headlineLevels, titleLevels, bodyLevels, labelLevels;
      let headingLhOffset = 16, displayLhOffset = 16, headlineLhOffset = 12, titleLhOffset = 12, bodyExplicitLh = 24, labelExplicitLh = 20;
      if (selectedBaseSize === 14) {
        headingLevels = [
          { name: "h1", s: 96 },
          { name: "h2", s: 88 },
          { name: "h3", s: 80 },
          { name: "h4", s: 72 },
          { name: "h5", s: 64 },
          { name: "h6", s: 56 }
        ];
        displayLevels = [
          { name: "mega", s: 48 },
          { name: "macro", s: 44 },
          { name: "huge", s: 40 },
          { name: "extraLarge", s: 36 },
          { name: "large", s: 32 },
          { name: "medium", s: 28 }
        ];
        headlineLevels = [
          { name: "large", s: 26 },
          { name: "medium", s: 24 },
          { name: "small", s: 20 }
        ];
        titleLevels = [
          { name: "large", s: 18 },
          { name: "medium", s: 16 },
          { name: "small", s: 15 }
        ];
        bodyLevels = [
          { name: "large", s: 14 },
          { name: "medium", s: 13 },
          { name: "small", s: 12, explicitLh: 18 }
        ];
        bodyExplicitLh = 20;
        labelLevels = [
          { name: "large", s: 11 },
          { name: "medium", s: 10, explicitLh: 14 },
          { name: "small", s: 9, explicitLh: 14 }
        ];
        labelExplicitLh = 16;
      } else if (selectedBaseSize === 18) {
        headingLevels = [
          { name: "h1", s: 112 },
          { name: "h2", s: 104 },
          { name: "h3", s: 96 },
          { name: "h4", s: 88 },
          { name: "h5", s: 80 },
          { name: "h6", s: 72 }
        ];
        displayLevels = [
          { name: "mega", s: 64 },
          { name: "macro", s: 60 },
          { name: "huge", s: 56 },
          { name: "extraLarge", s: 48 },
          { name: "large", s: 44 },
          { name: "medium", s: 40 }
        ];
        headlineLevels = [
          { name: "large", s: 36 },
          { name: "medium", s: 32 },
          { name: "small", s: 28 }
        ];
        titleLevels = [
          { name: "large", s: 24 },
          { name: "medium", s: 22 },
          { name: "small", s: 20 }
        ];
        bodyLevels = [
          { name: "large", s: 18 },
          { name: "medium", s: 16 },
          { name: "small", s: 14, explicitLh: 22 }
        ];
        bodyExplicitLh = 28;
        labelLevels = [
          { name: "large", s: 13 },
          { name: "medium", s: 12, explicitLh: 18 },
          { name: "small", s: 11, explicitLh: 16 }
        ];
        labelExplicitLh = 20;
      } else {
        headingLevels = [
          { name: "h1", s: 104 },
          { name: "h2", s: 96 },
          { name: "h3", s: 88 },
          { name: "h4", s: 80 },
          { name: "h5", s: 72 },
          { name: "h6", s: 64 }
        ];
        displayLevels = [
          { name: "mega", s: 56 },
          { name: "macro", s: 52 },
          { name: "huge", s: 48 },
          { name: "extraLarge", s: 44 },
          { name: "large", s: 40 },
          { name: "medium", s: 36 }
        ];
        headlineLevels = [
          { name: "large", s: 32 },
          { name: "medium", s: 28 },
          { name: "small", s: 24 }
        ];
        titleLevels = [
          { name: "large", s: 22 },
          { name: "medium", s: 20 },
          { name: "small", s: 18 }
        ];
        bodyLevels = [
          { name: "large", s: 16 },
          { name: "medium", s: 14 },
          { name: "small", s: 13, explicitLh: 20 }
        ];
        bodyExplicitLh = 24;
        labelLevels = [
          { name: "large", s: 12 },
          { name: "medium", s: 11, explicitLh: 16 },
          { name: "small", s: 10, explicitLh: 16 }
        ];
        labelExplicitLh = 20;
      }
      const headWeightConfigs = [
        { name: "Regular", styleName: loadedHeadReg, var: headRegWeightVar },
        { name: "Medium", styleName: loadedHeadMed, var: headMedWeightVar },
        { name: "Bold", styleName: loadedHeadBold, var: headBoldWeightVar }
      ];
      const bodyWeightConfigs = [
        { name: "Regular", styleName: loadedBodyReg, var: regWeightVar },
        { name: "Medium", styleName: loadedBodyMed, var: medWeightVar },
        { name: "Bold", styleName: loadedBodyBold, var: boldWeightVar }
      ];
      const typoScales = [
        { cat: "Heading", levels: headingLevels, fontVar: headFontVar, fontStr: headersFont, lhOffset: headingLhOffset, globalGroup: "heading", weightConfigs: headWeightConfigs, oldCat: "heading" },
        { cat: "Display", levels: displayLevels, fontVar: headFontVar, fontStr: headersFont, lhOffset: displayLhOffset, globalGroup: "display", weightConfigs: headWeightConfigs, oldCat: "display" },
        { cat: "Headline", levels: headlineLevels, fontVar: bodyFontVar, fontStr: bodyFont, lhOffset: headlineLhOffset, globalGroup: "default", weightConfigs: bodyWeightConfigs, oldCat: "headline" },
        { cat: "Title", levels: titleLevels, fontVar: bodyFontVar, fontStr: bodyFont, lhOffset: titleLhOffset, globalGroup: "default", weightConfigs: bodyWeightConfigs, oldCat: "title" },
        { cat: "Body", levels: bodyLevels, fontVar: bodyFontVar, fontStr: bodyFont, explicitLh: bodyExplicitLh, globalGroup: "default", weightConfigs: bodyWeightConfigs, oldCat: "body" },
        { cat: "Label", levels: labelLevels, fontVar: bodyFontVar, fontStr: bodyFont, explicitLh: labelExplicitLh, globalGroup: "default", weightConfigs: bodyWeightConfigs, oldCat: "label" }
      ];
      const localTextStyles = await figma.getLocalTextStylesAsync();
      const globalVarMap = {
        "heading": { ls: lsHeadingVar, lsVal: parseFloat(lsHeading) || 0, ps: psDisplayVar, psVal: parseFloat(psDisplay) || 0, pi: piDisplayVar, piVal: parseFloat(piDisplay) || 0 },
        "display": { ls: lsDisplayVar, lsVal: parseFloat(lsDisplay) || 0, ps: psDisplayVar, psVal: parseFloat(psDisplay) || 0, pi: piDisplayVar, piVal: parseFloat(piDisplay) || 0 },
        "default": { ls: lsOthersVar, lsVal: parseFloat(lsOthers) || 0, ps: psOthersVar, psVal: parseFloat(psOthers) || 0, pi: piOthersVar, piVal: parseFloat(piOthers) || 0 },
        "others": { ls: lsOthersVar, lsVal: parseFloat(lsOthers) || 0, ps: psOthersVar, psVal: parseFloat(psOthers) || 0, pi: piOthersVar, piVal: parseFloat(piOthers) || 0 }
      };
      for (const scale of typoScales) {
        let scaleMultiplierStr = "default";
        if (scale.cat === "Heading") {
          scaleMultiplierStr = lhHeading;
        } else if (scale.cat === "Display") {
          scaleMultiplierStr = lhDisplay;
        } else {
          scaleMultiplierStr = lhOthers;
        }
        for (const level of scale.levels) {
          let lhValue;
          const numMultiplier = parseFloat(scaleMultiplierStr);
          if (!isNaN(numMultiplier) && numMultiplier > 0 && scaleMultiplierStr !== "default" && scaleMultiplierStr !== "small" && scaleMultiplierStr !== "extra-small" && scaleMultiplierStr !== "extrasmall") {
            lhValue = Math.round(level.s * numMultiplier);
          } else {
            if (scale.cat === "Heading") {
              lhValue = Math.round(level.s * 1);
            } else if (scale.cat === "Display") {
              lhValue = level.s + 12;
            } else {
              if (scaleMultiplierStr === "small") {
                lhValue = level.s + 12;
              } else if (scaleMultiplierStr === "extra-small" || scaleMultiplierStr === "extrasmall") {
                lhValue = level.s + 8;
              } else {
                lhValue = level.s + 16;
              }
            }
          }
          if (lhValue % 2 !== 0) {
            lhValue -= 1;
          }
          const levelVal = toPascalCase3(level.name);
          const legacyLevelVal = level.name.toLowerCase();
          const szVarName = `FontSize/${scale.cat}/${levelVal}`;
          let szVar = ensureVariable(szVarName, metricsCol, "FLOAT", varLookupMap, [
            `fontSize/${scale.oldCat || scale.cat.toLowerCase()}/${legacyLevelVal}`,
            `fontSize/${scale.cat}/${levelVal}`
          ]);
          smartSetVariableMeta(szVar, {
            description: `Semantic typography size: ${scale.cat} ${levelVal}`,
            scopes: ["FONT_SIZE"]
          });
          if (mModeIds.default) smartSetValueForMode(szVar, mModeIds.default, level.s);
          trackVariable(metricsCol.id, szVarName);
          const lhVarName = `LineHeight/${scale.cat}/${levelVal}`;
          let lhVar = ensureVariable(lhVarName, metricsCol, "FLOAT", varLookupMap, [
            `lineHeight/${scale.oldCat || scale.cat.toLowerCase()}/${legacyLevelVal}`,
            `lineHeight/${scale.cat}/${levelVal}`
          ]);
          smartSetVariableMeta(lhVar, {
            description: `Semantic typography line height: ${scale.cat} ${levelVal}`,
            scopes: ["LINE_HEIGHT"]
          });
          if (mModeIds.default) smartSetValueForMode(lhVar, mModeIds.default, lhValue);
          trackVariable(metricsCol.id, lhVarName);
          createTypoString(`StyleNames/${scale.cat}/${levelVal}`, levelVal, null, [
            `styleNames/${scale.oldCat || scale.cat.toLowerCase()}/${legacyLevelVal}`,
            `styleNames/${scale.cat}/${levelVal}`
          ]);
          const globals = globalVarMap[scale.globalGroup];
          const isDisplayOrHeading = scale.cat === "Display" || scale.cat === "Heading";
          for (const wc of scale.weightConfigs) {
            const pascalWeight = toPascalCase3(wc.name);
            const configs = [
              { prefix: isDisplayOrHeading ? "" : "Default/", decoration: "NONE" }
            ];
            if (!isDisplayOrHeading) {
              configs.push({ prefix: "_Stylized/Underline/", decoration: "UNDERLINE" });
              configs.push({ prefix: "_Stylized/Strikethrough/", decoration: "STRIKETHROUGH" });
            }
            for (const cfg of configs) {
              const targetStyleName = `${cfg.prefix}${scale.cat}/${levelVal}/${pascalWeight}`;
              const targetNorm = normalizePathForMatch(targetStyleName);
              let tStyle = localTextStyles.find((s) => s.name === targetStyleName || normalizePathForMatch(s.name) === targetNorm);
              if (!tStyle && !isDisplayOrHeading && cfg.decoration === "NONE") {
                const oldStyleNorm = normalizePathForMatch(`${scale.oldCat || scale.cat}/${legacyLevelVal}/${wc.name}`);
                tStyle = localTextStyles.find((s) => normalizePathForMatch(s.name) === oldStyleNorm);
              }
              if (!tStyle && cfg.decoration === "UNDERLINE") {
                const oldUnderlineNorm = normalizePathForMatch(`underline/${scale.oldCat || scale.cat}/${legacyLevelVal}/${wc.name}`);
                tStyle = localTextStyles.find((s) => normalizePathForMatch(s.name) === oldUnderlineNorm);
              }
              if (tStyle) {
                if (tStyle.name !== targetStyleName) {
                  tStyle.name = targetStyleName;
                }
              } else {
                tStyle = figma.createTextStyle();
                tStyle.name = targetStyleName;
                localTextStyles.push(tStyle);
              }
              const decorationDesc = cfg.decoration !== "NONE" ? ` (${cfg.decoration.toLowerCase()})` : "";
              const targetDesc = `Semantic typography style: ${scale.cat} ${levelVal} (${pascalWeight})${decorationDesc}`;
              if (tStyle.description !== targetDesc) tStyle.description = targetDesc;
              if (!tStyle.fontName || tStyle.fontName.family !== scale.fontStr || tStyle.fontName.style !== wc.styleName) {
                tStyle.fontName = { family: scale.fontStr, style: wc.styleName };
              }
              const isFsBound = tStyle.boundVariables && tStyle.boundVariables.fontSize && tStyle.boundVariables.fontSize.id === szVar.id;
              if (!isFsBound && Math.abs((tStyle.fontSize || 0) - level.s) > 0.01) {
                tStyle.fontSize = level.s;
              }
              const isLhBound = tStyle.boundVariables && tStyle.boundVariables.lineHeight && tStyle.boundVariables.lineHeight.id === lhVar.id;
              if (!isLhBound && !isLineHeightEqual(tStyle.lineHeight, { value: lhValue, unit: "PIXELS" })) {
                tStyle.lineHeight = { value: lhValue, unit: "PIXELS" };
              }
              if (tStyle.textDecoration !== cfg.decoration) {
                tStyle.textDecoration = cfg.decoration;
              }
              const targetWrapStyle = isDisplayOrHeading ? targetWrapDisplay : targetWrapOthers;
              if ("textWrapStyle" in tStyle && tStyle.textWrapStyle !== targetWrapStyle) {
                try {
                  tStyle.textWrapStyle = targetWrapStyle;
                } catch (e) {
                  console.warn("Could not set textWrapStyle on style:", e);
                }
              }
              const targetLsVal = globals.lsVal !== void 0 ? globals.lsVal : 0;
              const isLsBound = tStyle.boundVariables && tStyle.boundVariables.letterSpacing && tStyle.boundVariables.letterSpacing.id === globals.ls.id;
              if (!tStyle.letterSpacing || tStyle.letterSpacing.unit !== "PIXELS") {
                tStyle.letterSpacing = { value: targetLsVal, unit: "PIXELS" };
              } else if (!isLsBound && Math.abs((tStyle.letterSpacing.value || 0) - targetLsVal) > 0.01) {
                tStyle.letterSpacing = { value: targetLsVal, unit: "PIXELS" };
              }
              smartSetBoundVariable(tStyle, "fontFamily", scale.fontVar);
              smartSetBoundVariable(tStyle, "fontStyle", wc.var);
              smartSetBoundVariable(tStyle, "fontSize", szVar);
              smartSetBoundVariable(tStyle, "lineHeight", lhVar);
              smartSetBoundVariable(tStyle, "letterSpacing", globals.ls);
              smartSetBoundVariable(tStyle, "paragraphSpacing", globals.ps);
              smartSetBoundVariable(tStyle, "paragraphIndent", globals.pi);
            }
          }
        }
      }
      const oldInternalCol = collections.find((c) => c.name === "_layoutControls" || c.name === "_LayoutControls");
      if (oldInternalCol) oldInternalCol.remove();
      const layoutColName = "Layout";
      let layoutCollection = collections.find((c) => c.name === layoutColName || c.name === "layout" || c.name === "_layout" || normalizePathForMatch(c.name) === "layout");
      if (layoutCollection) {
        if (layoutCollection.name !== layoutColName) layoutCollection.name = layoutColName;
      } else {
        layoutCollection = figma.variables.createVariableCollection(layoutColName);
      }
      const layoutModesMap = ensureCollectionModes(layoutCollection, ["SM", "MD", "LG", "XL", "2XL"]);
      const m_xl = Math.max(32, Math.min(parseInt(layoutMarginXl, 10) || 72, 200));
      const m_lg = layoutMarginLg !== null && layoutMarginLg !== void 0 ? Math.max(16, Math.min(parseInt(layoutMarginLg, 10), 200)) : Math.round(m_xl * (1366 / 1536));
      const m_2xl = layoutMargin2xl !== null && layoutMargin2xl !== void 0 ? Math.max(32, Math.min(parseInt(layoutMargin2xl, 10), 300)) : Math.round(m_xl * (1920 / 1536));
      const layoutConfigs = [
        { name: "2XL", oldName: "2xl", platform: "Desktop", range: ">= 1920", count: 16, margin: m_2xl, gutter: 16, maxWidth: 1920, maxHeight: 1080, maxElementWidth: 640 },
        { name: "XL", oldName: "xl", platform: "Desktop", range: "1536 - 1919", count: 16, margin: m_xl, gutter: 16, maxWidth: 1536, maxHeight: 960, maxElementWidth: 640 },
        { name: "LG", oldName: "lg", platform: "Desktop", range: "801 - 1535", count: 12, margin: m_lg, gutter: 16, maxWidth: 1366, maxHeight: 768, maxElementWidth: 560 },
        { name: "MD", oldName: "md", platform: "Tablet", range: "441 - 800", count: 8, margin: 32, gutter: 16, maxWidth: 800, maxHeight: 1280, maxElementWidth: 480 },
        { name: "SM", oldName: "sm", platform: "Mobile", range: "<= 393", count: 4, margin: 16, gutter: 16, maxWidth: 393, maxHeight: 852, maxElementWidth: 361 }
      ];
      const localGridStyles = await figma.getLocalGridStylesAsync();
      const layoutVarsMap = {};
      const varSpecs = [
        { name: "Layout", type: "STRING", oldName: ["layout", "Layout"], hidden: false, scopes: ["ALL_SCOPES"], description: "Layout mode name identifier." },
        { name: "Platform", type: "STRING", oldName: ["platform", "Platform", "platfform", "Platfform"], hidden: false, scopes: ["ALL_SCOPES"], description: "Layout platform category (Mobile, Tablet, Desktop)." },
        { name: "Visibility/Mobile", type: "BOOLEAN", oldName: ["visibility/mobile", "Visibility/Mobile", "isMobile", "IsMobile", "mobile", "Mobile", "Visible/Mobile", "visible/mobile"], hidden: false, scopes: ["ALL_SCOPES"], description: "Element visibility on Mobile layout." },
        { name: "Visibility/Tablet", type: "BOOLEAN", oldName: ["visibility/tablet", "Visibility/Tablet", "isTablet", "IsTablet", "tablet", "Tablet", "Visible/Tablet", "visible/tablet"], hidden: false, scopes: ["ALL_SCOPES"], description: "Element visibility on Tablet layout." },
        { name: "Visibility/Desktop", type: "BOOLEAN", oldName: ["visibility/desktop", "Visibility/Desktop", "isDesktop", "IsDesktop", "desktop", "Desktop", "Visible/Desktop", "visible/desktop"], hidden: false, scopes: ["ALL_SCOPES"], description: "Element visibility on Desktop layout." },
        { name: "Columns", type: "FLOAT", oldName: ["columns", "Columns"], hidden: true, scopes: [] },
        { name: "Gutter", oldName: ["gutter", "Gutter"], hidden: true, scopes: [] },
        { name: "Margin", oldName: ["margin", "Margin"], hidden: true, scopes: [] },
        { name: "MaxWidth/Screen", oldName: ["maxWidth/screen", "MaxWidth/Screen"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MaxHeight/Screen", oldName: ["maxHeight/screen", "MaxHeight/Screen"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MaxWidth/Content", oldName: ["maxWidth/content", "MaxWidth/Content"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinWidth/Element", oldName: ["minWidth/element", "MinWidth/Element"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MaxWidth/Element", oldName: ["maxWidth/element", "MaxWidth/Element"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/ExtraSmall", oldName: ["min-max/extraSmall", "MinMax/ExtraSmall", "minMax/extraSmall"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Small", oldName: ["min-max/small", "MinMax/Small", "minMax/small"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Base", oldName: ["min-max/base", "min-max/regular", "MinMax/Base", "minMax/base"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Medium", oldName: ["min-max/medium", "MinMax/Medium", "minMax/medium"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Large", oldName: ["min-max/large", "MinMax/Large", "minMax/large"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/ExtraLarge", oldName: ["min-max/extraLarge", "MinMax/ExtraLarge", "minMax/extraLarge"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Huge", oldName: ["min-max/huge", "MinMax/Huge", "minMax/huge"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/ExtraHuge", oldName: ["min-max/extraHuge", "MinMax/ExtraHuge", "minMax/extraHuge", "min-max/semiExtraHuge", "MinMax/SemiExtraHuge", "min-max/semi-extra-huge"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Massive", oldName: ["min-max/massive", "MinMax/Massive", "minMax/massive"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Gigantic", oldName: ["min-max/gigantic", "MinMax/Gigantic", "minMax/gigantic"], hidden: false, scopes: ["WIDTH_HEIGHT"] },
        { name: "MinMax/Colossal", oldName: ["min-max/colossal", "MinMax/Colossal", "minMax/colossal"], hidden: false, scopes: ["WIDTH_HEIGHT"] }
      ];
      for (const spec of varSpecs) {
        const oldVar = allLocalVars.find((iv) => (iv.name === spec.name || spec.oldName && (Array.isArray(spec.oldName) ? spec.oldName.includes(iv.name) : iv.name === spec.oldName) || normalizePathForMatch(iv.name) === normalizePathForMatch(spec.name)) && iv.variableCollectionId !== layoutCollection.id);
        const oldId = oldVar ? oldVar.id : null;
        let v = ensureVariable(spec.name, layoutCollection, spec.type || "FLOAT", varLookupMap, spec.oldName);
        smartSetVariableMeta(v, {
          description: spec.description || `Layout ${spec.name} property.`,
          hiddenFromPublishing: spec.hidden,
          scopes: spec.scopes
        });
        trackVariable(layoutCollection.id, spec.name);
        layoutVarsMap[spec.name] = v;
        if (spec.oldName) {
          const oldList = Array.isArray(spec.oldName) ? spec.oldName : [spec.oldName];
          for (const on of oldList) {
            layoutVarsMap[on] = v;
          }
        }
        if (oldId && oldId !== v.id) {
          for (const lVar of allLocalVars) {
            if (lVar.id === oldId || lVar.removed) continue;
            for (const modeKey of Object.keys(lVar.valuesByMode || {})) {
              const val = lVar.valuesByMode[modeKey];
              if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS" && val.id === oldId) {
                smartSetValueForMode(lVar, modeKey, { type: "VARIABLE_ALIAS", id: v.id });
              }
            }
          }
          oldVar.remove();
        }
      }
      for (const conf of layoutConfigs) {
        const modeId = layoutModesMap[conf.name] || layoutModesMap[conf.oldName];
        if (!modeId) continue;
        if (layoutVarsMap["Layout"]) {
          smartSetValueForMode(layoutVarsMap["Layout"], modeId, conf.name);
        }
        if (layoutVarsMap["Platform"]) {
          smartSetValueForMode(layoutVarsMap["Platform"], modeId, conf.platform);
        }
        if (layoutVarsMap["Visibility/Mobile"]) {
          smartSetValueForMode(layoutVarsMap["Visibility/Mobile"], modeId, conf.platform === "Mobile");
        }
        if (layoutVarsMap["Visibility/Tablet"]) {
          smartSetValueForMode(layoutVarsMap["Visibility/Tablet"], modeId, conf.platform === "Tablet");
        }
        if (layoutVarsMap["Visibility/Desktop"]) {
          smartSetValueForMode(layoutVarsMap["Visibility/Desktop"], modeId, conf.platform === "Desktop");
        }
        const countAlias = await resolveMetric(conf.count, null, null);
        smartSetValueForMode(layoutVarsMap["Columns"], modeId, countAlias ? { type: "VARIABLE_ALIAS", id: countAlias } : conf.count);
        const marginAlias = await resolveMetric(conf.margin, null, null);
        smartSetValueForMode(layoutVarsMap["Margin"], modeId, marginAlias ? { type: "VARIABLE_ALIAS", id: marginAlias } : conf.margin);
        const gutterAlias = await resolveMetric(conf.gutter, null, null);
        smartSetValueForMode(layoutVarsMap["Gutter"], modeId, gutterAlias ? { type: "VARIABLE_ALIAS", id: gutterAlias } : conf.gutter);
        const maxWidthAlias = await resolveMetric(conf.maxWidth, null, null);
        smartSetValueForMode(layoutVarsMap["MaxWidth/Screen"], modeId, maxWidthAlias ? { type: "VARIABLE_ALIAS", id: maxWidthAlias } : conf.maxWidth);
        const maxHeightAlias = await resolveMetric(conf.maxHeight, null, null);
        smartSetValueForMode(layoutVarsMap["MaxHeight/Screen"], modeId, maxHeightAlias ? { type: "VARIABLE_ALIAS", id: maxHeightAlias } : conf.maxHeight);
        const contentWidth = conf.maxWidth - 2 * conf.margin;
        smartSetValueForMode(layoutVarsMap["MaxWidth/Content"], modeId, contentWidth);
        smartSetValueForMode(layoutVarsMap["MinWidth/Element"], modeId, 328);
        smartSetValueForMode(layoutVarsMap["MaxWidth/Element"], modeId, conf.maxElementWidth);
        smartSetValueForMode(layoutVarsMap["MinMax/ExtraSmall"], modeId, 16);
        smartSetValueForMode(layoutVarsMap["MinMax/Small"], modeId, 20);
        smartSetValueForMode(layoutVarsMap["MinMax/Base"], modeId, 24);
        smartSetValueForMode(layoutVarsMap["MinMax/Medium"], modeId, 32);
        smartSetValueForMode(layoutVarsMap["MinMax/Large"], modeId, 44);
        smartSetValueForMode(layoutVarsMap["MinMax/ExtraLarge"], modeId, 48);
        smartSetValueForMode(layoutVarsMap["MinMax/Huge"], modeId, 56);
        smartSetValueForMode(layoutVarsMap["MinMax/ExtraHuge"], modeId, 64);
        smartSetValueForMode(layoutVarsMap["MinMax/Massive"], modeId, 112);
        smartSetValueForMode(layoutVarsMap["MinMax/Gigantic"], modeId, 128);
        smartSetValueForMode(layoutVarsMap["MinMax/Colossal"], modeId, 144);
      }
      const mainStyleName = "Layout/Main";
      const mainStyleNorm = normalizePathForMatch(mainStyleName);
      let mainGridStyle = localGridStyles.find((s) => s.name === mainStyleName || normalizePathForMatch(s.name) === mainStyleNorm);
      if (mainGridStyle) {
        if (mainGridStyle.name !== mainStyleName) mainGridStyle.name = mainStyleName;
      } else {
        mainGridStyle = figma.createGridStyle();
        mainGridStyle.name = mainStyleName;
      }
      mainGridStyle.description = "Main layout style. Responsive to Frame's layout mode (sm/md/lg/xl/2xl).";
      const xlConf = layoutConfigs.find((c) => c.name === "XL" || c.name === "xl") || layoutConfigs[0];
      let layoutGrid = {
        pattern: "COLUMNS",
        alignment: "STRETCH",
        count: xlConf.count,
        gutterSize: xlConf.gutter,
        offset: xlConf.margin,
        color: { r: 1, g: 0.2, b: 0.2, a: 0.1 },
        visible: true
      };
      layoutGrid = figma.variables.setBoundVariableForLayoutGrid(layoutGrid, "count", layoutVarsMap["Columns"]);
      layoutGrid = figma.variables.setBoundVariableForLayoutGrid(layoutGrid, "offset", layoutVarsMap["Margin"]);
      layoutGrid = figma.variables.setBoundVariableForLayoutGrid(layoutGrid, "gutterSize", layoutVarsMap["Gutter"]);
      mainGridStyle.layoutGrids = [layoutGrid];
      const finalCollections = await figma.variables.getLocalVariableCollectionsAsync();
      const hideCount = { vars: 0, cols: 0, deleted: 0 };
      const freshAllLocalVars = await figma.variables.getLocalVariablesAsync();
      for (const [colId, validNames] of activeVariableNames) {
        const varsInCol = freshAllLocalVars.filter((v) => v.variableCollectionId === colId);
        for (const v of varsInCol) {
          if ((!validNames.has(v.name) || v.name.startsWith("__temp__")) && !v.removed) {
            v.remove();
            hideCount.deleted++;
          }
        }
      }
      for (const col of finalCollections) {
        if (col.name.startsWith("_")) {
          hideCount.cols++;
          const currentVars = freshAllLocalVars.filter((v) => v.variableCollectionId === col.id && !v.removed);
          for (const v of currentVars) {
            if (v.scopes.length > 0 || !v.hiddenFromPublishing) {
              v.scopes = [];
              v.hiddenFromPublishing = true;
              hideCount.vars++;
            }
          }
        }
      }
      figma.notify(`Done! Cleaned up ${hideCount.deleted} obsolete variables. ${hideCount.vars} internal variables hidden.`);
      try {
        await exportVariablesToJson({ autoSync: true, silent: true });
      } catch (autoExportErr) {
        console.warn("Auto-export to bridge failed:", autoExportErr);
      }
    } catch (err) {
      console.error(err);
      figma.notify("Error: " + err.message);
    }
  }

  // ../../../../plugins/components-setup/src/main.ts
  var currentPluginMode = "components";
  async function launchPluginMode(mode) {
    currentPluginMode = mode;
    try {
      await figma.clientStorage.setAsync("last_active_plugin_mode", mode);
    } catch (e) {
    }
    const html = typeof __uiFiles__ !== "undefined" && __uiFiles__ && __uiFiles__[mode] ? __uiFiles__[mode] : __html__;
    if (mode === "generator") {
      figma.showUI(html, { width: 640, height: 1024, themeColors: true });
      figma.ui.onmessage = handleUiMessage;
      await initDsGeneratorUI();
    } else {
      figma.showUI(html, { width: 640, height: 1024, themeColors: true });
      figma.ui.onmessage = handleUiMessage;
      sendInitialData();
      sendSmartSwapSelectionToUI();
    }
  }
  figma.on("selectionchange", () => {
    if (currentPluginMode === "components") {
      sendSelectionToUI();
      sendSmartSwapSelectionToUI();
    }
  });
  figma.on("currentpagechange", () => {
    if (currentPluginMode === "components") {
      sendSelectionToUI();
      sendSmartSwapSelectionToUI();
    }
  });
  function resolveSyncTargetName(selection) {
    if (selection.length === 0) return null;
    let curr = selection[0];
    let bestNode = selection[0];
    while (curr && curr.type !== "PAGE") {
      if (curr.type === "COMPONENT_SET") {
        bestNode = curr;
        break;
      }
      if (curr.type === "COMPONENT" && bestNode.type !== "COMPONENT_SET") {
        bestNode = curr;
      }
      curr = curr.parent;
    }
    const cleanName = bestNode.name.trim();
    return cleanName ? `<${cleanName}/>` : null;
  }
  function hasComponentSetInSelection(selection) {
    for (const node of selection) {
      let curr = node;
      while (curr && curr.type !== "PAGE") {
        if (curr.type === "COMPONENT_SET") return true;
        curr = curr.parent;
      }
    }
    return false;
  }
  async function sendSmartSwapSelectionToUI() {
    const selection = figma.currentPage.selection;
    const items = selection.map((n) => ({ id: n.id, name: n.name, type: n.type }));
    const nodeTypes = selection.map((n) => n.type);
    const isOnLibraryPage = isLibraryComponentsPage(figma.currentPage);
    const hasComponentSet = hasComponentSetInSelection(selection);
    const syncTargetName = resolveSyncTargetName(selection);
    let suggestedSource = null;
    let suggestedTemplate = null;
    let matchStats = null;
    if (selection.length >= 2) {
      const compIdx = selection.findIndex((n) => n.type === "COMPONENT" || n.type === "COMPONENT_SET");
      const instIdx = selection.findIndex((n) => n.type === "INSTANCE");
      let templateNode = null;
      let sourceNodes = [];
      if (compIdx !== -1) {
        templateNode = selection[compIdx];
        sourceNodes = selection.filter((_, i) => i !== compIdx);
      } else if (instIdx !== -1) {
        templateNode = selection[instIdx];
        sourceNodes = selection.filter((_, i) => i !== instIdx);
      } else {
        templateNode = selection[selection.length - 1];
        sourceNodes = selection.slice(0, selection.length - 1);
      }
      if (templateNode && sourceNodes.length > 0) {
        suggestedTemplate = { id: templateNode.id, name: templateNode.name, type: templateNode.type };
        suggestedSource = { id: sourceNodes[0].id, name: sourceNodes[0].name, type: sourceNodes[0].type };
        try {
          matchStats = await calculateMatchStats(sourceNodes[0], templateNode);
        } catch (e) {
        }
      }
    } else if (selection.length === 1) {
      const single = selection[0];
      if (single.type === "COMPONENT" || single.type === "COMPONENT_SET") {
        suggestedTemplate = { id: single.id, name: single.name, type: single.type };
      } else {
        suggestedSource = { id: single.id, name: single.name, type: single.type };
      }
    }
    figma.ui.postMessage({
      type: "smart-swap-selection-update",
      count: selection.length,
      nodeTypes,
      isOnLibraryPage,
      hasComponentSet,
      syncTargetName,
      items,
      suggestedSource,
      suggestedTemplate,
      matchStats
    });
  }
  var handleUiMessage = async (msg) => {
    var _a, _b;
    if (msg.type === "switch-plugin-mode") {
      const targetMode = msg.mode === "generator" ? "generator" : "components";
      await launchPluginMode(targetMode);
      return;
    } else if (msg.type === "resize") {
      figma.ui.resize(640, 1024);
      return;
    } else if (msg.type === "export-variables") {
      await exportVariablesToJson({ autoSync: false, silent: false });
      return;
    } else if (msg.type === "update-modes") {
      try {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const allVars = await figma.variables.getLocalVariablesAsync();
        const count = updateExistingCollectionModes(cols);
        ensureLayoutStringVariable(cols, allVars);
        figma.notify(`Zaktualizowano ${count} tryb\xF3w (modes) w kolekcjach na PascalCase / ALLCAPS. \u2728`);
      } catch (err) {
        figma.notify("Error updating modes: " + err.message, { error: true });
      }
      return;
    } else if (msg.type === "create-palette") {
      await handleCreatePalette(msg);
      return;
    }
    if (msg.type === "set-tokens") {
      if (msg.tokens) {
        dsRegistry.updateTokens(msg.tokens);
      }
    } else if (msg.type === "scan") {
      await scanDocument(msg.scope || "page");
    } else if (msg.type === "audit-tokens") {
      await runAuditTokens(msg.scope || "selection");
    } else if (msg.type === "toggle-audit-ignore") {
      const nodeIds = Array.isArray(msg.nodeIds) ? msg.nodeIds : msg.nodeId ? [msg.nodeId] : [];
      const category = msg.category || "";
      const property = msg.property || "";
      const ignored = !!msg.ignored;
      for (const id of nodeIds) {
        try {
          const node = await figma.getNodeByIdAsync(id);
          if (node && "getPluginData" in node) {
            setNodeAuditIgnored(node, category, property, ignored);
          }
        } catch (err) {
          console.warn("Failed to update ignored audit status for node", id, err);
        }
      }
      const count = nodeIds.length;
      const msgText = ignored ? `Zignorowano problem (${category}) dla ${count} warstw${count === 1 ? "y" : ""} (zapisano w pliku) \u{1F441}\uFE0F` : `Przywr\xF3cono problem (${category}) dla ${count} warstw${count === 1 ? "y" : ""} \u21A9\uFE0F`;
      figma.notify(msgText);
      await runAuditTokens(msg.scope || "selection");
    } else if (msg.type === "restore-all-audit-ignored") {
      const nodeIds = Array.isArray(msg.nodeIds) ? msg.nodeIds : [];
      for (const id of nodeIds) {
        try {
          const node = await figma.getNodeByIdAsync(id);
          if (node && "setPluginData" in node) {
            node.setPluginData("ignored_audit_issues", JSON.stringify([]));
          }
        } catch (e) {
        }
      }
      figma.notify(`Przywr\xF3cono wszystkie zignorowane regu\u0142y (${nodeIds.length} warstw) \u21A9\uFE0F`);
      await runAuditTokens(msg.scope || "selection");
    } else if (msg.type === "arrange-grid") {
      await organizeElementsOnCanvas();
    } else if (msg.type === "generate-component") {
      await handleGenerateComponent(msg.schema, msg.force);
    } else if (msg.type === "generate-preset") {
      await handleGeneratePreset(msg.presetName, msg.force);
    } else if (msg.type === "open-sync-components-modal") {
      try {
        const selection = figma.currentPage.selection;
        const roots = findExportableComponentsAndSets(selection);
        const validRoots = roots.filter((n) => !n.removed && isNodeOnCurrentPage(n));
        if (!validRoots || validRoots.length === 0) {
          figma.notify("Nie znaleziono komponent\xF3w ani Component Set\xF3w w zaznaczeniu ani na stronie.", { error: true });
          return;
        }
        try {
          figma.currentPage.selection = validRoots;
          if (validRoots.length > 0) {
            figma.viewport.scrollAndZoomIntoView(validRoots);
          }
        } catch (selErr) {
          console.warn("[Sync] Could not set canvas selection:", selErr);
        }
        const items = validRoots.map((node) => {
          const isSet = node.type === "COMPONENT_SET";
          let vCount = 1;
          try {
            if (isSet) {
              vCount = node.children.filter((c) => c.type === "COMPONENT").length;
            }
          } catch (e) {
          }
          const parentName = node.parent && node.parent.type !== "PAGE" ? node.parent.name : "";
          const isPrivate = node.name.startsWith("_") || node.name.startsWith(".");
          let description = "";
          try {
            description = node.description || "";
          } catch (e) {
          }
          return {
            id: node.id,
            name: node.name,
            type: node.type,
            variantsCount: vCount,
            parentPath: parentName,
            isPrivate,
            description
          };
        });
        figma.ui.postMessage({
          type: "sync-components-list",
          items
        });
      } catch (err) {
        console.error("[Sync] Error in open-sync-components-modal:", err);
        figma.notify(`B\u0142\u0105d otwierania listy: ${err && err.message ? err.message : String(err)}`, { error: true });
      }
    } else if (msg.type === "sync-selection-from-ui") {
      try {
        const ids = msg.nodeIds || [];
        const nodesToSelect = [];
        for (const id of ids) {
          const node = await figma.getNodeByIdAsync(id);
          if (node && "visible" in node && !node.removed && isNodeOnCurrentPage(node)) {
            nodesToSelect.push(node);
          }
        }
        figma.currentPage.selection = nodesToSelect;
      } catch (err) {
        console.warn("[Sync] Error syncing selection from UI:", err);
      }
    } else if (msg.type === "focus-sync-node") {
      try {
        if (msg.nodeId) {
          const node = await figma.getNodeByIdAsync(msg.nodeId);
          if (node && "visible" in node && !node.removed && isNodeOnCurrentPage(node)) {
            figma.viewport.scrollAndZoomIntoView([node]);
          }
        }
      } catch (err) {
        console.warn("[Sync] Error focusing node:", err);
      }
    } else if (msg.type === "export-nodes-by-ids") {
      try {
        const ids = msg.nodeIds || [];
        const roots = [];
        for (const id of ids) {
          const node = await figma.getNodeByIdAsync(id);
          if (node && "visible" in node && !node.removed && isNodeOnCurrentPage(node)) {
            roots.push(node);
          }
        }
        if (roots.length === 0) {
          figma.notify("Nie wybrano \u017Cadnego komponentu do eksportu.", { error: true });
          return;
        }
        try {
          figma.currentPage.selection = roots;
        } catch (e) {
        }
        await exportNodesToCode(roots);
      } catch (err) {
        console.error("[Export] Error:", err);
        figma.notify(`Export failed: ${err && err.message ? err.message : String(err)}`, { error: true });
      }
    } else if (msg.type === "export-selected-to-code") {
      try {
        const selection = figma.currentPage.selection;
        const roots = findExportableComponentsAndSets(selection);
        const validRoots = roots.filter((n) => !n.removed && isNodeOnCurrentPage(n));
        if (!validRoots || validRoots.length === 0) {
          figma.notify("Please select a component or frame to export code.", { error: true });
          return;
        }
        await exportNodesToCode(validRoots);
      } catch (err) {
        console.error("[Export] Error:", err);
        figma.notify(`Export failed: ${err && err.message ? err.message : String(err)}`, { error: true });
      }
    } else if (msg.type === "resize-window") {
      figma.ui.resize(640, 1024);
    } else if (msg.type === "move-to-components-page") {
      await moveSelectedToComponentsPage();
      sendSmartSwapSelectionToUI();
    } else if (msg.type === "organize-and-library") {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        await organizeElementsOnCanvas(true);
      } else if (!isLibraryComponentsPage(figma.currentPage)) {
        await moveSelectedToComponentsPage();
      } else {
        await organizeElementsOnCanvas(false);
      }
      sendSmartSwapSelectionToUI();
    } else if (msg.type === "get-selection") {
      sendSelectionToUI();
      sendSmartSwapSelectionToUI();
    } else if (msg.type === "select-nodes") {
      const ids = msg.nodeIds || [];
      const nodesToSelect = [];
      for (const id of ids) {
        const node = await figma.getNodeByIdAsync(id);
        if (node && "visible" in node) {
          nodesToSelect.push(node);
        }
      }
      if (nodesToSelect.length > 0) {
        const firstNode = nodesToSelect[0];
        let parent = firstNode;
        while (parent && parent.type !== "PAGE") {
          parent = parent.parent;
        }
        if (parent && parent.type === "PAGE" && figma.currentPage !== parent) {
          figma.currentPage = parent;
        }
        figma.currentPage.selection = nodesToSelect;
        figma.viewport.scrollAndZoomIntoView(nodesToSelect);
        figma.notify(`Selected ${nodesToSelect.length} layer${nodesToSelect.length > 1 ? "s" : ""}`);
      } else {
        figma.notify("Selected layers no longer exist on canvas", { error: true });
      }
    } else if (msg.type === "run-smart-setup") {
      const selection = figma.currentPage.selection;
      const isSet = hasComponentSetInSelection(selection);
      if (isSet && msg.setMode === "set-only") {
        await runSetupComponentSetHorizontalLogic();
      } else {
        await runComponentSetLogic();
      }
    } else if (msg.type === "run-component-set") {
      await runComponentSetLogic();
    } else if (msg.type === "run-component-set-horizontal") {
      await runSetupComponentSetHorizontalLogic();
    } else if (msg.type === "rename-pascal-case") {
      await runRenamePascalCaseLogic();
    } else if (msg.type === "save-description") {
      const descText = typeof msg.description === "string" ? msg.description.trim() : "";
      if (!descText) {
        figma.notify("Description is empty.", { error: true });
        return;
      }
      let normalizedMarkdown = descText;
      if ("util" in figma && typeof ((_a = figma.util) == null ? void 0 : _a.normalizeMarkdown) === "function") {
        try {
          normalizedMarkdown = figma.util.normalizeMarkdown(descText);
        } catch (e) {
          console.warn("Markdown normalization error:", e);
        }
      }
      const targetsToUpdate = /* @__PURE__ */ new Set();
      const resolveTargetNodes = (node) => {
        if (!node) return;
        let curr = node;
        while (curr) {
          if (curr.type === "COMPONENT_SET") {
            targetsToUpdate.add(curr);
            break;
          }
          if (curr.type === "COMPONENT") {
            targetsToUpdate.add(curr);
            break;
          }
          if (curr.type === "INSTANCE") {
            const main = curr.mainComponent;
            if (main) {
              targetsToUpdate.add(main);
            }
            break;
          }
          curr = curr.parent;
        }
      };
      if (msg.nodeId) {
        try {
          const node = await figma.getNodeByIdAsync(msg.nodeId);
          resolveTargetNodes(node);
        } catch (err) {
          console.warn("Error fetching node by id:", err);
        }
      }
      if (targetsToUpdate.size === 0) {
        for (const selNode of figma.currentPage.selection) {
          resolveTargetNodes(selNode);
        }
      }
      let updatedCount = 0;
      for (const target of targetsToUpdate) {
        try {
          if ("description" in target) {
            target.description = descText;
          }
          if ("descriptionMarkdown" in target) {
            target.descriptionMarkdown = normalizedMarkdown;
          }
          if (msg.documentationLink && "documentationLinks" in target) {
            try {
              target.documentationLinks = [{ uri: msg.documentationLink }];
            } catch (linkErr) {
              console.warn("Could not set documentationLink on:", target.name, linkErr);
            }
          }
          updatedCount++;
        } catch (err) {
          console.warn("Could not set description on:", target.name, err);
        }
      }
      if (updatedCount > 0) {
        const firstName = Array.from(targetsToUpdate)[0].name;
        figma.notify(`Applied description to "${firstName}" \u2728`);
        sendSelectionToUI();
        figma.ui.postMessage({
          type: "description-saved",
          name: firstName,
          description: descText,
          success: true
        });
      } else {
        figma.notify("Please select a Component or Component Set on canvas.", {
          error: true
        });
        figma.ui.postMessage({
          type: "description-saved",
          success: false,
          message: "No Component or Component Set found in selection."
        });
      }
    } else if (msg.type === "save-batch-descriptions") {
      const { items, documentationLink } = msg;
      let savedCount = 0;
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            const node = await figma.getNodeByIdAsync(item.nodeId);
            if (node && "description" in node) {
              const comp = node;
              comp.description = item.description;
              if ("descriptionMarkdown" in comp) {
                let norm = item.description;
                if ("util" in figma && typeof ((_b = figma.util) == null ? void 0 : _b.normalizeMarkdown) === "function") {
                  try {
                    norm = figma.util.normalizeMarkdown(item.description);
                  } catch (e) {
                  }
                }
                comp.descriptionMarkdown = norm;
              }
              const docUri = item.documentationLink || documentationLink;
              if (docUri && "documentationLinks" in comp) {
                try {
                  comp.documentationLinks = [{ uri: docUri }];
                } catch (e) {
                  console.warn("Could not set documentationLinks on batch comp:", e);
                }
              }
              savedCount++;
            }
          } catch (err) {
            console.warn("Batch item error:", err);
          }
        }
      }
      figma.notify(`Applied descriptions to ${savedCount} variants! \u2728`);
      sendSelectionToUI();
    } else if (msg.type === "set-documentation-link") {
      const docUrl = typeof msg.url === "string" ? msg.url.trim() : "";
      if (!docUrl) {
        figma.notify("Documentation link is empty.", { error: true });
        return;
      }
      const targetsToUpdate = /* @__PURE__ */ new Set();
      const resolveTargetNodes = (node) => {
        if (!node) return;
        let curr = node;
        while (curr) {
          if (curr.type === "COMPONENT_SET") {
            targetsToUpdate.add(curr);
            break;
          }
          if (curr.type === "COMPONENT") {
            targetsToUpdate.add(curr);
            break;
          }
          if (curr.type === "INSTANCE") {
            const main = curr.mainComponent;
            if (main) targetsToUpdate.add(main);
            break;
          }
          curr = curr.parent;
        }
      };
      if (msg.nodeId) {
        try {
          const node = await figma.getNodeByIdAsync(msg.nodeId);
          resolveTargetNodes(node);
        } catch (err) {
          console.warn("Error fetching node by id:", err);
        }
      }
      if (targetsToUpdate.size === 0) {
        for (const selNode of figma.currentPage.selection) {
          resolveTargetNodes(selNode);
        }
      }
      let updatedCount = 0;
      for (const target of targetsToUpdate) {
        try {
          if ("documentationLinks" in target) {
            target.documentationLinks = [{ uri: docUrl }];
            if (msg.includeVariants && target.type === "COMPONENT_SET") {
              for (const child of target.children) {
                if (child.type === "COMPONENT") {
                  child.documentationLinks = [{ uri: docUrl }];
                }
              }
            }
            updatedCount++;
          }
        } catch (err) {
          console.warn("Could not set documentation link:", err);
        }
      }
      if (updatedCount > 0) {
        const firstName = Array.from(targetsToUpdate)[0].name;
        figma.notify(`Attached documentation link to "${firstName}" \u{1F517}`);
        sendSelectionToUI();
      } else {
        figma.notify("Please select a Component or Component Set on canvas.", { error: true });
      }
    } else if (msg.type === "save-api-config") {
      if (typeof msg.provider === "string") {
        await figma.clientStorage.setAsync("ai_provider", msg.provider);
      }
      if (typeof msg.groqApiKey === "string") {
        await figma.clientStorage.setAsync("groq_api_key", msg.groqApiKey);
      }
      if (typeof msg.groqModel === "string") {
        await figma.clientStorage.setAsync("groq_model", msg.groqModel);
      }
      if (typeof msg.apiKey === "string") {
        await figma.clientStorage.setAsync("gemini_api_key", msg.apiKey);
      }
      if (typeof msg.selectedModel === "string") {
        await figma.clientStorage.setAsync("gemini_selected_model", msg.selectedModel);
      }
      if (typeof msg.promptTone === "string") {
        await figma.clientStorage.setAsync("gemini_prompt_tone", msg.promptTone);
      }
      figma.notify("AI settings saved! \u26A1");
    } else if (msg.type === "clear-api-config") {
      if (msg.provider === "groq") {
        await figma.clientStorage.deleteAsync("groq_api_key");
        await figma.clientStorage.deleteAsync("groq_model");
        figma.notify("Groq disconnected.");
      } else {
        await figma.clientStorage.deleteAsync("gemini_api_key");
        await figma.clientStorage.deleteAsync("gemini_selected_model");
        figma.notify("Google Gemini disconnected.");
      }
    } else if (msg.type === "get-retextifier-layers") {
      const textLayers = scanDeepTextLayers();
      figma.ui.postMessage({
        type: "retextifier-layers",
        layers: textLayers
      });
    } else if (msg.type === "apply-retextifier") {
      const updates = Array.isArray(msg.updates) ? msg.updates : [];
      let updatedCount = 0;
      let errorCount = 0;
      for (const item of updates) {
        if (!item.id || typeof item.text !== "string" || item.text.trim() === "") {
          continue;
        }
        try {
          const node = await figma.getNodeByIdAsync(item.id);
          if (node && node.type === "TEXT") {
            const textNode = node;
            await loadFontsForTextNode(textNode);
            try {
              textNode.characters = item.text;
            } catch (charErr) {
              try {
                const fallbackFont = { family: "Inter", style: "Regular" };
                await figma.loadFontAsync(fallbackFont);
                textNode.fontName = fallbackFont;
                textNode.characters = item.text;
              } catch (fallbackErr) {
                throw charErr;
              }
            }
            updatedCount++;
          }
        } catch (err) {
          console.warn(`[Retextifier] Could not update text for layer ${item.id}:`, err);
          errorCount++;
        }
      }
      if (updatedCount > 0) {
        figma.notify(`Zaktualizowano ${updatedCount} ${updatedCount === 1 ? "warstw\u0119 tekstow\u0105" : "warstw tekstowych"}! \u2728`);
        sendSelectionToUI();
        figma.ui.postMessage({
          type: "retextifier-applied",
          updatedCount,
          layers: scanDeepTextLayers()
        });
      } else if (errorCount > 0) {
        figma.notify("Nie uda\u0142o si\u0119 zaktualizowa\u0107 warstw (brak czcionki lub b\u0142\u0105d warstwy).", { error: true });
      } else {
        figma.notify("Brak zmian \u2013 \u017Cadne pole nie zosta\u0142o wype\u0142nione.");
      }
    } else if (msg.type === "scan-layers-for-ai-renaming") {
      try {
        let didAutoSmartSetup = false;
        if (needsSmartSetup(figma.currentPage.selection)) {
          await runComponentSetLogic();
          didAutoSmartSetup = true;
        }
        const { items, totalVariantsCount, targetRoots } = await scanLayersForAiRenaming();
        if (!items || items.length === 0) {
          const validRoots = (targetRoots || []).filter(
            (r) => r.type === "COMPONENT_SET" || r.type === "COMPONENT" || r.type === "FRAME"
          );
          if (validRoots.length > 0 && msg.autoProps !== false) {
            if (msg.reviewAutoProps === true) {
              const previewData = collectAutoPropsPreviewData(validRoots);
              figma.ui.postMessage({
                type: "auto-props-preview-needed",
                previewData,
                renamedCount: 0
              });
              figma.notify("Warstwy s\u0105 ju\u017C poprawne. Skonfiguruj w\u0142a\u015Bciwo\u015Bci... \u2728");
              sendSelectionToUI();
              return;
            }
            const allTextNodes = [];
            const allDirectInstances = [];
            for (const r of validRoots) {
              allTextNodes.push(...collectDirectTextNodes(r));
              allDirectInstances.push(...collectDirectInstances(r));
            }
            const [, , , loadedVars] = await Promise.all([
              Promise.all(allTextNodes.map((t) => loadFontsForTextNode(t))),
              Promise.all(allDirectInstances.map(async (inst) => {
                if (inst.getMainComponentAsync) {
                  try {
                    await inst.getMainComponentAsync();
                  } catch (e) {
                  }
                }
              })),
              (async () => {
                try {
                  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                } catch (e) {
                }
              })(),
              preloadBoundVariablesForRoots(validRoots)
            ]);
            let autoPropsOptions = void 0;
            if (typeof msg.autoProps === "object" && msg.autoProps !== null) {
              autoPropsOptions = msg.autoProps;
            }
            const autoRes = autoCreateTextPropsAndExtractItemsSync(validRoots, loadedVars, autoPropsOptions);
            const parts = [];
            if (didAutoSmartSetup) parts.push("Smart Setup");
            if (autoRes.slotsCreatedCount > 0) parts.push(`${autoRes.slotsCreatedCount} ${autoRes.slotsCreatedCount === 1 ? "kontener Slot" : "kontenery Slot"}`);
            if (autoRes.instanceSwapPropsCount > 0) parts.push(`${autoRes.instanceSwapPropsCount} INSTANCE_SWAP`);
            if (autoRes.booleanPropsCount > 0) parts.push(`${autoRes.booleanPropsCount} BOOLEAN`);
            if (autoRes.textPropsCount > 0) parts.push(`${autoRes.textPropsCount} TEXT`);
            if (autoRes.extractedItemsCount > 0) parts.push(`${autoRes.extractedItemsCount} .../Item`);
            if (autoRes.nestedInstancesCount > 0) parts.push(`${autoRes.nestedInstancesCount} Nested`);
            const summary = parts.length > 0 ? ` [${parts.join(", ")}]` : "";
            figma.notify(parts.length > 0 ? `Zachowano istniej\u0105c\u0105 struktur\u0119 i uzupe\u0142niono brakuj\u0105ce elementy${summary}! \u2728` : "Komponent ma ju\u017C kompletn\u0105 konfiguracj\u0119 i nazwy warstw! \u2728");
            sendSelectionToUI();
            figma.ui.postMessage({
              type: "ai-layer-names-applied",
              count: 0,
              addedCount: parts.length
            });
            return;
          }
          if (validRoots.length > 0) {
            for (const r of validRoots) {
              let host = null;
              if (r.type === "COMPONENT_SET" || r.type === "COMPONENT") {
                host = r;
              } else if (r.parent && (r.parent.type === "COMPONENT_SET" || r.parent.type === "COMPONENT")) {
                host = r.parent;
              }
              if (host) {
                try {
                  if (host.type === "COMPONENT_SET") {
                    reorderComponentSetVariants(host);
                  }
                  const variants = host.type === "COMPONENT_SET" ? host.children.filter((c) => c.type === "COMPONENT") : [host];
                  cleanRebuildComponentProperties(host, variants, {
                    enableText: true,
                    enableInstanceSwap: true,
                    enableBoolean: true,
                    enableSlotExtract: true
                  });
                } catch (_) {
                }
              }
            }
            figma.notify("Wszystkie warstwy i w\u0142a\u015Bciwo\u015Bci s\u0105 uporz\u0105dkowane zgodnie ze standardem. \u2728");
            sendSelectionToUI();
            figma.ui.postMessage({
              type: "ai-layer-names-applied",
              count: 0,
              addedCount: 0
            });
            return;
          } else {
            figma.notify("Nie znaleziono ramek, grup ani warstw tekstowych do nazwania w zaznaczeniu.", { error: true });
          }
          figma.ui.postMessage({
            type: "ai-layers-structure-extracted",
            success: false,
            message: "Brak kwalifikuj\u0105cych si\u0119 warstw."
          });
          return;
        }
        figma.ui.postMessage({
          type: "ai-layers-structure-extracted",
          success: true,
          payload: items,
          totalVariantsCount
        });
      } catch (err) {
        console.error("[SmartRenamer] Scan error:", err);
        figma.notify(`B\u0142\u0105d skanowania warstw: ${err && err.message ? err.message : String(err)}`, { error: true });
        figma.ui.postMessage({
          type: "ai-layers-structure-extracted",
          success: false,
          message: err ? err.message : String(err)
        });
      }
    } else if (msg.type === "apply-ai-layer-names") {
      try {
        const nameMap = msg.nameMap || {};
        const nodesToRename = [];
        const seenNodeIds = /* @__PURE__ */ new Set();
        for (const [nodeId, rawName] of Object.entries(nameMap)) {
          if (!rawName || typeof rawName !== "string") continue;
          const newName = sanitizePascalCase(rawName);
          if (!newName) continue;
          const targetIds = lastAiRenamerPeerMap.get(nodeId) || [nodeId];
          for (const tId of targetIds) {
            if (seenNodeIds.has(tId)) continue;
            seenNodeIds.add(tId);
            try {
              if (lastAiRenamerRootIds.includes(tId)) continue;
              const node = figma.getNodeById(tId) || await figma.getNodeByIdAsync(tId);
              if (node && (node.type === "FRAME" || node.type === "GROUP" || node.type === "TEXT")) {
                let detectedRoot = "";
                let curr = node.parent;
                while (curr) {
                  if (curr.type === "COMPONENT_SET" || curr.type === "COMPONENT") {
                    detectedRoot = curr.name || "";
                    break;
                  }
                  curr = curr.parent;
                }
                const finalizedName = sanitizeLayerNameByContext(newName, node, detectedRoot);
                if (node.name !== finalizedName) {
                  nodesToRename.push({ node, finalizedName });
                }
              }
            } catch (nodeErr) {
              console.warn(`[SmartRenamer] Could not resolve node ${tId}:`, nodeErr);
            }
          }
        }
        let roots = [];
        let preloadedVars = /* @__PURE__ */ new Map();
        const rawRoots = [];
        for (const id of lastAiRenamerRootIds) {
          try {
            const node = figma.getNodeById(id) || await figma.getNodeByIdAsync(id);
            if (node && (node.type === "COMPONENT_SET" || node.type === "COMPONENT" || node.type === "FRAME")) {
              if (!rawRoots.includes(node)) rawRoots.push(node);
            }
          } catch (e) {
          }
        }
        if (rawRoots.length === 0) {
          for (const node of figma.currentPage.selection) {
            if (node.type === "COMPONENT_SET" || node.type === "COMPONENT" || node.type === "FRAME") {
              if (!rawRoots.includes(node)) rawRoots.push(node);
            }
          }
        }
        for (const r of rawRoots) {
          let resolved = r;
          if (r.parent && r.parent.type === "COMPONENT_SET") {
            resolved = r.parent;
          } else if (r.type !== "COMPONENT_SET" && r.type !== "COMPONENT") {
            let p = r.parent;
            while (p && p.type !== "PAGE" && p.type !== "DOCUMENT") {
              if (p.type === "COMPONENT_SET") {
                resolved = p;
                break;
              }
              if (p.type === "COMPONENT") {
                resolved = p.parent && p.parent.type === "COMPONENT_SET" ? p.parent : p;
                break;
              }
              p = p.parent;
            }
          }
          if (!roots.includes(resolved)) roots.push(resolved);
        }
        if (msg.autoProps !== false) {
          const allTextNodes = [];
          const allDirectInstances = [];
          for (const root of roots) {
            const texts = root.findAll ? root.findAll((n) => n.type === "TEXT") : [];
            for (const t of texts) allTextNodes.push(t);
            const instances = root.findAll ? root.findAll((n) => n.type === "INSTANCE") : [];
            for (const inst of instances) {
              allDirectInstances.push(inst);
            }
          }
          const [, , , loadedVars] = await Promise.all([
            Promise.all(allTextNodes.map((t) => loadFontsForTextNode(t))),
            Promise.all(allDirectInstances.map(async (inst) => {
              if (inst.getMainComponentAsync) {
                try {
                  await inst.getMainComponentAsync();
                } catch (e) {
                }
              }
            })),
            (async () => {
              try {
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
              } catch (e) {
              }
            })(),
            preloadBoundVariablesForRoots(roots)
          ]);
          preloadedVars = loadedVars;
        }
        let renamedCount = 0;
        for (const item of nodesToRename) {
          item.node.name = item.finalizedName;
          renamedCount++;
        }
        let autoPropsOptions = void 0;
        if (typeof msg.autoProps === "object" && msg.autoProps !== null) {
          autoPropsOptions = msg.autoProps;
        }
        if (msg.reviewAutoProps === true && roots.length > 0) {
          const previewData = collectAutoPropsPreviewData(roots);
          figma.ui.postMessage({
            type: "auto-props-preview-needed",
            previewData,
            renamedCount
          });
          figma.notify(`Zaktualizowano nazwy ${renamedCount} warstw! Skonfiguruj w\u0142a\u015Bciwo\u015Bci... \u2728`);
          sendSelectionToUI();
          return;
        }
        let autoPropsSummary = "";
        if (msg.autoProps !== false) {
          try {
            const autoRes = autoCreateTextPropsAndExtractItemsSync(roots, preloadedVars, autoPropsOptions);
            if (autoRes.slotsCreatedCount > 0 || autoRes.extractedItemsCount > 0 || autoRes.textPropsCount > 0 || autoRes.instanceSwapPropsCount > 0 || autoRes.booleanPropsCount > 0 || autoRes.nestedInstancesCount > 0) {
              const parts = [];
              if (autoRes.slotsCreatedCount > 0) {
                parts.push(`${autoRes.slotsCreatedCount} ${autoRes.slotsCreatedCount === 1 ? "kontener Slot" : "kontenery Slot"}`);
              }
              if (autoRes.extractedItemsCount > 0) {
                parts.push(`${autoRes.extractedItemsCount} ${autoRes.extractedItemsCount === 1 ? "sub-komponent" : "sub-komponenty"} .../Item`);
              }
              if (autoRes.booleanPropsCount > 0) {
                parts.push(`${autoRes.booleanPropsCount} ${autoRes.booleanPropsCount === 1 ? "w\u0142a\u015Bciwo\u015B\u0107" : "w\u0142a\u015Bciwo\u015Bci"} BOOLEAN`);
              }
              if (autoRes.textPropsCount > 0) {
                parts.push(`${autoRes.textPropsCount} ${autoRes.textPropsCount === 1 ? "w\u0142a\u015Bciwo\u015B\u0107" : "w\u0142a\u015Bciwo\u015Bci"} TEXT`);
              }
              if (autoRes.instanceSwapPropsCount > 0) {
                parts.push(`${autoRes.instanceSwapPropsCount} ${autoRes.instanceSwapPropsCount === 1 ? "w\u0142a\u015Bciwo\u015B\u0107" : "w\u0142a\u015Bciwo\u015Bci"} INSTANCE_SWAP`);
              }
              if (autoRes.nestedInstancesCount > 0) {
                parts.push(`${autoRes.nestedInstancesCount} Nested`);
              }
              autoPropsSummary = ` [${parts.join(", ")}]`;
            }
          } catch (autoErr) {
            console.error("[SmartRenamer] Error in autoCreateTextPropsAndExtractItemsSync:", autoErr);
          }
        } else {
          for (const r of roots) {
            if (r.type === "COMPONENT_SET" || r.type === "COMPONENT") {
              try {
                if (r.type === "COMPONENT_SET") {
                  reorderComponentSetVariants(r);
                }
                const variants = r.type === "COMPONENT_SET" ? r.children.filter((c) => c.type === "COMPONENT") : [r];
                cleanRebuildComponentProperties(r, variants, {
                  enableText: false,
                  enableInstanceSwap: false,
                  enableBoolean: false,
                  enableSlotExtract: false
                });
              } catch (_) {
              }
            }
          }
        }
        if (renamedCount > 0 || autoPropsSummary) {
          figma.notify(`Zaktualizowano nazwy ${renamedCount} warstw${autoPropsSummary}! \u2728`);
        } else {
          figma.notify("Wszystkie warstwy maj\u0105 ju\u017C poprawne nazwy zgodnie ze standardem.");
        }
        sendSelectionToUI();
        figma.ui.postMessage({
          type: "ai-layer-names-applied",
          count: renamedCount
        });
      } catch (err) {
        console.error("[SmartRenamer] Apply error:", err);
        figma.notify(`B\u0142\u0105d aktualizacji warstw: ${err && err.message ? err.message : String(err)}`, { error: true });
        figma.ui.postMessage({
          type: "ai-layer-names-applied",
          count: 0,
          error: err ? err.message : String(err)
        });
      }
    } else if (msg.type === "scan-auto-props-preview") {
      try {
        const selection = figma.currentPage.selection;
        const targetRoots = [];
        for (const node of selection) {
          let host = node;
          if (node.parent && node.parent.type === "COMPONENT_SET") {
            host = node.parent;
          }
          if (!targetRoots.includes(host) && (host.type === "COMPONENT_SET" || host.type === "COMPONENT" || host.type === "FRAME")) {
            targetRoots.push(host);
          }
        }
        if (targetRoots.length === 0) {
          figma.notify("Zaznacz Component lub Component Set na canvasie.", { error: true });
          return;
        }
        const previewData = collectAutoPropsPreviewData(targetRoots);
        figma.ui.postMessage({
          type: "auto-props-preview-data",
          previewData
        });
      } catch (e) {
        figma.notify(`B\u0142\u0105d skanowania w\u0142a\u015Bciwo\u015Bci: ${e.message}`, { error: true });
      }
    } else if (msg.type === "run-auto-props" || msg.type === "apply-custom-auto-props") {
      try {
        const selection = figma.currentPage.selection;
        const targetRoots = [];
        for (const node of selection) {
          let host = node;
          if (node.parent && node.parent.type === "COMPONENT_SET") {
            host = node.parent;
          }
          if (!targetRoots.includes(host) && (host.type === "COMPONENT_SET" || host.type === "COMPONENT" || host.type === "FRAME")) {
            targetRoots.push(host);
          }
        }
        if (targetRoots.length === 0 && lastAiRenamerRootIds.length > 0) {
          for (const id of lastAiRenamerRootIds) {
            const n = figma.getNodeById(id) || await figma.getNodeByIdAsync(id);
            if (n && (n.type === "COMPONENT_SET" || n.type === "COMPONENT" || n.type === "FRAME")) {
              if (!targetRoots.includes(n)) targetRoots.push(n);
            }
          }
        }
        if (targetRoots.length === 0) {
          figma.notify("Zaznacz Component lub Component Set na canvasie.", { error: true });
          return;
        }
        const allTextNodes = [];
        const allDirectInstances = [];
        for (const r of targetRoots) {
          allTextNodes.push(...collectDirectTextNodes(r));
          allDirectInstances.push(...collectDirectInstances(r));
        }
        const [, , , loadedVars] = await Promise.all([
          Promise.all(allTextNodes.map((t) => loadFontsForTextNode(t))),
          Promise.all(allDirectInstances.map(async (inst) => {
            if (inst.getMainComponentAsync) {
              try {
                await inst.getMainComponentAsync();
              } catch (e) {
              }
            }
          })),
          (async () => {
            try {
              await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            } catch (e) {
            }
          })(),
          preloadBoundVariablesForRoots(targetRoots)
        ]);
        const autoRes = autoCreateTextPropsAndExtractItemsSync(targetRoots, loadedVars, msg.options);
        const parts = [];
        if (autoRes.instanceSwapPropsCount > 0) parts.push(`${autoRes.instanceSwapPropsCount} INSTANCE_SWAP`);
        if (autoRes.booleanPropsCount > 0) parts.push(`${autoRes.booleanPropsCount} BOOLEAN`);
        if (autoRes.textPropsCount > 0) parts.push(`${autoRes.textPropsCount} TEXT`);
        if (autoRes.extractedItemsCount > 0) parts.push(`${autoRes.extractedItemsCount} .../Item`);
        if (autoRes.nestedInstancesCount > 0) parts.push(`${autoRes.nestedInstancesCount} Nested`);
        const summary = parts.length > 0 ? ` [${parts.join(", ")}]` : "";
        figma.notify(`Wdro\u017Cono w\u0142a\u015Bciwo\u015Bci komponentu${summary}! \u2728`);
        sendSelectionToUI();
        figma.ui.postMessage({ type: "auto-props-applied", success: true });
      } catch (e) {
        console.error("[AutoProps] Apply error:", e);
        figma.notify(`B\u0142\u0105d tworzenia w\u0142a\u015Bciwo\u015Bci: ${e.message}`, { error: true });
      }
    } else if (msg.type === "convert-case") {
      await handleConvertCase(msg.caseType, !!msg.skipInstances);
    } else if (msg.type === "smart-swap-get-selection") {
      await sendSmartSwapSelectionToUI();
    } else if (msg.type === "smart-swap-check-match") {
      try {
        const srcNode = await figma.getNodeByIdAsync(msg.sourceId);
        const tmplNode = await figma.getNodeByIdAsync(msg.templateId);
        if (srcNode && tmplNode) {
          const stats = await calculateMatchStats(srcNode, tmplNode);
          figma.ui.postMessage({
            type: "smart-swap-match-result",
            stats,
            sourceId: msg.sourceId,
            templateId: msg.templateId
          });
        }
      } catch (e) {
        console.warn("[SmartSwap] Match check error:", e);
      }
    } else if (msg.type === "smart-swap-execute") {
      try {
        const sourceIds = Array.isArray(msg.sourceIds) ? msg.sourceIds : msg.sourceId ? [msg.sourceId] : [];
        const templateId = msg.templateId;
        const options = msg.options || {};
        const result = await executeSmartSwapBatch(sourceIds, templateId, options);
        figma.ui.postMessage({
          type: "smart-swap-complete",
          success: result.success,
          replacedCount: result.replacedCount,
          totalOverrides: result.totalOverrides,
          message: result.message
        });
        await sendSmartSwapSelectionToUI();
        sendSelectionToUI();
      } catch (e) {
        console.error("[SmartSwap] Execute error:", e);
        figma.notify(`B\u0142\u0105d Smart Swap: ${e.message}`, { error: true });
        figma.ui.postMessage({
          type: "smart-swap-complete",
          success: false,
          message: e.message
        });
      }
    } else if (msg.type === "font-replacer-scan") {
      try {
        const scanResult = await scanSelectionFonts(Boolean(msg.includeAvailableFonts));
        figma.ui.postMessage({
          type: "font-replacer-data",
          data: scanResult
        });
      } catch (e) {
        console.error("[FontReplacer] Scan error:", e);
        figma.notify(`B\u0142\u0105d skanowania font\xF3w: ${e.message}`, { error: true });
      }
    } else if (msg.type === "font-replacer-swap") {
      try {
        const rules = Array.isArray(msg.rules) ? msg.rules : [];
        const res = await executeFontSwapRules(rules);
        if (res.updatedLayersCount > 0) {
          const firstRule = rules[0];
          if (rules.length === 1 && firstRule) {
            const targetDesc = firstRule.targetStyle ? `${firstRule.targetFamily} (${firstRule.targetStyle})` : firstRule.targetFamily;
            figma.notify(
              `Podmieniono font z ${firstRule.sourceFamily} na ${targetDesc} w ${res.updatedLayersCount} warstwach! \u2728`
            );
          } else {
            figma.notify(`Podmieniono fonty w ${res.updatedLayersCount} warstwach! \u2728`);
          }
        } else {
          figma.notify("Brak pasuj\u0105cych warstw tekstowych do podmiany.", { error: true });
        }
        const updatedScan = await scanSelectionFonts(false);
        figma.ui.postMessage({
          type: "font-replacer-swapped",
          updatedLayersCount: res.updatedLayersCount,
          summaryText: res.summaryText,
          data: updatedScan
        });
        sendSelectionToUI();
      } catch (e) {
        console.error("[FontReplacer] Swap error:", e);
        figma.notify(`B\u0142\u0105d podmiany fontu: ${e.message}`, { error: true });
      }
    }
  };
  (async () => {
    let initialMode = "components";
    if (figma.command === "generator") {
      initialMode = "generator";
    } else if (figma.command === "components") {
      initialMode = "components";
    } else {
      try {
        const savedMode = await figma.clientStorage.getAsync("last_active_plugin_mode");
        if (savedMode === "generator" || savedMode === "components") {
          initialMode = savedMode;
        }
      } catch (e) {
      }
    }
    await launchPluginMode(initialMode);
  })();
})();
