import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectStudio } from './pages/ProjectStudio';
import { CodeTool } from './pages/tools/CodeTool';
import { WebsiteBuilder } from './pages/tools/WebsiteBuilder';
import { DataCleaner } from './pages/tools/DataCleaner';
import { DocumentGenerator } from './pages/tools/DocumentGenerator';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Project-Centric Rebuild Routes */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectStudio />
              </ProtectedRoute>
            }
          />

          {/* Protected Legacy Dashboard & Tools */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/code"
            element={
              <ProtectedRoute>
                <CodeTool />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/website"
            element={
              <ProtectedRoute>
                <WebsiteBuilder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/data-cleaner"
            element={
              <ProtectedRoute>
                <DataCleaner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/documents"
            element={
              <ProtectedRoute>
                <DocumentGenerator />
              </ProtectedRoute>
            }
          />

          {/* Root redirect: if token exists, go to /projects, else /login */}
          <Route
            path="/"
            element={<Navigate to="/projects" replace />}
          />

          {/* Catch-all fallback */}
          <Route
            path="*"
            element={<Navigate to="/projects" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ToastProvider>
  );
}
