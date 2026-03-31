// validations/booking-validation.ts
import { z } from "zod";


/**
 * Bank details schema
 */
const bankDetailsSchema = z.object({
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
});


/**
 * Service schema
 */
const serviceSchema = z.object({
  service: z.string().trim().min(1, "Service name is required"),
  vendor: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().min(10).optional(),
      bankDetails: bankDetailsSchema.optional(),
    })
    .optional(),
  price: z.number().min(0, "Price must be positive").default(0),
});


const foodItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  isCustom: z.boolean(),
})
const foodSectionSchema = z.object({
  sectionName: z.string().min(1),
  selectionType: z.enum(["free", "limit", "all_included"]),
  maxSelectable: z.number().int().min(1).optional(),
  defaultPrice: z.number().min(0).optional(),
  items: z.array(foodItemSchema).default([]),
  sectionTotalPerPerson: z.number().min(0).default(0),
});
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
 * Create booking validation schema
 */
export const createBookingSchema = z
  .object({
    venueId: z.string().min(1, "Venue ID is required"),
    leadId: z.string().optional().nullable(),
    clientName: z.string().trim().min(1, "Client name is required"),
    contactNo: z.string().trim().min(1, "Contact number is required"),
    email: z.string().trim().toLowerCase().optional(),
    occasionType: z.string().trim().min(1, "Occasion type is required"),
    numberOfGuests: z
      .number()
      .int()
      .min(1, "Number of guests must be at least 1"),
    bookingStatus: z
      .enum(["pending", "confirmed", "cancelled", "completed"])
      .default("pending")
      .optional(),
    eventStartDateTime: z.coerce.date(),
    eventEndDateTime: z.coerce.date(),

    foodPackage: foodPackageSchema.optional(),
    cateringServiceVendor: z
      .object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string(),
        bankDetails: bankDetailsSchema.optional(),
      })
      .optional(),
    services: z.array(serviceSchema).optional(),

    payment: z.object({
      totalAmount: z.number().min(0, "Total amount must be positive").optional(),
      advanceAmount: z
        .number()
        .min(0, "Advance amount must be positive")
        .default(0)
        .optional(),
      paymentStatus: z
        .enum(["unpaid", "partially_paid", "paid"])
        .default("unpaid")
        .optional(),
      paymentMode: z
        .enum(["cash", "card", "upi", "bank_transfer", "cheque", "other"])
        .default("cash"),
    }),
    discount: z
      .object({
        amount: z.number().min(0, "Discount amount must be positive"),
        note: z.string().optional(),
      })
      .optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    gstCalculation: gstCalculationSchema,
  })
  .refine(
    (data) => {
      // Only validate if totalAmount is provided
      if (data.payment.totalAmount !== undefined && data.payment.advanceAmount !== undefined) {
        return data.payment.advanceAmount <= data.payment.totalAmount;
      }
      return true;
    },
    {
      message: "Advance amount cannot exceed total amount",
      path: ["payment", "advanceAmount"],
    }
  )
  .refine(
    (data) =>
      new Date(data.eventEndDateTime) > new Date(data.eventStartDateTime),
    {
      message: "End datetime must be after start datetime",
      path: ["eventEndDateTime"],
    }
  );

/**
 * Update booking validation schema
 */
export const updateBookingSchema = z
  .object({
    clientName: z.string().trim().min(1).optional(),
    contactNo: z.string().trim().min(1).optional(),
    email: z.string().trim().toLowerCase().optional(),
    occasionType: z.string().trim().min(1).optional(),
    numberOfGuests: z.number().int().min(1).optional(),
    bookingStatus: z
      .enum(['pending', 'confirmed', 'cancelled', 'completed'])
      .optional(),
    eventStartDateTime: z.coerce.date().optional(),
    eventEndDateTime: z.coerce.date().optional(),
    slotType: z.enum(['setup', 'event', 'cleanup', 'full_day']).optional(),
    foodPackage: foodPackageSchema.optional(),
    cateringServiceVendor: z
      .object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string(),
        bankDetails: bankDetailsSchema.optional(),
      })
      .optional(),
    services: z.array(serviceSchema).optional(),
    payment: z
      .object({
        paymentStatus: z.enum(['unpaid', 'partially_paid', 'paid']).optional(),
        paymentMode: z
          .enum(['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'])
          .optional(),
      })
      .optional(),
    discount: z
      .object({
        amount: z.number().min(0, "Discount amount must be positive").optional(),
        note: z.string().optional(),
      })
      .optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    gstCalculation: gstCalculationSchema.optional(),
  })
  .partial()
  .refine(
    (data) => {
      if (data.eventStartDateTime && data.eventEndDateTime) {
        return (
          new Date(data.eventEndDateTime) > new Date(data.eventStartDateTime)
        )
      }
      return true
    },
    {
      message: 'End datetime must be after start datetime',
      path: ['eventEndDateTime'],
    }
  )

/**
 * Cancel booking validation schema
 */
export const cancelBookingSchema = z.object({
  cancellationReason: z.string().optional().default(""),
});

/**
 * Update payment validation schema
 */
export const updatePaymentSchema = z.object({
  advanceAmount: z.number().min(0, "Advance amount must be positive or zero"),
});

/**
 * Booking query filters schema
 */
export const bookingQuerySchema = z.object({
  bookingStatus: z
    .enum(["pending", "confirmed", "cancelled", "completed"])
    .optional(),
  paymentStatus: z.enum(["unpaid", "partially_paid", "paid"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

/**
 * Check availability query schema
 */
export const checkAvailabilitySchema = z.object({
  eventStartDateTime: z.string().min(1, "Event start datetime is required"),
  eventEndDateTime: z.string().min(1, "Event end datetime is required"),
  excludeBookingId: z.string().optional(),
});

// Export types
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
