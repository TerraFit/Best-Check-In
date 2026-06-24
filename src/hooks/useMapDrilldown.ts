// src/hooks/useMapDrilldown.ts
import { useState, useCallback } from 'react';
import { MapState, MapLevel, LEVEL_ORDER, MapPermissions } from '../types/map';

export function useMapDrilldown(initialLevel: MapLevel = 'world') {
  const [state, setState] = useState<MapState>({
    level: initialLevel,
    breadcrumb: ['World']
  });

  const drillDown = useCallback((
    level: MapLevel,
    name: string,
    id?: string,
    permissions?: MapPermissions
  ) => {
    // Check if user can drill to this level
    const maxLevelIndex = LEVEL_ORDER[permissions?.maxLevel || 'world'];
    const targetLevelIndex = LEVEL_ORDER[level];
    
    if (targetLevelIndex > maxLevelIndex) {
      return { allowed: false, reason: 'upgrade_required' };
    }

    const newState: MapState = {
      level,
      breadcrumb: [...state.breadcrumb, name]
    };

    switch (level) {
      case 'continent':
        newState.selectedContinent = id || name;
        break;
      case 'country':
        newState.selectedCountry = id || name;
        break;
      case 'province':
        newState.selectedProvince = id || name;
        break;
    }

    setState(newState);
    return { allowed: true, newState };
  }, [state]);

  const drillUp = useCallback(() => {
    if (state.breadcrumb.length <= 1) return;

    const newBreadcrumb = state.breadcrumb.slice(0, -1);
    let newLevel: MapLevel = 'world';

    switch (state.level) {
      case 'continent':
        newLevel = 'world';
        break;
      case 'country':
        newLevel = 'continent';
        break;
      case 'province':
        newLevel = 'country';
        break;
    }

    setState({
      level: newLevel,
      breadcrumb: newBreadcrumb,
      selectedContinent: undefined,
      selectedCountry: undefined,
      selectedProvince: undefined
    });
  }, [state]);

  const resetMap = useCallback(() => {
    setState({
      level: 'world',
      breadcrumb: ['World']
    });
  }, []);

  return {
    state,
    drillDown,
    drillUp,
    resetMap,
    isAtWorld: state.level === 'world',
    canDrillFurther: (targetLevel: MapLevel, permissions?: MapPermissions) => {
      const maxLevelIndex = LEVEL_ORDER[permissions?.maxLevel || 'world'];
      const targetLevelIndex = LEVEL_ORDER[targetLevel];
      return targetLevelIndex <= maxLevelIndex;
    }
  };
}
