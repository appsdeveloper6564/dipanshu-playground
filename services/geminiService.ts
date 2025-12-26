
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType, ChatMessage } from "../types";

const supportsSearch = (model: string) => {
  return model === 'gemini-3-pro-preview' || model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-image-preview';
};

const supportsThinking = (model: string) => {
  return (model.startsWith('gemini-3') || model.startsWith('gemini-2.5')) && 
         !model.includes('image') && 
         !model.includes('native-audio') &&
         !model.includes('tts');
};

export const generateAIContent = async (
  model: string,
  messages: ChatMessage[],
  systemInstruction: string,
  config: any,
  variables: Record<string, string> = {}
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let processedSystemInstruction = systemInstruction || "";
  Object.entries(variables).forEach(([key, val]) => {
    processedSystemInstruction = processedSystemInstruction.replace(new RegExp(`{{${key}}}`, 'g'), val);
  });

  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'model')
    .map(m => {
      const parts = m.parts
        .map(p => {
          if (p.text && m.role === 'user') {
            let text = p.text;
            Object.entries(variables).forEach(([key, val]) => {
              text = text.replace(new RegExp(`{{${key}}}`, 'g'), val);
            });
            return { text };
          }
          if (p.inlineData) return { inlineData: p.inlineData };
          if (p.text) return { text: p.text };
          return null;
        })
        .filter(p => p !== null);

      return { role: m.role, parts: parts as any[] };
    })
    .filter(m => m.parts.length > 0);

  const finalConfig: any = {};

  if (!model.includes('image') && !model.includes('veo')) {
    if (config.temperature !== undefined) finalConfig.temperature = config.temperature;
    if (config.topP !== undefined) finalConfig.topP = config.topP;
    if (processedSystemInstruction) finalConfig.systemInstruction = processedSystemInstruction;
    if (config.safetySettings) finalConfig.safetySettings = config.safetySettings;
  }

  if (config.maxOutputTokens) {
    const tokens = Number(config.maxOutputTokens);
    finalConfig.maxOutputTokens = tokens;
    
    if (supportsThinking(model)) {
      // Ensure budget is at least 100 below max and reasonable
      const budget = Math.max(0, Math.min(tokens - 100, Math.floor(tokens / 2.5)));
      if (budget > 10) {
        finalConfig.thinkingConfig = { thinkingBudget: budget };
      }
    }
  }

  if (config.grounding && supportsSearch(model)) {
    finalConfig.tools = [{ googleSearch: {} }];
  }

  if (model.includes('image')) {
    finalConfig.imageConfig = { aspectRatio: config.aspectRatio || "1:1" };
    // Clean up incompatible text config
    delete finalConfig.systemInstruction;
    delete finalConfig.safetySettings;
    delete finalConfig.temperature;
    delete finalConfig.topP;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents,
      config: finalConfig
    });

    let text = response.text || "";
    let imagePart = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) imagePart = part;
      }
    }

    return { text, groundingMetadata: response.candidates?.[0]?.groundingMetadata, imagePart };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const generateVideoContent = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};
