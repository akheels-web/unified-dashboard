import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Key, Users, Calendar, Search } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { toast } from 'sonner';

export function ApplicationGovernance() {
    const [apps, setApps] = useState<any[]>([]);
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadApps();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredApps(apps);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = apps.filter(app =>
            app.displayName.toLowerCase().includes(lowerTerm) ||
            app.appId.toLowerCase().includes(lowerTerm)
        );
        setFilteredApps(filtered);
    }, [searchTerm, apps]);

    const loadApps = async () => {
        try {
            const response = await dashboardApi.getApplications();
            if (response.success && response.data) {
                setApps(response.data);
                setFilteredApps(response.data);
            }
        } catch (error) {
            toast.error('Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };

    // Metrics Calculation (Always based on TOTAL apps, not filtered)
    const totalApps = apps.length;
    const newApps = apps.filter(a => a.riskFactors.includes('Recently Created')).length;
    const expiringSecrets = apps.filter(a => a.secrets.expiring > 0 || a.secrets.expired > 0).length;
    const noOwners = apps.filter(a => a.riskFactors.includes('No Owner')).length;
    const highPrivilege = apps.filter(a => a.riskFactors.includes('High Privilege') || a.riskFactors.includes('Multi-tenant')).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Governance</h1>
                    <p className="text-muted-foreground mt-1">Monitor enterprise applications, risk, and compliance</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search apps..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap hidden md:block">
                        Total: <span className="font-bold text-foreground">{totalApps}</span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="New Apps (30d)"
                    value={newApps}
                    icon={Calendar}
                    color="text-blue-400"
                    bg="bg-blue-500/20"
                />
                <StatsCard
                    title="Expiring Secrets"
                    value={expiringSecrets}
                    icon={Key}
                    color="text-orange-400"
                    bg="bg-orange-500/20"
                />
                <StatsCard
                    title="Apps Without Owners"
                    value={noOwners}
                    icon={Users}
                    color="text-red-400"
                    bg="bg-red-500/20"
                />
                <StatsCard
                    title="High Risk / Privileged"
                    value={highPrivilege}
                    icon={Shield}
                    color="text-purple-400"
                    bg="bg-purple-500/20"
                />
            </div>

            {/* Applications Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Enterprise Applications</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Application Name</th>
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owners</th>
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Secrets</th>
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk Factors</th>
                                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredApps.map((app) => (
                                <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-foreground">{app.displayName}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{app.appId}</div>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {app.createdDateTime ? new Date(app.createdDateTime).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-4">
                                        {app.owners && app.owners.length > 0 ? (
                                            <div className="flex -space-x-2">
                                                {app.owners.slice(0, 3).map((owner: any, i: number) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs border-2 border-background" title={owner.displayName}>
                                                        {owner.displayName.charAt(0)}
                                                    </div>
                                                ))}
                                                {app.owners.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs border-2 border-background">
                                                        +{app.owners.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-red-400 text-xs font-medium px-2 py-1 rounded-full bg-red-500/10">No Owner</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            {app.secrets.expiring > 0 && (
                                                <div className="flex items-center gap-1 text-orange-400">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {app.secrets.expiring} Expiring
                                                </div>
                                            )}
                                            {app.secrets.expired > 0 && (
                                                <div className="flex items-center gap-1 text-red-400">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {app.secrets.expired} Expired
                                                </div>
                                            )}
                                            {app.secrets.total === 0 && <span className="text-muted-foreground text-xs">No secrets</span>}
                                            {app.secrets.total > 0 && app.secrets.expiring === 0 && app.secrets.expired === 0 && (
                                                <span className="text-green-400 text-xs text-nowrap">Valid</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {app.riskFactors.map((risk: string, i: number) => (
                                                <RiskBadge key={i} label={risk} />
                                            ))}
                                            {app.riskFactors.length === 0 && (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-secondary rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full ${getRiskColor(app.riskScore)}`}
                                                    style={{ width: `${Math.min(app.riskScore, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{app.riskScore}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6"
        >
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

function RiskBadge({ label }: { label: string }) {
    let color = "bg-secondary text-secondary-foreground";
    if (label.includes('Expired')) color = "bg-red-500/10 text-red-500";
    if (label.includes('Expiring')) color = "bg-orange-500/10 text-orange-500";
    if (label.includes('No Owner')) color = "bg-red-500/10 text-red-500";
    if (label.includes('Multi-tenant')) color = "bg-purple-500/10 text-purple-500";
    if (label.includes('Created')) color = "bg-blue-500/10 text-blue-500";

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${color}`}>
            {label}
        </span>
    );
}

function getRiskColor(score: number) {
    if (score >= 50) return "bg-red-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-green-500";
}
