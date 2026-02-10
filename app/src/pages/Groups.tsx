import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search, RefreshCw, Users, Mail, Calendar, Shield, LayoutGrid
} from 'lucide-react';
import { groupsApi } from '@/services/api';
import type { UserGroup } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Groups() {
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const response = await groupsApi.getGroups();
            if (response.success && response.data) {
                setGroups(response.data);
            }
        } catch (error) {
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const filteredGroups = groups.filter(g =>
        g.displayName.toLowerCase().includes(search.toLowerCase()) ||
        g.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Groups</h1>
                    <p className="text-muted-foreground">Manage M365 and Security Groups</p>
                </div>
                <button
                    onClick={loadGroups}
                    className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Sync
                </button>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search groups..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Groups Grid/Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map((group) => (
                    <motion.div
                        key={group.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${group.groupType === 'M365' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                                    }`}>
                                    {group.groupType === 'M365' ? <Users className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">{group.displayName}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${group.groupType === 'M365' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                                        }`}>
                                        {group.groupType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {group.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{group.email}</span>
                                </div>
                            )}
                            {group.description && group.description !== 'No description' && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                                <Calendar className="w-4 h-4" />
                                <span>Created {group.createdDate ? format(new Date(group.createdDate), 'MMM d, yyyy') : 'Unknown'}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
                {!loading && filteredGroups.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No groups found.
                    </div>
                )}
            </div>
        </div>
    );
}
