// src/components/dashboard/LengthOfStayChart.tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'

interface LengthOfStayChartProps {
  bookings: any[]
}

export function LengthOfStayChart({ bookings }: LengthOfStayChartProps) {
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

  // Calculate distribution of nights
  const distribution: Record<number, number> = {}
  
  bookings.forEach((booking: any) => {
    const nights = booking.nights || 1
    distribution[nights] = (distribution[nights] || 0) + 1
  })

  // Convert to array for chart and calculate percentages
  const totalBookings = bookings.length
  
  const data = Object.entries(distribution)
    .map(([nights, count]) => ({
      nights: parseInt(nights),
      count: count,
      percentage: ((count / totalBookings) * 100).toFixed(1)
    }))
    .sort((a, b) => a.nights - b.nights)
    // Only show up to 14 nights, group 14+ as "14+"
    .reduce((acc: any[], curr) => {
      if (curr.nights >= 14) {
        const existing = acc.find(d => d.nights === '14+')
        if (existing) {
          existing.count += curr.count
          existing.percentage = ((existing.count / totalBookings) * 100).toFixed(1)
        } else {
          acc.push({
            nights: '14+',
            count: curr.count,
            percentage: ((curr.count / totalBookings) * 100).toFixed(1)
          })
        }
      } else {
        acc.push(curr)
      }
      return acc
    }, [])

  // Color gradient based on percentage
  const getBarColor = (percentage: number) => {
    if (percentage >= 30) return '#ef4444'
    if (percentage >= 15) return '#f59e0b'
    if (percentage >= 5) return '#10b981'
    return '#3b82f6'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">
            {dataPoint.nights === '14+' ? '14+ nights' : `${dataPoint.nights} night${dataPoint.nights !== 1 ? 's' : ''}`}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{dataPoint.count}</span> bookings
          </p>
          <p className="text-sm text-orange-600 font-medium">
            {dataPoint.percentage}% of total
          </p>
        </div>
      )
    }
    return null
  }

  // Find most common stay length for display
  const mostCommon = data.reduce((max, curr) => curr.count > max.count ? curr : max, data[0])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Length of Stay Distribution</h3>
        <p className="text-sm text-gray-500 mt-1">
          Most guests stay <span className="font-medium text-orange-600">
            {mostCommon?.nights === '14+' ? '14+ nights' : `${mostCommon?.nights} night${mostCommon?.nights !== 1 ? 's' : ''}`}
          </span>
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="nights" 
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
            {data.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(parseFloat(entry.percentage))}
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
            {(data.find((d: any) => d.nights === 1)?.count || 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({data.find((d: any) => d.nights === 1)?.percentage || 0}%)
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">2-3 nights</p>
          <p className="font-bold text-gray-900">
            {((data.find((d: any) => d.nights === 2)?.count || 0) + (data.find((d: any) => d.nights === 3)?.count || 0)).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({((data.find((d: any) => d.nights === 2)?.count || 0) + (data.find((d: any) => d.nights === 3)?.count || 0)) / totalBookings * 100}%)
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">4-7 nights</p>
          <p className="font-bold text-gray-900">
            {[4,5,6,7].reduce((sum, n) => sum + (data.find((d: any) => d.nights === n)?.count || 0), 0).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              ({[4,5,6,7].reduce((sum, n) => sum + (data.find((d: any) => d.nights === n)?.count || 0), 0) / totalBookings * 100}%)
            </span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">8+ nights</p>
          <p className="font-bold text-gray-900">
            {(data.filter((d: any) => typeof d.nights === 'number' && d.nights >= 8).reduce((sum: number, d: any) => sum + d.count, 0) + (data.find((d: any) => d.nights === '14+')?.count || 0)).toLocaleString()}
            <span className="text-xs text-gray-400 ml-1">
              {(data.filter((d: any) => typeof d.nights === 'number' && d.nights >= 8).reduce((sum: number, d: any) => sum + d.count, 0) + (data.find((d: any) => d.nights === '14+')?.count || 0)) / totalBookings * 100}%
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
