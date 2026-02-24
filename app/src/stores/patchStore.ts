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
                    // Based on the SanerNow WebServices guide, the response structure for vulnerabilities is:
                    // data.response.results.result[].result[].concerns[]

                    let rawVulns: Vulnerability[] = [];
                    const resultList = data?.response?.results?.result || [];
                    const parsedItems = Array.isArray(resultList) ? resultList : [resultList].filter(Boolean);

                    parsedItems.forEach((deviceData: any) => {
                        const deviceResults = Array.isArray(deviceData.result) ? deviceData.result : [deviceData.result].filter(Boolean);

                        deviceResults.forEach((assetItem: any) => {
                            const concerns = Array.isArray(assetItem.concerns) ? assetItem.concerns : [assetItem.concerns].filter(Boolean);

                            concerns.forEach((c: any) => {
                                if (c && c.id && c.title) {
                                    let severity: Vulnerability['severity'] = 'low';
                                    const sevString = (c.severity || '').toLowerCase();
                                    if (sevString.includes('critical')) severity = 'critical';
                                    else if (sevString.includes('high')) severity = 'high';
                                    else if (sevString.includes('medium')) severity = 'medium';

                                    rawVulns.push({
                                        id: c.id + '-' + Math.random().toString(36).substr(2, 5), // Ensure unique IDs for React key
                                        title: c.title,
                                        severity,
                                        cve: c.id,
                                        status: 'open',
                                        detectedAt: c.detectiondate || new Date().toISOString()
                                    });
                                }
                            });
                        });
                    });

                    // Deduplicate by CVE to display unique vulnerabilities across all devices
                    const mappedVulns = Array.from(new Map(rawVulns.map(v => [v.cve, v])).values());

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
