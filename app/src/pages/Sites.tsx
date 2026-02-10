import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Plus, MapPin, Server, Users,
    MoreVertical, Edit, Trash2, X, Search,
    Power, Wifi, Shield
} from 'lucide-react';
import { useNetworkStore } from '@/stores/networkStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UnifiSite } from '@/types';

export function Sites() {
    const { sites, addSite, updateSite, deleteSite } = useNetworkStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSite, setEditingSite] = useState<UnifiSite | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Partial<UnifiSite>>({
        name: '',
        location: '',
        description: '',
        status: 'online',
        isActive: true,
    });

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = () => {
        if (!formData.name) {
            toast.error('Site name is required');
            return;
        }

        if (editingSite) {
            updateSite(editingSite.id, formData);
            toast.success('Site updated successfully');
        } else {
            const newSite: UnifiSite = {
                ...formData as UnifiSite,
                id: `site_${Math.random().toString(36).substr(2, 9)}`,
                deviceCount: 0,
                clientCount: 0,
                isActive: true,
            };
            addSite(newSite);
            toast.success('Site added successfully');
        }
        closeModal();
    };

    const openAddModal = () => {
        setEditingSite(null);
        setFormData({
            name: '',
            location: '',
            description: '',
            status: 'online',
            isActive: true,
        });
        setShowAddModal(true);
    };

    const openEditModal = (site: UnifiSite) => {
        setEditingSite(site);
        setFormData(site);
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingSite(null);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            deleteSite(id);
            toast.success('Site deleted successfully');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Sites</h1>
                    <p className="text-muted-foreground mt-1">Manage network sites and locations</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Add Site
                </button>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search sites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSites.map((site) => (
                    <motion.div
                        key={site.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">{site.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-3 h-3" />
                                            {site.location || 'No location set'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs px-2 py-1 rounded-full border",
                                        site.isActive
                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                            : "bg-muted text-muted-foreground border-border"
                                    )}>
                                        {site.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <div className="relative group">
                                        <button className="p-1 hover:bg-muted rounded-lg transition-colors">
                                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                            <button
                                                onClick={() => openEditModal(site)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted first:rounded-t-lg"
                                            >
                                                <Edit className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(site.id, site.name)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 last:rounded-b-lg"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-muted/30 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Shield className="w-3 h-3" /> Devices
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{site.deviceCount}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Users className="w-3 h-3" /> Clients
                                    </div>
                                    <p className="text-xl font-bold text-foreground">{site.clientCount}</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        >
                            <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl overflow-hidden">
                                <div className="p-6 border-b border-border flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-foreground">{editingSite ? 'Edit Site' : 'Add New Site'}</h2>
                                    <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Site Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                            placeholder="e.g. New York HQ"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                            placeholder="e.g. New York, USA"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                            placeholder="Site details..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <select
                                            value={formData.isActive ? 'active' : 'inactive'}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                                            className="px-3 py-1 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        >
                                            <option value="active" className="bg-card text-foreground">Active</option>
                                            <option value="inactive" className="bg-card text-foreground">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
                                    <button onClick={closeModal} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                                    <button
                                        onClick={handleSubmit}
                                        className="px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg shadow-md transition-colors"
                                    >
                                        {editingSite ? 'Update Site' : 'Add Site'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
}
