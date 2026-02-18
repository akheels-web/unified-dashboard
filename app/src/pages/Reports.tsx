import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Laptop, TrendingUp, Download,
  Shield, Key, History,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { usersApi, assetsApi, dashboardApi } from '@/services/api';
import type { M365User, Asset, ActivityItem } from '@/types';
import { format, subDays, isAfter, parseISO } from 'date-fns';

// Report Types Configuration
const reportTypes = [
  { id: 'overview', name: 'Overview', icon: TrendingUp, description: 'High-level dashboard summary' },
  { id: 'users', name: 'Inactive Users', icon: Users, description: 'Identify unused accounts' },
  { id: 'assets', name: 'Device Health', icon: Laptop, description: 'Compliance and inventory status' },
  { id: 'licenses', name: 'License Usage', icon: Key, description: 'Software utilization & cost' },
  { id: 'admin', name: 'Admin Audit', icon: History, description: 'Recent administrative actions' },
];



export function Reports() {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const { theme } = useUIStore();
  const [loading, setLoading] = useState(true);

  // Raw Data State
  const [users, setUsers] = useState<M365User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<ActivityItem[]>([]);

  // Theme Constants
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#a0a0a0' : '#64748b';
  const gridColor = isDark ? '#3d3d3d' : '#e2e8f0';
  const tooltipBg = isDark ? '#2d2d2d' : '#ffffff';
  const tooltipBorder = isDark ? '#3d3d3d' : '#e2e8f0';

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, assetsRes, licensesRes, auditRes] = await Promise.all([
          usersApi.getUsers({}, 1, 999),
          assetsApi.getAssets({}, 1, 999),
          dashboardApi.getLicenses(),
          dashboardApi.getActivity(100)
        ]);

        if (usersRes.success && usersRes.data) setUsers(usersRes.data.data);
        if (assetsRes.success && assetsRes.data) setAssets(assetsRes.data.data);
        if (licensesRes.success && Array.isArray(licensesRes.data)) setLicenses(licensesRes.data);
        if (auditRes.success && Array.isArray(auditRes.data)) setAuditLogs(auditRes.data);
      } catch (error) {
        console.error("Failed to fetch report data", error);
        toast.error("Failed to load some report data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregated Metrics (Client-Side)
  const stats = useMemo(() => {
    const thresholdDate = subDays(new Date(), parseInt(dateRange));

    // Inactive Users
    const inactiveUsers = users.filter(u => {
      if (!u.lastSignInDateTime) return true; // Never signed in
      return !isAfter(parseISO(u.lastSignInDateTime), thresholdDate);
    });

    // Active Internal Users (LXT & Clickworker) - Single truth source for all reports
    const activeInternalUsers = users.filter(u => {
      if (!u.accountEnabled) return false;
      if (u.userPrincipalName?.includes('#EXT#')) return false;
      const email = (u.userPrincipalName || u.email || '').toLowerCase();
      return email.includes('lxt.ai') || email.includes('clickworker.com') || email.includes('lxt.com');
    });

    // MFA Status (Uses activeInternalUsers)
    const mfaStatsObj = activeInternalUsers.reduce((acc, user) => {
      const status = user.mfaEnabled ? 'Enabled' : 'Disabled';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mfaTotal = activeInternalUsers.length;
    const mfaEnabledCount = mfaStatsObj['Enabled'] || 0;
    const mfaPercentage = mfaTotal > 0 ? Math.round((mfaEnabledCount / mfaTotal) * 100) : 0;

    // Department Distribution (Uses activeInternalUsers)
    const deptDist = activeInternalUsers.reduce((acc, user) => {
      const dept = user.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort departments by count and take top 10
    const topDepts = Object.entries(deptDist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // User Growth (Group by Month created - Uses activeInternalUsers)
    const userGrowth = activeInternalUsers.reduce((acc, user) => {
      if (!user.createdDateTime) return acc;
      const month = format(parseISO(user.createdDateTime), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort chronologically
    const userGrowthData = Object.entries(userGrowth)
      .map(([name, value]) => ({ name, value, date: parseISO(activeInternalUsers.find(u => format(parseISO(u.createdDateTime!), 'MMM yyyy') === name)?.createdDateTime!) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ name, value }) => ({ name, value }));


    // Device Compliance
    const compliantDevices = assets.filter(a => a.notes?.toLowerCase().includes('compliant') && !a.notes?.toLowerCase().includes('non-compliant'));
    const nonCompliantDevices = assets.filter(a => a.notes?.toLowerCase().includes('non-compliant'));
    const unknownCompliance = assets.length - compliantDevices.length - nonCompliantDevices.length;

    // OS Distribution
    const osDist = assets.reduce((acc, curr) => {
      const os = curr.category || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // License Cost
    const totalLicenseCost = licenses.reduce((sum, lic) => sum + (lic.used * 20), 0);
    const potentialSavings = licenses.reduce((sum, lic) => sum + ((lic.available) * 20), 0);

    return {
      inactiveUsers,
      inactiveCount: inactiveUsers.length,
      activeCount: users.length - inactiveUsers.length,
      mfaStats: [
        { name: 'Enabled', value: mfaStatsObj['Enabled'] || 0, color: '#10b981' },
        { name: 'Disabled', value: mfaStatsObj['Disabled'] || 0, color: '#ef4444' }
      ],
      mfaPercentage,
      deptDist: topDepts,
      userGrowth: userGrowthData,
      compliance: [
        { name: 'Compliant', value: compliantDevices.length, color: '#10b981' },
        { name: 'Non-Compliant', value: nonCompliantDevices.length, color: '#ef4444' },
        { name: 'Unknown', value: unknownCompliance, color: '#64748b' }
      ],
      osDistribution: Object.entries(osDist).map(([name, value]) => ({ name, value })),
      totalLicenseCost,
      potentialSavings
    };
  }, [users, assets, licenses, dateRange]);

  const handleExport = () => {
    let csvContent = "";
    let filename = `report_${selectedReport}_${format(new Date(), 'yyyy-MM-dd')}.csv`;

    if (selectedReport === 'users') {
      csvContent = "Display Name,Email,Last Sign In,Department,MFA Status,Status\n";
      stats.inactiveUsers.forEach(u => {
        csvContent += `"${u.displayName}","${u.email}","${u.lastSignInDateTime || 'Never'}","${u.department}","${u.mfaEnabled ? 'Enabled' : 'Disabled'}","Inactive"\n`;
      });
    } else if (selectedReport === 'assets') {
      csvContent = "Asset Name,Model,Serial,Assigned To,Compliance\n";
      assets.forEach(a => {
        csvContent += `"${a.name}","${a.model}","${a.serialNumber}","${a.assignedToName || 'Unassigned'}","${a.notes || 'Unknown'}"\n`;
      });
    } else if (selectedReport === 'licenses') {
      csvContent = "License,Used,Total,Available,Percent Used\n";
      licenses.forEach(l => {
        csvContent += `"${l.name}",${l.used},${l.total},${l.available},${l.percentage}%\n`;
      });
    } else if (selectedReport === 'admin') {
      csvContent = "Time,Admin,Action,Target,Status\n";
      auditLogs.forEach(l => {
        csvContent += `"${l.timestamp}","${l.user}","${l.action}","${l.target}","${l.status}"\n`;
      });
    } else {
      // Default Overview Export
      csvContent = "Metric,Value\n";
      csvContent += `Total Users,${users.length}\n`;
      csvContent += `MFA Enabled Users,${stats.mfaStats[0].value}\n`;
      csvContent += `inactive Users (> ${dateRange}),${stats.inactiveCount}\n`;
      csvContent += `Total Assets,${assets.length}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${filename}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedReport) {
      case 'users':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">Inactive Users ({dateRange})</h3>
                <div className="text-3xl font-bold text-red-500">{stats.inactiveCount}</div>
                <p className="text-xs text-muted-foreground mt-2">Accounts with no login activity</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">Active Users</h3>
                <div className="text-3xl font-bold text-green-500">{stats.activeCount}</div>
                <p className="text-xs text-muted-foreground mt-2">Regularly active accounts</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">Total Users</h3>
                <div className="text-3xl font-bold text-foreground">{users.length}</div>
              </div>
            </div>

            {/* New Charts for Users Tab */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4">Department Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={stats.deptDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis type="number" stroke={axisColor} />
                      <YAxis dataKey="name" type="category" stroke={axisColor} width={100} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4">User Growth Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={stats.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 12 }} />
                      <YAxis stroke={axisColor} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold">Inactive Account List</h3>
                <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded">Action Required</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Last Login</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.inactiveUsers.slice(0, 50).map((user) => (
                      <tr key={user.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-4 font-medium">{user.displayName}</td>
                        <td className="p-4 text-muted-foreground">{user.email}</td>
                        <td className="p-4 text-red-500">
                          {user.lastSignInDateTime ? format(parseISO(user.lastSignInDateTime), 'MMM d, yyyy') : 'Never'}
                        </td>
                        <td className="p-4 text-muted-foreground">{user.department}</td>
                      </tr>
                    ))}
                    {stats.inactiveUsers.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No inactive users found within range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {stats.inactiveUsers.length > 50 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
                  Showing top 50 of {stats.inactiveUsers.length} inactive users. Export to see all.
                </div>
              )}
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Device Compliance</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie
                      data={stats.compliance}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5} dataKey="value"
                    >
                      {stats.compliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">OS Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={stats.osDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" stroke={axisColor} />
                    <YAxis dataKey="name" type="category" stroke={axisColor} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        );

      case 'licenses':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">Estimated Monthly Cost</h3>
                <div className="text-3xl font-bold text-foreground">${stats.totalLicenseCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">Based on active utilization</p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">Potential Savings</h3>
                <div className="text-3xl font-bold text-green-500">${stats.potentialSavings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">Value of unassigned licenses</p>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">License Utilization</h3>
              <div className="space-y-6">
                {licenses.map(lic => (
                  <div key={lic.skuPartNumber}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{lic.name}</span>
                      <span className={cn("text-sm", lic.percentage >= 100 ? 'text-red-500 font-bold' : 'text-muted-foreground')}>
                        {lic.used} / {lic.total} ({lic.percentage}%)
                      </span>
                    </div>
                    <div className="h-3 bg-muted/50 rounded-full overflow-hidden border border-border">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500 shadow-sm",
                          lic.percentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            lic.percentage >= 90 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                              'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        )}
                        style={{ width: `${Math.min(lic.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Recent Administrative Activity</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-muted-foreground font-medium">Time</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Target</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {format(parseISO(log.timestamp), 'MMM d, h:mm a')}
                      </td>
                      <td className="p-4 font-medium">{log.user}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{log.target}</td>
                      <td className="p-4">
                        {log.status === 'success' ? (
                          <div className="flex items-center text-green-500 gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Success
                          </div>
                        ) : (
                          <div className="flex items-center text-red-500 gap-1">
                            <AlertTriangle className="w-4 h-4" /> {log.status}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No recent activity found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      default: // Overview
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-4">System Health Score</h3>
              <div className="flex items-center justify-center p-8">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-muted" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-green-500" strokeDasharray="94, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-bold">94%</span>
                    <span className="text-xs text-muted-foreground">Healthy</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500 w-5 h-5" />
                    <div>
                      <div className="font-medium text-foreground">Inactive Users</div>
                      <div className="text-xs text-muted-foreground">{stats.inactiveCount} accounts need review</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReport('users')} className="text-sm font-medium text-red-500 hover:underline">View</button>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Laptop className="text-blue-500 w-5 h-5" />
                    <div>
                      <div className="font-medium text-foreground">Inventory Count</div>
                      <div className="text-xs text-muted-foreground">{assets.length} devices managed</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReport('assets')} className="text-sm font-medium text-blue-500 hover:underline">View</button>
                </div>
              </div>
            </div>

            {/* MFA Status Chart for Overview */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-4">Security: MFA Status</h3>
              <div className="h-64 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <ResponsiveContainer>
                    <RePieChart>
                      <Pie
                        data={stats.mfaStats}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5} dataKey="value"
                      >
                        {stats.mfaStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                    <span className="text-2xl font-bold">{stats.mfaPercentage}%</span>
                    <span className="text-xs text-muted-foreground">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Real-time system insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const token = await import('@/services/auth').then(m => m.getAccessToken());
                if (!token) throw new Error('No access token');

                const response = await fetch('/api/reports/security-summary', {
                  headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to generate report');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `security_summary_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success('Security report downloaded');
              } catch (error) {
                console.error(error);
                toast.error('Failed to download security report');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-700"
          >
            <Shield className="w-4 h-4" />
            Security Summary PDF
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 py-2">
        <div className="text-sm font-medium text-muted-foreground">Time Range:</div>
        <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-border">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                'px-3 py-1.5 rounded text-sm transition-colors',
                dateRange === range ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Last {range.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all h-full',
                selectedReport === report.id ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-card border-border hover:border-primary/50'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <Icon className={cn('w-6 h-6 mb-2', selectedReport === report.id ? 'text-primary' : 'text-muted-foreground')} />
                <p className={cn('font-medium text-sm', selectedReport === report.id ? 'text-foreground' : 'text-muted-foreground')}>
                  {report.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <motion.div
        key={selectedReport}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}
