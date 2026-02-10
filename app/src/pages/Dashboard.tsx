import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Laptop, UserPlus, UserMinus,
  Activity, ArrowRight, RefreshCw
} from 'lucide-react';
import { StatsCard } from '@/components/common/StatsCard';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { StatusBadge } from '@/components/common/StatusBadge';
import { dashboardApi } from '@/services/api';
import type { DashboardStats, ActivityItem, SystemStatus, ChartDataPoint } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const COLORS = ['#2596be', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [chartData, setChartData] = useState<{ lifecycle: ChartDataPoint[]; departments: ChartDataPoint[]; assetStatus: ChartDataPoint[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, activityRes, statusRes, chartRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(5),
        dashboardApi.getSystemStatus(),
        dashboardApi.getChartData(),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (activityRes.success && activityRes.data) setActivities(activityRes.data);
      if (statusRes.success && statusRes.data) setSystemStatus(statusRes.data);
      if (chartRes.success) setChartData(chartRes.data);
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
          <p className="text-muted-foreground">Overview of your IT and HR operations</p>
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
            value={stats?.totalUsers.toLocaleString() || '0'}
            subtitle={`${stats?.activeUsers.toLocaleString()} active`}
            trend={stats?.usersTrend}
            trendLabel="vs last month"
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
            title="Active Assets"
            value={stats?.assignedAssets.toLocaleString() || '0'}
            subtitle={`${Math.round(((stats?.assignedAssets || 0) / (stats?.totalAssets || 1)) * 100)}% utilized`}
            trend={stats?.assetsTrend}
            trendLabel="vs last month"
            icon={Laptop}
            color="green"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/onboarding')}
        >
          <StatsCard
            title="Pending Onboarding"
            value={stats?.pendingOnboarding || 0}
            subtitle="3 starting this week"
            icon={UserPlus}
            color="yellow"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/offboarding')}
        >
          <StatsCard
            title="Pending Offboarding"
            value={stats?.pendingOffboarding || 0}
            subtitle="Action needed"
            icon={UserMinus}
            color="red"
          />
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Lifecycle Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">User Lifecycle Activity</h3>
              <p className="text-sm text-muted-foreground">Onboarding vs Offboarding (6 months)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Onboarding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-sm text-muted-foreground">Offboarding</span>
              </div>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.lifecycle || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                <Line
                  type="monotone"
                  dataKey="onboarding"
                  stroke="#2596be"
                  strokeWidth={2}
                  dot={{ fill: '#2596be', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="offboarding"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">System Status</h4>

            {/* Microsoft 365 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${systemStatus?.microsoft.overall === 'operational' ? 'bg-green-500' : systemStatus?.microsoft.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-foreground font-medium">Microsoft 365</span>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={systemStatus?.microsoft.overall === 'operational' ? 'online' : systemStatus?.microsoft.overall === 'degraded' ? 'warning' : 'offline'}
                    size="sm"
                  />
                  {systemStatus?.microsoft.lastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(systemStatus.microsoft.lastSync), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              {/* Microsoft Sub-services */}
              <div className="pl-4 space-y-1">
                {systemStatus?.microsoft.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">{service.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* UniFi Network */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${systemStatus?.unifi.overall === 'operational' ? 'bg-green-500' : systemStatus?.unifi.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-foreground font-medium">UniFi Network</span>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={systemStatus?.unifi.overall === 'operational' ? 'online' : systemStatus?.unifi.overall === 'degraded' ? 'warning' : 'offline'}
                    size="sm"
                  />
                  {systemStatus?.unifi.lastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(systemStatus.unifi.lastSync), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              {/* UniFi Sub-services */}
              <div className="pl-4 space-y-1">
                {systemStatus?.unifi.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">{service.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Department Distribution</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData?.departments || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(chartData?.departments || []).map((_entry, index) => (
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
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">Latest actions across the platform</p>
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/onboarding/new')}
              className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">New Onboarding</p>
                <p className="text-xs text-muted-foreground">Start employee onboarding</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/offboarding/new')}
              className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center group-hover:bg-destructive/30 transition-colors">
                <UserMinus className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-foreground font-medium">New Offboarding</p>
                <p className="text-xs text-muted-foreground">Process employee exit</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/assets')}
              className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <Laptop className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-foreground font-medium">Assign Asset</p>
                <p className="text-xs text-muted-foreground">Assign equipment</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/users')}
              className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted rounded-lg transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-foreground font-medium">View Users</p>
                <p className="text-xs text-muted-foreground">Manage user accounts</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
