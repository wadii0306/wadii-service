import { Router } from "express";
import { AuthController } from "../controllers/userController";
import { validate } from "../middlewares/validate";
import { userValidationSchemas } from "../utils/validator";
import { authMiddleware } from "../middlewares/auth";
import { rolesMiddleware, requirePerm, ROLE_PERMS } from "../middlewares/roles";

const authRoutes = Router();

authRoutes.post(
  "/register",
  validate("body", userValidationSchemas.register),
  AuthController.register
);
authRoutes.post(
  "/login",
  validate("body", userValidationSchemas.login),
  AuthController.login
);

// Manager/Developer-only route for creating owners
authRoutes.post(
  "/create",
  authMiddleware,
  rolesMiddleware,
  requirePerm(ROLE_PERMS.USER_CREATE),
  validate("body", userValidationSchemas.createUserByAdmin),
  AuthController.createByAdmin
);

// Protected routes
authRoutes.get("/profile", authMiddleware, AuthController.getProfile);

authRoutes.get(
  "/owners",
  authMiddleware,
  rolesMiddleware,
  AuthController.getAllOwners
);
authRoutes.get(
  "/owners/paginated",
  authMiddleware,
  rolesMiddleware,
  AuthController.getAllOwnersPaginated
);

authRoutes.get(
  "/:userId",
  authMiddleware,
  rolesMiddleware,
  AuthController.getUserById
);

/**
 * @route   GET /api/owners/:ownerId/businesses/stats
 * @desc    Get statistics for owner's businesses
 * @access  Private
 * @query   None
 */
authRoutes.get(
  "/owners/:ownerId/businesses/stats",
  authMiddleware,
  rolesMiddleware,
  AuthController.getOwnerBusinessStats
);

/**
 * @route   GET /api/owners/:ownerId/businesses
 * @desc    Get all businesses and venues for a specific owner
 * @access  Private
 * @query   businessStatus - Filter by business status (active/inactive)
 * @query   venueStatus - Filter by venue status (active/inactive)
 * @query   includeVenues - Include venues in response (default: true)
 * @query   businessFields - Select specific business fields (comma-separated)
 * @query   venueFields - Select specific venue fields (comma-separated)
 * @query   limit - Number of businesses to return
 * @query   skip - Number of businesses to skip (for pagination)
 */
authRoutes.get(
  "/owners/:ownerId/businesses",
  authMiddleware,
  rolesMiddleware,
  AuthController.getOwnerBusinessesWithVenues
);

/**
 * @route   GET /api/owners/:ownerId/businesses/:businessId
 * @desc    Get a single business with its venues for an owner
 * @access  Private
 */
authRoutes.get(
  "/owners/:ownerId/businesses/:businessId",
  authMiddleware,
  rolesMiddleware,
  AuthController.getOwnerBusinessById
);



export default authRoutes;
