
export const COLORS = {
  bg: '#0B0C10',
  primary: '#66FCF1', // Aqua glow
  secondary: '#45A29E', // Greenish teal
  text: '#C5C6C7', // Light gray
  accent: '#1F2833' // Darker navy
};

export const DEFAULT_SYSTEM_INSTRUCTION = "You are a helpful and expert AI assistant. Provide concise, accurate, and professional responses.";

export const MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini Pro 3 (Preview)', description: 'Best for complex reasoning' },
  { id: 'gemini-3-flash-preview', name: 'Gemini Flash 3 (Preview)', description: 'Fast and versatile' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', description: 'Lightweight and efficient' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini Image (Nano)', description: 'Generate and edit images' },
  { id: 'gemini-2.5-flash-native-audio-preview-09-2025', name: 'Gemini Live', description: 'Real-time voice' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo Video', description: 'High-quality video generation' }
];
