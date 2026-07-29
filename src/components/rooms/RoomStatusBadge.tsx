// src/components/rooms/RoomStatusBadge.tsx
// Shared colour-coded status chip for rooms

import type { Room } from '../../types/room';
import {
  getRoomCardTone,
  getRoomToneBadgeClasses,
  getRoomToneDotClass,
  getRoomStatusSummary,
  ROOM_TONE_LABELS,
  type RoomCardTone,
} from '../../services/roomDisplayService';

interface RoomStatusBadgeProps {
  room: Pick<
    Room,
    'active' | 'availability_status' | 'occupancy_status' | 'housekeeping_status' | 'unavailable_reason'
  >;
  /** Show legend-style label (Clean / Ready) instead of operational summary */
  useLegendLabel?: boolean;
  className?: string;
}

export function RoomStatusBadge({ room, useLegendLabel = false, className = '' }: RoomStatusBadgeProps) {
  const tone = getRoomCardTone(room);
  const label = useLegendLabel ? ROOM_TONE_LABELS[tone] : getRoomStatusSummary(room);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoomToneBadgeClasses(tone)} ${className}`}
      title={ROOM_TONE_LABELS[tone]}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getRoomToneDotClass(tone)}`} aria-hidden />
      {label}
    </span>
  );
}

export function RoomStatusLegend() {
  const tones: RoomCardTone[] = ['green', 'yellow', 'amber', 'red', 'blue', 'purple', 'grey'];

  return (
    <div className="flex flex-wrap gap-2">
      {tones.map((tone) => (
        <span
          key={tone}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoomToneBadgeClasses(tone)}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getRoomToneDotClass(tone)}`} aria-hidden />
          {ROOM_TONE_LABELS[tone]}
        </span>
      ))}
    </div>
  );
}

export default RoomStatusBadge;
