import { motion } from 'framer-motion';
import {
  UserPlus, UserMinus, Laptop, RefreshCw, WifiOff,
  CheckCircle2, AlertTriangle, Info, Settings,
  type LucideIcon
} from 'lucide-react';
import type { ActivityItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  UserMinus,
  Laptop,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Settings,
};

const statusConfig = {
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {displayActivities.map((activity, index) => {
        const ActivityIcon = activity.icon ? iconMap[activity.icon] : statusConfig[activity.status].icon;
        const statusStyle = statusConfig[activity.status];

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              statusStyle.bg
            )}>
              <ActivityIcon className={cn('w-4 h-4', statusStyle.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user}</span>
                {' '}<span className="text-muted-foreground">{activity.action}</span>{' '}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-[#a0a0a0] mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Status indicator */}
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0 mt-2',
              activity.status === 'success' && 'bg-green-500',
              activity.status === 'warning' && 'bg-yellow-500',
              activity.status === 'error' && 'bg-red-500'
            )} />
          </motion.div>
        );
      })}

      {activities.length === 0 && (
        <div className="text-center py-8 text-[#a0a0a0]">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
}
