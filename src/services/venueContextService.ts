import { User } from "../models/User";
import { Venue } from "../models/Venue";
import { Business } from "../models/Business";
import { UserBusinessRole } from "../models/UserBusinessRole";
import mongoose from "mongoose";

export interface VenueContext {
  activeBusinessId: string | null;
  activeVenueId: string | null;
  availableVenues: Array<{
    _id: string;
    venueName: string;
    venueType: string;
    businessId: string;
    businessName: string;
  }>;
}

export class VenueContextService {
  /**
   * Get user's venue context including available venues
   */
  static async getUserVenueContext(userId: string): Promise<VenueContext> {
    // Get user with current context
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's business roles
    const userRoles = await UserBusinessRole.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate("businessId", "businessName")
      .lean();

    // Extract business IDs the user has access to
    const businessIds = userRoles.map(role => role.businessId._id.toString());

    // Get all venues for those businesses
    const venues = await Venue.find({
      businessId: { $in: businessIds },
      status: "active",
    })
      .populate("businessId", "businessName")
      .select("venueName venueType businessId")
      .lean();

    // Transform venues to the expected format
    const availableVenues = venues.map(venue => ({
      _id: venue._id.toString(),
      venueName: venue.venueName,
      venueType: venue.venueType,
      businessId: (venue.businessId as any)._id.toString(),
      businessName: (venue.businessId as any).businessName,
    }));

    // Set default venue if none is selected
    let activeVenueId = user.activeVenueId?.toString() || null;
    let activeBusinessId = user.activeBusinessId?.toString() || null;

    if (!activeVenueId && availableVenues.length > 0) {
      // Default to first available venue
      activeVenueId = availableVenues[0]._id;
      activeBusinessId = availableVenues[0].businessId;
      
      // Update user with default venue
      await User.findByIdAndUpdate(userId, {
        activeVenueId: new mongoose.Types.ObjectId(activeVenueId),
        activeBusinessId: new mongoose.Types.ObjectId(activeBusinessId),
      });
    }

    return {
      activeBusinessId,
      activeVenueId,
      availableVenues,
    };
  }

  /**
   * Switch user's active venue
   */
  static async switchVenue(
    userId: string,
    venueId: string
  ): Promise<{ success: boolean; message: string; venue?: any }> {
    // Validate venue exists and user has access
    const venue = await Venue.findById(venueId)
      .populate("businessId", "businessName")
      .lean();

    if (!venue) {
      return { success: false, message: "Venue not found" };
    }

    // Check user has access to this venue's business
    const userRole = await UserBusinessRole.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      businessId: venue.businessId,
    }).lean();

    if (!userRole) {
      return { success: false, message: "Access denied to this venue" };
    }

    // Update user's active venue
    await User.findByIdAndUpdate(userId, {
      activeVenueId: new mongoose.Types.ObjectId(venueId),
      activeBusinessId: venue.businessId,
    });

    return {
      success: true,
      message: "Venue switched successfully",
      venue: {
        _id: venue._id.toString(),
        venueName: venue.venueName,
        venueType: venue.venueType,
        businessId: (venue.businessId as any)._id.toString(),
        businessName: (venue.businessId as any).businessName,
      },
    };
  }

  /**
   * Get current active venue for user
   */
  static async getActiveVenue(userId: string) {
    const user = await User.findById(userId)
      .populate("activeVenueId", "venueName venueType")
      .populate("activeBusinessId", "businessName")
      .lean();

    if (!user || !user.activeVenueId) {
      return null;
    }

    return {
      venue: user.activeVenueId,
      business: user.activeBusinessId,
    };
  }

  /**
   * Validate user has access to current active venue
   */
  static async validateVenueAccess(
    userId: string,
    venueId?: string
  ): Promise<boolean> {
    const targetVenueId = venueId || (await User.findById(userId).lean())?.activeVenueId?.toString();

    if (!targetVenueId) {
      return false;
    }

    const venue = await Venue.findById(targetVenueId).lean();
    if (!venue) {
      return false;
    }

    const userRole = await UserBusinessRole.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      businessId: venue.businessId,
    }).lean();

    return !!userRole;
  }
}
