import { dsRegistry, setNodeAuditIgnored } from './audit/registry';
import { runAuditTokens, scanDocument } from './audit/inspector';
import {
  exportNodesToCode,
  findExportableComponentsAndSets,
  isNodeOnCurrentPage
} from './export/exporter';
import {
  scanDeepTextLayers,
  sendInitialData,
  sendSelectionToUI
} from './retextifier/retextifier';
import {
  needsSmartSetup,
  runComponentSetLogic,
  runRenamePascalCaseLogic,
  runSetupComponentSetHorizontalLogic,
  setupComponentSets
} from './components/setup';
import {
  isLibraryComponentsPage,
  moveSelectedToComponentsPage,
  organizeElementsOnCanvas
} from './components/canvas';
import { handleGenerateComponent, handleGeneratePreset } from './generator/presets';
import { handleConvertCase } from './casing/casing';
import {
  autoCreateTextPropsAndExtractItems,
  autoCreateTextPropsAndExtractItemsSync,
  collectAutoPropsPreviewData
} from './auto-props/autoProps';
import {
  lastAiRenamerPeerMap,
  lastAiRenamerRootIds,
  scanLayersForAiRenaming
} from './renamer/scanner';
import { sanitizePascalCase } from './utils/strings';
import { loadFontsForTextNode, safeLoadFontAndSetCharacters } from './utils/fonts';
import { calculateMatchStats, executeSmartSwapBatch } from './components/smartSwap';
import { executeFontSwapRules, FontSwapRule, scanSelectionFonts } from './components/fontReplacer';
import { sanitizeLayerNameByContext } from './renamer/frameClassifier';
import { collectDirectInstances, collectDirectTextNodes } from './properties/collectors';
import { cleanRebuildComponentProperties } from './properties/rebuilder';
import { reorderComponentSetVariants } from './components/canvas';
import { ensureTemporaryMetricsCollection, preloadBoundVariablesForRoots } from './variables/variables';
import { AutoPropsOptions } from './types/auto-props';
import { initDsGeneratorUI } from './ds-generator/init';
import { exportVariablesToJson } from './ds-generator/bridge/exportJson';
import { updateExistingCollectionModes, ensureLayoutStringVariable } from './ds-generator/variables/variableHelpers';
import { handleCreatePalette } from './ds-generator/generator/createPalette';

declare const __uiFiles__: { components?: string; generator?: string } | undefined;

let currentPluginMode: 'components' | 'generator' = 'components';

async function launchPluginMode(mode: 'components' | 'generator') {
  currentPluginMode = mode;
  try {
    await figma.clientStorage.setAsync('last_active_plugin_mode', mode);
  } catch (e) {}

  const html =
    typeof __uiFiles__ !== 'undefined' && __uiFiles__ && __uiFiles__[mode]
      ? __uiFiles__[mode]!
      : __html__;

  if (mode === 'generator') {
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

figma.on('selectionchange', () => {
  if (currentPluginMode === 'components') {
    sendSelectionToUI();
    sendSmartSwapSelectionToUI();
  }
});

figma.on('currentpagechange', () => {
  if (currentPluginMode === 'components') {
    sendSelectionToUI();
    sendSmartSwapSelectionToUI();
  }
});

function resolveSyncTargetName(selection: readonly SceneNode[]): string | null {
  if (selection.length === 0) return null;
  let curr: BaseNode | null = selection[0];
  let bestNode: SceneNode = selection[0];
  while (curr && curr.type !== 'PAGE') {
    if (curr.type === 'COMPONENT_SET') {
      bestNode = curr as SceneNode;
      break;
    }
    if (curr.type === 'COMPONENT' && bestNode.type !== 'COMPONENT_SET') {
      bestNode = curr as SceneNode;
    }
    curr = curr.parent;
  }
  const cleanName = bestNode.name.trim();
  return cleanName ? `<${cleanName}/>` : null;
}

function hasComponentSetInSelection(selection: readonly SceneNode[]): boolean {
  for (const node of selection) {
    let curr: BaseNode | null = node;
    while (curr && curr.type !== 'PAGE') {
      if (curr.type === 'COMPONENT_SET') return true;
      curr = curr.parent;
    }
  }
  return false;
}

async function sendSmartSwapSelectionToUI() {
  const selection = figma.currentPage.selection;
  const items = selection.map(n => ({ id: n.id, name: n.name, type: n.type }));
  const nodeTypes = selection.map(n => n.type);
  const isOnLibraryPage = isLibraryComponentsPage(figma.currentPage);
  const hasComponentSet = hasComponentSetInSelection(selection);
  const syncTargetName = resolveSyncTargetName(selection);

  let suggestedSource: { id: string; name: string; type: string } | null = null;
  let suggestedTemplate: { id: string; name: string; type: string } | null = null;
  let matchStats: any = null;

  if (selection.length >= 2) {
    const compIdx = selection.findIndex(n => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET');
    const instIdx = selection.findIndex(n => n.type === 'INSTANCE');

    let templateNode: SceneNode | null = null;
    let sourceNodes: SceneNode[] = [];

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
      } catch (e) {}
    }
  } else if (selection.length === 1) {
    const single = selection[0];
    if (single.type === 'COMPONENT' || single.type === 'COMPONENT_SET') {
      suggestedTemplate = { id: single.id, name: single.name, type: single.type };
    } else {
      suggestedSource = { id: single.id, name: single.name, type: single.type };
    }
  }

  figma.ui.postMessage({
    type: 'smart-swap-selection-update',
    count: selection.length,
    nodeTypes,
    isOnLibraryPage,
    hasComponentSet,
    syncTargetName,
    items,
    suggestedSource,
    suggestedTemplate,
    matchStats,
  });
}

const handleUiMessage = async (msg: any) => {
  if (msg.type === 'switch-plugin-mode') {
    const targetMode = msg.mode === 'generator' ? 'generator' : 'components';
    await launchPluginMode(targetMode);
    return;
  } else if (msg.type === 'resize') {
    figma.ui.resize(640, 1024);
    return;
  } else if (msg.type === 'export-variables') {
    await exportVariablesToJson({ autoSync: false, silent: false });
    return;
  } else if (msg.type === 'update-modes') {
    try {
      const cols = await figma.variables.getLocalVariableCollectionsAsync();
      const allVars = await figma.variables.getLocalVariablesAsync();
      const count = updateExistingCollectionModes(cols);
      ensureLayoutStringVariable(cols, allVars);
      figma.notify(`Zaktualizowano ${count} trybów (modes) w kolekcjach na PascalCase / ALLCAPS. ✨`);
    } catch (err: any) {
      figma.notify('Error updating modes: ' + err.message, { error: true });
    }
    return;
  } else if (msg.type === 'create-palette') {
    await handleCreatePalette(msg);
    return;
  }

  if (msg.type === 'set-tokens') {
    if (msg.tokens) {
      dsRegistry.updateTokens(msg.tokens);
    }
  } else if (msg.type === 'scan') {
    await scanDocument(msg.scope || 'page');
  } else if (msg.type === 'audit-tokens') {
    await runAuditTokens(msg.scope || 'selection');
  } else if (msg.type === 'toggle-audit-ignore') {
    const nodeIds: string[] = Array.isArray(msg.nodeIds) ? msg.nodeIds : (msg.nodeId ? [msg.nodeId] : []);
    const category: string = msg.category || '';
    const property: string = msg.property || '';
    const ignored: boolean = !!msg.ignored;

    for (const id of nodeIds) {
      try {
        const node = await figma.getNodeByIdAsync(id);
        if (node && 'getPluginData' in node) {
          setNodeAuditIgnored(node as SceneNode, category, property, ignored);
        }
      } catch (err) {
        console.warn('Failed to update ignored audit status for node', id, err);
      }
    }
    const count = nodeIds.length;
    const msgText = ignored
      ? `Zignorowano problem (${category}) dla ${count} warstw${count === 1 ? 'y' : ''} (zapisano w pliku) 👁️`
      : `Przywrócono problem (${category}) dla ${count} warstw${count === 1 ? 'y' : ''} ↩️`;
    figma.notify(msgText);
    await runAuditTokens(msg.scope || 'selection');
  } else if (msg.type === 'restore-all-audit-ignored') {
    const nodeIds: string[] = Array.isArray(msg.nodeIds) ? msg.nodeIds : [];
    for (const id of nodeIds) {
      try {
        const node = await figma.getNodeByIdAsync(id);
        if (node && 'setPluginData' in node) {
          (node as any).setPluginData('ignored_audit_issues', JSON.stringify([]));
        }
      } catch (e) {}
    }
    figma.notify(`Przywrócono wszystkie zignorowane reguły (${nodeIds.length} warstw) ↩️`);
    await runAuditTokens(msg.scope || 'selection');
  } else if (msg.type === 'arrange-grid') {
    await organizeElementsOnCanvas();
  } else if (msg.type === 'generate-component') {
    await handleGenerateComponent(msg.schema, msg.force);
  } else if (msg.type === 'generate-preset') {
    await handleGeneratePreset(msg.presetName, msg.force);
  } else if (msg.type === 'open-sync-components-modal') {
    try {
      const selection = figma.currentPage.selection;
      const roots = findExportableComponentsAndSets(selection);
      const validRoots = roots.filter((n) => !n.removed && isNodeOnCurrentPage(n));
      if (!validRoots || validRoots.length === 0) {
        figma.notify('Nie znaleziono komponentów ani Component Setów w zaznaczeniu ani na stronie.', { error: true });
        return;
      }

      // Safe selection on canvas
      try {
        figma.currentPage.selection = validRoots;
        if (validRoots.length > 0) {
          figma.viewport.scrollAndZoomIntoView(validRoots);
        }
      } catch (selErr) {
        console.warn('[Sync] Could not set canvas selection:', selErr);
      }

      const items = validRoots.map((node) => {
        const isSet = node.type === 'COMPONENT_SET';
        let vCount = 1;
        try {
          if (isSet) {
            vCount = (node as ComponentSetNode).children.filter((c) => c.type === 'COMPONENT').length;
          }
        } catch (e) {}
        const parentName = node.parent && node.parent.type !== 'PAGE' ? node.parent.name : '';
        const isPrivate = node.name.startsWith('_') || node.name.startsWith('.');
        let description = '';
        try {
          description = (node as any).description || '';
        } catch (e) {}
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          variantsCount: vCount,
          parentPath: parentName,
          isPrivate,
          description,
        };
      });

      figma.ui.postMessage({
        type: 'sync-components-list',
        items,
      });
    } catch (err: any) {
      console.error('[Sync] Error in open-sync-components-modal:', err);
      figma.notify(`Błąd otwierania listy: ${err && err.message ? err.message : String(err)}`, { error: true });
    }
  } else if (msg.type === 'sync-selection-from-ui') {
    try {
      const ids: string[] = msg.nodeIds || [];
      const nodesToSelect: SceneNode[] = [];
      for (const id of ids) {
        const node = await figma.getNodeByIdAsync(id);
        if (node && 'visible' in node && !node.removed && isNodeOnCurrentPage(node)) {
          nodesToSelect.push(node as SceneNode);
        }
      }
      figma.currentPage.selection = nodesToSelect;
    } catch (err: any) {
      console.warn('[Sync] Error syncing selection from UI:', err);
    }
  } else if (msg.type === 'focus-sync-node') {
    try {
      if (msg.nodeId) {
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node && 'visible' in node && !node.removed && isNodeOnCurrentPage(node)) {
          figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        }
      }
    } catch (err: any) {
      console.warn('[Sync] Error focusing node:', err);
    }
  } else if (msg.type === 'export-nodes-by-ids') {
    try {
      const ids: string[] = msg.nodeIds || [];
      const roots: SceneNode[] = [];
      for (const id of ids) {
        const node = await figma.getNodeByIdAsync(id);
        if (node && 'visible' in node && !node.removed && isNodeOnCurrentPage(node)) {
          roots.push(node as SceneNode);
        }
      }
      if (roots.length === 0) {
        figma.notify('Nie wybrano żadnego komponentu do eksportu.', { error: true });
        return;
      }
      try {
        figma.currentPage.selection = roots;
      } catch (e) {}
      await exportNodesToCode(roots);
    } catch (err: any) {
      console.error('[Export] Error:', err);
      figma.notify(`Export failed: ${err && err.message ? err.message : String(err)}`, { error: true });
    }
  } else if (msg.type === 'export-selected-to-code') {
    try {
      const selection = figma.currentPage.selection;
      const roots = findExportableComponentsAndSets(selection);
      const validRoots = roots.filter((n) => !n.removed && isNodeOnCurrentPage(n));
      if (!validRoots || validRoots.length === 0) {
        figma.notify('Please select a component or frame to export code.', { error: true });
        return;
      }
      await exportNodesToCode(validRoots);
    } catch (err: any) {
      console.error('[Export] Error:', err);
      figma.notify(`Export failed: ${err && err.message ? err.message : String(err)}`, { error: true });
    }
  } else if (msg.type === 'resize-window') {
    figma.ui.resize(640, 1024);
  } else if (msg.type === 'move-to-components-page') {
    await moveSelectedToComponentsPage();
    sendSmartSwapSelectionToUI();
  } else if (msg.type === 'organize-and-library') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      await organizeElementsOnCanvas(true);
    } else if (!isLibraryComponentsPage(figma.currentPage)) {
      await moveSelectedToComponentsPage();
    } else {
      await organizeElementsOnCanvas(false);
    }
    sendSmartSwapSelectionToUI();
  } else if (msg.type === 'get-selection') {
    sendSelectionToUI();
    sendSmartSwapSelectionToUI();
  } else if (msg.type === 'select-nodes') {
    const ids: string[] = msg.nodeIds || [];
    const nodesToSelect: SceneNode[] = [];

    for (const id of ids) {
      const node = await figma.getNodeByIdAsync(id);
      if (node && 'visible' in node) {
        nodesToSelect.push(node as SceneNode);
      }
    }

    if (nodesToSelect.length > 0) {
      const firstNode = nodesToSelect[0];
      let parent: BaseNode | null = firstNode;
      while (parent && parent.type !== 'PAGE') {
        parent = parent.parent;
      }
      if (parent && parent.type === 'PAGE' && figma.currentPage !== parent) {
        figma.currentPage = parent as PageNode;
      }

      figma.currentPage.selection = nodesToSelect;
      figma.viewport.scrollAndZoomIntoView(nodesToSelect);
      figma.notify(`Selected ${nodesToSelect.length} layer${nodesToSelect.length > 1 ? 's' : ''}`);
    } else {
      figma.notify('Selected layers no longer exist on canvas', { error: true });
    }
  } else if (msg.type === 'run-smart-setup') {
    const selection = figma.currentPage.selection;
    const isSet = hasComponentSetInSelection(selection);
    if (isSet && msg.setMode === 'set-only') {
      await runSetupComponentSetHorizontalLogic();
    } else {
      await runComponentSetLogic();
    }
  } else if (msg.type === 'run-component-set') {
    await runComponentSetLogic();
  } else if (msg.type === 'run-component-set-horizontal') {
    await runSetupComponentSetHorizontalLogic();
  } else if (msg.type === 'rename-pascal-case') {
    await runRenamePascalCaseLogic();
  } else if (msg.type === 'save-description') {
    const descText = typeof msg.description === 'string' ? msg.description.trim() : '';

    if (!descText) {
      figma.notify('Description is empty.', { error: true });
      return;
    }

    let normalizedMarkdown = descText;
    if ('util' in figma && typeof (figma as any).util?.normalizeMarkdown === 'function') {
      try {
        normalizedMarkdown = (figma as any).util.normalizeMarkdown(descText);
      } catch (e) {
        console.warn('Markdown normalization error:', e);
      }
    }

    const targetsToUpdate = new Set<ComponentNode | ComponentSetNode>();

    const resolveTargetNodes = (node: BaseNode | null) => {
      if (!node) return;
      let curr: BaseNode | null = node;
      while (curr) {
        if (curr.type === 'COMPONENT_SET') {
          // Update ONLY the ComponentSetNode itself, NOT child variants
          targetsToUpdate.add(curr as ComponentSetNode);
          break;
        }
        if (curr.type === 'COMPONENT') {
          // Update ONLY the specific ComponentNode (variant)
          targetsToUpdate.add(curr as ComponentNode);
          break;
        }
        if (curr.type === 'INSTANCE') {
          const main = (curr as InstanceNode).mainComponent;
          if (main) {
            targetsToUpdate.add(main);
          }
          break;
        }
        curr = curr.parent;
      }
    };

    // 1. Resolve from nodeId asynchronously using getNodeByIdAsync
    if (msg.nodeId) {
      try {
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        resolveTargetNodes(node);
      } catch (err) {
        console.warn('Error fetching node by id:', err);
      }
    }

    // 2. Resolve from all nodes in active selection if targetsToUpdate is empty
    if (targetsToUpdate.size === 0) {
      for (const selNode of figma.currentPage.selection) {
        resolveTargetNodes(selNode);
      }
    }

    let updatedCount = 0;
    for (const target of targetsToUpdate) {
      try {
        if ('description' in target) {
          target.description = descText;
        }
        if ('descriptionMarkdown' in target) {
          (target as any).descriptionMarkdown = normalizedMarkdown;
        }
        if (msg.documentationLink && ('documentationLinks' in target)) {
          try {
            target.documentationLinks = [{ uri: msg.documentationLink }];
          } catch (linkErr) {
            console.warn('Could not set documentationLink on:', target.name, linkErr);
          }
        }
        updatedCount++;
      } catch (err) {
        console.warn('Could not set description on:', target.name, err);
      }
    }

    if (updatedCount > 0) {
      const firstName = Array.from(targetsToUpdate)[0].name;
      figma.notify(`Applied description to "${firstName}" ✨`);
      sendSelectionToUI();
      figma.ui.postMessage({
        type: 'description-saved',
        name: firstName,
        description: descText,
        success: true
      });
    } else {
      figma.notify('Please select a Component or Component Set on canvas.', {
        error: true,
      });
      figma.ui.postMessage({
        type: 'description-saved',
        success: false,
        message: 'No Component or Component Set found in selection.'
      });
    }
  } else if (msg.type === 'save-batch-descriptions') {
    const { items, documentationLink } = msg as { items: Array<{ nodeId: string; description: string; documentationLink?: string }>; documentationLink?: string };
    let savedCount = 0;

    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const node = await figma.getNodeByIdAsync(item.nodeId);
          if (node && ('description' in node)) {
            const comp = node as ComponentNode | ComponentSetNode;
            comp.description = item.description;
            if ('descriptionMarkdown' in comp) {
              let norm = item.description;
              if ('util' in figma && typeof (figma as any).util?.normalizeMarkdown === 'function') {
                try {
                  norm = (figma as any).util.normalizeMarkdown(item.description);
                } catch (e) {
                  // ignore
                }
              }
              (comp as any).descriptionMarkdown = norm;
            }
            const docUri = item.documentationLink || documentationLink;
            if (docUri && ('documentationLinks' in comp)) {
              try {
                comp.documentationLinks = [{ uri: docUri }];
              } catch (e) {
                console.warn('Could not set documentationLinks on batch comp:', e);
              }
            }
            savedCount++;
          }
        } catch (err) {
          console.warn('Batch item error:', err);
        }
      }
    }

    figma.notify(`Applied descriptions to ${savedCount} variants! ✨`);
    sendSelectionToUI();
  } else if (msg.type === 'set-documentation-link') {
    const docUrl = typeof msg.url === 'string' ? msg.url.trim() : '';
    if (!docUrl) {
      figma.notify('Documentation link is empty.', { error: true });
      return;
    }

    const targetsToUpdate = new Set<ComponentNode | ComponentSetNode>();

    const resolveTargetNodes = (node: BaseNode | null) => {
      if (!node) return;
      let curr: BaseNode | null = node;
      while (curr) {
        if (curr.type === 'COMPONENT_SET') {
          targetsToUpdate.add(curr as ComponentSetNode);
          break;
        }
        if (curr.type === 'COMPONENT') {
          targetsToUpdate.add(curr as ComponentNode);
          break;
        }
        if (curr.type === 'INSTANCE') {
          const main = (curr as InstanceNode).mainComponent;
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
        console.warn('Error fetching node by id:', err);
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
        if ('documentationLinks' in target) {
          target.documentationLinks = [{ uri: docUrl }];
          if (msg.includeVariants && target.type === 'COMPONENT_SET') {
            for (const child of (target as ComponentSetNode).children) {
              if (child.type === 'COMPONENT') {
                child.documentationLinks = [{ uri: docUrl }];
              }
            }
          }
          updatedCount++;
        }
      } catch (err) {
        console.warn('Could not set documentation link:', err);
      }
    }

    if (updatedCount > 0) {
      const firstName = Array.from(targetsToUpdate)[0].name;
      figma.notify(`Attached documentation link to "${firstName}" 🔗`);
      sendSelectionToUI();
    } else {
      figma.notify('Please select a Component or Component Set on canvas.', { error: true });
    }
  } else if (msg.type === 'save-api-config') {
    if (typeof msg.provider === 'string') {
      await figma.clientStorage.setAsync('ai_provider', msg.provider);
    }
    if (typeof msg.groqApiKey === 'string') {
      await figma.clientStorage.setAsync('groq_api_key', msg.groqApiKey);
    }
    if (typeof msg.groqModel === 'string') {
      await figma.clientStorage.setAsync('groq_model', msg.groqModel);
    }
    if (typeof msg.apiKey === 'string') {
      await figma.clientStorage.setAsync('gemini_api_key', msg.apiKey);
    }
    if (typeof msg.selectedModel === 'string') {
      await figma.clientStorage.setAsync('gemini_selected_model', msg.selectedModel);
    }
    if (typeof msg.promptTone === 'string') {
      await figma.clientStorage.setAsync('gemini_prompt_tone', msg.promptTone);
    }
    figma.notify('AI settings saved! ⚡');
  } else if (msg.type === 'clear-api-config') {
    if (msg.provider === 'groq') {
      await figma.clientStorage.deleteAsync('groq_api_key');
      await figma.clientStorage.deleteAsync('groq_model');
      figma.notify('Groq disconnected.');
    } else {
      await figma.clientStorage.deleteAsync('gemini_api_key');
      await figma.clientStorage.deleteAsync('gemini_selected_model');
      figma.notify('Google Gemini disconnected.');
    }
  } else if (msg.type === 'get-retextifier-layers') {
    const textLayers = scanDeepTextLayers();
    figma.ui.postMessage({
      type: 'retextifier-layers',
      layers: textLayers,
    });
  } else if (msg.type === 'apply-retextifier') {
    const updates: Array<{ id: string; text: string }> = Array.isArray(msg.updates) ? msg.updates : [];
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of updates) {
      if (!item.id || typeof item.text !== 'string' || item.text.trim() === '') {
        continue;
      }

      try {
        const node = await figma.getNodeByIdAsync(item.id);
        if (node && node.type === 'TEXT') {
          const textNode = node as TextNode;
          await loadFontsForTextNode(textNode);
          try {
            textNode.characters = item.text;
          } catch (charErr) {
            try {
              const fallbackFont = { family: 'Inter', style: 'Regular' };
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
      figma.notify(`Zaktualizowano ${updatedCount} ${updatedCount === 1 ? 'warstwę tekstową' : 'warstw tekstowych'}! ✨`);
      sendSelectionToUI();
      figma.ui.postMessage({
        type: 'retextifier-applied',
        updatedCount,
        layers: scanDeepTextLayers(),
      });
    } else if (errorCount > 0) {
      figma.notify('Nie udało się zaktualizować warstw (brak czcionki lub błąd warstwy).', { error: true });
    } else {
      figma.notify('Brak zmian – żadne pole nie zostało wypełnione.');
    }
  } else if (msg.type === 'scan-layers-for-ai-renaming') {
    try {
      let didAutoSmartSetup = false;
      if (needsSmartSetup(figma.currentPage.selection)) {
        await runComponentSetLogic();
        didAutoSmartSetup = true;
      }

      const { items, totalVariantsCount, targetRoots } = await scanLayersForAiRenaming();
      if (!items || items.length === 0) {
        const validRoots = (targetRoots || []).filter(
          r => r.type === 'COMPONENT_SET' || r.type === 'COMPONENT' || r.type === 'FRAME'
        ) as (ComponentSetNode | ComponentNode | FrameNode)[];

        if (validRoots.length > 0 && msg.autoProps !== false) {
          if (msg.reviewAutoProps === true) {
            const previewData = collectAutoPropsPreviewData(validRoots);
            figma.ui.postMessage({
              type: 'auto-props-preview-needed',
              previewData,
              renamedCount: 0
            });
            figma.notify('Warstwy są już poprawne. Skonfiguruj właściwości... ✨');
            sendSelectionToUI();
            return;
          }

          // Full auto mode: directly run autoCreateTextPropsAndExtractItemsSync!
          const allTextNodes: TextNode[] = [];
          const allDirectInstances: InstanceNode[] = [];
          for (const r of validRoots) {
            allTextNodes.push(...collectDirectTextNodes(r));
            allDirectInstances.push(...collectDirectInstances(r));
          }

          const [, , , loadedVars] = await Promise.all([
            Promise.all(allTextNodes.map(t => loadFontsForTextNode(t))),
            Promise.all(allDirectInstances.map(async (inst) => {
              if (inst.getMainComponentAsync) {
                try { await inst.getMainComponentAsync(); } catch (e) {}
              }
            })),
            (async () => {
              try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch (e) {}
            })(),
            preloadBoundVariablesForRoots(validRoots)
          ]);

          let autoPropsOptions: any = undefined;
          if (typeof msg.autoProps === 'object' && msg.autoProps !== null) {
            autoPropsOptions = msg.autoProps;
          }

          const autoRes = autoCreateTextPropsAndExtractItemsSync(validRoots, loadedVars, autoPropsOptions);
          const parts: string[] = [];
          if (didAutoSmartSetup) parts.push('Smart Setup');
          if (autoRes.slotsCreatedCount > 0) parts.push(`${autoRes.slotsCreatedCount} ${autoRes.slotsCreatedCount === 1 ? 'kontener Slot' : 'kontenery Slot'}`);
          if (autoRes.instanceSwapPropsCount > 0) parts.push(`${autoRes.instanceSwapPropsCount} INSTANCE_SWAP`);
          if (autoRes.booleanPropsCount > 0) parts.push(`${autoRes.booleanPropsCount} BOOLEAN`);
          if (autoRes.textPropsCount > 0) parts.push(`${autoRes.textPropsCount} TEXT`);
          if (autoRes.extractedItemsCount > 0) parts.push(`${autoRes.extractedItemsCount} .../Item`);
          if (autoRes.nestedInstancesCount > 0) parts.push(`${autoRes.nestedInstancesCount} Nested`);

          const summary = parts.length > 0 ? ` [${parts.join(', ')}]` : '';
          figma.notify(parts.length > 0 ? `Zachowano istniejącą strukturę i uzupełniono brakujące elementy${summary}! ✨` : 'Komponent ma już kompletną konfigurację i nazwy warstw! ✨');
          sendSelectionToUI();
          figma.ui.postMessage({
            type: 'ai-layer-names-applied',
            count: 0,
            addedCount: parts.length
          });
          return;
        }

        if (validRoots.length > 0) {
          for (const r of validRoots) {
            let host: ComponentSetNode | ComponentNode | null = null;
            if (r.type === 'COMPONENT_SET' || r.type === 'COMPONENT') {
              host = r;
            } else if (r.parent && (r.parent.type === 'COMPONENT_SET' || r.parent.type === 'COMPONENT')) {
              host = r.parent as ComponentSetNode | ComponentNode;
            }
            if (host) {
              try {
                if (host.type === 'COMPONENT_SET') {
                  reorderComponentSetVariants(host);
                }
                const variants = host.type === 'COMPONENT_SET'
                  ? host.children.filter((c): c is ComponentNode => c.type === 'COMPONENT')
                  : [host];
                cleanRebuildComponentProperties(host, variants, {
                  enableText: true,
                  enableInstanceSwap: true,
                  enableBoolean: true,
                  enableSlotExtract: true
                });
              } catch (_) {}
            }
          }
          figma.notify('Wszystkie warstwy i właściwości są uporządkowane zgodnie ze standardem. ✨');
          sendSelectionToUI();
          figma.ui.postMessage({
            type: 'ai-layer-names-applied',
            count: 0,
            addedCount: 0
          });
          return;
        } else {
          figma.notify('Nie znaleziono ramek, grup ani warstw tekstowych do nazwania w zaznaczeniu.', { error: true });
        }
        figma.ui.postMessage({
          type: 'ai-layers-structure-extracted',
          success: false,
          message: 'Brak kwalifikujących się warstw.'
        });
        return;
      }

      figma.ui.postMessage({
        type: 'ai-layers-structure-extracted',
        success: true,
        payload: items,
        totalVariantsCount
      });
    } catch (err: any) {
      console.error('[SmartRenamer] Scan error:', err);
      figma.notify(`Błąd skanowania warstw: ${err && err.message ? err.message : String(err)}`, { error: true });
      figma.ui.postMessage({
        type: 'ai-layers-structure-extracted',
        success: false,
        message: err ? err.message : String(err)
      });
    }
  } else if (msg.type === 'apply-ai-layer-names') {
    try {
      const nameMap: Record<string, string> = msg.nameMap || {};

      // 1. PRE-FETCH PHASE (READ-ONLY ASYNC): Preload nodes and fonts BEFORE mutating document
      const nodesToRename: Array<{ node: SceneNode; finalizedName: string }> = [];
      const seenNodeIds = new Set<string>();

      for (const [nodeId, rawName] of Object.entries(nameMap)) {
        if (!rawName || typeof rawName !== 'string') continue;
        const newName = sanitizePascalCase(rawName);
        if (!newName) continue;

        const targetIds = lastAiRenamerPeerMap.get(nodeId) || [nodeId];
        for (const tId of targetIds) {
          if (seenNodeIds.has(tId)) continue;
          seenNodeIds.add(tId);

          try {
            if (lastAiRenamerRootIds.includes(tId)) continue;
            const node = (figma.getNodeById(tId) as SceneNode | null) || (await figma.getNodeByIdAsync(tId) as SceneNode | null);
            if (node && (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'TEXT')) {
              let detectedRoot = '';
              let curr: BaseNode | null = node.parent;
              while (curr) {
                if (curr.type === 'COMPONENT_SET' || curr.type === 'COMPONENT') {
                  detectedRoot = curr.name || '';
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

      // Pre-resolve roots and preload all fonts, icons & bound variables so subsequent mutations run 100% synchronously
      let roots: (ComponentSetNode | ComponentNode | FrameNode)[] = [];
      let preloadedVars = new Map<string, Variable>();
      const rawRoots: (ComponentSetNode | ComponentNode | FrameNode)[] = [];
      for (const id of lastAiRenamerRootIds) {
        try {
          const node = (figma.getNodeById(id) as any) || (await figma.getNodeByIdAsync(id) as any);
          if (node && (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'FRAME')) {
            if (!rawRoots.includes(node)) rawRoots.push(node);
          }
        } catch (e) {}
      }
      if (rawRoots.length === 0) {
        for (const node of figma.currentPage.selection) {
          if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'FRAME') {
            if (!rawRoots.includes(node as any)) rawRoots.push(node as any);
          }
        }
      }

      // Normalize roots: promote variants/frames inside a COMPONENT_SET or COMPONENT to their host root
      for (const r of rawRoots) {
        let resolved: ComponentSetNode | ComponentNode | FrameNode = r;
        if (r.parent && r.parent.type === 'COMPONENT_SET') {
          resolved = r.parent as ComponentSetNode;
        } else if (r.type !== 'COMPONENT_SET' && r.type !== 'COMPONENT') {
          let p: BaseNode | null = r.parent;
          while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
            if (p.type === 'COMPONENT_SET') {
              resolved = p as ComponentSetNode;
              break;
            }
            if (p.type === 'COMPONENT') {
              resolved = (p.parent && p.parent.type === 'COMPONENT_SET')
                ? (p.parent as ComponentSetNode)
                : (p as ComponentNode);
              break;
            }
            p = p.parent;
          }
        }
        if (!roots.includes(resolved)) roots.push(resolved);
      }

      if (msg.autoProps !== false) {

        const allTextNodes: TextNode[] = [];
        const allDirectInstances: InstanceNode[] = [];
        for (const root of roots) {
          const texts = (root.findAll ? root.findAll(n => n.type === 'TEXT') : []) as TextNode[];
          for (const t of texts) allTextNodes.push(t);
          const instances = (root.findAll ? root.findAll(n => n.type === 'INSTANCE') : []) as InstanceNode[];
          for (const inst of instances) {
            allDirectInstances.push(inst);
          }
        }

        const [, , , loadedVars] = await Promise.all([
          Promise.all(allTextNodes.map(t => loadFontsForTextNode(t))),
          Promise.all(allDirectInstances.map(async (inst) => {
            if (inst.getMainComponentAsync) {
              try { await inst.getMainComponentAsync(); } catch (e) {}
            }
          })),
          (async () => {
            try {
              await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            } catch (e) {}
          })(),
          preloadBoundVariablesForRoots(roots)
        ]);
        preloadedVars = loadedVars;
      }

      // 2. ATOMIC SYNCHRONOUS MUTATION PHASE (ZERO AWAITS & ZERO INTERNAL UNDO FLUSHES):
      // All modifications are applied synchronously in a single execution tick without createComponentFromNode.
      // This groups the renames, subcomponent extraction, text properties, and instance swaps
      // into a SINGLE atomic undo step (Ctrl+Z undos everything at once)!
      let renamedCount = 0;
      for (const item of nodesToRename) {
        item.node.name = item.finalizedName;
        renamedCount++;
      }

      let autoPropsOptions: AutoPropsOptions | undefined = undefined;
      if (typeof msg.autoProps === 'object' && msg.autoProps !== null) {
        autoPropsOptions = msg.autoProps;
      }

      if (msg.reviewAutoProps === true && roots.length > 0) {
        const previewData = collectAutoPropsPreviewData(roots);
        figma.ui.postMessage({
          type: 'auto-props-preview-needed',
          previewData,
          renamedCount
        });
        figma.notify(`Zaktualizowano nazwy ${renamedCount} warstw! Skonfiguruj właściwości... ✨`);
        sendSelectionToUI();
        return;
      }

      let autoPropsSummary = '';
      if (msg.autoProps !== false) {
        try {
          const autoRes = autoCreateTextPropsAndExtractItemsSync(roots, preloadedVars, autoPropsOptions);
          if (autoRes.slotsCreatedCount > 0 || autoRes.extractedItemsCount > 0 || autoRes.textPropsCount > 0 || autoRes.instanceSwapPropsCount > 0 || autoRes.booleanPropsCount > 0 || autoRes.nestedInstancesCount > 0) {
            const parts: string[] = [];
            if (autoRes.slotsCreatedCount > 0) {
              parts.push(`${autoRes.slotsCreatedCount} ${autoRes.slotsCreatedCount === 1 ? 'kontener Slot' : 'kontenery Slot'}`);
            }
            if (autoRes.extractedItemsCount > 0) {
              parts.push(`${autoRes.extractedItemsCount} ${autoRes.extractedItemsCount === 1 ? 'sub-komponent' : 'sub-komponenty'} .../Item`);
            }
            if (autoRes.booleanPropsCount > 0) {
              parts.push(`${autoRes.booleanPropsCount} ${autoRes.booleanPropsCount === 1 ? 'właściwość' : 'właściwości'} BOOLEAN`);
            }
            if (autoRes.textPropsCount > 0) {
              parts.push(`${autoRes.textPropsCount} ${autoRes.textPropsCount === 1 ? 'właściwość' : 'właściwości'} TEXT`);
            }
            if (autoRes.instanceSwapPropsCount > 0) {
              parts.push(`${autoRes.instanceSwapPropsCount} ${autoRes.instanceSwapPropsCount === 1 ? 'właściwość' : 'właściwości'} INSTANCE_SWAP`);
            }
            if (autoRes.nestedInstancesCount > 0) {
              parts.push(`${autoRes.nestedInstancesCount} Nested`);
            }
            autoPropsSummary = ` [${parts.join(', ')}]`;
          }
        } catch (autoErr: any) {
          console.error('[SmartRenamer] Error in autoCreateTextPropsAndExtractItemsSync:', autoErr);
        }
      } else {
        // Even if Auto-Properties creation is toggled off, always sort existing properties according to canonical schema
        for (const r of roots) {
          if (r.type === 'COMPONENT_SET' || r.type === 'COMPONENT') {
            try {
              if (r.type === 'COMPONENT_SET') {
                reorderComponentSetVariants(r);
              }
              const variants = r.type === 'COMPONENT_SET'
                ? r.children.filter((c): c is ComponentNode => c.type === 'COMPONENT')
                : [r];
              cleanRebuildComponentProperties(r, variants, {
                enableText: false,
                enableInstanceSwap: false,
                enableBoolean: false,
                enableSlotExtract: false
              });
            } catch (_) {}
          }
        }
      }

      if (renamedCount > 0 || autoPropsSummary) {
        figma.notify(`Zaktualizowano nazwy ${renamedCount} warstw${autoPropsSummary}! ✨`);
      } else {
        figma.notify('Wszystkie warstwy mają już poprawne nazwy zgodnie ze standardem.');
      }

      sendSelectionToUI();
      figma.ui.postMessage({
        type: 'ai-layer-names-applied',
        count: renamedCount
      });
    } catch (err: any) {
      console.error('[SmartRenamer] Apply error:', err);
      figma.notify(`Błąd aktualizacji warstw: ${err && err.message ? err.message : String(err)}`, { error: true });
      figma.ui.postMessage({
        type: 'ai-layer-names-applied',
        count: 0,
        error: err ? err.message : String(err)
      });
    }
  } else if (msg.type === 'scan-auto-props-preview') {
    try {
      const selection = figma.currentPage.selection;
      const targetRoots: (ComponentSetNode | ComponentNode | FrameNode)[] = [];
      for (const node of selection) {
        let host: SceneNode = node;
        if (node.parent && node.parent.type === 'COMPONENT_SET') {
          host = node.parent;
        }
        if (!targetRoots.includes(host as any) && (host.type === 'COMPONENT_SET' || host.type === 'COMPONENT' || host.type === 'FRAME')) {
          targetRoots.push(host as any);
        }
      }
      if (targetRoots.length === 0) {
        figma.notify('Zaznacz Component lub Component Set na canvasie.', { error: true });
        return;
      }
      const previewData = collectAutoPropsPreviewData(targetRoots);
      figma.ui.postMessage({
        type: 'auto-props-preview-data',
        previewData
      });
    } catch (e: any) {
      figma.notify(`Błąd skanowania właściwości: ${e.message}`, { error: true });
    }
  } else if (msg.type === 'run-auto-props' || msg.type === 'apply-custom-auto-props') {
    try {
      const selection = figma.currentPage.selection;
      const targetRoots: (ComponentSetNode | ComponentNode | FrameNode)[] = [];
      for (const node of selection) {
        let host: SceneNode = node;
        if (node.parent && node.parent.type === 'COMPONENT_SET') {
          host = node.parent;
        }
        if (!targetRoots.includes(host as any) && (host.type === 'COMPONENT_SET' || host.type === 'COMPONENT' || host.type === 'FRAME')) {
          targetRoots.push(host as any);
        }
      }
      if (targetRoots.length === 0 && lastAiRenamerRootIds.length > 0) {
        for (const id of lastAiRenamerRootIds) {
          const n = (figma.getNodeById(id) as any) || (await figma.getNodeByIdAsync(id) as any);
          if (n && (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT' || n.type === 'FRAME')) {
            if (!targetRoots.includes(n as any)) targetRoots.push(n as any);
          }
        }
      }
      if (targetRoots.length === 0) {
        figma.notify('Zaznacz Component lub Component Set na canvasie.', { error: true });
        return;
      }

      const allTextNodes: TextNode[] = [];
      const allDirectInstances: InstanceNode[] = [];
      for (const r of targetRoots) {
        allTextNodes.push(...collectDirectTextNodes(r));
        allDirectInstances.push(...collectDirectInstances(r));
      }

      const [, , , loadedVars] = await Promise.all([
        Promise.all(allTextNodes.map(t => loadFontsForTextNode(t))),
        Promise.all(allDirectInstances.map(async (inst) => {
          if (inst.getMainComponentAsync) {
            try { await inst.getMainComponentAsync(); } catch (e) {}
          }
        })),
        (async () => {
          try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch (e) {}
        })(),
        preloadBoundVariablesForRoots(targetRoots)
      ]);

      const autoRes = autoCreateTextPropsAndExtractItemsSync(targetRoots, loadedVars, msg.options);
      const parts: string[] = [];
      if (autoRes.instanceSwapPropsCount > 0) parts.push(`${autoRes.instanceSwapPropsCount} INSTANCE_SWAP`);
      if (autoRes.booleanPropsCount > 0) parts.push(`${autoRes.booleanPropsCount} BOOLEAN`);
      if (autoRes.textPropsCount > 0) parts.push(`${autoRes.textPropsCount} TEXT`);
      if (autoRes.extractedItemsCount > 0) parts.push(`${autoRes.extractedItemsCount} .../Item`);
      if (autoRes.nestedInstancesCount > 0) parts.push(`${autoRes.nestedInstancesCount} Nested`);

      const summary = parts.length > 0 ? ` [${parts.join(', ')}]` : '';
      figma.notify(`Wdrożono właściwości komponentu${summary}! ✨`);
      sendSelectionToUI();
      figma.ui.postMessage({ type: 'auto-props-applied', success: true });
    } catch (e: any) {
      console.error('[AutoProps] Apply error:', e);
      figma.notify(`Błąd tworzenia właściwości: ${e.message}`, { error: true });
    }
  } else if (msg.type === 'convert-case') {
    await handleConvertCase(msg.caseType, !!msg.skipInstances);
  } else if (msg.type === 'smart-swap-get-selection') {
    await sendSmartSwapSelectionToUI();
  } else if (msg.type === 'smart-swap-check-match') {
    try {
      const srcNode = await figma.getNodeByIdAsync(msg.sourceId);
      const tmplNode = await figma.getNodeByIdAsync(msg.templateId);
      if (srcNode && tmplNode) {
        const stats = await calculateMatchStats(srcNode as SceneNode, tmplNode as SceneNode);
        figma.ui.postMessage({
          type: 'smart-swap-match-result',
          stats,
          sourceId: msg.sourceId,
          templateId: msg.templateId,
        });
      }
    } catch (e: any) {
      console.warn('[SmartSwap] Match check error:', e);
    }
  } else if (msg.type === 'smart-swap-execute') {
    try {
      const sourceIds: string[] = Array.isArray(msg.sourceIds) ? msg.sourceIds : (msg.sourceId ? [msg.sourceId] : []);
      const templateId: string = msg.templateId;
      const options = msg.options || {};
      const result = await executeSmartSwapBatch(sourceIds, templateId, options);
      figma.ui.postMessage({
        type: 'smart-swap-complete',
        success: result.success,
        replacedCount: result.replacedCount,
        totalOverrides: result.totalOverrides,
        message: result.message,
      });
      await sendSmartSwapSelectionToUI();
      sendSelectionToUI();
    } catch (e: any) {
      console.error('[SmartSwap] Execute error:', e);
      figma.notify(`Błąd Smart Swap: ${e.message}`, { error: true });
      figma.ui.postMessage({
        type: 'smart-swap-complete',
        success: false,
        message: e.message,
      });
    }
  } else if (msg.type === 'font-replacer-scan') {
    try {
      const scanResult = await scanSelectionFonts(Boolean(msg.includeAvailableFonts));
      figma.ui.postMessage({
        type: 'font-replacer-data',
        data: scanResult,
      });
    } catch (e: any) {
      console.error('[FontReplacer] Scan error:', e);
      figma.notify(`Błąd skanowania fontów: ${e.message}`, { error: true });
    }
  } else if (msg.type === 'font-replacer-swap') {
    try {
      const rules: FontSwapRule[] = Array.isArray(msg.rules) ? msg.rules : [];
      const res = await executeFontSwapRules(rules);
      if (res.updatedLayersCount > 0) {
        const firstRule = rules[0];
        if (rules.length === 1 && firstRule) {
          const targetDesc = firstRule.targetStyle
            ? `${firstRule.targetFamily} (${firstRule.targetStyle})`
            : firstRule.targetFamily;
          figma.notify(
            `Podmieniono font z ${firstRule.sourceFamily} na ${targetDesc} w ${res.updatedLayersCount} warstwach! ✨`
          );
        } else {
          figma.notify(`Podmieniono fonty w ${res.updatedLayersCount} warstwach! ✨`);
        }
      } else {
        figma.notify('Brak pasujących warstw tekstowych do podmiany.', { error: true });
      }
      const updatedScan = await scanSelectionFonts(false);
      figma.ui.postMessage({
        type: 'font-replacer-swapped',
        updatedLayersCount: res.updatedLayersCount,
        summaryText: res.summaryText,
        data: updatedScan,
      });
      sendSelectionToUI();
    } catch (e: any) {
      console.error('[FontReplacer] Swap error:', e);
      figma.notify(`Błąd podmiany fontu: ${e.message}`, { error: true });
    }
  }
};

(async () => {
  let initialMode: 'components' | 'generator' = 'components';
  if (figma.command === 'generator') {
    initialMode = 'generator';
  } else if (figma.command === 'components') {
    initialMode = 'components';
  } else {
    try {
      const savedMode = await figma.clientStorage.getAsync('last_active_plugin_mode');
      if (savedMode === 'generator' || savedMode === 'components') {
        initialMode = savedMode;
      }
    } catch (e) {}
  }
  await launchPluginMode(initialMode);
})();

