
import { CellType, BuildingCost, Tool, Upgrade } from './types';

export const GRID_WIDTH = 100; // Increased map width
export const GRID_HEIGHT = 60; 
export const SKY_HEIGHT = 8; 
export const CELL_SIZE_PX = 40;
export const TICK_RATE_MS = 500;
export const SAVE_KEY = 'formicarium_save_v4'; // Version bump

export const INITIAL_RESOURCES = {
  food: 200,
  dirt: 100, 
  population: 1,
  maxPopulation: 5,
  science: 0,
};

// Dirt costs reduced by 50% as requested
export const BUILDING_COSTS: Record<string, BuildingCost> = {
  [CellType.STORAGE]: { food: 20, dirt: 5 },
  [CellType.NURSERY]: { food: 50, dirt: 10 },
  [CellType.GARDEN]: { food: 20, dirt: 10 },
  [CellType.WORKSHOP]: { food: 80, dirt: 20 },
  [CellType.BARRACKS]: { food: 100, dirt: 30 },
  [CellType.MINER_CAMP]: { food: 60, dirt: 0 }, // Requires NO dirt to build, solves stuck issue
};

export const TOOL_MAP: Record<Tool, { label: string, cost: string, cellType: CellType | null }> = {
  'DIG': { label: 'Kaz', cost: 'Bedava', cellType: null },
  'BUILD_STORAGE': { label: 'Depo', cost: '20 Yemek, 5 Toprak', cellType: CellType.STORAGE },
  'BUILD_NURSERY': { label: 'Kuluçka', cost: '50 Yemek, 10 Toprak', cellType: CellType.NURSERY },
  'BUILD_GARDEN': { label: 'Mantar Bahçesi', cost: '20 Yemek, 10 Toprak', cellType: CellType.GARDEN },
  'BUILD_MINER_CAMP': { label: 'Madenci Kampı', cost: '60 Yemek, 0 Toprak', cellType: CellType.MINER_CAMP },
  'BUILD_WORKSHOP': { label: 'Atölye', cost: '80 Yemek, 20 Toprak', cellType: CellType.WORKSHOP },
  'BUILD_BARRACKS': { label: 'Kışla', cost: '100 Yemek, 30 Toprak', cellType: CellType.BARRACKS },
};

export const UPGRADES: Upgrade[] = [
  {
    id: 'FARMING_1',
    name: 'Verimli Sporlar',
    description: 'Mantar Bahçeleri +%50 daha fazla yemek üretir.',
    cost: 15,
    effect: 'FARMING_BOOST'
  },
  {
    id: 'DIGGING_1',
    name: 'Güçlü Çeneler',
    description: 'Kazı yaparken yemek bulma şansı 2 katına çıkar.',
    cost: 30,
    effect: 'DIGGING_LUCK'
  },
  {
    id: 'COMBAT_1',
    name: 'Sert Kabuk',
    description: 'Asker karıncaların hayatta kalma şansı artar.',
    cost: 40,
    effect: 'COMBAT_BOOST'
  },
  {
    id: 'SCIENCE_1',
    name: 'Kolektif Zeka',
    description: 'Atölyelerde bilim üretme şansı artar.',
    cost: 50,
    effect: 'SCIENCE_BOOST'
  },
  {
    id: 'STORAGE_1',
    name: 'Derin Depolama',
    description: 'Başlangıç kaynak limitleri artar.',
    cost: 100,
    effect: 'STORAGE_EXPAND'
  }
];

export const MAX_STORAGE_PER_TILE = 50;
export const GARDEN_PRODUCTION_RATE = 0.5;
export const SCIENCE_GENERATION_CHANCE = 0.05;
