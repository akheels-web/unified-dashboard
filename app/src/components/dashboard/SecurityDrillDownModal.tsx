import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserX, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getAccessToken } from '@/services/auth';

interface DrillDownModalProps {
    type: 'alerts' | 'risky-users' | null;
    onClose: () => void;
}

export function SecurityDrillDownModal({ type, onClose }: DrillDownModalProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!type) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const token = await getAccessToken();
                const endpoint = type === 'alerts'
                    ? '/api/reports/security/alerts' // mapped to server route
                    : '/api/reports/security/risky-users'; // mapped to server route

                // Note: We need to match the actual routes in server.js
                // server.js has: /api/security/alerts and /api/security/risky-users
                const url = type === 'alerts'
                    ? '/api/security/alerts'
                    : '/api/security/risky-users';

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                setData(json.value || []);
            } catch (error) {
                console.error('Failed to fetch details', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type]);

    if (!type) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-3xl max-h-[80vh] rounded-xl border border-border shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${type === 'alerts' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                {type === 'alerts' ? <AlertTriangle className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {type === 'alerts' ? 'High Severity Alerts' : 'High Risk Users'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {type === 'alerts' ? 'Active security incidents requiring attention' : 'Identities flagged with high risk level'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-auto p-0 flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Shield className="w-12 h-12 mb-4 opacity-20" />
                                <p>No active {type === 'alerts' ? 'alerts' : 'risky users'} found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr>
                                        {type === 'alerts' ? (
                                            <>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Alert Name</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Severity</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Risk Level</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">State</th>
                                                <th className="text-left p-4 font-medium text-muted-foreground">Detected</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.map((item: any, i) => (
                                        <tr key={item.id || i} className="hover:bg-muted/20">
                                            {type === 'alerts' ? (
                                                <>
                                                    <td className="p-4 font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{item.title || 'Unknown Alert'}</span>
                                                            <span className="text-xs text-muted-foreground">{item.description?.substring(0, 60)}...</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-xs font-semibold capitalize">
                                                            {item.severity}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground capitalize">{item.status}</td>
                                                    <td className="p-4 text-muted-foreground">
                                                        {item.createdDateTime ? format(new Date(item.createdDateTime), 'MMM d, h:mm a') : '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4 font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{item.userDisplayName || item.userPrincipalName}</span>
                                                            <span className="text-xs text-muted-foreground">{item.userPrincipalName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-500 text-xs font-semibold capitalize">
                                                            {item.riskLevel}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground capitalize">{item.riskState}</td>
                                                    <td className="p-4 text-muted-foreground">
                                                        {item.riskLastUpdatedDateTime ? format(new Date(item.riskLastUpdatedDateTime), 'MMM d, h:mm a') : '-'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
                        <button
                            onClick={() => type === 'alerts' ? window.open('https://security.microsoft.com', '_blank') : window.open('https://entra.microsoft.com', '_blank')}
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                        >
                            View in Microsoft Portal <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
