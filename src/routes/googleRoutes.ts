import { Router } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import jwt, { SignOptions } from "jsonwebtoken";
import EnvironmentConfig from "../config/env";
import { passport } from "../config/googleOAuth";

const router = Router();

// Google OAuth login route
router.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  accessType: "offline",
  prompt: "consent",
}));

// Google OAuth callback route
router.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req: any, res: any) => {
    try {
      // Get user from passport session
      const user = req.user;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`);
      }

      // Generate JWT token
      const token = jwt.sign(
          {
              userId: user._id,
              email: user.email,
              role: user.role,
            },
            EnvironmentConfig.getInstance().config.JWT_SECRET,
            { expiresIn: EnvironmentConfig.getInstance().config.JWT_EXPIRE } as SignOptions
      );

      // Update user with last login
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        isEmailVerified: true // Mark as verified since Google email is verified
      });

      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/success?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=server_error`);
    }
  }
);

export default router;
