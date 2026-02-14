import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, RefreshCw, Users, Mail, Calendar, Shield, X, Loader2
} from 'lucide-react';
import { groupsApi } from '@/services/api';
import type { UserGroup } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Groups() {
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'security' | 'distribution' | 'm365'>('all');
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
    const [groupMembers, setGroupMembers] = useState<{ members: any[], owners: any[] }>({ members: [], owners: [] });
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        loadGroups(activeTab);
    }, [activeTab]);

    const loadGroups = async (type: 'all' | 'security' | 'distribution' | 'm365' = 'all') => {
        setLoading(true);
        try {
            const response = await groupsApi.getGroups(type);
            if (response.success && response.data) {
                setGroups(response.data);
            }
        } catch (error) {
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: 'all' | 'security' | 'distribution' | 'm365') => {
        setActiveTab(tab);
    };

    const handleGroupClick = async (group: UserGroup) => {
        setSelectedGroup(group);
        setLoadingMembers(true);
        try {
            const response = await groupsApi.getGroupMembers(group.id);
            if (response.success && response.data) {
                setGroupMembers(response.data);
            }
        } catch (error) {
            toast.error('Failed to load group members');
        } finally {
            setLoadingMembers(false);
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
                    onClick={() => loadGroups(activeTab)}
                    className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Sync
                </button>
            </div>

            {/* Group Type Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
                {[
                    { key: 'all', label: 'All Groups' },
                    { key: 'security', label: 'Security' },
                    { key: 'distribution', label: 'Distribution' },
                    { key: 'm365', label: 'M365' }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key
                            ? 'bg-[#ed7422] text-white'
                            : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
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
                        onClick={() => handleGroupClick(group)}
                        className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
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

            {/* Group Members Modal */}
            <AnimatePresence>
                {selectedGroup && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedGroup(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl max-h-[85vh] bg-card rounded-xl border border-border shadow-2xl z-[100] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">{selectedGroup.displayName}</h2>
                                    <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                                {loadingMembers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Owners Section */}
                                        <section>
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                                Owners ({groupMembers.owners.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {groupMembers.owners.map((owner: any) => (
                                                    <div key={owner.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                            {owner.displayName?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-foreground font-medium">{owner.displayName}</p>
                                                            <p className="text-xs text-muted-foreground">{owner.mail || owner.userPrincipalName}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {groupMembers.owners.length === 0 && (
                                                    <p className="text-muted-foreground text-center py-4">No owners</p>
                                                )}
                                            </div>
                                        </section>

                                        {/* Members Section */}
                                        <section>
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                                Members ({groupMembers.members.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {groupMembers.members.map((member: any) => (
                                                    <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                            {member.displayName?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-foreground font-medium">{member.displayName}</p>
                                                            <p className="text-xs text-muted-foreground">{member.mail || member.userPrincipalName}</p>
                                                            {member.jobTitle && (
                                                                <p className="text-xs text-muted-foreground">{member.jobTitle}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {groupMembers.members.length === 0 && (
                                                    <p className="text-muted-foreground text-center py-4">No members</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
