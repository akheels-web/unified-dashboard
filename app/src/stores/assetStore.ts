import { create } from 'zustand';
import type { Asset, AssetCategory, AssetFilters } from '@/types';

interface AssetState {
  assets: Asset[];
  selectedAsset: Asset | null;
  categories: AssetCategory[];
  filters: AssetFilters;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  setAssets: (assets: Asset[]) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  setCategories: (categories: AssetCategory[]) => void;
  setFilters: (filters: Partial<AssetFilters>) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<AssetState['pagination']>) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  clearFilters: () => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  selectedAsset: null,
  categories: [],
  filters: {
    search: '',
    category: '',
    status: '',
    location: '',
    assignedTo: '',
  },
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },

  setAssets: (assets) => set({ assets }),
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  setCategories: (categories) => set({ categories }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, page: 1 }
  })),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set((state) => ({ 
    pagination: { ...state.pagination, ...pagination } 
  })),

  updateAsset: (assetId, updates) => set((state) => ({
    assets: state.assets.map(a => a.id === assetId ? { ...a, ...updates } : a),
    selectedAsset: state.selectedAsset?.id === assetId 
      ? { ...state.selectedAsset, ...updates } 
      : state.selectedAsset,
  })),

  addAsset: (asset) => set((state) => ({
    assets: [asset, ...state.assets],
  })),

  removeAsset: (assetId) => set((state) => ({
    assets: state.assets.filter(a => a.id !== assetId),
    selectedAsset: state.selectedAsset?.id === assetId ? null : state.selectedAsset,
  })),

  clearFilters: () => set({
    filters: {
      search: '',
      category: '',
      status: '',
      location: '',
      assignedTo: '',
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
  }),
}));
