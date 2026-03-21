import { notify } from '../services/notificationService.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { TRANSACTION_TYPE } from '@tastr/shared';

const REFERRAL_REWARD_PENCE = 500; // £5 per successful referral

// ─── POST /api/users/referral/apply ──────────────────────────────────────────
// Called after registration — apply referral code from another user
export async function applyReferralCode(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Referral code required' });

    const me = await User.findById(req.user._id);
    if (me.referredBy) return res.status(400).json({ message: 'Referral code already applied' });

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) return res.status(404).json({ message: 'Invalid referral code' });
    if (referrer._id.equals(req.user._id)) return res.status(400).json({ message: 'Cannot use your own code' });

    me.referredBy = referrer._id;
    await me.save();

    res.json({ success: true, message: 'Referral code applied! Your friend will be rewarded on your first order.' });
  } catch (err) { next(err); }
}

// ─── GET /api/users/referral/stats ───────────────────────────────────────────
export async function getReferralStats(req, res, next) {
  try {
    const me = await User.findById(req.user._id).select('referralCode').lean();
    const referred = await User.find({ referredBy: req.user._id }).select('name createdAt referralRewarded').lean();
    const totalEarned = referred.filter(u => u.referralRewarded).length * REFERRAL_REWARD_PENCE;
    res.json({
      success: true,
      referralCode: me.referralCode,
      referralLink: `${process.env.CUSTOMER_URL || 'https://tastr.app'}/signup?ref=${me.referralCode}`,
      stats: {
        invited:    referred.length,
        joined:     referred.filter(u => u.referralRewarded).length,
        totalEarned,
      },
    });
  } catch (err) { next(err); }
}

// ─── Called internally after first order completes ───────────────────────────
export async function processReferralReward(userId) {
  try {
    const user = await User.findById(userId);
    if (!user?.referredBy || user.referralRewarded) return;

    // Credit referrer wallet
    let wallet = await Wallet.findOne({ userId: user.referredBy });
    if (!wallet) wallet = await Wallet.create({ userId: user.referredBy, balance: 0, transactions: [] });
    await wallet.credit(REFERRAL_REWARD_PENCE, `Referral reward — ${user.name} placed first order`, {
      type: TRANSACTION_TYPE.REFERRAL,
    });

    user.referralRewarded = true;
    await user.save();
  } catch (err) {
    // Non-fatal
    console.error('Referral reward error:', err.message);
  }
}
