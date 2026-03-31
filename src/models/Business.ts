import mongoose, { Schema } from "mongoose";
import { IBusiness } from "../types";

const businessSchema = new Schema<IBusiness>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
    },
    website: {
      type: String,
      default: null,
    },
    socials: [
      {
        name: String,
        url: String,
      },
    ],
    branding: {
  logos: [
    {
      url: {
        type: String,
        required: true,
        trim: true
      },
      publicId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        enum: ["primary", "secondary", "favicon", "watermark"],
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
},
    qrCode: {
      type: String,
      default: null,
    },
    termsAndConditions: {
      title: {
        type: String,
        default: "Terms and Conditions"
      },
      content: {
        type: String,
        default: ""
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: String,
        default: null
      }
    },
    paymentPolicy: {
      title: {
        type: String,
        default: "Payment Policy"
      },
      content: {
        type: String,
        default: ""
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: String,
        default: null
      }
    },
    status: {
      type: String,
      enum: ["inactive", "active"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: null,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
// Indexes for performance
businessSchema.index({ ownerId: 1 });
businessSchema.index({ status: 1 });
businessSchema.index({ isDeleted: 1 });
businessSchema.index({ createdAt: -1 });

export const Business = mongoose.model<IBusiness>("Business", businessSchema);
