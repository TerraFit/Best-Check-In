import { useTranslation } from '../../i18n'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

/** Canonical series from get-analytics-summary (server). No client-side booking aggregation. */
export interface ReferralSeriesItem {
  name: string
  count: number
  percentage: number
}

interface ReferralSourcesChartProps {
  referralData: ReferralSeriesItem[]
  chartType: 'donut' | 'bar'
  onChartTypeChange: (type: 'donut' | 'bar') => void
}

function displayReferralName(name: string): string {
  const labels: Record<string, string> = {
    word_of_mouth: 'Word of Mouth',
    research_engine: 'Research Engine',
    facebook_instagram: 'Facebook / Instagram',
    facebook_instagram: 'Facebook / Instagram',
    booking_com: 'Booking.com',
    travel_agency: 'Travel Agency',
  }
  return labels[name.toLowerCase()] ?? name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ReferralSourcesChart({ referralData: series, chartType, onChartTypeChange }: ReferralSourcesChartProps) {
  const { t } = useTranslation()

  if (!series || series.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports_how_guests_found')}</h3>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-gray-100 text-gray-500">{t('reports_chart_donut')}</button>
            <button className="p-2 rounded-lg bg-gray-100 text-gray-500">{t('reports_chart_bar')}</button>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400">{t('reports_no_data_period')}</div>
      </div>
    )
  }

  const referralData = series
    .map((r) => ({
      ...r,
      name: displayReferralName(r.name),
      percentage: typeof r.percentage === 'number' ? Number(r.percentage.toFixed(1)) : Number(r.percentage) || 0,
    }))
    .sort((a, b) => b.count - a.count)

  const totalBookings = referralData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('reports_how_guests_found')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{totalBookings} bookings · sorted by source</p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => onChartTypeChange('donut')}
            className={`p-2 rounded-lg transition-colors ${chartType === 'donut' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={t('reports_chart_donut')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => onChartTypeChange('bar')}
            className={`p-2 rounded-lg transition-colors ${chartType === 'bar' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={t('reports_chart_bar')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {chartType === 'donut' ? (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)] gap-5 items-center min-w-0">
          <div className="relative h-[280px] sm:h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={referralData}
                  cx="50%"
                  cy="50%"
                  innerRadius="38%"
                  outerRadius="68%"
                  paddingAngle={2}
                  dataKey="count"
                  label={false}
                  labelLine={false}
                >
                  {referralData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const item = referralData.find((d) => d.name === name)
                    return [`${item?.percentage ?? 0}% (${value} bookings)`, name]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{totalBookings}</span>
              <span className="text-xs text-gray-500">bookings</span>
            </div>
          </div>

          <div className="min-w-0 w-full space-y-2" aria-label="Guest referral sources">
            {referralData.map((item, index) => (
              <div key={item.name} className="flex items-start gap-2 min-w-0 rounded-md px-1 py-1">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words text-sm leading-5 text-gray-700">{item.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-hidden">
          <div className="h-[360px] sm:h-[380px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referralData} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis type="number" tickFormatter={(value) => `${value}%`} domain={[0, 'dataMax + 8']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={typeof window !== 'undefined' && window.innerWidth < 640 ? 112 : 148}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, _name, props) => {
                    const item = referralData.find((d) => d.name === props.payload.name)
                    return [`${item?.percentage ?? 0}% (${item?.count ?? 0} bookings)`, 'Percentage']
                  }}
                />
                <Bar
                  dataKey="percentage"
                  fill="#f97316"
                  radius={[0, 8, 8, 0]}
                  label={{ position: 'right', formatter: (value: number) => `${value}%`, fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
