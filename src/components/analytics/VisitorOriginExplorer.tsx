// src/components/analytics/VisitorOriginExplorer.tsx
// Add this at the top of the component:

export function VisitorOriginExplorer({
  data = { world: { total: 0 }, continents: [] },
  simpleData = {},
  limits = DEFAULT_LIMITS,
  onTierChange,
  isLoading = false,
  title = 'Visitor Origin Explorer',
  subtitle = 'Click the orange bubbles to drill down from world to cities'
}: VisitorOriginExplorerProps) {
  // ✅ DEBUG: Log what we received
  console.log('🔍 VisitorOriginExplorer - Received props:', {
    data,
    'data.type': typeof data,
    'data.continents': data?.continents,
    'data.continents?.length': data?.continents?.length,
    'data.world': data?.world,
    'data.world?.total': data?.world?.total,
    simpleData,
    limits,
    isLoading,
  });

  // ... rest of component
}

// src/components/analytics/VisitorOriginExplorer.tsx
import { useState, useMemo } from 'react';
import { InteractiveMap } from './InteractiveMap';
import { useMapDrilldown } from '../../hooks/useMapDrilldown';
import { aggregateVisitorData } from '../../services/analyticsAggregator';
import { PLAN_PERMISSIONS, MapPermissions } from '../../types/map';

interface VisitorOriginExplorerProps {
  bookings: any[];
  subscriptionTier: string;
  isLoading: boolean;
}

export function VisitorOriginExplorer({
  bookings,
  subscriptionTier,
  isLoading
}: VisitorOriginExplorerProps) {
  const [viewType, setViewType] = useState<'map' | 'bar' | 'pie'>('map');
  
  const permissions = PLAN_PERMISSIONS[subscriptionTier] || PLAN_PERMISSIONS.starter;
  
  const { state, drillDown, drillUp, isAtWorld, canDrillFurther } = useMapDrilldown('world');

  // Aggregate data based on current level
  const data = useMemo(() => {
    return aggregateVisitorData(bookings, state.level, state);
  }, [bookings, state]);

  const handleDrillDown = (id: string, name: string) => {
    drillDown(state.level, name, id, permissions);
  };

  // ... rest of component
}
