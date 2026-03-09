
export type ElementCategory = 
  | 'phi-kim' 
  | 'khi-hiem' 
  | 'kim-loai-kiem' 
  | 'kim-loai-kiem-tho' 
  | 'ban-kim' 
  | 'halogen' 
  | 'kim-loai-chuyen-tiep' 
  | 'kim-loai-yeu' 
  | 'lanthanide' 
  | 'actinide';

export type ChemicalNature = 'Acid' | 'Bazơ' | 'Lưỡng tính' | 'Trung tính' | 'Không xác định';

export interface ChemicalElement {
  number: number;
  symbol: string;
  name: string; // Tên tiếng Anh (IUPAC)
  nameVi: string; // Tên tiếng Việt
  weight: string;
  category: ElementCategory;
  group: number;
  period: number;
  description: string;
  electronConfiguration: string;
  density: string; 
  meltingPoint: string; 
  boilingPoint: string; 
  electronegativity: string; 
  
  highestOxide: string; 
  highestOxideNature: ChemicalNature;
  highestHydroxide: string; 
  highestHydroxideNature: ChemicalNature;
  
  images?: { url: string; caption: string; }[];
  
  // Thông tin chi tiết mới
  history: string;
  sources: string;
  preparation: string;
  
  metallicProperty: string;
  propertyTrends: string;
  physicalProperties: string;
  chemicalProperties: string;
  
  applications: string[];
}

export interface CategoryStyle {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  groundingMetadata?: any; // For citations
}

export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}