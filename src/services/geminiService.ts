import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from '@google/genai';

let ai: GoogleGenAI;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.error('API_KEY is not set. AI features will be disabled.');
}

let audioContext: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let startTime = 0;
let pausedAt = 0;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

export const createChatSession = (grade?: string, textbook?: string): Chat | null => {
  if (!ai) return null;

  const systemInstruction = `
    Bạn là N2V, một AI chuyên gia Hoá học THPT, được tạo bởi THPT Số 2 Phù Mỹ để giúp học sinh và giáo viên.
    Mục tiêu của bạn là giải thích khái niệm, giải bài tập và khơi dậy sự tò mò, không chỉ đưa ra đáp án.
    
    QUY TẮC BẮT BUỘC:
    1.  **An toàn là trên hết**: KHÔNG BAO GIỜ cung cấp hướng dẫn tạo chất nổ, chất độc, hoặc các thí nghiệm nguy hiểm tại nhà. Luôn nhấn mạnh sự an toàn và sự giám sát của giáo viên.
    2.  **Tư duy như giáo viên**: Giải thích từng bước, dễ hiểu. Khuyến khích học sinh tự suy luận. Đặt câu hỏi gợi mở.
    3.  **Bối cảnh Việt Nam**: Luôn bám sát chương trình và thuật ngữ SGK Hoá học Việt Nam. 
        - Cấu hình hiện tại: Lớp ${grade || 'chưa chọn'}, bộ sách ${textbook || 'chưa chọn'}.
        - Nếu thiếu thông tin, hãy yêu cầu người dùng cung cấp trong phần cấu hình.
    4.  **Phản hồi đa dạng**: Kết hợp văn bản, công thức (định dạng Markdown), và đôi khi là các biểu tượng cảm xúc liên quan đến khoa học (🔬, 🧪, ✨, 💡).
    5.  **Gợi ý câu hỏi**: Sau mỗi câu trả lời, hãy đề xuất 3 câu hỏi tiếp theo thú vị, liên quan để người dùng khám phá sâu hơn. Định dạng chúng sau một dòng phân cách '---SUGGESTIONS---'. Ví dụ:
        [Nội dung câu trả lời của bạn]...
        ---SUGGESTIONS---
        Tại sao kim loại kiềm lại hoạt động mạnh?
        Phản ứng giữa Natri và nước có nguy hiểm không?
        Ứng dụng của Natri trong đời sống là gì?
    `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
    }
  });
};

export const speakVietnamese = async (
    text: string, 
    onstart: () => void, 
    onend: () => void, 
    onerror: () => void
) => {
    if (!ai) {
        onerror();
        return;
    }
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `(narration-style: calm) ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioData = atob(base64Audio);
            const audioBytes = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioBytes[i] = audioData.charCodeAt(i);
            }

            const context = getAudioContext();
            context.decodeAudioData(audioBytes.buffer, (buffer) => {
                audioBuffer = buffer;
                playAudio(onstart, onend);
            }, (err) => {
                console.error('Error decoding audio data:', err);
                onerror();
            });
        } else {
            throw new Error('No audio data received.');
        }
    } catch (error) {
        console.error('TTS Error:', error);
        onerror();
    }
};

const playAudio = (onstart: () => void, onend: () => void) => {
    if (!audioBuffer) return;
    const context = getAudioContext();
    stopSpeech(); // Stop any currently playing audio

    source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    
    startTime = context.currentTime;
    source.start(0, pausedAt);
    onstart();

    source.onended = () => {
        if (context.currentTime - startTime >= audioBuffer!.duration - 0.1) {
            pausedAt = 0; // Reset if played to the end
            onend();
        }
    };
};

export const stopSpeech = () => {
    if (source) {
        source.onended = null; // Prevent onend from firing on manual stop
        source.stop();
        source = null;
    }
    pausedAt = 0;
    audioBuffer = null;
};

export const pauseSpeech = () => {
    if (source && audioContext) {
        pausedAt += audioContext.currentTime - startTime;
        source.onended = null;
        source.stop();
        source = null;
    }
};

export const resumeSpeech = (onstart: () => void, onend: () => void) => {
    if (audioBuffer) {
        playAudio(onstart, onend);
    }
};

export const speakElementName = async (elementName: string, onend: () => void) => {
    // This is a simplified version for quick feedback. 
    // You might want a more robust queueing system for production.
    speakVietnamese(elementName, () => {}, onend, () => {});
};
