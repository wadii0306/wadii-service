import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import jwt, { SignOptions } from "jsonwebtoken";
import EnvironmentConfig from "./env";

const config = EnvironmentConfig.getInstance().config;

// Passport serialization functions
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID || "",
      clientSecret: config.GOOGLE_CLIENT_SECRET || "",
      callbackURL: config.GOOGLE_CALLBACK_URL || "",
      scope: ["profile", "email"],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user: any) => void) => {
      try {
        // Find or create user
        let user = await User.findOne({ 
          $or: [
            { email: profile.emails?.[0]?.value },
            { googleId: profile.id }
          ]
        });

        if (!user) {
          // Create new user from Google profile
          user = new User({
            email: profile.emails?.[0]?.value || "",
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            googleId: profile.id,
            googleProfilePicture: profile.photos?.[0]?.value || "",
            isEmailVerified: profile.emails?.[0]?.verified || false,
            role: "owner", // Default role for Google signups
            mustChangePassword: false, // No password for OAuth users
          });
          await user.save();
        } else {
          // Update existing user with Google info
          if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.googleProfilePicture = profile.photos?.[0]?.value || "";
            user.isEmailVerified = profile.emails?.[0]?.verified || false;
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export { passport };
