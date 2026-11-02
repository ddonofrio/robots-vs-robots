import type { Block, ProceduralTerrain, Vec3 } from '../../core/types';

/** A deterministic, server-side world generator. */
export interface WorldGenerator {
  readonly id: string;
  readonly description: string;
  readonly terrain?: ProceduralTerrain;
  spawn(seed: number, x: number, z: number): Vec3;
  initialBlocks?(): Block[];
}

