import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin, Users,
    Globe, Search, Monitor, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { dashboardApi } from '@/services/api';
import type { UnifiSite } from '@/types';

// Extended type for our aggregated sites
interface AggregatedSite extends UnifiSite {
    userCount: number;
}

export function Sites() {
    const [sites, setSites] = useState<AggregatedSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            setLoading(true);
            const response = await dashboardApi.getSites();
            if (response.success && response.data) {
                setSites(response.data);
            } else {
                toast.error('Failed to load sites');
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
            toast.error('Error loading sites');
        } finally {
            setLoading(false);
        }
    };

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Sites</h1>
                    <p className="text-muted-foreground mt-1">
                        Network sites aggregated from User Profiles ({sites.length} locations found)
                    </p>
                </div>
                {/* 
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground font-medium rounded-lg cursor-not-allowed opacity-70"
                >
                    <Plus className="w-4 h-4" />
                    Auto-Discovered
                </button>
                */}
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-card animate-pulse rounded-xl border border-border" />
                    ))}
                </div>
            ) : (
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
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div className="bg-muted/30 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <Shield className="w-3 h-3" /> Users
                                        </div>
                                        <p className="text-xl font-bold text-foreground">{site.userCount}</p>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <Monitor className="w-3 h-3" /> Devices
                                        </div>
                                        <p className="text-xl font-bold text-foreground">{site.deviceCount}</p>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground mt-4 italic">
                                    {site.description}
                                </p>

                            </div>
                        </motion.div>
                    ))}

                    {!loading && filteredSites.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                            <Globe className="w-12 h-12 mb-4 opacity-20" />
                            <p>No sites found matching your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div >
    );
}
