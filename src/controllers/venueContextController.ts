import { Request, Response } from "express";
import { VenueContextService } from "../services/venueContextService";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role?: string;
  };
}

export class VenueContextController {
  /**
   * Get user's venue context (available venues and active venue)
   */
  static async getVenueContext(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const context = await VenueContextService.getUserVenueContext(req.user.userId);

      res.status(200).json({
        success: true,
        message: "Venue context retrieved successfully",
        data: context,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Switch to a different venue
   */
  static async switchVenue(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { venueId } = req.body;

      if (!venueId) {
        res.status(400).json({ 
          success: false, 
          message: "Venue ID is required" 
        });
        return;
      }

      const result = await VenueContextService.switchVenue(
        req.user.userId,
        venueId
      );

      if (!result.success) {
        res.status(400).json({ 
          success: false, 
          message: result.message 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.venue,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get current active venue
   */
  static async getActiveVenue(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const activeVenue = await VenueContextService.getActiveVenue(req.user.userId);

      if (!activeVenue) {
        res.status(404).json({ 
          success: false, 
          message: "No active venue found" 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Active venue retrieved successfully",
        data: activeVenue,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all venues for a user (simplified version)
   */
  static async getUserVenues(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const context = await VenueContextService.getUserVenueContext(req.user.userId);

      res.status(200).json({
        success: true,
        message: "User venues retrieved successfully",
        data: context.availableVenues,
        total: context.availableVenues.length,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
