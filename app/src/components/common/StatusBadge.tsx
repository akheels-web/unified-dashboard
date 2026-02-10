import { cn } from '@/lib/utils';

type StatusType = 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'warning' | 'error' | 'success' | 'info' | 'online' | 'offline' | 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost' | 'adopting' | 'in_progress' | 'cancelled' | 'upcoming' | 'expired';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'Active' },
  inactive: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500', label: 'Inactive' },
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Pending' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'Completed' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'Failed' },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Warning' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'Error' },
  success: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'Success' },
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Info' },
  online: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'Online' },
  offline: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'Offline' },
  available: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500', label: 'Available' },
  assigned: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Assigned' },
  maintenance: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Maintenance' },
  retired: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500', label: 'Retired' },
  lost: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'Lost' },
  adopting: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Adopting' },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', label: 'In Progress' },
  cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500', label: 'Cancelled' },
  upcoming: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Upcoming' },
  expired: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500', label: 'Expired' },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const dotSizeConfig = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export function StatusBadge({ status, text, size = 'md', pulse = false }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.bg,
      config.text,
      sizeConfig[size]
    )}>
      <span className={cn(
        'rounded-full',
        config.dot,
        dotSizeConfig[size],
        pulse && 'animate-pulse'
      )} />
      {text || config.label}
    </span>
  );
}
