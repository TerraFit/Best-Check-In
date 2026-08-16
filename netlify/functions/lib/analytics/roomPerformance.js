/**
 * Room Performance aggregation using canonical analytics business rules.
 */

import { supabaseFetch } from '../supabase-rest.js';
import {
  overlappingNights,
  daysInclusive,
} from './metrics.js';
import {
  filterEligibleOverlapping,
  buildQualityMeta,
  ANALYTICS_TIMEZONE,
} from './businessRules.js';
import { fetchBusiness, resolveBusinessPlan, fetchBookingsForAnalytics } from './pipeline.js';

export async function buildRoomPerformance({ businessId, dateFrom, dateTo }) {
  const business = await fetchBusiness(businessId);
  if (!business) {
    const err = new Error('Business not found');
    err.statusCode = 404;
    throw err;
  }

  const plan = resolveBusinessPlan(business);
  const { bookings, dateFrom: from, dateTo: to } = await fetchBookingsForAnalytics(
    businessId,
    dateFrom,
    dateTo
  );
  const eligibleRaw = filterEligibleOverlapping(bookings, from, to);
  const quality = buildQualityMeta(bookings, eligibleRaw, from, to);

  let rooms = [];
  try {
    rooms = await supabaseFetch(
      `rooms?business_id=eq.${encodeURIComponent(businessId)}&select=id,room_number,room_name,room_type,active,sort_order&order=sort_order.asc.nullslast,room_number.asc`
    );
    if (!Array.isArray(rooms)) rooms = [];
  } catch {
    rooms = [];
  }

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const days = daysInclusive(from, to);
  const propertyNights = eligibleRaw.reduce(
    (s, b) => s + overlappingNights(b, from, to),
    0
  );
  const propertyOccupancyRate =
    business.total_rooms > 0 && days > 0
      ? Math.min(100, (propertyNights / (business.total_rooms * days)) * 100)
      : 0;

  const byRoom = new Map();

  eligibleRaw.forEach((b) => {
    if (!b.room_id) return;
    const nights = overlappingNights(b, from, to);
    if (nights <= 0) return;

    let row = byRoom.get(b.room_id);
    if (!row) {
      const catalogue = roomById.get(b.room_id);
      const snapshotName = (b.room_name || '').toString().trim();
      const snapshotNumber =
        b.room_number !== null && b.room_number !== undefined && b.room_number !== ''
          ? String(b.room_number)
          : null;
      row = {
        roomId: b.room_id,
        roomNumber: snapshotNumber || (catalogue ? String(catalogue.room_number) : null),
        roomName:
          snapshotName ||
          (catalogue ? catalogue.room_name || String(catalogue.room_number) : 'Unknown room'),
        roomType: catalogue?.room_type || null,
        labelSource: snapshotName || snapshotNumber ? 'snapshot' : 'current',
        stays: 0,
        roomNightsSold: 0,
      };
      byRoom.set(b.room_id, row);
    }
    row.stays += 1;
    row.roomNightsSold += nights;
    if (b.room_name && row.labelSource !== 'snapshot') {
      row.roomName = String(b.room_name).trim();
      row.labelSource = 'snapshot';
    }
  });

  rooms.forEach((r) => {
    if (r.active === false) return;
    if (byRoom.has(r.id)) return;
    byRoom.set(r.id, {
      roomId: r.id,
      roomNumber: r.room_number != null ? String(r.room_number) : null,
      roomName: r.room_name || String(r.room_number),
      roomType: r.room_type || null,
      labelSource: 'current',
      stays: 0,
      roomNightsSold: 0,
    });
  });

  const roomsOut = Array.from(byRoom.values()).map((r) => {
    const available = days;
    const utilisation =
      available > 0
        ? Math.round(Math.min(100, (r.roomNightsSold / available) * 100) * 100) / 100
        : 0;
    const share =
      propertyNights > 0
        ? Math.round((r.roomNightsSold / propertyNights) * 10000) / 100
        : 0;
    const averageStay =
      r.stays > 0 ? Math.round((r.roomNightsSold / r.stays) * 100) / 100 : 0;
    const vsPropertyPp =
      Math.round((utilisation - propertyOccupancyRate) * 100) / 100;

    return {
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      roomName: r.roomName,
      roomType: r.roomType,
      labelSource: r.labelSource,
      stays: r.stays,
      roomNightsSold: r.roomNightsSold,
      roomNightsAvailable: available,
      utilisation,
      shareOfPropertyNights: share,
      averageStay,
      vsPropertyUtilisationPp: vsPropertyPp,
      performanceBand:
        r.stays === 0
          ? 'no_data'
          : vsPropertyPp >= 5
            ? 'above'
            : vsPropertyPp <= -5
              ? 'below'
              : 'average',
      meaningful: r.stays >= 3 || r.roomNightsSold >= 7,
    };
  });

  roomsOut.sort((a, b) => {
    if (b.roomNightsSold !== a.roomNightsSold) return b.roomNightsSold - a.roomNightsSold;
    if (b.stays !== a.stays) return b.stays - a.stays;
    return String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), undefined, {
      numeric: true,
    });
  });

  const withData = roomsOut.filter((r) => r.stays > 0);
  const rankings = {
    highestUtilisation: [...withData]
      .filter((r) => r.meaningful)
      .sort((a, b) => b.utilisation - a.utilisation || b.roomNightsSold - a.roomNightsSold)
      .slice(0, 5)
      .map((r) => r.roomId),
    lowestUtilisation: [...withData]
      .filter((r) => r.meaningful)
      .sort((a, b) => a.utilisation - b.utilisation || a.roomNightsSold - b.roomNightsSold)
      .slice(0, 5)
      .map((r) => r.roomId),
    mostStays: [...withData]
      .sort((a, b) => b.stays - a.stays || b.roomNightsSold - a.roomNightsSold)
      .slice(0, 5)
      .map((r) => r.roomId),
    mostNights: [...withData]
      .sort((a, b) => b.roomNightsSold - a.roomNightsSold || b.stays - a.stays)
      .slice(0, 5)
      .map((r) => r.roomId),
    longestAverageStay: [...withData]
      .filter((r) => r.meaningful)
      .sort((a, b) => b.averageStay - a.averageStay || b.stays - a.stays)
      .slice(0, 5)
      .map((r) => r.roomId),
  };

  // Structured insight codes for client-side i18n (calculations unchanged)
  const insights = [];
  const top = withData.find((r) => rankings.highestUtilisation[0] === r.roomId);
  if (top && top.meaningful) {
    const propertyPct = Math.round(propertyOccupancyRate * 100) / 100;
    const signed = `${top.vsPropertyUtilisationPp >= 0 ? '+' : ''}${top.vsPropertyUtilisationPp}`;
    insights.push({
      level: 'fact',
      code: 'top_vs_property',
      params: {
        room: top.roomName,
        utilisation: top.utilisation,
        property: propertyPct,
        signed,
      },
      text: `${top.roomName} has ${top.utilisation}% utilisation versus property ${propertyPct}% (${signed} percentage points).`,
    });
  }
  const low = withData.find((r) => rankings.lowestUtilisation[0] === r.roomId);
  if (low && low.meaningful && low.roomId !== top?.roomId) {
    insights.push({
      level: 'fact',
      code: 'lowest_util',
      params: { room: low.roomName, utilisation: low.utilisation },
      text: `${low.roomName} is among the lowest utilisation rooms at ${low.utilisation}% in this period.`,
    });
  }
  if (quality.allocationCoveragePct < 100) {
    insights.push({
      level: 'fact',
      code: 'allocation_basis',
      params: { pct: quality.allocationCoveragePct },
      text: `Room utilisation is based on ${quality.allocationCoveragePct}% of eligible stays with room allocation.`,
    });
  }

  return {
    meta: {
      businessId,
      businessName: business.trading_name || business.registered_name || null,
      dateFrom: from,
      dateTo: to,
      plan,
      totalRooms: business.total_rooms || rooms.length || 1,
      generatedAt: new Date().toISOString(),
      timezone: ANALYTICS_TIMEZONE,
      quality,
      propertyRoomNightsSold: propertyNights,
      propertyOccupancyRate: Math.round(propertyOccupancyRate * 100) / 100,
      occupancyModel: 'mvp_total_rooms',
      note:
        'Utilisation is not maintenance-adjusted. Historical room labels prefer booking snapshot fields.',
    },
    rooms: roomsOut,
    rankings,
    insights,
  };
}
