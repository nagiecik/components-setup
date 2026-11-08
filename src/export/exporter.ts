import { SelectionData, SerializedVariant } from '../types/audit';
import { extractNodeDescription, VariableEngine } from '../generator/engine';

export function findTopmostComponentOrSet(node: BaseNode | null): SceneNode | null {
  if (!node) return null;
  let curr: BaseNode | null = node;
  let top: SceneNode = node as SceneNode;

  while (curr && curr.type !== 'PAGE') {
    if (curr.type === 'COMPONENT_SET') {
      return curr as SceneNode;
    }
    if (curr.type === 'COMPONENT') {
      top = curr as SceneNode;
      if (curr.parent && curr.parent.type === 'COMPONENT_SET') {
        return curr.parent as SceneNode;
      }
    }
    curr = curr.parent;
  }
  return top;
}

export function getExportableRoots(nodes: readonly SceneNode[]): SceneNode[] {
  const roots: SceneNode[] = [];
  const seenIds = new Set<string>();

  for (const node of nodes) {
    const root = findTopmostComponentOrSet(node);
    if (root && !seenIds.has(root.id)) {
      seenIds.add(root.id);
      roots.push(root);
    }
  }

  return roots;
}

export function isNodeOnCurrentPage(node: BaseNode | null): boolean {
  if (!node) return false;
  try {
    let curr: BaseNode | null = node;
    while (curr) {
      if (curr === figma.currentPage) return true;
      curr = curr.parent;
    }
  } catch (e) {}
  return false;
}

export function findExportableComponentsAndSets(nodes: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];
  const seenIds = new Set<string>();

  function processNode(node: BaseNode) {
    if (!node || seenIds.has(node.id)) return;

    if (node.type === 'COMPONENT_SET') {
      if (isNodeOnCurrentPage(node)) {
        seenIds.add(node.id);
        result.push(node as SceneNode);
      }
      return;
    }

    if (node.type === 'COMPONENT') {
      if (node.parent && node.parent.type === 'COMPONENT_SET') {
        const parentSet = node.parent as ComponentSetNode;
        if (!seenIds.has(parentSet.id) && isNodeOnCurrentPage(parentSet)) {
          seenIds.add(parentSet.id);
          result.push(parentSet as SceneNode);
        }
      } else {
        if (isNodeOnCurrentPage(node)) {
          seenIds.add(node.id);
          result.push(node as SceneNode);
        }
      }
      return;
    }

    // Do NOT recurse into or inspect instances! Instances are not component definitions to export.
    if (node.type === 'INSTANCE') {
      return;
    }

    if ('children' in node) {
      for (const child of (node as any).children) {
        processNode(child);
      }
    }
  }

  const targetNodes = (nodes && nodes.length > 0) ? nodes : figma.currentPage.children;
  for (const n of targetNodes) {
    processNode(n);
  }

  return result;
}


export async function exportNodesToCode(roots: SceneNode[]) {
  if (!roots || roots.length === 0) {
    figma.notify('Please select a component or frame to export code.', { error: true });
    return;
  }

  const engine = new VariableEngine();
  await engine.init();

  const exportedResults: Array<{ name: string; isPrivate: boolean; violationsCount: number }> = [];

  for (let i = 0; i < roots.length; i++) {
    const selNode = roots[i];
    const rawNodeName = selNode.name.trim();
    const parentNodeName = selNode.parent && selNode.parent.type === 'COMPONENT_SET' ? selNode.parent.name.trim() : '';
    const isPrivate = rawNodeName.startsWith('_') || rawNodeName.startsWith('.') || parentNodeName.startsWith('_') || parentNodeName.startsWith('.');

    const result = await engine.exportNodeToCode(selNode);
    const componentDescription = (result as any).description || extractNodeDescription(selNode);

    figma.ui.postMessage({
      type: 'code-exported',
      code: result.code,
      nodeName: result.name,
      rawName: (result as any).rawName || rawNodeName,
      description: componentDescription,
      isPrivate: (result as any).isPrivate ?? isPrivate,
      preferredInstances: (result as any).preferredInstances || {},
      violations: (result as any).violations || [],
      itemIndex: i,
      totalItems: roots.length,
    });

    exportedResults.push({
      name: result.name,
      isPrivate: (result as any).isPrivate ?? isPrivate,
      violationsCount: ((result as any).violations || []).length,
    });
  }

  if (roots.length === 1) {
    const res = exportedResults[0];
    if (res.isPrivate) {
      figma.notify(`Exported private component "${res.name}" (code documentation only) 🔒`);
    } else if (res.violationsCount > 0) {
      figma.notify(`⚠️ Exported "${res.name}" with ${res.violationsCount} token warning(s)!`, { timeout: 5000 });
    } else {
      figma.notify(`Exported 100% token-compliant code for "${res.name}"! 💻`);
    }
  } else {
    const names = exportedResults.map((r) => r.name).join(', ');
    figma.notify(`Exported ${roots.length} components (${names})! 🚀`);
  }
}

export function getSelectionData(): Promise<SelectionData> {
  return (async () => {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      return {
        hasSelection: false,
        count: 0,
        type: 'NONE',
        typeName: 'No selection',
        nodeId: null,
        name: '',
        description: '',
        documentationLink: null,
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics: false,
      };
    }

    const firstNode = selection[0];
    const count = selection.length;
    const canApplyMetrics = selection.some(
      (n) =>
        n.type === 'COMPONENT_SET' ||
        n.type === 'FRAME' ||
        n.type === 'SECTION' ||
        n.type === 'COMPONENT',
    );

    // Helper to find enclosing component or component set
    async function findEnclosingComponent(node: BaseNode | null): Promise<{ comp: ComponentNode | null; compSet: ComponentSetNode | null; instance: InstanceNode | null }> {
      let curr: BaseNode | null = node;
      let comp: ComponentNode | null = null;
      let compSet: ComponentSetNode | null = null;
      let instance: InstanceNode | null = null;

      while (curr) {
        if (curr.type === 'COMPONENT_SET') {
          compSet = curr as ComponentSetNode;
          break;
        }
        if (curr.type === 'COMPONENT' && !comp) {
          comp = curr as ComponentNode;
          if (comp.parent && comp.parent.type === 'COMPONENT_SET') {
            compSet = comp.parent as ComponentSetNode;
            break;
          }
        }
        if (curr.type === 'INSTANCE' && !instance) {
          instance = curr as InstanceNode;
          try {
            if ('getMainComponentAsync' in instance && typeof (instance as any).getMainComponentAsync === 'function') {
              comp = await (instance as any).getMainComponentAsync();
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
          if (comp && comp.parent && comp.parent.type === 'COMPONENT_SET') {
            compSet = comp.parent as ComponentSetNode;
            break;
          }
        }
        curr = curr.parent;
      }
      return { comp, compSet, instance };
    }

    // Single Component Set directly selected or enclosing
    if (count === 1 && firstNode.type === 'COMPONENT_SET') {
      const compSet = firstNode as ComponentSetNode;
      const variants: SerializedVariant[] = compSet.children
        .filter((c): c is ComponentNode => c.type === 'COMPONENT')
        .map((c) => ({
          id: c.id,
          name: c.name,
          variantProperties: c.variantProperties || null,
          description: c.description || '',
        }));

      const docLink = (compSet.documentationLinks && compSet.documentationLinks.length > 0) ? compSet.documentationLinks[0].uri : null;

      return {
        hasSelection: true,
        count: 1,
        type: 'COMPONENT_SET',
        typeName: 'Component Set',
        nodeId: compSet.id,
        name: compSet.name,
        description: compSet.description || '',
        documentationLink: docLink,
        parentComponentSetName: null,
        variantProperties: null,
        variants,
        canApplyMetrics: true,
      };
    }

    // Check enclosing component structures if single node selected
    if (count === 1) {
      const { comp, compSet } = await findEnclosingComponent(firstNode);

      if (comp) {
        const isVariant = !!compSet;
        const docLink = (comp.documentationLinks && comp.documentationLinks.length > 0) ? comp.documentationLinks[0].uri : ((compSet && compSet.documentationLinks && compSet.documentationLinks.length > 0) ? compSet.documentationLinks[0].uri : null);
        return {
          hasSelection: true,
          count: 1,
          type: isVariant ? 'VARIANT' : 'COMPONENT',
          typeName: isVariant ? 'Component Variant' : 'Component',
          nodeId: comp.id,
          name: comp.name,
          description: comp.description || (compSet ? compSet.description : '') || '',
          documentationLink: docLink,
          parentComponentSetName: compSet ? compSet.name : null,
          variantProperties: comp.variantProperties || null,
          variants: isVariant ? [{
            id: comp.id,
            name: comp.name,
            parentComponentSetName: compSet ? compSet.name : null,
            variantProperties: comp.variantProperties || null,
            description: comp.description || '',
          }] : [],
          canApplyMetrics: true,
        };
      }

      if (compSet) {
        const variants: SerializedVariant[] = compSet.children
          .filter((c): c is ComponentNode => c.type === 'COMPONENT')
          .map((c) => ({
            id: c.id,
            name: c.name,
            parentComponentSetName: compSet.name,
            variantProperties: c.variantProperties || null,
            description: c.description || '',
          }));

        const docLink = (compSet.documentationLinks && compSet.documentationLinks.length > 0) ? compSet.documentationLinks[0].uri : null;

        return {
          hasSelection: true,
          count: 1,
          type: 'COMPONENT_SET',
          typeName: 'Component Set',
          nodeId: compSet.id,
          name: compSet.name,
          description: compSet.description || '',
          documentationLink: docLink,
          parentComponentSetName: null,
          variantProperties: null,
          variants,
          canApplyMetrics: true,
        };
      }
    }

    // Multiple components or component sets selected
    const exportableRoots = getExportableRoots(selection);
    if (exportableRoots.length > 1) {
      const allCompSets = exportableRoots.every((r) => r.type === 'COMPONENT_SET');
      const allComps = exportableRoots.every((r) => r.type === 'COMPONENT');
      const typeLabel = allCompSets
        ? `${exportableRoots.length} Component Sets Selected`
        : allComps
          ? `${exportableRoots.length} Components Selected`
          : `${exportableRoots.length} Components/Sets Selected`;

      return {
        hasSelection: true,
        count: exportableRoots.length,
        type: 'MULTIPLE_COMPONENTS',
        typeName: typeLabel,
        nodeId: exportableRoots.map((r) => r.id).join(','),
        name: exportableRoots.map((r) => r.name).join(', '),
        description: '',
        documentationLink: null,
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics: true,
      };
    }

    // Multiple variants of the same component set selected (or multiple components)
    const allComponents = selection.filter((n): n is ComponentNode => n.type === 'COMPONENT');
    if (allComponents.length > 1) {
      const variants: SerializedVariant[] = allComponents.map((c) => {
        const pSet = c.parent?.type === 'COMPONENT_SET' ? (c.parent as ComponentSetNode) : null;
        return {
          id: c.id,
          name: c.name,
          parentComponentSetName: pSet ? pSet.name : null,
          variantProperties: c.variantProperties || null,
          description: c.description || '',
        };
      });

      const parentSet = allComponents[0].parent?.type === 'COMPONENT_SET' ? (allComponents[0].parent as ComponentSetNode) : null;
      const docLink = (parentSet && parentSet.documentationLinks && parentSet.documentationLinks.length > 0) ? parentSet.documentationLinks[0].uri : null;

      return {
        hasSelection: true,
        count,
        type: 'MULTIPLE_VARIANTS',
        typeName: `${allComponents.length} Variants Selected`,
        nodeId: parentSet ? parentSet.id : firstNode.id,
        name: parentSet ? parentSet.name : firstNode.name,
        description: parentSet ? parentSet.description : '',
        documentationLink: docLink,
        parentComponentSetName: parentSet ? parentSet.name : null,
        variantProperties: null,
        variants,
        canApplyMetrics: true,
      };
    }

    // Frame or Section
    if (firstNode.type === 'FRAME' || firstNode.type === 'SECTION') {
      return {
        hasSelection: true,
        count,
        type: 'FRAME',
        typeName: count > 1 ? `${count} Frames` : `${firstNode.type.toLowerCase()}: ${firstNode.name}`,
        nodeId: firstNode.id,
        name: firstNode.name,
        description: '',
        documentationLink: null,
        parentComponentSetName: null,
        variantProperties: null,
        variants: [],
        canApplyMetrics: true,
      };
    }

    return {
      hasSelection: true,
      count,
      type: 'OTHER',
      typeName: `${count} Layers selected`,
      nodeId: firstNode.id,
      name: firstNode.name,
      description: '',
      documentationLink: null,
      parentComponentSetName: null,
      variantProperties: null,
      variants: [],
      canApplyMetrics,
    };
  })();
}

