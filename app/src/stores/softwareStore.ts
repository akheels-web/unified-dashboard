import { create } from 'zustand';
// import { Software } from '@/types'; // Import causing crash

// Inlined to avoid circular dependency/import issues with '@/types'
export interface Software {
    id: string;
    name: string;
    version: string;
    licenseKey?: string;
    purchaseDate?: string;
    renewalDate?: string;
    price: number;
    currency: string;
    vendor?: string;
    assignedUsers: string[];
    isOneTimePurchase: boolean;
    status: 'active' | 'expired' | 'upcoming';
    website?: string;
    description?: string;
}

interface SoftwareState {
    softwares: Software[];
    isLoading: boolean;
    addSoftware: (software: Omit<Software, 'id'>) => void;
    updateSoftware: (id: string, software: Partial<Software>) => void;
    deleteSoftware: (id: string) => void;
    getSoftware: (id: string) => Software | undefined;
}

// Mock Data
const MOCK_SOFTWARES: Software[] = [
    {
        id: '1',
        name: 'Adobe Creative Cloud',
        version: '2024',
        licenseKey: 'XXXX-XXXX-XXXX-XXXX',
        purchaseDate: '2024-01-01',
        renewalDate: '2025-01-01',
        price: 59.99,
        currency: 'USD',
        vendor: 'Adobe',
        assignedUsers: ['1', '8'],
        isOneTimePurchase: false,
        status: 'active',
        website: 'https://adobe.com',
        description: 'All apps plan',
    },
    {
        id: '2',
        name: 'JetBrains All Products Pack',
        version: '2023.3',
        purchaseDate: '2023-11-15',
        renewalDate: '2024-11-15',
        price: 249.00,
        currency: 'USD',
        vendor: 'JetBrains',
        assignedUsers: ['1', '7'],
        isOneTimePurchase: false,
        status: 'active',
        website: 'https://jetbrains.com',
    },
    {
        id: '3',
        name: 'Microsoft Visual Studio Professional',
        version: '2022',
        purchaseDate: '2023-06-01',
        price: 499.00,
        currency: 'USD',
        vendor: 'Microsoft',
        assignedUsers: ['1'],
        isOneTimePurchase: true,
        status: 'active',
    },
    {
        id: '4',
        name: 'Slack Enterprise Grid',
        version: 'N/A',
        renewalDate: '2024-03-01',
        price: 12.50,
        currency: 'USD',
        vendor: 'Salesforce',
        assignedUsers: ['1', '2', '3', '4', '5'],
        isOneTimePurchase: false,
        status: 'active',
    }
];

export const useSoftwareStore = create<SoftwareState>((set, get) => ({
    softwares: MOCK_SOFTWARES,
    isLoading: false,
    addSoftware: (software) => {
        const newSoftware: Software = {
            ...software,
            id: Math.random().toString(36).substr(2, 9),
        };
        set((state) => ({
            softwares: [...state.softwares, newSoftware],
        }));
    },
    updateSoftware: (id, updates) => {
        set((state) => ({
            softwares: state.softwares.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            ),
        }));
    },
    deleteSoftware: (id) => {
        set((state) => ({
            softwares: state.softwares.filter((s) => s.id !== id),
        }));
    },
    getSoftware: (id) => {
        return get().softwares.find((s) => s.id === id);
    },
}));
