import type { Entity, Vec3 } from '../core/types';

export type SelectionMode = 'replace' | 'add' | 'subtract';

export function selectionMode(modifiers: Pick<MouseEvent, 'ctrlKey' | 'shiftKey'>): SelectionMode {
  if (modifiers.ctrlKey) return 'subtract';
  if (modifiers.shiftKey) return 'add';
  return 'replace';
}

export function updateSelection(current: Iterable<string>, ids: Iterable<string>, mode: SelectionMode): Set<string> {
  const next = mode === 'replace' ? new Set<string>() : new Set(current);
  for (const id of ids) {
    if (mode === 'subtract') next.delete(id);
    else next.add(id);
  }
  return next;
}

interface PositionedSelection { position: Vec3; hitbox?: { radius: number }; }

export function selectionClusters<T extends PositionedSelection>(entities: readonly T[], maximumGap = 2): T[][] {
  const remaining = new Set(entities),clusters:T[][]=[];
  while(remaining.size){
    const first=remaining.values().next().value!;remaining.delete(first);
    const cluster=[first],pending=[first];
    while(pending.length){
      const current=pending.pop()!;
      for(const candidate of remaining){
        const centreDistance=Math.hypot(current.position[0]-candidate.position[0],current.position[2]-candidate.position[2]);
        const gap=centreDistance-(current.hitbox?.radius??0)-(candidate.hitbox?.radius??0);
        if(gap>=maximumGap)continue;
        remaining.delete(candidate);cluster.push(candidate);pending.push(candidate);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export function selectionGroupLabel(entities: readonly Pick<Entity, 'kind'>[]): string | undefined {
  if (entities.length < 2) return undefined;
  const kinds = new Set(entities.map(entity => entity.kind));
  if (kinds.size > 1) return 'Mix';
  if (kinds.has('miner-robot')) return 'Miners';
  return 'Group';
}
