import { create } from 'zustand';
import type { M365User, Asset, ActivityItem } from '@/types';

interface ReportState {
  users: M365User[];
  assets: Asset[];
  licenses: any[];
  auditLogs: ActivityItem[];
  mfaData: { enabled: number; disabled: number; percentage: number };
  lastUpdated: number | null;
  
  setData: (data: {
    users?: M365User[];
    assets?: Asset[];
    licenses?: any[];
    auditLogs?: ActivityItem[];
    mfaData?: any;
  }) => void;
  clearCache: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  users: [],
  assets: [],
  licenses: [],
  auditLogs: [],
  mfaData: { enabled: 0, disabled: 0, percentage: 0 },
  lastUpdated: null,

  setData: (data) => set((state) => ({
    ...state,
    ...data,
    lastUpdated: Date.now()
  })),

  clearCache: () => set({
    users: [],
    assets: [],
    licenses: [],
    auditLogs: [],
    mfaData: { enabled: 0, disabled: 0, percentage: 0 },
    lastUpdated: null
  })
}));
