import RoomSettings from './RoomSettings';

interface BusinessSummary {
  id?: string;
  trading_name?: string;
  slogan?: string;
  logo_url?: string;
  phone?: string;
  total_rooms?: number;
}

interface RoomsDashboardTabProps {
  businessOverride?: BusinessSummary | null;
}

/**
 * Dashboard embedding for the Rooms tab.
 *
 * RoomSettings is the single source of truth for the licensed-capacity
 * presentation and room list. Keeping the dashboard wrapper free of a
 * second capacity card prevents the same "Chambres sous licence" value
 * from being rendered twice when the tab is embedded in BusinessDashboard.
 *
 * businessOverride remains part of the public props contract because
 * BusinessDashboard supplies the already-loaded business profile.
 */
export default function RoomsDashboardTab({ businessOverride: _businessOverride = null }: RoomsDashboardTabProps) {
  return <RoomSettings />;
}
