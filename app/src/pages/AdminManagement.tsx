import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Shield, UserCog, Eye, X, Check, Users, RefreshCw } from 'lucide-react';
import { useAdminStore } from '@/stores/adminStore';
import { mockDashboardAdmins } from '@/services/mockData';
import type { DashboardAdmin, PagePermissions, M365GroupMapping } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminManagement() {
    const { admins, setAdmins, addAdmin, updateAdmin, deleteAdmin, groupMappings, updateGroupMapping } = useAdminStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<DashboardAdmin | null>(null);

    // Initialize with mock data if empty
    useEffect(() => {
        if (admins.length === 0) {
            setAdmins(mockDashboardAdmins.map(a => ({ ...a, source: 'manual' })));
        }
    }, [admins.length, setAdmins]);

    // Filter admins
    const filteredAdmins = admins.filter(admin => {
        const matchesSearch = admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleCreateAdmin = (adminData: Omit<DashboardAdmin, 'id' | 'createdAt' | 'createdBy'>) => {
        const newAdmin: DashboardAdmin = {
            ...adminData,
            id: `admin-${Date.now()}`,
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
            source: 'manual',
        };
        addAdmin(newAdmin);
        setShowCreateModal(false);
        toast.success('Admin created successfully');
    };

    const handleUpdateAdmin = (adminData: Partial<DashboardAdmin>) => {
        if (selectedAdmin) {
            updateAdmin(selectedAdmin.id, adminData);
            setShowEditModal(false);
            setSelectedAdmin(null);
            toast.success('Admin updated successfully');
        }
    };

    const handleDeleteAdmin = () => {
        if (selectedAdmin) {
            deleteAdmin(selectedAdmin.id);
            setShowDeleteModal(false);
            setSelectedAdmin(null);
            toast.success('Admin deleted successfully');
        }
    };

    // Simulate Sync
    const handleSyncGroups = () => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Syncing with Microsoft 365...',
                success: () => {
                    // Simulate adding a synced user if not exists
                    const syncedAdminExists = admins.some(a => a.email === 'alex.synced@company.com');
                    if (!syncedAdminExists && groupMappings.find(m => m.role === 'it_user')?.autoSync) {
                        addAdmin({
                            id: `synced-${Date.now()}`,
                            username: 'Alex Synced',
                            email: 'alex.synced@company.com',
                            role: 'it_user',
                            status: 'active',
                            createdAt: new Date().toISOString(),
                            createdBy: 'system',
                            source: 'synced',
                            m365GroupId: groupMappings.find(m => m.role === 'it_user')?.groupId,
                            permissions: {
                                dashboard: true, users: true, assets: true, software: false,
                                onboarding: false, offboarding: false, network: true, sites: false,
                                proxmox: false, patchManagement: false, reports: true, auditLogs: false, settings: false
                            }
                        });
                        return 'Sync complete. New users added from Entra ID groups.';
                    }
                    return 'Sync complete. No new users found.';
                },
                error: 'Sync failed'
            }
        );
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'it_admin': return <Shield className="w-4 h-4" />;
            case 'it_user': return <UserCog className="w-4 h-4" />;
            case 'viewer': return <Eye className="w-4 h-4" />;
            default: return null;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'it_admin': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'it_user': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'viewer': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'it_admin': return 'IT Admin';
            case 'it_user': return 'IT User';
            case 'viewer': return 'Viewer';
            default: return role;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
                    <p className="text-muted-foreground mt-1">Manage dashboard administrators and their permissions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted transition-colors rounded-lg"
                    >
                        <Users className="w-4 h-4" />
                        Connect M365 Groups
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Admin
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="all">All Roles</option>
                    <option value="it_admin">IT Admin</option>
                    <option value="it_user">IT User</option>
                    <option value="viewer">Viewer</option>
                </select>
            </div>

            {/* Admin Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Username</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Email</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Role</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Source</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Last Login</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAdmins.map((admin) => (
                            <tr key={admin.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-semibold">{admin.username.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <span className="font-medium text-foreground">{admin.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{admin.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(admin.role)}`}>
                                        {getRoleIcon(admin.role)}
                                        {getRoleLabel(admin.role)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {admin.source === 'synced' ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                            <RefreshCw className="w-3 h-3" />
                                            Synced
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                            Manual
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${admin.status === 'active'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        {admin.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground text-sm">
                                    {admin.lastLogin ? format(new Date(admin.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAdmin(admin);
                                                setShowEditModal(true);
                                            }}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                                            title="Edit admin"
                                        >
                                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedAdmin(admin);
                                                setShowDeleteModal(true);
                                            }}
                                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete admin"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredAdmins.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No admins found</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AdminModal
                isOpen={showCreateModal || showEditModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedAdmin(null);
                }}
                onSave={showCreateModal ? handleCreateAdmin : handleUpdateAdmin}
                admin={selectedAdmin}
                mode={showCreateModal ? 'create' : 'edit'}
            />

            {/* M365 Group Mapping Modal */}
            <GroupMappingModal
                isOpen={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                mappings={groupMappings}
                onSave={(role, mapping) => {
                    updateGroupMapping(role, mapping);
                    toast.success('Group mapping updated');
                }}
                onSync={handleSyncGroups}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-xl w-full max-w-md p-6"
                        >
                            <h3 className="text-xl font-semibold text-foreground mb-4">Delete Admin</h3>
                            <p className="text-muted-foreground mb-6">
                                Are you sure you want to delete <span className="font-semibold text-foreground">{selectedAdmin?.username}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAdmin}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface GroupMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    mappings: M365GroupMapping[];
    onSave: (role: 'it_admin' | 'it_user', mapping: Partial<M365GroupMapping>) => void;
    onSync: () => void;
}

function GroupMappingModal({ isOpen, onClose, mappings, onSave, onSync }: GroupMappingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">Connect M365 Groups</h3>
                        <p className="text-sm text-muted-foreground mt-1">Map Entra ID groups to dashboard roles</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* IT Admin Mapping */}
                    <div className="p-4 border border-border rounded-lg bg-card/50">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-5 h-5 text-red-500" />
                            <h4 className="font-medium">IT Admin Group</h4>
                        </div>
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Group Object ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    value={mappings.find(m => m.role === 'it_admin')?.groupId || ''}
                                    onChange={(e) => onSave('it_admin', { groupId: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Auto-Sync Membership</label>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300"
                                    checked={mappings.find(m => m.role === 'it_admin')?.autoSync}
                                    onChange={(e) => onSave('it_admin', { autoSync: e.target.checked })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* IT User Mapping */}
                    <div className="p-4 border border-border rounded-lg bg-card/50">
                        <div className="flex items-center gap-3 mb-4">
                            <UserCog className="w-5 h-5 text-blue-500" />
                            <h4 className="font-medium">IT User (Ops) Group</h4>
                        </div>
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Group Object ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    value={mappings.find(m => m.role === 'it_user')?.groupId || ''}
                                    onChange={(e) => onSave('it_user', { groupId: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Auto-Sync Membership</label>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300"
                                    checked={mappings.find(m => m.role === 'it_user')?.autoSync}
                                    onChange={(e) => onSave('it_user', { autoSync: e.target.checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">Sync runs every 1 hour (simulated)</p>
                        <button
                            onClick={() => { onSync(); onClose(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Save & Sync Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Admin Modal Component
interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (admin: any) => void;
    admin: DashboardAdmin | null;
    mode: 'create' | 'edit';
}

function AdminModal({ isOpen, onClose, onSave, admin, mode }: AdminModalProps) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'it_user' as 'it_admin' | 'it_user' | 'viewer',
        status: 'active' as 'active' | 'inactive',
        permissions: {
            dashboard: true,
            users: false,
            assets: false,
            software: false,
            onboarding: false,
            offboarding: false,
            network: false,
            sites: false,
            proxmox: false,
            patchManagement: false,
            reports: false,
            auditLogs: false,
            settings: false,
        } as PagePermissions,
    });

    useEffect(() => {
        if (admin && mode === 'edit') {
            setFormData({
                username: admin.username,
                email: admin.email,
                role: admin.role,
                status: admin.status,
                permissions: admin.permissions,
            });
        } else {
            // Reset form for create mode
            setFormData({
                username: '',
                email: '',
                role: 'it_user',
                status: 'active',
                permissions: {
                    dashboard: true,
                    users: false,
                    assets: false,
                    software: false,
                    onboarding: false,
                    offboarding: false,
                    network: false,
                    sites: false,
                    proxmox: false,
                    patchManagement: false,
                    reports: false,
                    auditLogs: false,
                    settings: false,
                },
            });
        }
    }, [admin, mode, isOpen]);

    // Update permissions when role changes to pre-fill common defaults
    const handleRoleChange = (newRole: 'it_admin' | 'it_user' | 'viewer') => {
        setFormData(prev => {
            const isFullAdmin = newRole === 'it_admin';
            return {
                ...prev,
                role: newRole,
                permissions: {
                    dashboard: true,
                    users: true, // Both can usually access users
                    assets: true, // Both can usually access assets
                    software: isFullAdmin,
                    onboarding: isFullAdmin, // Specific request: View/Edit for limited admin (we'll set false by default, user checks it)
                    offboarding: isFullAdmin,
                    network: true, // Specific request: View only (we give access, View Only handled by page)
                    sites: isFullAdmin,
                    proxmox: isFullAdmin,
                    patchManagement: isFullAdmin,
                    reports: true, // Specific request: View only
                    auditLogs: isFullAdmin,
                    settings: isFullAdmin,
                }
            };
        });
    };

    const handlePermissionToggle = (key: keyof PagePermissions) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key],
            },
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const permissionGroups = [
        { key: 'dashboard' as keyof PagePermissions, label: 'Dashboard' },
        { key: 'users' as keyof PagePermissions, label: 'Users' },
        { key: 'assets' as keyof PagePermissions, label: 'Assets' },
        { key: 'software' as keyof PagePermissions, label: 'Software' },
        { key: 'onboarding' as keyof PagePermissions, label: 'Onboarding' },
        { key: 'offboarding' as keyof PagePermissions, label: 'Offboarding' },
        { key: 'network' as keyof PagePermissions, label: 'Network' },
        { key: 'sites' as keyof PagePermissions, label: 'Sites' },
        { key: 'proxmox' as keyof PagePermissions, label: 'Proxmox' },
        { key: 'patchManagement' as keyof PagePermissions, label: 'Patch Management' },
        { key: 'reports' as keyof PagePermissions, label: 'Reports' },
        { key: 'auditLogs' as keyof PagePermissions, label: 'Audit Logs' },
        { key: 'settings' as keyof PagePermissions, label: 'Settings' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <form onSubmit={handleSubmit}>
                            {/* Header */}
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-foreground">
                                    {mode === 'create' ? 'Create Dashboard Admin' : 'Edit Dashboard Admin'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            User must exist in Microsoft 365. Password is managed via Entra ID.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => handleRoleChange(e.target.value as any)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="it_admin">IT Admin (Full Control)</option>
                                            <option value="it_user">IT User (Limited)</option>
                                            {/* <option value="viewer">Viewer</option> */ /* Hiding viewer to simplify based on user request */}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Page Access Control */}
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Page Access Control</h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Select the pages this admin is allowed to access. If no pages are selected, default role-based access applies.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {permissionGroups.map(({ key, label }) => (
                                            <label
                                                key={key}
                                                className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permissions[key]}
                                                        onChange={() => handlePermissionToggle(key)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-5 h-5 border-2 border-border rounded peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-colors">
                                                        {formData.permissions[key] && <Check className="w-3 h-3 text-primary-foreground" />}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium text-foreground">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {mode === 'create' ? 'Create Admin' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
