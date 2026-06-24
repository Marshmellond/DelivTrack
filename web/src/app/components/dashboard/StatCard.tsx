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

const colorMap: Record<string, { gradient: string; bg: string; shadow: string }> = {
  cyan: {
    gradient: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    shadow: 'shadow-[0_0_30px_rgba(6,182,212,0.1)]',
  },
  emerald: {
    gradient: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.1)]',
  },
  amber: {
    gradient: 'text-amber-400',
    bg: 'bg-amber-500/15',
    shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.1)]',
  },
  purple: {
    gradient: 'text-purple-400',
    bg: 'bg-purple-500/15',
    shadow: 'shadow-[0_0_30px_rgba(139,92,246,0.1)]',
  },
  blue: {
    gradient: 'text-blue-400',
    bg: 'bg-blue-500/15',
    shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.1)]',
  },
  rose: {
    gradient: 'text-rose-400',
    bg: 'bg-rose-500/15',
    shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.1)]',
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
      className={`glow-card bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between gap-3 ${c.shadow}`}
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
          <p className={`text-2xl sm:text-3xl font-bold ${c.gradient} stat-number`}>
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
