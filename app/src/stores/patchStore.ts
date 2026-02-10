import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Vulnerability {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cve: string;
    status: 'open' | 'patched';
    detectedAt: string;
}

interface PatchState {
    apiKey: string;
    isLoading: boolean;
    lastScanTime: string | null;
    vulnerabilities: Vulnerability[];
    setApiKey: (key: string) => void;
    performScan: () => Promise<void>;
}

// Mock Data for demonstration
const MOCK_VULNS: Vulnerability[] = [
    { id: 'V-1001', title: 'OpenSSL Heartbleed Vulnerability', severity: 'critical', cve: 'CVE-2014-0160', status: 'open', detectedAt: new Date().toISOString() },
    { id: 'V-1002', title: 'Apache Log4j Remote Code Execution', severity: 'critical', cve: 'CVE-2021-44228', status: 'patched', detectedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'V-1003', title: 'Windows Print Spooler Remote Code Execution', severity: 'high', cve: 'CVE-2021-34527', status: 'open', detectedAt: new Date().toISOString() },
    { id: 'V-1004', title: 'Cross-Site Scripting (XSS) in Web Server', severity: 'medium', cve: 'CVE-2022-20001', status: 'open', detectedAt: new Date().toISOString() },
];

export const usePatchStore = create<PatchState>()(
    persist(
        (set, get) => ({
            apiKey: '',
            isLoading: false,
            lastScanTime: null,
            vulnerabilities: [],
            setApiKey: (key) => set({ apiKey: key }),
            performScan: async () => {
                const { apiKey } = get();
                if (!apiKey) {
                    throw new Error('API Key is required to perform scan.');
                }

                set({ isLoading: true });

                // Simulate API call to https://saner.secpod.com/AncorWebService/perform
                // Real implementation would use fetch/axios with Authorization: SAML <Key>
                return new Promise((resolve) => {
                    setTimeout(() => {
                        set({
                            isLoading: false,
                            lastScanTime: new Date().toISOString(),
                            vulnerabilities: MOCK_VULNS
                        });
                        resolve();
                    }, 2000);
                });
            }
        }),
        {
            name: 'patch-management-storage',
        }
    )
);
