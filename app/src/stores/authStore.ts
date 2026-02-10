import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User) => void;
  logout: () => void;

  // Permissions
  hasRole: (roles: string[]) => boolean;
  isITAdmin: () => boolean;
  canManageUsers: () => boolean;
  canManageAssets: () => boolean;
  canManageWorkflows: () => boolean;
  canAccessPage: (path: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),

      login: (user) => set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),

      logout: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }),

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      isITAdmin: () => {
        const { user } = get();
        return user?.role === 'it_admin';
      },

      canManageUsers: () => {
        const { user } = get();
        return user?.role === 'it_admin';
      },

      canManageAssets: () => {
        const { user } = get();
        return user?.role === 'it_admin' || user?.role === 'it_user';
      },

      canManageWorkflows: () => {
        const { user } = get();
        return ['it_admin', 'it_user'].includes(user?.role || '');
      },

      canAccessPage: (path) => {
        const { user } = get();
        if (!user) return false;

        // 1. IT Admins have full access
        if (user.role === 'it_admin') return true;

        // 2. Check granular permissions if available
        if (user.permissions) {
          // Map paths to permission keys
          if (path === '/' || path === '/dashboard') return user.permissions.dashboard;
          if (path.startsWith('/users')) return user.permissions.users;
          if (path.startsWith('/assets')) return user.permissions.assets;
          if (path.startsWith('/software')) return user.permissions.software;
          if (path.startsWith('/onboarding')) return user.permissions.onboarding;
          if (path.startsWith('/offboarding')) return user.permissions.offboarding;
          if (path.startsWith('/network')) return user.permissions.network;
          if (path.startsWith('/sites')) return user.permissions.sites;
          if (path.startsWith('/proxmox')) return user.permissions.proxmox;
          if (path.startsWith('/patch-management')) return user.permissions.patchManagement;
          if (path.startsWith('/reports')) return user.permissions.reports;
          if (path.startsWith('/audit')) return user.permissions.auditLogs;
          if (path.startsWith('/settings')) return user.permissions.settings;
          if (path.startsWith('/admin-management')) return false; // Admin management is IT Admin only
        }

        // 3. Legacy: allowedPages (if still used)
        if (user.allowedPages && user.allowedPages.length > 0) {
          return user.allowedPages.includes(path);
        }

        // 4. Fallback for basic IT User if no permissions defined (shouldn't happen with new admins)
        // Default to safe pages for IT User
        if (user.role === 'it_user') {
          const basicPaths = ['/', '/dashboard', '/users', '/assets', '/software', '/network', '/proxmox'];
          return basicPaths.some(p => path.startsWith(p));
        }

        return false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
