import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  Lock,
  Mail,
  Server,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { LoadingButton } from '../components/LoadingButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { BackendSettingsModal } from '../components/BackendSettingsModal';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    login,
    backendStatus,
    apiBaseUrl,
    backendMode,
    setMode,
    quickDemoLogin,
    hasMixedContentRisk,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/projects';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Real credentials always use live FastAPI mode
      if (backendMode !== 'live') {
        setMode('live');
      }
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoLoading(true);
    try {
      await quickDemoLogin();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSwitchToStandaloneAndLogin = async () => {
    setMode('mock');
    setError(null);
    setIsLoading(true);
    try {
      await login(email || 'engineer@workspace.dev', password || 'workspace123');
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar with backend mode toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <div className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                backendStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                backendStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-[11px] text-slate-300">
            {backendMode === 'mock'
              ? 'Standalone Engine'
              : backendStatus === 'healthy'
              ? 'FastAPI 8000 Ready'
              : 'FastAPI Offline'}
          </span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
          <Code2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          AI Engineering Workspace
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Sign in to access Code Runner, Website Builder, Data Cleaner &amp; DOCX Generator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-5">
          {/* Mode Switcher Pill */}
          <div className="p-1 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('mock')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                backendMode === 'mock'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Standalone Engine</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                backendMode === 'live'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Live FastAPI (8000)</span>
            </button>
          </div>

          {/* Quick Demo Login One-Click Button */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-slate-950 border border-indigo-500/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Instant Exploration Mode
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                1-Click
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Explore the full tool suite instantly with pre-seeded test datasets and runners.
            </p>
            <LoadingButton
              type="button"
              onClick={handleDemoLogin}
              isLoading={isDemoLoading}
              loadingText="Launching Demo..."
              variant="primary"
              size="sm"
              className="w-full bg-indigo-600 hover:bg-indigo-500"
              icon={ArrowRight}
            >
              One-Click Demo Sign In
            </LoadingButton>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 shrink-0">
              Or Sign In With Credentials
            </span>
          </div>

          {/* Error Message with automatic fallback action button */}
          {error && (
            <div className="space-y-2">
              <ErrorMessage error={error} onDismiss={() => setError(null)} />
              {backendMode === 'live' && (
                <button
                  type="button"
                  onClick={handleSwitchToStandaloneAndLogin}
                  className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Switch to Standalone Engine &amp; Sign In</span>
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@workspace.dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                loadingText="Signing in..."
                variant="primary"
                className="w-full py-2.5"
                icon={ArrowRight}
              >
                Sign In to Workspace
              </LoadingButton>
            </div>
          </form>

          {/* Quick Registration link */}
          <div className="pt-3 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Need a new account?{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>

          {/* Context footnote */}
          <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/70 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Targeting{' '}
              <span className="font-mono text-slate-300">
                {backendMode === 'mock' ? 'In-App Standalone Engine' : apiBaseUrl}
              </span>
              . Conforms 100% to the FastAPI API specification.
            </div>
          </div>
        </div>
      </div>

      <BackendSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
