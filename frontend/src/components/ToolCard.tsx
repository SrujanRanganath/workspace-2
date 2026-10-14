import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LucideIcon } from 'lucide-react';

interface ToolCardProps {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  tags: string[];
  gradient?: string;
  accentColor?: string;
  statusBadge?: string;
  shortcut?: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  to,
  icon: Icon,
  tags,
  shortcut,
}) => {
  return (
    <Link
      to={to}
      className="group relative rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 p-6 flex flex-col justify-between transition-all duration-150 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div>
        {/* Top Header: Icon & Shortcut / Action Indicator */}
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-200 group-hover:text-white group-hover:border-slate-600 transition-colors">
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            {shortcut && (
              <kbd className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500 group-hover:text-slate-400 group-hover:border-slate-700 transition-colors">
                {shortcut}
              </kbd>
            )}
            <div className="w-7 h-7 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-center text-slate-500 group-hover:text-slate-200 group-hover:border-slate-700 transition-all">
              <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {description}
        </p>

        {/* Zero-Pill Metadata Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 text-[11px] text-slate-500 font-mono">
          {tags.map((tag, idx) => (
            <React.Fragment key={tag}>
              <span>{tag}</span>
              {idx < tags.length - 1 && <span aria-hidden="true" className="text-slate-700">·</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Subtle bottom action kicker */}
      <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-300 transition-colors">
        <span className="font-medium">Open Studio</span>
        <span className="font-mono text-[11px] text-slate-600 group-hover:text-slate-400">Ready</span>
      </div>
    </Link>
  );
};
