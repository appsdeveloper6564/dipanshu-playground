
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ModelType, ChatMessage } from "../types";

export const generateAIContent = async (
  model: ModelType,
  messages: ChatMessage[],
  systemInstruction: string,
  config: any
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = messages.map(m => ({
    role: m.role === 'system' ? 'user' : m.role,
    parts: m.parts
  }));

  const finalConfig: any = {
    temperature: config.temperature,
    topP: config.topP,
    topK: config.topK,
    systemInstruction,
  };

  // Add search grounding tool if enabled
  if (config.grounding) {
    finalConfig.tools = [{ googleSearch: {} }];
  }

  // Handle image generation config if using an image model
  if (model === ModelType.GEMINI_IMAGE) {
    finalConfig.imageConfig = {
      aspectRatio: config.aspectRatio || "1:1",
    };
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents,
      config: finalConfig
    });

    let text = response.text || "";
    let imagePart = null;

    // Iterate through all parts to find potential image outputs (as per guidelines)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imagePart = part;
        }
      }
    }

    return {
      text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata,
      imagePart
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const startLiveSession = (callbacks: any, systemInstruction: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: ModelType.GEMINI_LIVE,
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
      }
    }
  });
};

export const decodeBase64Audio = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const encodeAudioBlob = (data: Float32Array) => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
