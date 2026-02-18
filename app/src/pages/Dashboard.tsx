import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Laptop, Shield, RefreshCw, TrendingUp, TrendingDown, ArrowRight,
  AlertTriangle, CheckCircle, Smartphone, Lock, Mail, UserCheck
} from 'lucide-react';
import { StatsCard } from '@/components/common/StatsCard';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { StatusBadge } from '@/components/common/StatusBadge';
import { QuoteOfTheDay } from '@/components/common/QuoteOfTheDay';
import { ITTeamSection } from '@/components/dashboard/ITTeamSection';
import { dashboardApi } from '@/services/api';
import type { ActivityItem, SystemStatus, SecuritySummary, DeviceHealth, IdentityHygiene } from '@/types';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { SecurityDrillDownModal } from '@/components/dashboard/SecurityDrillDownModal';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth | null>(null);
  const [identityHygiene, setIdentityHygiene] = useState<IdentityHygiene | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Drill Down State
  const [drillDownType, setDrillDownType] = useState<'alerts' | 'risky-users' | 'non-compliant' | 'external-forwarding' | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const [statsRes, securityRes, deviceRes, hygieneRes, licensesRes, activityRes, statusRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getSecuritySummary(),
        dashboardApi.getDeviceHealth(),
        dashboardApi.getIdentityHygiene(),
        dashboardApi.getLicenses(),
        dashboardApi.getActivity(5),
        dashboardApi.getSystemStatus(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) setStats(statsRes.value.data);
      if (securityRes.status === 'fulfilled' && securityRes.value.success) setSecuritySummary(securityRes.value.data);
      if (deviceRes.status === 'fulfilled' && deviceRes.value.success) setDeviceHealth(deviceRes.value.data);
      if (hygieneRes.status === 'fulfilled' && hygieneRes.value.success) setIdentityHygiene(hygieneRes.value.data);
      if (licensesRes.status === 'fulfilled' && licensesRes.value.success) setLicenses(licensesRes.value.data);
      if (activityRes.status === 'fulfilled' && activityRes.value.success) setActivities(activityRes.value.data);
      if (statusRes.status === 'fulfilled' && statusRes.value.success) setSystemStatus(statusRes.value.data);

    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    toast.promise(loadDashboardData(), {
      loading: 'Syncing security data...',
      success: 'Dashboard updated!',
      error: 'Failed to sync',
    });
  };

  // Sort licenses by percentage used (descending), then take top 8
  const displayedLicenses = [...licenses]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);

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
      <SecurityDrillDownModal type={drillDownType} onClose={() => setDrillDownType(null)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Command Center</h1>
          <p className="text-muted-foreground">Real-time security posture and operational health</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
        >
          <RefreshCw className="w-4 h-4" />
          Sync
        </button>
      </div>

      <QuoteOfTheDay />

      {/* 1. ATTENTION REQUIRED (Morning Check) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* High Severity Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div
            onClick={() => setDrillDownType('alerts')}
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 relative overflow-hidden cursor-pointer hover:bg-destructive/15 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-destructive font-medium mb-1">Attention Required</p>
                <h3 className="text-3xl font-bold text-foreground">{securitySummary?.current.high_security_alerts || 0}</h3>
                <p className="text-sm text-muted-foreground mt-1">High Severity Alerts</p>
              </div>
              <div className="p-2 bg-destructive/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <SecurityDrillDownModal type={drillDownType} onClose={() => setDrillDownType(null)} />
          </div>
        </motion.div>

        {/* Outdated Builds */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-destructive font-medium">Outdated Builds</span>
            </div>
            <span className="font-bold text-destructive">{deviceHealth?.outdated_builds_count || 0}</span>
          </div>
        </motion.div>
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-xl border border-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">License Utilization</h4>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">Top 8 by Usage</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedLicenses} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="used"
                  fill="hsl(var(--primary))"
                  name="Used"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="available"
                  fill="hsl(var(--muted))"
                  name="Available"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* IT Team Section */}
        <ITTeamSection />
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
