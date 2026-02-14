import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'yellow' | 'purple' | 'red';
  onClick?: () => void;
}

const colorConfig = {
  green: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', border: 'border-emerald-500/20' },
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', border: 'border-blue-500/20' },
  yellow: { bg: 'bg-amber-500/10', icon: 'text-amber-500', border: 'border-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500', border: 'border-purple-500/20' },
  red: { bg: 'bg-red-500/10', icon: 'text-red-500', border: 'border-red-500/20' },
};

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  color = 'green',
  onClick,
}: StatsCardProps) {
  const colors = colorConfig[color];
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative p-6 rounded-xl bg-card border border-border overflow-hidden shadow-sm',
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-md transition-all',
        colors.border
      )}
    >
      {/* Background gradient - simplified for better theme support */}
      <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10', colors.bg)} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-lg', colors.bg)}>
            <Icon className={cn('w-6 h-6', colors.icon)} />
          </div>

          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : isNegative ? <TrendingDown className="w-4 h-4" /> : null}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl font-bold text-foreground mb-1"
        >
          {value}
        </motion.h3>

        {/* Title */}
        <p className="text-muted-foreground text-sm mb-2 font-medium">{title}</p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-muted-foreground/80">{subtitle}</p>
        )}

        {/* Trend label */}
        {trendLabel && (
          <p className={cn(
            'text-xs mt-2',
            isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {trendLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}
