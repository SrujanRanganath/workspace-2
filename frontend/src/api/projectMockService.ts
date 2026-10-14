import {
  Artifact,
  Defect,
  GenerationRun,
  ImplementationPlan,
  Project,
  ProjectCreateRequest,
  RepairResponse,
  Requirement,
  Specification,
  StructuredRequirement,
  TestCase,
  TestExecutionResponse,
  TestResult,
  ValidationRunResponse,
} from '../types';

interface MockProjectState {
  project: Project;
  requirements: Requirement[];
  specification?: Specification;
  plan?: ImplementationPlan;
  artifacts: Artifact[];
  defects: Defect[];
  runs: GenerationRun[];
  testCases: TestCase[];
  testResults: TestResult[];
}

const projects = new Map<number, MockProjectState>();
let nextProjectId = 1;
let nextRequirementId = 1;
let nextArtifactId = 1;
let nextRunId = 1;
let nextTestCaseId = 1;
let nextTestResultId = 1;

const now = () => new Date().toISOString();

function fail(status: number, detail: string): never {
  throw { response: { status, data: { detail } } };
}

function getProjectState(projectId: string): MockProjectState {
  const state = projects.get(Number(projectId));
  if (!state) fail(404, 'Project not found.');
  return state;
}

function getLatestRequirement(state: MockProjectState): Requirement {
  const requirement = state.requirements[0];
  if (!requirement) fail(404, 'No requirement found to analyze.');
  return requirement;
}

function getRequirement(state: MockProjectState, requirementId?: unknown): Requirement {
  if (requirementId === undefined || requirementId === null) return getLatestRequirement(state);
  const requirement = state.requirements.find((item) => item.id === Number(requirementId));
  if (!requirement) fail(404, 'Requirement not found.');
  return requirement;
}

function addRun(state: MockProjectState, operation: string): number {
  const timestamp = now();
  const id = nextRunId++;
  state.runs.unshift({
    id,
    project_id: state.project.id,
    operation,
    status: 'completed',
    provider: 'deterministic_offline_parser',
    model: 'standalone_mock',
    started_at: timestamp,
    completed_at: timestamp,
    input_metadata: {},
    output_metadata: {},
  });
  return id;
}

function analyzeText(text: string): StructuredRequirement {
  return {
    actors: ['User'],
    functional_requirements: [text],
    non_functional_requirements: [],
    entities: [],
    workflows: [],
    api_requirements: [],
    frontend_requirements: [],
    data_requirements: [],
    documentation_requirements: [],
    acceptance_criteria: [`The system satisfies: ${text}`],
  };
}

function makeSpecification(projectName: string): MockProjectState['specification'] {
  return {
    project_name: projectName,
    architecture_pattern: 'Modular web application',
    system_overview: `A standalone specification for ${projectName}.`,
    database_schema: [],
    api_contract: [],
    frontend_components: [],
    security_considerations: ['Validate inputs and enforce authorization at service boundaries.'],
  };
}

function makePlan(projectName: string): ImplementationPlan {
  return {
    project_name: projectName,
    total_phases: 1,
    phases: [{
      phase_number: 1,
      name: 'Implementation',
      tier: 'backend',
      tasks: [{
        id: 'implement-core',
        title: 'Implement core requirements',
        description: `Implement the core requirements for ${projectName}.`,
      }],
    }],
  };
}

function createArtifact(
  state: MockProjectState,
  artifactType: Artifact['artifact_type'],
  name: string,
  content: string
): Artifact {
  const timestamp = now();
  const artifact: Artifact = {
    id: nextArtifactId++,
    project_id: state.project.id,
    artifact_type: artifactType,
    name,
    path: name,
    content,
    version: 1,
    status: 'generated',
    requirement_id: state.requirements[0]?.id ?? null,
    generation_run_id: state.runs[0]?.id ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  state.artifacts.unshift(artifact);
  return artifact;
}

function getTestCase(state: MockProjectState, testCaseId: string): TestCase {
  const testCase = state.testCases.find((item) => item.id === Number(testCaseId));
  if (!testCase) fail(404, 'Test case not found.');
  return testCase;
}

export async function handleMockProjectRequest(
  method: string,
  pathname: string,
  body: any,
  query: URLSearchParams
): Promise<{ data: unknown; status: number }> {
  const normalizedMethod = method.toUpperCase();
  const collectionPath = '/api/v1/projects';

  if (pathname === collectionPath) {
    if (normalizedMethod === 'GET') {
      const projectList = [...projects.values()]
        .map((state) => state.project)
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
      return { data: { projects: projectList, total: projectList.length }, status: 200 };
    }
    if (normalizedMethod === 'POST') {
      const timestamp = now();
      const projectRequest = body as Partial<ProjectCreateRequest> | undefined;
      const name = typeof projectRequest?.name === 'string' ? projectRequest.name : '';
      if (!name || name.length > 200) fail(422, 'Project name must be between 1 and 200 characters.');
      const id = nextProjectId++;
      const project: Project = {
        id,
        user_id: 1,
        name,
        description: projectRequest?.description ?? null,
        status: 'draft',
        created_at: timestamp,
        updated_at: timestamp,
      };
      projects.set(id, {
        project,
        requirements: [],
        artifacts: [],
        defects: [],
        runs: [],
        testCases: [],
        testResults: [],
      });
      return { data: project, status: 201 };
    }
  }

  const projectMatch = pathname.match(/^\/api\/v1\/projects\/(\d+)(?:\/(.*))?$/);
  if (!projectMatch) fail(501, `No standalone mock handler for ${normalizedMethod} ${pathname}`);

  const [, projectId, resource = ''] = projectMatch;
  const state = getProjectState(projectId);
  const timestamp = now();

  if (!resource) {
    if (normalizedMethod === 'GET') return { data: state.project, status: 200 };
    if (normalizedMethod === 'PATCH') {
      if (body?.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.length > 200) {
          fail(422, 'Project name must be at most 200 characters.');
        }
        state.project.name = body.name;
      }
      if (body?.description !== undefined) state.project.description = body.description;
      if (body?.status !== undefined) {
        if (typeof body.status !== 'string') fail(422, 'Project status must be a string.');
        state.project.status = body.status;
      }
      state.project.updated_at = timestamp;
      return { data: state.project, status: 200 };
    }
    if (normalizedMethod === 'DELETE') {
      projects.delete(state.project.id);
      return { data: undefined, status: 204 };
    }
  }

  if (resource === 'requirements') {
    if (normalizedMethod === 'GET') return { data: state.requirements, status: 200 };
    if (normalizedMethod === 'POST') {
      const rawText = typeof body?.raw_text === 'string' ? body.raw_text : '';
      if (!rawText) fail(422, 'Requirement text must not be empty.');
      const requirement: Requirement = {
        id: nextRequirementId++,
        project_id: state.project.id,
        raw_text: rawText,
        structured: null,
        version: 1,
        status: 'draft',
        created_at: timestamp,
        updated_at: timestamp,
      };
      state.requirements.unshift(requirement);
      state.project.status = 'requirements';
      state.project.updated_at = timestamp;
      return { data: requirement, status: 201 };
    }
  }

  if (resource === 'requirements/analyze' && normalizedMethod === 'POST') {
    const requirementId = body?.requirement_id;
    const requirement = requirementId
      ? state.requirements.find((item) => item.id === Number(requirementId))
      : getLatestRequirement(state);
    if (!requirement) fail(404, 'Requirement not found.');
    requirement.structured = analyzeText(requirement.raw_text);
    requirement.status = 'analyzed';
    requirement.updated_at = timestamp;
    state.project.status = 'specification';
    state.project.updated_at = timestamp;
    addRun(state, 'requirement_analysis');
    return {
      data: { requirement_id: requirement.id, structured: requirement.structured, status: requirement.status },
      status: 200,
    };
  }

  if (resource === 'specification') {
    if (normalizedMethod === 'GET') {
      if (!state.specification) fail(404, 'Specification not found.');
      return { data: state.specification, status: 200 };
    }
    if (normalizedMethod === 'POST') {
      let requirement: Requirement;
      try {
        requirement = getRequirement(state, body?.requirement_id);
      } catch (error) {
        if ((error as { response?: { status?: number } }).response?.status === 404) {
          fail(400, 'A requirement must be submitted before generating specification.');
        }
        throw error;
      }
      state.specification = makeSpecification(state.project.name);
      state.project.status = 'specification';
      state.project.updated_at = timestamp;
      const generationRunId = addRun(state, 'specification_generation');
      return {
        data: {
          project_id: state.project.id,
          requirement_id: requirement.id,
          specification: state.specification,
          generation_run_id: generationRunId,
        },
        status: 200,
      };
    }
  }

  if (resource === 'plan') {
    if (normalizedMethod === 'GET') {
      if (!state.plan) fail(404, 'Implementation plan not found.');
      return { data: state.plan, status: 200 };
    }
    if (normalizedMethod === 'POST') {
      state.plan = makePlan(state.project.name);
      state.project.status = 'planning';
      state.project.updated_at = timestamp;
      const generationRunId = addRun(state, 'plan_generation');
      return {
        data: {
          project_id: state.project.id,
          plan: state.plan,
          generation_run_id: generationRunId,
        },
        status: 200,
      };
    }
  }

  if (resource === 'artifacts' && normalizedMethod === 'GET') {
    const artifacts = query.has('artifact_type')
      ? state.artifacts.filter((artifact) => artifact.artifact_type === query.get('artifact_type'))
      : state.artifacts;
    return { data: { artifacts, total: artifacts.length }, status: 200 };
  }

  if (resource === 'generate' && normalizedMethod === 'POST') {
    const runId = addRun(state, 'artifact_generation');
    const artifacts = [
      createArtifact(state, 'backend', 'service.py', '# Generated standalone backend artifact'),
      createArtifact(state, 'frontend', 'App.tsx', '// Generated standalone frontend artifact'),
    ];
    artifacts.forEach((artifact) => { artifact.generation_run_id = runId; });
    state.project.status = 'building';
    state.project.updated_at = timestamp;
    return { data: artifacts, status: 200 };
  }

  const artifactMatch = resource.match(/^artifacts\/(\d+)$/);
  if (artifactMatch && normalizedMethod === 'PUT') {
    const artifact = state.artifacts.find((item) => item.id === Number(artifactMatch[1]));
    if (!artifact) fail(404, 'Artifact not found.');
    if (body?.content !== undefined && body.content !== null && typeof body.content !== 'string') {
      fail(422, 'Artifact content must be a string or null.');
    }
    if (body?.status !== undefined && body.status !== null && typeof body.status !== 'string') {
      fail(422, 'Artifact status must be a string or null.');
    }
    if (body?.content !== undefined && body.content !== null) {
      artifact.content = body.content;
      artifact.version += 1;
    }
    if (body?.status !== undefined && body.status !== null) artifact.status = body.status;
    artifact.updated_at = timestamp;
    return { data: artifact, status: 200 };
  }

  if (resource === 'validate' && normalizedMethod === 'POST') {
    if (state.artifacts.length === 0) {
      fail(400, 'No artifacts exist to validate. Generate artifacts first.');
    }
    return {
      data: {
        project_id: state.project.id,
        results: [{
          status: 'warning',
          check: 'standalone_simulation',
          message: 'Validation was not executed in standalone simulation mode.',
        }],
        summary: { passed: 0, failed: 0, warning: 1, total_checks: 1 },
      } satisfies ValidationRunResponse,
      status: 200,
    };
  }

  if (resource === 'defects' && normalizedMethod === 'GET') {
    return { data: state.defects, status: 200 };
  }

  if (resource === 'repair' && normalizedMethod === 'POST') {
    const defect = state.defects.find((item) => item.id === Number(body?.defect_id));
    if (!defect) fail(404, 'Defect not found.');
    return {
      data: {
        defect_id: defect.id,
        status: 'simulated',
        strategy: 'standalone_simulation',
        patch: null,
        message: 'Repair was not performed in standalone simulation mode.',
      } satisfies RepairResponse,
      status: 200,
    };
  }

  if (resource === 'runs' && normalizedMethod === 'GET') {
    return { data: { runs: state.runs, total: state.runs.length }, status: 200 };
  }

  if (resource === 'tests' && normalizedMethod === 'GET') {
    return { data: state.testCases, status: 200 };
  }

  if (resource === 'tests' && normalizedMethod === 'POST') {
    if (typeof body?.name !== 'string' || typeof body?.test_type !== 'string') {
      fail(422, 'Test case name and test type are required.');
    }
    const testCase: TestCase = {
      id: nextTestCaseId++,
      project_id: state.project.id,
      artifact_id: body?.artifact_id ?? null,
      requirement_id: body?.requirement_id ?? null,
      name: body.name,
      description: body?.description ?? null,
      test_type: body.test_type,
      status: 'pending',
      created_at: timestamp,
    };
    state.testCases.unshift(testCase);
    return { data: testCase, status: 201 };
  }

  if (resource === 'test-results' && normalizedMethod === 'GET') {
    return { data: state.testResults, status: 200 };
  }

  const testMatch = resource.match(/^tests\/(\d+)(?:\/(results|run))?$/);
  if (testMatch) {
    const [, testCaseId, action] = testMatch;
    const testCase = getTestCase(state, testCaseId);
    if (!action && normalizedMethod === 'GET') return { data: testCase, status: 200 };
    if (action === 'results' && normalizedMethod === 'GET') {
      return {
        data: state.testResults.filter((result) => result.test_case_id === testCase.id),
        status: 200,
      };
    }
    if (action === 'run' && normalizedMethod === 'POST') {
      testCase.status = 'simulated';
      const result: TestExecutionResponse = {
        id: nextTestResultId++,
        test_case_id: testCase.id,
        status: 'simulated',
        output: 'Test execution was not performed in standalone simulation mode.',
        duration_ms: 0,
        executed_at: timestamp,
        verification_type: 'Simulated',
        docker_status: 'NOT EXECUTED',
        exit_code: null,
        stdout: '',
        stderr: '',
        message: 'No static or runtime test execution occurred.',
        checks: null,
      };
      state.testResults.unshift(result);
      return { data: result, status: 200 };
    }
  }

  fail(501, `No standalone mock handler for ${normalizedMethod} ${pathname}`);
}
