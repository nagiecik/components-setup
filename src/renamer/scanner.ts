import { AiLayerScanItem } from '../types/renamer';
import { isInsideSlot, isSlotContainer, isSlotLayer, unwrapRedundantSlotWrappers } from '../slots/slots';
import { classifyAutoLayoutFrame, getExistingSemanticFrameName, nodeContainsText } from './frameClassifier';
import {
  classifyTextLayerSemantic,
  classifyTextNodeDirectly,
  getExistingSemanticRole,
  getNodeFillTokenName,
  guardContainerTextSiblingsDeduplication
} from './textClassifier';
import { getInstanceBaseName, hasContentAncestorNode } from '../utils/geometry';
import { sanitizePascalCase } from '../utils/strings';

export let lastAiRenamerPeerMap: Map<string, string[]> = new Map();
export let lastAiRenamerRootIds: string[] = [];

export async function scanLayersForAiRenaming(): Promise<{ items: AiLayerScanItem[]; totalVariantsCount: number; targetRoots: SceneNode[] }> {
  lastAiRenamerPeerMap.clear();
  lastAiRenamerRootIds = [];
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    return { items: [], totalVariantsCount: 0, targetRoots: [] };
  }

  // Resolve target roots: promote variants or nested layers inside a COMPONENT_SET to the parent COMPONENT_SET
  const targetRoots: SceneNode[] = [];
  for (const node of selection) {
    if (node.type === 'COMPONENT_SET') {
      if (!targetRoots.includes(node)) targetRoots.push(node);
    } else if (node.type === 'COMPONENT') {
      const host = (node.parent && node.parent.type === 'COMPONENT_SET') ? (node.parent as SceneNode) : node;
      if (!targetRoots.includes(host)) targetRoots.push(host);
    } else {
      let host: SceneNode | null = null;
      let p: BaseNode | null = node;
      while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
        if (p.type === 'COMPONENT_SET') {
          host = p as SceneNode;
          break;
        }
        if (p.type === 'COMPONENT') {
          host = (p.parent && p.parent.type === 'COMPONENT_SET') ? (p.parent as SceneNode) : (p as SceneNode);
          break;
        }
        if (!host && (p.type === 'FRAME' || p.type === 'GROUP')) {
          host = p as SceneNode;
        }
        p = p.parent;
      }
      if (host && !targetRoots.includes(host)) {
        targetRoots.push(host);
      }
    }
  }

  lastAiRenamerRootIds = targetRoots.map(r => r.id);

  const collectedItems: AiLayerScanItem[] = [];
  let totalVariants = 0;

  for (const root of targetRoots) {
    if (root.type === 'COMPONENT_SET') {
      for (const child of (root as ComponentSetNode).children) {
        if (child.type === 'COMPONENT') {
          unwrapRedundantSlotWrappers(child);
        }
      }
    } else {
      unwrapRedundantSlotWrappers(root);
    }

    if (root.type === 'COMPONENT_SET') {
      const compSet = root as ComponentSetNode;
      const rootCompName = compSet.name || '';
      const variants = compSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
      totalVariants += variants.length;

      // Group nodes by relative tree path across variants
      const nodesByRelPath = new Map<string, SceneNode[]>();

      const collectVariantTree = (node: SceneNode, relPath: string, depth: number) => {
        // Stop recursion for INSTANCE or SLOT: do not rename, do not enter children
        if (node.type === 'INSTANCE' || isSlotContainer(node)) {
          return;
        }

        if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'TEXT') {
          const list = nodesByRelPath.get(relPath) || [];
          list.push(node);
          nodesByRelPath.set(relPath, list);
        }

        if ('children' in node && Array.isArray(node.children)) {
          node.children.forEach((child, index) => {
            const nextPath = relPath ? `${relPath}.${index}` : `${index}`;
            collectVariantTree(child, nextPath, depth + 1);
          });
        }
      };

      for (const variant of variants) {
        // Collect children inside the variant (variant itself is excluded from renaming)
        variant.children.forEach((child, index) => {
          collectVariantTree(child, `${index}`, 1);
        });
      }

      // Build representative AiLayerScanItem for each unique relative path
      for (const [relPath, peerNodes] of nodesByRelPath.entries()) {
        if (!peerNodes || peerNodes.length === 0) continue;
        const rep = peerNodes[0];
        const peerIds = peerNodes.map(p => p.id);

        for (const pid of peerIds) {
          lastAiRenamerPeerMap.set(pid, peerIds);
        }

        if (rep.type === 'TEXT') {
          const txt = rep as TextNode;
          const existingTextRole = getExistingSemanticRole(txt.name || '', txt.characters || '');
          const allPeersAlreadyNamed = existingTextRole && peerNodes.every(p => p.name === existingTextRole);
          if (allPeersAlreadyNamed) {
            continue;
          }

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

          let siblingIndex = 0;
          let totalSiblingTexts = 1;
          const textSiblings = parentChildren.filter(c => c.type === 'TEXT') as TextNode[];
          totalSiblingTexts = textSiblings.length || 1;
          siblingIndex = textSiblings.indexOf(txt);
          if (siblingIndex < 0) siblingIndex = 0;

          const siblingTexts = textSiblings.map(s => {
            let sStyleName = '';
            if (typeof s.textStyleId === 'string' && s.textStyleId) {
              try {
                const st = figma.getStyleById(s.textStyleId);
                if (st) sStyleName = st.name;
              } catch (_) {}
            }
            const sFontStyle = (s.fontName && typeof s.fontName === 'object' && 'style' in s.fontName) ? (s.fontName as FontName).style : '';
            return {
              name: s.name || '',
              characters: s.characters || '',
              fontSize: typeof s.fontSize === 'number' ? s.fontSize : 14,
              fontStyle: sFontStyle,
              textStyleName: sStyleName,
              isMuted: /muted|subtle|secondary|tertiary/i.test(sStyleName)
            };
          });

          let textStyleName = '';
          if (typeof txt.textStyleId === 'string' && txt.textStyleId) {
            try {
              const style = await figma.getStyleByIdAsync(txt.textStyleId);
              if (style) textStyleName = style.name;
            } catch (_) {
              try {
                const style = figma.getStyleById(txt.textStyleId);
                if (style) textStyleName = style.name;
              } catch (_) {}
            }
          }

          const fillTokenName = await getNodeFillTokenName(txt);

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

          const suggestedName = classifyTextLayerSemantic({
            currentName: txt.name || '',
            characters: (txt.characters || '').slice(0, 100),
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
            rootComponentName: rootCompName,
            isLooseText,
            hasInstanceSibling,
            prevSiblingType,
            nextSiblingType,
            indexInParent
          });

          collectedItems.push({
            id: txt.id,
            name: txt.name || '',
            type: 'TEXT',
            containsText: true,
            rootComponentName: rootCompName,
            width: Math.round('width' in txt ? txt.width : 0),
            height: Math.round('height' in txt ? txt.height : 0),
            characters: (txt.characters || '').slice(0, 100),
            fontSize: typeof txt.fontSize === 'number' ? txt.fontSize : 'mixed',
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
            depth: relPath.split('.').length,
            peerIds
          });
        } else {
          const frame = rep as FrameNode | GroupNode;
          const isDirectRootChild = relPath.split('.').length === 1;
          const hasContentAncestor = hasContentAncestorNode(frame);
          const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
          const allPeersAlreadyNamed = existingFrameRole && peerNodes.every(p => p.name === existingFrameRole);
          if (allPeersAlreadyNamed) {
            continue;
          }

          const containsText = nodeContainsText(frame);
          const layoutMode = 'layoutMode' in frame ? frame.layoutMode : 'NONE';
          const layoutWrap = 'layoutWrap' in frame ? frame.layoutWrap : 'NO_WRAP';
          const paddingTop = 'paddingTop' in frame ? frame.paddingTop : 0;
          const paddingBottom = 'paddingBottom' in frame ? frame.paddingBottom : 0;
          const paddingLeft = 'paddingLeft' in frame ? frame.paddingLeft : 0;
          const paddingRight = 'paddingRight' in frame ? frame.paddingRight : 0;
          const itemSpacing = 'itemSpacing' in frame ? frame.itemSpacing : 0;
          const clipsContent = 'clipsContent' in frame ? frame.clipsContent : false;
          const isSlot = isSlotLayer(frame);
          const suggestedName = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);

          const childrenSummary: Array<{
            type: string;
            name: string;
            characters?: string;
            fontSize?: number | string;
            fontStyle?: string;
            mainComponentName?: string;
            parentComponentName?: string;
            componentBaseName?: string;
          }> = [];

          if ('children' in frame && Array.isArray(frame.children)) {
            for (const ch of frame.children) {
              const sItem: any = { type: ch.type, name: ch.name || '' };
              if (ch.type === 'TEXT') {
                const txt = ch as TextNode;
                sItem.characters = (txt.characters || '').slice(0, 40);
                sItem.fontSize = typeof txt.fontSize === 'number' ? txt.fontSize : 'mixed';
                sItem.fontStyle = (txt.fontName && typeof txt.fontName === 'object' && 'style' in txt.fontName)
                  ? (txt.fontName as FontName).style
                  : '';
              } else if (ch.type === 'INSTANCE') {
                const inst = ch as InstanceNode;
                if (inst.mainComponent) {
                  sItem.mainComponentName = inst.mainComponent.name || '';
                  if (inst.mainComponent.parent && inst.mainComponent.parent.type === 'COMPONENT_SET') {
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
            name: frame.name || '',
            type: frame.type as 'FRAME' | 'GROUP',
            containsText,
            rootComponentName: rootCompName,
            width: Math.round('width' in frame ? frame.width : 0),
            height: Math.round('height' in frame ? frame.height : 0),
            layoutMode: layoutMode as any,
            layoutWrap: layoutWrap as any,
            paddingTop,
            paddingBottom,
            paddingLeft,
            paddingRight,
            itemSpacing,
            clipsContent,
            isSlot,
            parentPath: `${compSet.name} [Variant AL]`,
            depth: relPath.split('.').length,
            childrenSummary,
            peerIds,
            suggestedName,
            isDirectRootChild,
            hasContentAncestor
          });
        }
      }
    } else {
      // Standalone COMPONENT, FRAME, or GROUP
      const isStandaloneComp = root.type === 'COMPONENT';
      const rootCompName = root.name || '';

      const scanSubtree = async (node: SceneNode, pathLabel: string, depth: number, isRootNode: boolean) => {
        // INSTANCE or SLOT: skip & stop recursion
        if (node.type === 'INSTANCE' || isSlotContainer(node)) {
          return;
        }

        const isQualifyingFrame = (node.type === 'FRAME' || node.type === 'GROUP') && !(isRootNode && isStandaloneComp);
        const isQualifyingText = node.type === 'TEXT';

        if (isQualifyingFrame) {
          const frame = node as FrameNode | GroupNode;
          const isDirectRootChild = (depth === 1 && !isRootNode) || (isRootNode && !isStandaloneComp);
          const hasContentAncestor = hasContentAncestorNode(frame);
          const existingFrameRole = getExistingSemanticFrameName(frame, isDirectRootChild, hasContentAncestor);
          if (!existingFrameRole || frame.name !== existingFrameRole) {
            const containsText = nodeContainsText(frame);
            const peerIds = [frame.id];
            lastAiRenamerPeerMap.set(frame.id, peerIds);

            const layoutMode = 'layoutMode' in frame ? frame.layoutMode : 'NONE';
            const layoutWrap = 'layoutWrap' in frame ? frame.layoutWrap : 'NO_WRAP';
            const paddingTop = 'paddingTop' in frame ? frame.paddingTop : 0;
            const paddingBottom = 'paddingBottom' in frame ? frame.paddingBottom : 0;
            const paddingLeft = 'paddingLeft' in frame ? frame.paddingLeft : 0;
            const paddingRight = 'paddingRight' in frame ? frame.paddingRight : 0;
            const itemSpacing = 'itemSpacing' in frame ? frame.itemSpacing : 0;
            const clipsContent = 'clipsContent' in frame ? frame.clipsContent : false;
            const isSlot = isSlotLayer(frame);
            const suggestedName = classifyAutoLayoutFrame(frame, isDirectRootChild, hasContentAncestor);

            const childrenSummary: Array<{
              type: string;
              name: string;
              characters?: string;
              fontSize?: number | string;
              fontStyle?: string;
              mainComponentName?: string;
              parentComponentName?: string;
              componentBaseName?: string;
            }> = [];

            if ('children' in frame && Array.isArray(frame.children)) {
              for (const ch of frame.children) {
                const sItem: any = { type: ch.type, name: ch.name || '' };
                if (ch.type === 'TEXT') {
                  const txt = ch as TextNode;
                  sItem.characters = (txt.characters || '').slice(0, 40);
                  sItem.fontSize = typeof txt.fontSize === 'number' ? txt.fontSize : 'mixed';
                  sItem.fontStyle = (txt.fontName && typeof txt.fontName === 'object' && 'style' in txt.fontName)
                    ? (txt.fontName as FontName).style
                    : '';
                } else if (ch.type === 'INSTANCE') {
                  const inst = ch as InstanceNode;
                  if (inst.mainComponent) {
                    sItem.mainComponentName = inst.mainComponent.name || '';
                    if (inst.mainComponent.parent && inst.mainComponent.parent.type === 'COMPONENT_SET') {
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
              name: frame.name || '',
              type: frame.type as 'FRAME' | 'GROUP',
              containsText,
              rootComponentName: rootCompName,
              width: Math.round('width' in frame ? frame.width : 0),
              height: Math.round('height' in frame ? frame.height : 0),
              layoutMode: layoutMode as any,
              layoutWrap: layoutWrap as any,
              paddingTop,
              paddingBottom,
              paddingLeft,
              paddingRight,
              itemSpacing,
              clipsContent,
              isSlot,
              parentPath: pathLabel || root.name || 'Component',
              depth,
              childrenSummary,
              peerIds,
              suggestedName,
              isDirectRootChild,
              hasContentAncestor
            });
          }
        } else if (isQualifyingText) {
          const txt = node as TextNode;
          const existingTextRole = getExistingSemanticRole(txt.name || '', txt.characters || '');
          if (!existingTextRole || txt.name !== existingTextRole) {
            const peerIds = [txt.id];
            lastAiRenamerPeerMap.set(txt.id, peerIds);

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

            let siblingIndex = 0;
            let totalSiblingTexts = 1;
            const textSiblings = parentChildren.filter(c => c.type === 'TEXT') as TextNode[];
            totalSiblingTexts = textSiblings.length || 1;
            siblingIndex = textSiblings.indexOf(txt);
            if (siblingIndex < 0) siblingIndex = 0;

            const siblingTexts = textSiblings.map(s => {
              let sStyleName = '';
              if (typeof s.textStyleId === 'string' && s.textStyleId) {
                try {
                  const st = figma.getStyleById(s.textStyleId);
                  if (st) sStyleName = st.name;
                } catch (_) {}
              }
              const sFontStyle = (s.fontName && typeof s.fontName === 'object' && 'style' in s.fontName) ? (s.fontName as FontName).style : '';
              return {
                name: s.name || '',
                characters: s.characters || '',
                fontSize: typeof s.fontSize === 'number' ? s.fontSize : 14,
                fontStyle: sFontStyle,
                textStyleName: sStyleName,
                isMuted: /muted|subtle|secondary|tertiary/i.test(sStyleName)
              };
            });

            let textStyleName = '';
            if (typeof txt.textStyleId === 'string' && txt.textStyleId) {
              try {
                const style = await figma.getStyleByIdAsync(txt.textStyleId);
                if (style) textStyleName = style.name;
              } catch (_) {
                try {
                  const style = figma.getStyleById(txt.textStyleId);
                  if (style) textStyleName = style.name;
                } catch (_) {}
              }
            }

            const fillTokenName = await getNodeFillTokenName(txt);

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

            const suggestedName = classifyTextLayerSemantic({
              currentName: txt.name || '',
              characters: (txt.characters || '').slice(0, 100),
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
              rootComponentName: rootCompName,
              isLooseText,
              hasInstanceSibling,
              prevSiblingType,
              nextSiblingType,
              indexInParent
            });

            collectedItems.push({
              id: txt.id,
              name: txt.name || '',
              type: 'TEXT',
              containsText: true,
              rootComponentName: rootCompName,
              width: Math.round('width' in txt ? txt.width : 0),
              height: Math.round('height' in txt ? txt.height : 0),
              characters: (txt.characters || '').slice(0, 100),
              fontSize: typeof txt.fontSize === 'number' ? txt.fontSize : 'mixed',
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
              parentPath: pathLabel || root.name || 'Component',
              depth,
              peerIds
            });
          }
        }

        if ('children' in node && Array.isArray(node.children)) {
          const nextParent = isRootNode && isStandaloneComp ? (root.name || '') : `${pathLabel} > ${node.name || ''}`;
          for (const ch of node.children) {
            await scanSubtree(ch, nextParent, depth + 1, false);
          }
        }
      };

      if ('children' in root && Array.isArray((root as any).children)) {
        // Never rename the root node itself (whether COMPONENT, FRAME, or GROUP) — its name defines the target component name!
        // Only traverse and rename layers inside the root.
        for (const ch of (root as FrameNode | GroupNode | ComponentNode).children) {
          await scanSubtree(ch, root.name || '', 1, false);
        }
      }
    }
  }

  // Priority 4 Post-processing guard: ensure text siblings in the same container never have duplicate roles
  const textsByParent = new Map<string, AiLayerScanItem[]>();
  for (const it of collectedItems) {
    if (it.type === 'TEXT') {
      const key = it.parentPath || '';
      if (!textsByParent.has(key)) textsByParent.set(key, []);
      textsByParent.get(key)!.push(it);
    }
  }
  for (const group of textsByParent.values()) {
    if (group.length > 1) {
      const mapped = group.map(g => ({
        name: g.suggestedName || g.name,
        fontSize: typeof g.fontSize === 'number' ? g.fontSize : 14,
        fontStyle: g.fontStyle || '',
        textStyleName: g.textStyleName || '',
        item: g
      }));
      guardContainerTextSiblingsDeduplication(mapped as any);
      for (const m of mapped) {
        m.item.suggestedName = m.name;
      }
    }
  }

  return { items: collectedItems, totalVariantsCount: totalVariants, targetRoots };
}

// Page variable scanning is on-demand via the Variables Inspector action

