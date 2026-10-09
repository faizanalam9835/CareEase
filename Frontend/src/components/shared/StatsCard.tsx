import { memo } from 'react';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatsCardTone = 'cyan' | 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'slate';


export interface StatsCardProps {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  /** Percentage change; anything that is not a finite number hides the trend. */
  change?: number | null;
  changeLabel?: ReactNode;
  /** Shown in place of the trend when there is no change figure. */
  hint?: ReactNode;
  tone?: StatsCardTone;
}

const StatsCard = memo(function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel = 'vs last month',
  hint,
}: StatsCardProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const TrendIcon = !hasChange || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const trendTone =
    !hasChange || change === 0
      ? 'text-slate-400'
      : change > 0
        ? 'text-emerald-600'
        : 'text-red-600';

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span
          className="shrink-0 rounded-md bg-cyan-50 p-3 text-cyan-600"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {(hasChange || hint) && (
        <div className="relative mt-3 flex items-center gap-1.5 text-xs">
          {hasChange && (
            <>
              <TrendIcon className={`h-3.5 w-3.5 ${trendTone}`} aria-hidden="true" />
              <span className={`font-medium ${trendTone}`}>
                {change > 0 ? '+' : ''}
                {change}%
              </span>
              <span className="text-slate-400">{changeLabel}</span>
            </>
          )}
          {!hasChange && hint && <span className="text-slate-400">{hint}</span>}
        </div>
      )}
    </div>
  );
});

export default StatsCard;
