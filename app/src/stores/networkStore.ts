import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnifiSite, UnifiDevice } from '@/types';

// Mock initial data
const INITIAL_SITES: UnifiSite[] = [
    { id: 'site_nyc', name: 'New York HQ', status: 'online', deviceCount: 12, clientCount: 145, location: 'New York, USA', isActive: true },
    { id: 'site_lon', name: 'London Branch', status: 'online', deviceCount: 8, clientCount: 89, location: 'London, UK', isActive: true },
    { id: 'site_sgp', name: 'Singapore Hub', status: 'online', deviceCount: 5, clientCount: 42, location: 'Singapore', isActive: true },
    { id: 'site_remote', name: 'Remote Operations', status: 'offline', deviceCount: 3, clientCount: 0, location: 'Global', isActive: false },
];

interface NetworkState {
    sites: UnifiSite[];
    devices: UnifiDevice[];
    addSite: (site: UnifiSite) => void;
    updateSite: (id: string, updates: Partial<UnifiSite>) => void;
    deleteSite: (id: string) => void;
    setSites: (sites: UnifiSite[]) => void;
}

export const useNetworkStore = create<NetworkState>()(
    persist(
        (set) => ({
            sites: INITIAL_SITES,
            devices: [],
            addSite: (site) => set((state) => ({ sites: [...state.sites, site] })),
            updateSite: (id, updates) => set((state) => ({
                sites: state.sites.map((site) => site.id === id ? { ...site, ...updates } : site)
            })),
            deleteSite: (id) => set((state) => ({
                sites: state.sites.filter((site) => site.id !== id)
            })),
            setSites: (sites) => set({ sites }),
        }),
        {
            name: 'network-storage',
        }
    )
);
