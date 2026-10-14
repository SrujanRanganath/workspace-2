import {
  User,
  AuthLoginResponse,
  AuthRegisterResponse,
  CodeGenerateRequest,
  CodeGenerateResponse,
  CodeExplainRequest,
  CodeExplainResponse,
  CodeSaveRequest,
  CodeSaveResponse,
  CodeRunRequest,
  CodeRunResponse,
  WebsiteGenerateRequest,
  WebsiteGenerateResponse,
  WebsiteModifyRequest,
  WebsiteSaveRequest,
  WebsiteSaveResponse,
  DataCleanerResponse,
  DocumentGenerateRequest,
  DocumentGenerateResponse,
} from '../types';

// In-memory mock storage
const mockUsers: Record<string, { id: string; name: string; email: string; password: string }> = {
  'engineer@workspace.dev': {
    id: 'user-001',
    name: 'Ada Lovelace',
    email: 'engineer@workspace.dev',
    password: 'workspace123',
  },
  'krspandanaa10@gmail.com': {
    id: 'user-002',
    name: 'Spandana',
    email: 'krspandanaa10@gmail.com',
    password: 'password123',
  },
};

const mockFiles: Record<string, string> = {
  'solution.py': `import time
from typing import Callable
from fastapi import FastAPI, Request, HTTPException

app = FastAPI(title="Rate Limiter Service")

# Sliding window rate limiter state
REQUEST_WINDOW = 60  # seconds
MAX_REQUESTS = 100
request_history: dict[str, list[float]] = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next: Callable):
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Initialize history for client
    if client_ip not in request_history:
        request_history[client_ip] = []
        
    # Filter timestamps within sliding window
    request_history[client_ip] = [
        t for t in request_history[client_ip] if current_time - t < REQUEST_WINDOW
    ]
    
    if len(request_history[client_ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: Max {MAX_REQUESTS} requests per {REQUEST_WINDOW}s"
        )
        
    request_history[client_ip].append(current_time)
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(MAX_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(MAX_REQUESTS - len(request_history[client_ip]))
    return response

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "rate-limiter-ready"}

if __name__ == "__main__":
    print("✓ Rate Limiter Middleware loaded successfully.")
    print(f"✓ Configuration: Max {MAX_REQUESTS} req / {REQUEST_WINDOW}s window.")
    print("✓ Server simulation executed without errors.")
`,
};

const mockWebsites: Record<string, { app: string; css: string; framework: string }> = {};

export const mockBackend = {
  // POST /auth/register
  register: async (name: string, email: string, password: string): Promise<AuthRegisterResponse> => {
    await new Promise((r) => setTimeout(r, 400));
    if (mockUsers[email]) {
      throw { response: { status: 400, data: { detail: 'User with this email already registered.' } } };
    }
    mockUsers[email] = {
      id: `user-${Date.now()}`,
      name: name.trim() || 'Engineer',
      email: email.trim().toLowerCase(),
      password,
    };
    return { message: `Account created successfully for ${email}. You may now log in.` };
  },

  // POST /auth/login
  login: async (email: string, password: string): Promise<AuthLoginResponse> => {
    await new Promise((r) => setTimeout(r, 400));
    const user = mockUsers[email.trim().toLowerCase()];
    if (!user || user.password !== password) {
      // For developer convenience in demo mode, auto-create account if non-existent
      mockUsers[email.trim().toLowerCase()] = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0],
        email: email.trim().toLowerCase(),
        password,
      };
    }
    const token = `mock-token-${btoa(email)}-${Date.now()}`;
    return {
      access_token: token,
      token_type: 'bearer',
    };
  },

  // GET /auth/me
  getMe: async (token: string): Promise<User> => {
    await new Promise((r) => setTimeout(r, 200));
    // Decode user email from token or return default
    for (const email of Object.keys(mockUsers)) {
      if (token.includes(btoa(email))) {
        const u = mockUsers[email];
        return { id: u.id, name: u.name, email: u.email };
      }
    }
    return {
      id: 'mock-user-1',
      name: 'Lead AI Engineer',
      email: 'engineer@workspace.dev',
    };
  },

  // POST /code/generate
  generateCode: async (req: CodeGenerateRequest): Promise<CodeGenerateResponse> => {
    await new Promise((r) => setTimeout(r, 600));
    const lang = req.language.toLowerCase();

    if (lang.includes('py')) {
      const code = `"""
Implementation: ${req.template}
Description: ${req.prompt}
Generated for: FastAPI AI Engineering Workspace
"""

import sys
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class RequestPayload(BaseModel):
    client_id: str = Field(..., description="Unique client identifier")
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)

class ${req.template.replace(/[^a-zA-Z0-9]/g, '') || 'ServiceHandler'}:
    def __init__(self, service_name: str = "ai-engine"):
        self.service_name = service_name
        self.metrics: Dict[str, int] = {"processed": 0, "errors": 0}

    def execute(self, data: RequestPayload) -> Dict[str, Any]:
        """
        Executes core algorithm for: ${req.prompt}
        """
        start_ts = time.perf_counter()
        self.metrics["processed"] += 1
        
        # Processing simulation
        result = {
            "status": "success",
            "client_id": data.client_id,
            "processed_items": len(data.payload.keys()),
            "elapsed_ms": round((time.perf_counter() - start_ts) * 1000, 3)
        }
        return result

if __name__ == "__main__":
    print(f"=== Running {__file__} ===")
    handler = ${req.template.replace(/[^a-zA-Z0-9]/g, '') || 'ServiceHandler'}()
    payload = RequestPayload(client_id="eng-prod-01", payload={"task": "${req.prompt}"})
    res = handler.execute(payload)
    print("Execution output:", res)
    print("Metrics summary:", handler.metrics)
    print("✓ Script execution finished successfully.")
`;
      return { code };
    }

    if (lang.includes('js') || lang.includes('typescript') || lang.includes('ts')) {
      const code = `/**
 * Implementation: ${req.template}
 * Prompt: ${req.prompt}
 */

export interface ServiceConfig {
  maxRetries: number;
  timeoutMs: number;
  logLevel: 'debug' | 'info' | 'warn';
}

export class ${req.template.replace(/[^a-zA-Z0-9]/g, '') || 'EngineModule'} {
  private isInitialized = false;

  constructor(private readonly config: ServiceConfig = { maxRetries: 3, timeoutMs: 5000, logLevel: 'info' }) {}

  public async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('[Module] Service initialized successfully.');
  }

  public async runTask(input: Record<string, unknown>): Promise<{ success: boolean; data: any; executionTime: number }> {
    const start = performance.now();
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Algorithmic processing
    const result = {
      task: "${req.prompt}",
      processedKeys: Object.keys(input).length,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      data: result,
      executionTime: performance.now() - start
    };
  }
}
`;
      return { code };
    }

    // Fallback generic code
    return {
      code: `// ${req.language} implementation for: ${req.template}\n// Task: ${req.prompt}\n\nfunction main() {\n  console.log("Algorithm successfully initialized.");\n  return { status: 200, prompt: "${req.prompt}" };\n}\n\nmain();\n`,
    };
  },

  // POST /code/explain
  explainCode: async (req: CodeExplainRequest): Promise<CodeExplainResponse> => {
    await new Promise((r) => setTimeout(r, 500));
    const lines = req.code.split('\n').length;
    return {
      explanation: `### Code Analysis & Architecture Overview\n\n1. **Language & Environment**: Evaluated as **${req.language}** with ${lines} lines of code.\n2. **Architectural Pattern**: Implements structured class/function encapsulation with explicit type contracts and deterministic error handling.\n3. **State Management**: Encapsulates configuration and operational metrics to maintain isolation during concurrent execution.\n4. **Execution Flow**: Input validation occurs at entry, followed by core processing, performance metrics calculation, and structured JSON output.\n5. **Edge Cases Handled**: Safe fallbacks for missing parameters, sliding window boundaries, and execution timing benchmarks.`,
    };
  },

  // POST /code/save
  saveCode: async (req: CodeSaveRequest): Promise<CodeSaveResponse> => {
    await new Promise((r) => setTimeout(r, 300));
    mockFiles[req.filename] = req.code;
    return {
      message: `File '${req.filename}' successfully persisted to workspace storage.`,
      filename: req.filename,
    };
  },

  // POST /code/run
  runCode: async (req: CodeRunRequest): Promise<CodeRunResponse> => {
    await new Promise((r) => setTimeout(r, 600));
    if (!req.filename.endsWith('.py')) {
      throw { response: { status: 400, data: { detail: 'Only .py files can be executed via /code/run' } } };
    }
    const code = mockFiles[req.filename] || '';
    return {
      output: `[Python 3.11.8 Runtime - FastAPI Process]\nExecuting ${req.filename}...\n--------------------------------------------------\n✓ Modules loaded: sys, time, typing, pydantic\n✓ Benchmark started: 100 iterations\n✓ Status: 200 OK\nExecution output: {'status': 'success', 'client_id': 'eng-prod-01', 'processed_items': 1, 'elapsed_ms': 0.124}\nMetrics summary: {'processed': 1, 'errors': 0}\n✓ Script execution finished successfully with returncode 0.\nProcess elapsed: 0.042s. Memory RSS: 14.8MB.`,
    };
  },

  // POST /website/generate
  generateWebsite: async (req: WebsiteGenerateRequest): Promise<WebsiteGenerateResponse> => {
    await new Promise((r) => setTimeout(r, 700));

    const app = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${req.template}</title>
</head>
<body class="site-body">
  <header class="navbar">
    <div class="nav-container">
      <div class="brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-name">NexusAI</span>
      </div>
      <nav class="nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#docs">Docs</a>
      </nav>
      <button class="btn-primary">Get Started</button>
    </div>
  </header>

  <main>
    <section class="hero-section">
      <div class="badge">Next-Gen Workspace Engine</div>
      <h1 class="hero-title">${req.prompt.slice(0, 60)}</h1>
      <p class="hero-subtitle">
        Accelerate your engineering workflow with unified AI code synthesis, sandboxed live previews, and automated data operations.
      </p>
      <div class="hero-actions">
        <button class="btn-primary btn-lg">Explore Workspace</button>
        <button class="btn-secondary btn-lg">View Documentation</button>
      </div>
    </section>

    <section id="features" class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>High-Throughput Execution</h3>
        <p>Sub-millisecond processing pipelines tailored for modern cloud systems.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🛡️</div>
        <h3>Type-Safe Architecture</h3>
        <p>Built-in Pydantic and TypeScript schema validation across all endpoints.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Real-Time Telemetry</h3>
        <p>Instant visual feedback, error diagnostics, and memory profiling.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>© 2026 AI Engineering Workspace. All rights reserved.</p>
  </footer>
</body>
</html>`;

    const css = `/* Reset & Base Variables */
:root {
  --bg-primary: #090d16;
  --bg-card: #0f172a;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --border: #1e293b;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body.site-body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  line-height: 1.6;
}

.navbar {
  border-bottom: 1px solid var(--border);
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.15rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.15s;
}

.nav-links a:hover {
  color: var(--text-main);
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--border);
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-lg {
  padding: 0.75rem 1.75rem;
  font-size: 1rem;
}

.hero-section {
  max-width: 850px;
  margin: 4.5rem auto 3rem;
  text-align: center;
  padding: 0 1.5rem;
}

.badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.hero-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  color: var(--text-muted);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.feature-grid {
  max-width: 1100px;
  margin: 4rem auto;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 2rem;
  border-radius: 16px;
  transition: border-color 0.2s;
}

.feature-card:hover {
  border-color: rgba(99, 102, 241, 0.4);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.footer {
  text-align: center;
  padding: 2.5rem 1rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
}`;

    const js = `// Interactive workspace runtime
document.addEventListener('DOMContentLoaded', () => {
  console.log('Website runtime initialized.');
});`;

    return {
      app,
      css,
      js,
      provider: 'deterministic_fallback',
      fallback_used: true,
      message: 'Generated using deterministic offline mock engine.',
    };
  },

  // POST /website/modify
  modifyWebsite: async (req: WebsiteModifyRequest): Promise<WebsiteGenerateResponse> => {
    await new Promise((r) => setTimeout(r, 600));

    let updatedHtml = req.current_html;
    let updatedCss = req.current_css;
    let updatedJs = req.current_js;

    // If requesting attendance analytics or similar, inject section
    if (req.modification_prompt.toLowerCase().includes('attendance') || req.modification_prompt.toLowerCase().includes('analytics')) {
      if (!updatedHtml.includes('id="analytics-section"')) {
        const analyticsSnippet = `
    <!-- Attendance Analytics Section (Added via AI Modification) -->
    <section id="analytics-section" class="analytics-card" style="margin: 2rem auto; max-width: 1100px; padding: 1.5rem; background: var(--bg-card, #0f172a); border: 1px solid var(--border, #1e293b); border-radius: 12px;">
      <h3 style="color: #6366f1; font-size: 1.25rem; margin-bottom: 1rem;">📊 Attendance Analytics & Event Breakdown</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(99, 102, 241, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.75rem; font-weight: 700; color: #818cf8;">88.4%</div>
          <div style="font-size: 0.85rem; color: #94a3b8;">Avg. Event Attendance</div>
        </div>
        <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.75rem; font-weight: 700; color: #34d399;">342</div>
          <div style="font-size: 0.85rem; color: #94a3b8;">Total Present</div>
        </div>
        <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.75rem; font-weight: 700; color: #f87171;">45</div>
          <div style="font-size: 0.85rem; color: #94a3b8;">Total Absent</div>
        </div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
          <span>AI & Robotics Hackathon</span><span>92% Present</span>
        </div>
        <div style="height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin-bottom: 1rem;">
          <div style="width: 92%; height: 100%; background: #6366f1;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
          <span>Annual Career Fair</span><span>84% Present</span>
        </div>
        <div style="height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
          <div style="width: 84%; height: 100%; background: #10b981;"></div>
        </div>
      </div>
    </section>`;
        if (updatedHtml.includes('</main>')) {
          updatedHtml = updatedHtml.replace('</main>', `${analyticsSnippet}\n  </main>`);
        } else {
          updatedHtml = updatedHtml + analyticsSnippet;
        }
      }
    }

    return {
      app: updatedHtml,
      css: updatedCss,
      js: updatedJs,
      provider: 'deterministic_fallback',
      fallback_used: true,
      message: `Modified existing code structure based on prompt: "${req.modification_prompt}".`,
    };
  },

  // POST /website/save
  saveWebsite: async (req: WebsiteSaveRequest): Promise<WebsiteSaveResponse> => {
    await new Promise((r) => setTimeout(r, 400));
    mockWebsites[req.project_name] = {
      app: req.app,
      css: req.css,
      framework: req.framework,
    };
    return {
      message: `Project '${req.project_name}' successfully compiled and saved.`,
      folder: `/workspace/projects/${req.project_name}`,
    };
  },

  // POST /data-cleaner/clean
  cleanData: async (file: File): Promise<DataCleanerResponse> => {
    await new Promise((r) => setTimeout(r, 800));

    // Try to parse file text if CSV
    let rowCount = 145;
    let colNames = ['id', 'full_name', 'department', 'salary', 'tenure_years', 'performance_rating'];

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        rowCount = lines.length - 1;
        const parsedCols = lines[0].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (parsedCols.length > 1) {
          colNames = parsedCols;
        }
      }
    } catch {
      // Use standard default metrics
    }

    const duplicates = Math.floor(rowCount * 0.08) + 1;
    const cleanedRows = rowCount - duplicates;
    const missingFilled = Math.floor(rowCount * 0.12) + 3;

    return {
      message: `File '${file.name}' successfully cleaned. Removed ${duplicates} duplicate rows and imputed ${missingFilled} missing records.`,
      original_rows: rowCount,
      cleaned_rows: cleanedRows,
      duplicates_removed: duplicates,
      missing_values_filled: missingFilled,
      total_columns: colNames.length,
      column_names: colNames,
      data_types: colNames.reduce((acc, col, idx) => {
        acc[col] = idx === 0 || col.includes('id') || col.includes('salary') || col.includes('year') ? 'int64' : 'object';
        return acc;
      }, {} as Record<string, string>),
      missing_value_report: colNames.reduce((acc, col, idx) => {
        acc[col] = idx % 2 === 1 ? Math.floor(Math.random() * 5) + 1 : 0;
        return acc;
      }, {} as Record<string, number>),
      statistics: {
        salary: {
          count: cleanedRows,
          mean: 88450.5,
          std: 19230.12,
          min: 52000,
          '25%': 74000,
          '50%': 86500,
          '75%': 102000,
          max: 145000,
        },
        tenure_years: {
          count: cleanedRows,
          mean: 4.25,
          std: 2.1,
          min: 1,
          '25%': 2,
          '50%': 4,
          '75%': 6,
          max: 12,
        },
      },
      filename: `cleaned_${file.name.replace(/\.[^/.]+$/, '')}.csv`,
      preview: [
        { [colNames[0]]: 101, [colNames[1]]: 'Alice Morgan', [colNames[2] || 'dept']: 'Engineering', [colNames[3] || 'salary']: 98000, [colNames[4] || 'tenure']: 4.5 },
        { [colNames[0]]: 102, [colNames[1]]: 'Marcus Vance', [colNames[2] || 'dept']: 'Product', [colNames[3] || 'salary']: 89000, [colNames[4] || 'tenure']: 3.0 },
        { [colNames[0]]: 103, [colNames[1]]: 'Elena Rostova', [colNames[2] || 'dept']: 'AI Research', [colNames[3] || 'salary']: 115000, [colNames[4] || 'tenure']: 6.2 },
        { [colNames[0]]: 104, [colNames[1]]: 'David Chen', [colNames[2] || 'dept']: 'Infrastructure', [colNames[3] || 'salary']: 92000, [colNames[4] || 'tenure']: 2.8 },
        { [colNames[0]]: 105, [colNames[1]]: 'Sarah Jenkins', [colNames[2] || 'dept']: 'Engineering', [colNames[3] || 'salary']: 104000, [colNames[4] || 'tenure']: 5.1 },
      ],
    };
  },

  // POST /document-generator/generate
  generateDocument: async (req: DocumentGenerateRequest): Promise<DocumentGenerateResponse> => {
    await new Promise((r) => setTimeout(r, 600));
    const safeTitle = req.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${req.template}_${safeTitle}.docx`;
    return {
      message: `Document compiled successfully for ${req.name} (${req.template.toUpperCase()}).`,
      filename,
    };
  },
};
