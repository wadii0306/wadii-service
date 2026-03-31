import { Router } from "express";
import { VenueContextController } from "../controllers/venueContextController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

// All venue context routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/venue-context
 * @desc    Get user's venue context (available venues and active venue)
 * @access  Private
 */
router.get("/", VenueContextController.getVenueContext);

/**
 * @route   GET /api/venue-context/active
 * @desc    Get current active venue
 * @access  Private
 */
router.get("/active", VenueContextController.getActiveVenue);

/**
 * @route   GET /api/venue-context/venues
 * @desc    Get all venues for authenticated user
 * @access  Private
 */
router.get("/venues", VenueContextController.getUserVenues);

/**
 * @route   POST /api/venue-context/switch
 * @desc    Switch to a different venue
 * @access  Private
 */
router.post("/switch", VenueContextController.switchVenue);

export default router;
