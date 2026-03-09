
import React, { useState, useCallback, useEffect } from 'react';
import { ChemicalElement, ElementCategory } from './types';
import { CATEGORY_STYLES } from './constants';
import ElementCell from './components/ElementCell';
import { ElementDetail } from './components/ElementDetail';
import RangeCell from './components/RangeCell';
import ComparisonTray from './components/ComparisonTray';
import ComparisonModal from './components/ComparisonModal';
import BackgroundBlobs from './components/BackgroundBlobs';
import { stopSpeech, speakElementName } from './services/geminiService';
import NotificationToast from './components/NotificationToast';
import ChatBot from './components/ChatBot';
import SearchResults from './components/SearchResults';


const CompareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 4h3v16h-3"/><path d="M3 4h3v16H3"/><path d="M10.5 12H21"/><path d="M13.5 12H3"/>
    </svg>
);

const LogoIcon = () => (
    <div className="relative w-8 h-8 mx-auto mb-2 opacity-70">
        <svg viewBox="0 0 64 64" className="w-full h-full animate-[spin_20s_linear_infinite]">
            <defs>
                <linearGradient id="logoAtomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#67e8f9" /> {/* cyan-300 */}
                    <stop offset="50%" stopColor="#7dd3fc" /> {/* sky-300 */}
                    <stop offset="100%" stopColor="#bfdbfe" /> {/* blue-200 */}
                </linearGradient>
            </defs>
            {/* Orbits */}
            <ellipse cx="32" cy="32" rx="28" ry="12" stroke="url(#logoAtomGradient)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="32" cy="32" rx="28" ry="12" stroke="url(#logoAtomGradient)" strokeWidth="3" fill="none" strokeLinecap="round" transform="rotate(60 32 32)" />
            <ellipse cx="32" cy="32" rx="28" ry="12" stroke="url(#logoAtomGradient)" strokeWidth="3" fill="none" strokeLinecap="round" transform="rotate(120 32 32)" />
            {/* Nucleus */}
            <circle cx="32" cy="32" r="6" fill="url(#logoAtomGradient)" />
        </svg>
    </div>
);


const OfflineIndicator = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-4 z-[200] px-4 py-2 bg-rose-600/90 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        <span>Bạn đang ngoại tuyến. Các tính năng AI bị hạn chế.</span>
    </div>
);

const TableLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-96 animate-pulse">
        <LogoIcon />
        <p className="text-slate-400 mt-4 text-sm font-medium tracking-widest uppercase">Đang tải vũ trụ nguyên tử...</p>
    </div>
);


const App: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<ElementCategory | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [comparisonList, setComparisonList] = useState<ChemicalElement[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const MAX_COMPARE_ITEMS = 4;

  const [isGloballyRateLimited, setIsGloballyRateLimited] = useState(false);
  
  const [dataModule, setDataModule] = useState<typeof import('./data') | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChemicalElement[]>([]);

  useEffect(() => {
    import('./data').then(setDataModule);

    const handleOnline = () => {
        setIsOnline(true);
        setNotification("Đã kết nối lại mạng.");
    }
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1 && dataModule) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const results = dataModule.ELEMENTS.filter(el => 
        el.name.toLowerCase().includes(lowerCaseQuery) ||
        el.nameVi.toLowerCase().includes(lowerCaseQuery) ||
        el.symbol.toLowerCase() === lowerCaseQuery ||
        String(el.number) === lowerCaseQuery
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, dataModule]);

  const handleRateLimit = useCallback(() => {
    if (isGloballyRateLimited) return; 

    setIsGloballyRateLimited(true);
    setNotification("Thao tác quá nhanh, vui lòng chờ 5 giây.");
    setTimeout(() => setIsGloballyRateLimited(false), 5000); 
  }, [isGloballyRateLimited]);

  const selectForComparison = useCallback((element: ChemicalElement) => {
    setComparisonList(prevList => {
      const isAlreadyInList = prevList.some(item => item.number === element.number);
      if (isAlreadyInList) {
        return prevList.filter(item => item.number !== element.number);
      } else {
        if (prevList.length < MAX_COMPARE_ITEMS) {
          return [...prevList, element];
        } else {
          setNotification(`Bạn chỉ có thể so sánh tối đa ${MAX_COMPARE_ITEMS} nguyên tố.`);
          return prevList;
        }
      }
    });
  }, []);

  const viewElementDetails = useCallback((element: ChemicalElement) => {
    // Speak immediately when clicked
    speakElementName(element.name, () => {});
    setSelectedElement(element);
  }, []);

  const closeDetailModal = useCallback(() => {
    setSelectedElement(null);
    stopSpeech(); // Ensure any sound from the modal is stopped
  }, []);


  const handleSearchSelect = (element: ChemicalElement) => {
    setSearchQuery('');
    setSearchResults([]);
    viewElementDetails(element);
  };

  const handleCategoryClick = (category: ElementCategory) => {
    setActiveCategory(prev => prev === category ? null : category);
  };

  const toggleCompareMode = () => {
    setIsCompareMode(prev => !prev);
    setComparisonList([]); 
  };
  
  const CELL_WIDTH_CLASS = "w-[3.0rem] sm:w-[3.2rem] md:w-[4.5rem] lg:w-[5.2rem]";
  const PERIOD_LABEL_WIDTH = "w-12 md:w-14";
  
  const renderGroupLabels = () => {
    const GROUP_LABELS = [
      "IA", "IIA", "IIIB", "IVB", "VB", "VIB", "VIIB", "VIIIB", "VIIIB", "VIIIB", "IB", "IIB", "IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"
    ];
    
    return (
      <div className="flex gap-1 mb-2 relative">
         <div className={`${PERIOD_LABEL_WIDTH} shrink-0`}></div>
         {GROUP_LABELS.map((label, i) => (
           <div key={i} className={`${CELL_WIDTH_CLASS} text-center flex items-end justify-center pb-2`}>
             <span className="text-[8px] md:text-[10px] font-bold text-white/30 select-none tracking-widest">{label}</span>
           </div>
         ))}
      </div>
    );
  };

  const renderMainGrid = () => {
    if (!dataModule) return [];
    const { getElementByPosition } = dataModule;
    const rows = [];
    const elementClickHandler = isCompareMode ? selectForComparison : viewElementDetails;
    for (let r = 1; r <= 7; r++) {
      const cells = [];
      cells.push(
        <div key={`p-${r}`} className={`${PERIOD_LABEL_WIDTH} flex items-center justify-center shrink-0`}>
          <div className="text-center">
            <div className="text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-wider">Chu kỳ</div>
            <div className="text-lg md:text-xl font-bold font-mono text-white/50 -mt-1">{r}</div>
          </div>
        </div>
      );
      for (let c = 1; c <= 18; c++) {
        const element = getElementByPosition(r, c);
        const isDimmed = (activeCategory !== null && element?.category !== activeCategory) || (searchQuery.length > 1 && !searchResults.some(r => r.number === element?.number));
        const isComparing = comparisonList.some(item => item.number === element?.number);
        cells.push(
          <ElementCell 
            key={`${r}-${c}`} 
            element={element} 
            onClick={elementClickHandler}
            isActive={selectedElement?.number === element?.number}
            isDimmed={isDimmed}
            isComparing={isComparing}
          />
        );
      }
      rows.push(<div key={r} className="flex gap-1 mb-1">{cells}</div>);
    }
    return rows;
  };

  const renderRareEarthGrid = () => {
    if (!dataModule) return [];
    const { getElementByPosition } = dataModule;
    const rows = [];
    const elementClickHandler = isCompareMode ? selectForComparison : viewElementDetails;
    const series = [
        { rowData: 9, label: "Họ Lantan", sublabel: "58-71" },
        { rowData: 10, label: "Họ Actini", sublabel: "90-103" }
    ];
    series.forEach((s) => {
        const cells = [];
        cells.push(<div key={`spacer-p-${s.rowData}`} className={`${PERIOD_LABEL_WIDTH} shrink-0`}></div>);
        cells.push(<div key={`gap-1-${s.rowData}`} className={CELL_WIDTH_CLASS}></div>);
        cells.push(<div key={`gap-2-${s.rowData}`} className={CELL_WIDTH_CLASS}></div>);
        
        // Add a label cell for Group 3 equivalent position
        cells.push(<RangeCell key={`range-label-${s.rowData}`} label={s.label} sublabel={s.sublabel} />);

        for (let c = 4; c <= 17; c++) { // Loop starts from 4, as 3 is the label
             const element = getElementByPosition(s.rowData, c);
             const isDimmed = (activeCategory !== null && element?.category !== activeCategory) || (searchQuery.length > 1 && !searchResults.some(r => r.number === element?.number));
             const isComparing = comparisonList.some(item => item.number === element?.number);
             cells.push(
                <ElementCell 
                    key={`re-${s.rowData}-${c}`} 
                    element={element} 
                    onClick={elementClickHandler}
                    isActive={selectedElement?.number === element?.number}
                    isDimmed={isDimmed}
                    isComparing={isComparing}
                />
             );
        }
        rows.push(<div key={s.rowData} className="flex gap-1 mb-1">{cells}</div>);
    });
    return rows;
  };

  return (
    <div className="min-h-screen text-slate-200 overflow-x-hidden relative flex flex-col font-sans">
      <BackgroundBlobs userType="Học sinh" />
      <header className="pt-8 pb-4 md:pt-10 md:pb-6 text-center relative z-10 px-4">
        <div className="inline-block relative">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]">
              BẢNG TUẦN HOÀN
            </h1>
            <div className="absolute -top-4 -right-4 md:-right-8 w-8 h-8 md:w-12 md:h-12 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-500/50 rounded-full blur-md" />
        </div>
        <p className="text-slate-400 text-xs md:text-sm font-medium tracking-[0.2em] uppercase mt-2 opacity-80">
          Khám phá vũ trụ nguyên tử
        </p>
        <div className="mt-4 max-w-md mx-auto relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, ký hiệu, số hiệu..."
            className="w-full px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          />
          {searchResults.length > 0 && (
            <SearchResults results={searchResults} onSelect={handleSearchSelect} />
          )}
        </div>
      </header>
      
      <main className="flex-1 w-full pb-8 relative z-10 flex flex-col">
        <div className="w-full max-w-4xl mx-auto mb-6 px-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
                <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar snap-x">
                        <p className="flex-shrink-0 text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">Lọc:</p>
                        {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
                            const categoryKey = key as ElementCategory;
                            const isActive = activeCategory === categoryKey;
                            const isDimmed = activeCategory !== null && !isActive;

                            let buttonStateClasses = '';
                            if (isActive) {
                                buttonStateClasses = 'shadow-md opacity-100';
                            } else if (isDimmed) {
                                buttonStateClasses = 'opacity-40 hover:opacity-100';
                            } else {
                                buttonStateClasses = 'opacity-70 hover:opacity-100 hover:shadow-md';
                            }

                            return (
                                <button 
                                    key={key}
                                    onClick={() => handleCategoryClick(categoryKey)}
                                    className={`
                                        px-3 py-1.5 rounded-lg border-2 text-xs font-bold whitespace-nowrap snap-start
                                        transition-all duration-300 ease-in-out
                                        ${style.bgColor} ${style.textColor} ${style.borderColor.replace('border-','border-')}
                                        ${buttonStateClasses}
                                    `}
                                >
                                    {style.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-slate-900/40 pointer-events-none" />
                </div>
                
                <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                     <button
                        onClick={toggleCompareMode}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300
                            ${isCompareMode 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-slate-800/50 text-slate-300 border border-transparent hover:bg-slate-700/50'
                            }`}
                    >
                        <CompareIcon />
                        So sánh
                    </button>
                </div>
            </div>
        </div>
        
        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
            <div className="flex flex-col items-center min-w-max mx-auto px-2 md:px-4">
                 <div className="relative py-4"> 
                    {renderGroupLabels()}
                    {dataModule ? (
                        <>
                            {renderMainGrid()}
                            <div className="h-4"></div>
                            {renderRareEarthGrid()}
                        </>
                    ) : (
                        <TableLoader />
                    )}
                </div>
            </div>
        </div>
      </main>
      
      <footer className="w-full text-center p-4 mt-4 md:mt-8 relative z-10">
          <LogoIcon />
          <h2 className="text-sm font-sans font-bold tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-200 opacity-70">
            Bảng Tuần Hoàn Thông Minh THPT Số 2 Phù Mỹ
          </h2>
      </footer>

      {selectedElement && (
        <ElementDetail 
          element={selectedElement} 
          onClose={closeDetailModal} 
          isRateLimited={isGloballyRateLimited}
          onRateLimit={handleRateLimit}
        />
      )}
      
      <ChatBot />

      <ComparisonTray 
        isActive={isCompareMode}
        selectedElements={comparisonList}
        onRemove={selectForComparison}
        onCompare={() => setIsComparisonModalOpen(true)}
        onClose={toggleCompareMode}
      />
      
      {isComparisonModalOpen && (
        <ComparisonModal 
            elements={comparisonList}
            onClose={() => setIsComparisonModalOpen(false)}
            isOnline={isOnline}
        />
      )}
      
      {notification && (
        <NotificationToast 
            message={notification}
            onClose={() => setNotification(null)}
        />
      )}

      {!isOnline && <OfflineIndicator />}
    </div>
  );
};

export default App;
