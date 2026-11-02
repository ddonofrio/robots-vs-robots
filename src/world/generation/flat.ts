import type { LayeredTerrain } from '../../core/types';
import type { WorldGenerator } from './types';

const terrain: LayeredTerrain = {
  type: 'layers',
  top: 0,
  layers: [
    { min: 0, kind: 'grass' },
    { min: -3, kind: 'dirt' },
    { min: -32, kind: 'bedrock' },
  ],
};

/** A minimal superflat generator. Gameplay features can be layered on later. */
export const flatGenerator: WorldGenerator = {
  id: 'flat',
  description: 'A level grass test world over dirt and bedrock.',
  terrain,
  spawn: (_seed, x, z) => [x, terrain.top + 1, z],
  initialBlocks: () => [],
};

