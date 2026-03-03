import { Router } from "express";
import { QRInquiry } from "../models/QRInquiry";
import { Types } from "mongoose";

const inquiryRoutes = Router();

// Get all inquiries for a business
inquiryRoutes.get("/business/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ success: false, message: "Invalid Business ID" });
        }

        const inquiries = await QRInquiry.find({
            businessId: new Types.ObjectId(businessId),
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: inquiries,
        });
    } catch (error) {
        console.error("Error fetching inquiries:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}); 

// Update inquiry status
inquiryRoutes.patch("/:inquiryId/status", async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status } = req.body;

        if (!["pending", "contacted", "converted", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const inquiry = await QRInquiry.findByIdAndUpdate(
            inquiryId,
            { status },
            { new: true }
        );

        if (!inquiry) {
            return res.status(404).json({ success: false, message: "Enquiry not found" });
        }

        res.status(200).json({
            success: true,
            message: "Status updated successfully",
            data: inquiry,
        });
    } catch (error) {
        console.error("Error updating inquiry status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default inquiryRoutes;
