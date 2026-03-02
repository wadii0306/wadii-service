import { z } from "zod";

/**
 * Admin note schema for internal notes
 */
const adminNoteSchema = z.object({
  note: z.string().trim().min(1, "Note content is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create contact submission schema (from website form)
 */
export const createContactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  banquetName: z
    .string()
    .trim()
    .min(2, "Banquet name must be at least 2 characters")
    .max(200, "Banquet name cannot exceed 200 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100, "City cannot exceed 100 characters"),
  venueType: z
    .enum(["Banquet Hall", "Hotel", "Resort", "Event Space", "Restaurant", "Other"])
    .optional(),
  message: z
    .string()
    .trim()
    .max(2000, "Message cannot exceed 2000 characters")
    .optional(),
});

/**
 * Update contact schema (admin use)
 */
export const updateContactSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .optional(),
    banquetName: z
      .string()
      .trim()
      .min(2, "Banquet name must be at least 2 characters")
      .max(200, "Banquet name cannot exceed 200 characters")
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, "City must be at least 2 characters")
      .max(100, "City cannot exceed 100 characters")
      .optional(),
    venueType: z
      .enum(["Banquet Hall", "Hotel", "Resort", "Event Space", "Restaurant", "Other"])
      .optional(),
    message: z
      .string()
      .trim()
      .max(2000, "Message cannot exceed 2000 characters")
      .optional(),
    status: z
      .enum(["new", "contacted", "converted", "closed"])
      .optional(),
    priority: z
      .enum(["low", "medium", "high"])
      .optional(),
    adminNotes: z
      .array(adminNoteSchema)
      .optional(),
  })
  .partial();

/**
 * Add admin note schema
 */
export const addAdminNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Note content is required")
    .max(1000, "Note cannot exceed 1000 characters"),
});

/**
 * Contact query filters schema
 */
export const contactQuerySchema = z.object({
  status: z
    .enum(["new", "contacted", "converted", "closed"])
    .optional(),
  priority: z
    .enum(["low", "medium", "high"])
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, "City filter must be at least 1 character")
    .optional(),
  venueType: z
    .enum(["Banquet Hall", "Hotel", "Resort", "Event Space", "Restaurant", "Other"])
    .optional(),
  startDate: z
    .string()
    .datetime("Invalid start date format")
    .optional(),
  endDate: z
    .string()
    .datetime("Invalid end date format")
    .optional(),
  searchTerm: z
    .string()
    .trim()
    .min(1, "Search term must be at least 1 character")
    .optional(),
  page: z
    .coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(1)
    .optional(),
  limit: z
    .coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10)
    .optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "fullName", "priority"])
    .default("createdAt")
    .optional(),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc")
    .optional(),
})
.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  }
);

/**
 * Get contact by ID schema
 */
export const getContactByIdSchema = z.object({
  id: z
    .string()
    .min(1, "Contact ID is required")
});

/**
 * Delete contact schema
 */
export const deleteContactSchema = z.object({
  id: z
    .string()
    .min(1, "Contact ID is required")
});

// Export types for use in controllers and services
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type AddAdminNoteInput = z.infer<typeof addAdminNoteSchema>;
export type ContactQueryInput = z.infer<typeof contactQuerySchema>;
export type GetContactByIdInput = z.infer<typeof getContactByIdSchema>;
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;