import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Wifi, Router, Server,
  XCircle, Loader2,
  Power, Users, Download, Upload,
  Plus, Shield, Globe, Check,
  X
} from 'lucide-react';
import { useNetworkStore } from '@/stores/networkStore';
import { unifiApi } from '@/services/api';
import type { UnifiSite, UnifiDevice } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const deviceTypeIcons: Record<string, React.ElementType> = {
  gateway: Router,
  switch: Server,
  ap: Wifi,
};

export function Network() {
  const { sites, setSites } = useNetworkStore();
  const [devices, setDevices] = useState<UnifiDevice[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [restartingDevice, setRestartingDevice] = useState<string | null>(null);
  const [siteStats, setSiteStats] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirewall, setNewFirewall] = useState({ name: '', ip: '', site: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedSite]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load devices from API
      const [devicesRes] = await Promise.all([
        unifiApi.getDevices(selectedSite === 'all' ? undefined : selectedSite),
      ]);

      if (devicesRes.success) {
        setDevices(devicesRes.data || []);
      }

      // Load stats for first site (mocked for now)
      setSiteStats({
        wanDownload: 245.5,
        wanUpload: 120.2,
        totalClients: sites.reduce((acc: number, site: any) => acc + site.clientCount, 0),
        avgUptime: 99.9
      });

    } catch (error) {
      toast.error('Failed to load network data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async (deviceId: string) => {
    setRestartingDevice(deviceId);
    try {
      const response = await unifiApi.restartDevice(deviceId);
      if (response.success) {
        toast.success('Device restart initiated');
      }
    } catch (error) {
      toast.error('Failed to restart device');
    } finally {
      setRestartingDevice(null);
    }
  };

  const handleAddFirewall = async () => {
    if (!newFirewall.name || !newFirewall.ip || !newFirewall.site) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);
    try {
      // Simulate adding device
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Firewall added successfully');
      setShowAddModal(false);
      setNewFirewall({ name: '', ip: '', site: '' });
      // Re-fetch data to include the new firewall
      const devicesRes = await unifiApi.getDevices(selectedSite === 'all' ? undefined : selectedSite);
      if (devicesRes.success) {
        setDevices(devicesRes.data || []);
      }
    } catch (error) {
      toast.error('Failed to add firewall');
    } finally {
      setIsAdding(false);
    }
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Network Management</h1>
          <p className="text-muted-foreground">Monitor and manage UniFi network devices across all sites</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Firewall
          </button>
        </div>
      </div>

      {/* Owner View / Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
          <div className="flex items-center gap-3 z-10 relative">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Active Sites</p>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10">
            <Globe className="w-24 h-24 text-blue-500" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onlineDevices}</p>
              <p className="text-sm text-muted-foreground">Online Devices</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{offlineDevices}</p>
              <p className="text-sm text-muted-foreground">Offline Devices</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{siteStats?.totalClients || 0}</p>
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Site Filter / Owner Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSite('all')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2',
            selectedSite === 'all'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          )}
        >
          <Shield className="w-4 h-4" />
          Owner View (All)
        </button>
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => setSelectedSite(site.id)}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2',
              selectedSite === site.id
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", site.status === 'online' ? "bg-green-500" : "bg-red-500")} />
            {site.name}
          </button>
        ))}
      </div>

      {/* Network Traffic */}
      {siteStats && (
        <div className="bg-card rounded-xl border border-border p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Router className="w-32 h-32 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Total Network Throughput</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Download className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Download</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{siteStats.wanDownload.toFixed(1)}</p>
                  <span className="text-sm text-muted-foreground">Mbps</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upload</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">{siteStats.wanUpload.toFixed(1)}</p>
                  <span className="text-sm text-muted-foreground">Mbps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Router className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No devices found</p>
            <p>Add a firewall to get started</p>
          </div>
        ) : (
          devices.map((device, index) => {
            const Icon = deviceTypeIcons[device.deviceType] || Server;
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'bg-card rounded-xl border p-5 transition-shadow hover:shadow-lg',
                  device.status === 'online' ? 'border-border' : 'border-red-500/30'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      device.status === 'online' ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        device.status === 'online' ? 'text-green-500' : 'text-red-500'
                      )} />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">{device.model}</p>
                    </div>
                  </div>
                  <StatusBadge status={device.status} size="sm" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="text-foreground">{device.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MAC Address</span>
                    <span className="text-foreground">{device.macAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connected Clients</span>
                    <span className="text-foreground">{device.numClients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="text-foreground">
                      {device.uptime
                        ? `${Math.floor(device.uptime / 86400)}d ${Math.floor((device.uptime % 86400) / 3600)}h`
                        : '-'
                      }
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => handleRestart(device.id)}
                    disabled={restartingDevice === device.id || device.status !== 'online'}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-muted/20 hover:bg-muted text-foreground rounded-lg transition-colors disabled:opacity-50"
                  >
                    {restartingDevice === device.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    Restart Device
                  </button>
                </div>
              </motion.div>
            );
          }))}
      </div>

      {/* Add Firewall Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => !isAdding && setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Add New Firewall</h2>
                  {!isAdding && (
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Device Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Gateway"
                      value={newFirewall.name}
                      onChange={(e) => setNewFirewall({ ...newFirewall, name: e.target.value })}
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">IP Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.1"
                      value={newFirewall.ip}
                      onChange={(e) => setNewFirewall({ ...newFirewall, ip: e.target.value })}
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Site</label>
                    <select
                      value={newFirewall.site}
                      onChange={(e) => setNewFirewall({ ...newFirewall, site: e.target.value })}
                      className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">Select a Site</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    disabled={isAdding}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFirewall}
                    disabled={isAdding}
                    className="flex items-center gap-2 px-6 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-md disabled:opacity-50"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add Firewall
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
