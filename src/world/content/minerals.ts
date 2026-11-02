import type { Material, NoiseOre } from '../../core/types';

export interface MineralDefinition {
  id: string;
  displayName: string;
  rarity: 'common' | 'uncommon' | 'rare';
  material: Material;
  generation: NoiseOre;
}

export const minerals: readonly MineralDefinition[] = [
  { id:'iron_ore', displayName:'Iron', rarity:'common', material:{color:'#9a745d',solid:true,floats:false}, generation:{kind:'iron_ore',minY:-29,maxY:10,frequency:.115,octaves:3,fractal:'fbm',threshold:.42,seedOffset:607} },
  { id:'copper_ore', displayName:'Copper', rarity:'common', material:{color:'#b8734f',solid:true,floats:false}, generation:{kind:'copper_ore',minY:-25,maxY:8,frequency:.105,octaves:3,fractal:'fbm',threshold:.45,seedOffset:809} },
  { id:'coal', displayName:'Coal', rarity:'common', material:{color:'#303536',solid:true,floats:false}, generation:{kind:'coal',minY:-28,maxY:10,frequency:.11,octaves:3,fractal:'fbm',threshold:.44,seedOffset:1009} },
  { id:'quartz', displayName:'Quartz', rarity:'uncommon', material:{color:'#e3e0d4',solid:true,floats:false}, generation:{kind:'quartz',minY:-28,maxY:8,frequency:.105,octaves:3,fractal:'fbm',threshold:.46,seedOffset:1201} },
  { id:'lithium_ore', displayName:'Lithium', rarity:'rare', material:{color:'#c8bed8',solid:true,floats:false}, generation:{kind:'lithium_ore',minY:-24,maxY:2,frequency:.08,octaves:3,fractal:'fbm',threshold:.65,seedOffset:1409} },
  { id:'titanium_ore', displayName:'Titanium', rarity:'rare', material:{color:'#718a9b',solid:true,floats:false}, generation:{kind:'titanium_ore',minY:-29,maxY:-8,frequency:.075,octaves:3,fractal:'fbm',threshold:.68,seedOffset:1601} },
] as const;

export const mineralMaterials = Object.fromEntries(minerals.map(mineral => [mineral.id, mineral.material]));
export const mineralNoise = minerals.map(mineral => mineral.generation);

