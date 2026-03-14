import { Router } from "express";
import { ContactController } from "../../controllers/website/contactController";
import { validate } from "../../middlewares/validate";
import { requirePerm } from "../../middlewares/roles";
import { ROLE_PERMS } from "../../middlewares/roles";
import {
  createContactSchema,
  updateContactSchema,
  addAdminNoteSchema,
  contactQuerySchema,
  getContactByIdSchema,
  deleteContactSchema,
} from "../../validators/website/contact-validator";
import { authMiddleware } from "../../middlewares/auth";

const contactRoutes = Router();

/**
 * Create a new contact submission from website form
 * POST /api/website/contact
 * Public endpoint - no auth required
 */
contactRoutes.post(
  "/",
  validate("body", createContactSchema),
  ContactController.createContact
);

/**
 * Get all contacts with filtering and pagination
 * GET /api/website/contact
 * Required: contact.read permission
 */
contactRoutes.get(
  "/",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_READ),
  validate("query", contactQuerySchema),
  ContactController.getContacts
);

/**
 * Get contact statistics for dashboard
 * GET /api/website/contact/stats
 * Required: contact.read permission
 */
contactRoutes.get(
  "/stats",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_READ),
  ContactController.getContactStats
);

/**
 * Get a single contact by ID
 * GET /api/website/contact/:id
 * Required: contact.read permission
 * Note: Only matches valid ObjectId patterns (24 hex characters)
 */
contactRoutes.get(
  "/:id([0-9a-fA-F]{24})",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_READ),
  validate("params", getContactByIdSchema),
  ContactController.getContactById
);

/**
 * Get all contacts with filtering and pagination
 * GET /api/website/contact
 * Required: contact.read permission
 */
contactRoutes.get(
  "/",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_READ),
  validate("query", contactQuerySchema),
  ContactController.getContacts
);

/**
 * Update a contact (admin use)
 * PUT /api/website/contact/:id
 * Required: contact.update permission
 */
contactRoutes.put(
  "/:id([0-9a-fA-F]{24})",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_UPDATE),
  validate("params", getContactByIdSchema),
  validate("body", updateContactSchema),
  ContactController.updateContact
);

/**
 * Add a new admin note to a contact
 * POST /api/website/contact/:id/notes
 * Required: contact.update permission
 */
contactRoutes.post(
  "/:id([0-9a-fA-F]{24})/notes",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_UPDATE),
  validate("params", getContactByIdSchema),
  validate("body", addAdminNoteSchema),
  ContactController.addAdminNote
);

/**
 * Delete a contact
 * DELETE /api/website/contact/:id
 * Required: contact.delete permission
 */
contactRoutes.delete(
  "/:id([0-9a-fA-F]{24})",
  authMiddleware,
  requirePerm(ROLE_PERMS.CONTACT_DELETE),
  validate("params", deleteContactSchema),
  ContactController.deleteContact
);

export default contactRoutes;