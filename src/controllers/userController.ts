import { Request, Response } from "express";
import {
  AuthService,
  ILoginData,
  IRegisterData,
} from "../services/userService";
import { OwnerBusinessFilters } from "../types";

type RegisterReq = Request<{}, any, IRegisterData>;
type LoginReq = Request<{}, any, ILoginData>;
type ProfileReq = Request;

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: RegisterReq, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      
      // If admin is creating user, don't return token (admin stays logged in)
      if (req.user?.role === "admin" || req.user?.role === "developer") {
        res.status(201).json({
          success: true,
          message: "User created successfully",
          data: { user: result.user },
        });
        return;
      }
      
      // Public signup - return token for new user
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: { user: result.user, token: result.token },
      });
    } catch (error: any) {
      // 409 for duplicate email; otherwise 400
      const status = /exists/i.test(error?.message) ? 409 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  /**
   * Admin creates a new user (shop owner, staff, etc.)
   */
  static async createByAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const createdBy = req.user.userId; // 👈 JWT middleware sets req.user
      const result = await AuthService.createByAdmin(req.body, createdBy);
      console.log(result);
      res.status(201).json({
        success: true,
        message: "User created by admin successfully",
        data: {
          user: result.user,
          tempPassword: result.tempPassword,
          token: result.token,
          // 👈 admin can send this via email/SMS
        },
      });
    } catch (error: any) {
      const status = /exists/i.test(error?.message) ? 409 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  /**
   * Login user
   */
  static async login(req: LoginReq, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user: result.user, token: result.token },
      });
    } catch (error: any) {
      // 401 for invalid credentials
      const status = /invalid credentials/i.test(error?.message) ? 401 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req: ProfileReq, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
        });
        return;
      }

      const user = await AuthService.getUserById(userId);

      res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error: any) {
      const statusCode = error.message === "User not found" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch user",
      });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: ProfileReq, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const result = await AuthService.getProfile(req.user.userId);
      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all Owners
   */
  static async getAllOwners(req: ProfileReq, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const owners = await AuthService.getAllOwners();

      res.status(200).json({
        success: true,
        message: "Owners retrieved successfully",
        data: owners,
        count: owners.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch owners",
      });
    }
  }

  /**
   * Get all Owners with pagination
   */
  static async getAllOwnersPaginated(
    req: ProfileReq,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await AuthService.getAllOwnersPaginated(page, limit);

      res.status(200).json({
        success: true,
        message: "Owners retrieved successfully",
        data: result.owners,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalCount: result.totalCount,
          limit,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch owners",
      });
    }
  }

  /**
   * Get all businesses and venues for a specific owner
   * GET /api/owners/:ownerId/businesses
   */
  static async getOwnerBusinessesWithVenues(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { ownerId } = req.params;
      const {
        businessStatus,
        venueStatus,
        includeVenues,
        businessFields,
        venueFields,
        limit,
        skip,
      } = req.query;

      const filters: OwnerBusinessFilters = {
        ownerId,
        businessStatus: businessStatus as string | undefined,
        venueStatus: venueStatus as string | undefined,
        includeVenues: includeVenues === "false" ? false : true,
        businessFields: businessFields as string | undefined,
        venueFields: venueFields as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        skip: skip ? parseInt(skip as string) : 0,
      };

      const result = await AuthService.getOwnerBusinessesWithVenues(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch owners",
      });
    }
  }

  /**
   * Get a single business with its venues for an owner
   * GET /api/owners/:ownerId/businesses/:businessId
   */
  static async getOwnerBusinessById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { ownerId, businessId } = req.params;

      const business = await AuthService.getOwnerBusinessById(
        ownerId,
        businessId
      );

      if (!business) {
        res.status(404).json({
          success: false,
          message: "Business not found or does not belong to this owner",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: business,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch owners",
      });
    }
  }

  /**
   * Get statistics for owner's businesses
   * GET /api/owners/:ownerId/businesses/stats
   */
  static async getOwnerBusinessStats(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { ownerId } = req.params;

      const stats = await AuthService.getOwnerBusinessesWithVenues({
        ownerId,
        includeVenues: true,
      });

      res.status(200).json({
        success: true,
        data: {
          summary: stats.summary,
          totalBusinesses: stats.totalBusinesses,
          totalVenues: stats.totalVenues,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch owners",
      });
    }
  }
}
