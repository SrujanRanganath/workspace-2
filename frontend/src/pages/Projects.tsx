import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { projectService } from '../api/projectService';
import { Project, ProjectStatus } from '../types';
import { useToast } from '../context/ToastContext';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getProjects();
      setProjects(res.projects || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setCreating(true);
      const created = await projectService.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      success(`Project "${created.name}" created successfully`);
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project and all its artifacts?')) {
      return;
    }
    try {
      await projectService.deleteProject(id);
      success('Project removed');
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'validating':
      case 'testing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'building':
      case 'planning':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'requirements':
      case 'specification':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
              <FolderKanban className="w-4 h-4" />
              <span>Project Hub</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Multi-Artifact Software Rebuild</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Software Engineering Projects
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Requirement-driven autonomous multi-artifact workspace. Transform natural-language requirements into structured schemas, architecture specifications, multi-tier code artifacts, automated tests, and defect repairs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchProjects}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Refresh projects"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Engineering Project</span>
            </button>
          </div>
        </div>

        {/* Search & Statistics Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title or specification keywords..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Total Projects: <strong className="text-white">{projects.length}</strong></span>
            <span className="text-slate-700">|</span>
            <span>Completed: <strong className="text-emerald-400">{projects.filter((p) => p.status === 'complete').length}</strong></span>
          </div>
        </div>

        {/* Projects Grid / Empty State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-xs font-mono">Loading engineering workspaces...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 px-4 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-slate-900/20">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No engineering projects found</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {searchQuery
                  ? 'No projects matched your search criteria.'
                  : 'Start by creating your first requirement-driven engineering project.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${getStatusBadge(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'No project description provided. Open workspace to analyze requirements and generate multi-tier artifacts.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>

                  <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium text-xs">
                    <span>Open Studio</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create New Project */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Create Engineering Project</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Project Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Telemetry Anomaly Detection Platform"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Description & Scope (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Briefly state target scope, deployment environment, or architecture constraints..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 leading-relaxed">
                  💡 After creating your project, you can input your natural-language requirements in the Studio to automatically extract specifications, plan tasks, synthesize code, and run validation.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newProjectName.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{creating ? 'Creating...' : 'Create & Open Studio'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
