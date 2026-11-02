import { emptyGenerator } from './empty';
import { flatGenerator } from './flat';
import { noiseGenerator } from './noise';
import type { WorldGenerator } from './types';

export type WorldGeneratorId = 'empty' | 'flat' | 'noise';

export const worldGenerators: Readonly<Record<WorldGeneratorId, WorldGenerator>> = {
  empty: emptyGenerator,
  flat: flatGenerator,
  noise: noiseGenerator,
};

export function loadWorldGenerator(id: string): WorldGenerator {
  const generator = worldGenerators[id as WorldGeneratorId];
  if (!generator) throw new Error(`Unknown world generator: ${id}. Available: ${Object.keys(worldGenerators).join(', ')}.`);
  return generator;
}

export type { WorldGenerator } from './types';

