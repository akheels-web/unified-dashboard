import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, MoreVertical,
    AppWindow, CreditCard, Calendar, Users as UsersIcon,
    AlertTriangle, Loader2,
    DollarSign
} from 'lucide-react';
import { useSoftwareStore } from '@/stores/softwareStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function SoftwarePage() {
    const { softwares, isLoading, deleteSoftware } = useSoftwareStore();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredSoftwares = softwares.filter(software => {
        const matchesSearch = software.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            software.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || software.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this software?')) {
            deleteSoftware(id);
            toast.success('Software deleted successfully');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Software</h1>
                    <p className="text-muted-foreground mt-1">Manage software licenses and subscriptions</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center">
                        <Plus className="w-4 h-4" />
                        Add Software
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <AppWindow className="w-4 h-4" />
                        Total Software
                    </div>
                    <div className="text-2xl font-bold">{softwares.length}</div>
                </div>
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <DollarSign className="w-4 h-4" />
                        Total Cost/Year
                    </div>
                    <div className="text-2xl font-bold">
                        ${softwares.reduce((acc, s) => acc + (s.price || 0), 0).toLocaleString()}
                    </div>
                </div>
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        Upcoming Renewals
                    </div>
                    <div className="text-2xl font-bold">
                        {softwares.filter(s => s.status === 'upcoming').length}
                    </div>
                </div>
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Expired
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                        {softwares.filter(s => s.status === 'expired').length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search software, vendor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="expired">Expired</option>
                    </select>
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MoreVertical className="w-4 h-4 rotate-90" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                viewMode === 'table' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredSoftwares.map((software) => (
                            <motion.div
                                key={software.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group relative bg-card rounded-xl border shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                                            <AppWindow className="w-6 h-6" />
                                        </div>
                                        <StatusBadge status={software.status} />
                                    </div>
                                    <h3 className="font-semibold text-lg line-clamp-1">{software.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{software.vendor}</p>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-dashed">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <CreditCard className="w-3 h-3" /> Cost
                                            </span>
                                            <span className="font-medium">
                                                {software.currency} {software.price}
                                                {!software.isOneTimePurchase && '/yr'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-dashed">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Calendar className="w-3 h-3" /> Renewal
                                            </span>
                                            <span className="font-medium">
                                                {software.renewalDate ? format(new Date(software.renewalDate), 'MMM d, yyyy') : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <UsersIcon className="w-3 h-3" /> Users
                                            </span>
                                            <div className="flex -space-x-2">
                                                {software.assignedUsers.slice(0, 3).map((u, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                                                        {u.charAt(0)}
                                                    </div>
                                                ))}
                                                {software.assignedUsers.length > 3 && (
                                                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                                                        +{software.assignedUsers.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2 pt-4 border-t">
                                        <button
                                            onClick={() => handleDelete(software.id)}
                                            className="flex-1 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        >
                                            Remove
                                        </button>
                                        <button className="flex-1 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
                                            Details
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4 font-medium">Software</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Cost</th>
                                <th className="px-6 py-4 font-medium">Renewal</th>
                                <th className="px-6 py-4 font-medium">Users</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredSoftwares.map((software) => (
                                <tr key={software.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium">{software.name}</div>
                                        <div className="text-xs text-muted-foreground">{software.vendor}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={software.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        {software.currency} {software.price}
                                        {!software.isOneTimePurchase && '/yr'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {software.renewalDate ? format(new Date(software.renewalDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {software.assignedUsers.length} users
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(software.id)}
                                            className="text-destructive hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
