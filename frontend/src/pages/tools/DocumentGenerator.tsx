import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Building2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Eye,
  Type,
  Plus,
} from 'lucide-react';
import { apiClient, extractErrorMessage, downloadAuthenticatedFile } from '../../api/client';
import {
  DocumentGenerateRequest,
  DocumentGenerateResponse,
  DocumentTemplate,
} from '../../types';
import { Navbar } from '../../components/Navbar';
import { LoadingButton } from '../../components/LoadingButton';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useToast } from '../../context/ToastContext';

export const DocumentGenerator: React.FC = () => {
  const { success, info } = useToast();

  // Form state
  const [template, setTemplate] = useState<DocumentTemplate>('resume');
  const [title, setTitle] = useState('Senior Full Stack Software Engineer');
  const [name, setName] = useState('Alex Rivera');
  const [company, setCompany] = useState('Stripe Engineering');
  const [fontTheme, setFontTheme] = useState<'serif' | 'sans' | 'mono'>('sans');
  const [content, setContent] = useState(
    'Executive Summary:\nPrincipal Architect with 8+ years of engineering experience across high-throughput distributed microservices, FastAPI backends, and React platforms.\n\nCore Competencies:\n- Architecture: Distributed Systems, REST APIs, Microservices, Event Sinks\n- Languages: Python, Go, TypeScript, Rust, SQL\n- Infrastructure: Docker, Kubernetes, AWS, Redis, PostgreSQL\n\nProfessional Experience:\nLead Systems Architect · Horizon Labs (2022 - Present)\n- Engineered multi-tenant API gateway scaling to 25,000 req/sec with p99 latency < 25ms.\n- Mentored team of 12 full-stack engineers and instituted automated static analysis pipelines.\n\nSenior Backend Engineer · CloudScale Inc (2019 - 2022)\n- Migrated legacy monolith into containerized FastAPI services, lowering cloud infrastructure expenditure by 38%.'
  );

  // Result state
  const [result, setResult] = useState<DocumentGenerateResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      id: 'resume',
      label: 'Staff Engineer Resume',
      title: 'Staff Full Stack Systems Engineer',
      name: 'Alex Rivera',
      company: '',
      content:
        'Executive Summary:\nPrincipal Architect with 8+ years of engineering experience across high-throughput distributed microservices, FastAPI backends, and React platforms.\n\nCore Competencies:\n- Architecture: Distributed Systems, REST APIs, Microservices, Event Sinks\n- Languages: Python, Go, TypeScript, Rust, SQL\n- Infrastructure: Docker, Kubernetes, AWS, Redis, PostgreSQL\n\nProfessional Experience:\nLead Systems Architect · Horizon Labs (2022 - Present)\n- Engineered multi-tenant API gateway scaling to 25,000 req/sec with p99 latency < 25ms.\n- Mentored team of 12 full-stack engineers and instituted automated static analysis pipelines.\n\nSenior Backend Engineer · CloudScale Inc (2019 - 2022)\n- Migrated legacy monolith into containerized FastAPI services, lowering cloud infrastructure expenditure by 38%.',
    },
    {
      id: 'cover_letter',
      label: 'Executive Cover Letter',
      title: 'Application for Lead AI Architect',
      name: 'Elena Rostova',
      company: 'Anthropic AI Engineering',
      content:
        'Dear Engineering Selection Committee,\n\nI am thrilled to submit my candidacy for the Lead AI Architect position at Anthropic. Having spent the past seven years engineering mission-critical developer workspaces and high-throughput Python inference microservices, I have developed deep admiration for your focus on alignment, rigorous evaluation, and developer reliability.\n\nAt my current firm, I spearheaded the deployment of an enterprise AI engineering workspace serving over 80,000 daily requests with sub-100ms response targets. My engineering ethos prioritizes clean API boundary contracts, deterministic error handling, and intuitive human ergonomics.\n\nThank you very much for your time and evaluation.\n\nSincerely,\nElena Rostova',
    },
    {
      id: 'sop',
      label: 'Graduate Statement of Purpose',
      title: 'Statement of Purpose - M.S. in Computer Science',
      name: 'Devon Miles',
      company: '',
      content:
        'Academic Objective:\nTo pursue research at the intersection of automated code synthesis, formal verification, and distributed execution engines.\n\nAcademic & Research Background:\nGraduated Magna Cum Laude with a Bachelor of Science in Computer Science. Authored undergraduate thesis on compiler optimization and concurrent queue management in Python 3.11.\n\nCareer Aspirations:\nI intend to design the foundational programming environments and developer studio tools that empower engineers to build next-generation distributed applications.',
    },
    {
      id: 'project_report',
      label: 'Technical Architecture Report',
      title: 'Final Architecture Report: AI Engineering Workspace',
      name: 'System Architecture Team',
      company: '',
      content:
        '1. Executive Summary\nThis document synthesizes the architectural decisions behind unifying Code Execution, Website Sandbox, Tabular Data Cleaning, and Document Generation into an integrated developer workspace.\n\n2. Service Boundaries & API Contracts\n- Protocol: HTTP/1.1 with Bearer Token Authorization\n- Frontend: React 19 + TypeScript + Tailwind CSS\n- Backend: FastAPI (Python 3.11) with multipart streaming support\n\n3. Verification & Compliance\nAll 15 API contracts achieved 100% test coverage with sub-millisecond route resolution in standalone mode.',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTemplate(p.id as DocumentTemplate);
    setTitle(p.title);
    setName(p.name);
    setCompany(p.company ?? '');
    setContent(p.content);
    setResult(null);
    info(`Preset loaded: ${p.label}`);
  };

  const handleTemplateChange = (newTemplate: DocumentTemplate) => {
    setTemplate(newTemplate);
    setError(null);
    const matchingPreset = presets.find((p) => p.id === newTemplate);
    if (matchingPreset) {
      handleApplyPreset(matchingPreset);
    }
  };

  const handleInsertSection = (sectionText: string) => {
    setContent((prev) => `${prev}\n\n${sectionText}`);
    success('Section block appended to document');
  };

  // POST /document-generator/generate
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !name.trim() || !content.trim()) return;

    setError(null);
    setIsGenerating(true);

    try {
      const payload: DocumentGenerateRequest = {
        document_type: 'docx',
        template,
        title: title.trim(),
        name: name.trim(),
        content: content.trim(),
      };

      if (template === 'cover_letter' && company.trim()) {
        payload.company = company.trim();
      }

      const response = await apiClient.post<DocumentGenerateResponse>(
        '/document-generator/generate',
        payload
      );
      setResult(response.data);
      success('Document compiled into .docx package!');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // GET /document-generator/download/{filename}
  const handleDownload = async () => {
    if (!result?.filename) return;

    setError(null);
    setIsDownloading(true);

    try {
      await downloadAuthenticatedFile(
        `/document-generator/download/${encodeURIComponent(result.filename)}`,
        result.filename
      );
      success(`Downloaded ${result.filename}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  };

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <span>Workspace</span>
              <ChevronRight className="w-3 h-3 text-slate-700" />
              <span className="text-slate-300">Document Generator</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>DOCX Synthesis &amp; Live Paper Preview</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Executive Document Synthesizer (.docx)
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              Endpoint: /document-generator/*
            </span>
          </div>
        </div>

        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Adaptive Schema Form & Presets (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Presets Grid */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Adaptive Template Presets
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      template === p.id
                        ? 'bg-slate-900 border-indigo-500/60 text-white'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-medium text-slate-200 truncate">{p.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono capitalize">{p.id.replace('_', ' ')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleGenerate} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Select Template Schema
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {[
                    { id: 'resume', label: 'Resume' },
                    { id: 'cover_letter', label: 'Cover Letter' },
                    { id: 'sop', label: 'SOP' },
                    { id: 'project_report', label: 'Report' },
                    { id: 'other', label: 'Custom' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tpl.id as DocumentTemplate)}
                      className={`text-xs py-1.5 px-2 rounded-md font-medium text-center transition-colors ${
                        template === tpl.id
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document Title"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Author / Candidate Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Company field (only shown for Cover Letter template) */}
              {template === 'cover_letter' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-medium text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Target Company / Recipient
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Stripe, Google, Anthropic"
                    className="w-full bg-slate-950 border border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    Document Content &amp; Paragraphs
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {wordCount} words · ~{Math.ceil(wordCount / 240)} page(s)
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter body text, sections, and paragraphs..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono resize-y leading-relaxed"
                />
              </div>

              <div className="pt-1">
                <LoadingButton
                  type="submit"
                  isLoading={isGenerating}
                  loadingText="Compiling DOCX..."
                  variant="primary"
                  className="w-full py-2 text-xs"
                  icon={FileText}
                >
                  Generate Document (.docx)
                </LoadingButton>
              </div>
            </form>

            {/* Quick Section Adder */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                Quick Section Append
              </span>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    handleInsertSection(
                      `Certifications & Credentials:\n- AWS Certified Solutions Architect (Professional)\n- Certified Kubernetes Administrator (CKA)\n- HashiCorp Certified Terraform Associate`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                >
                  + Certifications
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertSection(
                      `Education:\nBachelor of Science in Computer Science, Magna Cum Laude\nUniversity of California, Berkeley (2015 - 2019)`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                >
                  + Education Block
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertSection(
                      `Key Projects & Open Source:\n- Maintainer of AsyncFastAPI (2.4k GitHub Stars)\n- Author of Distributed-Cache-Bench (1.1k GitHub Stars)`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                >
                  + Open Source Projects
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Paper Document Preview & Download Card (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              {/* Toolbar */}
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">
                    Live Paper Document Preview
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Font:</span>
                  <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFontTheme('sans')}
                      className={`px-1.5 py-0.5 rounded ${fontTheme === 'sans' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                    >
                      Sans
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontTheme('serif')}
                      className={`px-1.5 py-0.5 rounded ${fontTheme === 'serif' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                    >
                      Serif
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontTheme('mono')}
                      className={`px-1.5 py-0.5 rounded ${fontTheme === 'mono' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                    >
                      Mono
                    </button>
                  </div>
                </div>
              </div>

              {/* Realistic Paper Layout Preview */}
              <div className="p-4 bg-slate-950/80 flex justify-center">
                <div
                  style={{
                    fontFamily:
                      fontTheme === 'serif'
                        ? 'Georgia, Cambria, "Times New Roman", Times, serif'
                        : fontTheme === 'mono'
                        ? 'JetBrains Mono, monospace'
                        : 'Plus Jakarta Sans, sans-serif',
                  }}
                  className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-lg shadow-2xl min-h-[460px] max-h-[500px] overflow-y-auto text-xs space-y-4 select-text border border-slate-300"
                >
                  {/* Document Header */}
                  <div className="border-b-2 border-slate-900 pb-3 space-y-1">
                    <h2 className="text-base font-bold tracking-tight text-slate-950 uppercase">
                      {name || 'Candidate Name'}
                    </h2>
                    <div className="text-xs font-semibold text-indigo-700">
                      {title || 'Document Title'}
                    </div>
                    {template === 'cover_letter' && company && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        Target Organization: {company}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Document Content Body */}
                  <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-[11px]">
                    {content || 'Enter document text on the left to see live layout formatting...'}
                  </div>

                  {/* Document Footer Marker */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{title}</span>
                    <span>Page 1 of {Math.max(1, Math.ceil(wordCount / 240))}</span>
                  </div>
                </div>
              </div>

              {/* Result Download Bar */}
              {result && (
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-300 truncate max-w-xs">
                      {result.filename}
                    </span>
                  </div>

                  <LoadingButton
                    type="button"
                    onClick={handleDownload}
                    isLoading={isDownloading}
                    loadingText="Downloading..."
                    variant="primary"
                    size="sm"
                    icon={Download}
                  >
                    Download .docx
                  </LoadingButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
