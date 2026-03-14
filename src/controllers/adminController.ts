import { Request, Response } from "express";
import { AuthService } from "../services/userService";
import { BusinessService } from "../services/businessService";
import { VenueService } from "../services/venueService";
import mongoose from "mongoose";

interface OnboardingData {
  user: {
    email: string;
    password: string; // Required for onboarding
    firstName: string;
    lastName?: string;
    phone?: string;
    role: string;
  };
  business: {
    businessName: string;
    contact: {
      phone: string;
      email: string;
    };
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      pincode: string;
    };
    website?: string;
  };
  venue: {
    venueName: string;
    venueType: "banquet" | "lawn" | "convention_center";
    capacity: {
      min: number;
      max: number;
    };
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      pincode: string;
    };
    bookingPreferences?: {
      timings: {
        morning: { start: string; end: string };
        evening: { start: string; end: string };
        fullDay: { start: string; end: string };
      };
      notes?: string;
    };
  };
}

export class AdminController {
  /**
   * Atomic admin onboarding - creates user, business, and venue in one transaction
   */
  static async onboardBusiness(req: Request<{}, any, OnboardingData>, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const { user, business, venue } = req.body;
      const adminId = req.user?.userId;
      
      if (!adminId) {
        await session.abortTransaction();
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      // Step 1: Create user
      console.log('Admin onboarding - Creating user:', user);
      const userResult = await AuthService.register(user);
      console.log('Admin onboarding - User created:', userResult.user._id);
      
      const userId = userResult.user._id.toString();

      // Step 2: Create business with the new user as owner
      const businessData = {
        ...business,
        ownerId: userId, // Explicitly set the new user as owner
      };
      
      console.log('Admin onboarding - Creating business with data:', businessData);
      console.log('Admin onboarding - userId for business:', userId);
      
      const createdBusiness = await BusinessService.createBusiness(
        businessData,
        adminId // Admin is the creator
      );
      
      console.log('Admin onboarding - Business created:', createdBusiness._id, 'ownerId:', createdBusiness.ownerId);

      // Step 3: Create venue linked to the business
      const venueData: any = {
        ...venue,
        businessId: createdBusiness._id.toString(),
        media: { coverImageUrl: null }, // Required field
        status: "active", // Required field
      };
      
      const createdVenue = await VenueService.createVenue(
        venueData,
        adminId, // createdBy
        adminId, // userId (admin)
        { role: "admin" } as any // userRole (admin has full access)
      );

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: "Business onboarded successfully",
        data: {
          user: userResult.user,
          business: createdBusiness,
          venue: createdVenue,
        },
      });
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Admin onboarding error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Onboarding failed" 
      });
    } finally {
      session.endSession();
    }
  }
}
