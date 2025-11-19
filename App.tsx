
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CellType, 
  Cell, 
  Ant, 
  AntType, 
  Tool, 
  Resources, 
  LogEntry,
  SaveData
} from './types';
import { 
  GRID_WIDTH,
  GRID_HEIGHT,
  SKY_HEIGHT,
  INITIAL_RESOURCES, 
  BUILDING_COSTS, 
  TOOL_MAP,
  SCIENCE_GENERATION_CHANCE,
  UPGRADES,
  SAVE_KEY,
  CELL_SIZE_PX
} from './constants';
import GridMap from './components/GridMap';
import { generateColonyEvent } from './services/geminiService';
import { 
  Pickaxe, 
  Box, 
  Baby, 
  Flower, 
  Hammer, 
  Zap, 
  Clock, 
  Brain,
  ScrollText,
  Save,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  Hexagon,
  Shield,
  Beaker,
  Construction,
  Crosshair,
  Target
} from 'lucide-react';

// Utility to create initial grid with Sky and Underground
const createInitialGrid = (): Cell[][] => {
  const grid: Cell[][] = [];
  const centerX = Math.floor(GRID_WIDTH / 2);
  // Place Queen deeper underground
  const queenY = SKY_HEIGHT + 10; 
  
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      let type = CellType.DIRT;

      if (y < SKY_HEIGHT) {
          type = CellType.SKY;
      } else if (y === SKY_HEIGHT) {
          type = CellType.GRASS;
      } else {
          // Underground logic
          // Initial room around queen
          if (x >= centerX - 1 && x <= centerX + 1 && y >= queenY - 1 && y <= queenY + 1) {
            type = CellType.TUNNEL;
          }
          if (x === centerX && y === queenY) {
            type = CellType.QUEEN;
          }

          // Add some random rocks only underground
          if (Math.random() < 0.05 && type === CellType.DIRT) {
            type = CellType.ROCK;
          }
      }

      row.push({ x, y, type });
    }
    grid.push(row);
  }
  return grid;
};

// Minimap Component
const Minimap = ({ grid, ants, pan, zoom, setPan }: { 
    grid: Cell[][], 
    ants: Ant[], 
    pan: {x: number, y: number}, 
    zoom: number,
    setPan: (pos: {x: number, y: number}) => void 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mapWidth = 200;
    const mapHeight = (GRID_HEIGHT / GRID_WIDTH) * mapWidth;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, mapWidth, mapHeight);

        const cellW = mapWidth / GRID_WIDTH;
        const cellH = mapHeight / GRID_HEIGHT;

        // Draw Terrain (Simplified)
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.type === CellType.SKY) {
                    ctx.fillStyle = '#87CEEB'; // Sky blue
                } else if (cell.type === CellType.DIRT) {
                    ctx.fillStyle = '#5d4037'; // Dirt brown
                } else if (cell.type === CellType.TUNNEL) {
                    ctx.fillStyle = '#3e2723'; // Dark tunnel
                } else if (cell.type === CellType.GRASS) {
                    ctx.fillStyle = '#2e7d32'; // Grass
                } else if (cell.type === CellType.ROCK) {
                    ctx.fillStyle = '#757575'; // Rock
                } else {
                    // Buildings
                    ctx.fillStyle = '#FFD700'; // Gold/Yellow for buildings
                }
                
                // Only draw if not dirt (optimization: fill dirt background first)
                if (cell.type !== CellType.DIRT) {
                    ctx.fillRect(cell.x * cellW, cell.y * cellH, cellW, cellH);
                }
            });
        });

        // Draw Ants
        ants.forEach(ant => {
            ctx.fillStyle = ant.type === AntType.ENEMY ? 'red' : 
                            ant.type === AntType.QUEEN ? 'purple' : 'white';
            ctx.fillRect(ant.position.x * cellW, ant.position.y * cellH, Math.max(2, cellW), Math.max(2, cellH));
        });

        // Draw Viewport Rectangle
        const viewportW = (window.innerWidth - 256 - 288) / zoom; // Subtract sidebars (rough approx)
        const viewportH = window.innerHeight / zoom;
        const viewportX = (-pan.x / zoom);
        const viewportY = (-pan.y / zoom);

        const minimapRectX = (viewportX / (GRID_WIDTH * CELL_SIZE_PX)) * mapWidth;
        const minimapRectY = (viewportY / (GRID_HEIGHT * CELL_SIZE_PX)) * mapHeight;
        const minimapRectW = (viewportW / (GRID_WIDTH * CELL_SIZE_PX)) * mapWidth;
        const minimapRectH = (viewportH / (GRID_HEIGHT * CELL_SIZE_PX)) * mapHeight;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(minimapRectX, minimapRectY, minimapRectW, minimapRectH);

    }, [grid, ants, pan, zoom]);

    const handleMinimapClick = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert click ratio to world coordinates
        const ratioX = clickX / mapWidth;
        const ratioY = clickY / mapHeight;

        const worldX = ratioX * (GRID_WIDTH * CELL_SIZE_PX);
        const worldY = ratioY * (GRID_HEIGHT * CELL_SIZE_PX);

        // Center screen on world coordinates
        // Pan = -WorldPos * Zoom + ScreenCenter
        // Using simplified center logic (ignoring sidebar offset for cleaner math)
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        
        setPan({
            x: -(worldX * zoom) + screenCX,
            y: -(worldY * zoom) + screenCY
        });
    };

    return (
        <canvas 
            ref={canvasRef} 
            width={mapWidth} 
            height={mapHeight} 
            className="border-2 border-stone-600 rounded bg-black shadow-2xl cursor-crosshair hover:border-amber-500 transition-colors"
            onClick={handleMinimapClick}
        />
    );
};

const App: React.FC = () => {
  // Game State
  const [grid, setGrid] = useState<Cell[][]>(createInitialGrid);
  const [ants, setAnts] = useState<Ant[]>([
    { id: 'queen', type: AntType.QUEEN, position: { x: Math.floor(GRID_WIDTH / 2), y: SKY_HEIGHT + 10 }, facing: 'right' }
  ]);
  const [resources, setResources] = useState<Resources>(INITIAL_RESOURCES);
  const [unlockedUpgrades, setUnlockedUpgrades] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('DIG');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastSave, setLastSave] = useState<number | null>(null);
  
  // UI State
  const [sidebarTab, setSidebarTab] = useState<'BUILD' | 'RESEARCH'>('BUILD');

  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Drag Logic References
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now()
    }, ...prev].slice(0, 50));
  };

  // --- SAVE / LOAD SYSTEM ---

  const saveGame = useCallback(() => {
    const data: SaveData = {
      grid,
      ants,
      resources,
      unlockedUpgrades,
      lastSaveTime: Date.now()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      setLastSave(Date.now());
      addLog("Oyun kaydedildi.", "info");
    } catch (e) {
      console.error("Save failed", e);
      addLog("Kayıt başarısız!", "warning");
    }
  }, [grid, ants, resources, unlockedUpgrades]);

  const centerOnQueen = useCallback(() => {
    const queen = ants.find(a => a.type === AntType.QUEEN);
    if (queen) {
        // Center based on window size
        // Target X in world = queen.x * 40
        // Pan = CenterScreen - (TargetWorld * Zoom)
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        
        setPan({ 
            x: screenCX - (queen.position.x * CELL_SIZE_PX * zoom), 
            y: screenCY - (queen.position.y * CELL_SIZE_PX * zoom)
        });
    }
  }, [ants, zoom]);

  const loadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data: SaveData = JSON.parse(saved);
        // Simple validation for map size
        if (data.grid.length === GRID_HEIGHT && data.grid[0].length === GRID_WIDTH) {
             setGrid(data.grid);
             setAnts(data.ants);
             setResources(data.resources);
             setUnlockedUpgrades(data.unlockedUpgrades || []);
             addLog("Kayıtlı oyun yüklendi.", "success");
             // We need to wait for state to settle or just calc center manually
             // Deferring centerOnQueen call slightly or just setting initial pan manually
             const queen = data.ants.find(a => a.type === AntType.QUEEN);
             if (queen) {
                const screenCX = window.innerWidth / 2;
                const screenCY = window.innerHeight / 2;
                setPan({ 
                    x: screenCX - (queen.position.x * CELL_SIZE_PX), 
                    y: screenCY - (queen.position.y * CELL_SIZE_PX)
                });
             }
        } else {
            addLog("Harita boyutu değiştiği için yeni oyun başlatıldı.", "warning");
            centerOnQueen();
        }
      } catch (e) {
        console.error("Load failed", e);
        addLog("Kayıt dosyası bozuk.", "warning");
      }
    } else {
        centerOnQueen();
    }
  };

  const resetGame = () => {
    if (window.confirm("Tüm ilerlemen silinecek. Emin misin?")) {
      localStorage.removeItem(SAVE_KEY);
      const newGrid = createInitialGrid();
      setGrid(newGrid);
      const startQueen: Ant = { id: 'queen', type: AntType.QUEEN, position: { x: Math.floor(GRID_WIDTH / 2), y: SKY_HEIGHT + 10 }, facing: 'right' };
      setAnts([startQueen]);
      setResources(INITIAL_RESOURCES);
      setUnlockedUpgrades([]);
      
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;
      setPan({ 
        x: screenCX - (startQueen.position.x * CELL_SIZE_PX), 
        y: screenCY - (startQueen.position.y * CELL_SIZE_PX)
      });
      
      addLog("Oyun sıfırlandı.", "warning");
    }
  };

  // Initial Load
  useEffect(() => {
    loadGame();
  }, []);

  // Auto Save Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) saveGame();
    }, 30000); 
    return () => clearInterval(interval);
  }, [isPaused, saveGame]);

  // AI Event Loop
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPaused) return;
      if (Math.random() < 0.01) {
        const counts: Record<string, number> = {};
        grid.flat().forEach(cell => {
            if (cell.type !== CellType.DIRT && cell.type !== CellType.ROCK && cell.type !== CellType.TUNNEL && cell.type !== CellType.SKY && cell.type !== CellType.GRASS) {
                counts[cell.type] = (counts[cell.type] || 0) + 1;
            }
        });
        const eventText = await generateColonyEvent(resources, counts);
        addLog(eventText, 'ai');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [resources, grid, isPaused]);

  // Game Logic Tick
  const tick = useCallback(() => {
    if (isPaused) return;

    setResources(prev => {
      let newFood = prev.food;
      let newDirt = prev.dirt;
      let newScience = prev.science;
      
      const farmingMultiplier = unlockedUpgrades.includes('FARMING_1') ? 1.5 : 1.0;
      const scienceChanceMultiplier = unlockedUpgrades.includes('SCIENCE_1') ? 2.0 : 1.0;
      
      // REDUCED CONSUMPTION
      const consumption = prev.population * 0.01;
      newFood = Math.max(0, newFood - consumption);

      // PRODUCTION
      let gardenCount = 0;
      let workshopCount = 0;

      grid.forEach(row => {
        row.forEach(cell => {
            if (cell.type === CellType.GARDEN) {
                gardenCount++;
            } else if (cell.type === CellType.WORKSHOP) {
                workshopCount++;
            }
        });
      });

      if (gardenCount > 0) {
          newFood += (gardenCount * 0.5 * farmingMultiplier);
      }

      for (let i = 0; i < workshopCount; i++) {
          if (Math.random() < (SCIENCE_GENERATION_CHANCE * scienceChanceMultiplier)) {
             newScience += 1;
          }
      }

      // MINER PRODUCTION (Dirt Generation)
      const miners = ants.filter(a => a.type === AntType.MINER).length;
      if (miners > 0) {
          // Each miner produces roughly 0.2 dirt per tick
          newDirt += (miners * 0.2);
      }

      return {
        ...prev,
        food: Math.max(0, parseFloat(newFood.toFixed(1))),
        dirt: Math.max(0, parseFloat(newDirt.toFixed(1))),
        science: newScience
      };
    });

    // COMBAT and MOVEMENT Logic
    setAnts(prevAnts => {
        let nextAnts = [...prevAnts];
        const enemies = prevAnts.filter(a => a.type === AntType.ENEMY);
        const colonyAnts = prevAnts.filter(a => a.type !== AntType.ENEMY);
        const deadIds = new Set<string>();

        // Combat Resolution
        if (enemies.length > 0 && colonyAnts.length > 0) {
            enemies.forEach(enemy => {
                colonyAnts.forEach(ant => {
                    // Distance check (Manhattan distance < 2 implies same cell or adjacent)
                    const dist = Math.abs(enemy.position.x - ant.position.x) + Math.abs(enemy.position.y - ant.position.y);
                    
                    if (dist < 2 && !deadIds.has(ant.id) && !deadIds.has(enemy.id)) {
                        // FIGHT!
                        if (ant.type === AntType.QUEEN) {
                             addLog("KRALİÇE SALDIRI ALTINDA!", "danger");
                             deadIds.add(enemy.id);
                        } else if (ant.type === AntType.SOLDIER) {
                            const soldierWinChance = unlockedUpgrades.includes('COMBAT_1') ? 0.9 : 0.7;
                            if (Math.random() < soldierWinChance) {
                                deadIds.add(enemy.id);
                                addLog("Bir asker örümceği öldürdü!", "success");
                                setResources(r => ({ ...r, food: r.food + 10 })); // Loot
                            } else {
                                deadIds.add(ant.id);
                                addLog("Bir asker şehit düştü...", "danger");
                            }
                        } else {
                            // Workers and Miners usually die
                            if (Math.random() < 0.1) {
                                deadIds.add(enemy.id);
                                addLog(`Bir ${ant.type === AntType.MINER ? 'madenci' : 'işçi'} örümceği öldürdü!`, "success");
                            } else {
                                deadIds.add(ant.id);
                                addLog(`Bir ${ant.type === AntType.MINER ? 'madenci' : 'işçi'} örümceğe yem oldu.`, "danger");
                            }
                        }
                    }
                });
            });
        }

        // Remove Dead
        if (deadIds.size > 0) {
            nextAnts = nextAnts.filter(a => !deadIds.has(a.id));
            // Update population count
            const antsDied = colonyAnts.filter(a => deadIds.has(a.id)).length;
            if (antsDied > 0) {
                setResources(r => ({ ...r, population: Math.max(1, r.population - antsDied) }));
            }
        }

        // Movement
        return nextAnts.map(ant => {
            if (ant.type === AntType.QUEEN) return ant;

            const moves = [
                { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            const validMoves = moves.filter(move => {
                const newX = ant.position.x + move.x;
                const newY = ant.position.y + move.y;
                
                if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) return false;
                const targetCell = grid[newY][newX];
                
                // Entities move differently
                if (ant.type === AntType.ENEMY) {
                     // Enemies must stay underground (TUNNELS or existing rooms)
                     // Cannot go to SKY or GRASS
                     return targetCell.type !== CellType.SKY && 
                            targetCell.type !== CellType.GRASS && 
                            targetCell.type !== CellType.DIRT && // Cannot dig
                            targetCell.type !== CellType.ROCK;
                } else {
                    // Ants cannot fly into SKY and cannot walk into DIRT/ROCK directly
                    if (targetCell.type === CellType.SKY || targetCell.type === CellType.GRASS) return false;
                    return targetCell.type !== CellType.DIRT && targetCell.type !== CellType.ROCK;
                }
            });

            if (validMoves.length > 0) {
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                return {
                    ...ant,
                    position: {
                        x: ant.position.x + randomMove.x,
                        y: ant.position.y + randomMove.y
                    },
                    facing: randomMove.x === -1 ? 'left' : randomMove.x === 1 ? 'right' : ant.facing
                };
            }
            return ant;
        });
    });

    // Spawning Logic (Worker + Soldier + Miner + Enemy)
    setResources(prev => {
        let newPop = prev.population;
        let newFood = prev.food;
        const nurseries = grid.flat().filter(c => c.type === CellType.NURSERY).length;
        const barracks = grid.flat().filter(c => c.type === CellType.BARRACKS).length;
        const minerCamps = grid.flat().filter(c => c.type === CellType.MINER_CAMP).length;
        const effectiveMaxPop = 5 + (nurseries * 5);

        // Worker Spawn (Always possible if food exists)
        if (newPop < effectiveMaxPop && newFood >= 20 && Math.random() < 0.05) {
             newFood -= 20;
             newPop += 1;
             addLog("Yeni bir işçi karınca doğdu!", "success");
             
             const queen = ants.find(a => a.type === AntType.QUEEN);
             const spawnPos = queen ? { ...queen.position } : { x: Math.floor(GRID_WIDTH/2), y: SKY_HEIGHT + 10 };

             setAnts(prevAnts => [
                 ...prevAnts,
                 {
                     id: `worker-${Date.now()}`,
                     type: AntType.WORKER,
                     position: spawnPos,
                     facing: Math.random() > 0.5 ? 'left' : 'right'
                 }
             ]);
        }

        // Soldier Spawn (Requires Barracks)
        if (barracks > 0 && newPop < effectiveMaxPop && newFood >= 40 && Math.random() < 0.02) {
             newFood -= 40;
             newPop += 1;
             addLog("Yeni bir ASKER karınca orduya katıldı!", "success");
             
             const queen = ants.find(a => a.type === AntType.QUEEN);
             const spawnPos = queen ? { ...queen.position } : { x: Math.floor(GRID_WIDTH/2), y: SKY_HEIGHT + 10 };

             setAnts(prevAnts => [
                 ...prevAnts,
                 {
                     id: `soldier-${Date.now()}`,
                     type: AntType.SOLDIER,
                     position: spawnPos,
                     facing: Math.random() > 0.5 ? 'left' : 'right'
                 }
             ]);
        }

        // Miner Spawn (Requires Miner Camp)
        if (minerCamps > 0 && newPop < effectiveMaxPop && newFood >= 30 && Math.random() < 0.03) {
            newFood -= 30;
            newPop += 1;
            addLog("Yeni bir MADENCİ karınca işbaşı yaptı!", "success");
            
            const queen = ants.find(a => a.type === AntType.QUEEN);
            const spawnPos = queen ? { ...queen.position } : { x: Math.floor(GRID_WIDTH/2), y: SKY_HEIGHT + 10 };

            setAnts(prevAnts => [
                ...prevAnts,
                {
                    id: `miner-${Date.now()}`,
                    type: AntType.MINER,
                    position: spawnPos,
                    facing: Math.random() > 0.5 ? 'left' : 'right'
                }
            ]);
        }

        // Enemy Spawn (Random event)
        if (Math.random() < 0.005) { // Low chance per tick
             // Find valid spawn points (Underground tunnels)
             const undergroundTunnels = grid.flat().filter(c => 
                (c.type === CellType.TUNNEL || c.type === CellType.QUEEN) && 
                c.y > SKY_HEIGHT
             );

             if (undergroundTunnels.length > 0) {
                addLog("Dikkat! Tünellerde bir örümcek belirdi!", "danger");
                // Pick a random tunnel cell
                const spawnCell = undergroundTunnels[Math.floor(Math.random() * undergroundTunnels.length)];
                
                setAnts(prevAnts => [
                    ...prevAnts,
                    {
                        id: `enemy-${Date.now()}`,
                        type: AntType.ENEMY,
                        position: { x: spawnCell.x, y: spawnCell.y },
                        facing: Math.random() > 0.5 ? 'left' : 'right'
                    }
                ]);
             }
        }

        return {
            ...prev,
            population: newPop,
            maxPopulation: effectiveMaxPop,
            food: newFood
        };
    });

  }, [grid, ants, isPaused, unlockedUpgrades]);

  // Loop Effect
  useEffect(() => {
    const intervalId = setInterval(tick, 500);
    return () => clearInterval(intervalId);
  }, [tick]);

  // --- INTERACTION HANDLERS ---

  const performCellAction = (x: number, y: number) => {
    if (isPaused) return;
    
    const cell = grid[y][x];
    
    if (cell.type === CellType.SKY || cell.type === CellType.GRASS) {
        addLog("Yüzeye müdahale edemezsin.", "warning");
        return;
    }

    const toolInfo = TOOL_MAP[activeTool];

    // Handle DIG
    if (activeTool === 'DIG') {
      if (cell.type === CellType.DIRT) {
        setResources(prev => ({ ...prev, dirt: prev.dirt + 1 }));
        setGrid(prev => {
          const newGrid = [...prev];
          newGrid[y] = [...prev[y]];
          newGrid[y][x] = { ...cell, type: CellType.TUNNEL };
          return newGrid;
        });
        
        const digLuckMultiplier = unlockedUpgrades.includes('DIGGING_1') ? 2.0 : 1.0;
        if (Math.random() < (0.2 * digLuckMultiplier)) {
            setResources(prev => ({ ...prev, food: prev.food + 5 }));
            addLog("Kazı yaparken yiyecek buldun!", "success");
        }
      } else {
          addLog("Sadece toprağı kazabilirsin.", "warning");
      }
      return;
    }

    // Handle Buildings
    if (toolInfo.cellType) {
      if (cell.type === CellType.DIRT) {
          addLog("Oda inşa etmeden önce tünel kazmalısın!", "warning");
          return;
      }
      if (cell.type !== CellType.TUNNEL) {
          addLog("Binaları sadece boş tünellere inşa edebilirsin.", "warning");
          return;
      }

      const cost = BUILDING_COSTS[toolInfo.cellType];
      if (resources.food >= cost.food && resources.dirt >= cost.dirt) {
          setResources(prev => ({
              ...prev,
              food: prev.food - cost.food,
              dirt: prev.dirt - cost.dirt
          }));
          setGrid(prev => {
            const newGrid = [...prev];
            newGrid[y] = [...prev[y]];
            newGrid[y][x] = { ...cell, type: toolInfo.cellType! };
            return newGrid;
          });
          addLog(`${toolInfo.label} inşa edildi!`, "success");
      } else {
          addLog(`Yetersiz Kaynak! Gereken: ${cost.food}Y, ${cost.dirt}T`, "warning");
      }
    }
  };

  // Mouse Events for Panning and Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
      // Only pan with left click (button 0)
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      lastPanPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      setIsDragging(false);
      
      // Check for Click vs Drag
      const dist = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.current.x, 2) + 
          Math.pow(e.clientY - dragStartPos.current.y, 2)
      );

      // If moved less than 5 pixels, consider it a click
      if (dist < 5) {
          // Determine which cell was clicked based on event target
          const target = e.target as HTMLElement;
          const cellDiv = target.closest('[data-x]');
          if (cellDiv) {
              const x = parseInt(cellDiv.getAttribute('data-x') || '-1');
              const y = parseInt(cellDiv.getAttribute('data-y') || '-1');
              if (x >= 0 && y >= 0) {
                  performCellAction(x, y);
              }
          }
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault(); // Prevent browser scrolling
      
      // Get the mouse position relative to the viewport
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomSpeed = 0.1; // Increased speed slightly for better feel
      const delta = -Math.sign(e.deltaY) * zoomSpeed;
      
      const newZoom = Math.max(0.2, Math.min(3, zoom + delta));
      
      // Calculate the offset of the mouse relative to the current pan
      // (mouseX - panX) / zoom = WorldX
      // We want WorldX to remain under the mouse after zoom
      // WorldX = (mouseX - newPanX) / newZoom
      // So: (mouseX - panX) / zoom = (mouseX - newPanX) / newZoom
      // (mouseX - panX) * (newZoom / zoom) = mouseX - newPanX
      // newPanX = mouseX - (mouseX - panX) * (newZoom / zoom)
      
      const scaleRatio = newZoom / zoom;
      
      setPan(prev => ({
          x: mouseX - (mouseX - prev.x) * scaleRatio,
          y: mouseY - (mouseY - prev.y) * scaleRatio
      }));
      
      setZoom(newZoom);
  };

  const buyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    if (unlockedUpgrades.includes(upgradeId)) {
      addLog("Bu yükseltmeye zaten sahipsin.", "info");
      return;
    }

    if (resources.science >= upgrade.cost) {
      setResources(prev => ({ ...prev, science: prev.science - upgrade.cost }));
      setUnlockedUpgrades(prev => [...prev, upgradeId]);
      addLog(`${upgrade.name} yükseltmesi alındı!`, "success");
    } else {
      addLog(`Yetersiz Bilim Puanı! Gereken: ${upgrade.cost}`, "warning");
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#1a1a1a] text-stone-200 overflow-hidden select-none">
      
      {/* Left Sidebar - Stats */}
      <div className="w-64 bg-[#262626] border-r border-[#3e3e3e] flex flex-col p-3 shadow-xl z-20 flex-shrink-0">
        
        {/* System Controls */}
        <div className="flex gap-2 mb-4 mt-2">
            <button onClick={saveGame} className="flex-1 bg-stone-700 hover:bg-stone-600 p-1.5 rounded text-[10px] flex items-center justify-center gap-1" title="Kaydet">
                <Save size={12} /> Kaydet
            </button>
            <button onClick={resetGame} className="flex-1 bg-red-900/50 hover:bg-red-900 p-1.5 rounded text-[10px] flex items-center justify-center gap-1" title="Sıfırla">
                <RotateCcw size={12} /> Sıfırla
            </button>
        </div>

        <div className="space-y-3 mb-6">
            <StatBox icon={<Baby size={16} className="text-pink-400" />} label="Nüfus" value={`${resources.population} / ${resources.maxPopulation}`} />
            <StatBox icon={<Box size={16} className="text-green-500" />} label="Yemek" value={Math.floor(resources.food)} />
            <StatBox icon={<Hexagon size={16} className="text-amber-700" />} label="Toprak" value={Math.floor(resources.dirt)} />
            <StatBox icon={<Brain size={16} className="text-blue-400" />} label="Bilim" value={resources.science} />
        </div>

        <div className="flex-grow overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                <ScrollText size={12} /> GÜNLÜK
            </h3>
            <div className="space-y-1 text-[10px] font-mono opacity-80">
                {logs.map(log => (
                    <div key={log.id} className={`p-1.5 rounded bg-black/20 border-l-2 ${
                        log.type === 'success' ? 'border-green-500 text-green-100' :
                        log.type === 'warning' ? 'border-yellow-500 text-yellow-100' :
                        log.type === 'danger' ? 'border-red-500 text-red-100' :
                        log.type === 'ai' ? 'border-purple-500 text-purple-200 italic' :
                        'border-gray-500 text-gray-300'
                    }`}>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Main Area - Grid */}
      <div 
        className="flex-1 relative bg-[#111] overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Logo Overlay */}
        <div className="absolute top-4 left-4 z-30 pointer-events-none select-none">
             <h1 className="text-sm font-bold text-[#e6b800] pixel-font tracking-tighter leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                <span className="text-[#a05a2c]">FORMICARIUM</span> EMPIRE
            </h1>
        </div>

        {/* Top Right Cluster: Minimap + Controls */}
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
             <Minimap 
                grid={grid} 
                ants={ants} 
                pan={pan} 
                zoom={zoom}
                setPan={setPan}
            />

             <div className="flex gap-1 bg-black/60 p-1 rounded backdrop-blur-sm border border-white/10">
                 <button 
                    onClick={() => setZoom(z => Math.max(z - 0.2, 0.2))}
                    className="p-2 bg-[#333] rounded hover:bg-[#444] text-white"
                    title="Uzaklaş"
                 >
                     <ZoomOut size={18} />
                 </button>
                 <span className="flex items-center justify-center w-12 text-xs font-mono bg-black/40 rounded">{Math.round(zoom * 100)}%</span>
                 <button 
                    onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
                    className="p-2 bg-[#333] rounded hover:bg-[#444] text-white"
                    title="Yakınlaş"
                 >
                     <ZoomIn size={18} />
                 </button>
                 <div className="w-px bg-gray-600 mx-1"></div>
                 <button 
                    onClick={centerOnQueen}
                    className="p-2 bg-amber-900/50 hover:bg-amber-800 text-amber-200 rounded border border-amber-900/50"
                    title="Yuvaya Odakla"
                 >
                     <Target size={18} />
                 </button>
             </div>
        </div>
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none"></div>
        
        <GridMap 
            grid={grid} 
            ants={ants} 
            zoom={zoom}
            pan={pan}
        />
      </div>

      {/* Right Sidebar - Tools & Upgrades - COMPACT LIST */}
      <div className="w-72 bg-[#262626] border-l border-[#3e3e3e] flex flex-col shadow-xl z-20 flex-shrink-0">
         <div className="bg-[#333] border-b border-[#444] flex">
             <button 
                onClick={() => setSidebarTab('BUILD')}
                className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    sidebarTab === 'BUILD' ? 'bg-[#262626] text-white border-b-2 border-amber-600' : 'text-gray-500 hover:bg-[#2d2d2d]'
                }`}
            >
                <Construction size={14} /> İnşaat
            </button>
            <button 
                onClick={() => setSidebarTab('RESEARCH')}
                className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    sidebarTab === 'RESEARCH' ? 'bg-[#262626] text-white border-b-2 border-blue-500' : 'text-gray-500 hover:bg-[#2d2d2d]'
                }`}
            >
                <Beaker size={14} /> Laboratuvar
            </button>
         </div>
         
         <div className="p-2 bg-[#2a2a2a] border-b border-[#333] flex justify-end">
            <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 ${isPaused ? 'bg-red-900/20 text-red-400 border border-red-900' : 'bg-green-900/20 text-green-400 border border-green-900'}`}
            >
                {isPaused ? 'DURAKLATILDI' : <><Clock size={12} className="animate-spin-slow" /> AKIYOR</>}
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-2">
            
            {sidebarTab === 'BUILD' && (
                <div className="flex flex-col gap-1.5">
                    <button
                        onClick={() => setActiveTool('DIG')}
                        className={`flex items-center p-1.5 rounded border transition-all w-full ${
                            activeTool === 'DIG' 
                            ? 'bg-[#5d4037] border-[#8d6e63] text-white shadow-md' 
                            : 'bg-[#2a2a2a] border-[#333] hover:bg-[#333] text-gray-400'
                        }`}
                    >
                        <div className="w-8 flex-shrink-0 flex justify-center"><Pickaxe size={18} /></div>
                        <div className="flex-1 text-left">
                            <div className="text-[11px] font-bold">Kaz</div>
                            <div className="text-[9px] opacity-70">Bedava / +1 Toprak</div>
                        </div>
                    </button>

                    <ListToolButton 
                        id="BUILD_STORAGE"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Box size={18} className="text-amber-400"/>}
                        title="Depo"
                        cost={BUILDING_COSTS[CellType.STORAGE]}
                    />

                    <ListToolButton 
                        id="BUILD_NURSERY"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Baby size={18} className="text-pink-400"/>}
                        title="Kuluçka"
                        cost={BUILDING_COSTS[CellType.NURSERY]}
                    />

                    <ListToolButton 
                        id="BUILD_GARDEN"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Flower size={18} className="text-green-400"/>}
                        title="Mantar Bahçesi"
                        cost={BUILDING_COSTS[CellType.GARDEN]}
                    />

                    <ListToolButton 
                        id="BUILD_MINER_CAMP"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Pickaxe size={18} className="text-yellow-500"/>}
                        title="Madenci Kampı"
                        cost={BUILDING_COSTS[CellType.MINER_CAMP]}
                    />

                    <ListToolButton 
                        id="BUILD_WORKSHOP"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Hammer size={18} className="text-blue-400"/>}
                        title="Atölye"
                        cost={BUILDING_COSTS[CellType.WORKSHOP]}
                    />

                    <ListToolButton 
                        id="BUILD_BARRACKS"
                        tool={activeTool}
                        setTool={setActiveTool}
                        icon={<Shield size={18} className="text-red-400"/>}
                        title="Kışla"
                        cost={BUILDING_COSTS[CellType.BARRACKS]}
                    />
                </div>
            )}

            {sidebarTab === 'RESEARCH' && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 mb-1 px-1">
                        <Zap size={12} /> 
                        <span className="text-[10px] font-bold uppercase tracking-wider">Mevcut Yükseltmeler</span>
                    </div>
                    
                    {UPGRADES.map(upgrade => {
                        const isUnlocked = unlockedUpgrades.includes(upgrade.id);
                        const canAfford = resources.science >= upgrade.cost;

                        return (
                            <div key={upgrade.id} className={`p-1.5 rounded border transition-all flex flex-col gap-1 ${
                                isUnlocked 
                                ? 'bg-blue-900/20 border-blue-500/50 opacity-70' 
                                : canAfford 
                                    ? 'bg-[#2a2a2a] border-gray-600 hover:border-blue-400 cursor-pointer' 
                                    : 'bg-[#202020] border-gray-700 opacity-50'
                            }`}
                            onClick={() => !isUnlocked && buyUpgrade(upgrade.id)}
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className={`font-bold text-[11px] ${isUnlocked ? 'text-blue-300' : 'text-gray-200'}`}>
                                        {upgrade.name}
                                    </h4>
                                    {isUnlocked ? (
                                        <Check size={12} className="text-green-400" />
                                    ) : (
                                        <span className="text-[9px] font-mono text-blue-400 bg-blue-900/30 px-1 rounded">{upgrade.cost} P</span>
                                    )}
                                </div>
                                <p className="text-[9px] text-gray-500 leading-tight">{upgrade.description}</p>
                            </div>
                        );
                    })}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value }: any) => (
    <div className="bg-[#333] p-2 rounded border border-[#444]">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm font-mono text-white flex items-center gap-1.5">
            {icon}
            {value}
        </div>
    </div>
);

const ListToolButton = ({ id, tool, setTool, icon, title, cost }: any) => {
    const isActive = tool === id;
    return (
        <button
            onClick={() => setTool(id)}
            className={`flex items-center p-1.5 rounded border transition-all w-full text-left ${
                isActive 
                ? 'bg-[#5d4037] border-[#8d6e63] text-white shadow-md' 
                : 'bg-[#2a2a2a] border-[#333] hover:bg-[#333] text-gray-400'
            }`}
        >
            <div className="w-8 flex-shrink-0 flex justify-center">{icon}</div>
            <div className="flex-1">
                <div className="text-[11px] font-bold">{title}</div>
                <div className="text-[9px] font-mono flex items-center gap-2 opacity-80 mt-0.5">
                    <span className="text-amber-300">{cost.food} Y</span>
                    <span className="text-stone-400">{cost.dirt} T</span>
                </div>
            </div>
        </button>
    );
};

export default App;
