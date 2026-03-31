import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    
    // Google OAuth fields (must be defined before password field)
    googleId: { type: String, default: null },
    googleProfilePicture: { type: String, default: null },
    
    password: { 
      type: String, 
      required: function(this: any): boolean {
        // Password is required unless user has Google ID
        return !this.googleId;
      },
      select: false 
    },
    
    mustChangePassword: { type: Boolean, required: true, default: false }, // 👈 default false for self-registration

    firstName: { type: String, required: true },
    lastName: { type: String },
    phone: { type: String, default: null },
    
    isEmailVerified: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["developer", "owner", "manager", "admin", "marketing"],
      default: "owner",
    },

    // Multi-venue context
    activeBusinessId: { type: Schema.Types.ObjectId, ref: "Business", default: null },
    activeVenueId: { type: Schema.Types.ObjectId, ref: "Venue", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User = model("User", UserSchema);
