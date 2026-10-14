import React, { useState } from 'react';
import { Copy, Check, Terminal, Maximize2, Minimize2, Edit3, Eye, AlignLeft } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  maxHeight?: string;
  readOnly?: boolean;
  onChange?: (val: string) => void;
  showLineNumbers?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'text',
  filename,
  maxHeight = '480px',
  readOnly = false,
  onChange,
  showLineNumbers = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(!readOnly);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const lines = code ? code.split('\n') : [''];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg flex flex-col font-mono text-sm transition-all duration-200">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          </div>

          <div className="h-3.5 w-px bg-slate-800 mx-1" />

          {filename ? (
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              {filename}
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400 font-mono">
              {language}
            </span>
          )}

          <span className="text-[11px] text-slate-500 font-mono">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onChange && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-sans transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isEditing ? 'Viewing mode' : 'Interactive editing mode'}
            >
              {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              <span>{isEditing ? 'Editing' : 'Edit'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand full height'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!code}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded font-sans transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor / Viewer Body */}
      <div
        className="relative overflow-auto"
        style={{ maxHeight: isExpanded ? '85vh' : maxHeight }}
      >
        {isEditing && onChange ? (
          <div className="flex min-w-full">
            {showLineNumbers && (
              <div className="select-none py-3 px-3 text-right bg-slate-950/80 border-r border-slate-800/80 text-slate-600 text-xs shrink-0 font-mono">
                {lines.map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={code}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-slate-950/40 p-3 text-xs md:text-sm text-slate-200 font-mono resize-none focus:outline-none min-h-[360px] leading-6 border-0 focus:ring-0"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>
        ) : (
          <div className="flex min-w-full">
            {showLineNumbers && (
              <div className="select-none py-3 px-3 text-right bg-slate-950/80 border-r border-slate-800/80 text-slate-600 text-xs shrink-0 font-mono">
                {lines.map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <pre className="p-3 text-xs md:text-sm text-slate-200 overflow-x-auto leading-6 flex-1 font-mono">
              <code>{code || '// Output will appear here...'}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
