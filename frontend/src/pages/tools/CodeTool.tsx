import React, { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  Play,
  Save,
  HelpCircle,
  Download,
  Terminal,
  CheckCircle2,
  FileCode,
  FileCode2,
  Folder,
  FolderOpen,
  FolderArchive,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Sliders,
  Settings,
  Layers,
  Wand2,
  Cpu,
} from 'lucide-react';
import { apiClient, extractErrorMessage, downloadAuthenticatedFile } from '../../api/client';
import {
  CodeGenerateRequest,
  CodeGenerateResponse,
  CodeRegenerateFileRequest,
  CodeRegenerateFileResponse,
  CodeExplainRequest,
  CodeExplainResponse,
  CodeSaveProjectRequest,
  CodeSaveProjectResponse,
  CodeVerifyRequest,
  CodeVerifyResponse,
  CodeSaveRequest,
  CodeSaveResponse,
  CodeRunRequest,
  CodeRunResponse,
} from '../../types';
import { Navbar } from '../../components/Navbar';
import { LoadingButton } from '../../components/LoadingButton';
import { ErrorMessage } from '../../components/ErrorMessage';
import { CodeViewer } from '../../components/CodeViewer';
import { useToast } from '../../context/ToastContext';
import { createZipArchive, ZipFileInput } from '../../utils/zipExport';

export const CodeTool: React.FC = () => {
  const { success, info } = useToast();

  // ─── Input State ────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState(
    'Create a FastAPI backend for an event management system with JWT authentication, events, registrations and attendance.'
  );
  const [language, setLanguage] = useState('Python');
  const [template, setTemplate] = useState('FastAPI Backend');
  const [projectName, setProjectName] = useState('event-management');

  // ─── Project Files State ────────────────────────────────────────────────────
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [activeFilePath, setActiveFilePath] = useState<string>('backend/main.py');
  const [activeFileCode, setActiveFileCode] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // ─── Output & View States ───────────────────────────────────────────────────
  const [explanation, setExplanation] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<CodeVerifyResponse | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [provider, setProvider] = useState<string>('gemini');
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Active view tab
  const [activeEditorTab, setActiveEditorTab] = useState<'editor' | 'verify' | 'explanation' | 'terminal'>('editor');

  // File regeneration modal / instruction
  const [regenInstruction, setRegenInstruction] = useState('');
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Collapsed folders in file tree
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // ─── Presets ────────────────────────────────────────────────────────────────
  const presets = [
    {
      title: 'Smart College Event Management',
      language: 'Python',
      template: 'FastAPI Backend',
      projectName: 'smart-college-events',
      prompt: 'Create a FastAPI backend for an event management system with JWT authentication, events, registrations and attendance.',
    },
    {
      title: 'Rate Limiter Middleware',
      language: 'Python',
      template: 'FastAPI Middleware',
      projectName: 'rate-limiter-service',
      prompt: 'FastAPI sliding window rate limiter middleware with in-memory redis cache and client IP throttling',
    },
    {
      title: 'JWT Auth Guard Service',
      language: 'TypeScript',
      template: 'Authentication Microservice',
      projectName: 'auth-guard-service',
      prompt: 'Bearer token JWT verification service with asymmetric public-key signature checks and role-based permissions',
    },
    {
      title: 'Async Task Queue Handler',
      language: 'Python',
      template: 'Worker Pool Service',
      projectName: 'async-worker-pool',
      prompt: 'Background task worker pool using asyncio.Queue with exponential backoff retry and structured logging',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setPrompt(p.prompt);
    setLanguage(p.language);
    setTemplate(p.template);
    setProjectName(p.projectName);
    info(`Preset applied: ${p.title}`);
  };

  // ─── Sync Active File Code ──────────────────────────────────────────────────
  useEffect(() => {
    if (projectFiles[activeFilePath] !== undefined) {
      setActiveFileCode(projectFiles[activeFilePath]);
    }
  }, [activeFilePath, projectFiles]);

  const fileCount = Object.keys(projectFiles).length;
  const hasFiles = fileCount > 0;

  // ─── File Tree Structure ────────────────────────────────────────────────────
  const fileTree = useMemo(() => {
    const tree: { folders: Record<string, string[]>; rootFiles: string[] } = {
      folders: {},
      rootFiles: [],
    };

    Object.keys(projectFiles).sort().forEach((path) => {
      if (path.includes('/')) {
        const parts = path.split('/');
        const folder = parts.slice(0, -1).join('/');
        if (!tree.folders[folder]) {
          tree.folders[folder] = [];
        }
        tree.folders[folder].push(path);
      } else {
        tree.rootFiles.push(path);
      }
    });

    return tree;
  }, [projectFiles]);

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder],
    }));
  };

  // ─── File Selection ─────────────────────────────────────────────────────────
  const handleSelectFile = (path: string) => {
    // Save current file changes into state first
    if (isEditing && activeFilePath) {
      setProjectFiles((prev) => ({
        ...prev,
        [activeFilePath]: activeFileCode,
      }));
    }
    setActiveFilePath(path);
    setActiveFileCode(projectFiles[path] || '');
    setActiveEditorTab('editor');
  };

  // ─── Generate Multi-File Project ────────────────────────────────────────────
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    setIsGenerating(true);

    try {
      const payload: CodeGenerateRequest = {
        prompt: prompt.trim(),
        language: language.trim() || 'Python',
        template: template.trim() || 'FastAPI Backend',
        project_name: projectName.trim() || 'event-management',
      };

      const response = await apiClient.post<CodeGenerateResponse>('/code/generate', payload);
      const data = response.data;

      const receivedFiles = data.files && Object.keys(data.files).length > 0
        ? data.files
        : { 'solution.py': data.code };

      setProjectFiles(receivedFiles);
      setProjectName(data.project_name || projectName);
      setProvider(data.provider || 'gemini');
      setFallbackUsed(Boolean(data.fallback_used));

      // Choose default active file
      const defaultFile = receivedFiles['backend/main.py']
        ? 'backend/main.py'
        : Object.keys(receivedFiles)[0];

      setActiveFilePath(defaultFile);
      setActiveFileCode(receivedFiles[defaultFile] || data.code);

      if (data.fallback_used) {
        setProviderNotice(data.message || 'Gemini unavailable — generated using deterministic offline template.');
        info('Generated using deterministic offline template.');
      } else {
        setProviderNotice(null);
        success(`Project '${data.project_name || projectName}' generated with ${Object.keys(receivedFiles).length} files!`);
      }

      setActiveEditorTab('editor');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Regenerate Selected File ───────────────────────────────────────────────
  const handleRegenerateFile = async () => {
    if (!activeFilePath || !regenInstruction.trim()) return;

    setError(null);
    setIsRegenerating(true);

    try {
      const payload: CodeRegenerateFileRequest = {
        project_name: projectName,
        file_path: activeFilePath,
        instruction: regenInstruction.trim(),
        current_code: activeFileCode,
        project_context: prompt,
      };

      const response = await apiClient.post<CodeRegenerateFileResponse>('/code/regenerate-file', payload);
      const updatedCode = response.data.code;

      setProjectFiles((prev) => ({
        ...prev,
        [activeFilePath]: updatedCode,
      }));
      setActiveFileCode(updatedCode);
      setShowRegenModal(false);
      setRegenInstruction('');

      if (response.data.fallback_used) {
        info('File modified using deterministic updater.');
      } else {
        success(`File '${activeFilePath}' regenerated successfully!`);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsRegenerating(false);
    }
  };

  // ─── Safe Static Code Verification ──────────────────────────────────────────
  const handleVerifyProject = async () => {
    if (!hasFiles) return;

    setError(null);
    setIsVerifying(true);

    try {
      // Sync active edits before verifying
      const filesToVerify = {
        ...projectFiles,
        [activeFilePath]: activeFileCode,
      };

      const payload: CodeVerifyRequest = {
        files: filesToVerify,
        entrypoint: 'backend/main.py',
      };

      const response = await apiClient.post<CodeVerifyResponse>('/code/verify', payload);
      setVerificationResult(response.data);
      setActiveEditorTab('verify');
      success(`Static verification complete: ${response.data.status.toUpperCase()}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Save Project to Backend ────────────────────────────────────────────────
  const handleSaveProject = async () => {
    if (!hasFiles) return;

    setError(null);
    setIsSavingProject(true);

    try {
      const syncedFiles = {
        ...projectFiles,
        [activeFilePath]: activeFileCode,
      };

      const payload: CodeSaveProjectRequest = {
        project_name: projectName,
        files: syncedFiles,
      };

      const response = await apiClient.post<CodeSaveProjectResponse>('/code/save-project', payload);
      success(response.data.message || `Project saved to ${response.data.folder}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSavingProject(false);
    }
  };

  // ─── Download ZIP ───────────────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    if (!hasFiles) return;

    setIsDownloadingZip(true);
    try {
      // Create ZIP with project root folder prefix
      const zipInputs: ZipFileInput[] = Object.entries({
        ...projectFiles,
        [activeFilePath]: activeFileCode,
      }).map(([path, content]) => ({
        name: `${projectName}/${path}`,
        content,
      }));

      const zipBlob = createZipArchive(zipInputs);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success(`Downloaded ${projectName}.zip (${zipInputs.length} files)`);
    } catch (err) {
      // Fallback to backend zip endpoint
      try {
        await downloadAuthenticatedFile(
          `/code/download-zip/${projectName}`,
          `${projectName}.zip`
        );
        success(`Downloaded ${projectName}.zip via backend endpoint`);
      } catch (backupErr) {
        setError(extractErrorMessage(backupErr));
      }
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // ─── Explain Active File ────────────────────────────────────────────────────
  const handleExplain = async () => {
    if (!activeFileCode) return;

    setError(null);
    setIsExplaining(true);

    try {
      const payload: CodeExplainRequest = {
        code: activeFileCode,
        language: activeFilePath.endsWith('.py') ? 'Python' : language,
      };

      const response = await apiClient.post<CodeExplainResponse>('/code/explain', payload);
      setExplanation(response.data.explanation);
      setActiveEditorTab('explanation');
      success(`Analysis complete for ${activeFilePath}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsExplaining(false);
    }
  };

  // ─── Copy Active Code ───────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!activeFileCode) return;
    navigator.clipboard.writeText(activeFileCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    success(`Copied ${activeFilePath} to clipboard`);
  };

  const activeLineCount = activeFileCode ? activeFileCode.split('\n').length : 0;
  const activeLang = activeFilePath.endsWith('.py')
    ? 'python'
    : activeFilePath.endsWith('.ts')
    ? 'typescript'
    : activeFilePath.endsWith('.js')
    ? 'javascript'
    : activeFilePath.endsWith('.json')
    ? 'json'
    : activeFilePath.endsWith('.md')
    ? 'markdown'
    : 'plaintext';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* ─── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight">Code Generation Studio</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Multi-Artifact IDE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Requirement-driven full backend & service generator with project trees and ZIP export
            </p>
          </div>
        </div>

        {/* Status & Badges */}
        <div className="flex items-center space-x-2">
          {hasFiles && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                {fileCount} files
              </span>
              <span
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 ${
                  fallbackUsed
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${fallbackUsed ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                Provider: {fallbackUsed ? 'Deterministic Fallback' : 'Gemini'}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 pt-3">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {providerNotice && (
        <div className="px-6 pt-3">
          <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{providerNotice}</span>
            </div>
            <button onClick={() => setProviderNotice(null)} className="text-amber-400 hover:text-amber-200 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ─── Main IDE Workspace ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Panel: Config & File Tree ───────────────────────────────── */}
        <aside className="w-96 border-r border-slate-800 bg-slate-900/60 flex flex-col overflow-y-auto">
          {/* Section 1: Prompt & Controls */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                Natural Language Requirement
              </label>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your backend service architecture, endpoints, data models and auth..."
              rows={4}
              className="w-full text-xs bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed resize-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Python">Python</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Go">Go</option>
                  <option value="Rust">Rust</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Template
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="FastAPI Backend">FastAPI Backend</option>
                  <option value="REST API endpoint">REST API endpoint</option>
                  <option value="Authentication Microservice">Authentication Microservice</option>
                  <option value="Worker Pool Service">Worker Pool Service</option>
                </select>
              </div>
            </div>

            <LoadingButton
              onClick={() => handleGenerate()}
              isLoading={isGenerating}
              icon={Sparkles}
              variant="primary"
              className="w-full text-xs py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md font-medium"
            >
              Build Project Files
            </LoadingButton>
          </div>

          {/* Section 2: Presets */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Architectural Presets
            </label>
            <div className="space-y-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="w-full text-left p-2 rounded-md bg-slate-950/40 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 transition flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-slate-300 group-hover:text-indigo-400 truncate">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{p.template}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Project File Tree */}
          <div className="p-4 flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                Project File Tree
              </label>
              {hasFiles && (
                <span className="text-[10px] text-slate-400 font-mono">
                  📁 {projectName}
                </span>
              )}
            </div>

            {!hasFiles ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                Click "Build Project Files" to generate your multi-file project workspace.
              </div>
            ) : (
              <div className="space-y-1 bg-slate-950/60 rounded-lg p-2 border border-slate-800/80 font-mono text-xs">
                {/* Project Root Folder */}
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold px-2 py-1">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{projectName}</span>
                </div>

                {/* Folders */}
                {Object.entries(fileTree.folders).map(([folderName, files]) => {
                  const isCollapsed = collapsedFolders[folderName];
                  return (
                    <div key={folderName} className="pl-3 space-y-0.5">
                      <button
                        onClick={() => toggleFolder(folderName)}
                        className="w-full flex items-center gap-1.5 text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded text-[11px]"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        )}
                        <Folder className="w-3 h-3 text-amber-400" />
                        <span className="font-medium">{folderName}</span>
                      </button>

                      {!isCollapsed && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-1.5">
                          {files.map((filePath) => {
                            const isSelected = activeFilePath === filePath;
                            const fileName = filePath.split('/').pop() || filePath;
                            const lines = projectFiles[filePath]?.split('\n').length || 0;
                            return (
                              <button
                                key={filePath}
                                onClick={() => handleSelectFile(filePath)}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs transition ${
                                  isSelected
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <FileCode className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                  <span className="truncate">{fileName}</span>
                                </span>
                                <span className="text-[10px] text-slate-600 font-mono ml-2">
                                  {lines}L
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root Files */}
                {fileTree.rootFiles.map((filePath) => {
                  const isSelected = activeFilePath === filePath;
                  const lines = projectFiles[filePath]?.split('\n').length || 0;
                  return (
                    <div key={filePath} className="pl-3">
                      <button
                        onClick={() => handleSelectFile(filePath)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs transition ${
                          isSelected
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <FileText className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{filePath}</span>
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono ml-2">
                          {lines}L
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions: Save Project & Download ZIP */}
            {hasFiles && (
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setShowRegenModal(true)}
                  className="w-full py-1.5 px-3 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  Regenerate Selected File
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveProject}
                    disabled={isSavingProject}
                    className="py-1.5 px-2 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 transition"
                  >
                    <Save className="w-3 h-3 text-emerald-400" />
                    Save Project
                  </button>

                  <button
                    onClick={handleDownloadZip}
                    disabled={isDownloadingZip}
                    className="py-1.5 px-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium text-white flex items-center justify-center gap-1 transition shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    Download ZIP
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ─── Right Panel: Code Editor, Verification & Analysis ────────────── */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Top Editor Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
            {/* Breadcrumb Path */}
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-500">📁 {projectName}</span>
              <span className="text-slate-600">/</span>
              <span className="text-indigo-300 font-semibold">{activeFilePath}</span>
              {activeLineCount > 0 && (
                <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800 ml-2">
                  {activeLineCount} lines ({activeLang})
                </span>
              )}
            </div>

            {/* Editor Action Buttons & Tab Switchers */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveEditorTab('editor')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeEditorTab === 'editor'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveEditorTab('verify')}
                  className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                    activeEditorTab === 'verify'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Static Verify
                </button>
                <button
                  onClick={() => setActiveEditorTab('explanation')}
                  className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                    activeEditorTab === 'explanation'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3 h-3 text-amber-400" />
                  Analysis
                </button>
              </div>

              {hasFiles && (
                <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                  <button
                    onClick={handleVerifyProject}
                    disabled={isVerifying}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition text-xs flex items-center gap-1"
                    title="Run safe static code verification"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Verify</span>
                  </button>

                  <button
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition text-xs flex items-center gap-1"
                    title="Explain code"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Explain</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-xs"
                    title="Copy code"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-hidden relative">
            {activeEditorTab === 'editor' && (
              <div className="h-full flex flex-col">
                <textarea
                  value={activeFileCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setActiveFileCode(newCode);
                    setIsEditing(true);
                    setProjectFiles((prev) => ({
                      ...prev,
                      [activeFilePath]: newCode,
                    }));
                  }}
                  placeholder="// No code generated yet. Describe your requirements on the left to begin."
                  className="flex-1 w-full p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed border-none focus:outline-none resize-none selection:bg-indigo-600/30"
                  spellCheck={false}
                />
              </div>
            )}

            {activeEditorTab === 'verify' && (
              <div className="h-full overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Safe Static Code Verification</h2>
                  </div>
                  <button
                    onClick={handleVerifyProject}
                    disabled={isVerifying}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    Run Static Check
                  </button>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Security Architecture Policy:</p>
                  <p>
                    Generated backend code is verified using AST parsing, syntax validation, and architectural contract checks
                    without executing untrusted host processes on Windows.
                  </p>
                </div>

                {verificationResult ? (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-lg border ${
                        verificationResult.status === 'passed'
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
                        {verificationResult.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        Status: {verificationResult.status}
                      </div>
                      <p className="text-xs">{verificationResult.summary}</p>
                    </div>

                    {/* File LOC breakdown */}
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                      <h3 className="text-xs font-semibold text-slate-300">File Lines of Code (LOC)</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {Object.entries(verificationResult.file_stats).map(([f, loc]) => (
                          <div key={f} className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/60">
                            <span className="text-slate-400 truncate">{f}</span>
                            <span className="text-indigo-400 font-bold ml-2">{loc} lines</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {verificationResult.issues.length > 0 && (
                      <div className="p-4 bg-rose-950/30 rounded-lg border border-rose-800/60 space-y-1 text-xs text-rose-300">
                        <div className="font-bold">Issues Detected:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {verificationResult.issues.map((iss, i) => (
                            <li key={i}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Click "Run Static Check" to analyze generated project syntax and structure.
                  </div>
                )}
              </div>
            )}

            {activeEditorTab === 'explanation' && (
              <div className="h-full overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">AI Architectural Analysis</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Active File: {activeFilePath}</span>
                </div>

                {explanation ? (
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {explanation}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Click "Explain" in the top bar to generate architectural analysis for {activeFilePath}.
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── Regenerate File Modal ─────────────────────────────────────────── */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Regenerate Selected File</h3>
              </div>
              <button
                onClick={() => setShowRegenModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-1">
                Target File: <span className="text-indigo-400">{activeFilePath}</span>
              </span>
              <textarea
                value={regenInstruction}
                onChange={(e) => setRegenInstruction(e.target.value)}
                placeholder="E.g., Add an endpoint to export attendance records as CSV format with student roll numbers..."
                rows={3}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <LoadingButton
                onClick={handleRegenerateFile}
                isLoading={isRegenerating}
                icon={Wand2}
                variant="primary"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                Regenerate File
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
