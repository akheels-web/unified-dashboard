import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardAdmin, M365GroupMapping } from '@/types';

interface AdminState {
    admins: DashboardAdmin[];
    groupMappings: M365GroupMapping[];
    addAdmin: (admin: DashboardAdmin) => void;
    updateAdmin: (id: string, updates: Partial<DashboardAdmin>) => void;
    deleteAdmin: (id: string) => void;
    setAdmins: (admins: DashboardAdmin[]) => void;
    updateGroupMapping: (role: 'it_admin' | 'it_user', mapping: Partial<M365GroupMapping>) => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            admins: [],
            groupMappings: [
                { role: 'it_admin', groupId: '', groupName: '', autoSync: false },
                { role: 'it_user', groupId: '', groupName: '', autoSync: false },
            ],
            addAdmin: (admin) => set((state) => ({ admins: [...state.admins, admin] })),
            updateAdmin: (id, updates) => set((state) => ({
                admins: state.admins.map((admin) => admin.id === id ? { ...admin, ...updates } : admin)
            })),
            deleteAdmin: (id) => set((state) => ({
                admins: state.admins.filter((admin) => admin.id !== id)
            })),
            setAdmins: (admins) => set({ admins }),
            updateGroupMapping: (role, mapping) => set((state) => ({
                groupMappings: state.groupMappings.map((m) =>
                    m.role === role ? { ...m, ...mapping } : m
                )
            })),
        }),
        {
            name: 'admin-storage',
        }
    )
);
