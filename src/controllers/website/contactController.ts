import { Request, Response } from "express";
import { Types } from "mongoose";
import contactService from "../../services/website/contactService";
import {
  createContactSchema,
  updateContactSchema,
  addAdminNoteSchema,
  contactQuerySchema,
  getContactByIdSchema,
  deleteContactSchema,
  CreateContactInput,
  UpdateContactInput,
  AddAdminNoteInput,
  ContactQueryInput,
  GetContactByIdInput,
  DeleteContactInput
} from "../../validators/website/contact-validator";

const oid = (id: string) => new Types.ObjectId(id);

export class ContactController {
  /**
   * Create a new contact submission from website form
   * POST /api/website/contact
   * Public endpoint - no auth required
   */
  static async createContact(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const contactData: CreateContactInput = req.body;
      const result = await contactService.createContact(contactData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in createContact controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to create contact submission"]
      });
    }
  }

  /**
   * Get all contacts with filtering and pagination
   * GET /api/website/contact
   * Required: contact.read permission
   */
  static async getContacts(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      console.log('[CONTACT] getContacts called');
      console.log('[CONTACT] req.user:', req.user);
      console.log('[CONTACT] req.userRole:', (req as any).userRole);
      
      if (!req.user?.userId) {
        console.log('[CONTACT] No userId in request');
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      console.log('[CONTACT] User authenticated, calling contactService');
      const filters: ContactQueryInput = req.query;
      const result = await contactService.getContacts(filters);

      console.log('[CONTACT] contactService result:', result);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getContacts controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to retrieve contacts"]
      });
    }
  }

  /**
   * Get a single contact by ID
   * GET /api/website/contact/:id
   * Required: contact.read permission
   */
  static async getContactById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const id = req.params.id as string;
      const result = await contactService.getContactById(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("Error in getContactById controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to retrieve contact"]
      });
    }
  }

  /**
   * Update a contact (admin use)
   * PUT /api/website/contact/:id
   * Required: contact.update permission
   */
  static async updateContact(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const id: string = req.params.id;
      const updateData: UpdateContactInput = req.body;
      
      const result = await contactService.updateContact(id, updateData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("Error in updateContact controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to update contact"]
      });
    }
  }

  /**
   * Add a new admin note to a contact
   * POST /api/website/contact/:id/notes
   * Required: contact.update permission
   */
  static async addAdminNote(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const id = req.params.id as string;
      const { note }: AddAdminNoteInput = req.body;
      
      const result = await contactService.addAdminNote(id, note);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("Error in addAdminNote controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to add admin note"]
      });
    }
  }

  /**
   * Delete a contact
   * DELETE /api/website/contact/:id
   * Required: contact.delete permission
   */
  static async deleteContact(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const id = req.params.id as string;
      const result = await contactService.deleteContact(id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("Error in deleteContact controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to delete contact"]
      });
    }
  }

  /**
   * Get contact statistics for dashboard
   * GET /api/website/contact/stats
   * Required: contact.read permission
   */
  static async getContactStats(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await contactService.getContactStats();

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getContactStats controller:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: ["Failed to retrieve contact statistics"]
      });
    }
  }
}