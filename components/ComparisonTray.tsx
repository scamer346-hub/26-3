

import React from 'react';
import { ChemicalElement } from '../types';
import { CATEGORY_HEX_COLORS, CATEGORY_STYLES } from '../constants';

interface ComparisonTrayProps {
  isActive: boolean;
  selectedElements: ChemicalElement[];
  onRemove: (element: ChemicalElement) => void;
  onCompare: () => void;
  onClose: () => void;
}

const ComparisonTray: React.FC<ComparisonTrayProps> = ({ isActive, selectedElements, onRemove, onCompare, onClose }) => {
  const canCompare = selectedElements.length >= 2;
  const maxItems = 4;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[60] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] px-2 sm:px-4 pb-4 md:pb-8 pointer-events-none ${
        isActive ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
      }`}
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="relative flex items-center gap-4 bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] p-2.5 ring-1 ring-white/10 overflow-hidden">
          
          {/* Decorative background glows */}
          <div className="absolute -left-20 -top-20 w-48 h-48 bg-amber-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-cyan-500/10 blur-[100px] pointer-events-none" />

          {/* Left: Indicator & Status */}
          <div className="hidden sm:flex flex-col items-center justify-center pl-4 pr-5 border-r border-white/10 h-14 shrink-0">
            <div className="relative mb-1">
                <span className={`flex h-2.5 w-2.5 rounded-full ${selectedElements.length > 0 ? 'bg-amber-400' : 'bg-slate-600'}`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedElements.length > 0 ? 'bg-amber-400' : 'bg-transparent'}`}></span>
                </span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">
                {selectedElements.length}<span className="text-slate-700 mx-0.5">/</span>{maxItems}
            </div>
          </div>

          {/* Middle: Selected Elements Scroll Area */}
          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {selectedElements.length > 0 ? (
              <div className="flex items-center gap-2.5 px-1">
                {selectedElements.map((el, index) => (
                  <div 
                    key={el.number} 
                    className="relative flex-shrink-0 animate-chat-in"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div 
                        className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group"
                        style={{ boxShadow: `0 8px 20px -6px ${CATEGORY_HEX_COLORS[el.category]}22` }}
                    >
                        <div 
                            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center text-[10px] font-black border-2 shadow-inner transition-transform group-hover:scale-105 ${CATEGORY_STYLES[el.category].borderColor} ${CATEGORY_STYLES[el.category].bgColor}`}
                        >
                            <span className="opacity-40 text-[7px] leading-none mb-0.5">{el.number}</span>
                            <span className={`${CATEGORY_STYLES[el.category].textColor} leading-none text-base`}>{el.symbol}</span>
                        </div>
                        <div className="flex flex-col min-w-[50px]">
                            <span className="text-xs font-bold text-white leading-tight">{el.name}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider opacity-60">
                                {CATEGORY_STYLES[el.category].label.split(' ')[0]}
                            </span>
                        </div>
                        <button 
                            onClick={() => onRemove(el)}
                            className="ml-1 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all active:scale-90"
                            aria-label={`Loại bỏ ${el.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                  </div>
                ))}
                
                {selectedElements.length < maxItems && (
                   <div className="flex-shrink-0 w-11 h-11 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center text-slate-700 bg-white/[0.02] animate-pulse">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-600 px-4 py-2 text-sm font-medium italic animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Hãy chọn ít nhất 2 nguyên tố để phân tích so sánh...
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/10 h-14 shrink-0">
            <button
              onClick={onCompare}
              disabled={!canCompare}
              className={`
                relative h-full px-4 sm:px-7 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 overflow-hidden group
                ${canCompare 
                    ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_10px_25px_-5px_rgba(34,211,238,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(34,211,238,0.6)] hover:-translate-y-1 active:translate-y-0 active:scale-95' 
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                }
              `}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                So sánh
                {canCompare && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                )}
              </span>
            </button>
            
            <button 
              onClick={onClose} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90"
              title="Đóng thanh so sánh"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ComparisonTray;
