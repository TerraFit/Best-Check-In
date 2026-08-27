export type HousekeepingIssuePriority = 'low' | 'medium' | 'high' | 'urgent';
export type HousekeepingIssueStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'dismissed';
export interface HousekeepingIssueOption { category: string; types: string[]; }
export interface HousekeepingIssue { id: string; business_id: string; service_session_id: string; housekeeping_task_id: string; room_id: string; room_number?: string | null; employee_id?: string | null; employee_name?: string | null; checklist_item_id: string; checklist_item_label: string; category: string; issue_type: string; other_description?: string | null; description?: string | null; priority: HousekeepingIssuePriority; status: HousekeepingIssueStatus; maintenance_requested: boolean; maintenance_status?: string | null; photo_url?: string | null; reported_at: string; resolved_at?: string | null; verified_at?: string | null; }
const COMMON_OTHER = ['Other'];
export const HOUSEKEEPING_ISSUE_CATALOG: Record<string, HousekeepingIssueOption> = {
  lighting: { category: 'Lighting', types: ['Broken bulb', 'Missing bulb', 'Damaged cable/wire', 'Damaged light fitting', 'Damaged lampshade', 'Broken stand/base', 'Light not working', ...COMMON_OTHER] },
  furniture: { category: 'Furniture & Fixtures', types: ['Stained', 'Scratched', 'Damaged', 'Broken', 'Missing', 'Loose component', ...COMMON_OTHER] },
  bed_linen: { category: 'Bed & Linen', types: ['Stained', 'Torn', 'Damaged', 'Missing', 'Incorrect linen', ...COMMON_OTHER] },
  pillows: { category: 'Pillows & Cushions', types: ['Missing', 'Stained', 'Torn', 'Damaged', 'Filling coming out', 'Incorrect quantity', ...COMMON_OTHER] },
  bathroom: { category: 'Bathroom', types: ['Leaking', 'Blocked', 'Broken', 'Cracked', 'Stained', 'Missing', 'Not working', 'Damaged seal/grout', ...COMMON_OTHER] },
  climate: { category: 'Air Conditioning / Heating / Fan', types: ['Not working', 'Too noisy', 'Leaking', 'Damaged', 'Remote missing', 'Remote not working', 'Filter requires attention', ...COMMON_OTHER] },
  minibar: { category: 'Minibar / Fridge', types: ['Item missing', 'Item damaged', 'Incorrect stock', 'Fridge not cooling', 'Fridge leaking', 'Fridge damaged', 'Dirty', ...COMMON_OTHER] },
  coffee: { category: 'Coffee / Tea Station', types: ['Item missing', 'Item damaged', 'Item stained/dirty', 'Incorrect quantity', 'Appliance not working', 'Cable damaged', ...COMMON_OTHER] },
  doors_windows: { category: 'Doors / Windows / Locks', types: ['Lock not working', 'Handle damaged', 'Door damaged', 'Window damaged', 'Window not closing', 'Window not opening', 'Seal damaged', 'Curtain/blind damaged', ...COMMON_OTHER] },
  safety: { category: 'Safety Equipment', types: ['Missing', 'Damaged', 'Expired', 'Not functioning', 'Incorrect location', ...COMMON_OTHER] },
  electronics: { category: 'TV / Entertainment / Electronics', types: ['Not working', 'Remote missing', 'Remote not working', 'Screen damaged', 'Cable damaged', 'Missing cable', ...COMMON_OTHER] },
  general: { category: 'General', types: ['Dirty', 'Damaged', 'Broken', 'Missing', 'Not working', ...COMMON_OTHER] },
};
export function getIssueOption(itemId: string, label: string): HousekeepingIssueOption {
  const id = itemId.toLowerCase(); const text = label.toLowerCase();
  if (/(lamp|light|bulb|lighting)/.test(id) || /(lamp|light|bulb)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.lighting;
  if (/(pillow|cushion)/.test(id) || /(pillow|cushion)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.pillows;
  if (/(linen|bed|sheet|blanket|duvet)/.test(id) || /(linen|bed|sheet|blanket|duvet)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.bed_linen;
  if (/(furniture|fixture|table|desk|wardrobe|closet|drawer|cabinet)/.test(id) || /(furniture|fixture|table|desk|wardrobe|closet|drawer|cabinet)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.furniture;
  if (/(bath|shower|toilet|sink|basin)/.test(id) || /(bath|shower|toilet|sink|basin)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.bathroom;
  if (/(air|heating|fan|climate|ac)/.test(id) || /(air conditioning|heating|fan)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.climate;
  if (/(fridge|minibar)/.test(id) || /(fridge|minibar)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.minibar;
  if (/(coffee|tea)/.test(id) || /(coffee|tea)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.coffee;
  if (/(door|window|lock|curtain|blind)/.test(id) || /(door|window|lock|curtain|blind)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.doors_windows;
  if (/(safety|fire|extinguisher|smoke|alarm)/.test(id) || /(safety|fire|extinguisher|smoke|alarm)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.safety;
  if (/(tv|television|remote|entertainment|electronic)/.test(id) || /(tv|television|remote|entertainment)/.test(text)) return HOUSEKEEPING_ISSUE_CATALOG.electronics;
  return HOUSEKEEPING_ISSUE_CATALOG.general;
}
