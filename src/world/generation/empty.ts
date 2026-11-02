import type { WorldGenerator } from './types';

/** An intentionally blank world, useful for tests and future creative modes. */
export const emptyGenerator: WorldGenerator = {
  id: 'empty',
  description: 'No generated terrain.',
  spawn: (_seed, x, z) => [x, 1, z],
  initialBlocks: () => [],
};

