// src/services/userService.ts
import mongoose, { Document, isValidObjectId, Types } from "mongoose";
import { User } from "../models/User";
import { UserBusinessRole } from "../models/UserBusinessRole";
import { PasswordUtils } from "../utils/password";
import { JWTUtils } from "../utils/jwt";
import {
  BusinessWithVenues,
  IBusiness,
  IUser,
  IUserBusinessRole,
  IVenue,
  OwnerBusinessFilters,
  OwnerBusinessResponse,
} from "../types";
import crypto from "crypto";
import { Venue } from "../models/Venue";
import { Business } from "../models/Business";
import { ROLE_PERMS, ROLE_TO_PERMS } from "../middlewares/roles";

export interface IRegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: string;
}

export interface ILoginData {
  email: string;
  password: string;
}

type AdminCreateInput = IRegisterData & {
  businessId?: string;
  venueId?: string;
};

type LeanBusinessWithVenues = Omit<IBusiness, keyof Document> & {
  _id: Types.ObjectId;
  venues: Omit<IVenue, keyof Document>[];
  venueCount: number;
};

const oid = (id: string | Types.ObjectId) =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

const sanitizeUser = (u: any): IUser => {
  const obj = typeof u?.toObject === "function" ? u.toObject() : u;
  if (obj) delete obj.password;
  return obj as IUser;
};

export class AuthService {
  static async register(
    userData: IRegisterData
  ): Promise<{ user: IUser; token: string }> {
    const email = userData.email.trim().toLowerCase();
    const { password, firstName, lastName, phone } = userData;

    const existing = await User.findOne({ email }).lean();
    if (existing) throw new Error("User already exists with this email");

    const hashed = await PasswordUtils.hashPassword(password);

    const user = new User({
      email,
      password: hashed,
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      phone: phone?.trim() ?? null,
      role: userData.role,
      mustChangePassword: false,
    });

    await user.save();

    const token = JWTUtils.generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user: sanitizeUser(user), token };
  }

  static async createByAdmin(
    userData: AdminCreateInput,
    createdBy: string
  ): Promise<{ user: IUser; tempPassword?: string; token?: string }> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // --- 1) Prepare user data ---
      const email = userData.email.trim().toLowerCase();
      const { firstName, lastName, phone, password, role } = userData;



      // Check for duplicate user
      const dup = await User.findOne({ email }).lean().session(session);
      if (dup) throw new Error("User already exists with this email");

      // Generate temp password if not provided
      let tempPassword: string | undefined;
      let hashed: string;

      if (password) {
        hashed = await PasswordUtils.hashPassword(password);
      } else {
        tempPassword = crypto.randomBytes(8).toString("base64url");
        hashed = await PasswordUtils.hashPassword(tempPassword);
      }

      // Validate role
      if (!["developer", "owner", "manager"].includes(role)) {
        throw new Error("Invalid role");
      }

      // --- 2) Create user ---
      const [user] = await User.create(
        [
          {
            email,
            password: hashed,
            firstName: firstName.trim(),
            lastName: lastName?.trim(),
            phone: phone?.trim() ?? null,
            role: role,
            mustChangePassword: !password, // Only if temp password was generated
            createdBy,
          },
        ],
        { session }
      );

      // --- 3) Handle business/venue role assignments (optional) ---
      const businessId = userData.businessId ?? null;
      const venueId = userData.venueId ?? null;

      if (businessId || venueId) {
        let resolvedBusinessId = businessId;

        // If venueId provided, validate and infer businessId
        if (venueId) {
          if (!isValidObjectId(venueId)) throw new Error("Invalid venueId");
          const venue = await Venue.findById(venueId)
            .select("_id businessId")
            .session(session);
          if (!venue) throw new Error("Venue not found");

          // Infer businessId from venue if not provided
          if (!resolvedBusinessId)
            resolvedBusinessId = String(venue.businessId);

          // If both provided, they must match
          if (
            resolvedBusinessId &&
            String(venue.businessId) !== String(resolvedBusinessId)
          ) {
            throw new Error(
              "venueId does not belong to the provided businessId"
            );
          }
        }

        // Validate businessId if provided
        if (resolvedBusinessId) {
          if (!isValidObjectId(resolvedBusinessId))
            throw new Error("Invalid businessId");
          const business = await Business.findById(resolvedBusinessId)
            .select("_id")
            .session(session);
          if (!business) throw new Error("Business not found");
        }

        // Create business/venue role assignment
        if (resolvedBusinessId) {
          const rolePerms =
            ROLE_TO_PERMS[role as keyof typeof ROLE_TO_PERMS] || [];

          await UserBusinessRole.create(
            [
              {
                userId: user._id,
                businessId: resolvedBusinessId,
                venueId: venueId ?? undefined,
                role: role,
                permissions: rolePerms,
                scope: venueId ? "venue" : "business",
                assignedBy: createdBy,
              },
            ],
            { session }
          );
        }
      }

      await session.commitTransaction();
      const token = JWTUtils.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });
      return {
        user: sanitizeUser(user),
        token,
        ...(tempPassword && { tempPassword }),
      };
    } catch (err: any) {
      await session.abortTransaction();
      if (err?.code === 11000)
        err.message = "User already exists with this email";
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async login(
    loginData: ILoginData
  ): Promise<{ user: IUser; token: string }> {
    const email = loginData.email.trim().toLowerCase();
    const { password } = loginData;

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new Error("Invalid credentials");

    const ok = await PasswordUtils.comparePassword(password, user.password);
    if (!ok) throw new Error("Invalid credentials");

    const token = JWTUtils.generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user: sanitizeUser(user), token };
  }

  static async getProfile(userId: string): Promise<{
    user: IUser;
    roles: Array<
      Pick<IUserBusinessRole, "role" | "permissions"> & {
        businessId: { _id: string; businessName: string };
      }
    >;
  }> {
    const user = await User.findById(oid(userId)).lean();
    if (!user) throw new Error("User not found");

    const roles = await UserBusinessRole.find({ userId: oid(userId) })
      .populate({ path: "businessId", select: "businessName" })
      .select("role permissions businessId")
      .lean();

    return { user: sanitizeUser(user), roles: roles as any };
  }

  /**
   * Fetch all users with role "owner"
   * @returns Promise<IUser[]> - Array of owner users
   */
  static async getAllOwners(): Promise<IUser[]> {
    const owners = await User.find({ role: "owner" })
      .select("-password") // Exclude password field
      .lean<IUser[]>();

    if (!owners || owners.length === 0) {
      return [];
    }

    return owners;
  }

  /**
   * Fetch all users with role "owner" with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Promise with owners array and pagination info
   */
  static async getAllOwnersPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    owners: IUser[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [owners, totalCount] = await Promise.all([
      User.find({ role: "owner" })
        .select("-password")
        .skip(skip)
        .limit(limit)
        .lean<IUser[]>(),
      User.countDocuments({ role: "owner" }),
    ]);

    return {
      owners,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Fetch all users with role "owner" with specific fields
   * @param fields - Fields to select (e.g., "email firstName lastName")
   * @returns Promise<Partial<IUser>[]>
   */
  static async getAllOwnersWithFields(
    fields: string
  ): Promise<Partial<IUser>[]> {
    const owners = await User.find({ role: "owner" })
      .select(fields)
      .lean<Partial<IUser>[]>();

    return owners;
  }

  /**
   * Get user by ID
   * @param userId - User ID to fetch
   * @returns Promise<IUser> - User object
   */
  static async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(oid(userId))
      .select("-password") // Exclude password field
      .lean<IUser>();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Get all businesses and venues for a specific owner
   * @param filters - Filter options
   * @returns Promise<OwnerBusinessResponse>
   */
  static async getOwnerBusinessesWithVenues(
    filters: OwnerBusinessFilters
  ): Promise<OwnerBusinessResponse> {
    const {
      ownerId,
      businessStatus,
      venueStatus,
      includeVenues = true,
      businessFields,
      venueFields,
      limit,
      skip = 0,
    } = filters;

    // Build business query
    const businessQuery: any = { ownerId: oid(ownerId) };
    if (businessStatus) {
      businessQuery.status = businessStatus;
    }

    // Fetch businesses with optional field selection
    let businessQueryBuilder = Business.find(businessQuery);

    if (businessFields) {
      businessQueryBuilder = businessQueryBuilder.select(businessFields);
    }

    if (limit) {
      businessQueryBuilder = businessQueryBuilder.limit(limit).skip(skip);
    }

    const businesses = await businessQueryBuilder.lean().exec();

    // Get total count for pagination
    const totalBusinesses = await Business.countDocuments(businessQuery);

    // If venues not needed, return early
    if (!includeVenues) {
      const activeBusinesses = businesses.filter(
        (b) => b.status === "active"
      ).length;

      return {
        ownerId,
        businesses: businesses as BusinessWithVenues[],
        totalBusinesses,
        totalVenues: 0,
        summary: {
          activeBusinesses,
          inactiveBusinesses: businesses.length - activeBusinesses,
          totalVenues: 0,
        },
      };
    }

    // Fetch venues for all businesses
    const businessIds = businesses.map((b) => b._id);

    const venueQuery: any = { businessId: { $in: businessIds } };
    if (venueStatus) {
      venueQuery.status = venueStatus;
    }

    let venueQueryBuilder = Venue.find(venueQuery);

    if (venueFields) {
      venueQueryBuilder = venueQueryBuilder.select(venueFields);
    }

    const venues = await venueQueryBuilder.lean<IVenue[]>();

    // Group venues by businessId
    const venuesByBusiness = venues.reduce((acc, venue) => {
      const businessId = venue.businessId.toString();
      if (!acc[businessId]) {
        acc[businessId] = [];
      }
      acc[businessId].push(venue);
      return acc;
    }, {} as Record<string, IVenue[]>);

    // Attach venues to businesses
    const businessesWithVenues: BusinessWithVenues[] = businesses.map(
      (business) => {
        const businessId = business._id.toString();
        const businessVenues = venuesByBusiness[businessId] || [];

        return {
          ...business,
          venues: businessVenues,
          venueCount: businessVenues.length,
        };
      }
    ) as BusinessWithVenues[];

    // Calculate summary
    const activeBusinesses = businesses.filter(
      (b) => b.status === "active"
    ).length;
    const totalVenues = venues.length;

    return {
      ownerId,
      businesses: businessesWithVenues,
      totalBusinesses,
      totalVenues,
      summary: {
        activeBusinesses,
        inactiveBusinesses: businesses.length - activeBusinesses,
        totalVenues,
      },
    };
  }

  /**
   * Get a single business with its venues for an owner
   * @param ownerId - Owner ID
   * @param businessId - Business ID
   * @returns Promise<LeanBusinessWithVenues | null>
   */
  static async getOwnerBusinessById(
    ownerId: string,
    businessId: string
  ): Promise<LeanBusinessWithVenues | null> {
    const business = await Business.findOne({
      _id: oid(businessId),
      ownerId: oid(ownerId),
    }).lean<IBusiness>();

    if (!business) {
      return null;
    }

    const venues = await Venue.find({
      businessId: oid(businessId),
    }).lean<IVenue[]>();

    return {
      ...business,
      venues,
      venueCount: venues.length,
    };
  }

  /**
   * Get venue count for each business of an owner
   * @param ownerId - Owner ID
   * @returns Promise<Array<{businessId: string, businessName: string, venueCount: number}>>
   */
  static async getBusinessVenueCounts(ownerId: string) {
    const businesses = await Business.find({ ownerId: oid(ownerId) })
      .select("_id businessName")
      .lean();

    const businessIds = businesses.map((b) => b._id);

    // Aggregate venue counts by business
    const venueCounts = await Venue.aggregate([
      {
        $match: { businessId: { $in: businessIds } },
      },
      {
        $group: {
          _id: "$businessId",
          count: { $sum: 1 },
        },
      },
    ]);

    const venueCountMap = venueCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return businesses.map((business) => ({
      businessId: business._id.toString(),
      businessName: business.businessName,
      venueCount: venueCountMap[business._id.toString()] || 0,
    }));
  }

  /**
   * Get statistics for an owner's businesses and venues
   * @param ownerId - Owner ID
   * @returns Promise<OwnerStatistics>
   */
  static async getOwnerStatistics(ownerId: string) {
    const [businesses, venues] = await Promise.all([
      Business.find({ ownerId: oid(ownerId) }).lean(),
      Venue.find({
        businessId: {
          $in: await Business.find({ ownerId: oid(ownerId) }).distinct("_id"),
        },
      }).lean(),
    ]);

    const businessStats = {
      total: businesses.length,
      active: businesses.filter((b) => b.status === "active").length,
      inactive: businesses.filter((b) => b.status === "inactive").length,
      // pending: businesses.filter((b) => b.status === "pending").length,
    };

    const venueStats = {
      total: venues.length,
      active: venues.filter((v) => v.status === "active").length,
      inactive: venues.filter((v) => v.status === "inactive").length,
      // pending: venues.filter((v) => v.status === "pending").length,
    };

    return {
      ownerId,
      businesses: businessStats,
      venues: venueStats,
      averageVenuesPerBusiness:
        businesses.length > 0
          ? (venues.length / businesses.length).toFixed(2)
          : "0",
    };
  }
}
