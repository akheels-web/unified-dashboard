import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Laptop, TrendingUp, Download,
  FileText, Shield, Key, History,
  CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';

const reportTypes = [
  { id: 'users', name: 'User Activity', icon: Users, description: 'User logins, activity, and status changes' },
  { id: 'assets', name: 'Asset Utilization', icon: Laptop, description: 'Asset assignments and utilization rates' },
  { id: 'lifecycle', name: 'Lifecycle Summary', icon: TrendingUp, description: 'Onboarding and offboarding trends' },
  { id: 'compliance', name: 'Compliance Report', icon: Shield, description: 'Security and device compliance metrics' },
  { id: 'licenses', name: 'Software Licenses', icon: Key, description: 'License usage and cost analysis' },
  { id: 'signins', name: 'Sign-in Logs', icon: FileText, description: 'Entra ID sign-in activity and failures' },
  { id: 'admin', name: 'Admin Activity', icon: History, description: 'Audit log of administrator actions' },
];

const mockData = {
  userActivity: [
    { name: 'Mon', logins: 245, active: 198 },
    { name: 'Tue', logins: 267, active: 210 },
    { name: 'Wed', logins: 289, active: 225 },
    { name: 'Thu', logins: 256, active: 205 },
    { name: 'Fri', logins: 234, active: 189 },
  ],
  assetUtilization: [
    { name: 'Laptops', assigned: 245, available: 15 },
    { name: 'Desktops', assigned: 89, available: 5 },
    { name: 'Phones', assigned: 312, available: 8 },
    { name: 'Monitors', assigned: 156, available: 12 },
  ],
  departmentDistribution: [
    { name: 'Engineering', value: 156 },
    { name: 'Sales', value: 89 },
    { name: 'Marketing', value: 45 },
    { name: 'HR', value: 12 },
    { name: 'IT', value: 28 },
  ],
  lifecycleTrends: [
    { month: 'Aug', onboarding: 12, offboarding: 8 },
    { month: 'Sep', onboarding: 15, offboarding: 6 },
    { month: 'Oct', onboarding: 18, offboarding: 10 },
    { month: 'Nov', onboarding: 14, offboarding: 7 },
    { month: 'Dec', onboarding: 22, offboarding: 12 },
    { month: 'Jan', onboarding: 16, offboarding: 9 },
  ],
  compliance: [
    { name: 'Compliant', value: 450, color: '#22c55e' },
    { name: 'Non-Compliant', value: 23, color: '#ef4444' },
    { name: 'Grace Period', value: 12, color: '#eab308' },
    { name: 'Unknown', value: 5, color: '#64748b' },
  ],
  licenses: [
    { name: 'Adobe CC', total: 50, assigned: 48, cost: 2400 },
    { name: 'Microsoft 365', total: 500, assigned: 485, cost: 12500 },
    { name: 'JetBrains', total: 20, assigned: 15, cost: 3000 },
    { name: 'Slack', total: 500, assigned: 490, cost: 4000 },
    { name: 'Zoom', total: 100, assigned: 85, cost: 1500 },
  ],
  signinLogs: [
    { id: 1, user: 'david.kim@company.com', app: 'Office 365', status: 'Success', ip: '192.168.1.50', time: '10:30 AM' },
    { id: 2, user: 'sarah.jones@company.com', app: 'Salesforce', status: 'Success', ip: '192.168.1.51', time: '10:32 AM' },
    { id: 3, user: 'mike.smith@company.com', app: 'VPN', status: 'Failure', ip: '203.0.113.42', time: '10:35 AM' },
    { id: 4, user: 'david.kim@company.com', app: 'Slack', status: 'Success', ip: '192.168.1.50', time: '10:40 AM' },
    { id: 5, user: 'admin@company.com', app: 'Azure Portal', status: 'Success', ip: '192.168.1.10', time: '10:45 AM' },
  ],
  adminActivity: [
    { id: 1, admin: 'Akheel (IT Admin)', action: 'Created User', target: 'John Doe', time: '2 mins ago' },
    { id: 2, admin: 'Sarah (HR Admin)', action: 'Updated Policy', target: 'Leave Policy', time: '15 mins ago' },
    { id: 3, admin: 'Akheel (IT Admin)', action: 'Assigned Asset', target: 'MacBook Pro #42', time: '1 hour ago' },
    { id: 4, admin: 'System', action: 'Backup Completed', target: 'Daily Backup', time: '2 hours ago' },
    { id: 5, admin: 'Akheel (IT Admin)', action: 'Modified Role', target: 'Jane Smith', time: '3 hours ago' },
  ]
};

const COLORS = ['#2596be', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Reports() {
  const [selectedReport, setSelectedReport] = useState('users');
  const [dateRange, setDateRange] = useState('30d');
  const { theme } = useUIStore();

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#a0a0a0' : '#64748b';
  const gridColor = isDark ? '#3d3d3d' : '#e2e8f0';
  const tooltipBg = isDark ? '#2d2d2d' : '#ffffff';
  const tooltipBorder = isDark ? '#3d3d3d' : '#e2e8f0';

  const handleExport = () => {
    // Determine data/columns based on selected report (mock implementation)
    let csvContent = "";
    let filename = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (selectedReport === 'signins') {
      csvContent = "User,Application,Status,IP Address,Time\n";
      mockData.signinLogs.forEach(row => {
        csvContent += `${row.user},${row.app},${row.status},${row.ip},${row.time}\n`;
      });
    } else if (selectedReport === 'licenses') {
      csvContent = "Software,Total Licenses,Assigned,Cost\n";
      mockData.licenses.forEach(row => {
        csvContent += `${row.name},${row.total},${row.assigned},${row.cost}\n`;
      });
    } else {
      csvContent = "Date,Metric,Value\n";
      csvContent += "2024-02-01,Sample Metric,100\n"; // Mock fallback
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${filename} successfully`);
    }
  };

  const renderContent = () => {
    switch (selectedReport) {
      case 'compliance':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Device Compliance Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={mockData.compliance}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockData.compliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Compliance Actions</h3>
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Non-Compliant Devices</div>
                    <div className="text-sm text-red-500">23 devices require attention</div>
                  </div>
                  <button className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm">View Devices</button>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Grace Period Expiring</div>
                    <div className="text-sm text-yellow-600">12 devices expiring soon</div>
                  </div>
                  <button className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm">Review</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'licenses':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Software License Usage</h3>
            <div className="mb-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.licenses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" stroke={axisColor} />
                  <YAxis dataKey="name" type="category" stroke={axisColor} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                  <Bar dataKey="assigned" stackId="a" fill="#2596be" name="Assigned" />
                  <Bar dataKey="total" stackId="a" fill="#3d3d3d" name="Total Capacity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-medium text-muted-foreground">Software</th>
                    <th className="text-left py-3 font-medium text-muted-foreground">Assigned / Total</th>
                    <th className="text-left py-3 font-medium text-muted-foreground">Utilization</th>
                    <th className="text-left py-3 font-medium text-muted-foreground">Monthly Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {mockData.licenses.map((lic, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 font-medium text-foreground">{lic.name}</td>
                      <td className="py-3 text-muted-foreground">{lic.assigned} / {lic.total}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", (lic.assigned / lic.total) > 0.9 ? 'bg-red-500' : 'bg-green-500')}
                              style={{ width: `${(lic.assigned / lic.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round((lic.assigned / lic.total) * 100)}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-foreground">${lic.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case 'signins':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Sign-in Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Application</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">IP Address</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockData.signinLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-6 py-3">
                        {log.status === 'Success' ? (
                          <span className="inline-flex items-center gap-1.5 text-green-500 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
                            <XCircle className="w-4 h-4" /> Failure
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-foreground">{log.user}</td>
                      <td className="px-6 py-3 text-muted-foreground">{log.app}</td>
                      <td className="px-6 py-3 font-mono text-muted-foreground">{log.ip}</td>
                      <td className="px-6 py-3 text-muted-foreground">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      case 'admin':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Admin Activity</h3>
            <div className="space-y-6">
              {mockData.adminActivity.map((activity, i) => (
                <div key={i} className="flex relative pb-6 last:pb-0">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-2.5 last:hidden" />
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary flex items-center justify-center z-10 mr-4 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.admin} <span className="text-muted-foreground font-normal">performed</span> {activity.action}
                    </p>
                    <p className="text-sm text-foreground mt-0.5">
                      Target: <span className="font-medium bg-muted px-1.5 py-0.5 rounded">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">User Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={axisColor} />
                    <YAxis stroke={axisColor} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Bar dataKey="logins" fill="#2596be" />
                    <Bar dataKey="active" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Department Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={mockData.departmentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockData.departmentDistribution.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Lifecycle Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Lifecycle Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockData.lifecycleTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" stroke={axisColor} />
                    <YAxis stroke={axisColor} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Line type="monotone" dataKey="onboarding" stroke="#2596be" strokeWidth={2} />
                    <Line type="monotone" dataKey="offboarding" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Asset Utilization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Asset Utilization</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData.assetUtilization} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis type="number" stroke={axisColor} />
                    <YAxis dataKey="name" type="category" stroke={axisColor} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#000',
                      }}
                    />
                    <Bar dataKey="assigned" stackId="a" fill="#2596be" />
                    <Bar dataKey="available" stackId="a" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and export detailed reports</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all h-full',
                selectedReport === report.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border hover:border-muted-foreground/50'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <Icon className={cn(
                  'w-6 h-6 mb-2',
                  selectedReport === report.id ? 'text-primary' : 'text-muted-foreground'
                )} />
                <p className={cn(
                  'font-medium text-sm',
                  selectedReport === report.id ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {report.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                'px-3 py-1.5 rounded text-sm transition-colors',
                dateRange === range
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Content */}
      {renderContent()}
    </div>
  );
}

