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
    password: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, required: true, default: false }, // 👈 default false for self-registration

    firstName: { type: String, required: true },
    lastName: { type: String },
    phone: { type: String, default: null },

    role: {
      type: String,
      enum: ["developer", "owner", "manager", "admin", "marketing"],
      default: "owner",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User = model("User", UserSchema);
