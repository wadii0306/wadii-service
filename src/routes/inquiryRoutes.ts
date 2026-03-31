import { Router } from "express";
import { QRInquiry } from "../models/QRInquiry";
import { Types } from "mongoose";
import { authMiddleware } from "../middlewares/auth";

const inquiryRoutes = Router();

// All routes require authentication
inquiryRoutes.use(authMiddleware);

/**
 * Get all inquiries for a business
 * GET /api/inquiries/business/:businessId
 */
inquiryRoutes.get("/business/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Business ID" 
            });
        }

        const inquiries = await QRInquiry.find({
            businessId: new Types.ObjectId(businessId),
        })
        .sort({ createdAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            data: inquiries,
        });
    } catch (error) {
        console.error("Error fetching inquiries:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

/**
 * Get inquiry by ID
 * GET /api/inquiries/:inquiryId
 */
inquiryRoutes.get("/:inquiryId", async (req, res) => {
    try {
        const { inquiryId } = req.params;

        if (!Types.ObjectId.isValid(inquiryId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Inquiry ID" 
            });
        }

        const inquiry = await QRInquiry.findById(inquiryId).lean();

        if (!inquiry) {
            return res.status(404).json({ 
                success: false, 
                message: "Inquiry not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: inquiry,
        });
    } catch (error) {
        console.error("Error fetching inquiry:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

/**
 * Update inquiry status
 * PATCH /api/inquiries/:inquiryId/status
 */
inquiryRoutes.patch("/:inquiryId/status", async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status } = req.body;

        if (!Types.ObjectId.isValid(inquiryId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Inquiry ID" 
            });
        }

        const validStatuses = ["pending", "contacted", "converted", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid status. Must be one of: pending, contacted, converted, rejected" 
            });
        }

        const inquiry = await QRInquiry.findByIdAndUpdate(
            inquiryId,
            { status },
            { new: true, runValidators: true }
        ).lean();

        if (!inquiry) {
            return res.status(404).json({ 
                success: false, 
                message: "Inquiry not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Inquiry status updated successfully",
            data: inquiry,
        });
    } catch (error) {
        console.error("Error updating inquiry status:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

/**
 * Delete inquiry
 * DELETE /api/inquiries/:inquiryId
 */
inquiryRoutes.delete("/:inquiryId", async (req, res) => {
    try {
        const { inquiryId } = req.params;

        if (!Types.ObjectId.isValid(inquiryId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Inquiry ID" 
            });
        }

        const inquiry = await QRInquiry.findByIdAndDelete(inquiryId);

        if (!inquiry) {
            return res.status(404).json({ 
                success: false, 
                message: "Inquiry not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Inquiry deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting inquiry:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

export default inquiryRoutes;
