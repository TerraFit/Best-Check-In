// src/components/dashboard/LengthOfStayChart.tsx
// Renders canonical length-of-stay series from get-analytics-summary.
// Does NOT aggregate bookings client-side.

import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, TooltipProps } from 'recharts'

export interface LengthOfStaySeriesItem {
  bucket: string
  count: number
  percentage: number
}

interface StayData {
  nights: number
  label: string
  count: number
  percentage: number
}

interface LengthOfStayChartProps {
  lengthOfStay: LengthOfStaySeriesItem[]
}

const BUCKET_ORDER = ['1', '2-3', '4-7', '8+']

const bucketSortKey = (bucket: string): number => {
  const i = BUCKET_ORDER.indexOf(bucket)
  return i >= 0 ? i : 99
}

const getBarColor = (percentage: number): string => {
  if (percentage >= 30) return '#ef4444'
  if (percentage >= 15) return '#f59e0b'
  if (percentage >= 5) return '#10b981'
  return '#3b82f6'
}

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as StayData
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">
          {dataPoint.label === '1' ? '1 night' : `${dataPoint.label} nights`}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{dataPoint.count.toLocaleString()}</span> bookings
        </p>
        <p className="text-sm text-orange-600 font-medium">
          {formatPercentage(dataPoint.percentage)}
        </p>
      </div>
    )
  }
  return null
}

export function LengthOfStayChart({ lengthOfStay }: LengthOfStayChartProps) {
  const chartData = useMemo((): StayData[] => {
    if (!lengthOfStay || lengthOfStay.length === 0) return []
    return [...lengthOfStay]
      .map((item) => ({
        nights: bucketSortKey(item.bucket),
        label: item.bucket,
        count: item.count,
        percentage: item.percentage,
      }))
      .sort((a, b) => a.nights - b.nights)
  }, [lengthOfStay])

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Length of Stay Distribution</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available for selected period
        </div>
      </div>
    )
  }

  const mostCommon = chartData.reduce((max, curr) => (curr.count > max.count ? curr : max))

  const byBucket = Object.fromEntries(chartData.map((d) => [d.label, d]))
  const one = byBucket['1']
  const twoThree = byBucket['2-3']
  const fourSeven = byBucket['4-7']
  const eightPlus = byBucket['8+']

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Length of Stay Distribution</h3>
        {mostCommon && (
          <p className="text-sm text-gray-500 mt-1">
            Most guests stay{' '}
            <span className="font-medium text-orange-600">
              {mostCommon.label === '1' ? '1 night' : `${mostCommon.label} nights`}
            </span>
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            label={{
              value: 'Length of stay (nights)',
              position: 'bottom',
              offset: 0,
              style: { fill: '#6b7280', fontSize: 12 },
            }}
          />
          <YAxis
            label={{
              value: 'Number of Bookings',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">1-night stays</p>
          <p className="font-bold text-gray-900">
            {(one?.count || 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(one?.percentage || 0)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">2-3 nights</p>
          <p className="font-bold text-gray-900">
            {(twoThree?.count || 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(twoThree?.percentage || 0)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">4-7 nights</p>
          <p className="font-bold text-gray-900">
            {(fourSeven?.count || 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(fourSeven?.percentage || 0)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">8+ nights</p>
          <p className="font-bold text-gray-900">
            {(eightPlus?.count || 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(eightPlus?.percentage || 0)})
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
