import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Globe,
  Save,
  Download,
  Eye,
  Code,
  FileCode2,
  Monitor,
  Tablet,
  Smartphone,
  FolderArchive,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Wand2,
  Play,
  FileDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  RotateCcw,
  Copy,
  Check,
  Split,
  Maximize2,
  XCircle,
  HelpCircle,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  Upload,
  Link,
  Clipboard,
  File,
  FileText,
  Rocket,
} from 'lucide-react';
import { apiClient, extractErrorMessage, downloadAuthenticatedFile } from '../../api/client';
import {
  WebsiteGenerateRequest,
  WebsiteGenerateResponse,
  WebsiteModifyRequest,
  WebsiteSaveRequest,
  WebsiteSaveResponse,
  WebsitePublishRequest,
  WebsitePublishResponse,
} from '../../types';
import { Navbar } from '../../components/Navbar';
import { LoadingButton } from '../../components/LoadingButton';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useToast } from '../../context/ToastContext';
import { createZipArchive, triggerBlobDownload } from '../../utils/zipExport';

// ─── Types ───────────────────────────────────────────────────────────────────
type GenStep = 'idle' | 'analyzing' | 'scaffolding' | 'styling' | 'scripting' | 'rendering' | 'done';
type SourceTab = 'html' | 'css' | 'js' | 'readme';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'split' | 'preview' | 'editor';
type ProviderType = 'gemini' | 'deterministic_fallback' | 'none';

const DEFAULT_DEMO_PROMPT =
  'Build a modern Smart College Event & Attendance Management System dashboard with Student, Organizer and Administrator roles, upcoming events, event registration, attendance analytics, participant management, notifications and responsive mobile design.';

const DEFAULT_MODIFY_PROMPT =
  'Add an attendance analytics section showing present, absent and attendance percentage with an event-wise chart.';

const GEN_STEPS: Record<GenStep, string> = {
  idle: '',
  analyzing: 'Analyzing requirements…',
  scaffolding: 'Scaffolding HTML dashboard structure…',
  styling: 'Compiling modern dark theme CSS…',
  scripting: 'Injecting interactive JavaScript DOM handlers…',
  rendering: 'Compiling sandboxed preview…',
  done: 'Ready',
};

const PRESETS = [
  {
    title: 'Smart College Event & Attendance System',
    template: 'College Dashboard',
    prompt: DEFAULT_DEMO_PROMPT,
  },
  {
    title: 'SaaS Platform & Tier Pricing',
    template: 'SaaS Landing',
    prompt:
      'High-conversion developer platform landing page with dark aesthetic, hero section with animated gradient, feature grid with icons, interactive pricing tier switcher (monthly/annual), and customer testimonials carousel.',
  },
  {
    title: 'DevOps Cloud & Telemetry Monitor',
    template: 'Cloud Dashboard',
    prompt:
      'Cloud infrastructure monitoring dashboard with sidebar navigation, cluster health status cards, CPU/memory/disk resource utilization bar charts, latency distribution heatmap, active alert log table, and deployment pipeline status tracker.',
  },
  {
    title: 'Full-Stack Developer Portfolio Lab',
    template: 'Portfolio Lab',
    prompt:
      'Senior systems engineer portfolio with dark theme, hero profile section, project case studies grid with tech stack badges, open source contributions heatmap visualization, skills radar, and interactive contact form modal.',
  },
];

export const WebsiteBuilder: React.FC = () => {
  const { success, info, error: toastError } = useToast();

  // ── Inputs ──────────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState(DEFAULT_DEMO_PROMPT);
  const [template, setTemplate] = useState('College Dashboard');
  const [projectName, setProjectName] = useState('smart-college-events');
  const [modifyPrompt, setModifyPrompt] = useState(DEFAULT_MODIFY_PROMPT);

  // ── Generated Outputs & Working Source ──────────────────────────────────────
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [readmeCode, setReadmeCode] = useState('');

  // ── Baseline for "Reset Source" ─────────────────────────────────────────────
  const baselineRef = useRef<{ html: string; css: string; js: string; readme: string }>({ html: '', css: '', js: '', readme: '' });

  // ── UI View Controls ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sourceTab, setSourceTab] = useState<SourceTab>('html');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedTab, setCopiedTab] = useState<SourceTab | null>(null);

  // ── Status & Transparency ───────────────────────────────────────────────────
  const [genStep, setGenStep] = useState<GenStep>('idle');
  const [provider, setProvider] = useState<ProviderType>('none');
  const [fallbackUsed, setFallbackUsed] = useState<boolean>(false);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [savedProjectName, setSavedProjectName] = useState<string | null>(null);

  // ── Loading States ───────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);

  // ── Publish State ──────────────────────────────────────────────────────────
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedSiteId, setPublishedSiteId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ── File Tree State ───────────────────────────────────────────────────────
  const [fileTreeOpen, setFileTreeOpen] = useState(true);

  // ── Error State (Preserves Previous Website) ─────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  const genStartRef = useRef<number>(0);

  // ─── Build sandboxed preview HTML ────────────────────────────────────────────
  const previewHtml = useMemo(() => {
    if (!htmlCode && !cssCode) return '';

    const hasDoctype = htmlCode.includes('<!DOCTYPE') || htmlCode.includes('<html');

    // If complete HTML document
    if (hasDoctype) {
      let doc = htmlCode;
      if (cssCode && !doc.includes(cssCode.substring(0, 30))) {
        if (doc.includes('</head>')) {
          doc = doc.replace('</head>', `<style>\n${cssCode}\n</style>\n</head>`);
        }
      }
      if (jsCode && !doc.includes(jsCode.substring(0, 30))) {
        if (doc.includes('</body>')) {
          doc = doc.replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);
        } else {
          doc += `\n<script>\n${jsCode}\n</script>`;
        }
      }
      return doc;
    }

    // Wrap in standard sandbox document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || 'Website Preview'}</title>
  <style>
${cssCode}
  </style>
</head>
<body>
${htmlCode}
${jsCode ? `<script>\n${jsCode}\n</script>` : ''}
</body>
</html>`;
  }, [htmlCode, cssCode, jsCode, projectName]);

  // ─── Generation Stepper ───────────────────────────────────────────────────
  const runGenSteps = useCallback(() => {
    const steps: GenStep[] = ['analyzing', 'scaffolding', 'styling', 'scripting', 'rendering'];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setGenStep(steps[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // ─── A. Generate Website ──────────────────────────────────────────────────
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    setIsGenerating(true);
    setProviderNotice(null);
    genStartRef.current = Date.now();

    const stopSteps = runGenSteps();

    try {
      const payload: WebsiteGenerateRequest = {
        prompt: prompt.trim(),
        framework: 'HTML/CSS',
        template: template.trim() || 'College Dashboard',
      };

      const response = await apiClient.post<WebsiteGenerateResponse>('/website/generate', payload);
      const data = response.data;

      const newHtml = data.files?.['index.html'] || data.app || '';
      const newCss = data.files?.['styles.css'] || data.css || '';
      const newJs = data.files?.['script.js'] || data.js || '';
      const newReadme = data.files?.['README.md'] || '';

      setHtmlCode(newHtml);
      setCssCode(newCss);
      setJsCode(newJs);
      setReadmeCode(newReadme);

      // Save baseline for Reset Source
      baselineRef.current = { html: newHtml, css: newCss, js: newJs, readme: newReadme };

      setHasGenerated(true);
      setSavedProjectName(null);

      const elapsed = Math.round((Date.now() - genStartRef.current) / 100) / 10;
      setGenerationTime(elapsed);

      if (data.fallback_used) {
        setFallbackUsed(true);
        setProvider('deterministic_fallback');
        const fallbackMsg =
          data.message || 'Gemini unavailable or timed out. Website generated using the deterministic fallback.';
        setProviderNotice(fallbackMsg);
        info(fallbackMsg);
      } else {
        setFallbackUsed(false);
        setProvider('gemini');
        setProviderNotice(null);
        success(`✓ Website generated with Gemini AI in ${elapsed}s`);
      }

      setGenStep('done');
      setIframeKey((k) => k + 1);
    } catch (err) {
      // Preserve previous working website on error
      setError(extractErrorMessage(err));
      setGenStep('idle');
    } finally {
      setIsGenerating(false);
      stopSteps();
    }
  };

  // ─── D. AI Modify Website ─────────────────────────────────────────────────
  const handleModify = async () => {
    if (!modifyPrompt.trim() || (!htmlCode && !cssCode)) {
      toastError('Generate a website first before modifying.');
      return;
    }

    setError(null);
    setIsModifying(true);
    setGenStep('scripting');

    try {
      const payload: WebsiteModifyRequest = {
        modification_prompt: modifyPrompt.trim(),
        current_html: htmlCode,
        current_css: cssCode,
        current_js: jsCode,
        framework: 'HTML/CSS',
      };

      const response = await apiClient.post<WebsiteGenerateResponse>('/website/modify', payload);
      const data = response.data;

      const updatedHtml = data.files?.['index.html'] || data.app || htmlCode;
      const updatedCss = data.files?.['styles.css'] || data.css || cssCode;
      const updatedJs = data.files?.['script.js'] || data.js || jsCode;
      const updatedReadme = data.files?.['README.md'] || readmeCode;

      setHtmlCode(updatedHtml);
      setCssCode(updatedCss);
      setJsCode(updatedJs);
      setReadmeCode(updatedReadme);

      // Update baseline to modified version
      baselineRef.current = { html: updatedHtml, css: updatedCss, js: updatedJs, readme: updatedReadme };
      setSavedProjectName(null);

      if (data.fallback_used) {
        setFallbackUsed(true);
        setProvider('deterministic_fallback');
        const fallbackMsg =
          data.message || 'Gemini unavailable or timed out. Website modified using deterministic fallback.';
        setProviderNotice(fallbackMsg);
        info(fallbackMsg);
      } else {
        setFallbackUsed(false);
        setProvider('gemini');
        setProviderNotice(null);
        success('✓ Website modified successfully with AI');
      }

      setGenStep('done');
      setIframeKey((k) => k + 1);
    } catch (err) {
      // Error handling: preserve previous working website
      setError(extractErrorMessage(err));
      setGenStep('idle');
    } finally {
      setIsModifying(false);
    }
  };

  // ─── C. Update Preview & Reset Source ─────────────────────────────────────
  const handleUpdatePreview = () => {
    setIframeKey((k) => k + 1);
    success('✓ Preview updated from source editor');
  };

  const handleResetSource = () => {
    if (baselineRef.current.html || baselineRef.current.css || baselineRef.current.js || baselineRef.current.readme) {
      setHtmlCode(baselineRef.current.html);
      setCssCode(baselineRef.current.css);
      setJsCode(baselineRef.current.js);
      setReadmeCode(baselineRef.current.readme);
      setIframeKey((k) => k + 1);
      info('Source reset to original generated code');
    } else {
      toastError('No generated baseline to reset to.');
    }
  };

  const handleClearPrompt = () => {
    setPrompt('');
  };

  const handleResetPromptToDefault = () => {
    setPrompt(DEFAULT_DEMO_PROMPT);
    setTemplate('College Dashboard');
    setProjectName('smart-college-events');
    info('Prompt reset to Smart College Event demo');
  };

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setPrompt(p.prompt);
    setTemplate(p.template);
    setProjectName(p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    info(`Loaded preset: ${p.title}`);
  };

  // ─── F. Export: Download HTML ─────────────────────────────────────────────
  const handleDownloadHtml = () => {
    if (!previewHtml) {
      toastError('Generate a website first.');
      return;
    }
    setIsDownloadingHtml(true);
    try {
      const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
      triggerBlobDownload(blob, `${projectName || 'website'}.html`);
      success('Downloaded standalone HTML file');
    } catch (err) {
      toastError('Failed to download HTML');
    } finally {
      setIsDownloadingHtml(false);
    }
  };

  // ─── F. Export: Download ZIP ──────────────────────────────────────────────
  const handleDownloadZip = async () => {
    if (!htmlCode && !cssCode) {
      toastError('Generate a website first.');
      return;
    }
    const cleanProjectName = (projectName.trim() || 'workspace-site').replace(/\s+/g, '-').toLowerCase();

    setIsDownloadingZip(true);
    setError(null);

    try {
      // 1. First save the latest code to the server so it can be zipped
      await apiClient.post<WebsiteSaveResponse>('/website/save', {
        project_name: cleanProjectName,
        framework: 'HTML/CSS',
        app: htmlCode,
        css: cssCode,
        js: jsCode,
      });
      setSavedProjectName(cleanProjectName);

      // 2. Generate a single-use presigned download token
      const res = await apiClient.post<{ download_url: string, token: string }>(
        `/website/generate-download-link/${cleanProjectName}`
      );
      
      // 3. Trigger native browser download via the same-origin proxy URL
      window.location.href = res.data.download_url;
      
      success(`✓ Downloaded ${cleanProjectName}.zip`);
    } catch (err) {
      setError(extractErrorMessage(err) || 'Failed to download ZIP archive.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // ─── Save Project on Server ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!htmlCode && !cssCode) return;
    const cleanName = (projectName.trim() || 'workspace-site').replace(/\s+/g, '-').toLowerCase();

    setError(null);
    setIsSaving(true);

    try {
      const payload: WebsiteSaveRequest = {
        project_name: cleanName,
        framework: 'HTML/CSS',
        app: htmlCode,
        css: cssCode,
        js: jsCode,
      };
      const response = await apiClient.post<WebsiteSaveResponse>('/website/save', payload);
      setSavedProjectName(cleanName);
      success(response.data.message || `Project saved: ${cleanName}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Pop-out in New Window ────────────────────────────────────────────────
  const handlePopout = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    info('Preview opened in external browser tab');
  };

  // ─── Copy tab code ────────────────────────────────────────────────────────
  const handleCopyCode = async (tab: SourceTab) => {
    const code = tab === 'html' ? htmlCode : tab === 'css' ? cssCode : tab === 'js' ? jsCode : readmeCode;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 1800);
    } catch {
      toastError('Failed to copy code to clipboard');
    }
  };

  // ─── G. Publish Website ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!htmlCode && !cssCode) {
      toastError('Generate a website first.');
      return;
    }
    const cleanName = (projectName.trim() || 'workspace-site').replace(/\s+/g, '-').toLowerCase();

    setError(null);
    setIsPublishing(true);

    try {
      // Build standalone HTML for index.html
      const standaloneHtml = htmlCode.includes('<!DOCTYPE')
        ? htmlCode
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${htmlCode}
  <script src="script.js"></script>
</body>
</html>`;

      const payload: WebsitePublishRequest = {
        project_name: cleanName,
        site_id: publishedSiteId || undefined,
        files: {
          'index.html': standaloneHtml,
          'styles.css': cssCode || '/* Styles */',
          'script.js': jsCode || '// JavaScript',
          'README.md': readmeCode || '# Website Project',
        },
      };

      const response = await apiClient.post<WebsitePublishResponse>('/website/publish', payload);
      const data = response.data;

      setPublishedUrl(data.published_url);
      setPublishedSiteId(data.site_id);
      success(`✓ Published! ${data.published_url}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Copy Published URL ──────────────────────────────────────────────────
  const handleCopyPublishedUrl = async () => {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      success('Published URL copied to clipboard');
    } catch {
      toastError('Failed to copy URL');
    }
  };

  // ─── Open Published Site ──────────────────────────────────────────────────
  const handleOpenPublished = () => {
    if (!publishedUrl) return;
    window.open(publishedUrl, '_blank');
    info('Opening published website in browser');
  };

  const hasCode = !!(htmlCode || cssCode);
  const codeLineCounts = {
    html: htmlCode ? htmlCode.split('\n').length : 0,
    css: cssCode ? cssCode.split('\n').length : 0,
    js: jsCode ? jsCode.split('\n').length : 0,
    readme: readmeCode ? readmeCode.split('\n').length : 0,
  };

  // ─── File Tree Helpers ────────────────────────────────────────────────────
  type ProjectFile = { name: string; icon: string; tab: SourceTab | null; lines: number };
  const projectFiles: ProjectFile[] = [
    { name: 'index.html', icon: '🟠', tab: 'html', lines: codeLineCounts.html },
    { name: 'styles.css', icon: '🔵', tab: 'css', lines: codeLineCounts.css },
    { name: 'script.js', icon: '🟡', tab: 'js', lines: codeLineCounts.js },
    { name: 'README.md', icon: '📄', tab: 'readme', lines: codeLineCounts.readme },
  ];

  const handleFileTreeClick = (file: ProjectFile) => {
    if (file.tab) {
      setSourceTab(file.tab);
      if (viewMode === 'preview') setViewMode('split');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar />

      {/* ── Studio Navigation Header ── */}
      <div className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">AI Website Development Studio</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Live Studio
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>Target: Smart College Event &amp; Attendance Platform</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Header: View Mode Switcher + Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generation Status Indicator */}
            {(isGenerating || isModifying) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs font-mono text-indigo-300">
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>{GEN_STEPS[genStep] || (isModifying ? 'Modifying…' : 'Processing…')}</span>
              </div>
            )}

            {/* Provider Transparency Badge */}
            {hasGenerated && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                  fallbackUsed
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
                title={
                  fallbackUsed
                    ? 'Deterministic offline fallback engine was used.'
                    : 'Generated using live Gemini AI model.'
                }
              >
                {fallbackUsed ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Provider: Deterministic Fallback</span>
                    <span className="text-amber-500 font-semibold">(Fallback Used: Yes)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Provider: Gemini</span>
                    <span className="text-emerald-500 font-semibold">(Fallback Used: No)</span>
                    {generationTime && <span className="text-emerald-400/70">· {generationTime}s</span>}
                  </>
                )}
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium text-slate-300">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'split' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
                title="Split View (Preview + Source)"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
                title="Focus on Live Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Only</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'editor' ? 'bg-indigo-600 text-white font-semibold' : 'hover:text-white'
                }`}
                title="Focus on Source Editor"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor Only</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner (Preserves Preview) ── */}
      {error && (
        <div className="px-4 pt-3">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* ── Transparency Notice Banner ── */}
      {providerNotice && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded text-[10px]">
            PROVIDER AUDIT
          </span>
          <span className="flex-1">{providerNotice}</span>
          <span className="text-[10px] text-amber-400/80">Fallback Used: {fallbackUsed ? 'Yes' : 'No'}</span>
        </div>
      )}

      {/* ── MAIN STUDIO WORKSPACE ── */}
      <main className="flex-1 flex overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)' }}>

        {/* ═════════════════════════════════════════════════════════════════════
            PANEL A + D: LEFT CONTROLS (Natural Language Prompt + AI Modify)
           ═════════════════════════════════════════════════════════════════════ */}
        <aside className="w-96 flex-shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col overflow-y-auto">
          {/* Section A: Prompt Area */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-100">Website Prompt Editor</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetPromptToDefault}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 hover:underline cursor-pointer"
                  title="Reset to default demo prompt"
                >
                  <RotateCcw className="w-3 h-3" />
                  Default Demo
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={handleClearPrompt}
                  className="text-[10px] text-slate-500 hover:text-slate-400 font-mono cursor-pointer"
                  title="Clear prompt text"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1">
              <textarea
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the website you want to build in natural language…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-y leading-relaxed font-sans shadow-inner"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{prompt.length} characters</span>
                <span>Ctrl+Enter to generate</span>
              </div>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Output
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400">
                  Static HTML/CSS/JavaScript
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Template
                </label>
                <input
                  type="text"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="E.g. College Dashboard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Generate Button */}
            <LoadingButton
              type="button"
              onClick={() => handleGenerate()}
              isLoading={isGenerating}
              loadingText="Synthesizing Website…"
              variant="primary"
              className="w-full py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/20"
              icon={Globe}
            >
              Generate Website
            </LoadingButton>
          </div>

          {/* Section D: AI Modify Area */}
          <div className="p-4 border-b border-slate-800 space-y-3 bg-violet-950/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-100">AI Modify</h3>
              </div>
              <span className="text-[10px] font-mono text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded">
                Iterative
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Tell the AI how to modify this website:
            </p>

            <textarea
              rows={3}
              value={modifyPrompt}
              onChange={(e) => setModifyPrompt(e.target.value)}
              placeholder="Tell the AI how to modify this website..."
              className="w-full bg-slate-950 border border-violet-800/40 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 resize-y leading-relaxed font-sans shadow-inner"
            />

            {/* Quick Demo Modification Suggestions */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Suggested Faculty Modifications:
              </span>
              <button
                type="button"
                onClick={() =>
                  setModifyPrompt(
                    'Add an attendance analytics section showing present, absent and attendance percentage with an event-wise chart.'
                  )
                }
                className="w-full text-left p-2 rounded-lg bg-slate-950/80 border border-violet-900/40 hover:border-violet-500 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                📊 Add attendance analytics &amp; event-wise chart
              </button>
            </div>

            <LoadingButton
              type="button"
              onClick={handleModify}
              isLoading={isModifying}
              loadingText="Modifying Website…"
              variant="primary"
              className="w-full py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/20 cursor-pointer"
              icon={Wand2}
              disabled={!modifyPrompt.trim() || !hasCode}
            >
              Modify Website
            </LoadingButton>
          </div>

          {/* Presets Gallery */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Demo Presets
              </span>
            </div>
            {PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                  template === p.template
                    ? 'bg-slate-900 border-indigo-500/60 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-semibold truncate text-[11px]">{p.title}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.template}</div>
              </button>
            ))}
          </div>

          {/* Section E: Project File Tree */}
          {hasGenerated && (
            <div className="p-4 border-b border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => setFileTreeOpen(!fileTreeOpen)}
                className="flex items-center gap-2 w-full text-left cursor-pointer"
              >
                {fileTreeOpen ? (
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex-1">
                  Project Files
                </span>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${fileTreeOpen ? 'rotate-90' : ''}`} />
              </button>

              {fileTreeOpen && (
                <div className="space-y-0.5 pl-1">
                  {/* Project folder header */}
                  <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-mono text-slate-400">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-indigo-300">{projectName || 'website-project'}</span>
                  </div>

                  {/* Files */}
                  {projectFiles.map((file) => (
                    <button
                      key={file.name}
                      type="button"
                      onClick={() => handleFileTreeClick(file)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-1.5 ml-3 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                        file.tab === sourceTab
                          ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                          : file.tab
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-500 cursor-default'
                      }`}
                      disabled={!file.tab}
                    >
                      <span className="text-[10px]">{file.icon}</span>
                      <span className="flex-1">{file.name}</span>
                      {file.tab && file.lines > 0 && (
                        <span className="text-[9px] text-slate-500">{file.lines}L</span>
                      )}
                    </button>
                  ))}

                  {/* Assets folder placeholder */}
                  <div className="flex items-center gap-2 px-3 py-1 ml-3 text-[11px] font-mono text-slate-600">
                    <Folder className="w-3 h-3" />
                    <span>assets/</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section F: Export Area */}
          <div className="p-4 space-y-3 bg-slate-950/40 border-b border-slate-800">
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="project-slug"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {savedProjectName && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved as: {savedProjectName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <LoadingButton
                type="button"
                onClick={handleDownloadHtml}
                isLoading={isDownloadingHtml}
                loadingText="…"
                variant="outline"
                size="sm"
                className="text-xs font-medium cursor-pointer"
                icon={FileDown}
                disabled={!hasCode}
              >
                Download HTML
              </LoadingButton>

              <LoadingButton
                type="button"
                onClick={handleDownloadZip}
                isLoading={isDownloadingZip}
                loadingText="Zipping…"
                variant="outline"
                size="sm"
                className="text-xs font-medium cursor-pointer"
                icon={FolderArchive}
                disabled={!hasCode}
              >
                Download ZIP
              </LoadingButton>
            </div>

            <LoadingButton
              type="button"
              onClick={handleSave}
              isLoading={isSaving}
              loadingText="Saving…"
              variant="secondary"
              size="sm"
              className="w-full text-xs font-medium cursor-pointer"
              icon={Save}
              disabled={!hasCode}
            >
              Save to Workspace
            </LoadingButton>
            <div className="text-[10px] text-slate-600 font-mono text-center">
              ZIP contains index.html, styles.css, script.js
            </div>
          </div>

          {/* Section G: Publish Website */}
          <div className="p-4 space-y-3 mt-auto bg-gradient-to-b from-slate-950/50 to-emerald-950/10">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">Publish Website</h3>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Deploy to a real local URL accessible in the browser. Published site is a standalone static website.
            </p>

            <LoadingButton
              type="button"
              onClick={handlePublish}
              isLoading={isPublishing}
              loadingText="Publishing…"
              variant="primary"
              size="sm"
              className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 cursor-pointer"
              icon={Upload}
              disabled={!hasCode}
            >
              {publishedUrl ? 'Republish Website' : 'Publish Website'}
            </LoadingButton>

            {/* Published Status */}
            {publishedUrl && (
              <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">Published ✓</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 font-mono bg-slate-950/50 px-2 py-1.5 rounded-lg border border-emerald-800/40">
                  <Link className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                  <span className="flex-1 truncate">{publishedUrl}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleOpenPublished}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPublishedUrl}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors border border-slate-700"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3 h-3" />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[10px] text-emerald-500/70 font-mono text-center">
                  Site ID: {publishedSiteId}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ═════════════════════════════════════════════════════════════════════
            PANEL B: CENTER LIVE PREVIEW (Sandboxed iframe)
           ═════════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            className={`flex flex-col bg-slate-950 min-w-0 transition-all ${
              viewMode === 'split' ? 'flex-1 border-r border-slate-800' : 'flex-1'
            }`}
          >
            {/* Live Preview Controls Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop View (Full Width)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    previewDevice === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mock Address Bar */}
              <div className="hidden sm:flex items-center px-3 py-1 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-slate-400 max-w-sm truncate">
                <span className="text-emerald-500 mr-1.5">🔒</span>
                https://college.campus.local/{projectName || 'events'}
              </div>

              {/* Zoom & Refresh Preview Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => (z === 100 ? 75 : z === 75 ? 50 : 100))}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 cursor-pointer"
                  title="Toggle Zoom"
                >
                  {previewZoom}%
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIframeKey((k) => k + 1);
                    success('Preview refreshed');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white cursor-pointer transition-colors"
                  title="Refresh Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Refresh Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handlePopout}
                  disabled={!hasCode}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* iFrame Viewport Container */}
            <div className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-4">
              {hasCode ? (
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top center',
                    width:
                      previewDevice === 'mobile'
                        ? '375px'
                        : previewDevice === 'tablet'
                        ? '768px'
                        : '100%',
                    maxWidth: '100%',
                  }}
                  className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-950 transition-all duration-200"
                >
                  <iframe
                    key={iframeKey}
                    title="Sandboxed Live Preview"
                    srcDoc={previewHtml}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="w-full border-0 bg-[#07090f]"
                    style={{
                      height:
                        previewDevice === 'mobile'
                          ? '667px'
                          : previewDevice === 'tablet'
                          ? '600px'
                          : '740px',
                    }}
                  />
                </div>
              ) : (
                /* Empty Preview State */
                <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-indigo-400 shadow-xl">
                    <Globe className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200 mb-1">Live Preview Ready</h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
                    Enter your requirements in the prompt editor on the left and click{' '}
                    <strong className="text-indigo-400">Generate Website</strong> to launch the Smart College Event
                    demo.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Launch Smart College Event Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            PANEL C: SOURCE EDITOR (HTML, CSS, JavaScript Tabs + Actions)
           ═════════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div
            className={`flex flex-col bg-slate-900/40 min-w-0 transition-all ${
              viewMode === 'split' ? 'w-[480px] xl:w-[540px] flex-shrink-0' : 'flex-1'
            }`}
          >
            {/* Source Editor Tabs & Controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
              {/* Four Source Tabs: HTML, CSS, JavaScript, README */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSourceTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                    sourceTab === 'html' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-orange-400" />
                  <span>HTML</span>
                  {codeLineCounts.html > 0 && (
                    <span className="text-[10px] opacity-75">({codeLineCounts.html}L)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('css')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                    sourceTab === 'css' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSS</span>
                  {codeLineCounts.css > 0 && (
                    <span className="text-[10px] opacity-75">({codeLineCounts.css}L)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('js')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                    sourceTab === 'js' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-yellow-400" />
                  <span>JavaScript</span>
                  {codeLineCounts.js > 0 && (
                    <span className="text-[10px] opacity-75">({codeLineCounts.js}L)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('readme')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                    sourceTab === 'readme' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>README</span>
                  {codeLineCounts.readme > 0 && (
                    <span className="text-[10px] opacity-75">({codeLineCounts.readme}L)</span>
                  )}
                </button>
              </div>

              {/* Source Editor Buttons: Update Preview & Reset Source */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyCode(sourceTab)}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="Copy current tab code"
                >
                  {copiedTab === sourceTab ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetSource}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                  title="Revert manual edits back to generated code"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Source</span>
                </button>

                <button
                  type="button"
                  onClick={handleUpdatePreview}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors shadow-sm"
                  title="Rebuild preview iframe with current edited code"
                >
                  <Play className="w-3 h-3" />
                  <span>Update Preview</span>
                </button>
              </div>
            </div>

            {/* Code Textarea & Gutter */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden font-mono text-xs">
              {sourceTab === 'html' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="select-none py-3 px-2 text-right bg-slate-950 border-r border-slate-800/80 text-slate-600 text-[11px] shrink-0 font-mono w-10">
                    {(htmlCode || '').split('\n').map((_, i) => (
                      <div key={i} className="leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    placeholder="<!-- HTML Markup -->"
                    spellCheck={false}
                    className="flex-1 bg-transparent p-3 text-slate-200 font-mono text-xs resize-none focus:outline-none leading-5 overflow-auto selection:bg-indigo-600 selection:text-white whitespace-pre"
                  />
                </div>
              )}

              {sourceTab === 'css' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="select-none py-3 px-2 text-right bg-slate-950 border-r border-slate-800/80 text-slate-600 text-[11px] shrink-0 font-mono w-10">
                    {(cssCode || '').split('\n').map((_, i) => (
                      <div key={i} className="leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    placeholder="/* CSS Stylesheet */"
                    spellCheck={false}
                    className="flex-1 bg-transparent p-3 text-slate-200 font-mono text-xs resize-none focus:outline-none leading-5 overflow-auto selection:bg-indigo-600 selection:text-white whitespace-pre"
                  />
                </div>
              )}

              {sourceTab === 'js' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="select-none py-3 px-2 text-right bg-slate-950 border-r border-slate-800/80 text-slate-600 text-[11px] shrink-0 font-mono w-10">
                    {(jsCode || '').split('\n').map((_, i) => (
                      <div key={i} className="leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    placeholder="// JavaScript client logic"
                    spellCheck={false}
                    className="flex-1 bg-transparent p-3 text-slate-200 font-mono text-xs resize-none focus:outline-none leading-5 overflow-auto selection:bg-indigo-600 selection:text-white whitespace-pre"
                  />
                </div>
              )}

              {sourceTab === 'readme' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="select-none py-3 px-2 text-right bg-slate-950 border-r border-slate-800/80 text-slate-600 text-[11px] shrink-0 font-mono w-10">
                    {(readmeCode || '').split('\n').map((_, i) => (
                      <div key={i} className="leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={readmeCode}
                    onChange={(e) => setReadmeCode(e.target.value)}
                    placeholder="# Project README"
                    spellCheck={false}
                    className="flex-1 bg-transparent p-3 text-slate-200 font-mono text-xs resize-none focus:outline-none leading-5 overflow-auto selection:bg-indigo-600 selection:text-white whitespace-pre"
                  />
                </div>
              )}
            </div>

            {/* Bottom Status Indicator for Editor */}
            <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-semibold uppercase">{sourceTab}</span>
                <span>
                  {sourceTab === 'html'
                    ? `${codeLineCounts.html} lines`
                    : sourceTab === 'css'
                    ? `${codeLineCounts.css} lines`
                    : sourceTab === 'js'
                    ? `${codeLineCounts.js} lines`
                    : `${codeLineCounts.readme} lines`}
                </span>
              </div>
              <div className="text-slate-400">Click Update Preview to apply changes</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
