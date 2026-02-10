// validators/lead-validator.ts
import { z } from "zod";
import { objectId, bankDetailsSchema } from "../utils/validator";

/**
 * Food item schema
 */
const foodItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  isCustom: z.boolean(),
})

/**
 * Food section schema
 */
const foodSectionSchema = z.object({
  sectionName: z.string().min(1),
  selectionType: z.enum(["free", "limit", "all_included"]),
  maxSelectable: z.number().int().min(1).optional(),
  defaultPrice: z.number().min(0).optional(),
  items: z.array(foodItemSchema).default([]),
  sectionTotalPerPerson: z.number().min(0).default(0),
});

/**
 * Food package schema
 */
const foodPackageSchema = z.object({
  sourcePackageId: z.string().optional(),
  name: z.string().min(1),
  isCustomised: z.boolean().optional().default(false),
  inclusions: z.array(z.string()).optional().default([]),
  sections: z
    .array(foodSectionSchema)
    .min(1, 'At least one section is required'),
  totalPricePerPerson: z.number().min(0).default(0),
  defaultPrice: z.number().min(0).optional(),
})

/**
 * Service schema
 */
const serviceSchema = z.object({
  service: z.string().trim().min(1, "Service name is required"),
  vendor: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      bankDetails: bankDetailsSchema.optional(),
    })
    .optional(),
  price: z.number().min(0, "Price must be positive").default(0),
});

/**
 * Remark schema
 */
const remarkSchema = z.object({
  header: z.string().min(1, "Header is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  outcome: z.enum(["interested", "not_interested", "follow_up_needed", "converted", "lost"]).optional(),
  followUpDate: z.string().datetime().optional(),
});

/**
 * GST calculation schema
 */
const gstCalculationSchema = z.object({
  enabled: z.boolean().default(false),
  food: z.object({
    rate: z.number().refine((val) => val === 0 || val === 5 || val === 18, {
      message: "Food GST rate must be 0 (disabled), 5, or 18"
    }).default(5),
  }).optional(),
  services: z.object({
    rate: z.number().refine((val) => val === 0 || val === 5 || val === 18, {
      message: "Services GST rate must be 0 (disabled), 5, or 18"
    }).default(18),
  }).optional(),
}).optional();

/**
 * Create lead validation schema
 */
export const createLeadSchema = z
  .object({
    venueId: objectId,
    clientName: z.string().min(1, "Client name is required"),
    contactNo: z.string().min(1, "Contact number is required"),
    email: z.string().email("Invalid email format"),
    occasionType: z.string().min(1, "Occasion type is required"),
    numberOfGuests: z.number().min(1, "Number of guests must be at least 1"),
    leadStatus: z.enum(["cold", "warm", "hot"]).default("cold"),
    eventStartDateTime: z.coerce.date(),
    eventEndDateTime: z.coerce.date(),
    slotType: z
      .enum(["setup", "event", "cleanup", "full_day"])
      .default("event"),
    foodPackage: foodPackageSchema.optional(),
    services: z.array(serviceSchema).optional(),
    remarks: z.array(remarkSchema).optional(),
    notes: z.string().optional(),
    gstCalculation: gstCalculationSchema,
    cateringServiceVendor: z
      .object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        bankDetails: bankDetailsSchema.optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      new Date(data.eventEndDateTime) > new Date(data.eventStartDateTime),
    {
      message: "End datetime must be after start datetime",
      path: ["eventEndDateTime"],
    }
  );

/**
 * Update lead validation schema
 */
export const updateLeadSchema = z
  .object({
    clientName: z.string().min(1).optional(),
    contactNo: z.string().min(1).optional(),
    email: z.string().email().optional(),
    occasionType: z.string().min(1).optional(),
    numberOfGuests: z.number().min(1).optional(),
    leadStatus: z.enum(["cold", "warm", "hot"]).optional(),
    eventStartDateTime: z.coerce.date().optional(),
    eventEndDateTime: z.coerce.date().optional(),
    slotType: z.enum(["setup", "event", "cleanup", "full_day"]).optional(),
    foodPackage: foodPackageSchema.optional(),
    services: z.array(serviceSchema).optional(),
    cateringServiceVendor: z
      .object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        bankDetails: bankDetailsSchema.optional(),
      })
      .optional(),
    notes: z.string().optional(),
    gstCalculation: gstCalculationSchema,
  })
  .optional();

/**
 * Update lead status validation schema
 */
export const updateLeadStatusSchema = z.object({
  status: z.enum(["cold", "warm", "hot"]),
});

/**
 * Bulk update status validation schema
 */
export const bulkUpdateStatusSchema = z.object({
  leadIds: z.array(objectId).min(1, "At least one lead ID is required"),
  status: z.enum(["cold", "warm", "hot"]),
});

/**
 * Lead ID params validation schema
 */
export const leadIdParams = z.object({
  leadId: objectId,
});

/**
 * Venue ID params validation schema
 */
export const venueIdParams = z.object({
  venueId: objectId,
});

/**
 * Business ID params validation schema
 */
export const businessIdParams = z.object({
  businessId: objectId,
});

/**
 * Search query validation schema
 */
export const searchQuerySchema = z.object({
  searchTerm: z.string().min(1, "Search term is required"),
  venueId: objectId.optional(),
  businessId: objectId.optional(),
});

/**
 * Date range query validation schema
 */
export const dateRangeQuerySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  venueId: objectId.optional(),
  businessId: objectId.optional(),
});

/**
 * Lead query validation schema
 */
export const leadQuerySchema = z.object({
  leadStatus: z.enum(["cold", "warm", "hot"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
  skip: z.string().optional(),
  venueId: objectId.optional(),
});

// Export types
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type DateRangeQueryInput = z.infer<typeof dateRangeQuerySchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
