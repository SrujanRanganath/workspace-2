import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';

const localStorageValues = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageValues.get(key) ?? null,
  setItem: (key, value) => localStorageValues.set(key, String(value)),
  removeItem: (key) => localStorageValues.delete(key),
};
globalThis.window = { dispatchEvent() {}, location: { protocol: 'http:' } };

const { setApiBaseUrl, setBackendMode } = await import('../src/api/client.ts');
const { projectService } = await import('../src/api/projectService.ts');
const apiClientModule = await import('../src/api/client.ts');

let server;
let apiBaseUrl;
let networkRequests = 0;

before(async () => {
  server = createServer((request, response) => {
    networkRequests += 1;
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ projects: [], total: 0 }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  apiBaseUrl = `http://127.0.0.1:${address.port}`;
  setApiBaseUrl(apiBaseUrl);
  setBackendMode('mock');
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
});

test('standalone project listing returns the API response shape without network access', async () => {
  const response = await projectService.getProjects();

  assert.ok(Array.isArray(response.projects));
  assert.equal(response.total, response.projects.length);
  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('standalone project lifecycle routes support the existing Project Studio workflow', async () => {
  const project = await projectService.createProject({ name: 'Standalone app', description: 'Demo' });
  assert.equal((await projectService.getProject(project.id)).name, 'Standalone app');
  assert.equal(
    (await projectService.updateProject(project.id, { description: 'Updated demo' })).description,
    'Updated demo'
  );

  const requirement = await projectService.createRequirement(project.id, 'Users can manage tasks');
  const analysis = await projectService.analyzeRequirement(project.id, requirement.id);
  assert.equal(analysis.requirement_id, requirement.id);
  assert.ok(Array.isArray(analysis.structured.functional_requirements));

  const specification = await projectService.generateSpecification(project.id);
  assert.equal(specification.specification.project_name, project.name);
  assert.equal((await projectService.getSpecification(project.id)).project_name, project.name);
  const plan = await projectService.generatePlan(project.id);
  assert.equal(plan.plan.project_name, project.name);
  assert.equal((await projectService.getPlan(project.id)).project_name, project.name);

  const artifacts = await projectService.generateArtifacts(project.id);
  assert.ok(artifacts.length > 0);
  assert.equal(artifacts[0].version, 1);
  assert.equal((await projectService.getArtifacts(project.id)).total, artifacts.length);
  const updatedArtifact = await projectService.updateArtifact(project.id, artifacts[0].id, {
    content: 'Updated artifact content',
  });
  assert.equal(updatedArtifact.version, 2);
  assert.equal(updatedArtifact.content, 'Updated artifact content');
  assert.equal(
    (await projectService.updateArtifact(project.id, artifacts[0].id, { status: 'reviewed' })).version,
    2
  );

  const validation = await projectService.validateProject(project.id);
  assert.equal(validation.summary.passed, 0);
  assert.equal(validation.summary.warning, 1);
  assert.match(validation.results[0].message, /not executed/i);
  assert.deepEqual(await projectService.getDefects(project.id), []);
  assert.ok((await projectService.getRuns(project.id)).total >= 4);

  const testCase = await projectService.createTestCase(project.id, {
    name: 'Can run standalone',
    test_type: 'unit',
  });
  assert.equal((await projectService.getTestCase(project.id, testCase.id)).name, testCase.name);
  const result = await projectService.runTestCase(project.id, testCase.id);
  assert.equal(result.status, 'simulated');
  assert.equal(result.verification_type, 'Simulated');
  assert.equal((await projectService.getTestCases(project.id))[0].status, 'simulated');
  assert.match(result.message, /no static or runtime test execution occurred/i);
  assert.equal((await projectService.getTestCaseResults(project.id, testCase.id)).length, 1);
  assert.equal((await projectService.getProjectTestResults(project.id)).length, 1);

  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('unhandled standalone routes fail closed instead of invoking Axios HTTP', async () => {
  await assert.rejects(
    apiClientModule.apiClient.get('/api/v1/unimplemented'),
    (error) => error.code === 'ERR_NOT_SUPPORT'
  );
  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('project deletion is handled locally in standalone mode', async () => {
  const project = await projectService.createProject({ name: 'Temporary project' });
  await projectService.deleteProject(project.id);

  const response = await projectService.getProjects();
  assert.ok(!response.projects.some((item) => item.id === project.id));
  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('artifact updates preserve version and data on invalid or cross-project updates', async () => {
  const first = await projectService.createProject({ name: 'Artifact owner' });
  const second = await projectService.createProject({ name: 'Other project' });
  await projectService.createRequirement(first.id, 'Generate project artifacts');
  const [artifact] = await projectService.generateArtifacts(first.id);

  await assert.rejects(
    projectService.updateArtifact(first.id, artifact.id, { content: 42 }),
    (error) => error.response?.status === 422
  );
  await assert.rejects(
    projectService.updateArtifact(first.id, artifact.id + 1000, { content: 'Missing' }),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.updateArtifact(second.id, artifact.id, { content: 'Cross-project' }),
    (error) => error.response?.status === 404
  );

  const storedArtifact = (await projectService.getArtifacts(first.id)).artifacts.find(
    (item) => item.id === artifact.id
  );
  assert.ok(storedArtifact);
  assert.equal(storedArtifact.version, 1);
  assert.equal(storedArtifact.content, artifact.content);
  assert.deepEqual((await projectService.getArtifacts(second.id)).artifacts, []);
  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('missing project lifecycle resources return scoped errors', async () => {
  const first = await projectService.createProject({ name: 'Project with resources' });
  const second = await projectService.createProject({ name: 'Project without resources' });
  await assert.rejects(
    projectService.getProject(99999),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.analyzeRequirement(second.id),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.getSpecification(second.id),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.getPlan(second.id),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.validateProject(second.id),
    (error) => error.response?.status === 400
  );

  await projectService.createRequirement(first.id, 'Create a scoped artifact');
  const [artifact] = await projectService.generateArtifacts(first.id);
  const testCase = await projectService.createTestCase(first.id, {
    name: 'Scoped test',
    test_type: 'unit',
  });
  await assert.rejects(
    projectService.updateArtifact(second.id, artifact.id, { status: 'reviewed' }),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.getTestCase(second.id, testCase.id),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.runTestCase(second.id, testCase.id),
    (error) => error.response?.status === 404
  );
  await assert.rejects(
    projectService.repairDefect(second.id, 1),
    (error) => error.response?.status === 404
  );
  assert.deepEqual(await projectService.getRequirements(second.id), []);
  assert.deepEqual(await projectService.getArtifacts(second.id).then((result) => result.artifacts), []);
  assert.deepEqual(await projectService.getTestCases(second.id), []);
  assert.equal(networkRequests, 0, `Axios sent ${networkRequests} request(s) to ${apiBaseUrl}`);
});

test('live project requests continue to use the configured HTTP adapter', async () => {
  setBackendMode('live');
  try {
    const response = await projectService.getProjects();
    assert.deepEqual(response, { projects: [], total: 0 });
    assert.equal(networkRequests, 1);
  } finally {
    setBackendMode('mock');
  }
});
