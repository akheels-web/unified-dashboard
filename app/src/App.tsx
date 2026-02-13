import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Users } from '@/pages/Users';
import { Groups } from '@/pages/Groups';
import { Assets } from '@/pages/Assets';
import { SoftwarePage } from '@/pages/Software';
import Onboarding from '@/pages/Onboarding';
import { Offboarding } from '@/pages/Offboarding';
import { Network } from '@/pages/Network';
import { Sites } from '@/pages/Sites';
import { Proxmox } from '@/pages/Proxmox';
import { PatchManagement } from '@/pages/PatchManagement';
import { Reports } from '@/pages/Reports';
import { Audit } from '@/pages/Audit';
import { Settings } from '@/pages/Settings';
import AdminManagement from '@/pages/AdminManagement';

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
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<RoleRoute roles={['it_admin', 'it_user']}><Users /></RoleRoute>} />
          <Route path="/groups" element={<RoleRoute roles={['it_admin', 'it_user']}><Groups /></RoleRoute>} />
          <Route path="/assets" element={<RoleRoute roles={['it_admin', 'it_user']}><Assets /></RoleRoute>} />
          <Route path="/software" element={<RoleRoute roles={['it_admin', 'it_user']}><SoftwarePage /></RoleRoute>} />
          <Route path="/onboarding" element={<RoleRoute roles={['it_admin']}><Onboarding /></RoleRoute>} />
          <Route path="/offboarding" element={<RoleRoute roles={['it_admin']}><Offboarding /></RoleRoute>} />
          <Route path="/network" element={<RoleRoute roles={['it_admin', 'it_user']}><Network /></RoleRoute>} />
          <Route path="/sites" element={<RoleRoute roles={['it_admin']}><Sites /></RoleRoute>} />
          <Route path="/proxmox" element={<RoleRoute roles={['it_admin', 'it_user']}><Proxmox /></RoleRoute>} />
          <Route path="/patch-management" element={<RoleRoute roles={['it_admin', 'it_user']}><PatchManagement /></RoleRoute>} />
          <Route path="/reports" element={<RoleRoute roles={['it_admin']}><Reports /></RoleRoute>} />
          <Route path="/audit" element={<RoleRoute roles={['it_admin']}><Audit /></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute roles={['it_admin']}><Settings /></RoleRoute>} />
          <Route path="/admin-management" element={<RoleRoute roles={['it_admin']}><AdminManagement /></RoleRoute>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
