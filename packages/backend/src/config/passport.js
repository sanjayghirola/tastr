import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { logger } from '../utils/logger.js';
import User from '../models/User.js';
import { generateReferralCode } from '../utils/helpers.js';
import { ROLES, ENTITY_STATUS } from '@tastr/shared';

export function initPassport(app) {
  app.use(passport.initialize());

  // ─── Google ─────────────────────────────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google profile'));

          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (!user) {
            user = await User.create({
              googleId:     profile.id,
              name:         profile.displayName,
              email,
              profilePhoto: profile.photos?.[0]?.value,
              role:         ROLES.CUSTOMER,
              status:       ENTITY_STATUS.ACTIVE,
              referralCode: generateReferralCode(),
              isEmailVerified: true,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ));
  }

  // ─── Facebook ────────────────────────────────────────────────────────────────
  if (process.env.FACEBOOK_APP_ID) {
    passport.use(new FacebookStrategy(
      {
        clientID:     process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:  process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          let user = await User.findOne({
            $or: [{ facebookId: profile.id }, ...(email ? [{ email }] : [])],
          });

          if (!user) {
            user = await User.create({
              facebookId:  profile.id,
              name:        profile.displayName,
              email:       email || `fb_${profile.id}@tastr.app`,
              role:        ROLES.CUSTOMER,
              status:      ENTITY_STATUS.ACTIVE,
              referralCode:generateReferralCode(),
              isEmailVerified: !!email,
            });
          } else if (!user.facebookId) {
            user.facebookId = profile.id;
            await user.save();
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ));
  }

  logger.info('✅  Passport strategies configured');
}
