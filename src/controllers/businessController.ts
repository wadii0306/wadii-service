import { Request, Response } from "express";
import {
  BusinessService,
  ICreateBusinessData,
} from "../services/businessService";
import { LogoType } from "../types";

type Params = { businessId: string; logoIndex?: string };
type Query = Record<string, unknown>;
type Body = ICreateBusinessData;

// Extend Request interface to include file
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role?: string;
  };
  userRole: any;
  file?: any; // Multer file object
}

export class BusinessController {
  static async createBusiness(
    req: Request<Params, any, Body, Query>,
    res: Response
  ) {
    try {
      console.log("BusinessController.createBusiness - REQ BODY OWNER:", req.body.ownerId);
      console.log("BusinessController.createBusiness - REQ USER:", req.user?.userId);
      
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const business = await BusinessService.createBusiness(
        req.body,
        req.user.userId
      );


      res.status(201).json({
        success: true,
        message: "Business created successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAllBusinesses(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const businesses = await BusinessService.getAllBusinesses(
        req.user.userId,
        req.userRole, // added by auth middleware
        req.query ?? {}
      );

      res.status(200).json({
        success: true,
        message: "Businesses retrieved successfully",
        data: businesses,
        total: businesses.length,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getBusinessById(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const business = await BusinessService.getBusinessById(
        businessId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business retrieved successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateBusiness(
    req: Request<Params, any, Body, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;

      const business = await BusinessService.updateBusiness(
        businessId,
        req.body, // BusinessService accepts Partial<ICreateBusinessData>
        req.user.userId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business updated successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteBusiness(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;

      const business = await BusinessService.deleteBusiness(
        businessId,
        req.user.userId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business deleted successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Logo Management Endpoints

  static async uploadLogo(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      const { businessId } = req.params;
      const { name, type } = req.body;

      if (!name || !type) {
        res.status(400).json({ 
          success: false, 
          message: "Logo name and type are required" 
        });
        return;
      }

      // Validate logo type
      const validTypes: LogoType[] = ["primary", "secondary", "favicon", "watermark"];
      if (!validTypes.includes(type)) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid logo type. Must be: primary, secondary, favicon, or watermark" 
        });
        return;
      }

      const business = await BusinessService.uploadAndAddLogo(
        businessId,
        req.file,
        { name, type },
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(201).json({
        success: true,
        message: "Logo uploaded successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getLogos(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const { type } = req.query; // Get type from query params

      const business = await BusinessService.getActiveLogos(
        businessId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      // Filter by type if specified
      const filteredLogos = type 
        ? business.filter(logo => logo.type === type)
        : business;

      res.status(200).json({
        success: true,
        message: "Logos retrieved successfully",
        data: filteredLogos,
        total: filteredLogos.length
      });
    } catch (error: any) {
      console.error("Get logos error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve logos"
      });
    }
  }

  /**
   * Get all logos for a business (legacy endpoint)
   */
  static async getAllLogos(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const logos = await BusinessService.getActiveLogos(
        businessId,
        req.user.userId,
        req.userRole
      );

      res.status(200).json({
        success: true,
        message: "Logos retrieved successfully",
        data: logos,
        total: logos.length,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateLogo(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const { logoId } = req.params;
      const { name, type, isActive } = req.body;

      // Validate logo type if provided
      if (type) {
        const validTypes: LogoType[] = ["primary", "secondary", "favicon", "watermark"];
        if (!validTypes.includes(type)) {
          res.status(400).json({ 
            success: false, 
            message: "Invalid logo type. Must be: primary, secondary, favicon, or watermark" 
          });
          return;
        }
      }

      const business = await BusinessService.updateLogo(
        businessId,
        logoId,
        { name, type, isActive },
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Logo updated successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async removeLogo(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const { logoId } = req.params;

      const business = await BusinessService.removeLogo(
        businessId,
        logoId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Logo removed successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
