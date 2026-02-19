import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Users,
  Laptop,
  Activity,
  Server,
  Ghost,
  Lock,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardApi } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SecurityDrillDownModal } from '@/components/dashboard/SecurityDrillDownModal';
import { ITTeamSection } from '@/components/dashboard/ITTeamSection';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { StatusBadge } from '@/components/common/StatusBadge';

// Helper for rendering trends
const renderTrend = (value: number, inverse: boolean = false) => {
  if (value === undefined || value === null || value === 0) return null;
  const isPositive = value > 0;
  // For risk metrics (inverse=true), positive trend (increase) is BAD (Red). Negative trend (decrease) is GOOD (Green).
  // For good metrics (inverse=false), positive trend (increase) is GOOD (Green). Negative trend (decrease) is BAD (Red).
  const isGood = inverse ? !isPositive : isPositive;
  const color = isGood ? 'text-emerald-500' : 'text-red-500';
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className={`flex items-center text-xs font-medium ${color} bg-white/80 px-1.5 py-0.5 rounded-full shadow-sm`}>
      <Icon className="w-3 h-3 mr-0.5" />
      {Math.abs(value)} since yesterday
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isRiskyUsersModalOpen, setIsRiskyUsersModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isExternalForwardingModalOpen, setIsExternalForwardingModalOpen] = useState(false);

  const [securitySummary, setSecuritySummary] = useState<any>(null);
  const [deviceHealth, setDeviceHealth] = useState<any>(null);
  const [identityHygiene, setIdentityHygiene] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Fetch data on mount and interval
  useEffect(() => {
    const fetchData = async () => {
      try {

        const [
          statsRes,
          securityRes,
          deviceRes,
          hygieneRes,
          licensesRes,
          activityRes,
          statusRes
        ] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getSecuritySummary(),
          dashboardApi.getDeviceHealth(),
          dashboardApi.getIdentityHygiene(),
          dashboardApi.getLicenses(),
          dashboardApi.getActivity(5),
          dashboardApi.getSystemStatus()
        ]);

        if (securityRes) setSecuritySummary(securityRes.data);
        if (deviceRes) setDeviceHealth(deviceRes.data);
        if (hygieneRes) setIdentityHygiene(hygieneRes.data);
        if (licensesRes) setLicenses(licensesRes.data || []);
        if (activityRes) setActivities(activityRes.data || []);
        if (statusRes) setSystemStatus(statusRes.data);
      } catch (error) {
        // console.error('Failed to fetch dashboard data', error); 
        // Silent error for now to avoid console spam in dev without backend
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  // Safe access to data
  const current = securitySummary?.current;
  const trends = securitySummary?.trends;

  // Calculate License Waste (Unused Licenses)
  const unusedLicenses = licenses.filter(lic => lic.available > 0).reduce((sum, lic) => sum + lic.available, 0);

  // Sort licenses by percentage used (descending), then take top 8
  const displayedLicenses = [...licenses]
    .sort((a, b) => {
      const aUsage = a.total > 0 ? (a.used / a.total) : 0;
      const bUsage = b.total > 0 ? (b.used / b.total) : 0;
      return bUsage - aUsage;
    })
    .slice(0, 8);

  const activeModal = isSecurityModalOpen ? 'alerts' : isRiskyUsersModalOpen ? 'risky-users' : isDeviceModalOpen ? 'non-compliant' : isExternalForwardingModalOpen ? 'external-forwarding' : null;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 1. Trigger Backend Sync
      await dashboardApi.syncDashboard();

      // 2. Fetch fresh data
      // We manually call the fetch logic again instead of full reload for better UX
      /* 
         Note: In a real app we might want to refactor the useEffect fetchData into a 
         callback usable here to avoid code duplication. 
         For now, a window reload is the most robust way to ensure all states (stores, caches) 
         are fresh if they rely on mount. 
         
         However, let's try to just reload the page after sync for simplicity and robustness.
      */
      window.location.reload();
    } catch (error) {
      console.error("Sync failed", error);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <SecurityDrillDownModal type={activeModal} onClose={() => {
        setIsSecurityModalOpen(false);
        setIsRiskyUsersModalOpen(false);
        setIsDeviceModalOpen(false);
        setIsExternalForwardingModalOpen(false);
      }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time threat monitoring and operational health</p>
        </div>
        <div className="flex items-center gap-3">
          {current?.timestamp && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-xs font-medium text-muted-foreground border border-border">
              <Clock className="w-3.5 h-3.5" />
              Last synced: {new Date(current.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* 1. SECURITY RISK SECTION (Red/Orange) */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/90">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Security Risk Signals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* High Sev Alerts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 relative overflow-hidden h-full cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setIsSecurityModalOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                {renderTrend(trends?.high_security_alerts || 0, true)}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{current?.high_security_alerts || 0}</h3>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">High Severity Alerts</p>
                <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
              </div>
            </div>
          </motion.div>

          {/* High Risk Users */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div
              className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-4 relative overflow-hidden h-full cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setIsRiskyUsersModalOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                {renderTrend(trends?.high_risk_users || 0, true)}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{current?.high_risk_users || 0}</h3>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">High Risk Users</p>
                <p className="text-xs text-muted-foreground mt-1">Identity compromise detected</p>
              </div>
            </div>
          </motion.div>

          {/* Privileged Accounts Without MFA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 relative overflow-hidden h-full group">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{current?.privileged_no_mfa || 0}</h3>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Admins without MFA</p>
                <p className="text-xs text-muted-foreground mt-1">Critical vulnerability</p>
              </div>
            </div>
          </motion.div>

          {/* Data Exfiltration (External Forwarding) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div
              className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-4 relative overflow-hidden h-full cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setIsExternalForwardingModalOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{identityHygiene?.external_forwarding_count || 0}</h3>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">External Forwarding</p>
                <p className="text-xs text-muted-foreground mt-1">Potential data leak</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. OPERATIONAL HEALTH SECTION (Blue/Green) */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground/90">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Operational Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Secure Score */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 relative overflow-hidden h-full group">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                {renderTrend(trends?.secure_score || 0, false)}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{current?.secure_score ? Math.round(current.secure_score) : 0}%</h3>
                  <span className="text-xs font-medium text-muted-foreground">Microsoft Avg: 58%</span>
                </div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Secure Score</p>
                <p className="text-xs text-muted-foreground mt-1">Target: 80%+</p>
              </div>
            </div>
          </motion.div>

          {/* Non-Compliant Devices */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div
              className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl p-4 relative overflow-hidden h-full cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setIsDeviceModalOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Laptop className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                {/* Mock trend for devices if not available */}
                {trends?.non_compliant_devices !== undefined && renderTrend(trends.non_compliant_devices, true)}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{deviceHealth?.non_compliant_devices || 0}</h3>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Non-Compliant Devices</p>
                <p className="text-xs text-muted-foreground mt-1">Requires compliance update</p>
              </div>
            </div>
          </motion.div>

          {/* License Waste */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 relative overflow-hidden h-full group transition-all hover:shadow-md cursor-pointer" onClick={() => navigate('/licenses')}>
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Ghost className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{unusedLicenses}</h3>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Unused Licenses</p>
                <p className="text-xs text-muted-foreground mt-1">Potential operational processing</p>
              </div>
            </div>
          </motion.div>

          {/* Mailbox Capacity (Mock/Placeholder for now as requested by user interest) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-4 relative overflow-hidden h-full group">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg group-hover:scale-105 transition-transform">
                  <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">0</h3>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Mailbox Capacity &gt; 90%</p>
                <p className="text-xs text-muted-foreground mt-1">Storage limit warning</p>
              </div>
            </div>
          </motion.div>

        </div>
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
              {systemStatus?.microsoft.services.map((service: any) => (
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
              {systemStatus?.atlassian?.services.map((service: any) => (
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
              {systemStatus?.unifi.services.map((service: any) => (
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
