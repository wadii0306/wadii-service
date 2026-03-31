import { Schema, model, Types, Document } from "mongoose";

export interface ILeadActivity extends Document {
  leadId: Types.ObjectId;

  header: string;        // short title
  description: string;   // detailed note

  status: "pending" | "completed" | "cancelled";

  outcome?:
    | "interested"
    | "not_interested"
    | "follow_up_needed"
    | "converted"
    | "lost";

  followUpDate?: Date;   // date + time combined (UTC)

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    header: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    outcome: {
      type: String,
      enum: [
        "interested",
        "not_interested",
        "follow_up_needed",
        "converted",
        "lost",
      ],
    },

    followUpDate: {
      type: Date, // store UTC
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt in UTC
    versionKey: false,
  }
);

// Minimal V1 indexes for performance
LeadActivitySchema.index({ leadId: 1, createdAt: -1 }); // Timeline view
LeadActivitySchema.index({ followUpDate: 1 }); // Reminder queries

export const LeadActivity = model<ILeadActivity>("LeadActivity", LeadActivitySchema);