import { create } from 'zustand';
import type { SecuritySummary, DeviceHealth, IdentityHygiene, M365License, ActivityItem, SystemStatus } from '@/types';

interface DashboardState {
  securitySummary: SecuritySummary | null;
  deviceHealth: DeviceHealth | null;
  identityHygiene: IdentityHygiene | null;
  licenses: M365License[];
  activities: ActivityItem[];
  systemStatus: SystemStatus | null;
  mfaCoverage: any | null;
  lastUpdated: number | null;

  setDashboardData: (data: Partial<DashboardState>) => void;
  clearCache: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  securitySummary: null,
  deviceHealth: null,
  identityHygiene: null,
  licenses: [],
  activities: [],
  systemStatus: null,
  mfaCoverage: null,
  lastUpdated: null,

  setDashboardData: (data) => set((state) => ({
    ...state,
    ...data,
    lastUpdated: Date.now()
  })),

  clearCache: () => set({
    securitySummary: null,
    deviceHealth: null,
    identityHygiene: null,
    licenses: [],
    activities: [],
    systemStatus: null,
    mfaCoverage: null,
    lastUpdated: null
  })
}));
