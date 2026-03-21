/**
 * Google Directions API – calculate ETA between two lat/lng points
 */

const DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @returns {Promise<{ durationSeconds: number, durationText: string, distanceMetres: number, distanceText: string } | null>}
 */
export async function getETA(origin, destination) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url =
    `${DIRECTIONS_BASE}` +
    `?origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    `&mode=driving` +
    `&departure_time=now` +
    `&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const leg = data?.routes?.[0]?.legs?.[0];
  if (!leg) return null;

  return {
    durationSeconds: leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0,
    durationText:    leg.duration_in_traffic?.text  ?? leg.duration?.text  ?? '',
    distanceMetres:  leg.distance?.value ?? 0,
    distanceText:    leg.distance?.text  ?? '',
    arrivalTs:       Date.now() + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0) * 1000,
  };
}

/**
 * Calculate straight-line distance in km between two points (Haversine)
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
