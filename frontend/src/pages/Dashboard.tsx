import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  Globe,
  FileSpreadsheet,
  FileText,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Play,
  FileCode,
  Download,
  CheckCircle2,
  Clock,
  Server,
  Sparkles,
  FolderKanban,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToolCard } from '../components/ToolCard';
import { Navbar } from '../components/Navbar';

export const Dashboard: React.FC = () => {
  const { user, backendStatus, apiBaseUrl, backendMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'tools' | 'endpoints' | 'activity'>('tools');

  const tools = [
    {
      title: 'Code Tool',
      description:
        'AI code synthesis with syntax formatting, AST logic explanation, server-side Python runner, and direct source file exports.',
      to: '/tools/code',
      icon: Code2,
      tags: ['Python 3.11', 'Subprocess Runner', 'AST Explainer', 'Source Export'],
      shortcut: '⌘1',
    },
    {
      title: 'Website Builder',
      description:
        'Multi-file frontend compilation (App & CSS modules) with real-time responsive iframe sandbox preview and ZIP export.',
      to: '/tools/website',
      icon: Globe,
      tags: ['HTML / CSS', 'React JSX', 'Sandboxed IFrame', 'ZIP Bundle'],
      shortcut: '⌘2',
    },
    {
      title: 'Data Cleaner',
      description:
        'Automated deduplication, missing value imputation, descriptive numeric statistics, and 5-row preview table for tabular datasets.',
      to: '/tools/data-cleaner',
      icon: FileSpreadsheet,
      tags: ['CSV / XLSX', 'Deduplication', 'Quantile Stats', 'Clean CSV Export'],
      shortcut: '⌘3',
    },
    {
      title: 'Document Generator',
      description:
        'Structured Word (.docx) document synthesizer with adaptive schema fields for Resumes, Cover Letters, SOPs, and Project Reports.',
      to: '/tools/documents',
      icon: FileText,
      tags: ['DOCX Engine', 'Adaptive Schema', 'Live Paper Preview', 'DOCX Export'],
      shortcut: '⌘4',
    },
  ];

  // Real mock activity log to demonstrate full engineering platform utility
  const recentActivities = [
    {
      id: 'act-1',
      tool: 'Code Tool',
      action: 'Executed solution.py via /code/run',
      result: 'Exit Code 0 · 14.8MB RSS · 42ms',
      time: 'Just now',
      link: '/tools/code',
    },
    {
      id: 'act-2',
      tool: 'Website Builder',
      action: 'Generated SaaS Landing Page (HTML/CSS)',
      result: 'App Code (145 lines) · styles.css (180 lines)',
      time: '3 mins ago',
      link: '/tools/website',
    },
    {
      id: 'act-3',
      tool: 'Data Cleaner',
      action: 'Cleaned employee_payroll.csv',
      result: '145 rows → 134 rows · 11 duplicates removed · 17 imputed',
      time: '12 mins ago',
      link: '/tools/data-cleaner',
    },
    {
      id: 'act-4',
      tool: 'Document Generator',
      action: 'Compiled Staff Engineer Resume (.docx)',
      result: 'resume_alex_rivera.docx · 2 pages ready',
      time: '28 mins ago',
      link: '/tools/documents',
    },
  ];

  const apiEndpoints = [
    { method: 'POST', path: '/auth/register', desc: 'Registers new developer credentials with hash verification', tag: 'Auth' },
    { method: 'POST', path: '/auth/login', desc: 'Issues access_token attached as Authorization Bearer', tag: 'Auth' },
    { method: 'GET', path: '/auth/me', desc: 'Validates current session and returns user profile', tag: 'Auth' },
    { method: 'POST', path: '/code/generate', desc: 'Synthesizes code from prompt, language, and template', tag: 'Code' },
    { method: 'POST', path: '/code/explain', desc: 'Produces structural and architectural explanation of code', tag: 'Code' },
    { method: 'POST', path: '/code/save', desc: 'Persists source file to server filesystem storage', tag: 'Code' },
    { method: 'POST', path: '/code/run', desc: 'Executes saved .py script in isolated subprocess', tag: 'Code' },
    { method: 'GET', path: '/code/download/{filename}', desc: 'Streams saved source code file to client', tag: 'Code' },
    { method: 'POST', path: '/website/generate', desc: 'Generates separate app and css code blocks', tag: 'Website' },
    { method: 'POST', path: '/website/save', desc: 'Saves project to disk structure under project folder', tag: 'Website' },
    { method: 'GET', path: '/website/download/{project_name}', desc: 'Bundles website project into a downloadable ZIP', tag: 'Website' },
    { method: 'POST', path: '/data-cleaner/clean', desc: 'Multipart CSV/XLSX cleaner with deduplication & profiling', tag: 'Data' },
    { method: 'GET', path: '/data-cleaner/download/{filename}', desc: 'Downloads cleaned dataset file', tag: 'Data' },
    { method: 'POST', path: '/document-generator/generate', desc: 'Compiles formatted DOCX document from adaptive schema', tag: 'Documents' },
    { method: 'GET', path: '/document-generator/download/{filename}', desc: 'Streams compiled .docx artifact', tag: 'Documents' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>FastAPI Backend</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">Bearer Token Auth</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{backendMode === 'mock' ? 'In-App Standalone Engine' : apiBaseUrl}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Engineering Workspace
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Integrated developer studio unified under a high-throughput FastAPI API contract. Select a studio below to generate code, preview web applications, profile datasets, or compile documentation.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 space-y-0.5">
              <div className="text-[11px] text-slate-400 font-medium">Session User</div>
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                {user?.name || 'Engineer'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 space-y-0.5">
              <div className="text-[11px] text-slate-400 font-medium">Engine Mode</div>
              <div className="text-xs font-mono text-indigo-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {backendMode === 'mock' ? 'Standalone' : 'FastAPI Live'}
              </div>
            </div>
          </div>
        </div>

        {/* View Segmented Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Engineering Tools (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recent Executions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('endpoints')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'endpoints'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              API Contract Registry (15)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>FastAPI v0.115</span>
            <span aria-hidden="true">·</span>
            <span>Python 3.11</span>
          </div>
        </div>

        {/* Tab 1: 4 Tools Grid */}
        {activeTab === 'tools' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tools.map((tool) => (
                <ToolCard key={tool.to} {...tool} />
              ))}
            </div>

            {/* Quick Workbench Shortcut Bar */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Quick Run Tip: In the Code Tool, execute Python files on the backend via <code className="font-mono text-slate-300 bg-slate-900 px-1 py-0.5 rounded">POST /code/run</code>.</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/tools/code"
                  className="font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Launch Code Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Recent Activity Stream */}
        {activeTab === 'activity' && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-100">Execution History</h3>
                <p className="text-xs text-slate-400">Recent runs, compiles, and generated artifacts in your workspace</p>
              </div>
              <span className="text-xs font-mono text-slate-500">{recentActivities.length} events logged</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200">{act.action}</span>
                        <span className="text-[11px] font-mono text-slate-500">[{act.tool}]</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{act.result}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono">{act.time}</span>
                    <Link
                      to={act.link}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 3: API Contract Registry */}
        {activeTab === 'endpoints' && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-100">FastAPI API Specifications</h3>
                <p className="text-xs text-slate-400">All 15 endpoints configured with Bearer Token authentication</p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                Host: {apiBaseUrl}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-20">Method</th>
                    <th className="py-2.5 px-3 w-56">Endpoint Route</th>
                    <th className="py-2.5 px-3">Description &amp; Contract</th>
                    <th className="py-2.5 px-3 w-24">Module</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {apiEndpoints.map((ep, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors odd:bg-slate-900/20">
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            ep.method === 'POST'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">{ep.path}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">{ep.desc}</td>
                      <td className="py-2.5 px-3 text-slate-500">{ep.tag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
