import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  RefreshCw,
  Play,
  Terminal,
  Database,
  Cpu,
  Layout,
  FileText,
  Clock,
  Wrench,
  Wand2,
  FolderKanban,
  FlaskConical,
  Plus,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { getBackendMode } from '../api/client';
import { projectService } from '../api/projectService';
import {
  Project,
  Requirement,
  StructuredRequirement,
  Specification,
  ImplementationPlan,
  Artifact,
  ValidationRunResponse,
  Defect,
  GenerationRun,
  TestCase,
  TestResult,
} from '../types';
import { useToast } from '../context/ToastContext';

type ActiveTab =
  | 'requirements'
  | 'specification'
  | 'plan'
  | 'artifacts'
  | 'validation'
  | 'tests'
  | 'runs';

export const ProjectStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id, 10) : 0;
  const { success, error, info } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('requirements');
  const [loading, setLoading] = useState(true);

  // Sub-data states
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [currentReqText, setCurrentReqText] = useState('');
  const [analyzingReq, setAnalyzingReq] = useState(false);
  const [structuredReq, setStructuredReq] = useState<StructuredRequirement | null>(null);

  const [specification, setSpecification] = useState<Specification | null>(null);
  const [generatingSpec, setGeneratingSpec] = useState(false);

  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [generatingArtifacts, setGeneratingArtifacts] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [validationReport, setValidationReport] = useState<ValidationRunResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [repairingDefectId, setRepairingDefectId] = useState<number | null>(null);

  const [runs, setRuns] = useState<GenerationRun[]>([]);

  // Test Cases & Results state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTestId, setRunningTestId] = useState<number | null>(null);
  const [showCreateTestForm, setShowCreateTestForm] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestType, setNewTestType] = useState('unit');
  const [newTestArtifactId, setNewTestArtifactId] = useState<number | null>(null);
  const [creatingTest, setCreatingTest] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<Record<number, {
    status: string;
    message?: string | null;
    stdout?: string;
    stderr?: string;
    verification_type?: string;
    docker_status?: string | null;
  }>>({});

  // Initial load
  const loadProjectData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const proj = await projectService.getProject(projectId);
      setProject(proj);

      // Load requirements
      const reqs = await projectService.getRequirements(projectId);
      setRequirements(reqs);
      if (reqs.length > 0) {
        setCurrentReqText(reqs[0].raw_text);
        if (reqs[0].structured) {
          setStructuredReq(reqs[0].structured);
        }
      }

      // Try load existing specification
      try {
        const spec = await projectService.getSpecification(projectId);
        setSpecification(spec);
      } catch {}

      // Try load existing plan
      try {
        const p = await projectService.getPlan(projectId);
        setPlan(p);
      } catch {}

      // Try load existing artifacts
      try {
        const artsRes = await projectService.getArtifacts(projectId);
        setArtifacts(artsRes.artifacts || []);
        if (artsRes.artifacts && artsRes.artifacts.length > 0) {
          setSelectedArtifact(artsRes.artifacts[0]);
        }
      } catch {}

      // Try load defects
      try {
        const defs = await projectService.getDefects(projectId);
        setDefects(defs || []);
      } catch {}

      // Try load runs
      try {
        const rRes = await projectService.getRuns(projectId);
        setRuns(rRes.runs || []);
      } catch {}

      // Try load test cases and results
      try {
        const tcs = await projectService.getTestCases(projectId);
        setTestCases(tcs || []);
      } catch {}
      try {
        const trs = await projectService.getProjectTestResults(projectId);
        setTestResults(trs || []);
      } catch {}
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Handlers
  const handleSaveAndAnalyzeRequirement = async () => {
    if (!currentReqText.trim()) {
      error('Please input a requirement description first.');
      return;
    }
    try {
      setAnalyzingReq(true);
      // 1. Create or save requirement
      const req = await projectService.createRequirement(projectId, currentReqText.trim());
      // 2. Analyze requirement
      const analysis = await projectService.analyzeRequirement(projectId, req.id);
      setStructuredReq(analysis.structured);
      if (getBackendMode() === 'mock') {
        info('Requirement analysis was simulated in Standalone mode.');
      } else {
        success('Requirements analyzed and structured successfully!');
      }
      // Refresh runs and project
      const proj = await projectService.getProject(projectId);
      setProject(proj);
      const rRes = await projectService.getRuns(projectId);
      setRuns(rRes.runs || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Requirement analysis failed');
    } finally {
      setAnalyzingReq(false);
    }
  };

  const handleGenerateSpecification = async () => {
    try {
      setGeneratingSpec(true);
      const res = await projectService.generateSpecification(projectId);
      setSpecification(res.specification);
      if (getBackendMode() === 'mock') {
        info('A simulated architecture specification was generated in Standalone mode.');
      } else {
        success('Architecture Specification synthesized successfully!');
      }
      const proj = await projectService.getProject(projectId);
      setProject(proj);
      const rRes = await projectService.getRuns(projectId);
      setRuns(rRes.runs || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Specification generation failed');
    } finally {
      setGeneratingSpec(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const res = await projectService.generatePlan(projectId);
      setPlan(res.plan);
      if (getBackendMode() === 'mock') {
        info('A simulated implementation plan was generated in Standalone mode.');
      } else {
        success('Multi-tier implementation plan synthesized successfully!');
      }
      const proj = await projectService.getProject(projectId);
      setProject(proj);
      const rRes = await projectService.getRuns(projectId);
      setRuns(rRes.runs || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Planning synthesis failed');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleGenerateArtifacts = async () => {
    try {
      setGeneratingArtifacts(true);
      const arts = await projectService.generateArtifacts(projectId);
      setArtifacts(arts);
      if (arts.length > 0) {
        setSelectedArtifact(arts[0]);
      }
      if (getBackendMode() === 'mock') {
        info(`${arts.length} simulated artifacts were created in Standalone mode.`);
      } else {
        success(`Generated ${arts.length} multi-tier source artifacts!`);
      }
      const proj = await projectService.getProject(projectId);
      setProject(proj);
      const rRes = await projectService.getRuns(projectId);
      setRuns(rRes.runs || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Artifact generation failed');
    } finally {
      setGeneratingArtifacts(false);
    }
  };

  const handleRunValidation = async () => {
    try {
      setValidating(true);
      const report = await projectService.validateProject(projectId);
      setValidationReport(report);
      const defs = await projectService.getDefects(projectId);
      setDefects(defs || []);
      const proj = await projectService.getProject(projectId);
      setProject(proj);
      const simulated = report.results.some((result) => result.check === 'standalone_simulation');
      if (simulated) {
        info('Standalone mode did not execute validation; see the report warning.');
      } else {
        success(
          `Validation complete: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warning} warnings`
        );
      }
    } catch (err: any) {
      error(err.response?.data?.detail || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleRepairDefect = async (defectId: number) => {
    try {
      setRepairingDefectId(defectId);
      const res = await projectService.repairDefect(projectId, defectId);
      if (res.status === 'simulated') {
        info('Defect repair was not performed in Standalone mode.');
      } else {
        success(`Defect repaired via ${res.strategy}!`);
      }
      // Refresh artifacts and defects
      const artsRes = await projectService.getArtifacts(projectId);
      setArtifacts(artsRes.artifacts || []);
      const defs = await projectService.getDefects(projectId);
      setDefects(defs || []);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Defect repair failed');
    } finally {
      setRepairingDefectId(null);
    }
  };

  const handleCopyCode = async () => {
    if (selectedArtifact?.content) {
      await navigator.clipboard.writeText(selectedArtifact.content);
      setCopiedCode(true);
      success('Artifact code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDownloadArtifact = () => {
    if (!selectedArtifact || !selectedArtifact.content) return;
    const blob = new Blob([selectedArtifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedArtifact.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTestCase = async () => {
    if (!newTestName.trim()) {
      error('Test case name is required.');
      return;
    }
    try {
      setCreatingTest(true);
      const tc = await projectService.createTestCase(projectId, {
        name: newTestName.trim(),
        test_type: newTestType,
        artifact_id: newTestArtifactId,
        description: `Test case for ${newTestType} testing`,
      });
      setTestCases((prev) => [tc, ...prev]);
      setNewTestName('');
      setNewTestArtifactId(null);
      setShowCreateTestForm(false);
      success(`Test case "${tc.name}" created.`);
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create test case');
    } finally {
      setCreatingTest(false);
    }
  };

  const handleRunTest = async (testCase: TestCase) => {
    try {
      setRunningTestId(testCase.id);
      const result = await projectService.runTestCase(projectId, testCase.id);
      setLastRunResult((prev) => ({
        ...prev,
        [testCase.id]: {
          status: result.status,
          message: result.message,
          stdout: result.stdout,
          stderr: result.stderr,
          verification_type: result.verification_type,
          docker_status: result.docker_status,
        },
      }));
      // Refresh test cases & project results
      const tcs = await projectService.getTestCases(projectId);
      setTestCases(tcs || []);
      const trs = await projectService.getProjectTestResults(projectId);
      setTestResults(trs || []);
      if (result.status === 'STATIC_PASS' || result.status === 'static_pass') {
        success(`Test "${testCase.name}": Static verification passed (Docker unavailable).`);
      } else if (result.status === 'STATIC_FAIL' || result.status === 'static_fail') {
        error(`Test "${testCase.name}": Static verification failed: ${result.message || ''}`);
      } else if (result.status === 'simulated') {
        info(`Test "${testCase.name}" was not executed in standalone simulation mode.`);
      } else if (result.status === 'runner_unavailable') {
        error(`Runner unavailable: ${result.message || 'Docker is not installed.'}`);
      } else if (result.status === 'passed') {
        success(`Test "${testCase.name}" passed.`);
      } else {
        error(`Test "${testCase.name}" ${result.status}: ${result.message || ''}`);
      }
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to run test');
    } finally {
      setRunningTestId(null);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'backend':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'frontend':
        return <Layout className="w-4 h-4 text-cyan-400" />;
      case 'tests':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'documentation':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-xs font-mono text-slate-400">Loading Engineering Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Breadcrumb & Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Link to="/projects" className="hover:text-indigo-400 flex items-center gap-1 transition">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </Link>
              <span>/</span>
              <span className="text-slate-200">{project?.name || `Project #${projectId}`}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {project?.name || <span className="text-slate-500 font-normal text-base">Loading project...</span>}
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                {project?.status ? `Status: ${project.status}` : 'Status: draft'}
              </span>
            </div>
          </div>

          {/* Quick Pipeline Status Indicator */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto">
            <span className={`px-2 py-1 rounded-lg ${structuredReq ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500'}`}>
              1. Requirements
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-1 rounded-lg ${specification ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500'}`}>
              2. Spec
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-1 rounded-lg ${plan ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500'}`}>
              3. Plan
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-1 rounded-lg ${artifacts.length > 0 ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-500'}`}>
              4. Artifacts ({artifacts.length})
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-1 rounded-lg ${validationReport ? 'bg-emerald-600/30 text-emerald-300' : 'text-slate-500'}`}>
              5. Validated
            </span>
          </div>
        </div>

        {/* Studio Tabs Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 overflow-x-auto">
          {[
            { id: 'requirements', label: '1. Requirements', icon: FileText },
            { id: 'specification', label: '2. Spec', icon: Layers },
            { id: 'plan', label: '3. Plan', icon: FolderKanban },
            { id: 'artifacts', label: `4. Artifacts (${artifacts.length})`, icon: FileCode },
            { id: 'validation', label: '5. Validation', icon: ShieldCheck },
            { id: 'tests', label: `6. Tests (${testCases.length})`, icon: FlaskConical },
            { id: 'runs', label: `7. History (${runs.length})`, icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: REQUIREMENTS STUDIO */}
        {activeTab === 'requirements' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Textarea */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Natural-Language Software Requirement</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Provide the software goals, user roles, business rules, or user stories in plain English. The AI engine will extract actors, functional requirements, schemas, and acceptance criteria.
                  </p>
                </div>

                <textarea
                  rows={10}
                  value={currentReqText}
                  onChange={(e) => setCurrentReqText(e.target.value)}
                  placeholder="e.g. Build an IoT sensor telemetry monitoring workspace. Support temperature and vibration sensors, issue instant alert emails if readings exceed threshold limits, provide role-based authentication for operators and admins, and store records in PostgreSQL with sub-second querying..."
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono resize-none"
                />

                <button
                  type="button"
                  onClick={handleSaveAndAnalyzeRequirement}
                  disabled={analyzingReq || !currentReqText.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  {analyzingReq ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing & Structuring Requirements...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze & Structure Requirements</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Structured Output Cards */}
            <div className="lg:col-span-7 space-y-4">
              {!structuredReq ? (
                <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-3 flex flex-col items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-400/50" />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-300">Requirements not analyzed yet</div>
                    <div className="text-xs text-slate-500 max-w-sm">
                      Input your requirements on the left and click "Analyze &amp; Structure Requirements" to generate structured JSON decomposition.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">
                      Decomposition: <strong className="text-white">{structuredReq.functional_requirements?.length || 0}</strong> Functional · <strong className="text-indigo-400">{structuredReq.entities?.length || 0}</strong> Entities
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('specification')}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Proceed to Specification</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Actors */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider font-mono">
                        👤 System Actors
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {structuredReq.actors?.map((actor, idx) => (
                          <li key={idx} className="truncate">{actor}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Entities */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono">
                        📦 Domain Entities
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {structuredReq.entities?.map((ent, idx) => (
                          <li key={idx} className="truncate">{ent}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Functional Requirements */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 md:col-span-2">
                      <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                        ⚙️ Functional Requirements ({structuredReq.functional_requirements?.length})
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                        {structuredReq.functional_requirements?.map((req, idx) => (
                          <div key={idx} className="text-xs text-slate-200 flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span>{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Non-Functional Requirements */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                        🛡️ Non-Functional Targets
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {structuredReq.non_functional_requirements?.map((nfr, idx) => (
                          <li key={idx}>{nfr}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Acceptance Criteria */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono">
                        ✅ Acceptance Criteria
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {structuredReq.acceptance_criteria?.map((ac, idx) => (
                          <li key={idx}>{ac}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ARCHITECTURE SPECIFICATION */}
        {activeTab === 'specification' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Architecture Specification Synthesis</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Transforms structured requirements into database schemas, API endpoint contracts, frontend component mappings, and security models.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateSpecification}
                disabled={generatingSpec}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition shrink-0 cursor-pointer"
              >
                {generatingSpec ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Architecture...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{specification ? 'Regenerate Specification' : 'Synthesize Specification'}</span>
                  </>
                )}
              </button>
            </div>

            {!specification ? (
              <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-3 flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 text-indigo-400/50" />
                <div className="text-sm font-semibold text-slate-300">No Specification Generated Yet</div>
                <div className="text-xs text-slate-500 max-w-sm">
                  Click "Synthesize Specification" above to generate your architecture specification.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pattern & Overview */}
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {specification.architecture_pattern}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {specification.system_overview}
                  </p>
                </div>

                {/* Database Schemas & API Contracts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Database Schema */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                      <Database className="w-4 h-4" />
                      <span>Database Schema Design ({specification.database_schema?.length || 0})</span>
                    </div>

                    <div className="space-y-3">
                      {specification.database_schema?.map((table, idx) => (
                        <div key={idx} className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-white">{table.table_name}</span>
                            <span className="text-[11px] text-slate-400">{table.description}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {table.columns?.map((col, cIdx) => (
                              <span key={cIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Contract */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                      <Cpu className="w-4 h-4" />
                      <span>RESTful API Contract ({specification.api_contract?.length || 0})</span>
                    </div>

                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {specification.api_contract?.map((ep, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 font-mono">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              ep.method === 'POST' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {ep.method}
                            </span>
                            <span className="text-slate-200 text-xs font-semibold">{ep.endpoint}</span>
                          </div>
                          <span className="text-slate-400 text-[11px] truncate max-w-[200px]">{ep.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Security & Traceability */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Security Model &amp; Safeguards</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                    {specification.security_considerations?.map((sec, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-950/40 border border-slate-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{sec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IMPLEMENTATION PLAN */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                  <span>Dependency-Ordered Implementation Plan</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Synthesizes structured task phases across database models, backend routers, frontend components, test suites, and documentation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition shrink-0 cursor-pointer"
              >
                {generatingPlan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Plan...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{plan ? 'Regenerate Plan' : 'Synthesize Plan'}</span>
                  </>
                )}
              </button>
            </div>

            {!plan ? (
              <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-3 flex flex-col items-center justify-center">
                <FolderKanban className="w-8 h-8 text-indigo-400/50" />
                <div className="text-sm font-semibold text-slate-300">No Implementation Plan Generated Yet</div>
                <div className="text-xs text-slate-500 max-w-sm">
                  Click "Synthesize Plan" to produce the dependency execution timeline.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {plan.phases?.map((phase, pIdx) => (
                  <div key={pIdx} className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 font-mono text-xs flex items-center justify-center font-bold">
                          {phase.phase_number}
                        </span>
                        <h4 className="font-semibold text-sm text-white">{phase.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTierIcon(phase.tier)}
                        <span className="text-[11px] font-mono text-slate-400 uppercase">{phase.tier}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {phase.tasks?.map((task) => (
                        <div key={task.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-indigo-400 font-bold">{task.id}</span>
                            {task.target_artifact && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {task.target_artifact}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-200">{task.title}</div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{task.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MULTI-ARTIFACT CODE GENERATOR */}
        {activeTab === 'artifacts' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>Multi-Artifact Source Generation &amp; Explorer</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Generates concrete source code artifacts across all tiers: Database models, FastAPI endpoints, React components, automated tests, and system documentation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateArtifacts}
                disabled={generatingArtifacts}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition shrink-0 cursor-pointer"
              >
                {generatingArtifacts ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Multi-Artifacts...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{artifacts.length > 0 ? 'Regenerate Multi-Artifacts' : 'Generate Multi-Artifacts'}</span>
                  </>
                )}
              </button>
            </div>

            {artifacts.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-3 flex flex-col items-center justify-center">
                <FileCode className="w-8 h-8 text-indigo-400/50" />
                <div className="text-sm font-semibold text-slate-300">No Artifacts Generated Yet</div>
                <div className="text-xs text-slate-500 max-w-sm">
                  Click "Generate Multi-Artifacts" to synthesize full-stack source code files.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Artifacts Navigation Tree */}
                <div className="lg:col-span-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase font-mono px-1">
                    Artifact Manifest ({artifacts.length})
                  </div>
                  <div className="space-y-1.5">
                    {artifacts.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => setSelectedArtifact(art)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          selectedArtifact?.id === art.id
                            ? 'bg-slate-900 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {getTierIcon(art.artifact_type)}
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{art.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">{art.path || art.artifact_type}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          v{art.version}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Previewer */}
                <div className="lg:col-span-8 space-y-3">
                  {selectedArtifact ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
                      {/* Code Toolbar */}
                      <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-white">{selectedArtifact.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase">
                            {selectedArtifact.artifact_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadArtifact}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export</span>
                          </button>
                        </div>
                      </div>

                      {/* Code Content */}
                      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[550px] leading-relaxed select-text">
                        <code>{selectedArtifact.content || '// Empty artifact'}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-500">Select an artifact to inspect code</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VALIDATION, TESTING & REPAIR */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Validation, Consistency &amp; Automated Repair</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Verifies Python AST syntax compilation, requirement traceability coverage, and multi-tier completeness. Automatically identifies defects and synthesizes repairs.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunValidation}
                disabled={validating || artifacts.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition shrink-0 cursor-pointer"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Running Verification Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Verification Pipeline</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation Metrics Scorecard */}
            {validationReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400">Total Checks</div>
                  <div className="text-xl font-bold text-white">{validationReport.summary.total_checks}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="text-[11px] font-mono text-emerald-400">Passed</div>
                  <div className="text-xl font-bold text-emerald-300">{validationReport.summary.passed}</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <div className="text-[11px] font-mono text-rose-400">Failed (Defects)</div>
                  <div className="text-xl font-bold text-rose-300">{validationReport.summary.failed}</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="text-[11px] font-mono text-amber-400">Warnings</div>
                  <div className="text-xl font-bold text-amber-300">{validationReport.summary.warning}</div>
                </div>
              </div>
            )}

            {/* Defects Section (If any) */}
            {defects.length > 0 && (
              <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Detected Software Defects ({defects.length})</span>
                  </h4>
                  <span className="text-[11px] font-mono text-rose-400">Action Required</span>
                </div>

                <div className="space-y-2.5">
                  {defects.map((def) => (
                    <div
                      key={def.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 uppercase font-bold">
                            {def.severity}
                          </span>
                          <span className="font-mono text-slate-300 text-xs">{def.description}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Status: <strong className={def.status === 'repaired' ? 'text-emerald-400' : 'text-amber-400'}>{def.status}</strong>
                        </div>
                      </div>

                      {def.status !== 'repaired' && (
                        <button
                          type="button"
                          onClick={() => handleRepairDefect(def.id)}
                          disabled={repairingDefectId === def.id}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                        >
                          {repairingDefectId === def.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Repairing...</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="w-3.5 h-3.5" />
                              <span>AI Auto-Repair</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Check Results List */}
            {validationReport && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Verification Assertions &amp; Checks ({validationReport.results.length})
                </div>

                <div className="space-y-2">
                  {validationReport.results.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {res.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : res.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-200">{res.check}</div>
                          <div className="text-[11px] text-slate-400">{res.message}</div>
                        </div>
                      </div>

                      {res.artifact && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {res.artifact}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <span>Test Cases &amp; Isolated Execution</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Register test cases linked to generated test artifacts. Run them in an isolated Docker container (network-disabled, disposable). When Docker is unavailable, the workspace automatically falls back to safe deterministic Static Test Verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTestForm((v) => !v)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showCreateTestForm ? 'Cancel' : 'Register Test Case'}</span>
              </button>
            </div>

            {/* Create Test Form */}
            {showCreateTestForm && (
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-4">
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">Register New Test Case</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Test Name <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      value={newTestName}
                      onChange={(e) => setNewTestName(e.target.value)}
                      placeholder="e.g. test_hospital_api_health"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500 placeholder-slate-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Test Type</label>
                    <select
                      value={newTestType}
                      onChange={(e) => setNewTestType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="unit">unit</option>
                      <option value="integration">integration</option>
                      <option value="syntax">syntax</option>
                      <option value="api_health">api_health</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-slate-400">Link to Test Artifact (optional — required to run)</label>
                    <select
                      value={newTestArtifactId ?? ''}
                      onChange={(e) => setNewTestArtifactId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- No artifact linked --</option>
                      {artifacts
                        .filter((a) => a.artifact_type === 'tests')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (id:{a.id})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateTestCase}
                  disabled={creatingTest || !newTestName.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  {creatingTest ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Creating...</span></>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /><span>Register Test Case</span></>
                  )}
                </button>
              </div>
            )}

            {/* Test Artifacts overview */}
            {artifacts.filter((a) => a.artifact_type === 'tests').length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Generated Test Artifacts</div>
                <div className="space-y-1.5">
                  {artifacts
                    .filter((a) => a.artifact_type === 'tests')
                    .map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="flex-1 truncate">
                          <span className="font-mono font-semibold text-slate-200">{a.name}</span>
                          <span className="text-slate-500 ml-2">{a.path}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">v{a.version}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Test Cases list */}
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Registered Test Cases ({testCases.length})
              </div>

              {testCases.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center text-xs text-slate-500">
                  No test cases registered. Click "Register Test Case" above to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {testCases.map((tc) => {
                    const result = lastRunResult[tc.id];
                    const linkedArtifact = artifacts.find((a) => a.id === tc.artifact_id);
                    const canRun = !!tc.artifact_id && !!linkedArtifact;
                    return (
                      <div key={tc.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-slate-200">{tc.name}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                                tc.status === 'STATIC_PASS' || tc.status === 'static_pass' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                tc.status === 'STATIC_FAIL' || tc.status === 'static_fail' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                tc.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                                tc.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                                tc.status === 'skipped' || tc.status === 'simulated' ? 'bg-slate-500/10 text-slate-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>{
                                tc.status === 'STATIC_PASS' || tc.status === 'static_pass' ? 'STATIC PASS' :
                                tc.status === 'STATIC_FAIL' || tc.status === 'static_fail' ? 'STATIC FAIL' :
                                tc.status
                              }</span>
                              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{tc.test_type}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ID: {tc.id}
                              {tc.artifact_id && <span className="ml-2">· artifact_id: {tc.artifact_id}</span>}
                              {linkedArtifact && <span className="ml-2 text-amber-400">· {linkedArtifact.name}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRunTest(tc)}
                            disabled={runningTestId === tc.id || !canRun}
                            title={canRun ? 'Execute test suite (Docker isolated runner with Static Verification fallback)' : 'Link a test artifact to enable execution'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                              canRun
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {runningTestId === tc.id ? (
                              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Running...</span></>
                            ) : (
                              <><Play className="w-3.5 h-3.5" /><span>{canRun ? 'Run Test' : 'No Artifact'}</span></>
                            )}
                          </button>
                        </div>

                        {/* Last run result inline */}
                        {result && (() => {
                          const isStaticPass = result.status === 'STATIC_PASS' || result.status === 'static_pass';
                          const isStaticFail = result.status === 'STATIC_FAIL' || result.status === 'static_fail';
                          const isSimulated = result.status === 'simulated';
                          const isStatic = isStaticPass || isStaticFail || result.verification_type === 'Static Verification';
                          const verificationType = result.verification_type || (isSimulated ? 'Simulated' : (isStatic ? 'Static Verification' : 'Docker Runtime'));
                          const dockerStatus = result.docker_status || (isStatic || isSimulated ? 'NOT EXECUTED' : (result.status === 'runner_unavailable' ? 'UNAVAILABLE' : result.status.toUpperCase()));

                          return (
                            <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                              isStaticPass ? 'bg-emerald-500/10 border-emerald-500/30' :
                              isStaticFail ? 'bg-rose-500/10 border-rose-500/30' :
                              result.status === 'passed' ? 'bg-emerald-500/5 border-emerald-500/20' :
                              result.status === 'runner_unavailable' || isSimulated ? 'bg-slate-800/60 border-slate-700' :
                              result.status === 'timed_out' ? 'bg-amber-500/5 border-amber-500/20' :
                              'bg-rose-500/5 border-rose-500/20'
                            }`}>
                              {/* Top row with status badge and verification fields */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {isStaticPass || result.status === 'passed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : isStaticFail || result.status === 'failed' || result.status === 'execution_error' ? (
                                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                  ) : result.status === 'runner_unavailable' ? (
                                    <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                  )}
                                  <span className={`font-mono font-bold uppercase text-[11px] px-2 py-0.5 rounded ${
                                    isStaticPass ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                    isStaticFail ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                    result.status === 'passed' ? 'text-emerald-400' :
                                    result.status === 'runner_unavailable' || isSimulated ? 'text-slate-400' :
                                    result.status === 'timed_out' ? 'text-amber-400' :
                                    'text-rose-400'
                                  }`}>
                                    {isStaticPass ? 'STATIC PASS' : isStaticFail ? 'STATIC FAIL' : result.status}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                  <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                    <span className="text-slate-500">Verification Type:</span>{' '}
                                    <strong className={isStatic ? 'text-indigo-300' : 'text-cyan-400'}>{verificationType}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                                    <span className="text-slate-500">Docker Runtime:</span>{' '}
                                    <strong className={dockerStatus === 'NOT EXECUTED' ? 'text-amber-400' : 'text-slate-400'}>
                                      {dockerStatus}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              {/* Static Verification Explicit Notification */}
                              {isStaticPass && (
                                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
                                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold text-emerald-300">
                                      Static verification passed. Runtime execution was not performed because Docker is unavailable.
                                    </p>
                                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                                      Deterministic AST inspection verified test syntax, test suites, API contracts, requirement categories, database entities, and project traceability without executing generated code.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {isStaticFail && (
                                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold text-rose-300">
                                      {result.message || 'Static verification failed.'}
                                    </p>
                                    <p className="text-[11px] text-rose-400/80 mt-0.5">
                                      Runtime execution was not performed because Docker is unavailable.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {!isStatic && result.message && (
                                <div className="text-slate-400 text-[11px]">{result.message}</div>
                              )}

                              {result.stdout && (
                                <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap">{result.stdout}</pre>
                              )}
                              {result.stderr && (
                                <pre className="text-[10px] font-mono text-rose-300 bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap">{result.stderr}</pre>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Project-level test results summary */}
            {testResults.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  All Test Results ({testResults.length})
                </div>
                <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
                  {testResults.map((tr) => {
                    const isStaticPass = tr.status === 'STATIC_PASS' || tr.status === 'static_pass';
                    const isStaticFail = tr.status === 'STATIC_FAIL' || tr.status === 'static_fail';
                    const isStatic = isStaticPass || isStaticFail || tr.verification_type === 'Static Verification';
                    const vType = tr.verification_type || (isStatic ? 'Static Verification' : 'Docker Runtime');
                    const dStatus = tr.docker_status || (isStatic ? 'NOT EXECUTED' : (tr.status === 'runner_unavailable' ? 'UNAVAILABLE' : tr.status.toUpperCase()));

                    return (
                      <div key={tr.id} className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          {isStaticPass || tr.status === 'passed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isStaticFail || tr.status === 'failed' || tr.status === 'execution_error' ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : tr.status === 'runner_unavailable' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-mono text-slate-300">Result #{tr.id}</span>
                            <span className="text-slate-500 ml-2">test_case: {tr.test_case_id}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            <span className="text-slate-500">Type:</span> <strong className={isStatic ? 'text-indigo-300' : 'text-slate-300'}>{vType}</strong>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            <span className="text-slate-500">Docker:</span> <strong className={dStatus === 'NOT EXECUTED' ? 'text-amber-400' : 'text-slate-300'}>{dStatus}</strong>
                          </span>
                          {tr.duration_ms != null && (
                            <span className="text-[10px] font-mono text-slate-500">{tr.duration_ms}ms</span>
                          )}
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            isStaticPass ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            isStaticFail ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                            tr.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                            tr.status === 'runner_unavailable' ? 'bg-slate-800 text-slate-400' :
                            tr.status === 'timed_out' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>{isStaticPass ? 'STATIC PASS' : isStaticFail ? 'STATIC FAIL' : tr.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RUN HISTORY AUDIT */}
        {activeTab === 'runs' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>LLM Generation &amp; Execution Audit Log</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Traceable history of all requirement analysis, specification, planning, and multi-artifact synthesis runs.
              </p>
            </div>

            {runs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No generation runs recorded yet
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
                {runs.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-900/40 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Terminal className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 uppercase font-mono text-[11px]">
                            {r.operation.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {r.provider} · {r.model}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          Started: {new Date(r.started_at).toLocaleTimeString()}
                          {r.completed_at && ` · Completed: ${new Date(r.completed_at).toLocaleTimeString()}`}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        r.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
