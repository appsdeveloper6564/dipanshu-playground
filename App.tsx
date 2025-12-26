
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Settings2, Upload, Mic, Globe, Code, Download, Loader2, X, Image as ImageIcon,
  Terminal, Plus, MessageSquare, LogOut, Settings, Copy, Check, Play, Maximize2,
  MicOff, Sparkles, LayoutGrid, Video, Info, Trash2, Eye, EyeOff, ShieldCheck, Braces, 
  ChevronRight, FileCode, Ghost, ExternalLink, ArrowLeft
} from 'lucide-react';
import { ChatSession, ChatMessage, ModelType, MediaFile, SafetySetting } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, MODELS, SAFETY_THRESHOLDS } from './constants';
import { generateAIContent, generateVideoContent } from './services/geminiService';

const CODE_BUILDER_INSTRUCTION = "You are an expert Senior Frontend Engineer. Your goal is to help users build high-quality, modern web applications. When asked to build an app or code snippet, provide clean, production-ready code using React, Tailwind CSS, and Lucide React. Always explain technical choices briefly.";

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
  const [previewCode, setPreviewCode] = useState('');
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
        setSessions(parsed);
        if (parsed.length > 0) setActiveSessionId(parsed[0].id);
      } catch (e) { createNewSession(); }
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

  const detectedVariables = useMemo(() => {
    if (!activeSession) return [];
    const text = activeSession.systemInstruction + (inputText || '');
    const matches = text.match(/{{(.*?)}}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
  }, [activeSession, inputText]);

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

    if (activeSession.config.model.includes('native-audio')) {
      alert("This model is for Live Audio sessions only and cannot be used in standard chat. Please switch to a Gemini 3 or Flash model.");
      return;
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

    const updatedMessages = [...activeSession.messages, userMessage];
    setSessions(prev => prev.map(s => s.id === activeSession.id ? {
      ...s,
      messages: updatedMessages,
      lastModified: Date.now(),
      title: activeSession.messages.length === 0 ? inputText.slice(0, 30) : s.title
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
        setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: [...s.messages, modelMessage] } : s));
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
          timestamp: Date.now()
        };

        setSessions(prev => prev.map(s => s.id === activeSession.id ? {
          ...s,
          messages: [...s.messages, modelMessage],
          lastModified: Date.now()
        } : s));

        if (response.text.includes('```html') || response.text.includes('```xml')) {
          const codeMatch = response.text.match(/```(?:html|xml|javascript|jsx|tsx)\n([\s\S]*?)```/);
          if (codeMatch) setPreviewCode(codeMatch[1]);
        }
      }
    } catch (e: any) { 
      console.error(e);
      alert(`Generation failed: ${e.message || "Unknown error"}`); 
    } finally { setIsGenerating(false); }
  };

  const updateConfig = (key: string, value: any) => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      config: { ...s.config, [key]: value }
    } : s));
  };

  const updateVariable = (key: string, value: string) => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      variables: { ...s.variables, [key]: value }
    } : s));
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

  const generateExportCode = (lang: 'python' | 'js' | 'curl') => {
    if (!activeSession) return '';
    const model = activeSession.config.model;
    const sys = activeSession.systemInstruction;
    
    if (lang === 'python') {
      return `from google import genai\n\nclient = genai.Client(api_key="YOUR_API_KEY")\n\nresponse = client.models.generate_content(\n    model="${model}",\n    contents="${inputText || 'Hello'}",\n    config={\n        "system_instruction": "${sys}",\n        "temperature": ${activeSession.config.temperature},\n    }\n)\n\nprint(response.text)`;
    }
    if (lang === 'js') {
      return `import { GoogleGenAI } from "@google/genai";\n\nconst ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });\n\nconst response = await ai.models.generateContent({\n  model: "${model}",\n  contents: "${inputText || 'Hello'}",\n  config: {\n    systemInstruction: "${sys}",\n    temperature: ${activeSession.config.temperature}\n  }\n});\n\nconsole.log(response.text);`;
    }
    return `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=YOUR_API_KEY" \\\n-H 'Content-Type: application/json' \\\n-X POST \\\n-d '{\n  "contents": [{\n    "parts": [{"text": "${inputText || 'Hello'}"}]\n  }],\n  "system_instruction": {"parts": [{"text": "${sys}"}]},\n  "generationConfig": {\n    "temperature": ${activeSession.config.temperature}\n  }\n}'`;
  };

  const renderAdsHub = () => (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] p-12 custom-scrollbar relative">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-[#45A29E]/20 pb-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#66FCF1]/20 rounded-2xl flex items-center justify-center animate-glow">
                 <Globe size={32} className="text-[#66FCF1]" />
              </div>
              <div>
                 <h2 className="text-3xl font-bold text-white tracking-tight aqua-text-glow">Ads Hub</h2>
                 <p className="text-gray-500 mt-1">Exclusive high-performance ad formats and partnerships.</p>
              </div>
           </div>
           <button 
             onClick={() => setShowAdsHub(false)}
             className="flex items-center gap-2 px-6 py-3 bg-[#66FCF1] text-[#0B0C10] font-bold rounded-xl hover:shadow-[0_0_15px_#66FCF1] transition-all"
           >
             <ArrowLeft size={18} /> Back to Studio
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AdUnit id="eedd446f201ec86e07cc453226a8eb11" width={468} height={60} />
          <AdUnit id="8623e6419adf6e5bfa3fd0dfcd5d6824" width={160} height={300} />
          <AdUnit id="503504d5dc764e1d8570cc0e9292acf0" width={320} height={50} />
          <AdUnit id="d3a9273ab8a3a173e913d563e27511f6" width={300} height={250} />
          <AdUnit id="9425000b9be45875051c1a55e38f1444" width={160} height={600} />
          <AdUnit id="787c157f9ba5025780bd9bccc1840818" width={728} height={90} />
        </div>

        <div className="mt-16 p-8 bg-[#1F2833]/40 border border-[#66FCF1]/20 rounded-3xl text-center space-y-4">
           <Ghost size={48} className="mx-auto text-gray-600" />
           <h3 className="text-xl font-bold text-white">Want to Advertise Here?</h3>
           <p className="text-gray-400 max-w-lg mx-auto">Dipanshu-Studio reaches thousands of engineers daily. Get your product in front of the world's best developers.</p>
           <button className="px-8 py-3 bg-[#45A29E] text-white font-bold rounded-lg hover:bg-white hover:text-black transition-all">Contact Partnerships</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-[#0B0C10] text-[#C5C6C7] overflow-hidden relative">
      {/* Sidebar */}
      {!showAdsHub && (
        <div className="w-64 border-r border-[#45A29E]/20 flex flex-col bg-[#1F2833]/30 shrink-0">
          <div className="p-4 flex items-center gap-3 border-b border-[#45A29E]/20">
            <div className="w-8 h-8 bg-[#66FCF1] rounded-lg flex items-center justify-center shadow-[0_0_10px_#66FCF1]">
              <Terminal size={18} className="text-[#0B0C10]" />
            </div>
            <h1 className="font-bold text-[#66FCF1] tracking-tight">dipanshu-studio</h1>
          </div>
          <div className="p-4 space-y-2">
            <button 
              onClick={() => createNewSession()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#66FCF1]/10 text-[#66FCF1] border border-[#66FCF1]/30 rounded-lg hover:bg-[#66FCF1]/20 transition-all font-medium"
            >
              <Plus size={18} /> New Prompt
            </button>
            <button 
              onClick={() => {
                createNewSession("Vibe Builder", ModelType.GEMINI_PRO);
                updateConfig('temperature', 0.9);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#45A29E]/10 text-[#45A29E] border border-[#45A29E]/30 rounded-lg hover:bg-[#45A29E]/20 transition-all font-medium"
            >
              <Code size={18} /> Vibe Coding
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">History</div>
            {sessions.map(s => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm truncate flex items-center gap-3 transition-colors ${
                    activeSessionId === s.id ? 'bg-[#66FCF1]/10 text-[#66FCF1] border border-[#66FCF1]/20' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  {s.title}
                </button>
                <button 
                  onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[#45A29E]/20 space-y-1">
             <button className="w-full flex items-center gap-3 p-2 text-gray-400 hover:text-white text-sm transition-colors"><Settings size={14}/> Settings</button>
             <button className="w-full flex items-center gap-3 p-2 text-red-400/80 hover:text-red-400 text-sm transition-colors"><LogOut size={14}/> Logout</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!showAdsHub ? (
          <>
            <header className="h-14 border-b border-[#45A29E]/20 flex items-center justify-between px-6 bg-[#0B0C10]/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500"><ChevronRight size={14}/></span>
                  <input 
                    value={activeSession?.title || ''} 
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="bg-transparent border-none text-white font-semibold focus:ring-0 text-sm w-48"
                  />
                </div>
                <div className="flex gap-4 border-l border-gray-800 pl-4 h-6 items-center">
                  <button 
                    onClick={() => setActiveTab('prompt')}
                    className={`text-xs font-bold uppercase tracking-widest h-full border-b-2 transition-all ${activeTab === 'prompt' ? 'border-[#66FCF1] text-[#66FCF1]' : 'border-transparent text-gray-500'}`}
                  >
                    Prompt
                  </button>
                  <button 
                    onClick={() => setActiveTab('preview')}
                    className={`text-xs font-bold uppercase tracking-widest h-full border-b-2 transition-all ${activeTab === 'preview' ? 'border-[#66FCF1] text-[#66FCF1]' : 'border-transparent text-gray-500'}`}
                  >
                    Preview {previewCode && <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('code')}
                    className={`text-xs font-bold uppercase tracking-widest h-full border-b-2 transition-all ${activeTab === 'code' ? 'border-[#66FCF1] text-[#66FCF1]' : 'border-transparent text-gray-500'}`}
                  >
                    Get Code
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => copyToClipboard(JSON.stringify(activeSession, null, 2))} className="px-3 py-1.5 border border-[#45A29E]/30 rounded text-[10px] font-bold uppercase hover:bg-white/5 transition-all">JSON Export</button>
                 <button className="px-4 py-1.5 bg-[#66FCF1] text-[#0B0C10] font-bold rounded text-xs hover:shadow-[0_0_10px_#66FCF1] transition-all">Save Changes</button>
              </div>
            </header>

            {activeTab === 'prompt' ? (
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0C10]">
                  <div className="p-4 border-b border-[#45A29E]/10 space-y-3 bg-[#1F2833]/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#45A29E] uppercase tracking-widest flex items-center gap-2"><Braces size={12}/> System Instruction</span>
                      <div className="flex gap-2 text-[10px] text-gray-600">
                        <span>Est. Tokens: {Math.ceil((activeSession?.systemInstruction.length || 0) / 4)}</span>
                      </div>
                    </div>
                    <textarea 
                      value={activeSession?.systemInstruction || ''}
                      onChange={(e) => setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, systemInstruction: e.target.value } : s))}
                      placeholder="Set context (use {{var}} for variables)"
                      className="w-full h-20 bg-[#0B0C10] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#66FCF1] focus:ring-1 focus:ring-[#66FCF1]/20 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                    />
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {activeSession?.messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 select-none">
                        <div className="w-20 h-20 rounded-3xl bg-[#1F2833] flex items-center justify-center animate-glow">
                          <Sparkles size={40} className="text-[#66FCF1]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">Ready for Engineering</h3>
                          <p className="text-sm max-w-sm">Enter a prompt below or use a variable template to start building. Supports text, vision, images, and video.</p>
                        </div>
                      </div>
                    ) : (
                      activeSession.messages.map((m) => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs shadow-lg ${m.role === 'user' ? 'bg-[#45A29E] text-white' : 'bg-[#66FCF1] text-black'}`}>
                            {m.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-[#1F2833] border border-white/5' : 'bg-[#0B0C10] border border-gray-800'}`}>
                              {m.parts.map((p, i) => (
                                <div key={i}>
                                  {p.text && renderMessageContent(p.text)}
                                  {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="mt-3 rounded-xl max-w-md border border-white/10 mx-auto shadow-2xl" alt="Vision input" />}
                                </div>
                              ))}
                              {m.videoUrl && <video src={m.videoUrl} controls className="mt-3 rounded-xl border border-white/10 w-full shadow-2xl" />}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {isGenerating && <div className="flex gap-2 items-center text-xs text-[#66FCF1] animate-pulse pl-12"><Loader2 size={14} className="animate-spin"/> Thinking...</div>}
                  </div>

                  {detectedVariables.length > 0 && (
                    <div className="px-6 py-4 bg-[#1F2833]/40 border-t border-[#45A29E]/20">
                       <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-[#66FCF1] uppercase tracking-widest"><Braces size={12}/> Variable Inputs</div>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {detectedVariables.map(v => (
                            <div key={v} className="space-y-1">
                              <label className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><Info size={10}/> {v}</label>
                              <input 
                                value={activeSession?.variables[v] || ''} 
                                onChange={(e) => updateVariable(v, e.target.value)}
                                className="w-full bg-[#0B0C10] border border-gray-700 rounded-md px-3 py-1.5 text-xs focus:border-[#66FCF1] outline-none transition-all"
                                placeholder={`Define ${v}...`}
                              />
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="p-4 border-t border-[#45A29E]/10 bg-[#0B0C10]">
                    <div className="max-w-4xl mx-auto flex items-end gap-2 bg-[#1F2833]/20 p-2 rounded-2xl border border-gray-800 focus-within:border-[#66FCF1]/50 transition-all shadow-inner">
                      <div className="flex flex-col gap-1 p-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:text-[#66FCF1] transition-colors"><Upload size={20}/></button>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          (Array.from(files) as File[]).forEach((file: File) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setAttachedFiles(prev => [...prev, {
                                id: Date.now().toString() + Math.random(),
                                data: ev.target?.result as string,
                                mimeType: file.type,
                                name: file.name
                              }]);
                            };
                            reader.readAsDataURL(file);
                          });
                        }} />
                        <button onClick={() => setIsListening(!isListening)} className={`p-2.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-[#66FCF1]'}`}><Mic size={20}/></button>
                      </div>
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder="Ask anything... Use {{variable}} to parameterize."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-4 px-2 resize-none h-14 max-h-48 text-white custom-scrollbar outline-none"
                      />
                      <button onClick={handleSendMessage} disabled={isGenerating} className="p-4 bg-[#66FCF1] text-[#0B0C10] rounded-xl hover:shadow-[0_0_20px_#66FCF1] disabled:opacity-50 mb-1 mr-1 transition-all">
                        <Send size={20} />
                      </button>
                    </div>
                    <div className="max-w-4xl mx-auto flex gap-2 mt-2 px-2 overflow-x-auto pb-2">
                       {attachedFiles.map(f => (
                         <div key={f.id} className="relative group shrink-0">
                            <div className="w-12 h-12 rounded-lg border border-gray-700 overflow-hidden shadow-lg">
                               <img src={f.data} className="w-full h-full object-cover" alt="attachment" />
                            </div>
                            <button onClick={() => setAttachedFiles(p => p.filter(x => x.id !== f.id))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg"><X size={10}/></button>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="w-80 border-l border-[#45A29E]/20 bg-[#1F2833]/20 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar shrink-0 pb-24">
                   <div>
                     <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutGrid size={14}/> Model Engine</h3>
                     <select 
                        value={activeSession?.config.model} 
                        onChange={(e) => updateConfig('model', e.target.value)}
                        className="w-full bg-[#0B0C10] border border-gray-700 text-sm rounded-lg p-3 focus:border-[#66FCF1] outline-none shadow-xl transition-all"
                     >
                       {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                     </select>
                   </div>

                   <div className="space-y-6">
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                          <span>Temperature</span>
                          <span className="text-[#66FCF1]">{activeSession?.config.temperature}</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={activeSession?.config.temperature} onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))} className="w-full accent-[#66FCF1] h-1.5 bg-gray-800 rounded-lg cursor-pointer" />
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                          <span>Max Output Tokens</span>
                          <span className="text-[#66FCF1]">{activeSession?.config.maxOutputTokens}</span>
                        </div>
                        <input type="number" value={activeSession?.config.maxOutputTokens} onChange={(e) => updateConfig('maxOutputTokens', parseInt(e.target.value))} className="w-full bg-[#0B0C10] border border-gray-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#66FCF1]" />
                     </div>
                     <div className="flex items-center justify-between p-3 bg-[#0B0C10] border border-gray-800 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Google Search</span>
                        <button 
                          onClick={() => updateConfig('grounding', !activeSession?.config.grounding)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${activeSession?.config.grounding ? 'bg-[#66FCF1]' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${activeSession?.config.grounding ? 'right-1' : 'left-1'}`} />
                        </button>
                     </div>
                   </div>

                   <div className="border-t border-gray-800 pt-6">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500"/> Content Safety</h3>
                      <div className="space-y-4">
                        {activeSession?.config.safetySettings.map((s, idx) => (
                          <div key={s.category} className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-mono">{s.category.replace(/_/g, ' ')}</label>
                            <select 
                              value={s.threshold}
                              onChange={(e) => {
                                const newSettings = [...activeSession.config.safetySettings];
                                newSettings[idx].threshold = e.target.value as any;
                                updateConfig('safetySettings', newSettings);
                              }}
                              className="w-full bg-[#0B0C10] border border-gray-700 text-[10px] rounded p-2 outline-none hover:border-[#66FCF1]/30 transition-all"
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
              <div className="flex-1 bg-white p-0 relative">
                 {previewCode ? (
                   <iframe 
                     srcDoc={`
                       <!DOCTYPE html>
                       <html>
                         <head>
                           <script src="https://cdn.tailwindcss.com"></script>
                           <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
                         </head>
                         <body class="bg-gray-50">${previewCode}</body>
                       </html>
                     `}
                     className="w-full h-full border-none"
                     title="AI Code Preview"
                   />
                 ) : (
                   <div className="h-full flex items-center justify-center bg-[#0B0C10] text-gray-600 flex-col gap-4">
                     <Terminal size={48} />
                     <p className="text-sm font-medium">No executable HTML code detected in this session.</p>
                     <button onClick={() => setActiveTab('prompt')} className="px-4 py-2 border border-gray-700 rounded-lg text-xs hover:bg-white/5">Back to Editor</button>
                   </div>
                 )}
                 {previewCode && (
                   <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => copyToClipboard(previewCode)} className="bg-[#66FCF1] text-black px-4 py-2 rounded-lg text-xs font-bold shadow-2xl flex items-center gap-2 hover:bg-white transition-all">
                         <Copy size={12}/> Copy HTML
                      </button>
                   </div>
                 )}
              </div>
            ) : (
              /* Get Code Tab */
              <div className="flex-1 overflow-y-auto p-12 bg-[#0B0C10] custom-scrollbar">
                 <div className="max-w-4xl mx-auto space-y-12 pb-24">
                    <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
                       <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <FileCode size={24} className="text-emerald-400" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-bold text-white">SDK Implementation</h2>
                          <p className="text-sm text-gray-500">Copy these snippets to implement this prompt in your own application.</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><ChevronRight size={14}/> Python Snippet</h3>
                       <CodeBlock code={generateExportCode('python')} language="python" />
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><ChevronRight size={14}/> JavaScript Snippet</h3>
                       <CodeBlock code={generateExportCode('js')} language="javascript" />
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-[#66FCF1] uppercase tracking-widest flex items-center gap-2"><ChevronRight size={14}/> cURL Request</h3>
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

      {/* Persistent Navigation to Ads Hub - Fixed Right Bottom */}
      <button 
        onClick={() => setShowAdsHub(!showAdsHub)}
        className="fixed bottom-[90px] right-8 z-[10000] group flex items-center gap-3 bg-[#1F2833] border border-[#66FCF1]/30 p-3 rounded-full hover:bg-[#66FCF1] hover:text-[#0B0C10] transition-all shadow-[0_0_20px_rgba(102,252,241,0.2)]"
        title={showAdsHub ? "Return to Studio" : "Visit Ads Hub"}
      >
        <div className={`p-2 rounded-full ${showAdsHub ? 'bg-red-500 text-white' : 'bg-[#66FCF1] text-[#0B0C10]'}`}>
          {showAdsHub ? <X size={20} /> : <ExternalLink size={20} />}
        </div>
        {!showAdsHub && (
          <span className="text-xs font-bold uppercase tracking-widest pr-4 opacity-0 group-hover:opacity-100 transition-opacity">Ads Hub</span>
        )}
      </button>

      {/* Sidebar Overlay on Ads Hub if needed - but here we just replace the whole main area */}
    </div>
  );
};

export default App;
