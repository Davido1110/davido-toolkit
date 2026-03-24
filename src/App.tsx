import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPage } from './pages/AdminPage';
import { TOOLS } from './config/tools';
import type { ToolMeta } from './config/tools';

function ToolRoute({ tool }: { tool: ToolMeta }) {
  const { profile } = useAuth();
  const allowed =
    !profile ||
    profile.role === 'admin' ||
    profile.role === 'manager' ||
    !profile.allowedTools ||
    profile.allowedTools.includes(tool.id);
  if (!allowed) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <tool.component />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full py-32 text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading tool…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending" element={<Navigate to="/" replace />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/admin" element={<AdminPage />} />
            {TOOLS.map((tool) => (
              <Route
                key={tool.id}
                path={tool.path}
                element={<ToolRoute tool={tool} />}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
