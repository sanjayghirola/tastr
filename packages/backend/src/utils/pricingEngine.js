/**
 * PRICING ENGINE
 *
 * Called at two points:
 *  1. Cart fetch / checkout preview — to show the customer correct totals
 *  2. Order placement — to stamp final amounts onto the order record
 *
 * All amounts in PENCE (integer). No floating point money.
 */

import PlatformConfig from '../models/PlatformConfig.js';

// Cache config for 60s to avoid hitting DB on every cart fetch
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
 * Calculate all platform pricing for an order.
 *
 * @param {Object} params
 * @param {Number} params.itemsSubtotal   - sum of (item.price * qty) in pence (restaurant's base prices)
 * @param {Number} params.deliveryFee     - delivery fee charged to customer (pence)
 * @param {String} params.deliveryModel   - 'own' or 'tastr'
 * @param {String} params.restaurantId    - for per-restaurant commission overrides
 * @param {Number} params.itemCount       - number of unique line items (for fixed markup)
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
    // Markup
    markupAmount: 0,
    markupType: null,
    markupValue: 0,
    displaySubtotal: itemsSubtotal, // what the customer sees as "items total"

    // Service fee
    serviceFeeAmount: 0,
    serviceFeeType: null,
    serviceFeeValue: 0,

    // Commission
    commissionRate: 0,
    commissionAmount: 0,
    isCommissionOverride: false,

    // Delivery split
    deliveryFeeTotal: deliveryFee,
    deliveryFeeDriver: 0,
    deliveryFeePlatform: 0,

    // Settlements
    restaurantPayout: 0,
    driverPayout: 0,
    platformRevenue: 0,

    deliveryModel,
  };

  // ─── 1. Markup ──────────────────────────────────────────────────────────
  if (cfg.markup?.enabled) {
    result.markupType = cfg.markup.type;
    result.markupValue = cfg.markup.value;

    if (cfg.markup.type === 'fixed') {
      // Fixed markup per item: e.g. 100 pence (£1) added per line item
      result.markupAmount = cfg.markup.value * itemCount;
    } else {
      // Percent markup: e.g. 10% of base subtotal
      result.markupAmount = Math.round(itemsSubtotal * cfg.markup.value / 100);
    }

    // Display subtotal includes markup (customer never sees "markup" separately)
    result.displaySubtotal = itemsSubtotal + result.markupAmount;
  }

  // ─── 2. Service Fee ─────────────────────────────────────────────────────
  if (cfg.serviceFee?.enabled) {
    result.serviceFeeType = cfg.serviceFee.type;
    result.serviceFeeValue = cfg.serviceFee.value;

    if (cfg.serviceFee.type === 'fixed') {
      result.serviceFeeAmount = cfg.serviceFee.value;
    } else {
      result.serviceFeeAmount = Math.round(result.displaySubtotal * cfg.serviceFee.value / 100);
    }
  }

  // ─── 3. Commission ──────────────────────────────────────────────────────
  // Check for per-restaurant override first
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

  // Commission is calculated on the display subtotal (includes markup)
  result.commissionAmount = Math.round(result.displaySubtotal * result.commissionRate / 100);

  // ─── 4. Delivery Fee Split ──────────────────────────────────────────────
  if (deliveryModel === 'own') {
    // Self delivery: restaurant keeps 100% of delivery fee
    result.deliveryFeeDriver = 0;
    result.deliveryFeePlatform = 0;
  } else {
    // Tastr delivery: split between driver and platform
    const driverPct = cfg.deliveryMargin?.driverPercent ?? 70;
    result.deliveryFeeDriver = Math.round(deliveryFee * driverPct / 100);
    result.deliveryFeePlatform = deliveryFee - result.deliveryFeeDriver;
  }

  // ─── 5. Settlement Calculations ─────────────────────────────────────────
  if (deliveryModel === 'own') {
    // Restaurant gets: display subtotal - commission + full delivery fee
    result.restaurantPayout = result.displaySubtotal - result.commissionAmount + deliveryFee;
    result.driverPayout = 0;
  } else {
    // Restaurant gets: display subtotal - commission (no delivery fee)
    result.restaurantPayout = result.displaySubtotal - result.commissionAmount;
    result.driverPayout = result.deliveryFeeDriver;
  }

  // Platform revenue = markup + service fee + commission + delivery margin
  result.platformRevenue = result.markupAmount
    + result.serviceFeeAmount
    + result.commissionAmount
    + result.deliveryFeePlatform;

  return result;
}

/**
 * Enrich a cart response with pricing info for the customer.
 * Modifies item prices to include markup (invisible to customer).
 */
export async function enrichCartWithPricing(cart, restaurant) {
  if (!cart || !cart.items?.length) return cart;

  const deliveryModel = restaurant?.deliveryMode || 'tastr';
  const deliveryFee = restaurant?.deliveryFee || 0;

  // Calculate base subtotal from items
  const baseSubtotal = cart.items.reduce((sum, item) => {
    const toppingsCost = (item.selectedToppings || []).reduce((t, g) => t + (g.price || 0), 0);
    return sum + (item.price + toppingsCost) * item.quantity;
  }, 0);

  const pricing = await calculatePricing({
    itemsSubtotal: baseSubtotal,
    deliveryFee,
    deliveryModel,
    restaurantId: restaurant?._id,
    itemCount: cart.items.length,
  });

  // Attach pricing to cart response
  cart.subtotal = pricing.displaySubtotal; // includes markup
  cart.serviceFee = pricing.serviceFeeAmount;
  cart.markupTotal = pricing.markupAmount;

  return cart;
}

export default { calculatePricing, enrichCartWithPricing, invalidateConfigCache };
