
import React from 'react';
import { ChemicalElement } from '../types';
import { CATEGORY_STYLES, CATEGORY_HEX_COLORS } from '../constants';

interface ElementCellProps {
  element: ChemicalElement | undefined;
  onClick: (element: ChemicalElement) => void;
  isActive: boolean;
  isDimmed?: boolean;
  isComparing?: boolean; 
}

// Minimalist phase icons
const PhaseIcon = ({ number, melting, boiling }: { number: number, melting?: string, boiling?: string }) => {
    const roomTemp = 25;
    const melt = melting ? parseFloat(melting) : null;
    const boil = boiling ? parseFloat(boiling) : null;

    let type = 'solid';
    
    if (number === 80 || number === 35) type = 'liquid';
    else if (number === 112) type = 'liquid';
    else if (melt !== null && boil !== null) {
        if (boil < roomTemp) type = 'gas';
        else if (melt < roomTemp && boil > roomTemp) type = 'liquid';
    } else if (number === 118) type = 'gas';

    if (type === 'gas') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white/50 drop-shadow-md mt-0.5">
                 <circle cx="12" cy="12" r="4" />
                 <circle cx="20" cy="5" r="2" />
                 <circle cx="4" cy="19" r="2" />
            </svg>
        );
    }
    if (type === 'liquid') {
         return (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-blue-200/60 drop-shadow-md mt-0.5">
                <path d="M12 21.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/>
                <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 3s-4-1-4-3a4 4 0 0 1 4-4z"/>
            </svg>
        );
    }
    return <div className="h-[11px] mt-0.5" />; // Placeholder to maintain layout
};

const ElementCell: React.FC<ElementCellProps> = React.memo(({ element, onClick, isActive, isDimmed = false, isComparing = false }) => {
  if (!element) {
    return (
      <div className="
        w-[3.0rem] h-[3.8rem] 
        sm:w-[3.2rem] sm:h-[4.0rem]
        md:w-[4.5rem] md:h-[5.4rem] 
        lg:w-[5.2rem] lg:h-[6.2rem] 
        pointer-events-none opacity-0" 
      />
    );
  }

  const style = CATEGORY_STYLES[element.category];
  const themeColor = CATEGORY_HEX_COLORS[element.category];

  const activeStyle = isActive ? {
    borderColor: themeColor,
    boxShadow: `0 0 30px ${themeColor}99`,
  } : {};
  
  const compareStyle = isComparing ? 'ring-4 ring-amber-400 ring-inset shadow-lg shadow-amber-500/30' : '';

  const handleMouseEnter = () => {
    if (element?.images && element.images.length > 0) {
      element.images.forEach(image => {
        const img = new Image();
        img.src = image.url;
      });
    }
  };

  const name = element.name;
  const nameLength = name.length;
  let nameClass = 'text-[7px] md:text-[9px]';
  if (nameLength > 10) {
      nameClass = 'text-[6px] md:text-[8px]';
  } else if (nameLength > 8) {
      nameClass = 'text-[7px] md:text-[8px]';
  }
  
  return (
    <button
      onClick={() => onClick(element)}
      onMouseEnter={handleMouseEnter}
      disabled={isDimmed}
      style={activeStyle}
      className={`
        group relative flex flex-col
        w-[3.0rem] h-[3.8rem] sm:w-[3.2rem] sm:h-[4.0rem] md:w-[4.5rem] md:h-[5.4rem] lg:w-[5.2rem] lg:h-[6.2rem]
        p-0 rounded-lg md:rounded-xl border
        transition-all duration-300 ease-out
        overflow-hidden cursor-pointer
        shadow-lg backdrop-blur-md
        ${isDimmed 
            ? 'opacity-30 grayscale' 
            : `${isActive 
                ? `z-50 scale-110 shadow-2xl` 
                : `${compareStyle} hover:z-40 hover:scale-110 hover:shadow-2xl`
            } 
            ${style.bgColor} ${style.borderColor}`
        }
      `}
    >
      {/* GLOW EFFECT */}
      {!isDimmed && !isActive && (
        <div 
          className="absolute inset-[-100%] transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:inset-[-50%] animate-[spin-reverse_6s_linear_infinite]"
          style={{ background: `radial-gradient(circle at center, ${themeColor}20, transparent 40%)` }}
        />
      )}

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-0.5 md:p-1">
        <div className="flex justify-between items-start w-full text-[7px] md:text-[9px] font-bold">
            <span className="opacity-60">{element.number}</span>
            <div className="flex flex-col items-end">
                <span className="font-mono text-teal-400">{element.electronegativity || '-'}</span>
                <PhaseIcon number={element.number} melting={element.meltingPoint} boiling={element.boilingPoint} />
            </div>
        </div>
        <div className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black ${style.textColor} leading-none text-shadow-sm`}>
            {element.symbol}
        </div>
        <div className="text-center w-full pb-1">
            <div className={`${nameClass} font-bold text-white leading-tight px-0.5`}>
            {element.name}
            </div>
        </div>
      </div>
    </button>
  );
});

export default ElementCell;
