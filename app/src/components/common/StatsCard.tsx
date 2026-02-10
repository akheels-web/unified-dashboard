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
  green: { bg: 'bg-[#2596be]/20', icon: 'text-[#2596be]', border: 'border-[#2596be]/30' },
  blue: { bg: 'bg-blue-500/20', icon: 'text-blue-400', border: 'border-blue-500/30' },
  yellow: { bg: 'bg-yellow-500/20', icon: 'text-yellow-400', border: 'border-yellow-500/30' },
  purple: { bg: 'bg-purple-500/20', icon: 'text-purple-400', border: 'border-purple-500/30' },
  red: { bg: 'bg-red-500/20', icon: 'text-red-400', border: 'border-red-500/30' },
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
        'relative p-6 rounded-xl bg-[#2d2d2d] border border-[#3d3d3d] overflow-hidden',
        onClick && 'cursor-pointer hover:border-[#2596be]/50',
        colors.border
      )}
    >
      {/* Background gradient */}
      <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20', colors.bg)} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-lg', colors.bg)}>
            <Icon className={cn('w-6 h-6', colors.icon)} />
          </div>

          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
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
          className="text-3xl font-bold text-white mb-1"
        >
          {value}
        </motion.h3>

        {/* Title */}
        <p className="text-[#a0a0a0] text-sm mb-2">{title}</p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-[#a0a0a0]">{subtitle}</p>
        )}

        {/* Trend label */}
        {trendLabel && (
          <p className={cn(
            'text-xs mt-2',
            isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
          )}>
            {trendLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}
