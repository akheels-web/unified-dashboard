import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, User,
  AlertTriangle, Info, XCircle,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { auditApi } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/20' },
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/30' },
};

export function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [page, severityFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await auditApi.getLogs(page, pageSize);
      if (response.success && response.data) {
        setLogs(response.data.data);
        setTotal(response.data.total);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await auditApi.export();
      if (response.success && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success('Audit logs exported');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = !severityFilter || log.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Track all platform activities and changes</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Resource</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No audit logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, index) => {
                const config = severityConfig[log.severity as keyof typeof severityConfig] || severityConfig.info;
                const Icon = config.icon;

                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">
                        {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground text-sm">{log.userEmail || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground font-medium text-sm">{log.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">{log.resourceType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full', config.bg)}>
                        <Icon className={cn('w-3 h-3', config.color)} />
                        <span className={cn('text-xs font-medium capitalize', config.color)}>
                          {log.severity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm truncate max-w-xs block">
                        {log.details}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
