




import React, { useMemo, useState } from 'react';
import { ChemicalElement } from '../types';
import { CATEGORY_STYLES, CATEGORY_HEX_COLORS } from '../constants';
import { 
    generateComparisonSummaryStream, 
    findCommonCompoundsStream,
    generateTrendsAnalysisStream,
    generateReactivityAnalysisStream,
    generateIndustrialAnalysisStream
} from '../services/geminiService';
import AIIcon from './AIIcon';

interface ComparisonModalProps {
  elements: ChemicalElement[];
  onClose: () => void;
  isOnline: boolean;
}

const parseNumericValue = (value: string | number): number | null => {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  if (typeof value === 'number') { return value; }
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
};

type ComparableKeys = 'number' | 'weight' | 'density' | 'meltingPoint' | 'boilingPoint' | 'electronegativity';

const numericProperties: { key: ComparableKeys; label: string; unit: string }[] = [ { key: 'number', label: 'Số hiệu nguyên tử', unit: '' }, { key: 'weight', label: 'Khối lượng nguyên tử', unit: 'u' }, { key: 'electronegativity', label: 'Độ âm điện', unit: '' }, { key: 'meltingPoint', label: 'Nóng chảy', unit: '°C' }, { key: 'boilingPoint', label: 'Sôi', unit: '°C' }, { key: 'density', label: 'Mật độ', unit: 'g/cm³'}, ];
const descriptiveProperties: {key: keyof ChemicalElement, label: string}[] = [ { key: 'category', label: 'Phân loại' }, { key: 'period', label: 'Chu kỳ' }, { key: 'group', label: 'Nhóm' }, { key: 'electronConfiguration', label: 'Cấu hình e' }, ];
const allProperties = [...descriptiveProperties, ...numericProperties];

const CategoryBadge: React.FC<{ category: ChemicalElement['category'] }> = ({ category }) => { const style = CATEGORY_STYLES[category]; return <span className={`px-2 py-1 rounded-md text-xs font-bold ${style.bgColor} ${style.borderColor.replace('border-','border-2 ')} ${style.textColor}`}>{style.label}</span> }
const SortIcon: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => { if (!direction) return <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>; if (direction === 'ascending') return <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>; return <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>; }
const IconSparkles: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75l.5 1.5a.75.75 0 001.5 0l.5-1.5a.75.75 0 011.5 0l.5 1.5a.75.75 0 001.5 0l.5-1.5a.75.75 0 011.5 0l.5 1.5a.75.75 0 001.5 0l.5-1.5a.75.75 0 011.432.449l-5.364 16.094a.75.75 0 01-1.432-.449L12.75 6.44l-2.063 6.187a.75.75 0 01-1.432-.449L10.5 6.44 8.437 12.625a.75.75 0 01-1.432-.449L9 6.44l-2.063 6.187a.75.75 0 01-1.432-.449L7.5 6.44 5.437 12.625a.75.75 0 01-1.432-.449L6 6.44 3.937 12.625a.75.75 0 01-1.432-.449L4.5 6.44 2.437 12.625a.75.75 0 11-1.432-.449L6.364 2.094A.75.75 0 017.5 2.25l.5 1.5a.75.75 0 001.5 0l.5-1.5z" clipRule="evenodd" /></svg>);
const IconTrendingUp: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>);
const IconFlaskConical: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10v10h4v-10"/><path d="M10 10l-2-8h8l-2 8"/><path d="M6 20h12"/></svg>);
const IconFactory: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>);


const MarkdownRenderer: React.FC<{ text: string, headingColor: string }> = ({ text, headingColor }) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraphLines: string[] = [];

    const flushParagraph = () => {
        if (currentParagraphLines.length > 0) {
            const content = currentParagraphLines.join(' ');
            elements.push(
                <p key={`p-${elements.length}`} className="mb-3 last:mb-0">
                    {content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                        part.startsWith('**') ? <strong key={i} className="text-white">{part.slice(2, -2)}</strong> : part
                    )}
                </p>
            );
            currentParagraphLines = [];
        }
    };

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('### ')) {
            flushParagraph(); // Flush any preceding paragraph
            elements.push(
                <h3 key={`h-${index}`} className={`text-base font-bold ${headingColor} mt-4 mb-2`}>
                    {trimmedLine.substring(4)}
                </h3>
            );
        } else if (trimmedLine === '') {
            flushParagraph(); // An empty line signifies a paragraph break
        } else {
            currentParagraphLines.push(trimmedLine); // Add line to current paragraph
        }
    });

    flushParagraph(); // Flush the last paragraph if it exists

    return <>{elements.length > 0 ? elements : null}</>;
};

const ComparisonModal: React.FC<ComparisonModalProps> = ({ elements, onClose, isOnline }) => {
  if (elements.length === 0) return null;
  
  const [sortConfig, setSortConfig] = useState<{ key: ComparableKeys | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });
  
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [compounds, setCompounds] = useState('');
  const [isCompoundsLoading, setIsCompoundsLoading] = useState(false);
  const [trendsAnalysis, setTrendsAnalysis] = useState('');
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [reactivityAnalysis, setReactivityAnalysis] = useState('');
  const [isReactivityLoading, setIsReactivityLoading] = useState(false);
  const [industrialAnalysis, setIndustrialAnalysis] = useState('');
  const [isIndustrialLoading, setIsIndustrialLoading] = useState(false);

  const sortedElements = useMemo(() => {
    let sortableElements = [...elements];
    if (sortConfig.key) {
      sortableElements.sort((a, b) => {
        const valA = parseNumericValue(a[sortConfig.key!]); const valB = parseNumericValue(b[sortConfig.key!]);
        if (valA === null) return 1; if (valB === null) return -1;
        if (valA < valB) { return sortConfig.direction === 'ascending' ? -1 : 1; }
        if (valA > valB) { return sortConfig.direction === 'ascending' ? 1 : -1; }
        return 0;
      });
    }
    return sortableElements;
  }, [elements, sortConfig]);

  const requestSort = (key: ComparableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    setSortConfig({ key, direction });
  };

  const isAnyLoading = isAiLoading || isCompoundsLoading || isTrendsLoading || isReactivityLoading || isIndustrialLoading;
  
  const handleAiAnalysis = async () => {
    setIsAiLoading(true); setAiSummary('');
    try { await generateComparisonSummaryStream(sortedElements, (chunk) => setAiSummary(prev => prev + chunk)); } 
    finally { setIsAiLoading(false); }
  };
  
  const handleFindCompounds = async () => {
    setIsCompoundsLoading(true); setCompounds('');
    try { await findCommonCompoundsStream(elements, (chunk) => setCompounds(prev => prev + chunk)); }
    finally { setIsCompoundsLoading(false); }
  };
  
  const handleTrendsAnalysis = async () => {
    setIsTrendsLoading(true); setTrendsAnalysis('');
    try { await generateTrendsAnalysisStream(elements, (chunk) => setTrendsAnalysis(prev => prev + chunk)); } 
    finally { setIsTrendsLoading(false); }
  };
  
  const handleReactivityAnalysis = async () => {
    setIsReactivityLoading(true); setReactivityAnalysis('');
    try { await generateReactivityAnalysisStream(elements, (chunk) => setReactivityAnalysis(prev => prev + chunk)); } 
    finally { setIsReactivityLoading(false); }
  };
  
  const handleIndustrialAnalysis = async () => {
    setIsIndustrialLoading(true); setIndustrialAnalysis('');
    try { await generateIndustrialAnalysisStream(elements, (chunk) => setIndustrialAnalysis(prev => prev + chunk)); } 
    finally { setIsIndustrialLoading(false); }
  };

  const comparisonData = useMemo(() => {
    return numericProperties.map(prop => {
      const values = sortedElements.map(el => parseNumericValue(el[prop.key]));
      const validValues = values.filter((v): v is number => v !== null);
      let minValue: number | null = null, maxValue: number | null = null;
      if (validValues.length > 0) { minValue = Math.min(...validValues); maxValue = Math.max(...validValues); }
      return { ...prop, minValue, maxValue };
    });
  }, [sortedElements]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" />
      <div 
        className="relative w-full max-w-7xl max-h-[90vh] bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#0f172a_70%)] rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/5 animate-modal-in flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <h2 className="text-lg font-bold text-white">So sánh các nguyên tố</h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
                 <button onClick={handleTrendsAnalysis} disabled={isAnyLoading || !isOnline} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <IconTrendingUp className="w-4 h-4" /> Xu hướng</button>
                 <button onClick={handleReactivityAnalysis} disabled={isAnyLoading || !isOnline} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <IconFlaskConical className="w-4 h-4" /> Phản ứng</button>
                 <button onClick={handleIndustrialAnalysis} disabled={isAnyLoading || !isOnline} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <IconFactory className="w-4 h-4" /> Công nghiệp</button>
                 <div className="w-px h-6 bg-white/10 mx-1"></div>
                 <button onClick={handleFindCompounds} disabled={isAnyLoading || elements.length < 2 || !isOnline} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <IconSparkles className="w-4 h-4" /> Hợp chất </button>
                 <button onClick={handleAiAnalysis} disabled={isAnyLoading || !isOnline} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"> <AIIcon className="w-4 h-4" /> Phân tích chung </button>
                 <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2" aria-label="Đóng"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="grid gap-px" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${elements.length}, minmax(140px, 1fr))` }}>
            <div className="sticky top-0 left-0 p-3 bg-slate-900/80 backdrop-blur-sm z-30 font-bold text-slate-400 text-xs uppercase tracking-wider">Thuộc tính</div>
            {sortedElements.map(el => (
              <div key={el.number} className="sticky top-0 p-3 bg-slate-900/80 backdrop-blur-sm z-10 text-center flex flex-col items-center gap-1" style={{ borderBottom: `3px solid ${CATEGORY_HEX_COLORS[el.category]}` }}>
                <span className={`text-2xl font-black ${CATEGORY_STYLES[el.category].textColor}`}>{el.symbol}</span>
                <span className="text-xs font-bold text-white">{el.name}</span>
              </div>
            ))}

            {allProperties.map((prop, propIndex) => {
              const isNumeric = 'unit' in prop;
              const numericPropData = isNumeric ? comparisonData.find(p => p.key === prop.key) : undefined;
              const rowBgClass = propIndex % 2 === 0 ? 'bg-slate-800/60' : 'bg-slate-800/40';

              return (
                <React.Fragment key={prop.key}>
                  <div className={`sticky left-0 p-3 text-slate-400 text-sm font-medium flex items-center justify-between group z-20 ${rowBgClass} ${isNumeric ? 'cursor-pointer hover:bg-slate-700/40' : ''}`} onClick={() => isNumeric && requestSort(prop.key as ComparableKeys)}>
                    <div><span>{prop.label}</span>{isNumeric && (prop as any).unit && <span className="text-slate-500 text-xs ml-1.5">({(prop as any).unit})</span>}</div>
                    <div className="flex items-center gap-2">
                        {isNumeric && <SortIcon direction={sortConfig.key === prop.key ? sortConfig.direction : undefined} />}
                    </div>
                  </div>
                  {sortedElements.map((el) => {
                    if (isNumeric && numericPropData) {
                      const rawValue = el[prop.key as ComparableKeys] || '-'; const numericValue = parseNumericValue(el[prop.key as ComparableKeys]); const { minValue, maxValue } = numericPropData; const isMin = minValue !== null && numericValue === minValue && minValue !== maxValue; const isMax = maxValue !== null && numericValue === maxValue && minValue !== maxValue; const range = (maxValue !== null && minValue !== null) ? maxValue - minValue : 0; const barWidth = range > 0 && numericValue !== null && minValue !== null ? Math.max(0, Math.min(100, ((numericValue - minValue) / range) * 100)) : (numericValue !== null ? 100 : 0);
                      let textClass = 'text-slate-200'; if (isMax) textClass = 'text-emerald-300 font-bold text-shadow-glow'; if (isMin) textClass = 'text-rose-400 font-bold';
                      return (<div key={`${el.number}-${prop.key}`} className={`p-3 text-center flex items-center justify-center relative transition-colors duration-300 ${rowBgClass}`}><div className="absolute left-0 top-0 bottom-0 opacity-50" style={{ width: `${barWidth}%`, backgroundColor: CATEGORY_HEX_COLORS[el.category], transition: 'width 0.5s ease-out' }} /><span className={`relative text-sm md:text-base font-mono z-10 text-shadow-sm ${textClass}`}>{String(rawValue)}</span></div>);
                    } else {
                      const value = el[prop.key as keyof ChemicalElement];
                      return (<div key={`${el.number}-${prop.key}`} className={`p-3 text-center flex items-center justify-center text-slate-300 text-sm ${rowBgClass}`}>{prop.key === 'category' ? <CategoryBadge category={value as any}/> : <span className={prop.key === 'electronConfiguration' ? 'font-mono text-xs' : ''}>{String(value)}</span>}</div>);
                    }
                  })}
                </React.Fragment>
              );
            })}
          </div>
          
            {(isTrendsLoading || trendsAnalysis) && (
              <div className="p-4 md:p-6 mt-2">
                <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-3"><IconTrendingUp className="w-4 h-4" />Phân Tích Xu Hướng</h3>
                    <div className="prose prose-sm prose-invert text-slate-300 max-w-none prose-strong:text-white">
                        {isTrendsLoading && !trendsAnalysis && <p className="animate-pulse">AI đang phân tích xu hướng...</p>}
                        <MarkdownRenderer text={trendsAnalysis} headingColor="text-emerald-300" />
                        {isTrendsLoading && trendsAnalysis && <span className="inline-block w-2 h-4 bg-emerald-300 ml-1 animate-bounce"></span>}
                    </div>
                </div>
              </div>
            )}
            
            {(isReactivityLoading || reactivityAnalysis) && (
              <div className="p-4 md:p-6 mt-2">
                <div className="bg-slate-900/50 border border-rose-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2 mb-3"><IconFlaskConical className="w-4 h-4" />Phân Tích Phản Ứng</h3>
                    <div className="prose prose-sm prose-invert text-slate-300 max-w-none prose-strong:text-white">
                        {isReactivityLoading && !reactivityAnalysis && <p className="animate-pulse">AI đang phân tích khả năng phản ứng...</p>}
                        <MarkdownRenderer text={reactivityAnalysis} headingColor="text-rose-300" />
                        {isReactivityLoading && reactivityAnalysis && <span className="inline-block w-2 h-4 bg-rose-300 ml-1 animate-bounce"></span>}
                    </div>
                </div>
              </div>
            )}

            {(isIndustrialLoading || industrialAnalysis) && (
              <div className="p-4 md:p-6 mt-2">
                <div className="bg-slate-900/50 border border-sky-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2 mb-3"><IconFactory className="w-4 h-4" />Phân Tích Công Nghiệp</h3>
                    <div className="prose prose-sm prose-invert text-slate-300 max-w-none prose-strong:text-white">
                        {isIndustrialLoading && !industrialAnalysis && <p className="animate-pulse">AI đang phân tích giá trị công nghiệp...</p>}
                        <MarkdownRenderer text={industrialAnalysis} headingColor="text-sky-300" />
                        {isIndustrialLoading && industrialAnalysis && <span className="inline-block w-2 h-4 bg-sky-300 ml-1 animate-bounce"></span>}
                    </div>
                </div>
              </div>
            )}
          
          {(isCompoundsLoading || compounds) && (
              <div className="p-4 md:p-6 mt-2">
                <div className="bg-slate-900/50 border border-violet-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2 mb-3"> <IconSparkles className="w-4 h-4" /> Hợp chất phổ biến </h3>
                    <div className="prose prose-sm prose-invert text-slate-300 max-w-none prose-strong:text-white">
                        {isCompoundsLoading && !compounds && <p className="animate-pulse">AI đang tìm kiếm hợp chất...</p>}
                        <MarkdownRenderer text={compounds} headingColor="text-violet-300" />
                        {isCompoundsLoading && compounds && <span className="inline-block w-2 h-4 bg-violet-300 ml-1 animate-bounce"></span>}
                    </div>
                </div>
              </div>
          )}

          {(isAiLoading || aiSummary) && (
              <div className="p-4 md:p-6 mt-2">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 mb-3"> <AIIcon className="w-4 h-4" /> Phân tích chung từ AI </h3>
                    <div className="prose prose-sm prose-invert text-slate-300 max-w-none prose-headings:text-cyan-300 prose-strong:text-white">
                        {isAiLoading && !aiSummary && <p className="animate-pulse">AI đang phân tích, vui lòng chờ trong giây lát...</p>}
                        <MarkdownRenderer text={aiSummary} headingColor="text-cyan-300" />
                        {isAiLoading && aiSummary && <span className="inline-block w-2 h-4 bg-cyan-300 ml-1 animate-bounce"></span>}
                    </div>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;