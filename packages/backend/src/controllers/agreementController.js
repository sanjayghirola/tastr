import Agreement from '../models/Agreement.js';
import AgreementAcceptance from '../models/AgreementAcceptance.js';

/**
 * GET /agreements/:type
 * Returns the active agreement for the given type ('restaurant' or 'driver').
 */
export async function getActiveAgreement(req, res) {
  try {
    const { type } = req.params;
    if (!['restaurant', 'driver'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "restaurant" or "driver"' });
    }

    const agreement = await Agreement.findOne({ type, isActive: true }).sort({ createdAt: -1 });
    if (!agreement) {
      return res.json({ agreement: null });
    }

    res.json({ agreement });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch agreement', error: err.message });
  }
}

/**
 * POST /agreements/:type/accept
 * Records acceptance of an agreement.
 * Body: { entityId } — the restaurantId or driverId
 */
export async function acceptAgreement(req, res) {
  try {
    const { type } = req.params;
    const { entityId } = req.body;
    const userId = req.user?._id || req.body.userId;

    if (!['restaurant', 'driver'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "restaurant" or "driver"' });
    }

    const agreement = await Agreement.findOne({ type, isActive: true }).sort({ createdAt: -1 });
    if (!agreement) {
      return res.status(404).json({ message: 'No active agreement found' });
    }

    // Record acceptance
    const acceptance = await AgreementAcceptance.create({
      agreementId: agreement._id,
      userId,
      entityType: type,
      entityId: entityId || userId,
      version: agreement.version,
      acceptedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: `${type} agreement accepted`,
      acceptance: {
        version: agreement.version,
        acceptedAt: acceptance.acceptedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record agreement acceptance', error: err.message });
  }
}

/**
 * POST /admin/agreements
 * Creates a new agreement version (admin only).
 * Body: { type, title, content, version }
 */
export async function createAgreement(req, res) {
  try {
    const { type, title, content, version } = req.body;

    // Deactivate previous agreements of this type
    await Agreement.updateMany({ type, isActive: true }, { isActive: false });

    const agreement = await Agreement.create({ type, title, content, version, isActive: true });

    res.status(201).json({ agreement, message: 'Agreement created and set as active' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create agreement', error: err.message });
  }
}

/**
 * GET /admin/agreements/:type/acceptances
 * Lists all acceptance records for a given agreement type (admin view).
 */
export async function listAcceptances(req, res) {
  try {
    const { type } = req.params;
    const acceptances = await AgreementAcceptance.find({ entityType: type })
      .populate('userId', 'name email')
      .sort({ acceptedAt: -1 })
      .limit(200);

    res.json({ acceptances });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch acceptances', error: err.message });
  }
}
