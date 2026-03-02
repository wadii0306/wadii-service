import mongoose, { Schema, Document } from "mongoose";
import { IWebsiteContact } from "../../types/website/contact.types";

const WebsiteContactSchema = new Schema<IWebsiteContact>({
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    minlength: [2, "Full name must be at least 2 characters"],
    maxlength: [100, "Full name cannot exceed 100 characters"]
  },
  banquetName: {
    type: String,
    required: [true, "Banquet name is required"],
    trim: true,
    minlength: [2, "Banquet name must be at least 2 characters"],
    maxlength: [200, "Banquet name cannot exceed 200 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Please enter a valid email address"
    ]
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    match: [
      /^\d{10}$/,
      "Phone number must be exactly 10 digits"
    ]
  },
  city: {
    type: String,
    required: [true, "City is required"],
    trim: true,
    minlength: [2, "City must be at least 2 characters"],
    maxlength: [100, "City cannot exceed 100 characters"]
  },
  venueType: {
    type: String,
    trim: true,
    enum: {
      values: ["Banquet Hall", "Hotel", "Resort", "Event Space", "Restaurant", "Other"],
      message: "Please select a valid venue type"
    }
  },
  message: {
    type: String,
    trim: true,
    maxlength: [2000, "Message cannot exceed 2000 characters"]
  },
  status: {
    type: String,
    enum: ["new", "contacted", "converted", "closed"],
    default: "new"
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  adminNotes: [{
    note: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
WebsiteContactSchema.index({ email: 1 });
WebsiteContactSchema.index({ phone: 1 });
WebsiteContactSchema.index({ status: 1 });
WebsiteContactSchema.index({ priority: 1 });
WebsiteContactSchema.index({ city: 1 });
WebsiteContactSchema.index({ venueType: 1 });
WebsiteContactSchema.index({ createdAt: -1 });

// Compound indexes for common queries
WebsiteContactSchema.index({ status: 1, createdAt: -1 });
WebsiteContactSchema.index({ priority: 1, status: 1 });
WebsiteContactSchema.index({ city: 1, status: 1 });

// Static method to check for duplicate contacts
WebsiteContactSchema.statics.findDuplicate = function(email: string, phone: string, days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.findOne({
    $or: [
      { email: email },
      { phone: phone }
    ],
    createdAt: { $gte: cutoffDate }
  });
};

// Pre-save middleware to set default status and priority if not provided
WebsiteContactSchema.pre('save', function(next) {
  if (!this.status) {
    this.status = 'new';
  }
  if (!this.priority) {
    this.priority = (this as any).determinePriority();
  }
  next();
});

// Instance method to determine priority based on contact data
WebsiteContactSchema.methods.determinePriority = function(this: IWebsiteContact): "low" | "medium" | "high" {
  let score = 0;

  // High priority indicators
  if (this.venueType && ["Hotel", "Resort"].includes(this.venueType)) {
    score += 2;
  }
  if (this.message && this.message.length > 100) {
    score += 1;
  }

  // Medium priority indicators
  if (this.venueType && ["Banquet Hall", "Event Space"].includes(this.venueType)) {
    score += 1;
  }

  // Determine priority based on score
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
};

export default mongoose.model<IWebsiteContact>("WebsiteContact", WebsiteContactSchema);