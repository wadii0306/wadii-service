import { Router } from "express";
import { Business } from "../models/Business";
import { QRInquiry } from "../models/QRInquiry";
import { Types } from "mongoose";

const publicRoutes = Router();

// Get public business info for inquiry page
publicRoutes.get("/business/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ success: false, message: "Invalid Business ID" });
        }

        const business = await Business.findOne({
            _id: new Types.ObjectId(businessId),
            isDeleted: false,
        }).select("businessName contact address website branding status");

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        res.status(200).json({
            success: true,
            data: business,
        });
    } catch (error) {
        console.error("Error fetching public business info:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Submit enquiry from QR code scan
publicRoutes.post("/inquiry/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;
        const inquiryData = req.body;

        if (!Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ success: false, message: "Invalid Business ID" });
        }

        // Check if business exists
        const business = await Business.findOne({ _id: new Types.ObjectId(businessId), isDeleted: false });
        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        const newInquiry = new QRInquiry({
            ...inquiryData,
            businessId: new Types.ObjectId(businessId),
            status: "pending"
        });

        await newInquiry.save();

        res.status(201).json({
            success: true,
            message: "Enquiry submitted successfully",
            data: newInquiry
        });
    } catch (error) {
        console.error("Error submitting public enquiry:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default publicRoutes;
