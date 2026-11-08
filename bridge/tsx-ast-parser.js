// TypeScript AST Component Parser for Antigravity <-> Figma Bridge
// Parses live React TSX components into Figma-ready Component Set schemas
// Uses native TypeScript Compiler API (zero external runtime dependencies)

const ts = require('typescript');
const fs = require('fs');
const path = require('path');

// Tailwind class parser for Auto Layout, Spacing, Radius, Fills, and Typography
function parseTailwindProps(classList = '', tokens) {
  const classes = (classList || '')
    .split(/\s+/)
    .map(c => c.trim())
    .filter(Boolean);

  const res = {
    layoutMode: 'VERTICAL', // default container
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    itemSpacing: 0,
    itemSpacingVar: 'constant/none',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingLeftVar: 'constant/none',
    paddingRightVar: 'constant/none',
    paddingTopVar: 'constant/none',
    paddingBottomVar: 'constant/none',
    cornerRadius: 0,
    cornerRadiusVar: 'constant/none',
    fills: [],
    strokes: [],
    strokeWeight: 0,
    textStyleName: 'default/body/medium/regular',
    fontStyle: 'Regular',
    fontSize: 14,
    textColorToken: 'on-surface',
    textFills: [],
  };

  let isFlex = false;
  let isRow = false;
  let isCol = false;
  let isBold = false;
  let isMedium = false;

  for (const cls of classes) {
    // Flex / Layout Mode
    if (cls === 'flex' || cls === 'inline-flex') {
      isFlex = true;
    }
    if (cls === 'flex-col') {
      isCol = true;
    }
    if (cls === 'flex-row') {
      isRow = true;
    }

    // Alignment
    if (cls === 'items-center') res.counterAxisAlignItems = 'CENTER';
    if (cls === 'items-start') res.counterAxisAlignItems = 'MIN';
    if (cls === 'items-end') res.counterAxisAlignItems = 'MAX';
    if (cls === 'items-baseline') res.counterAxisAlignItems = 'BASELINE';

    if (cls === 'justify-center') res.primaryAxisAlignItems = 'CENTER';
    if (cls === 'justify-between') res.primaryAxisAlignItems = 'SPACE_BETWEEN';
    if (cls === 'justify-start') res.primaryAxisAlignItems = 'MIN';
    if (cls === 'justify-end') res.primaryAxisAlignItems = 'MAX';

    // Sizing
    // (Handled after layoutMode is determined)

    // Gap / Spacing
    const gapMatch = cls.match(/^gap-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (gapMatch) {
      const px = gapMatch[1] ? parseInt(gapMatch[1], 10) : gapMatch[2] ? parseInt(gapMatch[2], 10) * 4 : null;
      const namedToken = gapMatch[3];
      if (namedToken === 'none' || namedToken === '0' || px === 0) {
        res.itemSpacing = 0;
        res.itemSpacingVar = 'constant/none';
      } else if (namedToken) {
        res.itemSpacingVar = `spacing/${namedToken}`;
        const t = tokens.matchSpacing(namedToken);
        res.itemSpacing = t.value || 8;
      } else if (px !== null) {
        const t = tokens.matchSpacing(px);
        res.itemSpacing = px;
        res.itemSpacingVar = t.token || 'constant/none';
      }
    }

    // Padding (all sides)
    const pMatch = cls.match(/^p-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (pMatch) {
      const px = pMatch[1] ? parseInt(pMatch[1], 10) : pMatch[2] ? parseInt(pMatch[2], 10) * 4 : null;
      const named = pMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      const val = isNone ? 0 : (px !== null ? px : 16);
      const varName = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(val).token);
      res.paddingTop = val;
      res.paddingBottom = val;
      res.paddingLeft = val;
      res.paddingRight = val;
      res.paddingTopVar = varName;
      res.paddingBottomVar = varName;
      res.paddingLeftVar = varName;
      res.paddingRightVar = varName;
    }

    // Padding X
    const pxMatch = cls.match(/^px-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (pxMatch) {
      const px = pxMatch[1] ? parseInt(pxMatch[1], 10) : pxMatch[2] ? parseInt(pxMatch[2], 10) * 4 : null;
      const named = pxMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      const val = isNone ? 0 : (px !== null ? px : 16);
      const varName = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(val).token);
      res.paddingLeft = val;
      res.paddingRight = val;
      res.paddingLeftVar = varName;
      res.paddingRightVar = varName;
    }

    // Padding Y
    const pyMatch = cls.match(/^py-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (pyMatch) {
      const px = pyMatch[1] ? parseInt(pyMatch[1], 10) : pyMatch[2] ? parseInt(pyMatch[2], 10) * 4 : null;
      const named = pyMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      const val = isNone ? 0 : (px !== null ? px : 12);
      const varName = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(val).token);
      res.paddingTop = val;
      res.paddingBottom = val;
      res.paddingTopVar = varName;
      res.paddingBottomVar = varName;
    }

    // Individual Padding Sides (pt-, pb-, pl-, pr-)
    const ptMatch = cls.match(/^pt-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (ptMatch) {
      const px = ptMatch[1] ? parseInt(ptMatch[1], 10) : ptMatch[2] ? parseInt(ptMatch[2], 10) * 4 : null;
      const named = ptMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      res.paddingTop = isNone ? 0 : (px !== null ? px : 8);
      res.paddingTopVar = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(res.paddingTop).token);
    }
    const pbMatch = cls.match(/^pb-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (pbMatch) {
      const px = pbMatch[1] ? parseInt(pbMatch[1], 10) : pbMatch[2] ? parseInt(pbMatch[2], 10) * 4 : null;
      const named = pbMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      res.paddingBottom = isNone ? 0 : (px !== null ? px : 8);
      res.paddingBottomVar = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(res.paddingBottom).token);
    }
    const plMatch = cls.match(/^pl-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (plMatch) {
      const px = plMatch[1] ? parseInt(plMatch[1], 10) : plMatch[2] ? parseInt(plMatch[2], 10) * 4 : null;
      const named = plMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      res.paddingLeft = isNone ? 0 : (px !== null ? px : 8);
      res.paddingLeftVar = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(res.paddingLeft).token);
    }
    const prMatch = cls.match(/^pr-(?:\[(\d+)px\]|(\d+)|([a-z-]+))$/);
    if (prMatch) {
      const px = prMatch[1] ? parseInt(prMatch[1], 10) : prMatch[2] ? parseInt(prMatch[2], 10) * 4 : null;
      const named = prMatch[3];
      const isNone = named === 'none' || named === '0' || px === 0;
      res.paddingRight = isNone ? 0 : (px !== null ? px : 8);
      res.paddingRightVar = isNone ? 'constant/none' : (named ? `spacing/${named}` : tokens.matchSpacing(res.paddingRight).token);
    }

    // Corner Radius
    if (cls === 'rounded-full') {
      res.cornerRadius = 9999;
      res.cornerRadiusVar = 'constant/full';
    } else if (cls === 'rounded-none' || cls === 'rounded-0') {
      res.cornerRadius = 0;
      res.cornerRadiusVar = 'constant/none';
    } else if (cls.startsWith('rounded')) {
      const rMatch = cls.match(/^rounded(?:-([a-z0-9-]+))?$/);
      const sub = rMatch ? rMatch[1] : '';
      if (sub === 'none' || sub === '0') {
        res.cornerRadius = 0;
        res.cornerRadiusVar = 'constant/none';
      } else if (sub === 'base' || sub === 'md') {
        res.cornerRadius = 8;
        res.cornerRadiusVar = 'radius/base';
      } else if (sub === 'large' || sub === 'lg') {
        res.cornerRadius = 16;
        res.cornerRadiusVar = 'radius/large';
      } else if (sub === 'small' || sub === 'sm') {
        res.cornerRadius = 4;
        res.cornerRadiusVar = 'radius/small';
      } else if (sub === 'extra-large' || sub === 'xl' || sub === '2xl') {
        res.cornerRadius = 24;
        res.cornerRadiusVar = 'radius/extra-large';
      } else if (sub === 'semi-large') {
        res.cornerRadius = 32;
        res.cornerRadiusVar = 'radius/semi-large';
      }
    }

    // Background color
    if (cls.startsWith('bg-')) {
      const colorToken = cls.replace('bg-', '');
      if (colorToken === 'transparent') {
        res.fills = [];
      } else {
        const fill = tokens.getFill(colorToken);
        if (fill && fill.length > 0) {
          res.fills = fill;
        }
      }
    }

    // Text color
    if (cls.startsWith('text-')) {
      const sub = cls.replace('text-', '');
      if (['primary', 'secondary', 'tertiary', 'on-surface', 'on-primary-unstable', 'outline-base', 'outline-highest', 'error', 'white', 'black'].includes(sub)) {
        res.textColorToken = sub;
        res.textFills = tokens.getFill(sub);
      }
    }

    // Borders / Strokes
    if (cls === 'border' || cls.startsWith('border-')) {
      res.strokeWeight = 1;
      if (cls === 'border-2') res.strokeWeight = 2;
      const strokeToken = cls.replace('border-', '');
      if (strokeToken && strokeToken !== 'border' && isNaN(Number(strokeToken))) {
        res.strokes = tokens.getStroke(strokeToken);
      } else if (res.strokes.length === 0) {
        res.strokes = tokens.getStroke('outline-base');
      }
    }

    // Typography
    if (cls.includes('font-bold') || cls.includes('font-semibold')) isBold = true;
    if (cls.includes('font-medium')) isMedium = true;

    if (cls.includes('text-display') || cls.includes('text-6xl') || cls.includes('text-5xl')) {
      res.fontSize = 56;
      res.textStyleName = 'heading/h1/bold';
    } else if (cls.includes('text-4xl') || cls.includes('text-3xl')) {
      res.fontSize = 36;
      res.textStyleName = 'heading/h2/bold';
    } else if (cls.includes('text-2xl') || cls.includes('text-xl')) {
      res.fontSize = 24;
      res.textStyleName = 'heading/h4/bold';
    } else if (cls.includes('text-lg') || cls.includes('text-body-large')) {
      res.fontSize = 18;
      res.textStyleName = 'default/body/large/bold';
    } else if (cls.includes('text-body-medium') || cls.includes('text-base')) {
      res.fontSize = 16;
      res.textStyleName = 'default/body/medium/regular';
    } else if (cls.includes('text-sm') || cls.includes('text-body-small')) {
      res.fontSize = 14;
      res.textStyleName = 'default/body/small/regular';
    } else if (cls.includes('text-xs') || cls.includes('text-label')) {
      res.fontSize = 12;
      res.textStyleName = 'default/label/large/bold';
    }
  }

  res.fontStyle = isBold ? 'Bold' : isMedium ? 'Medium' : 'Regular';
  res.layoutMode = isFlex && (isRow || !isCol) ? 'HORIZONTAL' : 'VERTICAL';

  const hasWFull = classes.includes('w-full');
  const hasHFull = classes.includes('h-full');
  const hasWFit = classes.includes('w-fit') || classes.includes('self-start');

  if (res.layoutMode === 'HORIZONTAL') {
    if (hasWFull) res.primaryAxisSizingMode = 'FIXED';
    if (hasWFit) res.primaryAxisSizingMode = 'AUTO';
    if (hasHFull) res.counterAxisSizingMode = 'FIXED';
  } else {
    if (hasWFull) res.counterAxisSizingMode = 'FIXED';
    if (hasWFit) res.counterAxisSizingMode = 'AUTO';
    if (hasHFull) res.primaryAxisSizingMode = 'FIXED';
  }

  if (res.textFills.length === 0) {
    res.textFills = tokens.getFill(res.textColorToken);
  }

  return res;
}

// Extract string / JSX text from JSX expression or literal
function extractJsxExpressionText(expr) {
  if (!expr) return '';
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.text;
  }
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return expr.name.text;
  }
  if (ts.isCallExpression(expr)) {
    if (expr.arguments && expr.arguments.length > 0) {
      const argText = extractJsxExpressionText(expr.arguments[0]);
      if (argText) return argText;
    }
  }
  if (ts.isConditionalExpression(expr)) {
    return extractJsxExpressionText(expr.whenTrue) || extractJsxExpressionText(expr.whenFalse);
  }
  if (ts.isBinaryExpression(expr)) {
    return extractJsxExpressionText(expr.right) || extractJsxExpressionText(expr.left);
  }
  if (ts.isTemplateExpression(expr)) {
    return expr.head.text + expr.templateSpans.map(s => s.literal.text).join('');
  }
  return '';
}

function extractJsxText(node) {
  if (!node) return '';
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isJsxText(node)) {
    return node.getText().trim();
  }
  if (ts.isJsxExpression(node) && node.expression) {
    return extractJsxExpressionText(node.expression);
  }
  return '';
}

// Extract classNames string from JSX attribute
function extractClassNameValue(attributes) {
  if (!attributes || !attributes.properties) return '';
  for (const prop of attributes.properties) {
    if (ts.isJsxAttribute(prop) && prop.name && prop.name.getText() === 'className') {
      if (prop.initializer) {
        if (ts.isStringLiteral(prop.initializer)) {
          return prop.initializer.text;
        }
        if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
          const expr = prop.initializer.expression;
          if (ts.isStringLiteral(expr)) return expr.text;
          if (ts.isTemplateExpression(expr)) {
            return expr.head.text + expr.templateSpans.map(s => s.literal.text).join(' ');
          }
          // clsx(...) or cn(...)
          if (ts.isCallExpression(expr)) {
            return expr.arguments
              .map(arg => {
                if (ts.isStringLiteral(arg)) return arg.text;
                if (ts.isTemplateExpression(arg)) return arg.head.text;
                return '';
              })
              .filter(Boolean)
              .join(' ');
          }
        }
      }
    }
  }
  return '';
}

// Recursively convert JSX Element node to Figma JSON node definition
function jsxNodeToFigmaNode(node, tokens, depth = 0) {
  if (!node) return null;

  // Handle plain text nodes
  if (ts.isJsxText(node)) {
    const txt = node.getText().trim();
    if (!txt) return null;
    return {
      type: 'TEXT',
      name: 'Text',
      textStyleName: 'default/body/medium/regular',
      characters: txt,
      fontStyle: 'Regular',
      fontSize: 14,
      fills: tokens.getFill('on-surface'),
    };
  }

  // Handle JSX Element or Self-Closing Element
  let tagName = '';
  let attributes = null;
  let children = [];

  if (ts.isJsxElement(node)) {
    tagName = node.openingElement.tagName.getText();
    attributes = node.openingElement.attributes;
    children = node.children || [];
  } else if (ts.isJsxSelfClosingElement(node)) {
    tagName = node.tagName.getText();
    attributes = node.attributes;
  } else if (ts.isJsxExpression(node)) {
    if (node.expression) {
      const expr = node.expression;
      // 1. Binary expression: e.g. hasRedDot && <div ... />
      if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        let target = expr.right;
        if (ts.isParenthesizedExpression(target)) target = target.expression;
        return jsxNodeToFigmaNode(target, tokens, depth);
      }
      // 2. Conditional expression: condition ? <A /> : <B />
      if (ts.isConditionalExpression(expr)) {
        let whenTrue = expr.whenTrue;
        if (ts.isParenthesizedExpression(whenTrue)) whenTrue = whenTrue.expression;
        if (ts.isJsxElement(whenTrue) || ts.isJsxSelfClosingElement(whenTrue)) {
          return jsxNodeToFigmaNode(whenTrue, tokens, depth);
        }
      }
      // 3. Array map expression: items.map(item => <El />)
      if (ts.isCallExpression(expr) && expr.expression && ts.isPropertyAccessExpression(expr.expression) && expr.expression.name.text === 'map') {
        const callback = expr.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          if (ts.isJsxElement(callback.body) || ts.isJsxSelfClosingElement(callback.body)) {
            return jsxNodeToFigmaNode(callback.body, tokens, depth);
          } else if (ts.isBlock(callback.body)) {
            for (const st of callback.body.statements) {
              if (ts.isReturnStatement(st) && st.expression) {
                let retExpr = st.expression;
                if (ts.isParenthesizedExpression(retExpr)) retExpr = retExpr.expression;
                return jsxNodeToFigmaNode(retExpr, tokens, depth);
              }
            }
          }
        }
      }
    }

    const textVal = extractJsxText(node);
    if (textVal) {
      return {
        type: 'TEXT',
        name: 'PropText',
        textStyleName: 'default/body/medium/regular',
        characters: textVal,
        fontStyle: 'Regular',
        fontSize: 14,
        fills: tokens.getFill('on-surface'),
      };
    }
    return null;
  } else {
    return null;
  }

  const classList = extractClassNameValue(attributes);
  const parsed = parseTailwindProps(classList, tokens);

  // SVG handling
  if (tagName.toLowerCase() === 'svg') {
    return {
      type: 'SVG',
      name: 'Icon',
      svgContent: node.getText(),
      width: 20,
      height: 20,
    };
  }

  // Text tag handling (span, p, h1-h6, label, a, strong, em)
  const isTextTag = /^(span|p|h[1-6]|label|a|strong|em|small)$/i.test(tagName);
  if (isTextTag) {
    let characters = '';
    for (const ch of children) {
      const chText = extractJsxText(ch);
      if (chText) {
        characters += (characters ? ' ' : '') + chText;
      }
    }
    if (!characters) {
      characters = tagName.toUpperCase();
    }

    return {
      type: 'TEXT',
      name: `${tagName.toUpperCase()}Text`,
      textStyleName: parsed.textStyleName,
      characters,
      fontStyle: parsed.fontStyle,
      fontSize: parsed.fontSize,
      fills: parsed.textFills,
    };
  }

  // Container tag handling (div, button, section, article, header, footer, etc.)
  const childFigmaNodes = [];
  for (const ch of children) {
    const fNode = jsxNodeToFigmaNode(ch, tokens, depth + 1);
    if (fNode) {
      childFigmaNodes.push(fNode);
    }
  }

  // Detect simple dot indicators (e.g. w-2 h-2 rounded-full)
  if (classList.includes('rounded-full') && (classList.includes('w-2') || classList.includes('w-2.5') || classList.includes('w-1.5') || classList.includes('w-3'))) {
    return {
      type: 'ELLIPSE',
      name: 'DotIndicator',
      width: 8,
      height: 8,
      cornerRadius: 9999,
      cornerRadiusVar: 'constant/full',
      fills: parsed.fills.length > 0 ? parsed.fills : tokens.getFill('primary'),
    };
  }

  const containerName = depth === 0 ? 'container' : (tagName.charAt(0).toUpperCase() + tagName.slice(1));

  return {
    type: 'FRAME',
    name: containerName,
    layoutMode: parsed.layoutMode,
    primaryAxisSizingMode: parsed.primaryAxisSizingMode,
    counterAxisSizingMode: parsed.counterAxisSizingMode,
    primaryAxisAlignItems: parsed.primaryAxisAlignItems,
    counterAxisAlignItems: parsed.counterAxisAlignItems,
    itemSpacing: parsed.itemSpacing,
    itemSpacingVar: parsed.itemSpacingVar,
    paddingTop: parsed.paddingTop,
    paddingBottom: parsed.paddingBottom,
    paddingLeft: parsed.paddingLeft,
    paddingRight: parsed.paddingRight,
    paddingLeftVar: parsed.paddingLeftVar,
    paddingRightVar: parsed.paddingRightVar,
    paddingTopVar: parsed.paddingTopVar,
    paddingBottomVar: parsed.paddingBottomVar,
    cornerRadius: parsed.cornerRadius,
    cornerRadiusVar: parsed.cornerRadiusVar,
    fills: parsed.fills,
    strokes: parsed.strokes,
    strokeWeight: parsed.strokeWeight,
    children: childFigmaNodes,
  };
}

// Main TypeScript AST Parser function
function parseComponentAst(tsxPath, tokens) {
  if (!fs.existsSync(tsxPath)) {
    throw new Error(`File not found: ${tsxPath}`);
  }

  const code = fs.readFileSync(tsxPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    tsxPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const componentBaseName = path.basename(tsxPath, path.extname(tsxPath));
  const discoveredProps = [];
  let rootJsxNode = null;

  // Visit AST nodes
  function visit(node) {
    // 1. Detect Props Interface or Type
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;
      if (/Props$/i.test(typeName) || /Properties$/i.test(typeName) || typeName.toLowerCase().includes(componentBaseName.toLowerCase())) {
        if (ts.isInterfaceDeclaration(node)) {
          for (const member of node.members) {
            if (ts.isPropertySignature(member) && member.name) {
              const propName = member.name.getText();
              const propType = member.type ? member.type.getText() : '';

              // Union of string literals (e.g. 'primary' | 'secondary' | 'ghost')
              if (member.type && ts.isUnionTypeNode(member.type)) {
                const options = member.type.types
                  .filter(ts.isLiteralTypeNode)
                  .map(t => t.literal.getText().replace(/['"`]/g, ''));

                if (options.length > 0) {
                  discoveredProps.push({
                    name: propName.replace('?', ''),
                    type: 'variant',
                    options,
                  });
                }
              } else if (propType === 'boolean' || propType.includes('boolean')) {
                discoveredProps.push({
                  name: propName.replace('?', ''),
                  type: 'boolean',
                  options: ['false', 'true'],
                });
              } else if (propType.includes('string') || propType.includes('ReactNode')) {
                discoveredProps.push({
                  name: propName.replace('?', ''),
                  type: 'text',
                });
              }
            }
          }
        }
      }
    }

    // 2. Detect Component Return JSX Statement
    if (ts.isReturnStatement(node) && node.expression) {
      if (ts.isJsxElement(node.expression) || ts.isJsxSelfClosingElement(node.expression) || ts.isParenthesizedExpression(node.expression)) {
        let expr = node.expression;
        if (ts.isParenthesizedExpression(expr)) {
          expr = expr.expression;
        }
        if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
          if (!rootJsxNode) {
            rootJsxNode = expr;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Fallback root JSX search if return statement was nested inside block
  if (!rootJsxNode) {
    function findFirstJsx(n) {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        rootJsxNode = n;
        return;
      }
      ts.forEachChild(n, findFirstJsx);
    }
    findFirstJsx(sourceFile);
  }

  // Convert root JSX to Figma AST
  const figmaRoot = rootJsxNode ? jsxNodeToFigmaNode(rootJsxNode, tokens, 0) : null;

  // Build variants
  const variantProps = discoveredProps.filter(p => p.type === 'variant' && p.options && p.options.length > 0);
  const variants = [];

  if (variantProps.length > 0) {
    const primaryProp = variantProps[0];
    for (const opt of primaryProp.options) {
      const vName = `${primaryProp.name}=${opt}`;
      const vNode = figmaRoot ? JSON.parse(JSON.stringify(figmaRoot)) : {
        type: 'FRAME',
        name: 'container',
        layoutMode: 'VERTICAL',
        fills: [],
        children: [],
      };
      vNode.name = vName;
      variants.push(vNode);
    }
  } else {
    const defaultNode = figmaRoot ? JSON.parse(JSON.stringify(figmaRoot)) : {
      type: 'FRAME',
      name: 'container',
      layoutMode: 'VERTICAL',
      itemSpacing: 8,
      fills: [],
      children: [
        {
          type: 'TEXT',
          name: `${componentBaseName}Label`,
          textStyleName: 'default/body/large/bold',
          characters: componentBaseName,
          fontStyle: 'Bold',
          fontSize: 16,
          fills: tokens.getFill('on-surface'),
        },
      ],
    };
    defaultNode.name = 'type=default';
    variants.push(defaultNode);
  }

  return {
    name: componentBaseName,
    description: `Auto-generated Figma component for ${componentBaseName} parsed via TypeScript AST.`,
    props: discoveredProps,
    variants,
  };
}

module.exports = {
  parseComponentAst,
  parseTailwindProps,
  jsxNodeToFigmaNode,
};
