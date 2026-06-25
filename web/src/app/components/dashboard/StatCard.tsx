'use client';

import AnimatedNumber from './AnimatedNumber';

export interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: { value: number; label: string };
  color?: string;
  loading?: boolean;
}

const colorMap: Record<string, { gradient: string; bg: string; shadow: string; bgFrom: string; bgTo: string }> = {
  cyan: {
    gradient: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(6,182,212,0.12)]',
    bgFrom: 'from-cyan-500/[0.04]',
    bgTo: 'to-cyan-500/[0.01]',
  },
  emerald: {
    gradient: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(16,185,129,0.12)]',
    bgFrom: 'from-emerald-500/[0.04]',
    bgTo: 'to-emerald-500/[0.01]',
  },
  amber: {
    gradient: 'text-amber-400',
    bg: 'bg-amber-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(245,158,11,0.12)]',
    bgFrom: 'from-amber-500/[0.04]',
    bgTo: 'to-amber-500/[0.01]',
  },
  purple: {
    gradient: 'text-purple-400',
    bg: 'bg-purple-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(139,92,246,0.12)]',
    bgFrom: 'from-purple-500/[0.04]',
    bgTo: 'to-purple-500/[0.01]',
  },
  blue: {
    gradient: 'text-blue-400',
    bg: 'bg-blue-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(59,130,246,0.12)]',
    bgFrom: 'from-blue-500/[0.04]',
    bgTo: 'to-blue-500/[0.01]',
  },
  rose: {
    gradient: 'text-rose-400',
    bg: 'bg-rose-500/15',
    shadow: 'shadow-[0_4px_24px_rgba(244,63,94,0.12)]',
    bgFrom: 'from-rose-500/[0.04]',
    bgTo: 'to-rose-500/[0.01]',
  },
};

export default function StatCard({
  icon,
  label,
  value,
  prefix,
  suffix,
  trend,
  color = 'cyan',
  loading = false,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.cyan;
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <div
      className={`glow-card bg-gradient-to-br ${c.bgFrom} ${c.bgTo} border border-white/[0.08] rounded-2xl backdrop-blur-xl p-3 sm:p-4 flex flex-col justify-between gap-3 ${c.shadow} hover:shadow-[0_8px_32px_rgba(6,182,212,0.15)] hover:border-white/[0.12] transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs sm:text-sm">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center`}>
          <span className="text-sm">{icon}</span>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-9 w-24 rounded-lg skeleton-shimmer" />
        ) : (
          <p className={`text-xl sm:text-2xl font-bold ${c.gradient} stat-number`}>
            <AnimatedNumber prefix={prefix} suffix={suffix} value={numValue} />
          </p>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={trend.value >= 0 ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-gray-600 text-xs">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
