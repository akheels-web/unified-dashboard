import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Laptop, Shield, RefreshCw, TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import { StatsCard } from '@/components/common/StatsCard';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { StatusBadge } from '@/components/common/StatusBadge';
import { dashboardApi } from '@/services/api';
import type { ActivityItem, SystemStatus } from '@/types';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const COLORS = ['#2596be', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [deviceDistribution, setDeviceDistribution] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled so each API call fails independently
      const [statsRes, licensesRes, devicesRes, activityRes, statusRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getLicenses(),
        dashboardApi.getDeviceDistribution(),
        dashboardApi.getActivity(5),
        dashboardApi.getSystemStatus(),
      ]);

      // Handle stats
      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setStats(statsRes.value.data);
      }

      // Handle licenses
      if (licensesRes.status === 'fulfilled' && licensesRes.value.success && licensesRes.value.data) {
        setLicenses(licensesRes.value.data);
      }

      // Handle device distribution
      if (devicesRes.status === 'fulfilled' && devicesRes.value.success && devicesRes.value.data) {
        setDeviceDistribution(devicesRes.value.data);
      }

      // Handle activity (audit logs)
      if (activityRes.status === 'fulfilled' && activityRes.value.success && activityRes.value.data) {
        setActivities(activityRes.value.data);
      } else {
        console.warn('[Dashboard] Audit logs failed, using empty array');
        setActivities([]);
      }

      // Handle system status
      if (statusRes.status === 'fulfilled' && statusRes.value.success && statusRes.value.data) {
        setSystemStatus(statusRes.value.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    toast.promise(loadDashboardData(), {
      loading: 'Syncing dashboard data...',
      success: 'Dashboard updated!',
      error: 'Failed to sync',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of your IT operations</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
        >
          <RefreshCw className="w-4 h-4" />
          Sync
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/users')}
        >
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || '0'}
            subtitle="M365 accounts"
            icon={Users}
            color="blue"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/assets')}
        >
          <StatsCard
            title="Active Devices"
            value={stats?.activeDevices?.toLocaleString() || '0'}
            subtitle="Managed by Intune"
            icon={Laptop}
            color="green"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/groups')}
        >
          <StatsCard
            title="Groups"
            value={stats?.totalGroups?.toLocaleString() || '0'}
            subtitle="Security & M365"
            icon={Shield}
            color="purple"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Licenses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.licensesUsed?.toLocaleString() || '0'} / {stats?.licensesTotal?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.licensesAvailable?.toLocaleString() || '0'} available
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Service Health Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Service Health Monitor</h3>
            <p className="text-sm text-muted-foreground">Real-time status of critical services</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Microsoft 365 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.microsoft.overall === 'operational' ? 'bg-green-500' : systemStatus?.microsoft.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-foreground font-medium">Microsoft 365</span>
              </div>
              <StatusBadge
                status={systemStatus?.microsoft.overall === 'operational' ? 'online' : systemStatus?.microsoft.overall === 'degraded' ? 'warning' : 'offline'}
                size="sm"
              />
            </div>
            <div className="pl-6 space-y-2">
              {systemStatus?.microsoft.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{service.name}</span>
                  <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Atlassian */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.atlassian?.overall === 'operational' ? 'bg-green-500' : systemStatus?.atlassian?.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-foreground font-medium">Atlassian</span>
              </div>
              <StatusBadge
                status={systemStatus?.atlassian?.overall === 'operational' ? 'online' : systemStatus?.atlassian?.overall === 'degraded' ? 'warning' : 'offline'}
                size="sm"
              />
            </div>
            <div className="pl-6 space-y-2">
              {systemStatus?.atlassian?.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{service.name}</span>
                  <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* UniFi Network */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.unifi.overall === 'operational' ? 'bg-green-500' : systemStatus?.unifi.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-foreground font-medium">UniFi Network</span>
              </div>
              <StatusBadge
                status={systemStatus?.unifi.overall === 'operational' ? 'online' : systemStatus?.unifi.overall === 'degraded' ? 'warning' : 'offline'}
                size="sm"
              />
            </div>
            <div className="pl-6 space-y-2">
              {systemStatus?.unifi.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{service.name}</span>
                  <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h4 className="text-lg font-semibold text-foreground mb-4">License Utilization</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={licenses.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="used" fill="#2596be" name="Used" />
                <Bar dataKey="available" fill="#10b981" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Device Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h4 className="text-lg font-semibold text-foreground mb-4">Device Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest audit logs from Microsoft 365</p>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <ActivityFeed activities={activities} maxItems={5} />
      </motion.div>
    </div>
  );
}
