
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
        _playBuffer(audioBufferCache, 0);
    }
    isPaused = false;
};

// UPDATED: Now uses Native Browser Speech exclusively for INSTANT playback
export const speakElementName = async (
    elementName: string,
    onend: () => void
): Promise<void> => {
    stopSpeech(); // Stop any currently playing audio immediately

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Essential: Cancel any pending speech to ensure immediate execution
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }

        // Create utterance with English language (IUPAC names are standard English)
        const utterance = new SpeechSynthesisUtterance(elementName);
        utterance.lang = 'en-US'; 
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        
        // Try to select a high-quality English voice if available
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || 
                        voices.find(v => v.lang === 'en-US');
        if (enVoice) utterance.voice = enVoice;

        utterance.onend = () => {
            onend();
        };
        
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error:', event.error);
            onend();
        };

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Speech synthesis not supported.");
        onend();
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

    // Online mode: use Gemini TTS for high quality long text explanation in Chat
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
    const prompt = `Giải thích ứng dụng "${application}" của nguyên tố ${elementName}.
QUY TẮC:
- Trình bày dưới dạng một đoạn văn ngắn (3-4 câu).
- **Tuyệt đối không** dùng markdown, in đậm, tiêu đề, gạch đầu dòng.
- Luôn sử dụng chỉ số dưới Unicode cho công thức hóa học (ví dụ: H₂O).
- **Tuyệt đối không** dùng cú pháp bảng Markdown thô (| --- |) hay LaTeX ($...).`;
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
    const elementNames = elements.map(e => e.name).join(', ');
    const prompt = `So sánh các nguyên tố sau: ${elementNames}.

Hãy tập trung vào các điểm chính sau đây, trình bày dưới dạng markdown, mỗi gạch đầu dòng là một ý riêng biệt, rõ ràng:
### So sánh Tính chất Vật lý
- **Trạng thái & Màu sắc:** So sánh ở điều kiện thường.
- **Nhiệt độ nóng chảy/sôi:** Nguyên tố nào có giá trị cao hơn/thấp hơn và tại sao (nếu có thể giải thích ngắn gọn).
- **Mật độ:** So sánh và nhận xét.
### So sánh Tính chất Hóa học
- **Mức độ hoạt động:** Nguyên tố nào hoạt động mạnh hơn, giải thích ngắn gọn.
- **Tính kim loại/phi kim:** So sánh và giải thích.
- **Phản ứng đặc trưng:** Nêu một phản ứng tiêu biểu để minh họa sự khác biệt.
### Xu hướng trong Bảng Tuần Hoàn
- **Vị trí:** So sánh vị trí của chúng (chu kỳ, nhóm).
- **Bán kính nguyên tử & Độ âm điện:** So sánh hai chỉ số này và giải thích xu hướng.
### Kết luận
- Tóm tắt điểm khác biệt và tương đồng quan trọng nhất trong 1-2 câu.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
- **Không dùng cú pháp lạ:** Tuyệt đối không dùng cú pháp bảng Markdown thô (\`|\`, \`---\`) hay cú pháp toán học LaTeX/TeX (\`$\`, \`\\\\\`).
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
    const elementNames = elements.map(e => e.name).join(' và ');
    const prompt = `Liệt kê 3-5 hợp chất phổ biến nhất được tạo thành từ ${elementNames}. 

Với mỗi hợp chất, trình bày theo định dạng markdown sau:
### [Tên hợp chất] ([Công thức hóa học])
- **Ứng dụng chính:** [Mô tả ngắn gọn ứng dụng quan trọng nhất].

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Luôn sử dụng chỉ số dưới Unicode (ví dụ: H₂SO₄).
- **Không dùng cú pháp lạ:** Tuyệt đối không dùng cú pháp bảng Markdown thô (\`|\`, \`---\`) hay cú pháp toán học LaTeX/TeX (\`$\`, \`\\\\\`).
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
    const elementNames = elements.map(e => e.name).join(', ');
    const prompt = `Phân tích các quy luật và xu hướng biến đổi giữa các nguyên tố: ${elementNames}.

Hãy trình bày theo định dạng markdown:
### Biến đổi Bán kính & Độ âm điện
- So sánh kích thước nguyên tử và khả năng hút electron. Giải thích dựa trên số lớp electron và điện tích hạt nhân.
### Năng lượng ion hóa & Tính Kim loại/Phi kim
- Phân tích sự khác biệt về khả năng nhường/nhận electron. Nguyên tố nào hoạt động mạnh hơn và tại sao?
### Giải thích dựa trên Cấu hình Electron
- Điểm khác biệt trong lớp vỏ electron dẫn đến sự khác biệt về tính chất hóa học đặc trưng.
### Tóm tắt xu hướng
- Trình bày kết quả so sánh TĂNG/GIẢM của các chỉ số chính. Với mỗi chỉ số, hãy dùng gạch đầu dòng riêng cho mỗi xu hướng và xuống dòng để trình bày rõ ràng.
  - **Ví dụ định dạng mong muốn:**
    - **Bán kính nguyên tử:**
      - TĂNG khi đi từ trên xuống dưới trong cùng nhóm (ví dụ: Li → Na).
      - GIẢM khi đi từ trái sang phải trong cùng chu kỳ (ví dụ: Na → Mg).
    - **Độ âm điện:**
      - GIẢM khi đi từ trên xuống dưới...
      - TĂNG khi đi từ trái sang phải...

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
- **Không dùng cú pháp lạ:** Tuyệt đối không dùng cú pháp bảng Markdown thô (\`|\`, \`---\`) hay cú pháp toán học LaTeX/TeX (\`$\`, \`\\\\\`).
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
    const elementNames = elements.map(e => e.name).join(' và ');
    const prompt = `So sánh chi tiết khả năng phản ứng và tính Oxy hóa - Khử của: ${elementNames}.

Trình bày theo định dạng markdown:
### Dãy hoạt động hóa học
- Xác định vị trí tương đối của các nguyên tố này trong dãy hoạt động (hoặc dãy điện hóa).
### Phản ứng với các tác nhân phổ biến
- So sánh phản ứng với từng tác nhân, mỗi tác nhân một gạch đầu dòng riêng:
  - **Với Oxy:** Điều kiện, sản phẩm, tốc độ phản ứng?
  - **Với Nước:** Mức độ phản ứng ở nhiệt độ thường/cao?
  - **Với Axit (ví dụ HCl):** Tốc độ phản ứng?
### Tính Oxy hóa và Tính Khử
- Phân tích khả năng đóng vai trò chất khử hoặc chất oxy hóa trong các phản ứng tiêu biểu, so sánh mức độ mạnh yếu.
### Dự đoán phản ứng thế
- Liệu nguyên tố này có thể đẩy nguyên tố kia ra khỏi dung dịch muối của nó không? Giải thích.

**QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):**
- **Công thức hóa học:** Dùng chỉ số dưới Unicode (ví dụ: H₂O, O₂).
- **Phản ứng hóa học:** Dùng mũi tên Unicode (→).
- **Không dùng cú pháp lạ:** Tuyệt đối không dùng cú pháp bảng Markdown thô (\`|\`, \`---\`) hay cú pháp toán học LaTeX/TeX (\`$\`, \`\\\\\`).
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
    const elementNames = elements.map(e => e.name).join(' và ');
    const prompt = `So sánh vai trò thực tiễn và giá trị công nghiệp của: ${elementNames}.

Trình bày theo định dạng markdown, mỗi mục là một phân tích riêng biệt:
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
- **Không dùng cú pháp lạ:** Tuyệt đối không dùng cú pháp bảng Markdown thô (\`|\`, \`---\`) hay cú pháp toán học LaTeX/TeX (\`$\`, \`\\\\\`).
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


export const createChatSession = (grade?: string, textbook?: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const gradeInstruction = grade ? `chuyên sâu về Hóa học **${grade}**` : 'chuyên sâu về Hóa học phổ thông';
  const textbookInstruction = textbook ? `theo chuẩn bộ sách giáo khoa **${textbook}**` : '';

  const systemInstruction = `
    Bạn là N2V, một AI Hóa học năng động và thân thiện, ${gradeInstruction} ${textbookInstruction}.
    
    **NHIỆM VỤ CỐT LÕI:**
    1.  **Chuyên Môn & Chính Xác:** Luôn trả lời đúng trọng tâm, khoa học.
    2.  **Liên Hệ Thực Tế Việt Nam:** Kết nối kiến thức hóa học với đời sống, sản xuất tại Việt Nam (phèn chua, phân bón, xi măng...).
    3.  **Cảnh Báo Lỗi Sai:** Chủ động chỉ ra các lỗi sai phổ biến học sinh hay mắc phải.
    4.  **Sử Dụng Google Search:** Luôn luôn sử dụng công cụ tìm kiếm Google để đảm bảo thông tin cập nhật và chính xác. Câu trả lời phải dựa trên kết quả tìm kiếm.
    5.  **Tập trung vào Hóa học:** Nếu người dùng hỏi về lĩnh vực không liên quan đến Hóa học (ví dụ: văn học, lịch sử, toán không ứng dụng hóa), hãy lịch sự từ chối và nhắc nhở rằng bạn là trợ lý chuyên về Hóa học. Ví dụ: "Mình là N2V, trợ lý chuyên về Hóa học. Mình có thể giúp bạn tốt nhất với các câu hỏi liên quan đến lĩnh vực này. Bạn có câu hỏi Hóa học nào không?".

    **ĐỊNH DẠNG CÂU TRẢ LỜI (BẮT BUỘC):**
    *   Sử dụng Markdown để trình bày:
        *   Dùng \`**in đậm**\` cho các tiêu đề và thuật ngữ quan trọng.
        *   Dùng gạch đầu dòng (\`-\` hoặc \`*\`) cho danh sách.
    *   **Công thức hóa học:** Dùng chỉ số dưới Unicode. Ví dụ: **H₂SO₄**, không viết H2SO4.
    *   **Phản ứng hóa học:** Dùng mũi tên Unicode: →
    *   **Tuyệt đối không:** Không dùng cú pháp LaTeX, TeX, \`\$\` hay \`\\\\\`.

    **CUỐI CÙNG:**
    *   Kết thúc câu trả lời chính.
    *   Thêm một dòng phân cách: \`---SUGGESTIONS---\`
    *   Bên dưới dòng đó, đề xuất 3 câu hỏi gợi mở tiếp theo, mỗi câu trên một dòng.
    `;
    
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { 
        systemInstruction,
        temperature: 0.2,
        tools: [{googleSearch: {}}],
    },
  });
};
