
import { GoogleGenAI, Chat, Content, Modality } from "@google/genai";
import type { ChemicalElement } from '../types';

// --- AUDIO PLAYBACK STATE MANAGEMENT ---
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let audioBufferCache: AudioBuffer | null = null; // Cache the buffer for pause/resume
let isPaused = false;
let startTime = 0;
let startOffset = 0;
let onEndCallback: (() => void) | null = null;

const getAudioContext = (): AudioContext => {
    if (!audioContext || audioContext.state === 'closed') {
        const A = window.AudioContext || (window as any).webkitAudioContext;
        // Gemini TTS provides audio at 24000 sample rate
        audioContext = new A({ sampleRate: 24000 });
    }
    return audioContext;
};

const decodeBase64 = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const decodePcmData = async (
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / 1; // Mono channel
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

export const stopSpeech = () => {
    // Stop browser's native speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    // Stop Gemini audio
    if (currentSource) {
        currentSource.onended = null; 
        currentSource.stop();
    }
    currentSource = null;
    isPaused = false;
    startOffset = 0;
    audioBufferCache = null;
    if (onEndCallback) {
        onEndCallback();
        onEndCallback = null;
    }
};

export const pauseSpeech = () => {
    // Pause browser's native speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
    }
    // Pause Gemini audio
    if (currentSource && !isPaused) {
        currentSource.stop();
        startOffset += getAudioContext().currentTime - startTime;
    }
    isPaused = true;
};

const _playBuffer = (buffer: AudioBuffer, offset: number) => {
    const ctx = getAudioContext();
    if (currentSource) {
        currentSource.onended = null;
        currentSource.stop();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
        if (!isPaused) {
            stopSpeech();
        }
    };
    
    currentSource = source;
    startTime = ctx.currentTime;
    source.start(0, offset);
    isPaused = false;
}

export const resumeSpeech = () => {
    // Resume browser's native speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
    }
    // Resume Gemini audio
    if (audioBufferCache && isPaused) {
        _playBuffer(audioBufferCache, startOffset);
    }
    isPaused = false;
};

export const speakElementName = async (
    elementName: string,
    onend: () => void
): Promise<void> => {
    stopSpeech();

    // Offline mode: use browser's SpeechSynthesis
    if (!navigator.onLine) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(elementName);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.onend = onend;
            utterance.onerror = (event) => {
                console.error('SpeechSynthesis Error:', event.error);
                onend();
            };
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported.");
            onend();
        }
        return;
    }

    // Online mode: use Gemini TTS
    onEndCallback = onend;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = elementName;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') await ctx.resume();
            const audioBytes = decodeBase64(base64Audio);
            audioBufferCache = await decodePcmData(audioBytes, ctx);
            _playBuffer(audioBufferCache, 0);
        } else {
            console.error("No audio data received.");
            stopSpeech();
        }
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        stopSpeech();
    }
};

export const speakVietnamese = async (
    text: string,
    onstart: () => void,
    onend: () => void,
    onerror: () => void
): Promise<void> => {
    stopSpeech();

    // Offline mode: use browser's SpeechSynthesis
    if (!navigator.onLine) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.onstart = onstart;
            utterance.onend = onend;
            utterance.onerror = (event) => {
                console.error('SpeechSynthesis Error:', event.error);
                onerror();
            };
            onstart(); 
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported.");
            onerror();
        }
        return;
    }

    // Online mode: use Gemini TTS
    onEndCallback = onend;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') await ctx.resume();
            const audioBytes = decodeBase64(base64Audio);
            audioBufferCache = await decodePcmData(audioBytes, ctx);
            onstart();
            _playBuffer(audioBufferCache, 0);
        } else {
            console.error("No audio data received.");
            onerror();
            stopSpeech();
        }
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        onerror();
        stopSpeech();
    }
};


export const generateApplicationDetailStream = async (elementName: string, application: string, onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `Phân tích chi tiết ứng dụng "${application}" của nguyên tố ${elementName} trong thực tế. Giải thích ngắn gọn, dễ hiểu cho học sinh, tập trung vào các khía cạnh hóa học.`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi phân tích ứng dụng.");
    }
};

export const generateComparisonSummaryStream = async (elements: ChemicalElement[], onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const elementNames = elements.map(e => e.nameVi).join(', ');
    const prompt = `So sánh các nguyên tố sau: ${elementNames}.

Hãy tập trung vào các điểm chính sau đây, trình bày dưới dạng markdown:
### So sánh Tính chất Vật lý
- Trạng thái, màu sắc, nhiệt độ nóng chảy/sôi, mật độ.
### So sánh Tính chất Hóa học
- Mức độ hoạt động, tính kim loại/phi kim, các phản ứng đặc trưng.
### Xu hướng trong Bảng Tuần Hoàn
- So sánh vị trí, bán kính nguyên tử, độ âm điện.
### Kết luận
- Tóm tắt điểm khác biệt và tương đồng quan trọng nhất.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi tạo bản so sánh.");
    }
};

export const findCommonCompoundsStream = async (elements: ChemicalElement[], onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const elementNames = elements.map(e => e.nameVi).join(' và ');
    const prompt = `Liệt kê 3-5 hợp chất phổ biến nhất được tạo thành từ ${elementNames}. 

Với mỗi hợp chất, trình bày theo định dạng markdown sau:
### [Tên hợp chất] ([Công thức hóa học])
- **Ứng dụng chính:** [Mô tả ngắn gọn ứng dụng quan trọng nhất].

Lưu ý: Trong phần [Công thức hóa học], hãy luôn sử dụng chỉ số dưới Unicode (ví dụ: H₂SO₄).
`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi tìm hợp chất.");
    }
};

export const generateTrendsAnalysisStream = async (elements: ChemicalElement[], onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const elementNames = elements.map(e => e.nameVi).join(', ');
    const prompt = `Phân tích các quy luật và xu hướng biến đổi giữa các nguyên tố: ${elementNames}.

Hãy trình bày theo định dạng markdown:
### Biến đổi Bán kính & Độ âm điện
- So sánh kích thước nguyên tử và khả năng hút electron. Giải thích dựa trên số lớp electron và điện tích hạt nhân.
### Năng lượng ion hóa & Tính Kim loại/Phi kim
- Phân tích sự khác biệt về khả năng nhường/nhận electron. Nguyên tố nào hoạt động mạnh hơn và tại sao?
### Giải thích dựa trên Cấu hình Electron
- Điểm khác biệt trong lớp vỏ electron dẫn đến sự khác biệt về tính chất hóa học đặc trưng.
### Biểu đồ xu hướng (Tóm tắt)
- Một bảng ngắn gọn so sánh tăng/giảm các chỉ số chính.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi phân tích xu hướng.");
    }
};

export const generateReactivityAnalysisStream = async (elements: ChemicalElement[], onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const elementNames = elements.map(e => e.nameVi).join(' và ');
    const prompt = `So sánh chi tiết khả năng phản ứng và tính Oxy hóa - Khử của: ${elementNames}.

Trình bày theo định dạng markdown:
### Dãy hoạt động hóa học
- Xác định vị trí tương đối của các nguyên tố này trong dãy hoạt động (hoặc dãy điện hóa).
### Phản ứng với các tác nhân phổ biến
- So sánh tốc độ và điều kiện phản ứng (nhiệt độ, xúc tác) khi tác dụng với: Oxy, Nước, và Axit.
### Tính Oxy hóa và Tính Khử
- Phân tích khả năng đóng vai trò chất khử hoặc chất oxy hóa trong các phản ứng tiêu biểu.
### Dự đoán phản ứng thế
- Liệu nguyên tố này có thể đẩy nguyên tố kia ra khỏi dung dịch muối của nó không? Giải thích.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi phân tích khả năng phản ứng.");
    }
};

export const generateIndustrialAnalysisStream = async (elements: ChemicalElement[], onChunk: (chunk: string) => void) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const elementNames = elements.map(e => e.nameVi).join(' và ');
    const prompt = `So sánh vai trò thực tiễn và giá trị công nghiệp của: ${elementNames}.

Trình bày theo định dạng markdown:
### Ưu điểm vật liệu
- So sánh các đặc tính vật lý vượt trội (độ cứng, dẫn điện, chịu nhiệt) quyết định mục đích sử dụng.
### Sự phổ biến & Giá thành
- So sánh trữ lượng trong vỏ Trái Đất và mức độ khan hiếm/giá thành trên thị trường.
### Lựa chọn thay thế
- Trong trường hợp nào nguyên tố A có thể thay thế nguyên tố B và ngược lại? Ưu và nhược điểm của sự thay thế này.
### Tác động Carbon & Tái chế
- So sánh mức độ thân thiện với môi trường trong quá trình khai thác và khả năng tái chế.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
`;
    try {
        const result = await ai.models.generateContentStream({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        for await (const chunk of result) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (e) {
        console.error(e);
        onChunk("Đã có lỗi xảy ra khi phân tích giá trị công nghiệp.");
    }
};
