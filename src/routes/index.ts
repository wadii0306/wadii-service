import { Router } from "express";
import authRoutes from "./userRoutes";
import businessRoutes from "./businessRoutes";
import venueRoutes from "./venueRoutes";
import managerRoutes from "./managerRoutes";
import leadRoutes from "./leadRoutes";
import bookingRoutes from "./bookingRoutes";
import transactionRoutes from "./transactionRoutes";
import purchaseOrderRoutes from "./purchaseOrderRoutes";
import reportRoutes from "./reportRoutes";
import blackoutDayRoutes from "./blackoutDayRoutes";
import foodMenuRoutes from "./foodMenuRoutes";
import leadRemarkRoutes from "./leadRemarkRoutes";
import contactRoutes from "./website/contactRouts";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Banquet Booking API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

router.use("/auth", authRoutes);
router.use("/businesses", businessRoutes);
router.use("/venues", venueRoutes);
router.use("/venues", foodMenuRoutes); // Food menu routes under /venues/:venueId/food-menu
router.use("/managers", managerRoutes);
router.use("/leads", leadRoutes);
router.use("/bookings", bookingRoutes);
router.use("/transactions", transactionRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/reports", reportRoutes);
router.use("/blackout-days", blackoutDayRoutes);
router.use("/lead-remarks", leadRemarkRoutes);
router.use("/website", contactRoutes);

export default router;