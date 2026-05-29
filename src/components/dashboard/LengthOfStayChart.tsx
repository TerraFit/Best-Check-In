// src/components/dashboard/LengthOfStayChart.tsx
import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, TooltipProps } from 'recharts'
import { Booking } from '../../types'  // Import your existing type

// ============================================================
// TYPES
// ============================================================

interface StayData {
  nights: number        // Numeric value for calculations (1-13, or 14 for grouped)
  label: string         // Display label ("1", "2", ..., "14+")
  count: number
  percentage: number
}

interface LengthOfStayChartProps {
  bookings: Booking[]
}

// ============================================================
// CONSTANTS
// ============================================================

const GROUP_THRESHOLD = 14

// ============================================================
// HELPERS
// ============================================================

const getValidNights = (nights: unknown): number => {
  if (typeof nights === 'number' && !isNaN(nights) && nights > 0) {
    return nights
  }
  return 1  // Default to 1 night for invalid data
}

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const getBarColor = (percentage: number): string => {
  if (percentage >= 30) return '#ef4444'
  if (percentage >= 15) return '#f59e0b'
  if (percentage >= 5)  return '#10b981'
  return '#3b82f6'
}

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as StayData
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">
          {dataPoint.label === `${GROUP_THRESHOLD}+` 
            ? `${GROUP_THRESHOLD}+ nights` 
            : `${dataPoint.label} night${dataPoint.label !== '1' ? 's' : ''}`}
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

// ============================================================
// MAIN COMPONENT
// ============================================================

export function LengthOfStayChart({ bookings }: LengthOfStayChartProps) {
  // Early return with guard
  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Length of Stay Distribution</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available for selected period
        </div>
      </div>
    )
  }

  const totalBookings = bookings.length

  // Calculate distribution using useMemo for performance
  const chartData = useMemo((): StayData[] => {
    const distribution: Record<number, number> = {}

    // Count occurrences of each night value
    bookings.forEach((booking) => {
      const nights = getValidNights(booking.nights)
      distribution[nights] = (distribution[nights] || 0) + 1
    })

    // Convert to array and calculate percentages
    const rawData: StayData[] = Object.entries(distribution)
      .map(([nightsStr, count]) => {
        const nights = parseInt(nightsStr, 10)
        return {
          nights,
          label: nights.toString(),
          count,
          percentage: (count / totalBookings) * 100
        }
      })
      .sort((a, b) => a.nights - b.nights)

    // Group nights >= GROUP_THRESHOLD into a single category
    const result: StayData[] = []
    let groupedCount = 0
    let groupedPercentage = 0

    for (const item of rawData) {
      if (item.nights >= GROUP_THRESHOLD) {
        groupedCount += item.count
        groupedPercentage += item.percentage
      } else {
        result.push(item)
      }
    }

    // Add grouped category if there are any 14+ nights
    if (groupedCount > 0) {
      result.push({
        nights: GROUP_THRESHOLD,
        label: `${GROUP_THRESHOLD}+`,
        count: groupedCount,
        percentage: groupedPercentage
      })
    }

    return result
  }, [bookings, totalBookings])

  // Create lookup map for O(1) access
  const dataMap = useMemo(() => {
    return Object.fromEntries(
      chartData.map(d => [d.label, d])
    )
  }, [chartData])

  // Find most common stay length (safe)
  const mostCommon = chartData.length > 0
    ? chartData.reduce((max, curr) => curr.count > max.count ? curr : max)
    : null

  // Summary stats using the map for efficiency
  const oneNightCount = dataMap['1']?.count || 0
  const twoThreeCount = (dataMap['2']?.count || 0) + (dataMap['3']?.count || 0)
  const fourToSevenCount = [4, 5, 6, 7].reduce((sum, n) => sum + (dataMap[n.toString()]?.count || 0), 0)
  const eightPlusCount = chartData
    .filter(d => d.nights >= 8 && d.nights < GROUP_THRESHOLD)
    .reduce((sum, d) => sum + d.count, 0) + (dataMap[`${GROUP_THRESHOLD}+`]?.count || 0)

  const oneNightPercent = (oneNightCount / totalBookings) * 100
  const twoThreePercent = (twoThreeCount / totalBookings) * 100
  const fourToSevenPercent = (fourToSevenCount / totalBookings) * 100
  const eightPlusPercent = (eightPlusCount / totalBookings) * 100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Length of Stay Distribution</h3>
        {mostCommon && (
          <p className="text-sm text-gray-500 mt-1">
            Most guests stay <span className="font-medium text-orange-600">
              {mostCommon.label === `${GROUP_THRESHOLD}+` 
                ? `${GROUP_THRESHOLD}+ nights` 
                : `${mostCommon.label} night${mostCommon.label !== '1' ? 's' : ''}`}
            </span>
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="label"
            label={{ 
              value: 'Number of Nights', 
              position: 'bottom', 
              offset: 0,
              style: { fill: '#6b7280', fontSize: 12 }
            }}
          />
          <YAxis 
            label={{ 
              value: 'Number of Bookings', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 12 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.percentage)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">1-night stays</p>
          <p className="font-bold text-gray-900">
            {oneNightCount.toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(oneNightPercent)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">2-3 nights</p>
          <p className="font-bold text-gray-900">
            {twoThreeCount.toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(twoThreePercent)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">4-7 nights</p>
          <p className="font-bold text-gray-900">
            {fourToSevenCount.toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(fourToSevenPercent)})
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">8+ nights</p>
          <p className="font-bold text-gray-900">
            {eightPlusCount.toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({formatPercentage(eightPlusPercent)})
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
