import { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { heatColor } from './geo/mapConfig';

type ContributionNode = {
  name: string;
  count: number;
  percentage?: number;
  code?: string;
};

interface VisitorOriginContributionGridProps {
  level: 'continents' | 'countries' | 'regions' | 'cities';
  nodes: ContributionNode[];
  title: string;
  subtitle: string;
  onBack?: () => void;
  onSelect?: (name: string) => void;
}

const LEVEL_LABELS = {
  continents: 'CONTINENTS',
  countries: 'COUNTRIES',
  regions: 'PROVINCES / STATES / REGIONS',
  cities: 'CITIES',
} as const;

export function VisitorOriginContributionGrid({
  level,
  nodes,
  title,
  subtitle,
  onBack,
  onSelect,
}: VisitorOriginContributionGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const items = useMemo(() => {
    const cleaned = (nodes || [])
      .filter((node) => node.name)
      .map((node) => ({
        ...node,
        count: Number(node.count) || 0,
        percentage: Number(node.percentage) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const total = cleaned.reduce((sum, node) => sum + node.count, 0);
    return cleaned.map((node) => ({
      ...node,
      percentage: node.percentage > 0 ? node.percentage : total ? (node.count / total) * 100 : 0,
    }));
  }, [nodes]);

  const maxCount = Math.max(...items.map((item) => item.count), 1);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold text-stone-900">{title}</h4>
              <span className="rounded-md bg-stone-900 px-2 py-1 text-[9px] font-bold tracking-wider text-orange-300">{LEVEL_LABELS[level]}</span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
            <ArrowLeft size={13} /> Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, index) => {
          const intensity = Math.max(0, Math.min(1, item.count / maxCount));
          const isInteractive = !!onSelect && item.count > 0;
          const isHovered = hovered === item.name;
          return (
            <button
              key={`${item.name}-${item.code || ''}`}
              type="button"
              disabled={!isInteractive}
              onClick={() => onSelect?.(item.name)}
              onMouseEnter={() => setHovered(item.name)}
              onMouseLeave={() => setHovered(null)}
              className={`group rounded-xl border p-3 text-left transition-all ${isInteractive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'} ${isHovered ? 'border-orange-300 shadow-md' : 'border-stone-200'}`}
              style={{ background: `linear-gradient(135deg, ${heatColor(item.count)}${Math.round(12 + intensity * 22).toString(16).padStart(2, '0')}, #ffffff 72%)` }}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold" style={{ backgroundColor: heatColor(item.count), color: item.count > 5 ? '#ffffff' : '#7c2d12' }}>{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-800">{item.name}</span>
                <span className="text-lg font-extrabold tabular-nums text-stone-900">{item.count.toLocaleString()}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200/70">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.count > 0 ? 5 : 0, intensity * 100)}%`, backgroundColor: heatColor(item.count) }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>{item.percentage.toFixed(1)}%</span>
                {isInteractive && <span className="text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">Click to drill down →</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 pt-3 text-[10px] font-mono text-stone-400">
        <span>Total represented: <strong className="text-stone-700">{total.toLocaleString()}</strong></span>
        <span>Colour intensity = relative visitor contribution</span>
      </div>
    </section>
  );
}

export default VisitorOriginContributionGrid;
