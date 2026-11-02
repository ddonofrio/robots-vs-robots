import type { NoiseTerrain } from '../../core/types';
import { terrainSurfaceY } from '../../core/procedural-terrain';
import { mineralNoise } from '../content/minerals';
import type { WorldGenerator } from './types';

export const noiseTerrain: NoiseTerrain = {
  type:'noise', floor:{y:-32,kind:'bedrock'}, stone:'stone',
  soil:{depth:3,temperate:'dirt',temperateSurface:'grass',arid:'sand',aridSurface:'sand'},
  baseHeight:5, ceiling:42, waterLevel:2,
  hills:{frequency:.012,octaves:4,fractal:'fbm',amplitude:5},
  mountains:{frequency:.0035,octaves:4,fractal:'ridged',amplitude:24,threshold:.57},
  biome:{frequency:.0028,octaves:3,fractal:'fbm',aridThreshold:.08},
  dunes:{frequency:.028,octaves:3,fractal:'ridged',amplitude:4},
  rivers:{frequency:.0045,octaves:4,fractal:'fbm',width:.045,bankWidth:.04,bedHeight:0},
  spawn:{radius:24,blend:18,height:4},
  ores:[...mineralNoise],
};

export const noiseGenerator: WorldGenerator = {
  id: 'noise',
  description: 'Infinite deterministic terrain with biomes, rivers and mineral veins.',
  terrain: noiseTerrain,
  spawn: (seed, x, z) => [x, terrainSurfaceY(noiseTerrain, seed, x, z) + 1, z],
  initialBlocks: () => [],
};

