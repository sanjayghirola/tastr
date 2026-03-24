/**
 * PRICING ENGINE — v2
 *
 * Called at:
 *  1. Cart fetch / checkout preview — to show correct totals
 *  2. Order placement — to stamp final amounts onto the Order record
 *
 * All amounts in PENCE (integer). No floating point money.
 */

import PlatformConfig from '../models/PlatformConfig.js';
import { haversineKm } from '../services/directions.js';

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

async function getConfig() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  _cache = await PlatformConfig.getConfig();
  _cacheAt = Date.now();
  return _cache;
}

export function invalidateConfigCache() {
  _cache = null;
}

/**
 * Calculate the delivery fee based on distance tiers, surge, and express.
 *
 * @param {Object} params
 * @param {Object} params.restaurantAddress  - { lat, lng }
 * @param {Object} params.deliveryAddress    - { lat, lng }
 * @param {Number} params.restaurantFee      - restaurant's own delivery fee (pence), used as fallback
 * @param {String} params.deliveryMethod     - 'standard' | 'express'
 * @param {Number} params.subtotal           - order subtotal in pence (for free delivery check)
 * @param {Boolean} params.isSurgeActive     - whether surge conditions are met
 * @returns {Object} { deliveryFee, distanceKm, tierUsed, surgeApplied, expressApplied, freeDelivery }
 */
export async function calculateDeliveryFee({
  restaurantAddress,
  deliveryAddress,
  restaurantFee = 0,
  deliveryMethod = 'standard',
  subtotal = 0,
  isSurgeActive = false,
}) {
  const cfg = await getConfig();
  const dlv = cfg.delivery || {};

  const result = {
    deliveryFee: 0,
    distanceKm: 0,
    tierUsed: null,
    surgeApplied: false,
    surgeMultiplier: 1,
    expressApplied: false,
    expressExtraFee: 0,
    freeDelivery: false,
  };

  // ─── Calculate distance ──────────────────────────────────────────────
  if (restaurantAddress?.lat && deliveryAddress?.lat) {
    result.distanceKm = haversineKm(
      restaurantAddress.lat, restaurantAddress.lng,
      deliveryAddress.lat, deliveryAddress.lng
    );
  }

  // ─── Find matching distance tier ─────────────────────────────────────
  const tiers = dlv.tiers || [];
  let baseFee = dlv.platformBaseFee || restaurantFee || 199;

  if (tiers.length > 0 && result.distanceKm > 0) {
    const matchedTier = tiers.find(t =>
      result.distanceKm >= t.minKm && result.distanceKm < t.maxKm
    );
    if (matchedTier) {
      baseFee = matchedTier.feePence;
      result.tierUsed = matchedTier;
    } else {
      // Beyond all tiers — use the highest tier + extra per km
      const maxTier = tiers.reduce((a, b) => (a.maxKm > b.maxKm ? a : b), tiers[0]);
      const extraKm = Math.max(0, result.distanceKm - maxTier.maxKm);
      baseFee = maxTier.feePence + Math.round(extraKm * 50); // 50p per extra km
      result.tierUsed = { ...maxTier, extraKm };
    }
  }

  // ─── Percentage add-on ───────────────────────────────────────────────
  if (dlv.platformFeePercent > 0) {
    baseFee += Math.round(subtotal * dlv.platformFeePercent / 100);
  }

  result.deliveryFee = baseFee;

  // ─── Surge pricing ───────────────────────────────────────────────────
  if (dlv.surgeEnabled && isSurgeActive) {
    const multiplier = dlv.surgeMultiplier || 1.5;
    result.deliveryFee = Math.round(result.deliveryFee * multiplier);
    result.surgeApplied = true;
    result.surgeMultiplier = multiplier;
  }

  // ─── Express delivery surcharge ──────────────────────────────────────
  if (deliveryMethod === 'express' && dlv.expressEnabled) {
    const extraFee = dlv.expressExtraFee || 200;
    result.deliveryFee += extraFee;
    result.expressApplied = true;
    result.expressExtraFee = extraFee;
  }

  // ─── Free delivery threshold ─────────────────────────────────────────
  if (dlv.freeDeliveryThreshold > 0 && subtotal >= dlv.freeDeliveryThreshold) {
    result.deliveryFee = 0;
    result.freeDelivery = true;
  }

  return result;
}

/**
 * Calculate all platform pricing for an order.
 *
 * @param {Object} params
 * @param {Number} params.itemsSubtotal   - sum of (item.price * qty) in pence
 * @param {Number} params.deliveryFee     - delivery fee charged to customer (pence)
 * @param {String} params.deliveryModel   - 'own' or 'tastr'
 * @param {String} params.restaurantId    - for per-restaurant commission overrides
 * @param {Number} params.itemCount       - number of unique line items
 * @returns {Object} pricing breakdown
 */
export async function calculatePricing({
  itemsSubtotal,
  deliveryFee = 0,
  deliveryModel = 'tastr',
  restaurantId = null,
  itemCount = 1,
}) {
  const cfg = await getConfig();
  const result = {
    markupAmount: 0,
    markupType: null,
    markupValue: 0,
    displaySubtotal: itemsSubtotal,

    serviceFeeAmount: 0,
    serviceFeeType: null,
    serviceFeeValue: 0,

    commissionRate: 0,
    commissionAmount: 0,
    isCommissionOverride: false,

    deliveryFeeTotal: deliveryFee,
    deliveryFeeDriver: 0,
    deliveryFeePlatform: 0,

    restaurantPayout: 0,
    driverPayout: 0,
    platformRevenue: 0,
    deliveryModel,
  };

  // ─── 1. Markup ──────────────────────────────────────────────────────
  if (cfg.markup?.enabled) {
    result.markupType = cfg.markup.type;
    result.markupValue = cfg.markup.value;
    if (cfg.markup.type === 'fixed') {
      result.markupAmount = cfg.markup.value * itemCount;
    } else {
      result.markupAmount = Math.round(itemsSubtotal * cfg.markup.value / 100);
    }
    result.displaySubtotal = itemsSubtotal + result.markupAmount;
  }

  // ─── 2. Service Fee ─────────────────────────────────────────────────
  if (cfg.serviceFee?.enabled) {
    result.serviceFeeType = cfg.serviceFee.type;
    result.serviceFeeValue = cfg.serviceFee.value;
    if (cfg.serviceFee.type === 'fixed') {
      result.serviceFeeAmount = cfg.serviceFee.value;
    } else {
      result.serviceFeeAmount = Math.round(result.displaySubtotal * cfg.serviceFee.value / 100);
    }
  }

  // ─── 3. Commission ──────────────────────────────────────────────────
  const override = restaurantId && cfg.commission?.overrides?.find(
    o => o.restaurantId?.toString() === restaurantId.toString()
  );
  if (override) {
    result.commissionRate = override.commissionRate;
    result.isCommissionOverride = true;
  } else if (deliveryModel === 'own') {
    result.commissionRate = cfg.commission?.selfDeliveryRate ?? 10;
  } else {
    result.commissionRate = cfg.commission?.tastrDeliveryRate ?? 18;
  }
  result.commissionAmount = Math.round(result.displaySubtotal * result.commissionRate / 100);

  // ─── 4. Delivery Fee Split ──────────────────────────────────────────
  if (deliveryModel === 'own') {
    result.deliveryFeeDriver = 0;
    result.deliveryFeePlatform = 0;
  } else {
    const driverPct = cfg.deliveryMargin?.driverPercent ?? 70;
    result.deliveryFeeDriver = Math.round(deliveryFee * driverPct / 100);
    result.deliveryFeePlatform = deliveryFee - result.deliveryFeeDriver;
  }

  // ─── 5. Settlement Calculations ─────────────────────────────────────
  if (deliveryModel === 'own') {
    result.restaurantPayout = result.displaySubtotal - result.commissionAmount + deliveryFee;
    result.driverPayout = 0;
  } else {
    result.restaurantPayout = result.displaySubtotal - result.commissionAmount;
    result.driverPayout = result.deliveryFeeDriver;
  }

  result.platformRevenue = result.markupAmount
    + result.serviceFeeAmount
    + result.commissionAmount
    + result.deliveryFeePlatform;

  return result;
}

export default { calculatePricing, calculateDeliveryFee, invalidateConfigCache };