import { useEffect, useState, useCallback } from 'react';
import { BedDouble, Info, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  fetchRoomPerformance,
  type RoomPerformanceResponse,
  type RoomPerformanceRow,
} from '../../services/analyticsApi';

interface Props {
  businessId: string;
  dateFrom: string;
  dateTo: string;
}

function bandColor(band: RoomPerformanceRow['performanceBand']) {
  if (band === 'above') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (band === 'below') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (band === 'no_data') return 'bg-stone-50 text-stone-500 border-stone-200';
  return 'bg-stone-50 text-stone-700 border-stone-200';
}

function bandIcon(band: RoomPerformanceRow['performanceBand']) {
  if (band === 'above') return <TrendingUp size={14} className="text-emerald-600" />;
  if (band === 'below') return <TrendingDown size={14} className="text-amber-600" />;
  return <Minus size={14} className="text-stone-400" />;
}

export function RoomPerformancePanel({ businessId, dateFrom, dateTo }: Props) {
  const [data, setData] = useState<RoomPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRoomPerformance({ businessId, dateFrom, dateTo });
      if (!res.success) {
        setError(res.error || 'Failed to load room performance');
        setData(null);
      } else {
        setData(res);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load room performance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const rooms = data?.rooms || [];
  const coverage = data?.meta?.quality?.allocationCoveragePct;
  const propertyRate = data?.meta?.propertyOccupancyRate ?? 0;
  const maxUtil = Math.max(1, ...rooms.map((r) => r.utilisation));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <BedDouble size={16} className="text-orange-500" />
            Room Performance
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            How each room performed relative to the property in this period. Utilisation is room
            nights sold divided by days in period (not maintenance-adjusted). Labels prefer the
            room name recorded on the booking.
          </p>
        </div>
        <div className="text-right text-xs text-stone-500">
          <div>
            Property utilisation:{' '}
            <span className="font-semibold text-stone-800">{propertyRate}%</span>
          </div>
          {coverage !== undefined && coverage < 100 && (
            <div className="mt-1 text-amber-700">
              Based on {coverage}% of eligible stays with room allocation
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-stone-500 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading room metrics…
        </div>
      )}

      {error && (
        <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-stone-500">
          No room data for this period. Assign rooms to stays to see performance.
        </div>
      )}

      {!loading && !error && rooms.length > 0 && (
        <>
          {data?.insights && data.insights.length > 0 && (
            <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 space-y-1.5">
              {data.insights.map((ins, i) => (
                <p key={i} className="text-xs text-stone-600 flex items-start gap-2">
                  <Info size={12} className="mt-0.5 shrink-0 text-stone-400" />
                  <span>
                    <span className="uppercase text-[10px] font-bold text-stone-400 mr-1">
                      {ins.level}
                    </span>
                    {ins.text}
                  </span>
                </p>
              ))}
            </div>
          )}

          <div className="px-5 py-4 space-y-3">
            {rooms.map((r) => (
              <div
                key={r.roomId}
                className={`rounded-lg border px-3 py-2.5 ${bandColor(r.performanceBand)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    {bandIcon(r.performanceBand)}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {r.roomNumber ? `#${r.roomNumber} · ` : ''}
                        {r.roomName}
                      </p>
                      <p className="text-[10px] opacity-70">
                        {r.roomType || 'Room'}
                        {r.labelSource === 'snapshot' ? ' · historical name' : ''}
                        {!r.meaningful && r.stays > 0 ? ' · limited sample' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{r.utilisation}%</p>
                    <p className="text-[10px] opacity-70">
                      {r.vsPropertyUtilisationPp >= 0 ? '+' : ''}
                      {r.vsPropertyUtilisationPp} pp vs property
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500/80"
                    style={{ width: `${Math.min(100, (r.utilisation / maxUtil) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] opacity-80">
                  <span>{r.stays} stays</span>
                  <span>{r.roomNightsSold} nights sold</span>
                  <span>{r.shareOfPropertyNights}% of property nights</span>
                  <span>Avg stay {r.averageStay}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-stone-100 text-[10px] text-stone-400">
            Rankings require at least 3 stays or 7 room-nights for comparative language. Price and
            maintenance-adjusted utilisation are not included.
          </div>
        </>
      )}
    </div>
  );
}
