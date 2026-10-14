import { apiClient } from './client';
import {
  Project,
  ProjectListResponse,
  ProjectCreateRequest,
  Requirement,
  RequirementAnalyzeResponse,
  Specification,
  SpecificationResponse,
  ImplementationPlan,
  PlanResponse,
  Artifact,
  ArtifactListResponse,
  ValidationRunResponse,
  Defect,
  RepairResponse,
  GenerationRunListResponse,
  TestCase,
  TestCaseCreateRequest,
  TestResult,
  TestExecutionResponse,
} from '../types';

export const projectService = {
  // --- Projects ---
  async getProjects(): Promise<ProjectListResponse> {
    const res = await apiClient.get<ProjectListResponse>('/api/v1/projects');
    return res.data;
  },

  async getProject(id: number | string): Promise<Project> {
    const res = await apiClient.get<Project>(`/api/v1/projects/${id}`);
    return res.data;
  },

  async createProject(data: ProjectCreateRequest): Promise<Project> {
    const res = await apiClient.post<Project>('/api/v1/projects', data);
    return res.data;
  },

  async updateProject(id: number | string, data: Partial<Project>): Promise<Project> {
    const res = await apiClient.patch<Project>(`/api/v1/projects/${id}`, data);
    return res.data;
  },

  async deleteProject(id: number | string): Promise<void> {
    await apiClient.delete(`/api/v1/projects/${id}`);
  },

  // --- Requirements ---
  async getRequirements(projectId: number | string): Promise<Requirement[]> {
    const res = await apiClient.get<Requirement[]>(`/api/v1/projects/${projectId}/requirements`);
    return res.data;
  },

  async createRequirement(projectId: number | string, raw_text: string): Promise<Requirement> {
    const res = await apiClient.post<Requirement>(`/api/v1/projects/${projectId}/requirements`, {
      raw_text,
    });
    return res.data;
  },

  async analyzeRequirement(
    projectId: number | string,
    requirementId?: number
  ): Promise<RequirementAnalyzeResponse> {
    const res = await apiClient.post<RequirementAnalyzeResponse>(
      `/api/v1/projects/${projectId}/requirements/analyze`,
      { requirement_id: requirementId }
    );
    return res.data;
  },

  // --- Specifications ---
  async getSpecification(projectId: number | string): Promise<Specification> {
    const res = await apiClient.get<Specification>(`/api/v1/projects/${projectId}/specification`);
    return res.data;
  },

  async generateSpecification(
    projectId: number | string,
    requirementId?: number
  ): Promise<SpecificationResponse> {
    const res = await apiClient.post<SpecificationResponse>(
      `/api/v1/projects/${projectId}/specification`,
      { requirement_id: requirementId }
    );
    return res.data;
  },

  // --- Implementation Plans ---
  async getPlan(projectId: number | string): Promise<ImplementationPlan> {
    const res = await apiClient.get<ImplementationPlan>(`/api/v1/projects/${projectId}/plan`);
    return res.data;
  },

  async generatePlan(
    projectId: number | string,
    requirementId?: number
  ): Promise<PlanResponse> {
    const res = await apiClient.post<PlanResponse>(
      `/api/v1/projects/${projectId}/plan`,
      { requirement_id: requirementId }
    );
    return res.data;
  },

  // --- Multi-Artifacts ---
  async getArtifacts(
    projectId: number | string,
    artifactType?: string
  ): Promise<ArtifactListResponse> {
    const res = await apiClient.get<ArtifactListResponse>(
      `/api/v1/projects/${projectId}/artifacts`,
      { params: artifactType ? { artifact_type: artifactType } : undefined }
    );
    return res.data;
  },

  async generateArtifacts(projectId: number | string): Promise<Artifact[]> {
    const res = await apiClient.post<Artifact[]>(`/api/v1/projects/${projectId}/generate`);
    return res.data;
  },

  async updateArtifact(
    projectId: number | string,
    artifactId: number | string,
    data: { content?: string; status?: string }
  ): Promise<Artifact> {
    const res = await apiClient.put<Artifact>(
      `/api/v1/projects/${projectId}/artifacts/${artifactId}`,
      data
    );
    return res.data;
  },

  // --- Validation & Repair ---
  async validateProject(projectId: number | string): Promise<ValidationRunResponse> {
    const res = await apiClient.post<ValidationRunResponse>(
      `/api/v1/projects/${projectId}/validate`
    );
    return res.data;
  },

  async getDefects(projectId: number | string): Promise<Defect[]> {
    const res = await apiClient.get<Defect[]>(`/api/v1/projects/${projectId}/defects`);
    return res.data;
  },

  async repairDefect(projectId: number | string, defectId: number): Promise<RepairResponse> {
    const res = await apiClient.post<RepairResponse>(`/api/v1/projects/${projectId}/repair`, {
      defect_id: defectId,
    });
    return res.data;
  },

  // --- Generation Runs ---
  async getRuns(projectId: number | string): Promise<GenerationRunListResponse> {
    const res = await apiClient.get<GenerationRunListResponse>(
      `/api/v1/projects/${projectId}/runs`
    );
    return res.data;
  },

  // --- Test Cases ---
  async getTestCases(projectId: number | string): Promise<TestCase[]> {
    const res = await apiClient.get<TestCase[]>(`/api/v1/projects/${projectId}/tests`);
    return res.data;
  },

  async createTestCase(
    projectId: number | string,
    data: TestCaseCreateRequest
  ): Promise<TestCase> {
    const res = await apiClient.post<TestCase>(`/api/v1/projects/${projectId}/tests`, data);
    return res.data;
  },

  async getTestCase(projectId: number | string, testCaseId: number): Promise<TestCase> {
    const res = await apiClient.get<TestCase>(
      `/api/v1/projects/${projectId}/tests/${testCaseId}`
    );
    return res.data;
  },

  async getTestCaseResults(
    projectId: number | string,
    testCaseId: number
  ): Promise<TestResult[]> {
    const res = await apiClient.get<TestResult[]>(
      `/api/v1/projects/${projectId}/tests/${testCaseId}/results`
    );
    return res.data;
  },

  async runTestCase(
    projectId: number | string,
    testCaseId: number
  ): Promise<TestExecutionResponse> {
    const res = await apiClient.post<TestExecutionResponse>(
      `/api/v1/projects/${projectId}/tests/${testCaseId}/run`
    );
    return res.data;
  },

  async getProjectTestResults(projectId: number | string): Promise<TestResult[]> {
    const res = await apiClient.get<TestResult[]>(
      `/api/v1/projects/${projectId}/test-results`
    );
    return res.data;
  },
};
