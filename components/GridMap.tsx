
import React, { memo } from 'react';
import { Cell, CellType, Ant, AntType } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_PX } from '../constants';
import { Box, Flower, Baby, Hammer, Hexagon, Cloud, Shield, Skull, Pickaxe } from 'lucide-react';

interface GridMapProps {
  grid: Cell[][];
  ants: Ant[];
  zoom: number;
  pan: { x: number; y: number };
}

const CellIcon = ({ type, yIndex }: { type: CellType, yIndex: number }) => {
  switch (type) {
    case CellType.SKY:
      return <div className="w-full h-full bg-sky-300/80 border-none">
        {Math.random() > 0.95 && <Cloud size={24} className="text-white/60 absolute top-2 left-2" />}
      </div>;
    case CellType.GRASS:
      return <div className="w-full h-full bg-green-700 border-b-4 border-green-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-green-500/50"></div>
        <div className="absolute bottom-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-40"></div>
      </div>;
    case CellType.QUEEN:
      return <div className="w-full h-full flex items-center justify-center bg-purple-900/50 text-purple-300 shadow-inner"><Hexagon size={28} fill="currentColor" /></div>;
    case CellType.STORAGE:
      return <div className="w-full h-full flex items-center justify-center bg-amber-900/50 text-amber-400 border-2 border-amber-900/30"><Box size={24} strokeWidth={1.5} /></div>;
    case CellType.NURSERY:
      return <div className="w-full h-full flex items-center justify-center bg-pink-900/50 text-pink-300 border-2 border-pink-900/30"><Baby size={24} strokeWidth={1.5} /></div>;
    case CellType.GARDEN:
      return <div className="w-full h-full flex items-center justify-center bg-green-900/50 text-green-400 border-2 border-green-900/30"><Flower size={24} strokeWidth={1.5} /></div>;
    case CellType.WORKSHOP:
      return <div className="w-full h-full flex items-center justify-center bg-blue-900/50 text-blue-400 border-2 border-blue-900/30"><Hammer size={24} strokeWidth={1.5} /></div>;
    case CellType.BARRACKS:
      return <div className="w-full h-full flex items-center justify-center bg-red-900/50 text-red-400 border-2 border-red-900/30"><Shield size={24} strokeWidth={1.5} /></div>;
    case CellType.MINER_CAMP:
      return <div className="w-full h-full flex items-center justify-center bg-stone-800/50 text-yellow-500 border-2 border-yellow-700/30"><Pickaxe size={24} strokeWidth={1.5} /></div>;
    case CellType.TUNNEL:
      return <div className="w-full h-full bg-[#3e2723] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"></div>;
    case CellType.ROCK:
      return <div className="w-full h-full bg-stone-600 flex items-center justify-center rounded-sm"><div className="w-[80%] h-[80%] bg-stone-500 rounded-sm border-2 border-stone-700"></div></div>;
    default: // DIRT
      const depthOpacity = Math.min(0.8, (yIndex / GRID_HEIGHT) * 0.8 + 0.2);
      return <div className="w-full h-full bg-[#5d4037] border border-[#4e342e] hover:brightness-110 transition-all relative">
        <div className="absolute inset-0 bg-black" style={{ opacity: depthOpacity * 0.3 }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
      </div>;
  }
};

const Entity3D = ({ entity }: { entity: Ant }) => {
    const isQueen = entity.type === AntType.QUEEN;
    const isSoldier = entity.type === AntType.SOLDIER;
    const isMiner = entity.type === AntType.MINER;
    const isEnemy = entity.type === AntType.ENEMY;
    const rotation = entity.facing === 'left' ? -90 : 90;
    
    if (isEnemy) {
        return (
            <div className="relative w-full h-full flex items-center justify-center transition-transform duration-300">
                <div className="absolute text-red-600 animate-pulse z-20" style={{ transform: `rotate(${rotation}deg)` }}>
                    <Skull size={28} fill="black" />
                </div>
            </div>
        );
    }

    // Ant Visuals
    let bodyColorClass = 'bg-[#2c2c2c]'; // Worker default
    let legColorClass = 'bg-[#1a1a1a]';
    let bodyGradient = 'radial-gradient(circle at 30% 30%, #555, #1a1a1a)';
    
    if (isQueen) {
        bodyColorClass = 'bg-orange-700';
        legColorClass = 'bg-orange-800';
        bodyGradient = 'radial-gradient(circle at 30% 30%, #fb8c00, #e65100)';
    } else if (isSoldier) {
        bodyColorClass = 'bg-red-800';
        legColorClass = 'bg-red-900';
        bodyGradient = 'radial-gradient(circle at 30% 30%, #d32f2f, #b71c1c)';
    } else if (isMiner) {
        bodyColorClass = 'bg-yellow-700';
        legColorClass = 'bg-yellow-900';
        bodyGradient = 'radial-gradient(circle at 30% 30%, #f9a825, #f57f17)';
    }
    
    // Leg Animation - Only if not Queen
    const legAnim1 = isQueen ? '' : 'animate-[leg-wiggle-1_0.2s_infinite_alternate]';
    const legAnim2 = isQueen ? '' : 'animate-[leg-wiggle-2_0.2s_infinite_alternate]';

    return (
        <div 
            className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-linear"
            style={{
                transform: `rotate(${rotation}deg)`,
            }}
        >
             <style>
                {`
                @keyframes leg-wiggle-1 { 0% { transform: rotate(20deg); } 100% { transform: rotate(-20deg); } }
                @keyframes leg-wiggle-2 { 0% { transform: rotate(-10deg); } 100% { transform: rotate(30deg); } }
                `}
            </style>

            {/* Legs Layer */}
            <div className="absolute w-full h-full flex items-center justify-center z-0">
                 {/* Left Legs */}
                <div className={`absolute w-[140%] h-[2px] ${legColorClass} top-[30%] -translate-x-[10%] origin-center ${legAnim1}`}></div>
                <div className={`absolute w-[140%] h-[2px] ${legColorClass} top-[50%] -translate-x-[10%] origin-center ${legAnim2}`}></div>
                <div className={`absolute w-[140%] h-[2px] ${legColorClass} top-[70%] -translate-x-[10%] origin-center ${legAnim1}`}></div>
            </div>

            {/* Body Layer */}
            <div className="relative z-10 flex flex-col items-center gap-[1px]">
                {/* Head */}
                <div 
                    className={`${isSoldier ? 'w-4 h-4' : 'w-3 h-3'} rounded-full shadow-lg relative`}
                    style={{ background: bodyGradient }}
                >
                    {/* Eyes */}
                    <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-black/50 rounded-full"></div>
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-black/50 rounded-full"></div>
                    
                    {/* Mandibles */}
                    <div className={`absolute -top-1 left-0 w-0.5 ${isSoldier ? 'h-2.5 bg-stone-200' : 'h-1.5 bg-stone-400'} rotate-[-20deg]`}></div>
                    <div className={`absolute -top-1 right-0 w-0.5 ${isSoldier ? 'h-2.5 bg-stone-200' : 'h-1.5 bg-stone-400'} rotate-[20deg]`}></div>
                    
                    {/* Miner Helmet Effect */}
                    {isMiner && (
                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-gray-300 rounded-t-sm opacity-80"></div>
                    )}
                </div>

                {/* Thorax */}
                <div 
                    className={`${isSoldier ? 'w-5 h-6' : 'w-4 h-5'} rounded-full shadow-lg`}
                    style={{ background: bodyGradient }}
                ></div>

                {/* Abdomen */}
                <div 
                    className={`${isQueen ? 'w-8 h-10' : isSoldier ? 'w-6 h-8' : 'w-5 h-7'} rounded-full shadow-xl`}
                    style={{ background: bodyGradient }}
                >
                    {/* Abdomen Stripes */}
                    <div className="w-full h-[1px] bg-black/30 mt-2"></div>
                    <div className="w-full h-[1px] bg-black/30 mt-1"></div>
                </div>
            </div>

            {/* Queen Crown */}
            {isQueen && (
                <div className="absolute -top-4 z-20">
                     <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-yellow-300 drop-shadow-md"></div>
                </div>
            )}
        </div>
    );
}

const GridMap: React.FC<GridMapProps> = ({ grid, ants, zoom, pan }) => {
  return (
    <div 
      className="origin-top-left transition-transform duration-75 ease-out will-change-transform"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        width: GRID_WIDTH * CELL_SIZE_PX,
        height: GRID_HEIGHT * CELL_SIZE_PX,
      }}
    >
      {/* Grid Layer */}
      <div 
        className="grid absolute inset-0 shadow-2xl"
        style={{
            gridTemplateColumns: `repeat(${GRID_WIDTH}, ${CELL_SIZE_PX}px)`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, ${CELL_SIZE_PX}px)`,
        }}
      >
        {grid.map((row, y) => (
            row.map((cell, x) => (
                <div 
                    key={`${x}-${y}`} 
                    className="w-full h-full box-border"
                    data-x={x} // Store coords in DOM for smarter click handling in App
                    data-y={y}
                >
                    <CellIcon type={cell.type} yIndex={y} />
                </div>
            ))
        ))}
      </div>

      {/* Entity Layer */}
      {ants.map((ant) => (
        <div
            key={ant.id}
            className="absolute pointer-events-none transition-all duration-500 ease-linear flex items-center justify-center"
            style={{
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
                left: ant.position.x * CELL_SIZE_PX,
                top: ant.position.y * CELL_SIZE_PX,
                zIndex: 10
            }}
        >
            <Entity3D entity={ant} />
        </div>
      ))}
      
      <div className="absolute inset-0 border-4 border-black/50 pointer-events-none"></div>
    </div>
  );
};

export default memo(GridMap);
