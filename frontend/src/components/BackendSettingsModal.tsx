import React, { useState } from 'react';
import {
  X,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  DEFAULT_API_BASE_URL,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LoadingButton } from './LoadingButton';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    backendStatus,
    checkBackendStatus,
    backendMode,
    setMode,
    hasMixedContentRisk,
  } = useAuth();
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    setApiBaseUrl(urlInput);
    setMode('live');
    const alive = await checkBackendStatus();
    setIsTesting(false);

    if (alive) {
      setTestResult({
        success: true,
        message: `Connected successfully to FastAPI backend at ${urlInput}!`,
      });
    } else {
      setTestResult({
        success: false,
        message: `Could not reach ${urlInput}. If running on HTTPS, modern browsers block HTTP mixed-content. Use Standalone Mode or an HTTPS tunnel.`,
      });
    }
  };

  const handleReset = async () => {
    resetApiBaseUrl();
    setUrlInput(DEFAULT_API_BASE_URL);
    setMode('live');
    setIsTesting(true);
    const alive = await checkBackendStatus();
    setIsTesting(false);
    setTestResult({
      success: alive,
      message: alive
        ? `Reset to ${DEFAULT_API_BASE_URL} and connected!`
        : `Reset to ${DEFAULT_API_BASE_URL}, but backend is not responding yet.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Backend Execution Engine</h3>
              <p className="text-xs text-slate-400">Configure connection mode and API target</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Execution Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('mock')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  backendMode === 'mock'
                    ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-indigo-300 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Standalone Engine</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  In-browser simulated backend conforming 100% to API contract. Zero mixed-content issues.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('live')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  backendMode === 'live'
                    ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-indigo-300 mb-1">
                  <Server className="w-3.5 h-3.5" />
                  <span>Live FastAPI</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Connects to FastAPI running on 127.0.0.1:8000 or custom HTTPS tunnel.
                </p>
              </button>
            </div>
          </div>

          {/* Mixed Content Warning if applicable */}
          {hasMixedContentRisk && backendMode === 'live' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-amber-300">Browser Security Notice</span>
                <p className="text-amber-200/90 leading-relaxed text-[11px]">
                  This app is loaded over <code className="bg-amber-950/60 px-1 rounded">HTTPS</code>. Most browsers block calls to insecure <code className="bg-amber-950/60 px-1 rounded">http://127.0.0.1:8000</code> due to Mixed Content &amp; Private Network Access security policies. Use <strong>Standalone Engine</strong> or an HTTPS tunnel (e.g. ngrok).
                </p>
              </div>
            </div>
          )}

          {/* Form for Live FastAPI URL */}
          {backendMode === 'live' && (
            <form onSubmit={handleTestAndSave} className="space-y-4 pt-1 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  FastAPI Base URL
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="http://127.0.0.1:8000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
                >
                  Reset Default
                </button>

                <LoadingButton
                  type="submit"
                  isLoading={isTesting}
                  loadingText="Testing..."
                  size="sm"
                  variant="primary"
                >
                  Save &amp; Test URL
                </LoadingButton>
              </div>
            </form>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
