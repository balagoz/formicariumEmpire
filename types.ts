
export enum CellType {
  SKY = 'SKY',
  GRASS = 'GRASS',
  DIRT = 'DIRT',
  TUNNEL = 'TUNNEL',
  QUEEN = 'QUEEN',
  STORAGE = 'STORAGE',
  NURSERY = 'NURSERY',
  GARDEN = 'GARDEN',
  WORKSHOP = 'WORKSHOP',
  BARRACKS = 'BARRACKS',
  MINER_CAMP = 'MINER_CAMP',
  ROCK = 'ROCK'
}

export enum AntType {
  QUEEN = 'QUEEN',
  WORKER = 'WORKER',
  SOLDIER = 'SOLDIER',
  MINER = 'MINER',
  ENEMY = 'ENEMY' // Spiders, beetles etc.
}

export interface Position {
  x: number;
  y: number;
}

export interface Ant {
  id: string;
  type: AntType;
  position: Position;
  target?: Position;
  holding?: 'FOOD' | 'DIRT' | null;
  facing: 'left' | 'right';
  health?: number; // Added simple health
}

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  amount?: number; // For storage amount
}

export interface Resources {
  food: number;
  dirt: number;
  population: number;
  maxPopulation: number;
  science: number;
}

export interface BuildingCost {
  food: number;
  dirt: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: 'FARMING_BOOST' | 'DIGGING_LUCK' | 'STORAGE_EXPAND' | 'SCIENCE_BOOST' | 'COMBAT_BOOST';
}

export interface GameState {
  grid: Cell[][];
  ants: Ant[];
  resources: Resources;
  lastTick: number;
  gameSpeed: number;
}

export interface SaveData {
  grid: Cell[][];
  ants: Ant[];
  resources: Resources;
  unlockedUpgrades: string[];
  lastSaveTime: number;
}

export type Tool = 'DIG' | 'BUILD_STORAGE' | 'BUILD_NURSERY' | 'BUILD_GARDEN' | 'BUILD_WORKSHOP' | 'BUILD_BARRACKS' | 'BUILD_MINER_CAMP';

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger' | 'ai';
  timestamp: number;
}
