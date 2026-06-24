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
