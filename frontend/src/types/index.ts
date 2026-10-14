export interface User {
  id: string | number;
  name: string;
  email: string;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthRegisterResponse {
  message: string;
}

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  message?: string;
}

// Code Tool Types
export interface CodeGenerateRequest {
  prompt: string;
  language: string;
  template: string;
  project_name?: string;
}

export interface CodeGenerateResponse {
  code: string;
  project_name?: string;
  files?: Record<string, string>;
  provider?: string;
  fallback_used?: boolean;
  message?: string;
}

export interface CodeRegenerateFileRequest {
  project_name: string;
  file_path: string;
  instruction: string;
  current_code: string;
  project_context?: string;
}

export interface CodeRegenerateFileResponse {
  file_path: string;
  code: string;
  provider?: string;
  fallback_used?: boolean;
  message?: string;
}

export interface CodeSaveProjectRequest {
  project_name: string;
  files: Record<string, string>;
}

export interface CodeSaveProjectResponse {
  message: string;
  folder: string;
  file_count: number;
}

export interface CodeVerifyRequest {
  files: Record<string, string>;
  entrypoint?: string;
}

export interface CodeVerifyResponse {
  status: string;
  syntax_valid: boolean;
  summary: string;
  issues: string[];
  file_stats: Record<string, number>;
}

export interface CodeExplainRequest {
  code: string;
  language: string;
}

export interface CodeExplainResponse {
  explanation: string;
  provider?: string;
  fallback_used?: boolean;
}

export interface CodeSaveRequest {
  filename: string;
  code: string;
}

export interface CodeSaveResponse {
  message: string;
  filename: string;
}

export interface CodeRunRequest {
  filename: string;
}

export interface CodeRunResponse {
  output: string;
}

// Website Builder Types
export interface WebsiteGenerateRequest {
  prompt: string;
  framework: string;
  template: string;
}

export interface WebsiteModifyRequest {
  modification_prompt: string;
  current_html: string;
  current_css: string;
  current_js: string;
  framework: string;
}

export interface WebsiteGenerateResponse {
  app: string;
  css: string;
  js?: string;
  files?: Record<string, string>;
  provider?: string;
  fallback_used?: boolean;
  message?: string;
}

export interface WebsiteSaveRequest {
  project_name: string;
  framework: string;
  app: string;
  css: string;
  js?: string;
}

export interface WebsiteSaveResponse {
  message: string;
  folder: string;
}

export interface WebsitePublishRequest {
  project_name: string;
  site_id?: string;
  files?: Record<string, string>;
  app?: string;
  css?: string;
  js?: string;
}

export interface WebsitePublishResponse {
  site_id: string;
  published_url: string;
  message: string;
  files_published: string[];
}

// Data Cleaner Types
export interface DataCleanerResponse {
  message: string;
  original_rows: number;
  cleaned_rows: number;
  duplicates_removed: number;
  missing_values_filled: number;
  total_columns: number;
  column_names: string[];
  data_types?: Record<string, string>;
  missing_value_report: Record<string, number>;
  statistics?: Record<string, Record<string, number | string>>;
  filename: string;
  preview: Array<Record<string, any>>;
}

// Document Generator Types
export type DocumentTemplate =
  | 'resume'
  | 'cover_letter'
  | 'sop'
  | 'project_report'
  | 'other';

export interface DocumentGenerateRequest {
  document_type: 'docx';
  template: string;
  title: string;
  name: string;
  company?: string;
  content: string;
}

export interface DocumentGenerateResponse {
  message: string;
  filename: string;
}

// ==========================================
// Project Rebuild V1 Types
// ==========================================

export type ProjectStatus =
  | 'draft'
  | 'requirements'
  | 'specification'
  | 'planning'
  | 'building'
  | 'validating'
  | 'testing'
  | 'complete'
  | 'failed';

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  status: ProjectStatus | string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface StructuredRequirement {
  actors: string[];
  functional_requirements: string[];
  non_functional_requirements: string[];
  entities: string[];
  workflows: string[];
  api_requirements: string[];
  frontend_requirements: string[];
  data_requirements: string[];
  documentation_requirements: string[];
  acceptance_criteria: string[];
}

export interface Requirement {
  id: number;
  project_id: number;
  raw_text: string;
  structured?: StructuredRequirement | null;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RequirementAnalyzeResponse {
  requirement_id: number;
  structured: StructuredRequirement;
  status: string;
}

export interface SchemaTable {
  table_name: string;
  description: string;
  columns: string[];
}

export interface ApiContractItem {
  endpoint: string;
  method: string;
  description: string;
  request_body?: string | null;
  response_schema?: string;
}

export interface FrontendComponentItem {
  component_name: string;
  route: string;
  purpose: string;
  connected_apis?: string[];
}

export interface Specification {
  project_name: string;
  architecture_pattern: string;
  system_overview: string;
  database_schema: SchemaTable[];
  api_contract: ApiContractItem[];
  frontend_components: FrontendComponentItem[];
  security_considerations: string[];
  traceability_matrix?: Array<{ requirement_category: string; target_components: string[] }>;
}

export interface SpecificationResponse {
  project_id: number;
  requirement_id: number;
  specification: Specification;
  generation_run_id: number;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  target_artifact?: string;
  dependencies?: string[];
}

export interface PlanPhase {
  phase_number: number;
  name: string;
  tier: 'database' | 'backend' | 'frontend' | 'tests' | 'documentation' | string;
  tasks: PlanTask[];
}

export interface ImplementationPlan {
  project_name: string;
  total_phases: number;
  phases: PlanPhase[];
}

export interface PlanResponse {
  project_id: number;
  plan: ImplementationPlan;
  generation_run_id: number;
}

export interface Artifact {
  id: number;
  project_id: number;
  artifact_type: 'backend' | 'frontend' | 'database' | 'tests' | 'documentation' | 'configuration' | string;
  name: string;
  path?: string | null;
  content?: string | null;
  version: number;
  status: string;
  requirement_id?: number | null;
  generation_run_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactListResponse {
  artifacts: Artifact[];
  total: number;
}

export interface ValidationCheckResult {
  status: 'passed' | 'failed' | 'warning' | string;
  check: string;
  message: string;
  artifact?: string | null;
  requirement?: string | null;
}

export interface ValidationRunResponse {
  project_id: number;
  results: ValidationCheckResult[];
  summary: {
    passed: number;
    failed: number;
    warning: number;
    total_checks: number;
  };
}

export interface Defect {
  id: number;
  project_id: number;
  artifact_id?: number | null;
  severity: 'critical' | 'major' | 'minor' | 'info' | string;
  description: string;
  status: 'open' | 'diagnosed' | 'repaired' | 'verified' | 'wontfix' | string;
  created_at: string;
}

export interface RepairResponse {
  defect_id: number;
  status: string;
  strategy: string;
  patch?: string | null;
  message: string;
}

export interface GenerationRun {
  id: number;
  project_id: number;
  operation: string;
  status: string;
  provider?: string | null;
  model?: string | null;
  started_at: string;
  completed_at?: string | null;
  error?: string | null;
  input_metadata?: Record<string, any> | null;
  output_metadata?: Record<string, any> | null;
}

export interface GenerationRunListResponse {
  runs: GenerationRun[];
  total: number;
}

// ==========================================
// Test Case & Test Result Types
// ==========================================

export interface TestCase {
  id: number;
  project_id: number;
  artifact_id?: number | null;
  requirement_id?: number | null;
  name: string;
  description?: string | null;
  test_type: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped' | string;
  created_at: string;
}

export interface TestCaseCreateRequest {
  name: string;
  description?: string;
  test_type: string;
  artifact_id?: number | null;
  requirement_id?: number | null;
}

export interface TestResult {
  id: number;
  test_case_id: number;
  status: 'passed' | 'failed' | 'timed_out' | 'runner_unavailable' | 'execution_error' | 'STATIC_PASS' | 'STATIC_FAIL' | 'static_pass' | 'static_fail' | string;
  output?: string | null;
  duration_ms?: number | null;
  executed_at: string;
  verification_type?: 'Docker Runtime' | 'Static Verification' | string;
  docker_status?: string | null;
}

export interface TestExecutionResponse extends TestResult {
  exit_code?: number | null;
  stdout: string;
  stderr: string;
  message?: string | null;
  checks?: Record<string, boolean> | null;
  details?: string[] | null;
}


