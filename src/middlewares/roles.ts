import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { UserBusinessRole } from "../models/UserBusinessRole";
import { Venue } from "../models/Venue";
import { User } from "../models/User";

// Updated role types for the new system
export type RoleSnapshot = {
  role: "developer" | "owner" | "manager";
  permissions?: string[];
};

// Comprehensive permission constants - organized by domain
export const PERMS = {
  // User management
  USER_CREATE: "user.create",
  USER_READ: "user.read",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",

  // Business management
  BUSINESS_CREATE: "business.create",
  BUSINESS_READ: "business.read",
  BUSINESS_UPDATE: "business.update",
  BUSINESS_DELETE: "business.delete",

  // Venue management
  VENUE_CREATE: "venue.create",
  VENUE_READ: "venue.read",
  VENUE_UPDATE: "venue.update",
  VENUE_DELETE: "venue.delete",

  // Package management
  PACKAGE_CREATE: "package.create",
  PACKAGE_READ: "package.read",
  PACKAGE_UPDATE: "package.update",
  PACKAGE_DELETE: "package.delete",

  // Vendor management
  VENDOR_CREATE: "vendor.create",
  VENDOR_READ: "vendor.read",
  VENDOR_UPDATE: "vendor.update",
  VENDOR_DELETE: "vendor.delete",

  // Booking management (future-ready)
  BOOKING_CREATE: "booking.create",
  BOOKING_READ: "booking.read",
  BOOKING_UPDATE: "booking.update",
  BOOKING_DELETE: "booking.delete",

  // Notes management (future-ready)
  NOTES_CREATE: "notes.create",
  NOTES_READ: "notes.read",
  NOTES_UPDATE: "notes.update",
  NOTES_DELETE: "notes.delete",

  // Timeslot management (future-ready)
  TIMESLOT_CREATE: "timeslot.create",
  TIMESLOT_READ: "timeslot.read",
  TIMESLOT_UPDATE: "timeslot.update",
  TIMESLOT_DELETE: "timeslot.delete",

  // Manager assignment (for venue-level management)
  MANAGER_CREATE: "manager.create",
  MANAGER_READ: "manager.read",
  MANAGER_ASSIGN: "manager.assign",
  MANAGER_UPDATE: "manager.update",
  MANAGER_DELETE: "manager.delete",

  LEAD_CREATE: "lead.create",
  LEAD_READ: "lead.read",
  LEAD_ASSIGN: "lead.assign",
  LEAD_UPDATE: "lead.update",
  LEAD_DELETE: "lead.delete",

  // Contact management
  CONTACT_CREATE: "contact.create",
  CONTACT_READ: "contact.read",
  CONTACT_UPDATE: "contact.update",
  CONTACT_DELETE: "contact.delete",
} as const;

// Role to permissions mapping - easily extensible
export const ROLE_TO_PERMS = {
  // DEVELOPER: Full system access (like superadmin)
  developer: [
    // All user permissions
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    // All business permissions
    "business.create",
    "business.read",
    "business.update",
    "business.delete",
    // All venue permissions
    "venue.create",
    "venue.read",
    "venue.update",
    "venue.delete",
    // All package permissions
    "package.create",
    "package.read",
    "package.update",
    "package.delete",
    // All vendor permissions
    "vendor.create",
    "vendor.read",
    "vendor.update",
    "vendor.delete",
    // All booking permissions
    "booking.create",
    "booking.read",
    "booking.update",
    "booking.delete",
    // All notes permissions
    "notes.create",
    "notes.read",
    "notes.update",
    "notes.delete",
    // All timeslot permissions
    "timeslot.create",
    "timeslot.read",
    "timeslot.update",
    "timeslot.delete",
    // All manager permissions
    "manager.create",
    "manager.read",
    "manager.assign",
    "manager.update",
    "manager.delete",
  ],

  // OWNER: Can manage their own business and everything within it
  owner: [
    // Limited user management (can manage users in their business)
    "user.read",
    "user.update",
    // Full business management for their business
    "business.read",
    "business.update",
    // Full venue management
    "venue.create",
    "venue.read",
    "venue.update",
    "venue.delete",
    // Full package management
    "package.create",
    "package.read",
    "package.update",
    "package.delete",
    // Full vendor management
    "vendor.create",
    "vendor.read",
    "vendor.update",
    "vendor.delete",
    // Full booking management
    "booking.create",
    "booking.read",
    "booking.update",
    "booking.delete",
    // Full notes management
    "notes.create",
    "notes.read",
    "notes.update",
    "notes.delete",
    // Full timeslot management
    "timeslot.create",
    "timeslot.read",
    "timeslot.update",
    "timeslot.delete",
    // Full manager management
    "manager.create",
    "manager.read",
    "manager.assign",
    "manager.update",
    "manager.delete",
    "lead.create",
    "lead.read",
    "lead.assign",
    "lead.update",
    "lead.delete",
    // All contact permissions
    "contact.create",
    "contact.read",
    "contact.update",
    "contact.delete",
  ],

  // MANAGER: Can access and modify all data but with some restrictions
  manager: [
    // Read all, create/update most (but not delete users or businesses)
    "user.read",
    "user.update",
    "business.read",
    "business.update",
    // Full venue management
    "venue.create",
    "venue.read",
    "venue.update",
    "venue.delete",
    // Full package management
    "package.create",
    "package.read",
    "package.update",
    "package.delete",
    // Full vendor management
    "vendor.create",
    "vendor.read",
    "vendor.update",
    "vendor.delete",
    // Full booking management
    "booking.create",
    "booking.read",
    "booking.update",
    "booking.delete",
    // Full notes management
    "notes.create",
    "notes.read",
    "notes.update",
    "notes.delete",
    // Full timeslot management
    "timeslot.create",
    "timeslot.read",
    "timeslot.update",
    "timeslot.delete",
    // Manager read access only
    "manager.read",
    // Full lead management
    "lead.create",
    "lead.read",
    "lead.assign",
    "lead.update",
    "lead.delete",
    // Full contact management
    "contact.create",
    "contact.read",
    "contact.update",
    "contact.delete",
  ],
} as const;

const oid = (id: string | Types.ObjectId) =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

const hasPerm = (role?: RoleSnapshot, perm?: string): boolean => {
  if (!role) return false;

  // DEVELOPER has full access
  if (role.role === "developer") return true;

  if (!perm) return false;

  // First check explicit permissions from database (if any)
  if (Array.isArray(role.permissions) && role.permissions.length > 0) {
    return role.permissions.includes(perm);
  }

  // Fall back to role-based permissions
  const rolePerms = ROLE_TO_PERMS[role.role] as readonly string[];
  return rolePerms ? rolePerms.includes(perm) : false;
};

/**
 * Try to infer the businessId for this request.
 * Priority:
 *   1) req.params.businessId
 *   2) req.params.venueId -> look up Venue.businessId
 *   3) req.params.bookingId -> look up Booking.venueId -> Venue.businessId
 *   3.1) req.params.leadId -> look up Lead.venueId -> Venue.businessId
 *   4) req.query.venueId -> look up Venue.businessId (for GET requests with query params)
 *   5) req.query.businessId (for GET requests with query params)
 *   6) req.query.bookingId -> look up Booking.venueId -> Venue.businessId
 *   6.1) req.query.leadId -> look up Lead.venueId -> Venue.businessId
 *   7) req.body.businessId
 *   8) req.body.venueId -> look up Venue.businessId
 *   9) req.body.bookingId -> look up Booking.venueId -> Venue.businessId
 *   9.1) req.body.leadId -> look up Lead.venueId -> Venue.businessId
 */
export async function resolveBusinessId(
  req: Request
): Promise<string | undefined> {
  try {
    const p = req.params ?? {};
    const b = req.body ?? {};
    const q = req.query ?? {};

    // (1) Direct businessId param
    if (p["businessId"]) {
      return p["businessId"];
    }

    // (2) venueId param
    if (p["venueId"]) {
      const venue = await Venue.findById(oid(p["venueId"]))
        .select("businessId")
        .lean();
      const businessId = venue ? String(venue.businessId) : undefined;
      return businessId;
    }

    // (3) bookingId param -> lookup venue -> businessId
    if (p["bookingId"]) {
      const Booking = (await import("../models/Booking")).Booking;
      const booking = await Booking.findById(oid(p["bookingId"]))
        .select("venueId")
        .lean();
      if (booking) {
        const venue = await Venue.findById(booking.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    // (3.1) leadId param -> lookup venue -> businessId
    if (p["leadId"]) {
      const Lead = (await import("../models/Lead")).Lead;
      const lead = await Lead.findById(oid(p["leadId"]))
        .select("venueId")
        .lean();
      if (lead) {
        const venue = await Venue.findById(lead.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    // (4) venueId in query (for GET requests)
    if (q["venueId"] && typeof q["venueId"] === "string") {
      const venue = await Venue.findById(oid(q["venueId"]))
        .select("businessId")
        .lean();
      const businessId = venue ? String(venue.businessId) : undefined;
      return businessId;
    }

    // (5) businessId in query (for GET requests)
    if (q["businessId"] && typeof q["businessId"] === "string") {
      return q["businessId"];
    }

    // (6) bookingId in query -> lookup venue -> businessId
    if (q["bookingId"] && typeof q["bookingId"] === "string") {
      const Booking = (await import("../models/Booking")).Booking;
      const booking = await Booking.findById(oid(q["bookingId"]))
        .select("venueId")
        .lean();
      if (booking) {
        const venue = await Venue.findById(booking.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    // (6.1) leadId in query -> lookup venue -> businessId
    if (q["leadId"] && typeof q["leadId"] === "string") {
      const Lead = (await import("../models/Lead")).Lead;
      const lead = await Lead.findById(oid(q["leadId"]))
        .select("venueId")
        .lean();
      if (lead) {
        const venue = await Venue.findById(lead.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    // (7) businessId in body
    if (b?.businessId) {
      return b.businessId;
    }

    // (8) venueId in body
    if (b?.venueId) {
      const venue = await Venue.findById(oid(b.venueId))
        .select("businessId")
        .lean();
      const businessId = venue ? String(venue.businessId) : undefined;
      return businessId;
    }

    // (9) bookingId in body -> lookup venue -> businessId
    if (b?.bookingId) {
      const Booking = (await import("../models/Booking")).Booking;
      const booking = await Booking.findById(oid(b.bookingId))
        .select("venueId")
        .lean();
      if (booking) {
        const venue = await Venue.findById(booking.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    // (9.1) leadId in body -> lookup venue -> businessId
    if (b?.leadId) {
      const Lead = (await import("../models/Lead")).Lead;
      const lead = await Lead.findById(oid(b.leadId))
        .select("venueId")
        .lean();
      if (lead) {
        const venue = await Venue.findById(lead.venueId)
          .select("businessId")
          .lean();
        const businessId = venue ? String(venue.businessId) : undefined;
        return businessId;
      }
    }

    return undefined;
  } catch (err: any) {
    console.error("Error resolving businessId:", err);
    return undefined;
  }
}

/**
 * rolesMiddleware
 * - Requires auth middleware to have set req.user.userId
 * - Attaches a lightweight RoleSnapshot to req.userRole if a role for the resolved business exists.
 * - If no role found, leaves req.userRole undefined (controllers/services will enforce access).
 */
export async function rolesMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const extReq = req as any;

    // If already set (e.g., by a previous middleware), skip
    if (extReq.userRole) {
      return next();
    }

    if (!extReq.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check if user is a developer - grant full access
    if (extReq.user?.role === "developer") {
      extReq.userRole = {
        role: "developer",
        permissions: ["*"],
      };
      return next();
    }

    const businessId = await resolveBusinessId(req);

    if (!businessId) {
      return next();
    }

    const roleDoc = await UserBusinessRole.findOne({
      userId: oid(extReq.user.userId),
      businessId: oid(businessId),
    })
      .select("role permissions")
      .lean();

    if (roleDoc) {
      extReq.userRole = {
        role: roleDoc.role,
        permissions: roleDoc.permissions ?? [],
      };
    }

    return next();
  } catch (err: any) {
    console.error("Error in rolesMiddleware:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve user role" });
  }
}

/**
 * requirePerm
 * - Route guard for specific permission(s).
 * - If user is developer, always allowed.
 * - If no role on request, it tries to resolve businessId and load the role (same as rolesMiddleware).
 */
export function requirePerm(perm: string | string[]) {
  const perms = Array.isArray(perm) ? perm : [perm];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const extReq = req as any;

      // Check user presence
      if (!extReq.user?.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Ensure userRole is present (if not, fetch)
      if (!extReq.userRole) {
        const businessId = await resolveBusinessId(req);

        if (businessId) {
          const roleDoc = await UserBusinessRole.findOne({
            userId: oid(extReq.user.userId),
            businessId: oid(businessId),
          })
            .select("role permissions")
            .lean();

          if (roleDoc) {
            extReq.userRole = {
              role: roleDoc.role,
              permissions: roleDoc.permissions ?? [],
            } as RoleSnapshot;
          }
        }
      }

      // Developer bypass
      if (extReq.userRole?.role === "developer") {
        return next();
      }

      // Permission check
      const ok = perms.every((p) =>
        hasPerm(extReq.userRole as RoleSnapshot | undefined, p)
      );

      if (!ok) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient permissions",
        });
      }

      return next();
    } catch (err: any) {
      console.error("Error in requirePerm:", err);
      return res
        .status(500)
        .json({ success: false, message: "Role/permission check failed" });
    }
  };
}

// Helper functions for role management
export const RoleHelper = {
  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: string, permission: string): boolean {
    if (role === "developer") return true;
    const rolePerms = ROLE_TO_PERMS[
      role as keyof typeof ROLE_TO_PERMS
    ] as readonly string[];
    return rolePerms ? rolePerms.includes(permission) : false;
  },

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: string): string[] {
    if (role === "developer") {
      return Object.values(PERMS);
    }
    return [...(ROLE_TO_PERMS[role as keyof typeof ROLE_TO_PERMS] || [])];
  },

  /**
   * Check if user can access a specific business context
   */
  canAccessBusiness(
    userRole?: RoleSnapshot,
    requiredBusinessId?: string
  ): boolean {
    if (!userRole) return false;
    if (userRole.role === "developer") return true;
    // For now, all business-scoped roles can access their business
    // Future: implement business-specific access control
    return true;
  },

  /**
   * Create a requireRole middleware (alternative to requirePerm)
   */
  requireRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const extReq = req as any;

        if (!extReq.user?.userId) {
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });
        }

        // Ensure role is resolved
        if (!extReq.userRole) {
          const businessId = await resolveBusinessId(req);
          if (businessId) {
            const roleDoc = await UserBusinessRole.findOne({
              userId: oid(extReq.user.userId),
              businessId: oid(businessId),
            })
              .select("role permissions")
              .lean();

            if (roleDoc) {
              extReq.userRole = {
                role: roleDoc.role,
                permissions: roleDoc.permissions ?? [],
              } as RoleSnapshot;
            }
          }
        }

        if (!extReq.userRole || !allowedRoles.includes(extReq.userRole.role)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: insufficient role access",
          });
        }

        return next();
      } catch (err: any) {
        console.error("Error in requireRole:", err);
        return res
          .status(500)
          .json({ success: false, message: "Role check failed" });
      }
    };
  },
};

// Export permission constants for convenience in routes
export const ROLE_PERMS = PERMS;
