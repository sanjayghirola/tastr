/**
 * Run once to create the first SUPER_ADMIN account.
 * Usage:  node src/scripts/seedAdmin.js
 * (from packages/backend directory, after copying your .env)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

await mongoose.connect(MONGODB_URI);
console.log('✅  MongoDB connected');

// Inline schema so we don't pull the full app
const adminSchema = new mongoose.Schema({
  name:         String,
  email:        { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role:         String,
  status:       { type: String, default: 'ACTIVE' },
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const EMAIL    = 'admin@tastr.app';
const PASSWORD = 'Admin@1234';

const existing = await Admin.findOne({ email: EMAIL });
if (existing) {
  console.log(`Admin already exists: ${EMAIL}`);
} else {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await Admin.create({ name: 'Super Admin', email: EMAIL, passwordHash, role: 'SUPER_ADMIN' });
  console.log('✅  Admin created!');
}

console.log(`\n  Email   : ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log('\n  👉  Change the password after first login.\n');

await mongoose.disconnect();
process.exit(0);
