import { Schema, model } from "mongoose";

const UserBusinessRoleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: false, // Optional - if null, applies to entire business
    },
    role: {
      type: String,
      enum: ["developer", "owner", "manager", "admin", "marketing"],
      required: true,
    },
    permissions: { type: [String], default: [] },
    scope: {
      type: String,
      enum: ["business", "venue"], // business = all venues, venue = specific venue
      default: "business",
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who assigned this role
  },
  { timestamps: true }
);

// Allow multiple roles per user-business pair (for different venues)
// Compound index for efficient queries
UserBusinessRoleSchema.index(
  { userId: 1, businessId: 1, venueId: 1 },
  { unique: true, name: "uniq_user_business_venue" }
);

UserBusinessRoleSchema.index(
  { businessId: 1, venueId: 1, role: 1 },
  {
    unique: true,
    name: "uniq_one_manager_per_venue",
    // Only applies to venue-scoped manager rows
    partialFilterExpression: {
      role: "manager",
      venueId: { $exists: true },
    },
  }
);

UserBusinessRoleSchema.index({ businessId: 1, role: 1 });
UserBusinessRoleSchema.index({ venueId: 1, role: 1 });

export const UserBusinessRole = model(
  "UserBusinessRole",
  UserBusinessRoleSchema
);
