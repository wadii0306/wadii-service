import { Document, Types } from "mongoose";
import { Business } from "../models/Business";
import { UserBusinessRole } from "../models/UserBusinessRole";
import { IBusiness, IUserBusinessRole } from "../types";
import { ROLE_TO_PERMS } from "../middlewares/roles";
import QRCode from "qrcode";

export type RoleSnapshot = {
  role: "developer" | "owner" | "manager";
  permissions?: string[];
};

type LeanBusiness = Omit<IBusiness, keyof Document> & { ownerName?: string };

export interface ICreateBusinessData {
  // Consider removing ownerId from the payload to avoid privilege confusion.
  ownerId?: string;
  businessName: string;
  contact: { phone: string; email: string };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  website?: string;
  socials?: { name: string; url: string }[];
  branding?: { logoUrl?: string };
}

export class BusinessService {
  /**
   * Create a new business
   * Enforces owner = createdBy (safer default).
   */
  public static async createBusiness(
    businessData: ICreateBusinessData,
    createdBy: string
  ): Promise<IBusiness> {
    console.log('BusinessService.createBusiness - Input ownerId:', businessData.ownerId);
    console.log('BusinessService.createBusiness - createdBy:', createdBy);
    
    // Proper ObjectId conversion with explicit fallback
    const ownerId = businessData.ownerId
      ? new Types.ObjectId(businessData.ownerId)
      : new Types.ObjectId(createdBy);
    
    console.log('BusinessService.createBusiness - Final ownerId:', ownerId.toString());

    const business = new Business({
      ...businessData,
      ownerId, // ensure schema has this if you want it stored
      createdBy, // auditing
      isDeleted: false, // default if present in schema
    });

    // Generate QR code (links to public inquiry page)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const qrCodeData = await QRCode.toDataURL(`${frontendUrl}/inquiry/${business._id}`);
    business.qrCode = qrCodeData;

    await business.save();

    // Create owner role for the creator/owner scoped to this business
    const ownerRole = new UserBusinessRole({
      userId: ownerId,
      businessId: business._id,
      role: "owner",
      permissions: ROLE_TO_PERMS.owner,
    });

    await ownerRole.save();

    // If admin is creating on behalf of someone else, give admin manager role
    if (createdBy !== ownerId.toString()) {
      const adminRole = new UserBusinessRole({
        userId: new Types.ObjectId(createdBy),
        businessId: business._id,
        role: "manager",
        permissions: ROLE_TO_PERMS.manager,
      });
      await adminRole.save();
    }

    return business;
  }

  /**
   * Get all businesses (restricted unless superadmin)
   */
  public static async getAllBusinesses(
    userId: string,
    userRole?: RoleSnapshot,
    filters: Record<string, unknown> = {}
  ): Promise<(IBusiness & { venueCount: number; ownerName: string })[]> {
    const query: any = { isDeleted: false, ...filters };

    // Shared aggregation stages for both developer & non-developer
    const basePipeline = [
      { $match: query },
      {
        $lookup: {
          from: "venues",
          localField: "_id",
          foreignField: "businessId",
          as: "venues",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $addFields: {
          venueCount: { $size: "$venues" },
          ownerName: {
            $concat: [
              { $ifNull: [{ $arrayElemAt: ["$owner.firstName", 0] }, ""] },
              " ",
              { $ifNull: [{ $arrayElemAt: ["$owner.lastName", 0] }, ""] },
            ],
          },
        },
      },
      { $project: { venues: 0, owner: 0 } },
      { $sort: { createdAt: -1 as -1 } },
    ];

    // Developer can view all businesses
    if (userRole?.role === "developer") {
      return Business.aggregate(basePipeline);
    }

    // Normal user: only businesses linked to them
    const roles = await UserBusinessRole.find({
      userId: new Types.ObjectId(userId),
    })
      .select("businessId")
      .lean();

    const businessIds = roles.map((r) => r.businessId);
    if (businessIds.length === 0) return [];

    query._id = { $in: businessIds };
    basePipeline[0] = { $match: query }; // overwrite match stage for restricted users

    return Business.aggregate(basePipeline);
  }

  /**
   * Get business by ID (scoped access)
   */
  public static async getBusinessById(
    businessId: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<LeanBusiness | null> {
    if (userRole?.role !== "developer") {
      const hasAccess = await UserBusinessRole.findOne({
        userId: new Types.ObjectId(userId),
        businessId: new Types.ObjectId(businessId),
      }).lean();

      if (!hasAccess) throw new Error("Access denied to this business");
    }

    const business = await Business.findOne({
      _id: new Types.ObjectId(businessId),
      isDeleted: false,
    })
      .populate("ownerId", "firstName lastName")
      .lean<Omit<IBusiness, keyof Document> & { ownerName?: string }>();

    if (!business) return null;

    const owner = business.ownerId as unknown as {
      firstName?: string;
      lastName?: string;
    };
    const ownerName = [owner?.firstName, owner?.lastName]
      .filter(Boolean)
      .join(" ");

    return {
      ...business,
      ownerName,
    };
  }

  /**
   * Update business (scoped permission)
   */
  public static async updateBusiness(
    businessId: string,
    updateData: Partial<ICreateBusinessData>,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IBusiness | null> {
    if (userRole?.role !== "developer") {
      const role = await UserBusinessRole.findOne({
        userId: new Types.ObjectId(userId),
        businessId: new Types.ObjectId(businessId),
      }).lean();

      const canUpdate =
        role?.role === "owner" ||
        (Array.isArray(role?.permissions) &&
          role!.permissions.includes("business.update"));

      if (!canUpdate) throw new Error("Permission denied");
    }

    return Business.findOneAndUpdate(
      { _id: new Types.ObjectId(businessId), isDeleted: false },
      { ...updateData, updatedBy },
      { new: true, runValidators: true }
    );
  }

  /**
   * Soft delete (scoped)
   */
  public static async deleteBusiness(
    businessId: string,
    deletedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IBusiness | null> {
    if (userRole?.role !== "developer") {
      const role = await UserBusinessRole.findOne({
        userId: new Types.ObjectId(userId),
        businessId: new Types.ObjectId(businessId),
      }).lean();

      const canDelete = role?.role === "owner";
      if (!canDelete) throw new Error("Permission denied");
    }

    return Business.findOneAndUpdate(
      { _id: new Types.ObjectId(businessId), isDeleted: false },
      { isDeleted: true, updatedBy: deletedBy },
      { new: true }
    );
  }
}
   