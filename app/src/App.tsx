import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2 } from 'lucide-react';

// Lazy load pages for performance
import { Login } from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';

// Lazy load heavy pages for performance
const Users = lazy(() => import('@/pages/Users').then(m => ({ default: m.Users })));
const Groups = lazy(() => import('@/pages/Groups').then(m => ({ default: m.Groups })));
const Assets = lazy(() => import('@/pages/Assets').then(m => ({ default: m.Assets })));
const Licenses = lazy(() => import('@/pages/Licenses').then(m => ({ default: m.Licenses })));
const SoftwarePage = lazy(() => import('@/pages/Software').then(m => ({ default: m.SoftwarePage })));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const ApplicationGovernance = lazy(() => import('@/pages/ApplicationGovernance').then(m => ({ default: m.ApplicationGovernance })));
const Offboarding = lazy(() => import('@/pages/Offboarding').then(m => ({ default: m.Offboarding })));
const Network = lazy(() => import('@/pages/Network').then(m => ({ default: m.Network })));
const Sites = lazy(() => import('@/pages/Sites').then(m => ({ default: m.Sites })));
const Proxmox = lazy(() => import('@/pages/Proxmox').then(m => ({ default: m.Proxmox })));
const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));
const Audit = lazy(() => import('@/pages/Audit').then(m => ({ default: m.Audit })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);


// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Role-based route wrapper
function RoleRoute({
  children,
  roles
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { isAuthenticated, hasRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { theme, brandColor } = useUIStore();

  // Apply theme and brand color to document
  useEffect(() => {
    const root = window.document.documentElement;

    // Theme
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Brand Color
    root.style.setProperty('--primary', brandColor);
    root.style.setProperty('--ring', brandColor);
  }, [theme, brandColor]);

  // Determine toast style based on theme
  const toastOptions = theme === 'dark' ? {
    style: {
      background: '#2d2d2d',
      border: '1px solid #3d3d3d',
      color: '#fff',
    },
  } : {
    style: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      color: '#0f172a',
    },
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        theme={theme}
        toastOptions={toastOptions}
        closeButton
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<RoleRoute roles={['it_admin', 'it_user']}><Users /></RoleRoute>} />
            <Route path="/groups" element={<RoleRoute roles={['it_admin', 'it_user']}><Groups /></RoleRoute>} />
            <Route path="/inventory" element={<RoleRoute roles={['it_admin', 'it_user']}><Assets /></RoleRoute>} />
            <Route path="/licenses" element={<RoleRoute roles={['it_admin', 'it_user']}><Licenses /></RoleRoute>} />
            <Route path="/software" element={<RoleRoute roles={['it_admin', 'it_user']}><SoftwarePage /></RoleRoute>} />
            <Route path="/identity/apps" element={<RoleRoute roles={['it_admin', 'it_user']}><ApplicationGovernance /></RoleRoute>} />
            <Route path="/onboarding" element={<RoleRoute roles={['it_admin']}><Onboarding /></RoleRoute>} />
            <Route path="/offboarding" element={<RoleRoute roles={['it_admin']}><Offboarding /></RoleRoute>} />
            <Route path="/network" element={<RoleRoute roles={['it_admin', 'it_user']}><Network /></RoleRoute>} />
            <Route path="/sites" element={<RoleRoute roles={['it_admin']}><Sites /></RoleRoute>} />
            <Route path="/proxmox" element={<RoleRoute roles={['it_admin', 'it_user']}><Proxmox /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute roles={['it_admin']}><Reports /></RoleRoute>} />
            <Route path="/audit" element={<RoleRoute roles={['it_admin']}><Audit /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute roles={['it_admin']}><Settings /></RoleRoute>} />

          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
