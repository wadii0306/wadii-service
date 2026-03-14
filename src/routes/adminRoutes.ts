import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { authMiddleware } from "../middlewares/auth";
import { rolesMiddleware, requirePerm, ROLE_PERMS } from "../middlewares/roles";
import { validate } from "../middlewares/validate";

const adminRoutes = Router();

// All admin routes require authentication + role snapshot
adminRoutes.use(authMiddleware, rolesMiddleware);

// Admin onboarding - atomic user+business+venue creation
adminRoutes.post(
  "/onboard-business",
  requirePerm(ROLE_PERMS.USER_CREATE), // Admin needs user creation permission
  AdminController.onboardBusiness
);

export default adminRoutes;
