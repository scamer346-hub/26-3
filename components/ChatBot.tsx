
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, BrainCircuit, BookOpen, FlaskConical, Lightbulb, ArrowRight, ClipboardList, Mic, MicOff, GraduationCap, School, ScrollText, PenTool, Calculator, FileQuestion, Volume2, Square, ArrowDown, LayoutGrid, ChevronLeft, Paperclip, FileText, ImageIcon, Trash2, Link as LinkIcon, ExternalLink, Zap, Timer, CheckCircle2, Settings2, ChevronDown, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createChatSession, speakVietnamese, stopSpeech, pauseSpeech, resumeSpeech } from '../services/geminiService';
import { ChatMessage, IWindow } from '../types';
import { GenerateContentResponse } from '@google/genai';
import { getRandomSuggestions } from '../constants';

// Fix for framer-motion type definitions
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

type UserRole = 'student' | 'teacher';
type Textbook = 'Kết Nối Tri Thức' | 'Cánh Diều' | 'Chân Trời Sáng Tạo' | 'Chương trình cũ' | null;
type Grade = 'Lớp 8' | 'Lớp 9' | 'Lớp 10' | 'Lớp 11' | 'Lớp 12' | null;

interface Attachment {
    file: File;
    preview: string;
    type: 'image' | 'file';
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'welcome',
        role: 'model',
        text: '👋 Chào mừng bạn đến với N2V!\nMình là N2V – Người bạn đồng hành Hóa học thông minh, được tạo ra để giúp việc học Hóa trở nên dễ hiểu – chính xác – thú vị hơn mỗi ngày 🔬⚡\n\n⚙️ **Cấu hình bài học**\nĐể được hỗ trợ chính xác về chương trình SGK và các nội dung trên lớp, bạn hãy chọn:\n• **Lớp học**\n• **Bộ sách giáo khoa**\n(tại mục Cấu hình bên cạnh hoặc phía trên nếu dùng điện thoại)\n\n📘 **N2V có thể giúp bạn**\n✅ Giải bài tập Hóa học theo chuẩn SGK\n✅ Chỉ ra lỗi thường gặp và hướng dẫn sửa sai\n✅ Giải thích chi tiết, dễ hiểu, phù hợp với học sinh\n✅ Liên hệ kiến thức Hóa học với đời sống, thực tiễn và STEM\n\n🚀 **Mục tiêu của N2V**\n• Giúp bạn hiểu bản chất, không học vẹt\n• Trở thành AI Hóa học chuyên sâu, đáng tin cậy\n• Đồng hành cùng học sinh – giáo viên trong học tập và giảng dạy\n\n✨ Khi đã sẵn sàng, hãy gửi bài tập hoặc câu hỏi Hóa học của bạn nhé!\nN2V luôn ở đây để hỗ trợ bạn!',
        timestamp: new Date(),
        suggestions: getRandomSuggestions(3)
    }
  ]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  
  // Context State
  const [selectedGrade, setSelectedGrade] = useState<Grade>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook>(null);
  
  // Track audio states
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initial session create
    chatSessionRef.current = createChatSession(
        selectedGrade || undefined, 
        selectedTextbook || undefined
    );

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'vi-VN';

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            stopAudio();
        };
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Vui lòng cấp quyền micro để sử dụng tính năng nhập liệu bằng giọng nói.");
            }
        };
    }
  }, []);

  // Auto-resize textarea logic
  useEffect(() => {
    if (textInputRef.current) {
        // Reset height to auto to correctly calculate scrollHeight for deletions
        textInputRef.current.style.height = 'auto';
        // Set new height, capped at 150px
        textInputRef.current.style.height = `${Math.min(textInputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Re-create session when context changes
  const handleContextChange = (grade: Grade, textbook: Textbook) => {
      setSelectedGrade(grade);
      setSelectedTextbook(textbook);
      
      // Update the chat session with new instructions
      chatSessionRef.current = createChatSession(grade || undefined, textbook || undefined);
      
      // Notify user via a small system message (optional, but good for UX)
      if (grade && textbook) {
          const systemNote: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: `✅ Đã cập nhật cấu hình: **${grade}** - Bộ sách **${textbook}**. Mọi câu trả lời sẽ bám sát nội dung này.`,
              timestamp: new Date()
          };
          setMessages(prev => [...prev, systemNote]);
      }
      setShowConfig(false); // Auto close config on selection if desired, or keep open
  };

  const stopAudio = () => {
      stopSpeech();
      setPlayingMessageId(null);
      setLoadingAudioId(null);
      setIsPaused(false);
  };

  useEffect(() => {
      if (!isOpen) {
          stopAudio();
          setShowMobileMenu(false);
      }
  }, [isOpen]);

  // SMART SCROLL LOGIC
  useLayoutEffect(() => {
    if (lastMessageRef.current) {
        setTimeout(() => {
            lastMessageRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 150);
    }
  }, [messages, isOpen]);

  const handleScroll = () => {
      if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
          setShowScrollDown(!isAtBottom);
      }
  };

  const scrollToBottom = () => {
      messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
      });
  };

  const parseResponse = (rawText: string): { text: string; suggestions: string[] } => {
    const parts = rawText.split('---SUGGESTIONS---');
    const mainText = parts[0].trim();
    const suggestionsText = parts[1] || '';
    
    const suggestions = suggestionsText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    return { text: mainText, suggestions };
  };

  // --- FILE HANDLING ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Validate size (e.g., < 5MB)
          if (file.size > 5 * 1024 * 1024) {
              alert("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
              return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
              const result = event.target?.result as string;
              setAttachment({
                  file,
                  preview: result,
                  type: file.type.startsWith('image/') ? 'image' : 'file'
              });
          };
          reader.readAsDataURL(file);
      }
  };

  const removeAttachment = () => {
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToGenerativePart = async (file: File) => {
      const base64EncodedDataPromise = new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              // Remove "data:mime/type;base64," prefix
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.readAsDataURL(file);
      });

      return {
          inlineData: {
              data: await base64EncodedDataPromise,
              mimeType: file.type,
          },
      };
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !attachment) || isLoading) return;
    
    setShowMobileMenu(false);
    stopAudio();

    // Create a descriptive message for the user view
    let displayText = textToSend;
    if (attachment) {
        displayText = textToSend ? `${textToSend} [Đã gửi tệp: ${attachment.file.name}]` : `[Đã gửi tệp: ${attachment.file.name}]`;
    }

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: displayText,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentAttachment = attachment; // Capture current attachment
    setInput('');
    setAttachment(null); // Clear immediately for UI
    setIsLoading(true);

    try {
        let messagePayload: any;

        if (currentAttachment) {
            const part = await fileToGenerativePart(currentAttachment.file);
            const promptText = textToSend || "Hãy phân tích nội dung trong tệp này giúp tôi.";
            messagePayload = [
                { text: promptText },
                part
            ];
        } else {
            messagePayload = textToSend;
        }

        const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: messagePayload });
        const rawText = result.text || "Mình đã nhận được, nhưng chưa hiểu rõ lắm. Bạn nói lại được không?";
        
        // Extract Grounding Metadata (Sources)
        const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

        const { text, suggestions } = parseResponse(rawText);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: text,
            suggestions: suggestions,
            groundingMetadata: groundingMetadata, // Store citations
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
        
    } catch (error) {
        console.error("Chat error:", error);
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Xin lỗi, mình gặp chút vấn đề khi xử lý tin nhắn hoặc tệp này. Bạn thử lại nhé.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        recognitionRef.current?.start();
    }
  };

  const handlePlayAudio = (msgId: string, text: string) => {
      stopAudio();
      setLoadingAudioId(msgId);
      setIsPaused(false);
      speakVietnamese(
          text,
          () => { setLoadingAudioId(null); setPlayingMessageId(msgId); },
          () => { setPlayingMessageId(null); setIsPaused(false); },
          () => { setLoadingAudioId(null); setPlayingMessageId(null); setIsPaused(false); }
      );
  };

  const handlePauseResume = (msgId: string) => {
      if (isPaused) {
          resumeSpeech();
          setIsPaused(false);
      } else {
          pauseSpeech();
          setIsPaused(true);
      }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const formatText = (text: string) => {
      // Bold handling
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={index} className="text-teal-300 font-bold">{part.slice(2, -2)}</strong>;
          }
          return <span key={index}>{part}</span>;
      });
  };

  const handleUsePrompt = (query: string) => {
      setInput(query);
      setShowMobileMenu(false);
      // Ensure focus on input after state update and possible menu close
      setTimeout(() => {
          textInputRef.current?.focus();
      }, 100);
  };

  const QuickAction: React.FC<{ icon: React.ReactNode, text: string, query: string }> = ({ icon, text, query }) => (
      <button 
        onClick={() => handleUsePrompt(query)}
        disabled={isLoading}
        className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-teal-400/30 transition-all text-left group disabled:opacity-50"
      >
          <div className="text-teal-400 group-hover:text-teal-300 transition-colors">{icon}</div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{text}</span>
      </button>
  );

  const studentActions = [
      { 
          icon: <Zap size={18} />, 
          text: "Hỏi nhanh nguyên tố", 
          query: "Dựa trên nguyên tố tôi đang chọn (hoặc tôi sẽ nhập), hãy:\n- Tóm tắt kiến thức cần nhớ nhất\n- Nêu 3 dạng bài tập hay gặp\n- Cảnh báo 2 lỗi học sinh thường sai" 
      },
      { 
          icon: <Timer size={18} />, 
          text: "Kiểm tra 5 phút", 
          query: "Hãy hỏi tôi 5 câu hỏi miệng (trả bài) đúng chuẩn giáo viên. Sau khi tôi trả lời, hãy chấm điểm và nhận xét ngắn gọn." 
      },
      { 
          icon: <CheckCircle2 size={18} />, 
          text: "Chấm & Sửa bài", 
          query: "Đây là bài làm của tôi (tôi sẽ gửi ảnh hoặc nhập). Hãy chỉ ra lỗi sai, giải thích vì sao sai và sửa lại theo cách không bị trừ điểm." 
      },
      { 
          icon: <Calculator size={18} />, 
          text: "Giải bài tập", 
          query: "Hướng dẫn mình giải bài tập này theo 4 bước chuẩn (Phân tích - Phương trình - Tính toán - Kết luận) nhé." 
      },
      { 
          icon: <Lightbulb size={18} />, 
          text: "Mẹo ghi nhớ", 
          query: "Có câu thần chú hay mẹo nào dễ nhớ cho phần kiến thức này không?" 
      }
  ];

  const teacherActions = [
      { icon: <ScrollText size={18} />, text: "Soạn giáo án", query: "Hỗ trợ tôi soạn ý tưởng giáo án bài 'Cấu tạo nguyên tử' theo hướng phát triển năng lực." },
      { icon: <ClipboardList size={18} />, text: "Tạo đề kiểm tra", query: "Đề xuất ma trận đề kiểm tra 1 tiết chương Oxi - Lưu huỳnh." },
      { icon: <FlaskConical size={18} />, text: "Ý tưởng thí nghiệm", query: "Gợi ý 3 thí nghiệm trực quan, an toàn về Kim loại kiềm." },
      { icon: <PenTool size={18} />, text: "Phương pháp dạy", query: "Các phương pháp dạy học tích cực cho phần Hóa hữu cơ." }
  ];

  // Config Selector Component
  const ConfigSelector = () => (
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-teal-500/20 mb-4 animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <Settings2 size={16} /> Cấu hình học tập
             </h3>
             <button onClick={() => setShowConfig(!showConfig)} className="text-slate-400 hover:text-white">
                 <ChevronDown size={16} className={`transition-transform ${showConfig ? 'rotate-180' : ''}`} />
             </button>
        </div>
        
        {showConfig && (
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-slate-400 mb-2 block font-medium">Bạn đang học lớp mấy?</label>
                    <div className="flex flex-wrap gap-2">
                        {['Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'].map((g) => (
                            <button
                                key={g}
                                onClick={() => handleContextChange(g as Grade, selectedTextbook)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedGrade === g ? 'bg-teal-500 text-white border-teal-400 shadow-lg' : 'bg-slate-700/50 border-white/5 text-slate-300 hover:bg-slate-700'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-2 block font-medium">Bộ sách giáo khoa?</label>
                    <div className="flex flex-col gap-2">
                        {['Kết Nối Tri Thức', 'Cánh Diều', 'Chân Trời Sáng Tạo', 'Chương trình cũ'].map((tb) => (
                             <button
                                key={tb}
                                onClick={() => handleContextChange(selectedGrade, tb as Textbook)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${selectedTextbook === tb ? 'bg-teal-500 text-white border-teal-400 shadow-lg' : 'bg-slate-700/50 border-white/5 text-slate-300 hover:bg-slate-700'}`}
                            >
                                {tb}
                            </button>
                        ))}
                    </div>
                </div>
                {(!selectedGrade || !selectedTextbook) && (
                     <div className="text-[10px] text-amber-400 italic flex items-center gap-1 mt-2">
                        <Lightbulb size={12} /> Vui lòng chọn đủ thông tin để AI giải bài chính xác nhất.
                     </div>
                )}
            </div>
        )}
        {!showConfig && selectedGrade && selectedTextbook && (
            <div className="flex gap-2 text-xs">
                <span className="bg-teal-500/20 text-teal-300 px-2 py-1 rounded border border-teal-500/30">{selectedGrade}</span>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">{selectedTextbook}</span>
            </div>
        )}
      </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <MotionDiv
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className={`
                    w-full sm:max-w-5xl bg-[#0f172a] sm:bg-[#0f172a]/95 backdrop-blur-2xl 
                    border-t sm:border border-teal-500/20 
                    h-[100dvh] sm:h-[85vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row relative
                `}
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Left Sidebar (Desktop Only) */}
                <div className="hidden sm:flex w-80 bg-black/20 border-r border-white/5 p-5 flex-col gap-5 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg shadow-lg">
                            <BrainCircuit className="text-white" size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="font-bold text-lg text-white leading-tight">N2V</h2>
                            <span className="text-xs text-teal-400 font-medium tracking-wider">HÓA HỌC</span>
                        </div>
                    </div>
                    
                    {/* Desktop Config Selector */}
                    <ConfigSelector />

                    <div className="bg-white/5 p-1 rounded-xl flex border border-white/5 relative shrink-0">
                        <MotionDiv 
                            className="absolute top-1 bottom-1 bg-white/10 rounded-lg shadow-sm"
                            initial={false}
                            animate={{
                                left: userRole === 'student' ? '4px' : '50%',
                                width: 'calc(50% - 6px)',
                                x: userRole === 'teacher' ? '2px' : 0
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        
                        <button 
                            onClick={() => setUserRole('student')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-sm font-medium transition-colors z-10 ${userRole === 'student' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <GraduationCap size={16} />
                            Học Sinh
                        </button>
                        <button 
                            onClick={() => setUserRole('teacher')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-sm font-medium transition-colors z-10 ${userRole === 'teacher' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <School size={16} />
                            Giáo Viên
                        </button>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                         {(userRole === 'student' ? studentActions : teacherActions).map((action, idx) => (
                            <QuickAction key={idx} icon={action.icon} text={action.text} query={action.query} />
                         ))}
                    </div>
                </div>

                {/* Right Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 z-10 relative h-full">
                    
                    {/* Mobile Header */}
                    <div className="sm:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/20 shrink-0">
                         <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className={`p-2 rounded-lg transition-colors ${showMobileMenu ? 'bg-teal-500 text-white' : 'bg-white/5 text-slate-300'}`}
                            >
                                {showMobileMenu ? <ChevronLeft size={20} /> : <LayoutGrid size={20} />}
                            </button>
                            <span className="font-bold text-white text-lg">N2V AI</span>
                         </div>
                         <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg">
                             <X size={20} />
                         </button>
                    </div>

                    {/* Desktop Close */}
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors z-20 hidden sm:block"
                    >
                        <X size={20} />
                    </button>

                    {/* MOBILE MENU OVERLAY */}
                    <AnimatePresence>
                        {showMobileMenu && (
                            <MotionDiv
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute inset-0 top-[68px] z-30 bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col gap-6 sm:hidden overflow-y-auto"
                            >
                                <ConfigSelector />

                                <div className="bg-white/5 p-1.5 rounded-2xl flex border border-white/10 shrink-0">
                                    <button 
                                        onClick={() => setUserRole('student')}
                                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${userRole === 'student' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400'}`}
                                    >
                                        <GraduationCap size={20} />
                                        Góc Học Tập
                                    </button>
                                    <button 
                                        onClick={() => setUserRole('teacher')}
                                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${userRole === 'teacher' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400'}`}
                                    >
                                        <School size={20} />
                                        Công Cụ GV
                                    </button>
                                </div>
                                <div className="space-y-3 pb-20">
                                    {(userRole === 'student' ? studentActions : teacherActions).map((action, idx) => (
                                        <QuickAction key={idx} icon={action.icon} text={action.text} query={action.query} />
                                    ))}
                                </div>
                            </MotionDiv>
                        )}
                    </AnimatePresence>

                    {/* Messages */}
                    <div 
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 sm:p-8 pr-2 space-y-6 custom-scrollbar scroll-smooth relative"
                    >
                        {messages.map((msg, index) => {
                            const isLastMessage = index === messages.length - 1;
                            return (
                                <div 
                                    key={msg.id} 
                                    ref={isLastMessage ? lastMessageRef : null}
                                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg mt-1
                                            ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-teal-500'}
                                        `}>
                                            {msg.role === 'user' ? <MessageCircle size={16} className="text-white" /> : <Sparkles size={16} className="text-white" />}
                                        </div>

                                        <div className="space-y-3 group/bubble relative min-w-0 w-full">
                                            <div 
                                                className={`
                                                    p-3 sm:p-5 text-sm sm:text-base leading-relaxed shadow-lg
                                                    ${msg.role === 'user' 
                                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
                                                        : 'bg-white/10 border border-white/10 text-slate-100 rounded-2xl rounded-tl-none backdrop-blur-md'}
                                                `}
                                            >
                                                <div className="whitespace-pre-wrap break-words">
                                                    {formatText(msg.text)}
                                                </div>

                                                {/* Grounding Sources (Links) */}
                                                {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-white/10">
                                                        <div className="flex items-center gap-2 mb-2 text-teal-400 text-xs uppercase font-bold tracking-wider">
                                                            <LinkIcon size={12} />
                                                            Tài liệu tham khảo
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {msg.groundingMetadata.groundingChunks
                                                                .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
                                                                .slice(0, 3) // Limit to 3 links to keep UI clean
                                                                .map((chunk: any, i: number) => (
                                                                    <a 
                                                                        key={i}
                                                                        href={chunk.web.uri}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 hover:border-teal-500/30 group"
                                                                    >
                                                                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-teal-400">
                                                                            <ExternalLink size={14} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs sm:text-sm font-medium text-teal-200 truncate group-hover:text-teal-300">
                                                                                {chunk.web.title}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 truncate">
                                                                                {new URL(chunk.web.uri).hostname}
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Audio Controls */}
                                            {msg.role === 'model' && (
                                                <div className="flex gap-2">
                                                    {(playingMessageId === msg.id || loadingAudioId === msg.id) ? (
                                                        <div className="flex items-center rounded-full bg-white/5 border border-white/10 overflow-hidden shadow-sm">
                                                            {/* Play/Pause Button */}
                                                            <button
                                                                onClick={() => handlePauseResume(msg.id)}
                                                                disabled={loadingAudioId === msg.id}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-white/5 transition-colors disabled:opacity-50 min-w-[90px] justify-center"
                                                            >
                                                                {loadingAudioId === msg.id ? (
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                ) : isPaused ? (
                                                                    <Play size={12} fill="currentColor" />
                                                                ) : (
                                                                    <Pause size={12} fill="currentColor" />
                                                                )}
                                                                {loadingAudioId === msg.id ? 'Đang tải...' : (isPaused ? 'Tiếp tục' : 'Tạm dừng')}
                                                            </button>
                                                            
                                                            {/* Divider */}
                                                            <div className="w-px h-4 bg-white/10"></div>
                                                            
                                                            {/* Stop Button */}
                                                            <button
                                                                onClick={stopAudio}
                                                                className="px-2 py-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                                                title="Dừng đọc"
                                                            >
                                                                <Square size={12} fill="currentColor" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePlayAudio(msg.id, msg.text)}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-teal-400 hover:border-teal-400/50 transition-all"
                                                        >
                                                            <Volume2 size={12} />
                                                            Nghe
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Suggestions */}
                                            {msg.role === 'model' && msg.suggestions && msg.suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500 pt-1">
                                                    {msg.suggestions.map((sug, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleSend(sug)}
                                                            disabled={isLoading}
                                                            className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-full text-xs text-teal-300 transition-all active:scale-95 disabled:opacity-50 h-auto"
                                                        >
                                                            <span className="whitespace-normal text-left">{sug}</span>
                                                            <ArrowRight size={12} className="shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                             <div 
                                ref={lastMessageRef}
                                className="flex gap-4 items-center animate-pulse px-2"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center shadow-lg">
                                    <Sparkles size={16} className="text-white" />
                                </div>
                                <span className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                    N2V đang suy nghĩ <Loader2 size={14} className="animate-spin" />
                                </span>
                             </div>
                        )}
                    </div>

                    {/* Scroll To Bottom Button */}
                    <AnimatePresence>
                        {showScrollDown && (
                            <MotionButton
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                onClick={scrollToBottom}
                                className="absolute bottom-24 right-6 p-3 bg-slate-800 text-white rounded-full shadow-xl border border-white/10 z-30 hover:bg-slate-700"
                            >
                                <ArrowDown size={20} />
                            </MotionButton>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <div className="p-4 sm:p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl shrink-0 z-20">
                        {/* Attachment Preview */}
                        <AnimatePresence>
                            {attachment && (
                                <MotionDiv
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 10, height: 0 }}
                                    className="mb-3 overflow-hidden"
                                >
                                    <div className="inline-flex items-center gap-3 bg-white/10 border border-white/10 rounded-xl p-2 pr-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 flex items-center justify-center border border-white/5 shrink-0">
                                            {attachment.type === 'image' ? (
                                                <img src={attachment.preview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText size={20} className="text-teal-400" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-medium text-white truncate max-w-[150px]">{attachment.file.name}</span>
                                            <span className="text-[10px] text-slate-400">{(attachment.file.size / 1024).toFixed(0)} KB</span>
                                        </div>
                                        <button 
                                            onClick={removeAttachment}
                                            className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg ml-2 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>

                        <div className="relative flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:bg-white/10 focus-within:border-teal-500/50 transition-all shadow-inner">
                            {/* File Upload Button */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileSelect}
                                accept="image/*,application/pdf,text/plain"
                            />
                            <div className="flex gap-2 py-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-teal-400 hover:bg-white/10 transition-all h-10 w-10 flex items-center justify-center"
                                    title="Tải lên ảnh hoặc file"
                                >
                                    <Paperclip size={20} />
                                </button>

                                <button
                                    onClick={toggleListening}
                                    className={`
                                        p-2 rounded-xl transition-all h-10 w-10 flex items-center justify-center
                                        ${isListening 
                                            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}
                                    `}
                                    title="Nói để hỏi"
                                >
                                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                            </div>

                            <textarea
                                ref={textInputRef}
                                value={input}
                                rows={1}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isListening ? "Đang nghe bạn nói..." : attachment ? "Thêm mô tả cho file này..." : "Nhập câu hỏi..."}
                                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-base min-w-0 resize-none max-h-[150px] py-3 custom-scrollbar"
                                style={{ height: 'auto' }}
                            />
                            <div className="py-3">
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isLoading || (!input.trim() && !attachment)}
                                    className="p-2 bg-gradient-to-r from-teal-500 to-blue-600 rounded-xl text-white shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 h-10 w-10 flex items-center justify-center"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <MotionButton
        layout
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 group"
      >
        <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-teal-500 via-blue-600 to-purple-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-white/20 overflow-hidden">
            <div className="absolute inset-0 rounded-full border border-white/50 animate-ping opacity-20" />
            <Sparkles className="text-white w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md group-hover:rotate-12 transition-transform duration-300" />
        </div>
      </MotionButton>
    </>
  );
};

export default ChatBot;
