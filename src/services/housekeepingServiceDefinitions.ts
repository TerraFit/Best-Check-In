import type { HousekeepingChecklistSection, HousekeepingTaskType } from '../types/housekeeping';

/** Structured, phone-friendly checklists. Keep item ids stable because they are persisted. */
const REFRESH: HousekeepingChecklistSection[] = [
  { id: 'refresh-bedroom', title: 'Bedroom', items: [
    { id: 'refresh-bed', label: 'Make bed and check linen condition' },
    { id: 'refresh-pillows', label: 'Arrange pillows and cushions' },
    { id: 'refresh-surfaces', label: 'Dust and wipe visible surfaces' },
    { id: 'refresh-floor', label: 'Vacuum or sweep floor' },
    { id: 'refresh-bins', label: 'Empty bins and replace liners' },
    { id: 'refresh-amenities', label: 'Restock guest amenities' },
    { id: 'refresh-curtains', label: 'Check curtains/blinds and windows' },
    { id: 'refresh-ac', label: 'Check air conditioning/heating/fan' },
    { id: 'refresh-lights', label: 'Check lights and obvious defects' },
  ] },
  { id: 'refresh-bathroom', title: 'Bathroom', items: [
    { id: 'refresh-bath-surfaces', label: 'Clean and disinfect bathroom surfaces' },
    { id: 'refresh-toilet', label: 'Clean and disinfect toilet' },
    { id: 'refresh-shower', label: 'Clean shower/bath and glass' },
    { id: 'refresh-sink', label: 'Clean basin and taps' },
    { id: 'refresh-mirror', label: 'Clean mirror' },
    { id: 'refresh-bath-floor', label: 'Clean bathroom floor' },
    { id: 'refresh-towels', label: 'Replace towels as required' },
    { id: 'refresh-toiletries', label: 'Restock toiletries' },
    { id: 'refresh-water', label: 'Check hot/cold water and drainage' },
  ] },
  { id: 'refresh-final', title: 'Final Check', items: [
    { id: 'refresh-smell', label: 'Room smells fresh and clean' },
    { id: 'refresh-temperature', label: 'Room temperature is comfortable' },
    { id: 'refresh-fridge', label: 'Check minibar/fridge presentation' },
    { id: 'refresh-tv', label: 'Check TV/remote presentation' },
    { id: 'refresh-doors', label: 'Check doors, locks and visible hardware' },
    { id: 'refresh-guest-items', label: 'Remove housekeeping materials and waste' },
    { id: 'refresh-final-look', label: 'Complete final visual room check' },
  ] },
];

const FULL_SERVICE: HousekeepingChecklistSection[] = [
  { id: 'full-guest-property', title: 'Guest Property / Lost & Found — FIRST', items: [
    { id: 'full-lost-bedroom-tabletops', label: 'Check tabletops, bedside tables and visible surfaces for guest property' },
    { id: 'full-lost-under-bed', label: 'Check under the bed and under/behind furniture for guest property' },
    { id: 'full-lost-closet', label: 'Check closet/wardrobe, shelves and hanging area' },
    { id: 'full-lost-drawers', label: 'Check all drawers and bedside storage' },
    { id: 'full-lost-safe', label: 'Check the safe and surrounding area' },
    { id: 'full-lost-bathroom', label: 'Check bathroom surfaces, cabinets and shower/bath area' },
    { id: 'full-lost-fridge', label: 'Check fridge/minibar for medicine, wine, food and other guest items' },
    { id: 'full-lost-report', label: 'Confirm any guest property found has been reported/secured' },
  ] },
  { id: 'full-ventilation', title: 'Ventilation', items: [
    { id: 'full-open-windows', label: 'Open windows to ventilate the room after guest-property check; keep open until Final Check when weather permits' },
    { id: 'full-weather', label: 'Check weather conditions and close windows if unsafe or unsuitable' },
  ] },
  { id: 'full-bedroom', title: 'Bedroom', items: [
    { id: 'full-bed', label: 'Strip and remake bed with fresh linen' },
    { id: 'full-mattress', label: 'Inspect mattress and mattress protector' },
    { id: 'full-pillows', label: 'Inspect and arrange pillows/cushions' },
    { id: 'full-dusting', label: 'Dust all furniture and fixtures' },
    { id: 'full-floor', label: 'Vacuum/sweep and clean floor thoroughly' },
    { id: 'full-under-bed', label: 'Check under bed and furniture' },
    { id: 'full-windows', label: 'Clean/check windows, tracks and sills' },
    { id: 'full-curtains', label: 'Check curtains/blinds' },
    { id: 'full-wardrobe', label: 'Clean and inspect wardrobe' },
    { id: 'full-amenities', label: 'Restock guest amenities' },
  ] },
  { id: 'full-bathroom', title: 'Bathroom', items: [
    { id: 'full-bath-surfaces', label: 'Deep clean and disinfect all surfaces' },
    { id: 'full-toilet', label: 'Deep clean and disinfect toilet' },
    { id: 'full-shower', label: 'Deep clean shower/bath and glass' },
    { id: 'full-sink', label: 'Clean basin, taps and drains' },
    { id: 'full-mirror', label: 'Clean mirror and glass' },
    { id: 'full-floor', label: 'Deep clean bathroom floor' },
    { id: 'full-towels', label: 'Replace towels' },
    { id: 'full-toiletries', label: 'Restock toiletries and consumables' },
    { id: 'full-water', label: 'Check water pressure, temperature and drainage' },
    { id: 'full-ventilation-bathroom', label: 'Check bathroom ventilation/extraction' },
  ] },
  { id: 'full-living', title: 'Guest Areas', items: [
    { id: 'full-seating', label: 'Clean and arrange seating' },
    { id: 'full-tables', label: 'Clean tables and visible surfaces' },
    { id: 'full-decor', label: 'Check decor and presentation' },
    { id: 'full-lighting', label: 'Check all lighting' },
    { id: 'full-electronics', label: 'Check TV, remote and electronics' },
    { id: 'full-fridge', label: 'Clean and restock minibar/fridge; record items taken and restocked' },
    { id: 'full-coffee', label: 'Clean and restock coffee/tea station; record items taken and restocked' },
    { id: 'full-doors', label: 'Check doors, locks and handles' },
    { id: 'full-ac', label: 'Check air conditioning/heating/fan' },
    { id: 'full-safety', label: 'Check obvious safety hazards' },
  ] },
  { id: 'full-final', title: 'Final Check', items: [
    { id: 'full-smell', label: 'Room smells fresh and clean' },
    { id: 'full-temperature', label: 'Room temperature is comfortable' },
    { id: 'full-too-cold', label: 'Room temperature is too cold — record/resolve issue' },
    { id: 'full-too-hot', label: 'Room temperature is too hot — record/resolve issue' },
    { id: 'full-floor-final', label: 'Final floor and presentation check' },
    { id: 'full-linen', label: 'Confirm all linen is correctly presented' },
    { id: 'full-maintenance', label: 'Confirm all observed defects were reported' },
    { id: 'full-supplies', label: 'Remove cleaning equipment and waste' },
    { id: 'full-window-final', label: 'Final window check — close windows when weather/room conditions require it' },
    { id: 'full-door', label: 'Secure room and close door' },
    { id: 'full-final-look', label: 'Complete final visual inspection' },
    { id: 'full-status', label: 'Confirm room is ready for inspection' },
  ] },
];

export function getHousekeepingChecklist(type: HousekeepingTaskType): HousekeepingChecklistSection[] {
  return type === 'full_service' ? FULL_SERVICE : REFRESH;
}

export function getChecklistItemIds(type: HousekeepingTaskType): string[] {
  return getHousekeepingChecklist(type).flatMap((section) => section.items.map((item) => item.id));
}

export function createInitialChecklistState(type: HousekeepingTaskType): Record<string, boolean> {
  return Object.fromEntries(getChecklistItemIds(type).map((id) => [id, false]));
}
