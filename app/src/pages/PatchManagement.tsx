import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Shield, CheckCircle,
    Search, RefreshCw, ExternalLink,
    Settings as SettingsIcon,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { usePatchStore } from '@/stores/patchStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function PatchManagement() {
    const navigate = useNavigate();
    const {
        apiKey,
        isLoading,
        lastScanTime,
        vulnerabilities,
        performScan
    } = usePatchStore();

    const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleScan = async () => {
        try {
            await performScan();
            toast.success('Vulnerability scan completed successfully');
        } catch (error) {
            toast.error('Failed to perform scan');
        }
    };

    const filteredVulns = vulnerabilities.filter(v => {
        const matchesFilter = filter === 'all' || v.severity === filter;
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.cve.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    if (!apiKey) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                        <Shield className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Configuration Required</h2>
                        <p className="text-muted-foreground">
                            Please configure your SecPod SanerNow API key to access patch management features.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <SettingsIcon className="w-5 h-5" />
                        Go to Settings
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary" />
                        Patch Management
                    </h1>
                    <p className="text-muted-foreground">
                        Powered by SecPod SanerNow
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {lastScanTime && (
                        <span className="text-sm text-muted-foreground">
                            Last scan: {new Date(lastScanTime).toLocaleString()}
                        </span>
                    )}
                    <button
                        onClick={handleScan}
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        {isLoading ? 'Scanning...' : 'Scan Now'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Vulnerabilities</p>
                    <p className="text-2xl font-bold text-foreground">{vulnerabilities.length}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Critical</p>
                    <p className="text-2xl font-bold text-red-500">
                        {vulnerabilities.filter(v => v.severity === 'critical').length}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">High</p>
                    <p className="text-2xl font-bold text-orange-500">
                        {vulnerabilities.filter(v => v.severity === 'high').length}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Patched</p>
                    <p className="text-2xl font-bold text-green-500">
                        {vulnerabilities.filter(v => v.status === 'patched').length}
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-card border border-border rounded-xl p-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by CVE or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors",
                                filter === s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vulnerabilities List */}
            <div className="space-y-4">
                {filteredVulns.length === 0 ? (
                    <div className="text-center py-12 bg-card border border-border rounded-xl">
                        <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No vulnerabilities found</h3>
                        <p className="text-muted-foreground">Try adjusting your filters or run a new scan</p>
                    </div>
                ) : (
                    filteredVulns.map((vuln) => (
                        <motion.div
                            key={vuln.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase", getSeverityColor(vuln.severity))}>
                                            {vuln.severity}
                                        </span>
                                        <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                            {vuln.cve}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground">{vuln.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Detected: {new Date(vuln.detectedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                        title="View CVE Details"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                    {vuln.status === 'open' ? (
                                        <button className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors">
                                            Patch Now
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-green-500 text-sm font-medium px-3 py-1.5 bg-green-500/10 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Patched
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
