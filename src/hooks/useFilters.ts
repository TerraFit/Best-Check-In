// src/hooks/useFilters.ts
import { useState, useCallback } from 'react'

export type FilterType = {
  dateRange: string
  startDate: string
  endDate: string
  searchTerm: string
  statusFilter: string
  provinceFilter: string
  cityFilter: string
  countryFilter: string
}

const defaultFilters: FilterType = {
  dateRange: 'all',
  startDate: '',
  endDate: '',
  searchTerm: '',
  statusFilter: '',
  provinceFilter: '',
  cityFilter: '',
  countryFilter: ''
}

const reportsDefaultFilters: FilterType = {
  ...defaultFilters,
  dateRange: '30days'
}

export function useFilters(activeTab: string) {
  const [filters, setFilters] = useState<Record<string, FilterType>>({
    overview: { ...defaultFilters },
    checkins: { ...defaultFilters },
    reports: { ...reportsDefaultFilters },
    settings: { ...defaultFilters }
  })

  const currentFilters = filters[activeTab] || defaultFilters

  const updateFilter = useCallback(<K extends keyof FilterType>(key: K, value: FilterType[K]) => {
    console.log(`🔧 updateFilter: ${String(key)} = ${value}`);
    
    setFilters(prev => {
      const existingTabFilters = prev[activeTab] || defaultFilters
      
      let updates: any = { [key]: value }
      
      if (key === 'dateRange') {
        updates.startDate = ''
        updates.endDate = ''
      }
      
      if ((key === 'startDate' && value) || (key === 'endDate' && value)) {
        updates.dateRange = 'all'
      }
      
      return {
        ...prev,
        [activeTab]: {
          ...existingTabFilters,
          ...updates
        }
      }
    })
  }, [activeTab])

  const clearCurrentFilters = useCallback(() => {
    console.log('🧹 Clearing filters for tab:', activeTab)
    setFilters(prev => ({
      ...prev,
      [activeTab]: activeTab === 'reports' ? { ...reportsDefaultFilters } : { ...defaultFilters }
    }))
  }, [activeTab])

  const isFilterActive = useCallback(() => {
    if (!currentFilters) return false
    const defaultRange = activeTab === 'reports' ? '30days' : 'all'
    return currentFilters.dateRange !== defaultRange || 
           !!currentFilters.startDate || 
           !!currentFilters.endDate || 
           !!currentFilters.searchTerm || 
           !!currentFilters.statusFilter || 
           !!currentFilters.provinceFilter || 
           !!currentFilters.cityFilter || 
           !!currentFilters.countryFilter
  }, [currentFilters, activeTab])

  return {
    filters,
    currentFilters,
    updateFilter,
    clearCurrentFilters,
    isFilterActive
  }
}
