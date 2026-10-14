import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  Zap,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { LoadingButton } from '../components/LoadingButton';
import { ErrorMessage } from '../components/ErrorMessage';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, login, backendMode, setMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await register(name, email, password);
      setSuccessMessage(res.message || 'Registration successful! Signing you in...');

      try {
        await login(email, password);
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
      } catch {
        setTimeout(() => {
          navigate('/login');
        }, 1200);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToStandalone = async () => {
    setMode('mock');
    setError(null);
    setIsLoading(true);
    try {
      const res = await register(name || 'Engineer', email || 'engineer@workspace.dev', password || 'workspace123');
      setSuccessMessage(res.message);
      await login(email || 'engineer@workspace.dev', password || 'workspace123');
      navigate('/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
          <Code2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Create Workspace Account
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Register with the FastAPI backend to start building
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-5">
          {/* Mode Switcher */}
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

          <ErrorMessage error={error} onDismiss={() => setError(null)} />

          {error && backendMode === 'live' && (
            <button
              type="button"
              onClick={handleSwitchToStandalone}
              className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Switch to Standalone Engine &amp; Register</span>
            </button>
          )}

          {successMessage && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-emerald-200 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

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
                  placeholder="ada@domain.com"
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
                  minLength={4}
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
                loadingText="Registering..."
                variant="primary"
                className="w-full py-2.5"
                icon={ArrowRight}
              >
                Create Account
              </LoadingButton>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
