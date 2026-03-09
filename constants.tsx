
import { ElementCategory, CategoryStyle } from './types';

// Updated Palette: More vivid, higher saturation to work well with glass effects and dark backgrounds
export const CATEGORY_STYLES: Record<ElementCategory, CategoryStyle> = {
  'phi-kim': { // Non-metals - Bright Emerald
    label: 'Phi kim',
    bgColor: 'bg-emerald-500/20', 
    borderColor: 'border-emerald-500/40', 
    textColor: 'text-emerald-300',
  },
  'khi-hiem': { // Noble Gases - Neon Purple
    label: 'Khí hiếm',
    bgColor: 'bg-indigo-500/20', 
    borderColor: 'border-indigo-500/40',
    textColor: 'text-indigo-300',
  },
  'kim-loai-kiem': { // Alkali Metals - Hot Red
    label: 'Kim loại kiềm',
    bgColor: 'bg-rose-500/20', 
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-300',
  },
  'kim-loai-kiem-tho': { // Alkaline Earth - Vivid Amber
    label: 'Kim loại kiềm thổ',
    bgColor: 'bg-amber-500/20', 
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
  },
  'ban-kim': { // Metalloids - Cyan
    label: 'Bán kim',
    bgColor: 'bg-cyan-500/20', 
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-300',
  },
  'halogen': { // Halogens - Pink/Fuchsia 
    label: 'Halogen',
    bgColor: 'bg-fuchsia-500/20', 
    borderColor: 'border-fuchsia-500/40',
    textColor: 'text-fuchsia-300',
  },
  'kim-loai-chuyen-tiep': { // Transition Metals - Royal Blue
    label: 'Kim loại chuyển tiếp',
    bgColor: 'bg-blue-500/20', 
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-300',
  },
  'kim-loai-yeu': { // Post-transition - Blue Gray
    label: 'Kim loại yếu',
    bgColor: 'bg-slate-500/25', 
    borderColor: 'border-slate-400/30',
    textColor: 'text-slate-300',
  },
  'lanthanide': { // Rare Earth 1 - Violet
    label: 'Lanthanide',
    bgColor: 'bg-violet-500/20', 
    borderColor: 'border-violet-500/40',
    textColor: 'text-violet-300',
  },
  'actinide': { // Rare Earth 2 - Pink/Red
    label: 'Actinide',
    bgColor: 'bg-pink-600/20', 
    borderColor: 'border-pink-600/40',
    textColor: 'text-pink-300',
  },
};

// NEW: Centralized Hex Color map for dynamic styling
export const CATEGORY_HEX_COLORS: Record<ElementCategory, string> = {
  'phi-kim': '#10b981',
  'khi-hiem': '#6366f1',
  'kim-loai-kiem': '#f43f5e',
  'kim-loai-kiem-tho': '#f59e0b',
  'ban-kim': '#06b6d4',
  'halogen': '#d946ef',
  'kim-loai-chuyen-tiep': '#3b82f6',
  'kim-loai-yeu': '#64748b', // Slate 500
  'lanthanide': '#8b5cf6',
  'actinide': '#db2777', // Pink 600
};

const SUGGESTION_POOL = [
  "Cân bằng phương trình: Fe + H₂SO₄ (đặc, nóng) → ?",
  "Sự khác biệt giữa liên kết ion và cộng hóa trị là gì?",
  "Giải thích hiện tượng mưa axit.",
  "Tại sao nước đá lại nổi trên mặt nước?",
  "Nêu các ứng dụng chính của Nhôm trong đời sống.",
  "Dãy hoạt động hóa học của kim loại là gì và ý nghĩa?",
  "Phản ứng este hóa là gì? Cho ví dụ.",
  "Phân biệt ankan, anken, ankin.",
  "Polyme là gì? Kể tên 3 loại polyme thường gặp."
];

export const getRandomSuggestions = (count: number): string[] => {
  const shuffled = [...SUGGESTION_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};