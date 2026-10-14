import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Code2,
  Globe,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Server,
  Copy,
  Zap,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { backendMode, setMode } = useAuth();
  const { success } = useToast();

  const commands = [
    {
      category: 'Navigation',
      items: [
        { id: 'nav-dash', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard') },
        { id: 'nav-code', label: 'Launch Code Studio & Runner', icon: Code2, action: () => navigate('/tools/code') },
        { id: 'nav-web', label: 'Launch Website Builder Sandbox', icon: Globe, action: () => navigate('/tools/website') },
        { id: 'nav-data', label: 'Open Tabular Data Cleaner', icon: FileSpreadsheet, action: () => navigate('/tools/data-cleaner') },
        { id: 'nav-doc', label: 'Open Document Generator (.docx)', icon: FileText, action: () => navigate('/tools/documents') },
      ],
    },
    {
      category: 'Quick Studio Presets',
      items: [
        {
          id: 'preset-code-ratelimit',
          label: 'Code Studio: Python Sliding Window Rate Limiter',
          icon: Sparkles,
          action: () => navigate('/tools/code'),
        },
        {
          id: 'preset-web-saas',
          label: 'Website Builder: SaaS Platform with Pricing Table',
          icon: Sparkles,
          action: () => navigate('/tools/website'),
        },
        {
          id: 'preset-data-payroll',
          label: 'Data Cleaner: Tech Workforce Payroll Dataset',
          icon: Sparkles,
          action: () => navigate('/tools/data-cleaner'),
        },
        {
          id: 'preset-doc-resume',
          label: 'Document Generator: Staff Systems Engineer Resume',
          icon: Sparkles,
          action: () => navigate('/tools/documents'),
        },
      ],
    },
    {
      category: 'System & Engine Controls',
      items: [
        {
          id: 'sys-copy-token',
          label: 'Copy Authorization Bearer Token',
          icon: Copy,
          action: () => {
            const token = localStorage.getItem('access_token') || 'demo-bearer-token';
            navigator.clipboard.writeText(token);
            success('Bearer token copied to clipboard!');
          },
        },
        {
          id: 'sys-toggle-engine',
          label: `Switch Execution Mode (Current: ${backendMode === 'mock' ? 'Standalone' : 'FastAPI Live'})`,
          icon: Zap,
          action: () => {
            const nextMode = backendMode === 'mock' ? 'live' : 'mock';
            setMode(nextMode);
            success(`Switched to ${nextMode === 'mock' ? 'Standalone Engine' : 'Live FastAPI'}`);
          },
        },
      ],
    },
  ];

  // Flatten and filter items
  const filteredItems = commands
    .flatMap((c) => c.items)
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to tool... (e.g. 'code', 'data', 'token')"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K Palette</span>
          </span>
        </div>
      </div>
    </div>
  );
};
