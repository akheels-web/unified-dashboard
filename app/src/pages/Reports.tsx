import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Laptop, TrendingUp, Download,
  Shield, Key, History,
  CheckCircle2, AlertTriangle, RefreshCw, Search, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useReportStore } from '@/stores/reportStore';
import { toast } from 'sonner';
import { usersApi, assetsApi, dashboardApi } from '@/services/api';
import type { M365User, Asset } from '@/types';
import { format, subDays, isAfter, parseISO } from 'date-fns';

// ── Admin whitelist ─────────────────────────────────────────────────────────
// Only audit events from these accounts appear in the Admin Audit tab.
const ADMIN_WHITELIST = [
  { upn: 'mohammed.akheel@lxt.ai',     name: 'Mohammed Akheel',     initials: 'MA', color: '#6366f1' },
  { upn: 'ibrahim.aly@lxt.ai',         name: 'Ibrahim Aly',         initials: 'IA', color: '#0ea5e9' },
  { upn: 'dilawar.amin@lxt.ai',        name: 'Dilawar Amin',        initials: 'DA', color: '#10b981' },
  { upn: 'youssef.ragab@lxt.ai',       name: 'Youssef Ragab',       initials: 'YR', color: '#f59e0b' },
  { upn: 'absal.abdulhafedh@lxt.ai',   name: 'Absal Abdulhafedh',   initials: 'AA', color: '#ef4444' },
  { upn: 'muhammad.hamdi@lxt.ai',      name: 'Muhammad Hamdi',      initials: 'MH', color: '#8b5cf6' },
  { upn: 'nada.elrayes@lxt.ai',        name: 'Nada El-Rayes',       initials: 'NE', color: '#ec4899' },
  { upn: 'ahmed.amin@lxt.ai',          name: 'Ahmed Amin',          initials: 'AH', color: '#14b8a6' },
];
const ADMIN_UPN_SET = new Set(ADMIN_WHITELIST.map(a => a.upn.toLowerCase()));
const adminByUpn = Object.fromEntries(ADMIN_WHITELIST.map(a => [a.upn.toLowerCase(), a]));
// ────────────────────────────────────────────────────────────────────────────


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
  const [adminSearch, setAdminSearch] = useState('');
  const { theme } = useUIStore();
  const { 
    users, assets, licenses, auditLogs, mfaData, lastUpdated, setData 
  } = useReportStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Theme Constants
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#a0a0a0' : '#64748b';
  const gridColor = isDark ? '#3d3d3d' : '#e2e8f0';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipTextColor = isDark ? '#f1f5f9' : '#0f172a';

  // Fetch Data with Caching
  const fetchData = async (force = false) => {
    // If not forced and data is fresh (within 5 minutes), don't fetch
    if (!force && lastUpdated && (Date.now() - lastUpdated < 300000)) {
      return;
    }

    if (force) setRefreshing(true);
    else if (users.length === 0) setLoading(true);

    try {
      const [usersRes, assetsRes, licensesRes, auditRes, mfaRes] = await Promise.all([
        usersApi.getUsers({}, 1, 999),
        assetsApi.getAssets({}, 1, 999),
        dashboardApi.getLicenses(),
        dashboardApi.getActivity(100),
        dashboardApi.getMfaCoverage()
      ]);

      const newData: any = {};
      if (usersRes.success && usersRes.data) newData.users = usersRes.data.data;
      if (assetsRes.success && assetsRes.data) newData.assets = assetsRes.data.data;
      if (licensesRes.success && Array.isArray(licensesRes.data)) newData.licenses = licensesRes.data;
      if (auditRes.success && Array.isArray(auditRes.data)) newData.auditLogs = auditRes.data;
      if (mfaRes.success) newData.mfaData = mfaRes.data;

      setData(newData);
    } catch (error) {
      console.error("Failed to fetch report data", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregated Metrics (Client-Side)
  const stats = useMemo(() => {
    const thresholdDate = subDays(new Date(), parseInt(dateRange));

    // Inactive Users
    const inactiveUsers = users.filter((u: M365User) => {
      if (!u.lastSignInDateTime) return true;
      return !isAfter(parseISO(u.lastSignInDateTime), thresholdDate);
    });

    // Active Internal Users
    const activeInternalUsers = users.filter((u: M365User) => {
      if (!u.accountEnabled) return false;
      if (u.userPrincipalName?.includes('#EXT#')) return false;
      return true;
    });

    // Department Distribution
    const deptDist = activeInternalUsers.reduce((acc: any, user: M365User) => {
      const dept = user.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDepts = Object.entries(deptDist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10);

    // User Growth
    const userGrowth = activeInternalUsers.reduce((acc: any, user: M365User) => {
      if (!user.createdDateTime) return acc;
      const month = format(parseISO(user.createdDateTime), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userGrowthData = Object.entries(userGrowth)
      .map(([name, value]) => ({ 
        name, 
        value, 
        date: parseISO(activeInternalUsers.find((u: M365User) => format(parseISO(u.createdDateTime!), 'MMM yyyy') === name)?.createdDateTime!) 
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ name, value }) => ({ name, value: value as number }));

    // Device Compliance State
    const compliantDevices = assets.filter((a: Asset) => (a.notes || '').toLowerCase() === 'compliant');
    const nonCompliantDevices = assets.filter((a: Asset) => (a.notes || '').toLowerCase() === 'noncompliant');
    const unknownCompliance = assets.length - compliantDevices.length - nonCompliantDevices.length;

    // OS Distribution
    const osDist = assets.reduce((acc: any, curr: Asset) => {
      const os = curr.category || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // License Cost
    const totalLicenseCost = licenses.reduce((sum: number, lic: any) => sum + (lic.used * 20), 0);
    const potentialSavings = licenses.reduce((sum: number, lic: any) => sum + ((lic.available) * 20), 0);

    return {
      inactiveUsers,
      inactiveCount: inactiveUsers.length,
      activeCount: users.length - inactiveUsers.length,
      mfaStats: [
        { name: 'Enabled', value: mfaData.enabled, color: '#10b981' },
        { name: 'Disabled', value: mfaData.disabled, color: '#ef4444' }
      ],
      mfaPercentage: mfaData.percentage,
      deptDist: topDepts,
      userGrowth: userGrowthData,
      compliance: [
        { name: 'Compliant', value: compliantDevices.length, color: '#10b981' },
        { name: 'Non-Compliant', value: nonCompliantDevices.length, color: '#ef4444' },
        { name: 'Unknown', value: unknownCompliance, color: '#64748b' }
      ],
      osDistribution: Object.entries(osDist).map(([name, value]) => ({ name, value: value as number })),
      totalLicenseCost,
      potentialSavings
    };
  }, [users, assets, licenses, dateRange, mfaData]);

  // Filtered admin-only audit logs (also computed here so CSV export can use them)
  const filteredAdminLogs = useMemo(() =>
    auditLogs.filter(log => {
      const upn = ((log as any).userPrincipalName || '').toLowerCase();
      if (upn) return ADMIN_UPN_SET.has(upn);
      return ADMIN_WHITELIST.some(a =>
        log.user?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])
      );
    })
  , [auditLogs]);

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
      csvContent = "Time,Admin,Email,Action,Target,Status\n";
      filteredAdminLogs.forEach((l: any) => {
        csvContent += `"${l.timestamp}","${l.user}","${l.userPrincipalName || ''}","${l.action}","${l.target}","${l.status}"\n`;
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

      case 'admin': {
        // Secondary client-side filter — backend already filters, this is a safety net
        const adminFiltered = auditLogs.filter(log => {
          const upn = ((log as any).userPrincipalName || '').toLowerCase();
          // Match by UPN if available, otherwise by display name substring
          if (upn) return ADMIN_UPN_SET.has(upn);
          return ADMIN_WHITELIST.some(a => log.user?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]));
        });

        // Apply search
        const searchLower = adminSearch.toLowerCase();
        const searchFiltered = searchLower
          ? adminFiltered.filter(log =>
              log.user?.toLowerCase().includes(searchLower) ||
              log.action?.toLowerCase().includes(searchLower) ||
              log.target?.toLowerCase().includes(searchLower)
            )
          : adminFiltered;

        // Per-admin activity counts
        const adminCounts = ADMIN_WHITELIST.map(admin => ({
          ...admin,
          count: adminFiltered.filter(log => {
            const upn = ((log as any).userPrincipalName || '').toLowerCase();
            return upn === admin.upn || log.user?.toLowerCase().includes(admin.name.toLowerCase().split(' ')[0]);
          }).length
        })).filter(a => a.count > 0);

        return (
          <div className="space-y-4">
            {/* Header + search */}
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  IT Admin Activity
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing audit log entries for {ADMIN_WHITELIST.length} IT admins only
                  {adminFiltered.length > 0 && ` · ${adminFiltered.length} total actions`}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search admin, action, target…"
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-lg w-52 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Per-admin activity summary pills */}
            {adminCounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {adminCounts.map(admin => (
                  <button
                    key={admin.upn}
                    onClick={() => setAdminSearch(adminSearch === admin.name.split(' ')[0] ? '' : admin.name.split(' ')[0])}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      adminSearch === admin.name.split(' ')[0]
                        ? 'border-transparent text-white shadow-md'
                        : 'bg-card border-border hover:border-primary/50'
                    )}
                    style={adminSearch === admin.name.split(' ')[0] ? { backgroundColor: admin.color } : {}}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: admin.color }}
                    >
                      {admin.initials}
                    </span>
                    {admin.name.split(' ').slice(0, 2).join(' ')}
                    <span className="ml-0.5 text-muted-foreground font-normal">({admin.count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Audit log table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-muted-foreground font-medium">Time</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Admin</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Target</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchFiltered.map((log, i) => {
                      const upn = ((log as any).userPrincipalName || '').toLowerCase();
                      const admin = adminByUpn[upn] || ADMIN_WHITELIST.find(a =>
                        log.user?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])
                      );
                      return (
                        <tr key={log.id || i} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="p-4 text-muted-foreground whitespace-nowrap text-xs">
                            {log.timestamp ? format(parseISO(log.timestamp), 'MMM d, h:mm a') : '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                style={{ backgroundColor: admin?.color ?? '#64748b' }}
                              >
                                {admin?.initials ?? log.user?.slice(0, 2).toUpperCase() ?? '??'}
                              </span>
                              <div>
                                <div className="font-medium text-foreground text-xs">{log.user}</div>
                                {upn && <div className="text-[10px] text-muted-foreground">{upn}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate" title={log.target}>
                            {log.target}
                          </td>
                          <td className="p-4">
                            {((log.status as string).toLowerCase() === 'success') ? (
                              <div className="flex items-center text-green-500 gap-1 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Success
                              </div>
                            ) : (
                              <div className="flex items-center text-red-500 gap-1 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" /> Failed
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {searchFiltered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-muted-foreground">
                          {adminFiltered.length === 0
                            ? 'No admin activity found. The audit log may still be loading or these admins have no recent actions.'
                            : `No results matching "${adminSearch}"`
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {searchFiltered.length > 0 && (
                <div className="p-3 border-t border-border text-xs text-muted-foreground text-right">
                  {searchFiltered.length} action{searchFiltered.length !== 1 ? 's' : ''} shown
                  {searchLower && ` (filtered from ${adminFiltered.length})`}
                </div>
              )}
            </div>
          </div>
        );
      }

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
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {stats.mfaStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: tooltipBg, 
                          borderColor: tooltipBorder, 
                          borderRadius: '8px', 
                          color: tooltipTextColor,
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          padding: '8px 12px'
                        }}
                        itemStyle={{ color: tooltipTextColor }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend 
                        iconType="circle"
                        verticalAlign="bottom"
                        height={36}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-4">
                    <span className="text-2xl font-bold">{stats.mfaPercentage}%</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Enabled</span>
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
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-4">
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
        <button 
          onClick={() => fetchData(true)} 
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg bg-card"
        >
          <RefreshCw className={cn("w-3 h-3", (loading || refreshing) && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
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
