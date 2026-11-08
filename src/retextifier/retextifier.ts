import { RetextifierLayerInfo } from '../types/retextifier';
import { getSelectionData } from '../export/exporter';
import { loadFontsForTextNode } from '../utils/fonts';
import { getSafeNodeChildren, isNodeEffectivelyVisible } from '../utils/geometry';

export function buildRetextifierLayerPath(node: BaseNode, rootNode: BaseNode): string {
  try {
    const parts: string[] = [];
    let curr: BaseNode | null = node;
    while (curr && curr.type !== 'PAGE') {
      if ('name' in curr && typeof curr.name === 'string') {
        parts.unshift(curr.name);
      }
      if (curr === rootNode) break;
      curr = curr.parent;
    }
    return parts.length > 0 ? parts.join(' > ') : (('name' in node ? node.name : '') || 'Text');
  } catch (e) {
    return ('name' in node ? node.name : '') || 'Text';
  }
}


function getChildrenInLayersPanelOrder(parent: BaseNode): SceneNode[] {
  const children = getSafeNodeChildren(parent);
  if (children.length <= 1) return children;

  const layoutMode = 'layoutMode' in parent ? (parent as any).layoutMode : 'NONE';
  const isAutoLayout = layoutMode === 'HORIZONTAL' || layoutMode === 'VERTICAL';

  // In Figma's Layers Inspector:
  // - Auto Layout frames (HORIZONTAL / VERTICAL) display children[0] at the top and children[n-1] at the bottom.
  // - Non-Auto-Layout containers (PAGE, GROUP, SECTION, BOOLEAN_OPERATION, and Frames/Components/Instances with layoutMode === 'NONE')
  //   store children back-to-front (z-index), so children[n-1] is at the top of the Layers panel and children[0] is at the bottom.
  if (isAutoLayout) {
    return children;
  }
  return [...children].reverse();
}

function getAncestryChainToPage(node: SceneNode): BaseNode[] {
  const chain: BaseNode[] = [];
  let curr: BaseNode | null = node;
  while (curr && curr.type !== 'DOCUMENT') {
    chain.unshift(curr);
    if (curr.type === 'PAGE') break;
    curr = curr.parent;
  }
  return chain;
}

function compareNodesInLayersPanelOrder(a: SceneNode, b: SceneNode): number {
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
  // Ancestor comes before its descendant in the Layers panel
  if (lcaIndex === chainA.length - 1) return -1;
  if (lcaIndex === chainB.length - 1) return 1;

  const lca = chainA[lcaIndex];
  const childA = chainA[lcaIndex + 1] as SceneNode;
  const childB = chainB[lcaIndex + 1] as SceneNode;

  const orderedChildren = getChildrenInLayersPanelOrder(lca);
  const idxA = orderedChildren.findIndex(c => c.id === childA.id);
  const idxB = orderedChildren.findIndex(c => c.id === childB.id);

  if (idxA !== -1 && idxB !== -1) {
    return idxA - idxB;
  }
  return 0;
}

export function scanDeepTextLayers(): RetextifierLayerInfo[] {
  const selection = [...figma.currentPage.selection].sort(compareNodesInLayersPanelOrder);
  const result: RetextifierLayerInfo[] = [];
  const visited = new Set<string>();

  function registerTextNode(textNode: TextNode, rootNode: SceneNode, pathPrefix?: string) {
    if (!textNode || !textNode.id || visited.has(textNode.id)) return;
    if (!isNodeEffectivelyVisible(textNode)) return;
    visited.add(textNode.id);

    const layerPath = pathPrefix
      ? `${pathPrefix} > ${textNode.name || 'Text'}`
      : buildRetextifierLayerPath(textNode, rootNode);

    const parentName = textNode.parent && 'name' in textNode.parent ? String((textNode.parent as any).name) : '';
    const currentText = typeof textNode.characters === 'string' ? textNode.characters : '';

    result.push({
      id: textNode.id,
      name: textNode.name || 'Text',
      currentText,
      parentName,
      layerPath,
    });
  }

  function traverseNode(node: SceneNode, rootNode: SceneNode, pathPrefix: string) {
    if (!node) return;
    if ('visible' in node && node.visible === false) return;

    if (node.type === 'TEXT') {
      registerTextNode(node as TextNode, rootNode, pathPrefix);
      return;
    }

    const currentPath = pathPrefix ? `${pathPrefix} > ${node.name}` : node.name;

    // 1. Traverse children in exact Figma Layers Inspector top-to-bottom order
    const orderedChildren = getChildrenInLayersPanelOrder(node);
    if (orderedChildren.length > 0) {
      for (const child of orderedChildren) {
        try {
          traverseNode(child, rootNode, currentPath);
        } catch (err) {
          console.warn('[Retextifier] Error traversing child node:', err);
        }
      }
      return;
    }

    // 2. Fallback for special container nodes (e.g. SlotNode) if children were not directly iterable
    if ('findAllWithCriteria' in node && typeof (node as any).findAllWithCriteria === 'function') {
      try {
        const found = ((node as any).findAllWithCriteria({ types: ['TEXT'] }) as TextNode[]).sort(
          compareNodesInLayersPanelOrder
        );
        for (const tn of found) {
          registerTextNode(tn, rootNode);
        }
      } catch (e) {}
    }
  }

  for (const rootNode of selection) {
    try {
      if ('visible' in rootNode && rootNode.visible === false) {
        continue;
      }

      if (rootNode.type === 'TEXT') {
        registerTextNode(rootNode as TextNode, rootNode);
        continue;
      }

      // Traverse hierarchy in exact Figma Layers Inspector top-to-bottom order
      traverseNode(rootNode, rootNode, '');

      // Safeguard for any deeply nested slot text nodes not reached via standard children
      if ('findAllWithCriteria' in rootNode && typeof (rootNode as any).findAllWithCriteria === 'function') {
        try {
          const textNodes = ((rootNode as any).findAllWithCriteria({ types: ['TEXT'] }) as TextNode[]).sort(
            compareNodesInLayersPanelOrder
          );
          for (const tn of textNodes) {
            registerTextNode(tn, rootNode);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[Retextifier] Error scanning selection node:', err);
    }
  }

  return result;
}


export async function sendSelectionToUI() {
  const selectionData = await getSelectionData();
  const textLayers = scanDeepTextLayers();
  figma.ui.postMessage({
    type: 'selection-change',
    selection: selectionData,
    textLayers,
  });
}


export async function sendInitialData() {
  const provider = (await figma.clientStorage.getAsync('ai_provider')) || 'groq';
  const groqApiKey = (await figma.clientStorage.getAsync('groq_api_key')) || '';
  let groqModel = (await figma.clientStorage.getAsync('groq_model')) || '';
  if (!groqModel || groqModel.includes('llama-3.3-70b-versatile')) {
    groqModel = 'openai/gpt-oss-120b';
    await figma.clientStorage.setAsync('groq_model', groqModel);
  }
  const apiKey = (await figma.clientStorage.getAsync('gemini_api_key')) || '';
  let selectedModel = (await figma.clientStorage.getAsync('gemini_selected_model')) || '';
  if (!selectedModel || selectedModel.includes('2.0') || selectedModel.includes('2.5') || selectedModel.includes('tts') || selectedModel.includes('exp') || selectedModel.includes('8b') || selectedModel.includes('high') || selectedModel.includes('preview')) {
    selectedModel = 'models/gemini-3.5-flash-lite';
    await figma.clientStorage.setAsync('gemini_selected_model', selectedModel);
  }
  const promptTone = (await figma.clientStorage.getAsync('gemini_prompt_tone')) || 'balanced';

  figma.ui.postMessage({
    type: 'init-data',
    provider,
    groqApiKey,
    groqModel,
    apiKey,
    selectedModel,
    promptTone,
    selection: await getSelectionData(),
    textLayers: scanDeepTextLayers(),
  });
}

