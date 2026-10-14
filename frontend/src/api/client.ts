import axios, { AxiosError, AxiosResponse } from 'axios';
import { mockBackend } from './mockService';
import { handleMockProjectRequest } from './projectMockService';

// Default base URL is http://127.0.0.1:8000 as specified in the backend API contract
export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

export type BackendMode = 'live' | 'mock';

export const isMixedContentRisk = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' && getApiBaseUrl().startsWith('http:');
};

export const getBackendMode = (): BackendMode => {
  const saved = localStorage.getItem('backend_mode') as BackendMode;
  if (saved === 'live' || saved === 'mock') {
    return saved;
  }
  // When running on remote HTTPS (e.g. AI Studio Cloud Run) and targeting http://127.0.0.1:8000,
  // default to mock mode to prevent browser mixed content blocking
  if (isMixedContentRisk()) {
    return 'mock';
  }
  return 'live';
};

export const setBackendMode = (mode: BackendMode) => {
  localStorage.setItem('backend_mode', mode);
  window.dispatchEvent(new CustomEvent('backend:mode-changed', { detail: mode }));
};

export const getApiBaseUrl = (): string => {
  return localStorage.getItem('api_base_url') || DEFAULT_API_BASE_URL;
};

export const setApiBaseUrl = (url: string) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem('api_base_url', cleanUrl);
  apiClient.defaults.baseURL = cleanUrl;
};

export const resetApiBaseUrl = () => {
  localStorage.removeItem('api_base_url');
  apiClient.defaults.baseURL = DEFAULT_API_BASE_URL;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Configure custom adapter to smoothly switch between Standalone Simulation and Live FastAPI
const defaultAdapter = axios.getAdapter(['xhr', 'http']);

apiClient.defaults.adapter = async (config) => {
  if (getBackendMode() === 'mock') {
    const url = config.url || '';
    const parsedUrl = new URL(url, config.baseURL || DEFAULT_API_BASE_URL);
    const method = (config.method || 'get').toUpperCase();

    // Parse body if JSON string
    let body: any = config.data;
    if (typeof body === 'string' && (body.startsWith('{') || body.startsWith('['))) {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    if (parsedUrl.pathname === '/api/v1/projects' || parsedUrl.pathname.startsWith('/api/v1/projects/')) {
      const projectResponse = await handleMockProjectRequest(
        method,
        parsedUrl.pathname,
        body,
        parsedUrl.searchParams
      );
      return {
        data: projectResponse.data,
        status: projectResponse.status,
        statusText: projectResponse.status === 204 ? 'No Content' : 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    }

    if (url.includes('/auth/login')) {
      const data = await mockBackend.login(body?.email || '', body?.password || '');
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/auth/register')) {
      const data = await mockBackend.register(body?.name || '', body?.email || '', body?.password || '');
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/auth/me')) {
      const token = localStorage.getItem('access_token') || 'mock-token';
      const data = await mockBackend.getMe(token);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/code/generate')) {
      const data = await mockBackend.generateCode(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/code/explain')) {
      const data = await mockBackend.explainCode(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/code/save')) {
      const data = await mockBackend.saveCode(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/code/run')) {
      const data = await mockBackend.runCode(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/website/generate')) {
      const data = await mockBackend.generateWebsite(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/website/modify')) {
      const data = await mockBackend.modifyWebsite(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/website/save')) {
      const data = await mockBackend.saveWebsite(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/data-cleaner/clean')) {
      let file: File | null = null;
      if (body instanceof FormData) {
        file = body.get('file') as File;
      }
      if (!file) {
        file = new File(['id,salary\n1,80000\n'], 'data.csv', { type: 'text/csv' });
      }
      const data = await mockBackend.cleanData(file);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/document-generator/generate')) {
      const data = await mockBackend.generateDocument(body);
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    }

    throw new AxiosError(
      `No standalone mock handler for ${method} ${parsedUrl.pathname}`,
      AxiosError.ERR_NOT_SUPPORT,
      config
    );
  }

  // If live mode, run default xhr/http adapter
  return defaultAdapter(config);
};

// Request interceptor: attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: extract clean error messages from backend { detail: "..." }
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | Array<{ msg: string; loc?: string[] }>; message?: string }>) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('access_token');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a human-readable error string from backend errors
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: any) =>
            item?.msg ? `${item.loc?.slice(-1)[0] || 'field'}: ${item.msg}` : JSON.stringify(item)
          )
          .join(', ');
      }
      if (data.message && typeof data.message === 'string') {
        return data.message;
      }
    }
    if (error.code === 'ERR_NETWORK') {
      if (isMixedContentRisk()) {
        return `HTTPS Mixed Content Restriction: The browser blocked connecting from an HTTPS page to insecure 'http://127.0.0.1:8000'. You can switch to the Standalone Engine (top-right badge) or provide an HTTPS tunnel.`;
      }
      return `Cannot connect to FastAPI server at ${getApiBaseUrl()}. Please verify your local FastAPI is running with CORS enabled.`;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error && typeof error === 'object' && (error as any).response?.data?.detail) {
    return (error as any).response.data.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected request error occurred. Please verify backend status.';
}

/**
 * Helper to download files with authentication or mock generator fallback
 */
export async function downloadAuthenticatedFile(endpoint: string, fallbackFilename: string) {
  if (getBackendMode() === 'mock') {
    // Generate simulated artifact
    let content = `Simulated artifact for ${fallbackFilename}\nGenerated by AI Engineering Workspace.\nTimestamp: ${new Date().toISOString()}`;
    let mimeType = 'text/plain';

    if (fallbackFilename.endsWith('.py')) {
      content = `# Python file: ${fallbackFilename}\nprint("Downloaded from AI Engineering Workspace")\n`;
      mimeType = 'text/x-python';
    } else if (fallbackFilename.endsWith('.csv')) {
      content = `id,name,role,department,salary\n101,Alice Morgan,Engineer,Engineering,98000\n102,Marcus Vance,Designer,Product,89000\n103,Elena Rostova,Scientist,AI Research,115000\n`;
      mimeType = 'text/csv';
    } else if (fallbackFilename.endsWith('.zip')) {
      content = `PK (Simulated ZIP package for ${fallbackFilename})`;
      mimeType = 'application/zip';
    } else if (fallbackFilename.endsWith('.docx')) {
      content = `Word Document Package (${fallbackFilename})`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const blobUrl = window.URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fallbackFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    return;
  }

  // Live FastAPI mode
  const response = await apiClient.get(endpoint, {
    responseType: 'blob',
  });

  let filename = fallbackFilename;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 100);
}
