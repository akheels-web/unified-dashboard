import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { toast } from 'sonner';

// License name mapping for better display
const LICENSE_NAMES: Record<string, string> = {
    'Exchange Online (Plan 1)': 'Exchange Online (Plan 1)',
    'Exchange Online (Plan 2)': 'Exchange Online (Plan 2)',
    'Exchange Online Kiosk': 'Exchange Online Kiosk',
    'Microsoft 365 Business Basic': 'Microsoft 365 Business Basic',
    'Microsoft 365 Business Premium': 'Microsoft 365 Business Premium',
    'Microsoft 365 Business Premium and Microsoft 365 Copilot': 'Microsoft 365 Business Premium and Microsoft 365 Copilot',
    'Microsoft 365 Business Standard': 'Microsoft 365 Business Standard',
    'Microsoft 365 Copilot': 'Microsoft 365 Copilot',
    'Microsoft 365 E5': 'Microsoft 365 E5',
    'Power BI Pro': 'Power BI Pro',
    'Visio Plan 2': 'Visio Plan 2'
};

export function Licenses() {
    const [licenses, setLicenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadLicenses();
    }, []);

    const loadLicenses = async () => {
        try {
            const response = await dashboardApi.getLicenses();
            if (response.success && response.data) {
                setLicenses(response.data);
            }
        } catch (error) {
            toast.error('Failed to load licenses');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadLicenses();
        setIsRefreshing(false);
        toast.success('Licenses refreshed');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">License Management</h1>
                    <p className="text-muted-foreground mt-1">Monitor Microsoft 365 license usage and availability</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-xl border border-border p-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Licenses</p>
                            <p className="text-2xl font-bold text-foreground">
                                {licenses.reduce((sum, l) => sum + l.total, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card rounded-xl border border-border p-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Assigned</p>
                            <p className="text-2xl font-bold text-foreground">
                                {licenses.reduce((sum, l) => sum + l.used, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card rounded-xl border border-border p-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Available</p>
                            <p className="text-2xl font-bold text-foreground">
                                {licenses.reduce((sum, l) => sum + l.available, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* License List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">License Types</h2>
                </div>
                <div className="divide-y divide-border">
                    {licenses.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            No licenses found
                        </div>
                    ) : (
                        licenses.map((license, index) => (
                            <motion.div
                                key={license.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-6 hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {LICENSE_NAMES[license.name] || license.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {license.used.toLocaleString()} of {license.total.toLocaleString()} assigned
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-foreground">{license.percentage}%</p>
                                        <p className="text-sm text-muted-foreground">
                                            {license.available.toLocaleString()} available
                                        </p>
                                    </div>
                                </div>
                                {/* Usage Bar */}
                                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${license.percentage >= 90
                                            ? 'bg-red-500'
                                            : license.percentage >= 75
                                                ? 'bg-orange-500'
                                                : 'bg-green-500'
                                            }`}
                                        style={{ width: `${license.percentage}%` }}
                                    />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
