
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Settings2, Upload, Mic, Globe, Code, Download, Loader2, X, Image as ImageIcon,
  Terminal, Plus, MessageSquare, LogOut, Settings, Copy, Check, Play, Maximize2,
  MicOff, Sparkles, LayoutGrid, Video, Info, Trash2, Eye, EyeOff, ShieldCheck, Braces, 
  ChevronRight, FileCode, Ghost, ExternalLink, ArrowLeft, Zap, Layers
} from 'lucide-react';
import { ChatSession, ChatMessage, ModelType, MediaFile, SafetySetting } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, MODELS, SAFETY_THRESHOLDS } from './constants';
import { generateAIContent, generateVideoContent } from './services/geminiService';

// Fixed Window interface declaration with correct AIStudio type
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio: AIStudio;
  }
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dipanshu-snippet.${language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group my-4 rounded-xl border border-[#45A29E]/20 overflow-hidden bg-[#0B0C10] text-left">
      <div className="bg-[#1F2833] px-4 py-2 border-b border-[#45A29E]/10 flex justify-between items-center">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{language || 'code'}</span>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-[#66FCF1] transition-colors" title="Download snippet"><Download size={14} /></button>
          <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-[#66FCF1] transition-colors" title="Copy snippet">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto custom-scrollbar text-sm leading-relaxed">
        <code className="text-emerald-300 font-mono">{code}</code>
      </pre>
    </div>
  );
};

const AdUnit: React.FC<{ id: string; width: number; height: number; format?: string }> = ({ id, width, height, format = 'iframe' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.innerHTML = `
        atOptions = {
          'key' : '${id}',
          'format' : '${format}',
          'height' : ${height},
          'width' : ${width},
          'params' : {}
        };
      `;
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `https://www.highperformanceformat.com/${id}/invoke.js`;
      
      containerRef.current.appendChild(script);
      containerRef.current.appendChild(invokeScript);
    }
  }, [id, width, height, format]);

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-[#1F2833]/40 border border-[#45A29E]/10 rounded-xl overflow-hidden shadow-lg">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest self-start px-2 py-1 bg-[#0B0C10] rounded mb-2">Ad Space: {width}x{height}</div>
      <div ref={containerRef} className="flex justify-center w-full" style={{ minHeight: height, minWidth: width }}></div>
    </div>
  );
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<MediaFile[]>([]);
  const [activeTab, setActiveTab] = useState<'prompt' | 'preview' | 'code'>('prompt');
  const [showAdsHub, setShowAdsHub] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('dipanshu_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) { 
        createNewSession(); 
      }
    } else {
      createNewSession();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onresult = (event: any) => {
        setInputText(prev => prev + ' ' + event.results[0][0].transcript);
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('dipanshu_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSessionId, isGenerating, sessions]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);

  const previewCode = useMemo(() => {
    if (!activeSession?.messages) return '';
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      const msg = activeSession.messages[i];
      if (msg.role === 'model' && msg.parts) {
        for (const part of msg.parts) {
          if (part.text) {
            const codeMatch = part.text.match(/```(?:html|xml|javascript|jsx|tsx|svg|css)\n([\s\S]*?)```/);
            if (codeMatch) return codeMatch[1];
          }
        }
      }
    }
    return '';
  }, [activeSession]);

  const detectedVariables = useMemo(() => {
    if (!activeSession) return [];
    const text = (activeSession.systemInstruction || '') + (inputText || '');
    const matches = text.match(/{{(.*?)}}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
  }, [activeSession, inputText]);

  const generateExportCode = (lang: string) => {
    if (!activeSession) return '';
    const model = activeSession.config?.model || 'gemini-3-flash-preview';
    const systemInstruction = activeSession.systemInstruction || '';
    
    if (lang === 'python') {
      return `import google.generativeai as genai
import os

# Set up the API key (replace with your environment variable or string)
genai.configure(api_key=os.environ.get("API_KEY", "YOUR_API_KEY"))

model = genai.GenerativeModel(
    model_name="${model}",
    system_instruction="${systemInstruction.replace(/"/g, '\\"')}"
)

response = model.generate_content("Hello!")
print(response.text)`;
    }
    
    if (lang === 'js') {
      return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const response = await ai.models.generateContent({
  model: "${model}",
  contents: "Hello!",
  config: {
    systemInstruction: "${systemInstruction.replace(/"/g, '\\"')}"
  }
});

console.log(response.text);`;
    }
    
    if (lang === 'curl') {
      return `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=\${API_KEY}" \\
-H "Content-Type: application/json" \\
-d '{
  "contents": [{
    "parts": [{"text": "Hello!"}]
  }],
  "systemInstruction": {
    "parts": [{"text": "${systemInstruction.replace(/"/g, '\\"')}"}]
  }
}'`;
    }
    return '';
  };

  const renderAdsHub = () => (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#0B0C10]">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-gray-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <ExternalLink size={28} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Ads Hub</h2>
              <p className="text-sm text-gray-500">Promotional segments and studio insights.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAdsHub(false)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AdUnit id="ad-unit-1" width={300} height={250} />
          <AdUnit id="ad-unit-2" width={300} height={250} />
          <AdUnit id="ad-unit-top" width={728} height={90} />
        </div>
      </div>
    </div>
  );

  const createNewSession = (title = "New Prompt", model = ModelType.GEMINI_FLASH) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: [],
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      variables: {},
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
        stopSequences: [],
        model: model as any,
        grounding: false,
        aspectRatio: "1:1",
        safetySettings: [
          { category: 'HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      },
      lastModified: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    if (!activeSession) return;

    // API Key selection logic for Veo and Imagen Pro
    const isVeoModel = activeSession.config?.model === ModelType.VEO_VIDEO;
    const isGeminiProImage = activeSession.config?.model === ModelType.GEMINI_IMAGE_PRO;
    
    if (isVeoModel || isGeminiProImage) {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [
        ...(inputText ? [{ text: inputText }] : []),
        ...attachedFiles.map(f => ({
          inlineData: { data: f.data.split(',')[1], mimeType: f.mimeType }
        }))
      ],
      timestamp: Date.now()
    };

    const updatedMessages = [...(activeSession.messages || []), userMessage];
    const targetId = activeSession.id;

    setSessions(prev => prev.map(s => s.id === targetId ? {
      ...s,
      messages: updatedMessages,
      lastModified: Date.now(),
      title: (s.messages?.length === 0) ? (inputText.slice(0, 30) || "Visual Analysis") : s.title
    } : s));

    setInputText('');
    setAttachedFiles([]);
    setIsGenerating(true);

    try {
      if (activeSession.config.model === ModelType.VEO_VIDEO) {
        const url = await generateVideoContent(inputText || "Cinematic video");
        const modelMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          parts: [{ text: "Generated Video:" }],
          timestamp: Date.now(),
          videoUrl: url
        };
        setSessions(prev => prev.map(s => s.id === targetId ? { ...s, messages: [...(s.messages || []), modelMessage] } : s));
      } else {
        const response = await generateAIContent(
          activeSession.config.model,
          updatedMessages,
          activeSession.systemInstruction,
          activeSession.config,
          activeSession.variables
        );

        const modelMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          parts: [
            ...(response.text ? [{ text: response.text }] : []),
            ...(response.imagePart ? [response.imagePart] : [])
          ],
          timestamp: Date.now(),
          groundingMetadata: response.groundingMetadata
        };

        setSessions(prev => prev.map(s => s.id === targetId ? {
          ...s,
          messages: [...(s.messages || []), modelMessage],
          lastModified: Date.now()
        } : s));
      }
    } catch (e: any) { 
      console.error("Generation failed:", e);
      if (e.message?.includes("Requested entity was not found") && typeof window.aistudio?.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      }
      alert(`Generation failed: ${e.message || "Unknown error"}`); 
    } finally { setIsGenerating(false); }
  };

  const updateConfig = (key: string, value: any) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      config: { ...s.config, [key]: value }
    } : s));
  };

  const updateVariable = (key: string, value: string) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      variables: { ...s.variables, [key]: value }
    } : s));
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/```(\w+)?/);
    return parts.map((part, i) => {
      if (i % 2 === 1) return null;
      if (i > 0 && i % 2 === 0) {
        const lang = parts[i-1] || 'code';
        return <CodeBlock key={i} code={part.trim()} language={lang} />;
      }
      return <div key={i} className="whitespace-pre-wrap">{part}</div>;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const renderEmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-8 select-none">
      <div className="relative">
        <div className="absolute inset-0 bg-[#66FCF1]/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-[#1F2833] to-[#0B0C10] flex items-center justify-center border border-[#66FCF1]/30 relative z-10 shadow-2xl">
          <Zap size={48} className="text-[#66FCF1] drop-shadow-[0_0_10px_rgba(102,252,241,0.5)]" />
        </div>
      </div>
      <div className="space-y-3 relative z-10">
        <h3 className="text-3xl font-extrabold text-white tracking-tight">AI Playground</h3>
        <p className="text-[#45A29E] max-w-sm text-lg font-medium">Build, create, and engineering with next-gen models.</p>
        <div className="flex gap-4 justify-center mt-6">
          <button 
            onClick={() => createNewSession("Vibe Builder", ModelType.GEMINI_PRO)}
            className="flex items-center gap-2 px-6 py-3 bg-[#66FCF1]/10 border border-[#66FCF1]/30 rounded-xl text-[#66FCF1] hover:bg-[#66FCF1]/20 transition-all font-bold"
          >
            <Code size={18} /> Vibe Code
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-[#0B0C10] text-[#C5C6C7] overflow-hidden relative pb-[85px]">
      {/* Sidebar */}
      {!showAdsHub && (
        <div className="w-64 border-r border-[#45A29E]/20 flex flex-col bg-[#1F2833]/30 shrink-0 z-20">
          <div className="p-4 flex items-center gap-3 border-b border-[#45A29E]/20 bg-[#0B0C10]/40">
            <div className="w-8 h-8 bg-[#66FCF1] rounded-lg flex items-center justify-center shadow-[0_0_10px_#66FCF1]">
              <Terminal size={18} className="text-[#0B0C10]" />
            </div>
            <h1 className="font-bold text-[#66FCF1] tracking-tight">dipanshu-studio</h1>
          </div>
          <div className="p-4 space-y-2">
            <button 
              onClick={() => createNewSession()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#66FCF1]/10 text-[#66FCF1] border border-[#66FCF1]/30 rounded-xl hover:bg-[#66FCF1]/20 transition-all font-bold text-sm shadow-sm"
            >
              <Plus size={18} /> New Prompt
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
            <div className="px-3 py-4 text-[10px] font-bold text-[#45A29E] uppercase tracking-widest">History</div>
            {sessions.map(s => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-xl text-sm truncate flex items-center gap-3 transition-all ${
                    activeSessionId === s.id ? 'bg-[#66FCF1]/10 text-[#66FCF1] border border-[#66FCF1]/20 shadow-sm' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[#45A29E]/10 bg-[#0B0C10]/40 space-y-1">
             <button className="w-full flex items-center gap-3 p-2 text-gray-500 hover:text-white text-sm transition-colors"><Settings size={16}/> Settings</button>
             <button className="w-full flex items-center gap-3 p-2 text-red-400/80 hover:text-red-400 text-sm transition-colors"><LogOut size={16}/> Logout</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0B0C10] relative z-10">
        {!showAdsHub ? (
          <>
            <header className="h-14 border-b border-[#45A29E]/20 flex items-center justify-between px-6 bg-[#0B0C10]/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0"><ChevronRight size={14}/></span>
                  <input 
                    value={activeSession?.title || ''} 
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="bg-transparent border-none text-white font-bold focus:ring-0 text-sm w-48 truncate"
                  />
                </div>
                <div className="flex gap-4 border-l border-gray-800 pl-4 h-6 items-center shrink-0">
                  {(['prompt', 'preview', 'code'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-bold uppercase tracking-widest h-full border-b-2 transition-all ${activeTab === tab ? 'border-[#66FCF1] text-[#66FCF1]' : 'border-transparent text-gray-500'}`}
                    >
                      {tab} {tab === 'preview' && previewCode && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                 <button onClick={() => copyToClipboard(JSON.stringify(activeSession, null, 2))} className="px-3 py-1.5 border border-[#45A29E]/30 rounded-lg text-[10px] font-bold uppercase hover:bg-[#1F2833] transition-all">JSON</button>
                 <button className="px-4 py-1.5 bg-[#66FCF1] text-[#0B0C10] font-bold rounded-lg text-xs hover:shadow-[0_0_15px_#66FCF1] transition-all">Save</button>
              </div>
            </header>

            {activeTab === 'prompt' ? (
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-[#45A29E]/10 space-y-3 bg-[#1F2833]/10 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#45A29E] uppercase tracking-widest flex items-center gap-2"><Braces size={12}/> System Instruction</span>
                    </div>
                    <textarea 
                      value={activeSession?.systemInstruction || ''}
                      onChange={(e) => setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, systemInstruction: e.target.value } : s))}
                      placeholder="Expert AI instruction..."
                      className="w-full h-16 bg-[#0B0C10] border border-gray-800 rounded-xl p-3 text-sm focus:border-[#66FCF1] focus:ring-1 focus:ring-[#66FCF1]/20 outline-none transition-all resize-none custom-scrollbar"
                    />
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {(!activeSession || !activeSession.messages || activeSession.messages.length === 0) ? (
                      renderEmptyState()
                    ) : (
                      activeSession.messages.map((m) => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-[10px] shadow-lg ${m.role === 'user' ? 'bg-[#45A29E] text-white' : 'bg-[#66FCF1] text-black'}`}>
                            {m.role === 'user' ? 'ME' : 'AI'}
                          </div>
                          <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-[#1F2833] border border-white/5' : 'bg-[#121212] border border-gray-800'}`}>
                              {m.parts?.map((p, i) => (
                                <div key={i}>
                                  {p.text && renderMessageContent(p.text)}
                                  {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="mt-3 rounded-2xl max-w-md border border-white/10 mx-auto shadow-2xl" alt="Vision" />}
                                </div>
                              ))}
                              {m.videoUrl && <video src={m.videoUrl} controls className="mt-3 rounded-2xl border border-white/10 w-full shadow-2xl" />}
                              
                              {/* Grounding metadata display - Required for search/maps grounding */}
                              {m.groundingMetadata?.groundingChunks && (
                                <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                                  <div className="text-[10px] font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2">
                                    <Globe size={12}/> Sources
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {m.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
                                      const source = chunk.web || chunk.maps;
                                      if (!source?.uri) return null;
                                      return (
                                        <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-[#1F2833] hover:bg-[#66FCF1]/20 text-gray-400 hover:text-[#66FCF1] px-2 py-1 rounded border border-[#45A29E]/20 transition-all flex items-center gap-1">
                                          {source.title || 'Source'} <ExternalLink size={10}/>
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {isGenerating && <div className="flex gap-2 items-center text-xs text-[#66FCF1] animate-pulse pl-12"><Loader2 size={14} className="animate-spin"/> AI is thinking...</div>}
                  </div>

                  {detectedVariables.length > 0 && (
                    <div className="px-6 py-4 bg-[#1F2833]/40 border-t border-[#45A29E]/20 shrink-0">
                       <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-[#66FCF1] uppercase tracking-widest"><Braces size={12}/> Variables</div>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {detectedVariables.map(v => (
                            <div key={v} className="space-y-1">
                              <label className="text-[10px] text-gray-500 font-mono truncate block">{v}</label>
                              <input 
                                value={activeSession?.variables[v] || ''} 
                                onChange={(e) => updateVariable(v, e.target.value)}
                                className="w-full bg-[#0B0C10] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:border-[#66FCF1] outline-none transition-all"
                                placeholder="..."
                              />
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="p-4 border-t border-[#45A29E]/10 bg-[#0B0C10] shrink-0">
                    <div className="max-w-4xl mx-auto flex items-end gap-2 bg-[#1F2833]/20 p-2 rounded-2xl border border-gray-800 focus-within:border-[#66FCF1]/50 transition-all shadow-inner">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:text-[#66FCF1] transition-colors"><Upload size={18}/></button>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          Array.from(files).forEach((file: File) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setAttachedFiles(prev => [...prev, {
                                id: Math.random().toString(),
                                data: ev.target?.result as string,
                                mimeType: file.type,
                                name: file.name
                              }]);
                            };
                            reader.readAsDataURL(file);
                          });
                        }} />
                        <button onClick={() => setIsListening(!isListening)} className={`p-2.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-[#66FCF1]'}`}><Mic size={18}/></button>
                      </div>
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder="Build something amazing..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 resize-none h-12 max-h-48 text-white custom-scrollbar outline-none"
                      />
                      <button onClick={handleSendMessage} disabled={isGenerating} className="p-3.5 bg-[#66FCF1] text-[#0B0C10] rounded-xl hover:shadow-[0_0_20px_#66FCF1] disabled:opacity-50 transition-all shrink-0">
                        <Send size={18} />
                      </button>
                    </div>
                    {attachedFiles.length > 0 && (
                      <div className="max-w-4xl mx-auto flex gap-2 mt-3 px-2 overflow-x-auto pb-2 custom-scrollbar">
                         {attachedFiles.map(f => (
                           <div key={f.id} className="relative group shrink-0">
                              <div className="w-14 h-14 rounded-xl border border-gray-700 overflow-hidden shadow-lg bg-gray-900 flex items-center justify-center">
                                 {f.mimeType.startsWith('image/') ? <img src={f.data} className="w-full h-full object-cover" /> : <FileCode size={20} className="text-gray-500"/>}
                              </div>
                              <button onClick={() => setAttachedFiles(p => p.filter(x => x.id !== f.id))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X size={10}/></button>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-80 border-l border-[#45A29E]/20 bg-[#1F2833]/10 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar shrink-0">
                   <div>
                     <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutGrid size={14}/> Engine</h3>
                     <select 
                        value={activeSession?.config.model} 
                        onChange={(e) => updateConfig('model', e.target.value)}
                        className="w-full bg-[#0B0C10] border border-gray-700 text-sm rounded-xl p-3.5 focus:border-[#66FCF1] outline-none shadow-xl transition-all"
                     >
                       {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                     </select>
                   </div>

                   <div className="space-y-6">
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                          <span>Temperature</span>
                          <span className="text-[#66FCF1]">{activeSession?.config.temperature}</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={activeSession?.config.temperature || 0.7} onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))} className="w-full accent-[#66FCF1] h-1.5 bg-gray-800 rounded-lg cursor-pointer" />
                     </div>
                     <div className="flex items-center justify-between p-4 bg-[#0B0C10]/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Google Search</span>
                        <button 
                          onClick={() => updateConfig('grounding', !activeSession?.config.grounding)}
                          className={`w-10 h-5 rounded-full relative transition-all ${activeSession?.config.grounding ? 'bg-[#66FCF1]' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${activeSession?.config.grounding ? 'right-1' : 'left-1'}`} />
                        </button>
                     </div>
                   </div>

                   <div className="border-t border-gray-800 pt-6">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={14} className="text-[#66FCF1]"/> Safety</h3>
                      <div className="space-y-4">
                        {activeSession?.config?.safetySettings?.map((s, idx) => (
                          <div key={s.category} className="space-y-1">
                            <label className="text-[10px] text-gray-600 uppercase font-mono">{s.category.replace(/_/g, ' ')}</label>
                            <select 
                              value={s.threshold}
                              onChange={(e) => {
                                if (!activeSession.config.safetySettings) return;
                                const newSettings = [...activeSession.config.safetySettings];
                                newSettings[idx].threshold = e.target.value as any;
                                updateConfig('safetySettings', newSettings);
                              }}
                              className="w-full bg-[#0B0C10] border border-gray-700 text-[10px] rounded-lg p-2 outline-none hover:border-[#66FCF1]/30 transition-all"
                            >
                              {SAFETY_THRESHOLDS.map(t => <option key={t} value={t}>{t.replace(/BLOCK_|AND_ABOVE/g, '').replace(/_/g, ' ')}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            ) : activeTab === 'preview' ? (
              <div className="flex-1 bg-white p-0 relative overflow-hidden">
                 {previewCode ? (
                   <iframe 
                     srcDoc={`
                       <!DOCTYPE html>
                       <html>
                         <head>
                           <script src="https://cdn.tailwindcss.com"></script>
                           <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
                         </head>
                         <body class="bg-gray-50 p-6">${previewCode}</body>
                       </html>
                     `}
                     className="w-full h-full border-none"
                     title="Code Preview"
                   />
                 ) : (
                   <div className="h-full flex items-center justify-center bg-[#0B0C10] text-gray-600 flex-col gap-4">
                     <Terminal size={48} className="opacity-20"/>
                     <p className="text-sm font-medium tracking-tight">No code block found in conversation.</p>
                     <button onClick={() => setActiveTab('prompt')} className="px-5 py-2 border border-gray-800 rounded-xl text-xs hover:bg-white/5 transition-all">Back to Prompt</button>
                   </div>
                 )}
                 {previewCode && (
                   <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => copyToClipboard(previewCode)} className="bg-[#66FCF1] text-[#0B0C10] px-4 py-2 rounded-xl text-xs font-extrabold shadow-2xl flex items-center gap-2 hover:bg-white transition-all">
                         <Copy size={14}/> Copy Code
                      </button>
                   </div>
                 )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-12 bg-[#0B0C10] custom-scrollbar">
                 <div className="max-w-4xl mx-auto space-y-12">
                    <div className="flex items-center gap-4 border-b border-gray-800 pb-8">
                       <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                          <FileCode size={28} className="text-emerald-400" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-white tracking-tight uppercase">SDK Integration</h2>
                          <p className="text-sm text-gray-500">Copy implementation code for your projects.</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-xs font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Python Implementation</h3>
                       <CodeBlock code={generateExportCode('python')} language="python" />
                       
                       <h3 className="text-xs font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> JavaScript SDK</h3>
                       <CodeBlock code={generateExportCode('js')} language="javascript" />
                       
                       <h3 className="text-xs font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> REST API (cURL)</h3>
                       <CodeBlock code={generateExportCode('curl')} language="bash" />
                    </div>
                 </div>
              </div>
            )}
          </>
        ) : (
          renderAdsHub()
        )}
      </div>

      {/* Persistent Navigation to Ads Hub */}
      <button 
        onClick={() => setShowAdsHub(!showAdsHub)}
        className="fixed bottom-[100px] right-8 z-[100] group flex items-center gap-3 bg-[#1F2833] border border-[#66FCF1]/30 p-3.5 rounded-2xl hover:bg-[#66FCF1] hover:text-[#0B0C10] transition-all shadow-2xl"
      >
        <div className={`p-2 rounded-xl ${showAdsHub ? 'bg-red-500 text-white' : 'bg-[#66FCF1] text-[#0B0C10]'}`}>
          {showAdsHub ? <X size={20} /> : <ExternalLink size={20} />}
        </div>
        {!showAdsHub && (
          <span className="text-[10px] font-black uppercase tracking-[0.2em] pr-4 opacity-0 group-hover:opacity-100 transition-all">Ads Hub</span>
        )}
      </button>
    </div>
  );
};

export default App;
