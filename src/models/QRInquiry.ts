import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQRInquiry extends Document {
    businessId: Types.ObjectId;
    clientName: string;
    contactNo: string;
    email: string;
    occasionType: string;
    numberOfGuests: number;
    eventStartDateTime: Date;
    eventEndDateTime: Date;
    status: "pending" | "contacted" | "converted" | "rejected";
    createdAt: Date;
    updatedAt: Date;
}
const qrInquirySchema = new Schema<IQRInquiry>(
    {
        businessId: {
            type: Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true,
        },
        clientName: {
            type: String,
            required: true,
            trim: true,
        },
        contactNo: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        occasionType: {
            type: String,
            required: true,
            trim: true,
        },
        numberOfGuests: {
            type: Number,
            required: true,
            min: 1,
        },
        eventStartDateTime: {
            type: Date,
            required: true,
        },
        eventEndDateTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "contacted", "converted", "rejected"],
            default: "pending",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

qrInquirySchema.index({ businessId: 1, createdAt: -1 });

export const QRInquiry = mongoose.model<IQRInquiry>("QRInquiry", qrInquirySchema);
