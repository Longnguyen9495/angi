import type { GraphNode } from 'playcanvas';

/*
 * Entity-name convention shared by the procedural corner and Editor-authored
 * scenes (plans/playcanvas-editor-pipeline.md, giai đoạn 3). The game binds
 * gameplay to these names; anything else in a scene is free decoration.
 */

export const CORNER = {
  root: 'corner-root',
  barn: 'barn',
  /** Simple box the tap ray hits; its world position and scale define the pick volume. */
  barnHit: 'barn-hit',
  barnDoor: 'barn-door',
  bed: 'bed',
  tree: 'tree',
  sun: 'sun',
  plot: (id: number) => `plot-${id}`,
  /** Children of each plot. */
  soil: 'soil',
  crop: 'crop',
  /** Optional particle templates (warn when missing). */
  fx: ['fx-water', 'fx-dust', 'fx-sparkle'] as const,
} as const;

export interface CornerCheck {
  ok: boolean;
  /** Names gameplay cannot work without. */
  missing: string[];
  /** Nice-to-have names (effects) that are absent. */
  warnings: string[];
}

function find(root: GraphNode, name: string): GraphNode | null {
  return root.name === name ? root : root.findByName(name);
}

/** Checks a scene hierarchy against the convention for `plotIds`. */
export function validateCorner(root: GraphNode, plotIds: readonly number[]): CornerCheck {
  const missing: string[] = [];
  const warnings: string[] = [];
  const all: GraphNode[] = [];
  const visit = (node: GraphNode) => {
    all.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  const unique = [
    CORNER.root,
    CORNER.barn,
    CORNER.barnHit,
    CORNER.barnDoor,
    CORNER.bed,
    CORNER.tree,
    CORNER.sun,
    ...plotIds.map(CORNER.plot),
  ];
  for (const name of unique)
    if (all.filter((node) => node.name === name).length > 1) missing.push(`duplicate:${name}`);
  const corner = find(root, CORNER.root);
  if (!corner) return { ok: false, missing: [CORNER.root], warnings };
  for (const name of [
    CORNER.barn,
    CORNER.barnHit,
    CORNER.barnDoor,
    CORNER.bed,
    CORNER.tree,
    CORNER.sun,
  ]) {
    if (!corner.findByName(name)) missing.push(name);
  }
  for (const id of plotIds) {
    const plot = corner.findByName(CORNER.plot(id));
    if (!plot) {
      missing.push(CORNER.plot(id));
      continue;
    }
    for (const child of [CORNER.soil, CORNER.crop]) {
      if (plot.children.filter((c) => c.name === child).length !== 1)
        missing.push(`${CORNER.plot(id)}/${child}`);
    }
  }
  for (const fx of CORNER.fx) if (!corner.findByName(fx)) warnings.push(fx);
  return { ok: missing.length === 0, missing, warnings };
}
