import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Code2,
  Globe,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Server,
  Menu,
  X,
  ChevronDown,
  Copy,
  Check,
  Search,
  Command,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BackendSettingsModal } from './BackendSettingsModal';
import { CommandPalette } from './CommandPalette';

export const Navbar: React.FC = () => {
  const { user, logout, backendStatus, apiBaseUrl, backendMode } = useAuth();
  const { success } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const navLinks = [
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Code Tool', path: '/tools/code', icon: Code2 },
    { name: 'Website Builder', path: '/tools/website', icon: Globe },
    { name: 'Data Cleaner', path: '/tools/data-cleaner', icon: FileSpreadsheet },
    { name: 'Document Generator', path: '/tools/documents', icon: FileText },
  ];

  // Listen for ⌘K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCopyToken = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      success('Bearer token copied to clipboard');
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Brand Logo + Nav Links */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
                  <Code2 className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-slate-100 group-hover:text-white transition-colors">
                    AI Engineering
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    / workspace
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`relative py-4 text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{link.name}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Command Search Trigger + Engine Indicator + User Menu */}
            <div className="hidden md:flex items-center gap-3">
              {/* Command Palette Trigger */}
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
                title="Open command palette (⌘K)"
              >
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Search tools...</span>
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500 flex items-center gap-0.5">
                  <Command className="w-2.5 h-2.5" />
                  <span>K</span>
                </kbd>
              </button>

              {/* Engine Status Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={
                  backendMode === 'mock'
                    ? 'Running on In-App Standalone Engine (Click to configure)'
                    : `Connected to FastAPI at ${apiBaseUrl}`
                }
              >
                <div className="relative flex h-2 w-2">
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      backendMode === 'mock'
                        ? 'bg-indigo-400'
                        : backendStatus === 'healthy'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-300">
                  {backendMode === 'mock'
                    ? 'Standalone Engine'
                    : backendStatus === 'healthy'
                    ? 'FastAPI 8000'
                    : 'Backend Offline'}
                </span>
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-3 h-3" />
                  </div>
                  <span className="max-w-[110px] truncate text-xs font-medium">
                    {user?.name || 'Engineer'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {userDropdownOpen && (
                  <div
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in duration-100"
                  >
                    <div className="px-3 py-2 border-b border-slate-800/80">
                      <div className="font-semibold text-slate-100">{user?.name}</div>
                      <div className="text-slate-400 truncate font-mono text-[11px] mt-0.5">
                        {user?.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Bearer Token</span>
                        </span>
                        {tokenCopied && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Server className="w-3.5 h-3.5 text-slate-400" />
                        <span>Execution Engine Settings</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-800/80 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white"
                title="Search (⌘K)"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <Server className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <BackendSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </>
  );
};
