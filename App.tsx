
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Settings2, 
  Upload, 
  Mic, 
  Globe, 
  Code, 
  Download,
  Loader2,
  AlertCircle,
  X,
  History as HistoryIcon,
  Image as ImageIcon,
  Terminal,
  ChevronRight,
  Plus,
  MessageSquare,
  LogOut,
  Settings,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { ChatSession, ChatMessage, ModelType, MediaFile } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, MODELS } from './constants';
import { generateAIContent } from './services/geminiService';

const CODE_BUILDER_INSTRUCTION = "You are an expert Senior Frontend Engineer. Your goal is to help users build high-quality, modern web applications. When asked to build an app or code snippet, provide clean, production-ready code using React, Tailwind CSS, and Lucide React. Always explain your technical choices briefly and ensure the code is modular and accessible.";

const Sidebar: React.FC<{
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onVibeCoding: () => void;
  onDeleteSession: (id: string) => void;
}> = ({ sessions, activeSessionId, onSelectSession, onNewSession, onVibeCoding, onDeleteSession }) => (
  <div className="w-64 h-full bg-[#1F2833] flex flex-col border-r border-[#45A29E]/20 shrink-0">
    <div className="p-4 border-b border-[#45A29E]/20">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-[#66FCF1] rounded-lg flex items-center justify-center shadow-[0_0_10px_#66FCF1]">
          <Terminal className="text-[#0B0C10] w-5 h-5" />
        </div>
        <span className="font-bold text-lg text-[#66FCF1] aqua-text-glow">AI Studio</span>
      </div>
      <button 
        onClick={onNewSession}
        className="w-full flex items-center justify-center gap-2 bg-[#66FCF1]/10 hover:bg-[#66FCF1]/20 text-[#66FCF1] p-3 rounded-lg border border-[#66FCF1]/30 transition-all aqua-glow mb-2"
      >
        <Plus size={18} />
        <span className="font-medium">New Prompt</span>
      </button>
      <button 
        onClick={onVibeCoding}
        className="w-full flex items-center justify-center gap-2 bg-[#45A29E]/10 hover:bg-[#45A29E]/20 text-[#45A29E] p-3 rounded-lg border border-[#45A29E]/30 transition-all mb-4"
      >
        <Code size={18} />
        <span className="font-medium">Vibe Coding</span>
      </button>
    </div>
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
      <div className="px-2 py-3 text-xs font-semibold text-[#45A29E] uppercase tracking-wider">Recent Sessions</div>
      <div className="space-y-1">
        {sessions.map(session => (
          <div key={session.id} className="group relative">
            <button
              onClick={() => onSelectSession(session.id)}
              className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors ${
                activeSessionId === session.id 
                  ? 'bg-[#66FCF1]/10 text-[#66FCF1] border-l-2 border-[#66FCF1]' 
                  : 'text-gray-400 hover:bg-[#1F2833]/50 hover:text-white'
              }`}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate flex-1 text-sm">{session.title || 'Untitled Prompt'}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {sessions.length === 0 && <p className="text-center text-xs text-gray-600 mt-4">No history yet</p>}
      </div>
    </div>
    <div className="p-4 border-t border-[#45A29E]/20 bg-[#0B0C10]/40">
      <div className="flex flex-col gap-1">
        <button className="flex items-center gap-3 p-2 text-gray-400 hover:text-white text-sm transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-3 p-2 text-red-400/80 hover:text-red-400 text-sm transition-colors mt-2">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  </div>
);

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
    a.download = `app-code.${language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group my-4 rounded-xl border border-[#45A29E]/20 overflow-hidden bg-[#0B0C10]">
      <div className="bg-[#1F2833] px-4 py-2 border-b border-[#45A29E]/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          <span className="text-[10px] text-gray-500 uppercase font-bold ml-2 tracking-widest">{language || 'code'}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-[#66FCF1] transition-colors"
            title="Download code"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-[#66FCF1] transition-colors"
            title="Copy to clipboard"
          >
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

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_studio_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated = parsed.map((s: ChatSession) => ({
            ...s,
            messages: (s.messages || []).map((m: ChatMessage) => ({
              ...m,
              parts: (m.parts || []).filter(p => p && (typeof p.text === 'string' || p.inlineData))
            }))
          }));
          setSessions(validated);
          setActiveSessionId(validated[0].id);
        } else {
          createNewSession();
        }
      } catch (e) { createNewSession(); }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('ai_studio_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, isGenerating]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createNewSession = (title = "New Prompt", model = ModelType.GEMINI_FLASH) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: [],
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        model,
        grounding: false,
        aspectRatio: "1:1"
      },
      lastModified: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const startVibeCoding = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "Vibe Code Builder",
      messages: [],
      systemInstruction: CODE_BUILDER_INSTRUCTION,
      config: {
        temperature: 0.2, // Lower temperature for more accurate code
        topP: 0.95,
        topK: 40,
        model: ModelType.GEMINI_PRO,
        grounding: false,
      },
      lastModified: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
        if (filtered.length === 0) {
          setTimeout(() => createNewSession(), 0);
        }
      }
      return filtered;
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    if (!activeSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [
        ...(inputText ? [{ text: inputText }] : []),
        ...attachedFiles.map(f => ({
          inlineData: {
            data: f.data.split(',')[1],
            mimeType: f.mimeType
          }
        }))
      ],
      timestamp: Date.now()
    };

    const updatedMessages = [...activeSession.messages, userMessage];
    const firstUserText = updatedMessages.find(m => m.role === 'user')?.parts.find(p => p.text)?.text;
    const newTitle = activeSession.messages.length === 0 ? (firstUserText?.slice(0, 30) || "Media Prompt") : activeSession.title;

    setSessions(prev => prev.map(s => s.id === activeSession.id ? {
      ...s,
      messages: updatedMessages,
      lastModified: Date.now(),
      title: newTitle
    } : s));

    setInputText('');
    setAttachedFiles([]);
    setIsGenerating(true);

    try {
      const response = await generateAIContent(
        activeSession.config.model,
        updatedMessages,
        activeSession.systemInstruction,
        activeSession.config
      );

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        parts: [
          ...(response.text ? [{ text: response.text }] : []),
          ...(response.imagePart ? [response.imagePart] : [])
        ],
        groundingMetadata: response.groundingMetadata,
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => s.id === activeSession.id ? {
        ...s,
        messages: [...s.messages, modelMessage],
        lastModified: Date.now()
      } : s));
    } catch (error) {
      console.error(error);
      alert("Error generating response. Please check your network and API configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachedFiles(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          data: base64,
          mimeType: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const updateConfig = (key: string, value: any) => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      config: { ...s.config, [key]: value }
    } : s));
  };

  const updateSystemInstruction = (value: string) => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      systemInstruction: value
    } : s));
  };

  const renderMessageContent = (text: string) => {
    if (typeof text !== 'string') return null;
    if (!text.includes('```')) return <div className="whitespace-pre-wrap">{text}</div>;
    const parts = text.split(/```(\w+)?/);
    return parts.map((part, i) => {
      if (i % 2 === 1) return null; // language tag
      if (i > 0 && i % 2 === 0) {
        const lang = parts[i-1] || 'code';
        return <CodeBlock key={i} code={part.trim()} language={lang} />;
      }
      return <div key={i} className="whitespace-pre-wrap">{part}</div>;
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0C10] text-[#C5C6C7]">
      <Sidebar 
        sessions={sessions} 
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={() => createNewSession()}
        onVibeCoding={startVibeCoding}
        onDeleteSession={deleteSession}
      />

      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-16 border-b border-[#45A29E]/20 flex items-center justify-between px-6 bg-[#0B0C10]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-white truncate max-w-[200px]">{activeSession?.title || 'Studio Playground'}</h2>
            <div className="h-4 w-[1px] bg-gray-700 hidden sm:block" />
            <select 
              className="bg-transparent border-none text-[#66FCF1] focus:ring-0 cursor-pointer text-sm font-medium outline-none"
              value={activeSession?.config.model || ModelType.GEMINI_FLASH}
              onChange={(e) => updateConfig('model', e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-[#1F2833] text-white">{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateConfig('grounding', !activeSession?.config.grounding)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeSession?.config.grounding 
                  ? 'bg-[#66FCF1]/20 text-[#66FCF1] border border-[#66FCF1]' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              <Globe size={14} />
              <span className="hidden sm:inline">Grounding</span>
            </button>
            <button className="bg-[#66FCF1] text-[#0B0C10] font-bold px-4 py-2 rounded-lg hover:shadow-[0_0_15px_#66FCF1] transition-all text-sm">
              Save
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-[#0B0C10]">
            <div className="p-4 border-b border-[#45A29E]/10 bg-[#1F2833]/20 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-[#45A29E] uppercase tracking-wider block">System Instructions</label>
                {activeSession?.systemInstruction === CODE_BUILDER_INSTRUCTION && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Code size={10}/> Code Builder Mode
                  </span>
                )}
              </div>
              <textarea 
                value={activeSession?.systemInstruction || ''}
                onChange={(e) => updateSystemInstruction(e.target.value)}
                placeholder="How should the model behave? (e.g. 'You are a code expert.')"
                className="w-full h-20 bg-[#0B0C10]/50 border border-[#45A29E]/20 rounded-lg p-3 text-sm focus:border-[#66FCF1] focus:ring-1 focus:ring-[#66FCF1] outline-none resize-none custom-scrollbar text-gray-300"
              />
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {!activeSession?.messages.length ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                  <Terminal size={48} className="text-[#66FCF1]" />
                  <div className="max-w-md">
                    <h3 className="text-xl font-bold text-white mb-2">Design, Build, Prototype</h3>
                    <p className="text-sm">Start a conversation or click <b>Vibe Coding</b> for high-quality developer assistance with full code generation.</p>
                  </div>
                </div>
              ) : (
                activeSession.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 shadow-md ${
                      msg.role === 'user' ? 'bg-[#45A29E]' : 'bg-[#66FCF1]'
                    }`}>
                      {msg.role === 'user' ? <span className="text-xs font-bold text-white">U</span> : <span className="text-[#0B0C10] font-bold text-xs italic">G</span>}
                    </div>
                    <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
                        msg.role === 'user' 
                          ? 'bg-[#1F2833] text-white border border-[#45A29E]/20' 
                          : 'bg-[#0B0C10] text-[#C5C6C7] border border-[#66FCF1]/10 flex flex-col gap-3'
                      }`}>
                        {msg.parts && msg.parts.map((p, pIdx) => (
                          <div key={pIdx}>
                            {p.text && renderMessageContent(p.text)}
                            {p.inlineData && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 shadow-2xl bg-black">
                                <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-w-full h-auto mx-auto block" alt="Output" />
                              </div>
                            )}
                          </div>
                        ))}
                        {msg.groundingMetadata?.groundingChunks && (
                          <div className="mt-4 pt-4 border-t border-[#66FCF1]/10 space-y-2 text-left">
                            <p className="text-[10px] font-bold text-[#66FCF1] uppercase tracking-wider flex items-center gap-1">
                              <Globe size={10} /> Grounding Sources:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {msg.groundingMetadata.groundingChunks.map((chunk: any, cIdx: number) => {
                                 const source = chunk.web || chunk.maps;
                                 if (!source?.uri) return null;
                                 return (
                                  <a 
                                    key={cIdx} href={source.uri} 
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] bg-[#1F2833] hover:bg-[#66FCF1]/10 text-[#45A29E] px-2.5 py-1.5 rounded-md border border-[#45A29E]/20 transition-all flex items-center gap-1.5"
                                  >
                                    <span className="truncate max-w-[150px]">{source.title || 'Source'}</span>
                                  </a>
                                 );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 block px-2">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {isGenerating && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded bg-[#66FCF1] flex items-center justify-center animate-pulse shrink-0">
                    <Loader2 className="text-[#0B0C10] w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-4 bg-[#0B0C10] border border-[#66FCF1]/20 rounded-2xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#66FCF1] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#66FCF1] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-[#66FCF1] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#45A29E]/10 bg-[#0B0C10] shrink-0">
              <div className="max-w-5xl mx-auto">
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map(f => (
                    <div key={f.id} className="relative w-12 h-12 rounded border border-gray-700 overflow-hidden shadow-lg group">
                      <img src={f.data} className="w-full h-full object-cover" />
                      <button onClick={() => setAttachedFiles(p => p.filter(x => x.id !== f.id))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                    </div>
                  ))}
                </div>
                <div className="relative flex items-end gap-2 bg-[#1F2833]/50 p-2 rounded-2xl border border-[#45A29E]/20 focus-within:border-[#66FCF1] transition-all shadow-inner">
                  <div className="flex flex-col gap-1 p-1 shrink-0">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-[#66FCF1]" title="Upload media"><Upload size={18} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                    <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-[#66FCF1]" title="Voice Input"><Mic size={18} /></button>
                  </div>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder={activeSession?.config.model === ModelType.GEMINI_IMAGE ? "Describe an image to generate..." : "Ask Gemini anything..."}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 resize-none h-12 max-h-48 text-white placeholder-gray-500 custom-scrollbar outline-none"
                  />
                  <button onClick={handleSendMessage} disabled={isGenerating || (!inputText.trim() && attachedFiles.length === 0)} className="p-3 bg-[#66FCF1] text-[#0B0C10] rounded-xl hover:shadow-[0_0_15px_#66FCF1] disabled:opacity-50 transition-all mb-1 mr-1 shadow-md shrink-0">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 border-l border-[#45A29E]/20 bg-[#1F2833]/10 hidden lg:flex flex-col p-6 overflow-y-auto shrink-0 custom-scrollbar">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <Settings2 size={16} className="text-[#66FCF1]" />
              Model Controls
            </h3>
            <div className="space-y-8">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-3">Model</label>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <button 
                      key={m.id}
                      onClick={() => updateConfig('model', m.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                        activeSession?.config.model === m.id 
                          ? 'bg-[#66FCF1]/10 border-[#66FCF1] text-[#66FCF1]' 
                          : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <p className="font-bold">{m.name}</p>
                      <p className="text-[10px] opacity-60 mt-0.5">{m.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {activeSession?.config.model === ModelType.GEMINI_IMAGE ? (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-3">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["1:1", "4:3", "3:4", "16:9", "9:16"].map(ratio => (
                      <button 
                        key={ratio} 
                        onClick={() => updateConfig('aspectRatio', ratio)} 
                        className={`text-[10px] py-2 rounded border transition-all ${
                          activeSession.config.aspectRatio === ratio ? 'bg-[#66FCF1]/20 border-[#66FCF1] text-[#66FCF1]' : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Temperature</label>
                      <span className="text-xs text-[#66FCF1]">{activeSession?.config.temperature}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.1" value={activeSession?.config.temperature || 0.7} onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))} className="w-full accent-[#66FCF1] h-1.5 bg-gray-800 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Top P</label>
                      <span className="text-xs text-[#66FCF1]">{activeSession?.config.topP}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={activeSession?.config.topP || 0.9} onChange={(e) => updateConfig('topP', parseFloat(e.target.value))} className="w-full accent-[#66FCF1] h-1.5 bg-gray-800 rounded-lg cursor-pointer" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
