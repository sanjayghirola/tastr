import { logger } from '../utils/logger.js';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode a postcode/address string → { lat, lng, formattedAddress }
 */
export async function geocodeAddress(addressString) {
  if (!GOOGLE_MAPS_KEY) {
    logger.warn('GOOGLE_MAPS_API_KEY not set — skipping geocode');
    return { lat: null, lng: null, formattedAddress: addressString };
  }

  try {
    const encoded  = encodeURIComponent(addressString);
    const url      = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_KEY}`;
    const response = await fetch(url);
    const json     = await response.json();

    if (json.status !== 'OK' || !json.results.length) {
      logger.warn(`Geocode failed for "${addressString}": ${json.status}`);
      return { lat: null, lng: null, formattedAddress: addressString };
    }

    const loc = json.results[0].geometry.location;
    return {
      lat:              loc.lat,
      lng:              loc.lng,
      formattedAddress: json.results[0].formatted_address,
    };
  } catch (err) {
    logger.warn(`Geocode error: ${err.message}`);
    return { lat: null, lng: null, formattedAddress: addressString };
  }
}
