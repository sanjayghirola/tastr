import PlatformConfig from '../models/PlatformConfig.js';
import { invalidateConfigCache } from '../utils/pricingEngine.js';

/**
 * GET /admin/platform-config/pricing
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
 */
export async function updatePricingConfig(req, res) {
  try {
    const { markup, serviceFee, commission, deliveryMargin } = req.body;
    const update = {};

    if (markup !== undefined) {
      if (markup.type && !['fixed', 'percent'].includes(markup.type)) {
        return res.status(400).json({ message: 'Markup type must be "fixed" or "percent"' });
      }
      update.markup = markup;
    }
    if (serviceFee !== undefined) {
      if (serviceFee.type && !['fixed', 'percent'].includes(serviceFee.type)) {
        return res.status(400).json({ message: 'Service fee type must be "fixed" or "percent"' });
      }
      update.serviceFee = serviceFee;
    }
    if (commission !== undefined) {
      if (commission.overrides) {
        for (const ov of commission.overrides) {
          if (!ov.restaurantId) return res.status(400).json({ message: 'Each override must have a restaurantId' });
          if (ov.commissionRate < 0 || ov.commissionRate > 100) return res.status(400).json({ message: 'Override rate must be 0-100%' });
        }
      }
      update.commission = commission;
    }
    if (deliveryMargin !== undefined) {
      if (deliveryMargin.driverPercent < 0 || deliveryMargin.driverPercent > 100) {
        return res.status(400).json({ message: 'Driver percent must be 0-100' });
      }
      update.deliveryMargin = deliveryMargin;
    }

    const config = await PlatformConfig.updateConfig(update);
    invalidateConfigCache();
    res.json({ config, message: 'Pricing configuration updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update pricing config', error: err.message });
  }
}

/**
 * GET /admin/platform-config/delivery
 */
export async function getDeliveryConfig(req, res) {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({ config: config.delivery || {} });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch delivery config', error: err.message });
  }
}

/**
 * PUT /admin/platform-config/delivery
 */
export async function updateDeliveryConfig(req, res) {
  try {
    const {
      platformBaseFee, platformFeePercent, freeDeliveryThreshold,
      minOrderPlatform, estimatedDeliveryMin, estimatedDeliveryMax,
      tiers, surgeEnabled, surgeMultiplier, surgeTriggerMinutes,
      expressEnabled, expressExtraFee,
    } = req.body;

    const delivery = {};

    if (platformBaseFee !== undefined)       delivery['delivery.platformBaseFee'] = platformBaseFee;
    if (platformFeePercent !== undefined)     delivery['delivery.platformFeePercent'] = platformFeePercent;
    if (freeDeliveryThreshold !== undefined)  delivery['delivery.freeDeliveryThreshold'] = freeDeliveryThreshold;
    if (minOrderPlatform !== undefined)       delivery['delivery.minOrderPlatform'] = minOrderPlatform;
    if (estimatedDeliveryMin !== undefined)   delivery['delivery.estimatedDeliveryMin'] = estimatedDeliveryMin;
    if (estimatedDeliveryMax !== undefined)   delivery['delivery.estimatedDeliveryMax'] = estimatedDeliveryMax;
    if (surgeEnabled !== undefined)           delivery['delivery.surgeEnabled'] = surgeEnabled;
    if (surgeMultiplier !== undefined)        delivery['delivery.surgeMultiplier'] = surgeMultiplier;
    if (surgeTriggerMinutes !== undefined)    delivery['delivery.surgeTriggerMinutes'] = surgeTriggerMinutes;
    if (expressEnabled !== undefined)         delivery['delivery.expressEnabled'] = expressEnabled;
    if (expressExtraFee !== undefined)        delivery['delivery.expressExtraFee'] = expressExtraFee;
    if (tiers !== undefined)                  delivery['delivery.tiers'] = tiers;

    const config = await PlatformConfig.findOneAndUpdate(
      { key: 'pricing' },
      { $set: delivery },
      { new: true, upsert: true }
    );

    invalidateConfigCache();
    res.json({ config: config.delivery, message: 'Delivery pricing updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update delivery config', error: err.message });
  }
}