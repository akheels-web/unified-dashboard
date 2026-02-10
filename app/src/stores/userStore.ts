import { create } from 'zustand';
import type { M365User, UserGroup, UserFilters } from '@/types';

interface UserState {
  users: M365User[];
  selectedUser: M365User | null;
  groups: UserGroup[];
  filters: UserFilters;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  setUsers: (users: M365User[]) => void;
  setSelectedUser: (user: M365User | null) => void;
  setGroups: (groups: UserGroup[]) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<UserState['pagination']>) => void;
  updateUser: (userId: string, updates: Partial<M365User>) => void;
  removeUser: (userId: string) => void;
  clearFilters: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  groups: [],
  filters: {
    search: '',
    department: '',
    status: 'all',
    location: '',
  },
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  },

  setUsers: (users) => set({ users }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setGroups: (groups) => set({ groups }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, page: 1 }
  })),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set((state) => ({ 
    pagination: { ...state.pagination, ...pagination } 
  })),

  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    selectedUser: state.selectedUser?.id === userId 
      ? { ...state.selectedUser, ...updates } 
      : state.selectedUser,
  })),

  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId),
    selectedUser: state.selectedUser?.id === userId ? null : state.selectedUser,
  })),

  clearFilters: () => set({
    filters: {
      search: '',
      department: '',
      status: 'all',
      location: '',
    },
    pagination: {
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    },
  }),
}));
