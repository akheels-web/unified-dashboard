import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProxmoxVm {
    id: string;
    nodeId: string;
    name: string;
    status: 'running' | 'stopped' | 'error';
    cpu: number; // Usage %
    ram: number; // Usage %
    disk: number; // Usage %
    uptime: string;
    cores: number; // Total Cores
    memory: number; // Total RAM in GB
    storage: number; // Total Storage in GB
}

export interface ProxmoxNode {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'maintenance';
    cpu: number; // Usage %
    ram: number; // Usage %
    disk: number; // Usage %
    uptime: string;
    totalCpu: number; // Total Cores
    totalRam: number; // Total RAM in GB
    totalDisk: number; // Total Storage in GB
}

interface ProxmoxState {
    nodes: ProxmoxNode[];
    vms: ProxmoxVm[];
    addNode: (node: ProxmoxNode) => void;
    updateNode: (id: string, updates: Partial<ProxmoxNode>) => void;
    deleteNode: (id: string) => void;
    addVm: (vm: ProxmoxVm) => void;
    updateVm: (id: string, updates: Partial<ProxmoxVm>) => void;
    deleteVm: (id: string) => void;
    setNodes: (nodes: ProxmoxNode[]) => void;
    setVms: (vms: ProxmoxVm[]) => void;
}

// Mock Initial Data
const INITIAL_NODES: ProxmoxNode[] = [
    { id: 'pve-01', name: 'pve-cluster-01', status: 'online', cpu: 45, ram: 62, disk: 28, uptime: '14d 2h 12m', totalCpu: 32, totalRam: 128, totalDisk: 2000 },
    { id: 'pve-02', name: 'pve-cluster-02', status: 'online', cpu: 32, ram: 48, disk: 15, uptime: '14d 2h 10m', totalCpu: 32, totalRam: 128, totalDisk: 2000 },
];

const INITIAL_VMS: ProxmoxVm[] = [
    { id: '100', nodeId: 'pve-01', name: 'prod-web-01', status: 'running', cpu: 25, ram: 40, disk: 60, uptime: '5d 1h', cores: 4, memory: 8, storage: 100 },
    { id: '101', nodeId: 'pve-01', name: 'prod-db-01', status: 'running', cpu: 45, ram: 80, disk: 75, uptime: '12d 4h', cores: 8, memory: 16, storage: 500 },
    { id: '102', nodeId: 'pve-02', name: 'dev-server', status: 'stopped', cpu: 0, ram: 0, disk: 20, uptime: '0m', cores: 2, memory: 4, storage: 50 },
];

export const useProxmoxStore = create<ProxmoxState>()(
    persist(
        (set) => ({
            nodes: INITIAL_NODES,
            vms: INITIAL_VMS,
            addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
            updateNode: (id, updates) => set((state) => ({
                nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
            })),
            deleteNode: (id) => set((state) => ({
                nodes: state.nodes.filter((n) => n.id !== id),
                vms: state.vms.filter((v) => v.nodeId !== id), // Cascade delete VMs
            })),
            addVm: (vm) => set((state) => ({ vms: [...state.vms, vm] })),
            updateVm: (id, updates) => set((state) => ({
                vms: state.vms.map((v) => (v.id === id ? { ...v, ...updates } : v)),
            })),
            deleteVm: (id) => set((state) => ({ vms: state.vms.filter((v) => v.id !== id) })),
            setNodes: (nodes) => set({ nodes }),
            setVms: (vms) => set({ vms }),
        }),
        {
            name: 'proxmox-storage',
        }
    )
);
