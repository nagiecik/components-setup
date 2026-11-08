import { getContainingVariantOrRoot } from '../properties/collectors';

export function getVisualSortScore(node: SceneNode, fallbackRoot?: SceneNode): { relY: number; relX: number } {
  const container = getContainingVariantOrRoot(node) || fallbackRoot || node;
  let nodeX = 0, nodeY = 0, contX = 0, contY = 0;

  if (node.absoluteBoundingBox) {
    nodeX = node.absoluteBoundingBox.x;
    nodeY = node.absoluteBoundingBox.y;
  } else if ('absoluteTransform' in node && (node as any).absoluteTransform) {
    nodeX = (node as any).absoluteTransform[0][2];
    nodeY = (node as any).absoluteTransform[1][2];
  } else if ('x' in node && 'y' in node) {
    nodeX = (node as any).x || 0;
    nodeY = (node as any).y || 0;
  }

  if (container.absoluteBoundingBox) {
    contX = container.absoluteBoundingBox.x;
    contY = container.absoluteBoundingBox.y;
  } else if ('absoluteTransform' in container && (container as any).absoluteTransform) {
    contX = (container as any).absoluteTransform[0][2];
    contY = (container as any).absoluteTransform[1][2];
  } else if ('x' in container && 'y' in container) {
    contX = (container as any).x || 0;
    contY = (container as any).y || 0;
  }

  return {
    relY: nodeY - contY,
    relX: nodeX - contX
  };
}

export function compareVisualSortScore(nodeA: SceneNode | null, nodeB: SceneNode | null, rootComponent: SceneNode): number {
  if (!nodeA && !nodeB) return 0;
  if (!nodeA) return 1;
  if (!nodeB) return -1;

  const scoreA = getVisualSortScore(nodeA, rootComponent);
  const scoreB = getVisualSortScore(nodeB, rootComponent);

  if (Math.abs(scoreA.relY - scoreB.relY) > 8) {
    return scoreA.relY < scoreB.relY ? -1 : 1;
  }
  if (Math.abs(scoreA.relX - scoreB.relX) > 0.001) {
    return scoreA.relX < scoreB.relX ? -1 : 1;
  }
  return 0;
}

