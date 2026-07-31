// Deprecated: Rooms nav routes directly to /business/rooms (Room Settings).
// Kept as a safety redirect if anything still imports this module.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function RoomsTab(_props: { businessId?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/business/rooms', { replace: true });
  }, [navigate]);
  return null;
}

export default RoomsTab;
