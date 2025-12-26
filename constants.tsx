
export const COLORS = {
  bg: '#0B0C10',
  primary: '#66FCF1',
  secondary: '#45A29E',
  text: '#C5C6C7',
  accent: '#1F2833'
};

export const DEFAULT_SYSTEM_INSTRUCTION = "You are a helpful and expert AI assistant. Provide concise, accurate, and professional responses.";

export const MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Most capable model for reasoning and creativity.' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast and versatile for most tasks.' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', description: 'Highly efficient for high-volume tasks.' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini Image Flash', description: 'Fast image generation.' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini Image Pro', description: 'High-quality 1K/2K/4K images.' },
  { id: 'gemini-2.5-flash-native-audio-preview-09-2025', name: 'Gemini Live', description: 'Real-time audio interaction.' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo Video', description: 'High-quality video generation.' }
];

export const SAFETY_THRESHOLDS = [
  'BLOCK_NONE',
  'BLOCK_ONLY_HIGH',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_LOW_AND_ABOVE'
];
