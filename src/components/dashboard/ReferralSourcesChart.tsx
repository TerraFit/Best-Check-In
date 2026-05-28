// src/components/dashboard/ReferralSourcesChart.tsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

interface ReferralSourcesChartProps {
  bookings: any[]
  chartType: 'donut' | 'bar'
  onChartTypeChange: (type: 'donut' | 'bar') => void
}

export function ReferralSourcesChart({ bookings, chartType, onChartTypeChange }: ReferralSourcesChartProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">How Guests Found You</h3>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-gray-100 text-gray-500">Donut</button>
            <button className="p-2 rounded-lg bg-gray-100 text-gray-500">Bar</button>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available for selected period
        </div>
      </div>
    )
  }

  const referralData = Object.entries(
    bookings.reduce((acc, b) => {
      const source = b.booking_source || b.referral_source
      if (source && source !== 'NULL' && source !== 'null' && source.trim() !== '') {
        const cleanSource = source.replace(/\.$/, '').trim()
        acc[cleanSource] = (acc[cleanSource] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">How Guests Found You</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onChartTypeChange('donut')}
            className={`p-2 rounded-lg transition-colors ${
              chartType === 'donut' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Donut Chart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => onChartTypeChange('bar')}
            className={`p-2 rounded-lg transition-colors ${
              chartType === 'bar' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Bar Chart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {chartType === 'donut' ? (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={referralData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
              labelLine={false}
            >
              {referralData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} bookings`, name]} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={referralData} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
