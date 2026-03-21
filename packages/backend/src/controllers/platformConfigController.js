import PlatformConfig from '../models/PlatformConfig.js';
import { invalidateConfigCache } from '../utils/pricingEngine.js';

/**
 * GET /admin/platform-config/pricing
 * Returns the current pricing configuration.
 */
export async function getPricingConfig(req, res) {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({ config });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pricing config', error: err.message });
  }
}

/**
 * PUT /admin/platform-config/pricing
 * Updates pricing configuration (markup, service fee, commission, delivery margin).
 */
export async function updatePricingConfig(req, res) {
  try {
    const { markup, serviceFee, commission, deliveryMargin } = req.body;

    const update = {};

    // ─── Validate & set Markup ──────────────────────────────────────────
    if (markup !== undefined) {
      if (markup.type && !['fixed', 'percent'].includes(markup.type)) {
        return res.status(400).json({ message: 'Markup type must be "fixed" or "percent"' });
      }
      if (markup.value !== undefined && markup.value < 0) {
        return res.status(400).json({ message: 'Markup value cannot be negative' });
      }
      update.markup = markup;
    }

    // ─── Validate & set Service Fee ─────────────────────────────────────
    if (serviceFee !== undefined) {
      if (serviceFee.type && !['fixed', 'percent'].includes(serviceFee.type)) {
        return res.status(400).json({ message: 'Service fee type must be "fixed" or "percent"' });
      }
      if (serviceFee.value !== undefined && serviceFee.value < 0) {
        return res.status(400).json({ message: 'Service fee value cannot be negative' });
      }
      update.serviceFee = serviceFee;
    }

    // ─── Validate & set Commission ──────────────────────────────────────
    if (commission !== undefined) {
      const { selfDeliveryRate, tastrDeliveryRate, tastrDeliveryMin, tastrDeliveryMax } = commission;

      if (selfDeliveryRate !== undefined && (selfDeliveryRate < 0 || selfDeliveryRate > 100)) {
        return res.status(400).json({ message: 'Self delivery commission must be 0-100%' });
      }
      if (tastrDeliveryRate !== undefined && (tastrDeliveryRate < 0 || tastrDeliveryRate > 100)) {
        return res.status(400).json({ message: 'Tastr delivery commission must be 0-100%' });
      }
      if (tastrDeliveryMin !== undefined && tastrDeliveryMax !== undefined && tastrDeliveryMin > tastrDeliveryMax) {
        return res.status(400).json({ message: 'Min commission cannot exceed max' });
      }

      // Validate overrides
      if (commission.overrides) {
        for (const ov of commission.overrides) {
          if (!ov.restaurantId) {
            return res.status(400).json({ message: 'Each override must have a restaurantId' });
          }
          if (ov.commissionRate < 0 || ov.commissionRate > 100) {
            return res.status(400).json({ message: `Override rate for ${ov.name} must be 0-100%` });
          }
        }
      }

      update.commission = commission;
    }

    // ─── Validate & set Delivery Margin ─────────────────────────────────
    if (deliveryMargin !== undefined) {
      if (deliveryMargin.driverPercent < 0 || deliveryMargin.driverPercent > 100) {
        return res.status(400).json({ message: 'Driver percent must be 0-100' });
      }
      update.deliveryMargin = deliveryMargin;
    }

    const config = await PlatformConfig.updateConfig(update);

    // Invalidate pricing engine cache so next order uses new config
    invalidateConfigCache();

    res.json({ config, message: 'Pricing configuration updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update pricing config', error: err.message });
  }
}
