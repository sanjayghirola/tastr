import { notify } from '../services/notificationService.js';
import StudentVerification from '../models/StudentVerification.js';
import User from '../models/User.js';
import { uploadStudentDoc } from '../config/cloudinary.js';
import { logger } from '../utils/logger.js';
import { setEx, getKey, delKey } from '../config/redis.js';
import bcrypt from 'bcryptjs';
import { sendMail } from '../services/email.js';

// ─── Student Email OTP helpers ───────────────────────────────────────────────
const studentOtpKey = (email) => `student-otp:${email.toLowerCase()}`;

// POST /api/student-verification/send-otp
export async function sendStudentEmailOtp(req, res, next) {
  try {
    const { studentEmail } = req.body;
    if (!studentEmail) return res.status(400).json({ success: false, message: 'Student email is required' });

    const studentEmailRegex = /^[^\s@]+@([^\s@]+\.(ac\.uk|edu|ac\.[a-z]{2}|edu\.[a-z]{2}))$/i;
    if (!studentEmailRegex.test(studentEmail)) {
      return res.status(400).json({ success: false, message: 'Please use a valid student email (.ac.uk or .edu)' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);
    await setEx(studentOtpKey(studentEmail), 600, { hash }); // 10 min expiry

    // Send OTP via email
    try {
      await sendMail({
        to: studentEmail,
        subject: 'Tastr — Student Email Verification Code',
        text: `Your Tastr student verification code is: ${otp}\n\nThis code is valid for 10 minutes. Do not share this code with anyone.`,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <h2 style="color:#C18B3C;">Tastr Student Verification</h2>
          <p>Your verification code is:</p>
          <div style="background:#FAF7F2;border:2px solid #C18B3C;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#C18B3C;">${otp}</span>
          </div>
          <p style="color:#666;font-size:13px;">This code is valid for 10 minutes.</p>
        </div>`,
      });
    } catch (emailErr) {
      logger.warn('Student OTP email failed:', emailErr.message);
      // In development, log to console
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[DEV STUDENT OTP] ${studentEmail} → ${otp}`);
      }
    }

    res.json({ success: true, message: 'Verification code sent to your student email' });
  } catch (err) { next(err); }
}

// POST /api/student-verification/verify-otp
export async function verifyStudentEmailOtp(req, res, next) {
  try {
    const { studentEmail, otp } = req.body;
    if (!studentEmail || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const stored = await getKey(studentOtpKey(studentEmail));
    if (!stored) return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });

    const valid = await bcrypt.compare(otp, stored.hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    await delKey(studentOtpKey(studentEmail));
    res.json({ success: true, message: 'Email verified successfully', emailVerified: true });
  } catch (err) { next(err); }
}

// POST /api/student-verification/submit
export async function submitVerification(req, res, next) {
  try {
    const userId = req.user._id;
    const { institution, studentEmail, emailVerified, studentIdExpiry } = req.body;

    if (!institution || !studentEmail) {
      return res.status(400).json({ success: false, message: 'Institution and student email are required' });
    }

    // Validate student email format
    const studentEmailRegex = /^[^\s@]+@([^\s@]+\.(ac\.uk|edu|ac\.[a-z]{2}|edu\.[a-z]{2}))$/i;
    if (!studentEmailRegex.test(studentEmail)) {
      return res.status(400).json({ success: false, message: 'Please use a valid student email (.ac.uk or .edu)' });
    }

    // Require email OTP verification
    if (emailVerified !== true && emailVerified !== 'true') {
      return res.status(400).json({ success: false, message: 'Please verify your student email via OTP before submitting' });
    }

    const idDocumentUrl    = req.file?.path || '';
    const idDocumentPublicId = req.file?.filename || '';

    const existing = await StudentVerification.findOne({ userId });
    if (existing && existing.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    const verification = await StudentVerification.findOneAndUpdate(
      { userId },
      {
        userId, institution, studentEmail, emailVerified: true,
        studentIdExpiry: studentIdExpiry || null,
        idDocumentUrl, idDocumentPublicId,
        status: 'pending', submittedAt: new Date(), rejectionReason: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, verification });
  } catch (err) { next(err); }
}

// GET /api/student-verification/my-status
export async function getMyStatus(req, res, next) {
  try {
    const verification = await StudentVerification.findOne({ userId: req.user._id }).lean();
    res.json({ success: true, verification: verification || null });
  } catch (err) { next(err); }
}

// GET /api/admin/student-verification
export async function adminListVerifications(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [verifications, total] = await Promise.all([
      StudentVerification.find(filter)
        .populate('userId', 'name email phone')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      StudentVerification.countDocuments(filter),
    ]);

    res.json({ success: true, verifications, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// PATCH /api/admin/student-verification/:id/review
export async function reviewVerification(req, res, next) {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    const adminId = req.admin?._id || req.user?._id;

    const verification = await StudentVerification.findById(req.params.id).populate('userId');
    if (!verification) return res.status(404).json({ success: false, message: 'Not found' });

    if (action === 'approve') {
      verification.status = 'approved';
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      await User.findByIdAndUpdate(verification.userId._id, {
        isStudentVerified: true,
        studentEmail: verification.studentEmail,
      });
    } else if (action === 'reject') {
      if (!rejectionReason) return res.status(400).json({ success: false, message: 'Rejection reason required' });
      verification.status = 'rejected';
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      verification.rejectionReason = rejectionReason;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await verification.save();
    res.json({ success: true, verification });
  } catch (err) { next(err); }
}
