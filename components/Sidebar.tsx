
import React from 'react';
import { Plus, MessageSquare, Code, Terminal, History, Settings, LogOut, ChevronRight } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onVibeCoding: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, activeSessionId, onSelectSession, onNewSession, onVibeCoding }) => {
  return (
    <div className="w-64 h-full bg-[#1F2833] flex flex-col border-r border-[#45A29E]/20">
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
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm italic">No history yet</div>
        ) : (
          <div className="space-y-1">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors group ${
                  activeSessionId === session.id 
                    ? 'bg-[#66FCF1]/10 text-[#66FCF1] border-l-2 border-[#66FCF1]' 
                    : 'text-gray-400 hover:bg-[#1F2833]/50 hover:text-white'
                }`}
              >
                <MessageSquare size={16} />
                <span className="truncate flex-1 text-sm">{session.title || 'Untitled Prompt'}</span>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#45A29E]/20 bg-[#0B0C10]/40">
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 p-2 text-gray-400 hover:text-white text-sm transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-3 p-2 text-gray-400 hover:text-white text-sm transition-colors">
            <History size={18} />
            <span>Usage & Billing</span>
          </button>
          <button className="flex items-center gap-3 p-2 text-red-400/80 hover:text-red-400 text-sm transition-colors mt-2">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
