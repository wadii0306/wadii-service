
import { Router } from "express";
import { z } from "zod";

import { BusinessController } from "../controllers/businessController";
import { authMiddleware } from "../middlewares/auth";
import { rolesMiddleware, requirePerm, ROLE_PERMS } from "../middlewares/roles";
import { validate } from "../middlewares/validate";
import { businessValidationSchemas, objectId } from "../utils/validator";
import { upload } from "../middlewares/upload";

const businessRoutes = Router();

// All business routes require authentication + role snapshot
businessRoutes.use(authMiddleware, rolesMiddleware);

// Note: Multer will be added later when package is installed
// For now, we'll add the routes structure without file upload

// ----- Schemas for params -----
const paramsWithBusinessId = z.object({ businessId: objectId });
const paramsWithLogoId = z.object({ 
  businessId: objectId, 
  logoId: z.string().min(1, 'Logo ID is required')
});

// Logo validation schemas
const logoUploadSchema = z.object({
  name: z.string().min(1, 'Logo name is required'),
  type: z.enum(['primary', 'secondary', 'favicon', 'watermark'])
});

const logoUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["primary", "secondary", "favicon", "watermark"]).optional(),
  isActive: z.boolean().optional(),
});

const policyUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10, "Content must be at least 10 characters long"),
});

// Create business — any authenticated user
businessRoutes.post(
  "/",
  validate("body", businessValidationSchemas.create),
  BusinessController.createBusiness
);

// Get all businesses — service already scopes non-developers to their businesses
businessRoutes.get("/", BusinessController.getAllBusinesses);

// Get specific business
businessRoutes.get(
  "/:businessId",
  validate("params", paramsWithBusinessId),
  // read permission enforced inside the service
  BusinessController.getBusinessById
);

// Update business
businessRoutes.put(
  "/:businessId",
  validate("params", paramsWithBusinessId),
  validate("body", businessValidationSchemas.update),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.updateBusiness
);

// Delete business — permission checked by middleware
businessRoutes.delete(
  "/:businessId",
  validate("params", paramsWithBusinessId),
  requirePerm([ROLE_PERMS.BUSINESS_DELETE]), // Only developer can delete, or custom logic in controller
  BusinessController.deleteBusiness
);

// ----- Logo Management Routes -----

// Upload logo with multer middleware
businessRoutes.post(
  "/:businessId/logos",
  upload.single("file"),
  validate("params", paramsWithBusinessId),
  validate("body", logoUploadSchema),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.uploadLogo
);

// Get all logos for a business
businessRoutes.get(
  "/:businessId/logos",
  validate("params", paramsWithBusinessId),
  BusinessController.getLogos
);

// Get logos by type (filtered)
businessRoutes.get(
  "/:businessId/logos",
  validate("params", paramsWithBusinessId),
  BusinessController.getLogos
);

// Update logo
businessRoutes.put(
  "/:businessId/logos/:logoId",
  validate("params", paramsWithLogoId),
  validate("body", logoUpdateSchema),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.updateLogo
);

// Remove logo
businessRoutes.delete(
  "/:businessId/logos/:logoId",
  validate("params", paramsWithLogoId),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.removeLogo
);

// Terms & Conditions Routes
businessRoutes.put(
  "/:businessId/terms",
  validate("params", paramsWithBusinessId),
  validate("body", policyUpdateSchema),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.updateTermsAndConditions
);

businessRoutes.get(
  "/:businessId/terms",
  validate("params", paramsWithBusinessId),
  BusinessController.getTermsAndConditions
);

// Payment Policy Routes
businessRoutes.put(
  "/:businessId/payment-policy",
  validate("params", paramsWithBusinessId),
  validate("body", policyUpdateSchema),
  requirePerm(ROLE_PERMS.BUSINESS_UPDATE),
  BusinessController.updatePaymentPolicy
);

businessRoutes.get(
  "/:businessId/payment-policy",
  validate("params", paramsWithBusinessId),
  BusinessController.getPaymentPolicy
);

export default businessRoutes;

