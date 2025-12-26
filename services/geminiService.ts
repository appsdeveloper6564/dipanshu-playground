
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType, ChatMessage } from "../types";

/**
 * Checks if the model supports the Google Search tool.
 */
const supportsSearch = (model: string) => {
  return model === 'gemini-3-pro-preview' || model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-image-preview';
};

/**
 * Checks if the model supports Thinking Config.
 */
const supportsThinking = (model: string) => {
  return (model.startsWith('gemini-3') || model.startsWith('gemini-2.5')) && 
         !model.includes('image') && 
         !model.includes('native-audio');
};

export const generateAIContent = async (
  model: string,
  messages: ChatMessage[],
  systemInstruction: string,
  config: any,
  variables: Record<string, string> = {}
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Replace variables in system instruction
  let processedSystemInstruction = systemInstruction || "";
  Object.entries(variables).forEach(([key, val]) => {
    processedSystemInstruction = processedSystemInstruction.replace(new RegExp(`{{${key}}}`, 'g'), val);
  });

  // Filter and process contents
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
          if (p.inlineData) {
            return { inlineData: p.inlineData };
          }
          if (p.text) {
            return { text: p.text };
          }
          return null;
        })
        .filter(p => p !== null);

      return {
        role: m.role,
        parts: parts as any[]
      };
    })
    .filter(m => m.parts.length > 0);

  // Build a clean config object
  const finalConfig: any = {};

  // Standard params for most text models
  if (!model.includes('image')) {
    if (config.temperature !== undefined) finalConfig.temperature = config.temperature;
    if (config.topP !== undefined) finalConfig.topP = config.topP;
    if (config.topK !== undefined) finalConfig.topK = config.topK;
    if (processedSystemInstruction) finalConfig.systemInstruction = processedSystemInstruction;
    if (config.safetySettings) finalConfig.safetySettings = config.safetySettings;
  }

  // Thinking and Max Tokens
  if (config.maxOutputTokens) {
    finalConfig.maxOutputTokens = Number(config.maxOutputTokens);
    if (supportsThinking(model)) {
      // Reserve budget for reasoning. Budget must be less than maxOutputTokens.
      const budget = Math.max(0, Math.min(finalConfig.maxOutputTokens - 100, Math.floor(finalConfig.maxOutputTokens / 2)));
      finalConfig.thinkingConfig = { thinkingBudget: budget };
    }
  }

  // Stop Sequences (only if non-empty array)
  if (config.stopSequences && config.stopSequences.length > 0) {
    const validStop = config.stopSequences.filter((s: string) => s.trim().length > 0);
    if (validStop.length > 0) {
      finalConfig.stopSequences = validStop;
    }
  }

  // Grounding Tool
  if (config.grounding && supportsSearch(model)) {
    finalConfig.tools = [{ googleSearch: {} }];
  }

  // Nano Banana Specifics
  if (model === ModelType.GEMINI_IMAGE || model === ModelType.GEMINI_IMAGE_PRO) {
    finalConfig.imageConfig = {
      aspectRatio: config.aspectRatio || "1:1"
    };
    // Note: Nano banana models don't support systemInstruction in the same config object
    // or safety settings in this specific SDK version for generateContent.
    delete finalConfig.systemInstruction;
    delete finalConfig.safetySettings;
    delete finalConfig.stopSequences;
    delete finalConfig.temperature;
    delete finalConfig.topP;
    delete finalConfig.topK;

    // Search is only for Image Pro
    if (config.grounding && model === ModelType.GEMINI_IMAGE_PRO) {
      finalConfig.tools = [{ googleSearch: {} }];
    } else {
      delete finalConfig.tools;
    }
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
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    // Rethrow with more context if it's a 400
    if (error.message?.includes('400')) {
      throw new Error(`API Argument Error (400): Please check your settings for this model. ${error.message}`);
    }
    throw error;
  }
};

export const generateVideoContent = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
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
