import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TONES = {
  cyan: 'bg-cyan-50 text-cyan-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600'
};

const StatsCard = memo(function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel = 'vs last month',
  hint,
  tone = 'cyan'
}) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const TrendIcon = !hasChange || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const trendTone =
    !hasChange || change === 0
      ? 'text-slate-400'
      : change > 0
        ? 'text-emerald-600'
        : 'text-red-600';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`shrink-0 rounded-lg p-2.5 ${TONES[tone] || TONES.cyan}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {(hasChange || hint) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
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
