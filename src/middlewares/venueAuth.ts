import { Request, Response, NextFunction } from "express";
import { JWTUtils } from "../utils/jwt";
import { VenueContextService } from "../services/venueContextService";
import mongoose from "mongoose";

// Extend Request interface to include venue context
declare global {
  namespace Express {
    interface Request {
      venueContext?: {
        activeBusinessId: string | null;
        activeVenueId: string | null;
        availableVenues: Array<{
          _id: string;
          venueName: string;
          venueType: string;
          businessId: string;
          businessName: string;
        }>;
      };
    }
  }
}

/**
 * Enhanced authentication middleware that includes venue context
 */
export async function authMiddlewareWithVenue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization ?? "";

    // Strictly accept "Bearer <token>"
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res
        .status(401)
        .json({ success: false, message: "Access denied. No/invalid token." });
      return;
    }

    const token = match[1].trim();
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    const decoded = JWTUtils.verifyToken(token);

    if (!decoded || typeof decoded.userId !== "string") {
      res
        .status(401)
        .json({ success: false, message: "Invalid token payload." });
      return;
    }

    req.user = decoded;

    // Add venue context to request
    try {
      const venueContext = await VenueContextService.getUserVenueContext(decoded.userId);
      req.venueContext = venueContext;
    } catch (error) {
      // If venue context fails, continue without it
      // This allows the system to work for users without venue access
      console.warn("Failed to load venue context:", error);
    }

    next();
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Token expired." });
      return;
    }
    if (error?.name === "JsonWebTokenError") {
      res.status(401).json({ success: false, message: "Invalid token." });
      return;
    }
    res
      .status(500)
      .json({ success: false, message: "Token verification failed." });
  }
}

/**
 * Middleware to validate user has access to a specific venue
 * Use this for venue-specific routes
 */
export function requireVenueAccess(venueIdParam: string = "venueId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const venueId = req.params[venueIdParam] || req.body[venueIdParam];
      
      if (!venueId) {
        res.status(400).json({ success: false, message: "Venue ID is required" });
        return;
      }

      const hasAccess = await VenueContextService.validateVenueAccess(
        req.user.userId,
        venueId
      );

      if (!hasAccess) {
        res.status(403).json({ 
          success: false, 
          message: "Access denied to this venue" 
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

/**
 * Middleware to ensure user has an active venue context
 */
export function requireActiveVenue(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.venueContext?.activeVenueId) {
    res.status(400).json({
      success: false,
      message: "No active venue selected. Please select a venue first.",
    });
    return;
  }

  next();
}

/**
 * Middleware to add venue context to response headers
 * Useful for frontend to know current context
 */
export function addVenueContextHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.venueContext) {
    res.setHeader("X-Active-Venue-Id", req.venueContext.activeVenueId || "");
    res.setHeader("X-Active-Business-Id", req.venueContext.activeBusinessId || "");
  }

  next();
}
