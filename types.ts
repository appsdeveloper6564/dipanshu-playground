
export enum ModelType {
  GEMINI_PRO = 'gemini-3-pro-preview',
  GEMINI_FLASH = 'gemini-3-flash-preview',
  GEMINI_FLASH_LITE = 'gemini-flash-lite-latest',
  GEMINI_IMAGE = 'gemini-2.5-flash-image',
  GEMINI_IMAGE_PRO = 'gemini-3-pro-image-preview',
  GEMINI_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025',
  VEO_VIDEO = 'veo-3.1-fast-generate-preview'
}

export interface SafetySetting {
  category: 'HATE_SPEECH' | 'HARASSMENT' | 'SEXUALLY_EXPLICIT' | 'DANGEROUS_CONTENT';
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  parts: Array<{
    text?: string;
    inlineData?: {
      data: string;
      mimeType: string;
    };
  }>;
  timestamp: number;
  groundingMetadata?: any;
  videoUrl?: string; // For Veo
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  systemInstruction: string;
  variables: Record<string, string>;
  config: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    stopSequences: string[];
    model: ModelType;
    grounding: boolean;
    aspectRatio?: string;
    safetySettings: SafetySetting[];
  };
  lastModified: number;
}

export interface MediaFile {
  id: string;
  data: string; // base64
  mimeType: string;
  name: string;
}
