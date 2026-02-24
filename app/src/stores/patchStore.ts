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

// No mock data needed anymore, using real SanerNow data

export const usePatchStore = create<PatchState>()(
    persist(
        (set) => ({
            apiKey: '',    // Not strictly needed if backend uses .env, but keeping interface intact
            isLoading: false,
            lastScanTime: null,
            vulnerabilities: [],
            setApiKey: (key) => set({ apiKey: key }),
            performScan: async () => {
                set({ isLoading: true });

                try {
                    // Call the local backend which proxies to SanerNow
                    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json'
                    };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`; // Use Graph/MSAL token if your app requires it
                    }

                    const res = await fetch('/api/sanernow/vulnerabilities', { headers });

                    if (!res.ok) {
                        throw new Error('Failed to fetch from backend');
                    }

                    const data = await res.json();

                    // Parse the specific response structure from SanerNow.
                    // Depending on the version, getDeviceVulnerabilities returns something like:
                    // data.response.vulnerabilities.vulnerability array
                    let rawVulns = [];
                    if (data?.response?.vulnerabilities?.vulnerability) {
                        rawVulns = Array.isArray(data.response.vulnerabilities.vulnerability)
                            ? data.response.vulnerabilities.vulnerability
                            : [data.response.vulnerabilities.vulnerability];
                    }

                    // Map it to our expected interface
                    const mappedVulns: Vulnerability[] = rawVulns.map((v: any, index: number) => {
                        let severity: Vulnerability['severity'] = 'low';
                        const sevString = (v.severity || '').toLowerCase();
                        if (sevString.includes('critical')) severity = 'critical';
                        else if (sevString.includes('high')) severity = 'high';
                        else if (sevString.includes('medium')) severity = 'medium';

                        return {
                            id: `V-${index + 1000}`,
                            title: v.vulnerability_name || v.cve_id || 'Unknown Vulnerability',
                            severity,
                            cve: v.cve_id || 'N/A',
                            status: 'open', // SanerNow vulns are usually open/unpatched if they show up in this scan
                            detectedAt: v.detection_date || new Date().toISOString()
                        };
                    });

                    set({
                        isLoading: false,
                        lastScanTime: new Date().toISOString(),
                        vulnerabilities: mappedVulns
                    });
                } catch (error) {
                    console.error("Error during performScan:", error);
                    set({ isLoading: false });
                    throw error;
                }
            }
        }),
        {
            name: 'patch-management-storage',
        }
    )
);
