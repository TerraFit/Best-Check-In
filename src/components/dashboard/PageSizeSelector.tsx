// src/components/dashboard/PageSizeSelector.tsx

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function PageSizeSelector({ pageSize, onPageSizeChange }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Show:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
        className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
      >
        {PAGE_SIZE_OPTIONS.map(size => (
          <option key={size} value={size}>{size} per page</option>
        ))}
      </select>
    </div>
  )
}
