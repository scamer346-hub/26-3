
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ChemicalElement, ChemicalNature } from '../types';
import { CATEGORY_STYLES, CATEGORY_HEX_COLORS } from '../constants';
import { generateApplicationDetailStream, speakElementName, stopSpeech } from '../services/geminiService';
import AtomVisualizer from './AtomVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for framer-motion type definitions
const MotionDiv = motion.div as any;

interface ElementDetailProps {
  element: ChemicalElement | null;
  onClose: () => void;
  isRateLimited: boolean;
  onRateLimit: () => void;
}

type TabType = 'general' | 'properties' | 'atomic';

// --- ICONS ---
const IconAtom: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/></svg>);
const IconElectronegativity: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
const ZoomIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "h-10 w-10 text-white"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>);
const HistoryIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);
const SourcesIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
const IconRuler: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L3 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0l12.3 12.3z"/><path d="m9.6 12.6 6 6"/><path d="m11 11-2 2"/><path d="m14 8-2 2"/><path d="m17 5-2 2"/></svg>);
const IconFlask: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v6l-4 9h2v2H7v-2h2l-4-9V3z"/></svg>);
const IconMagnet: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13a8 8 0 0 1 8-8v10a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V5a8 8 0 0 0-8-8"/><path d="M4 13v6a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-6"/></svg>);
const IconTrendingUp: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>);
const IconCpu: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>);
const IconZap: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>);
const IconScale: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"/><path d="m21 17.5-1.5-1.5"/><path d="M3 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"/><path d="m10 17.5-1.5-1.5"/><path d="M22 6c-2 0-3.5 1.5-3.5 2.5-1 0-2.5 1-2.5 2.5V15h8v-4c0-1.5-1.5-2.5-2.5-2.5Z"/><path d="M8 6c-2 0-3.5 1.5-3.5 2.5-1 0-2.5 1-2.5 2.5V15h8v-4c0-1.5-1.5-2.5-2.5-2.5Z"/><path d="M12 2v4"/><path d="m5 7 1-1"/><path d="m19 6 1 1"/></svg>);
const IconColumns: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="18" x="4" y="3" rx="2"/><rect width="6" height="18" x="14" y="3" rx="2"/></svg>);
const IconCalendarDays: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>);

const getApplicationMetadata = (application: string) => {
    const unifiedIcon = <IconZap className="w-5 h-5"/>;
    
    const unifiedStyle = {
        bg: "bg-gradient-to-br from-cyan-500/10 to-blue-600/10",
        border: "border-cyan-500/20",
        text: "text-cyan-200",
        hover: "group-hover:text-cyan-100",
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-400",
        icon: unifiedIcon
    };

    return unifiedStyle;
};

const formatFormula = (formula: string) => {
    if (!formula || formula === '-') return <span>-</span>;
    return (
        <span className="font-mono">
            {formula.split(/(\d+)/).map((part, i) =>
                /\d+/.test(part) ? <sub key={i} className="text-sm">{part}</sub> : <span key={i}>{part}</span>
            )}
        </span>
    );
};

const getNatureBadge = (nature: ChemicalNature) => {
    if (nature === 'Không xác định' || !nature) return null;
    let colorClasses = "";
    switch(nature) {
        case 'Acid': colorClasses = "bg-rose-500/20 text-rose-400 border-rose-500/30"; break;
        case 'Bazơ': colorClasses = "bg-blue-500/20 text-blue-400 border-blue-500/30"; break;
        case 'Lưỡng tính': colorClasses = "bg-violet-500/20 text-violet-400 border-violet-500/30"; break;
        case 'Trung tính': colorClasses = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"; break;
        default: colorClasses = "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorClasses} ml-2 uppercase`}>{nature}</span>;
};

const InfoSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-slate-800/40 rounded-2xl border border-white/5 overflow-hidden h-full flex flex-col hover:border-white/10 transition-colors">
        <div className="flex items-center gap-4 p-4 bg-slate-900/40 border-b border-white/5 shrink-0">
            <div className="text-cyan-400 shrink-0">{icon}</div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="p-4 text-slate-300 leading-relaxed text-sm flex-1">
            {children}
        </div>
    </div>
);

const GROUP_LABELS = [
  "IA", "IIA", "IIIB", "IVB", "VB", "VIB", "VIIB", "VIIIB", "VIIIB", "VIIIB", 
  "IB", "IIB", "IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"
];

const getGroupName = (groupNumber: number): string => {
    if (groupNumber === -1) {
        return 'Họ Lantan/Actini';
    }
    if (groupNumber >= 1 && groupNumber <= 18) {
        return GROUP_LABELS[groupNumber - 1];
    }
    return String(groupNumber); // Fallback
};

const StatCard: React.FC<{icon: React.ReactNode, label: string, value: React.ReactNode, valueClass?: string}> = ({icon, label, value, valueClass}) => (
    <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/5 transition-colors hover:bg-slate-800/80 hover:border-white/10">
        <div className="w-8 h-8 flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
        <div className="flex-1">
            <span className="text-[10px] text-slate-500 uppercase block leading-none">{label}</span>
            <span className={`text-lg font-bold text-white block leading-tight ${valueClass}`}>{value}</span>
        </div>
    </div>
);

const ChemicalPropertyCard: React.FC<{label: string, formula: string, nature: ChemicalNature}> = ({label, formula, nature}) => (
    <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 h-full">
        <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</span>
            {getNatureBadge(nature)}
        </div>
        <div className="mt-2 text-3xl font-black text-white text-shadow-sm">
            {formatFormula(formula)}
        </div>
    </div>
);

export const ElementDetail: React.FC<ElementDetailProps> = ({ element, onClose, isRateLimited, onRateLimit }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [validImages, setValidImages] = useState<{ url: string; caption: string; }[]>([]);
  const componentIsMounted = useRef(true);
  
  const [analyzingApplication, setAnalyzingApplication] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    componentIsMounted.current = true;
    return () => { componentIsMounted.current = false; };
  }, []);

  useEffect(() => {
    if (element) {
        setActiveTab('general');
        setIsLightboxOpen(false);
        setAnalyzingApplication(null);
        setAnalysisResult('');

        setValidImages([]);
        setCurrentImageIndex(0);
        setIsImageLoading(true);

        if (element.images && element.images.length > 0) {
            const imagePromises = element.images.map(img =>
                new Promise<{ url: string; caption: string; } | null>((resolve) => {
                    const image = new Image();
                    image.src = img.url;
                    image.onload = () => resolve(img);
                    image.onerror = () => resolve(null);
                })
            );

            Promise.all(imagePromises).then(results => {
                if (componentIsMounted.current) {
                    const loadedImages = results.filter((img): img is { url: string; caption: string; } => img !== null);
                    setValidImages(loadedImages);
                }
            });
        }
    }
  }, [element]);
  
  const handleAnalyzeApplication = useCallback(async (application: string) => {
    if (isAnalyzing) return;
    
    if (analyzingApplication === application) {
        setAnalyzingApplication(null);
        setAnalysisResult('');
        return;
    }
    
    setAnalyzingApplication(application);
    setAnalysisResult('');
    setIsAnalyzing(true);
    if (!isRateLimited) onRateLimit(); 
    
    try {
        await generateApplicationDetailStream(element.nameVi, application, (chunk) => {
            if (componentIsMounted.current) {
                setAnalysisResult(prev => prev + chunk);
            }
        });
    } catch (error) {
        console.error("Error analyzing application:", error);
        if (componentIsMounted.current) {
            setAnalysisResult("Đã có lỗi xảy ra khi phân tích. Vui lòng thử lại.");
        }
    } finally {
        if (componentIsMounted.current) {
            setIsAnalyzing(false);
        }
    }
  }, [element, isAnalyzing, isRateLimited, onRateLimit, analyzingApplication]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, onClose]);


  const handleSpeak = useCallback(async () => {
    if (isSpeaking || !element) return;
    setIsSpeaking(true);
    await speakElementName(element.name, () => setIsSpeaking(false));
  }, [element, isSpeaking]);

  if (!element) return null;
  const style = CATEGORY_STYLES[element.category];
  const themeColor = CATEGORY_HEX_COLORS[element.category];

  const hasImages = validImages.length > 0;
  const imageCount = validImages.length;
  
  const shells = useMemo(() => {
    const orbitals = [{n:1,c:2},{n:2,c:8},{n:3,c:18},{n:4,c:32},{n:5,c:32},{n:6,c:18},{n:7,c:8}];
    let rem = element.number; return orbitals.map(o => { const f = Math.min(rem, o.c); rem -= f; return f; }).filter(f => f > 0);
  }, [element]);

  const modalVariants = {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 200 } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
  };

  return (
    <AnimatePresence>
        {element && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6" role="dialog" aria-modal="true">
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg" 
                    onClick={onClose} 
                />
                <MotionDiv
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ 
                        boxShadow: `0 0 60px -15px ${themeColor}60`,
                    }}
                    className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-gradient-to-b from-slate-900 via-[#131d35] to-[#0F172A] border border-white/10"
                >
                    <header 
                        className="p-4 md:p-6 flex items-center justify-between shrink-0"
                        style={{ background: `linear-gradient(to bottom, ${themeColor}15, transparent)` }}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-col items-center justify-center border-2 ${style.borderColor} ${style.bgColor}`}>
                                <span className="text-xs font-bold opacity-60">{element.number}</span>
                                <span className={`text-2xl font-black ${style.textColor}`}>{element.symbol}</span>
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-3">
                                    {element.name}
                                    <button onClick={handleSpeak} disabled={isSpeaking} className="p-1 text-slate-500 hover:text-white disabled:opacity-50 disabled:cursor-wait">
                                        <IconAtom className={`w-5 h-5 ${isSpeaking ? 'animate-pulse text-cyan-400' : ''}`} />
                                    </button>
                                </h1>
                                <p className="text-slate-400 italic font-mono text-sm">{element.nameVi} (Tiếng Việt)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </header>

                    <div className="flex border-y border-white/5 bg-slate-900/40 shrink-0">
                        {(['general', 'properties', 'atomic'] as TabType[]).map((t) => (
                        <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-sm font-bold transition-all relative ${activeTab === t ? 'text-white' : 'text-slate-500 hover:text-slate-200'}`}>
                            {t === 'general' ? 'Tổng quan' : t === 'properties' ? 'Tính chất' : 'Cấu tạo'}
                            {activeTab === t && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" style={{boxShadow: '0 0 8px #22d3ee'}} layoutId="tab-underline" />}
                        </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                {hasImages ? (
                                        <div className="w-full md:w-56 shrink-0 space-y-3">
                                            <div
                                                onClick={() => setIsLightboxOpen(true)}
                                                className="relative w-full aspect-square bg-black/30 rounded-2xl overflow-hidden border border-white/5 group cursor-pointer"
                                            >
                                                {isImageLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 animate-pulse">
                                                    <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                                </div>
                                                )}
                                                <img
                                                key={validImages[currentImageIndex].url}
                                                src={validImages[currentImageIndex].url}
                                                alt={validImages[currentImageIndex].caption}
                                                className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                                onLoad={() => setIsImageLoading(false)}
                                                />
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <ZoomIcon />
                                                </div>
                                            </div>
                                            
                                            {imageCount > 1 && (
                                                <div className="flex items-center justify-center gap-2.5">
                                                    {validImages.map((img, index) => (
                                                        <button
                                                            key={img.url}
                                                            onClick={() => {
                                                                if (currentImageIndex !== index) {
                                                                    setCurrentImageIndex(index);
                                                                    setIsImageLoading(true);
                                                                }
                                                            }}
                                                            className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                                                                currentImageIndex === index
                                                                    ? 'border-cyan-400 scale-110 shadow-lg'
                                                                    : 'border-transparent hover:border-white/50 opacity-60 hover:opacity-100'
                                                            }`}
                                                            aria-label={`Xem ảnh ${index + 1}`}
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={img.caption}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                ) : (
                                        <div className="w-full md:w-56 shrink-0 aspect-square bg-black/30 rounded-2xl border border-white/5 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                        </div>
                                )}
                                <div className="flex-1 space-y-4">
                                    <p className="text-slate-200 leading-relaxed italic text-base">{element.description}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                        <StatCard icon={<IconScale className="w-5 h-5" />} label="Khối lượng (u)" value={element.weight} />
                                        <StatCard icon={<IconElectronegativity className="w-5 h-5" />} label="Độ âm điện" value={element.electronegativity || '-'} valueClass="text-teal-300" />
                                        <StatCard icon={<IconCalendarDays className="w-5 h-5" />} label="Chu kỳ" value={element.period} />
                                        <StatCard icon={<IconColumns className="w-5 h-5" />} label="Nhóm" value={getGroupName(element.group)} />
                                    </div>
                                </div>
                                </div>
                                
                                <div className="space-y-6 pt-6 border-t border-white/5">
                                    <InfoSection title="Lịch sử & Khám phá" icon={<HistoryIcon />}>{element.history}</InfoSection>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InfoSection title="Nguồn gốc trong tự nhiên" icon={<SourcesIcon />}>{element.sources}</InfoSection>
                                        <InfoSection title="Phương pháp điều chế" icon={<IconFlask className="w-6 h-6"/>}>{element.preparation}</InfoSection>
                                    </div>
                                </div>

                                {/* SECTION: APPLICATIONS */}
                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <IconZap className="w-6 h-6 text-amber-400" />
                                        <h3 className="text-lg font-bold text-white">Ứng dụng thực tiễn</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {element.applications.map((app, index) => {
                                            const meta = getApplicationMetadata(app);
                                            const isSelectedForAnalysis = analyzingApplication === app;
                                            return (
                                                <div key={index}>
                                                    <button 
                                                        onClick={() => handleAnalyzeApplication(app)} 
                                                        disabled={isAnalyzing && !isSelectedForAnalysis} 
                                                        className={`
                                                            p-4 rounded-2xl border text-left transition-all duration-300 group shadow-sm w-full
                                                            ${meta.bg} ${meta.border}
                                                            hover:scale-[1.02] hover:shadow-md hover:border-opacity-50
                                                            disabled:opacity-50 disabled:cursor-not-allowed
                                                            ${isSelectedForAnalysis ? 'scale-[1.02] shadow-md border-opacity-50' : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0 shadow-inner border border-white/10`}>
                                                                {meta.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={`font-bold text-sm block truncate ${meta.text} ${meta.hover} transition-colors`}>
                                                                    {app}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 group-hover:text-slate-300">Bấm để phân tích</span>
                                                            </div>
                                                            <div className={`transition-transform duration-300 text-slate-400 ${isSelectedForAnalysis ? 'rotate-90' : 'rotate-0'}`}>
                                                                <IconZap className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <AnimatePresence>
                                                        {isSelectedForAnalysis && (
                                                            <MotionDiv
                                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                animate={{ opacity: 1, height: 'auto', marginTop: '0.5rem' }}
                                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30 shadow-lg">
                                                                    {isAnalyzing && !analysisResult ? (
                                                                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs italic py-4">
                                                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                                                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></span>
                                                                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></span>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                                                            {analysisResult}
                                                                            {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse align-middle"></span>}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </MotionDiv>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'properties' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoSection title="Tính chất vật lý" icon={<IconRuler className="w-6 h-6"/>}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Nóng chảy</span>
                                            <p className="font-mono font-bold text-lg text-white mt-1">
                                                {element.meltingPoint !== '-' ? `${element.meltingPoint}°C` : '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sôi</span>
                                            <p className="font-mono font-bold text-lg text-white mt-1">
                                                {element.boilingPoint !== '-' ? `${element.boilingPoint}°C` : '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Mật độ</span>
                                            <p className="font-mono font-bold text-lg text-white mt-1">
                                                {element.density !== '-' ? <>{element.density}<span className="text-xs text-slate-400"> g/cm³</span></> : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="pt-4 border-t border-white/10">{element.physicalProperties}</p>
                                </div>
                            </InfoSection>
                            <InfoSection title="Tính chất hóa học" icon={<IconFlask className="w-6 h-6"/>}>{element.chemicalProperties}</InfoSection>
                            <InfoSection title="Tính kim loại/phi kim" icon={<IconMagnet className="w-6 h-6"/>}>{element.metallicProperty}</InfoSection>
                            <InfoSection title="Xu hướng biến đổi" icon={<IconTrendingUp className="w-6 h-6"/>}>{element.propertyTrends}</InfoSection>
                            <ChemicalPropertyCard label="Oxit cao nhất" formula={element.highestOxide} nature={element.highestOxideNature} />
                            <ChemicalPropertyCard label="Hydroxit tương ứng" formula={element.highestHydroxide} nature={element.highestHydroxideNature} />
                        </div>
                        )}

                        {activeTab === 'atomic' && (
                        <div className="space-y-8">
                            <section className="bg-cyan-500/5 p-6 rounded-3xl border border-cyan-500/20 shadow-inner">
                                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 text-center">Cấu hình electron</h4>
                                <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center break-all">
                                    <code className="text-xl md:text-2xl font-black text-cyan-300 tracking-wider font-mono">
                                        {element.electronConfiguration.split(' ').map((part, i) => (
                                            <span key={i} className="inline-block mx-1 transition-transform hover:scale-110 hover:text-white cursor-default">{part}</span>
                                        ))}
                                    </code>
                                </div>
                                
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {shells.map((count, i) => (
                                        <div key={i} className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-xs">
                                            <span className="text-slate-500 mr-2">Lớp {i+1}:</span><span className="font-bold text-white">{count}e</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            
                            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard icon={<IconAtom className="w-6 h-6" />} label="Số Proton (Z)" value={element.number} />
                                <StatCard icon={<IconCpu className="w-6 h-6" />} label="Số lớp electron" value={shells.length} valueClass="text-cyan-400" />
                                <StatCard icon={<IconZap className="w-6 h-6" />} label="e lớp ngoài cùng" value={shells[shells.length-1]} valueClass="text-amber-400" />
                            </section>

                            <section className="flex flex-col items-center">
                                <AtomVisualizer atomicNumber={element.number} symbol={element.symbol} category={element.category} className="h-[350px]" themeColor={themeColor} />
                            </section>
                        </div>
                        )}
                    </div>
                </MotionDiv>
            </div>
        )}
        
        {isLightboxOpen && hasImages && (
            <div 
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setIsLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            >
            <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                <div className="relative w-full max-h-[80vh] flex items-center justify-center">
                {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg animate-pulse">
                    <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                    </div>
                )}
                <img
                    key={validImages[currentImageIndex].url}
                    src={validImages[currentImageIndex].url}
                    alt={validImages[currentImageIndex].caption}
                    className={`block max-w-full max-h-[80vh] rounded-lg shadow-2xl transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsImageLoading(false)}
                />
                </div>

                <div className="w-full max-w-5xl text-center mt-4 text-white">
                <p className="text-sm font-semibold text-shadow-sm">{validImages[currentImageIndex].caption}</p>
                {imageCount > 1 && (
                    <div className="mt-2 flex justify-center gap-2">
                    {Array.from({ length: imageCount }).map((_, index) => (
                        <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }} className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`} />
                    ))}
                    </div>
                )}
                </div>

                {imageCount > 1 && (
                <>
                    <button onClick={(e) => {e.stopPropagation(); setIsImageLoading(true); setCurrentImageIndex(p => (p-1+imageCount)%imageCount)}} className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 rounded-full text-white transition-opacity duration-300 hover:bg-black/70">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); setIsImageLoading(true); setCurrentImageIndex(p => (p+1)%imageCount)}} className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 rounded-full text-white transition-opacity duration-300 hover:bg-black/70">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
                )}
                <button
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-4 right-4 p-2 text-white bg-black/30 rounded-full hover:bg-black/60 transition-colors z-20"
                aria-label="Đóng"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            </div>
        )}
    </AnimatePresence>
  );
};
