import { z } from "zod";

/**
 * Reusable follow-up date validation schema
 */
const followUpDateSchema = z.coerce
  .date()
  .optional()
  .refine(
    (date) => !date || date > new Date(),
    "Follow-up date must be in the future"
  );

/**
 * Schema for creating a new lead activity/remark
 */
export const createActivitySchema = z.object({
  leadId: z.string().min(1, "Lead ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid lead ID format"),
  header: z.string().trim().min(3, "Header must be at least 3 characters").max(200, "Header must be between 3 and 200 characters"),
  description: z.string().trim().min(5, "Description must be at least 5 characters").max(2000, "Description must be between 5 and 2000 characters"),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  outcome: z.enum(["interested", "not_interested", "follow_up_needed", "converted", "lost"]).optional(),
  followUpDate: followUpDateSchema,
});

/**
 * Schema for updating a lead activity/remark
 */
export const updateActivitySchema = z.object({
  header: z.string().trim().min(3, "Header must be at least 3 characters").max(200, "Header must be between 3 and 200 characters").optional(),
  description: z.string().trim().min(5, "Description must be at least 5 characters").max(2000, "Description must be between 5 and 2000 characters").optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  outcome: z.enum(["interested", "not_interested", "follow_up_needed", "converted", "lost"]).optional(),
  followUpDate: z.string().datetime().optional().refine((value) => {
    if (value) {
      return new Date(value) > new Date();
    }
    return true;
  }, "Follow-up date must be in the future"),
});

/**
 * Schema for activity ID parameter
 */
export const activityIdSchema = z.object({
  activityId: z.string().min(1, "Activity ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid activity ID format"),
});

/**
 * Schema for lead ID parameter
 */
export const leadIdSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid lead ID format"),
});

/**
 * Schema for activity status update
 */
export const activityStatusSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]),
});

/**
 * Schema for query parameters when fetching lead activities
 */
export const leadActivitiesQuerySchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").optional(),
  skip: z.coerce.number().int().min(0, "Skip must be non-negative").optional(),
});

/**
 * Schema for upcoming follow-ups query
 */
export const upcomingFollowUpsQuerySchema = z.object({
  days: z.coerce.number().int().min(1, "Days must be at least 1").max(365, "Days cannot exceed 365").optional(),
});