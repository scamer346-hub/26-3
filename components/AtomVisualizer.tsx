
import React, { useState, useEffect } from 'react';
import { ElementCategory } from '../types';

interface AtomVisualizerProps {
  atomicNumber: number;
  symbol: string;
  category: ElementCategory;
  className?: string;
  activeShell?: number | null;
  themeColor?: string;
  interactive?: boolean;
  showLabels?: boolean;
  showSymbol?: boolean;
}

const SHELL_LABELS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

const AtomVisualizer: React.FC<AtomVisualizerProps> = ({ 
    atomicNumber, 
    symbol, 
    className, 
    activeShell = null,
    themeColor = '#34d399',
    interactive = true,
    showLabels = true,
    showSymbol = true
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredShell, setHoveredShell] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
     setMounted(true);
     return () => setMounted(false);
  }, []);

  // Calculate shells
  const getShells = (num: number) => {
    const orbitals = [
      { n: 1, cap: 2 }, { n: 2, cap: 2 }, { n: 2, cap: 6 }, { n: 3, cap: 2 },
      { n: 3, cap: 6 }, { n: 4, cap: 2 }, { n: 3, cap: 10 }, { n: 4, cap: 6 },
      { n: 5, cap: 2 }, { n: 4, cap: 10 }, { n: 5, cap: 6 }, { n: 6, cap: 2 },
      { n: 4, cap: 14 }, { n: 5, cap: 10 }, { n: 6, cap: 6 }, { n: 7, cap: 2 },
      { n: 5, cap: 14 }, { n: 6, cap: 10 }, { n: 7, cap: 6 },
    ];
    const counts: Record<number, number> = {};
    let remaining = num;
    for (const orb of orbitals) {
      if (remaining <= 0) break;
      const fill = Math.min(remaining, orb.cap);
      counts[orb.n] = (counts[orb.n] || 0) + fill;
      remaining -= fill;
    }
    const maxN = Math.max(...Object.keys(counts).map(Number));
    const result = [];
    for (let i = 1; i <= maxN; i++) {
      result.push(counts[i] || 0);
    }
    return result;
  };

  const shells = getShells(atomicNumber);

  // --- Dynamic Sizing Calculation ---
  const maxShellIndex = Math.max(0, shells.length - 1);
  const maxRadius = 65 + (maxShellIndex * 35);
  // Reduce padding if labels are hidden to make the atom fill more space
  const padding = showLabels ? 55 : 20; 
  const viewSize = (maxRadius + padding) * 2;
  const center = viewSize / 2;

  return (
    <div className={`relative flex flex-col items-center justify-center ${className || 'w-full'} select-none`}>
      
      {/* Main SVG Container */}
      <div className={`relative w-full h-full flex items-center justify-center transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            
            <style>{`
            @keyframes electron-orbit {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .orbit-group {
                transform-origin: center;
                transform-box: view-box;
                animation-name: electron-orbit;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                will-change: transform;
            }
            `}</style>

            <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
            <defs>
                <filter id="glow-visualizer" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Nucleus */}
            <g className="drop-shadow-2xl">
                 {/* Outer Glow */}
                 <circle cx={center} cy={center} r="35" fill={themeColor} fillOpacity="0.15" className="animate-pulse" />
                 <circle cx={center} cy={center} r="25" fill={themeColor} fillOpacity="0.3" />
                 
                 {/* Core */}
                 <circle cx={center} cy={center} r="20" fill={themeColor} />
                 
                 {/* Symbol */}
                 {showSymbol && (
                     <text 
                        x={center} 
                        y={center} 
                        dy="0.35em"
                        textAnchor="middle" 
                        fontSize="16" 
                        fontWeight="800" 
                        fill="#0f172a" 
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                        {symbol}
                    </text>
                 )}
            </g>

            {/* Electron Shells */}
            {shells.map((electronCount, index) => {
                const radius = 65 + (index * 35); 
                const duration = 5 + index * 3.5; 
                const label = SHELL_LABELS[index];
                
                // Interaction Logic
                const isHovered = (hoveredShell === index) || (activeShell === index);
                const anyHovered = (hoveredShell !== null) || (activeShell !== null);
                const isDimmed = anyHovered && !isHovered;
                
                // Active Colors
                const orbitStroke = isHovered ? themeColor : '#ffffff';
                const orbitOpacity = isHovered ? 0.8 : (isDimmed ? 0.05 : 0.15);
                const strokeWidth = isHovered ? 2 : 1;

                // Label Positioning
                const isRightSide = index % 2 === 0;
                const labelX = isRightSide ? center + radius : center - radius;
                
                const capWidth = 36;
                const capHeight = 18;
                const capX = labelX - (capWidth / 2);
                const capY = center - (capHeight / 2);

                return (
                <g 
                    key={index}
                    onMouseEnter={() => interactive && setHoveredShell(index)}
                    onMouseLeave={() => interactive && setHoveredShell(null)}
                    className={`${interactive ? 'cursor-pointer' : ''} transition-all duration-500`}
                    style={{ opacity: isDimmed ? 0.3 : 1 }}
                >
                    {/* Orbit Ring (Static) */}
                    <circle 
                        cx={center} 
                        cy={center} 
                        r={radius} 
                        fill="none" 
                        stroke={orbitStroke}
                        strokeWidth={strokeWidth}
                        strokeOpacity={orbitOpacity}
                        className="transition-all duration-300"
                    />

                    {/* Label Capsule (Static) */}
                    {showLabels && (
                        <g className="transition-transform duration-300 hover:scale-110 origin-center z-20">
                            <rect 
                                x={capX} 
                                y={capY} 
                                width={capWidth} 
                                height={capHeight} 
                                rx={capHeight/2}
                                fill="#0f172a"
                                stroke={isHovered ? themeColor : '#334155'}
                                strokeWidth="1"
                            />
                            <text 
                                x={labelX} 
                                y={center}
                                dy="0.35em"
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="700"
                                fill={isHovered ? themeColor : '#94a3b8'}
                                style={{ fontFamily: 'monospace' }}
                            >
                                {label}:{electronCount}
                            </text>
                        </g>
                    )}
                    
                    {/* Rotating Electron Group */}
                    <g 
                        className="orbit-group"
                        style={{ 
                            animationDuration: `${duration}s`,
                            animationPlayState: isPaused || (interactive && isHovered) ? 'paused' : 'running',
                            animationDirection: index % 2 === 0 ? 'normal' : 'reverse'
                        }}
                    >
                        {Array.from({ length: electronCount }).map((_, i) => {
                            const angle = (i * 360) / electronCount;
                            const rad = (angle * Math.PI) / 180;
                            const x = center + radius * Math.cos(rad);
                            const y = center + radius * Math.sin(rad);
                            
                            return (
                                <circle 
                                    key={i}
                                    cx={x} 
                                    cy={y} 
                                    r={isHovered ? 6 : 4} 
                                    fill={isHovered ? themeColor : "white"}
                                    filter={isHovered ? "url(#glow-visualizer)" : ""}
                                    className="transition-all duration-300"
                                />
                            );
                        })}
                    </g>
                </g>
                );
            })}
            </svg>

            {/* Pause Button */}
            {interactive && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsPaused(!isPaused);
                    }}
                    className="absolute bottom-4 right-0 p-3 rounded-full bg-slate-800/50 text-white hover:bg-slate-700/80 backdrop-blur-sm border border-white/10 transition-all hover:scale-110 z-20"
                    style={{ color: isPaused ? themeColor : 'white' }}
                >
                    {isPaused ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    )}
                </button>
            )}
      </div>
    </div>
  );
};

export default AtomVisualizer;
