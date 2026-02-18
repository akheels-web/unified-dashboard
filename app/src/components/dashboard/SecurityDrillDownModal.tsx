import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserX, Shield, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { dashboardApi } from '@/services/api';

interface DrillDownModalProps {
    type: 'alerts' | 'risky-users' | 'non-compliant' | 'external-forwarding' | null;
    onClose: () => void;
}

export function SecurityDrillDownModal({ type, onClose }: DrillDownModalProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (type) {
            fetchData();
        } else {
            setData([]); // Clear data on close
        }
    }, [type]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let response;
            switch (type) {
                case 'alerts':
                    response = await dashboardApi.getSecurityAlerts();
                    break;
                case 'risky-users':
                    response = await dashboardApi.getRiskyUsers();
                    break;
                case 'non-compliant':
                    response = await dashboardApi.getNonCompliantDevices();
                    break;
                case 'external-forwarding':
                    response = await dashboardApi.getExternalForwardingRules();
                    break;
            }

            if (response && response.success) {
                setData(response.data || []);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch drilldown data", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    if (!type) return null;

    const getTitle = () => {
        switch (type) {
            case 'alerts': return 'High Severity Alerts';
            case 'risky-users': return 'High Risk Users';
            case 'non-compliant': return 'Non-Compliant Devices';
            case 'external-forwarding': return 'External Forwarding Rules';
            default: return '';
        }
    };

    const getDescription = () => {
        switch (type) {
            case 'alerts': return 'Critical security incidents requiring immediate attention';
            case 'risky-users': return 'Users flagged with high risk level in Identity Protection';
            case 'non-compliant': return 'Devices failing compliance policies';
            case 'external-forwarding': return 'Mailbox rules forwarding email externally';
            default: return '';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'alerts': return <AlertTriangle className="w-5 h-5" />;
            case 'risky-users': return <UserX className="w-5 h-5" />;
            case 'non-compliant': return <Shield className="w-5 h-5" />;
            case 'external-forwarding': return <ExternalLink className="w-5 h-5" />;
            default: return null;
        }
    };

    const getColorClass = () => {
        switch (type) {
            case 'alerts': return 'bg-red-500/10 text-red-500';
            case 'risky-users': return 'bg-orange-500/10 text-orange-500';
            case 'non-compliant': return 'bg-yellow-500/10 text-yellow-500';
            case 'external-forwarding': return 'bg-blue-500/10 text-blue-500';
            default: return '';
        }
    };

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose} // Close on backdrop click
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                    onClick={(e) => e.stopPropagation()} // Prevent close on modal click
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getColorClass()}`}>
                                {getIcon()}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">{getTitle()}</h3>
                                <p className="text-sm text-muted-foreground">{getDescription()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchData} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    <div className="p-0 overflow-auto flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                <p>Loading security details...</p>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <p>No records found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                    <tr>
                                        {type === 'alerts' && (
                                            <>
                                                <th className="p-4 font-medium">Alert Title</th>
                                                <th className="p-4 font-medium">Severity</th>
                                                <th className="p-4 font-medium">Category</th>
                                                <th className="p-4 font-medium">Time</th>
                                            </>
                                        )}
                                        {type === 'risky-users' && (
                                            <>
                                                <th className="p-4 font-medium">User</th>
                                                <th className="p-4 font-medium">Risk Level</th>
                                                <th className="p-4 font-medium">Details</th>
                                                <th className="p-4 font-medium">Detected</th>
                                            </>
                                        )}
                                        {type === 'non-compliant' && (
                                            <>
                                                <th className="p-4 font-medium">Device Name</th>
                                                <th className="p-4 font-medium">User</th>
                                                <th className="p-4 font-medium">OS</th>
                                                <th className="p-4 font-medium">Compliance</th>
                                            </>
                                        )}
                                        {type === 'external-forwarding' && (
                                            <>
                                                <th className="p-4 font-medium">User</th>
                                                <th className="p-4 font-medium">Action</th>
                                                <th className="p-4 font-medium">Destination</th>
                                                <th className="p-4 font-medium">Status</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.map((item: any, i) => (
                                        <tr key={item.id || i} className="hover:bg-muted/30">
                                            {type === 'alerts' && (
                                                <>
                                                    <td className="p-4 font-medium">{item.title}</td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                                            {item.severity || 'High'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground">{item.category || 'General'}</td>
                                                    <td className="p-4 text-muted-foreground">
                                                        {item.createdDateTime ? format(new Date(item.createdDateTime), 'MMM d, HH:mm') : '-'}
                                                    </td>
                                                </>
                                            )}
                                            {type === 'risky-users' && (
                                                <>
                                                    <td className="p-4 font-medium">{item.userDisplayName}</td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                                                            {item.riskLevel || 'High'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground">{item.riskDetail || 'Generic Risk'}</td>
                                                    <td className="p-4 text-muted-foreground">
                                                        {item.riskLastUpdatedDateTime ? format(new Date(item.riskLastUpdatedDateTime), 'MMM d, HH:mm') : '-'}
                                                    </td>
                                                </>
                                            )}
                                            {type === 'non-compliant' && (
                                                <>
                                                    <td className="p-4 font-medium">{item.deviceName}</td>
                                                    <td className="p-4 text-muted-foreground">{item.userDisplayName}</td>
                                                    <td className="p-4 text-muted-foreground">{item.operatingSystem}</td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                                            Not Compliant
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            {type === 'external-forwarding' && (
                                                <>
                                                    <td className="p-4 font-medium">{item.userDisplayName}</td>
                                                    <td className="p-4 text-muted-foreground">Forward All</td>
                                                    <td className="p-4 font-mono text-xs">{item.forwardTo}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                                            {item.enabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

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
