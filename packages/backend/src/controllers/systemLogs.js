import SystemLog from '../models/SystemLog.js';
import { paginationMeta } from '../utils/helpers.js';

export async function listSystemLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, level, from, to } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const [logs, total] = await Promise.all([
      SystemLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      SystemLog.countDocuments(filter),
    ]);
    res.json({ success: true, logs, ...paginationMeta(total, Number(page), Number(limit)) });
  } catch (err) { next(err); }
}
