import { z } from "zod";

// Helpers
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const urlString = z.string().url("Invalid URL");

export const bankDetailsSchema = z.object({
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
});

// ============== User ==============
export const userValidationSchemas = {
  register: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string(),
    lastName: z.string().optional(),
    phone: z.string().nullable().optional(),
    role: z.enum(["developer", "owner", "manager", "admin", "marketing"]).optional(),
  }),

  createUserByAdmin: z.object({
    email: z.string().email(),
    password: z.string().min(6).optional(),
    firstName: z.string(),
    lastName: z.string().optional(),
    phone: z.string().nullable().optional(),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string(),
  }),

  // updated to match your schema (flat names)
  update: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().nullable().optional(),
  }),
};






// ============== Business ==============
export const businessValidationSchemas = {
  create: z.object({
    ownerId: z.string().optional(),
    businessName: z.string(),
    contact: z.object({
      phone: z.string(),
      email: z.string().email(),
    }),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      pincode: z.string(),
    }),
    website: z.string().nullable().optional(),
    socials: z
      .array(
        z.object({
          name: z.string(),
          url: urlString,
        })
      )
      .optional(),
    branding: z
      .object({
        logoUrl: urlString.nullable().optional(),
      })
      .optional(),
  }),

  update: z.object({
    businessName: z.string().optional(),
    contact: z
      .object({
        phone: z.string().optional(),
        email: z.string().email().optional(),
      })
      .optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
      })
      .optional(),
    website: urlString.nullable().optional(),
    socials: z.array(z.object({ name: z.string(), url: urlString })).optional(),
    branding: z
      .object({
        logoUrl: urlString.nullable().optional(),
      })
      .optional(),

    bookingPreferences: z
      .object({
        timings: z
          .object({
            morning: z
              .object({
                start: z.string().optional(),
                end: z.string().optional(),
              })
              .optional(),
            evening: z
              .object({
                start: z.string().optional(),
                end: z.string().optional(),
              })
              .optional(),
            fullDay: z
              .object({
                start: z.string().optional(),
                end: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        notes: z.string().nullable().optional(),
      })
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
};


export const venueValidationSchemas = {
  create: z.object({
    businessId: objectId,
    venueName: z.string(),
    venueType: z.enum(["banquet", "lawn", "convention_center"]),
    capacity: z.object({
      min: z.number().positive(),
      max: z.number().positive(),
    }),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      pincode: z.string(),
    }),
    bookingPreferences: z
      .object({
        timings: z.object({
          morning: z.object({ start: z.string(), end: z.string() }),
          evening: z.object({ start: z.string(), end: z.string() }),
          fullDay: z.object({ start: z.string(), end: z.string() }),
        }),
        notes: z.string().nullable().optional(),
      })
      .optional(),
    media: z
      .object({
        coverImageUrl: urlString.nullable().optional(),
      })
      .optional(),
    foodPackages: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          price: z.number(),
          priceType: z.enum(["flat", "per_guest"]),
          inclusions: z.array(z.string()),
        })
      )
      .optional(),
    cateringServiceVendor: z
      .array(
        z.object({
          name: z.string(),
          email: z.string().email(),
          phone: z.string(),
          bankDetails: bankDetailsSchema.optional(),
        })
      )
      .optional(),
    services: z
      .array(
        z.object({
          service: z.string(),
          vendors: z.array(
            z.object({
              name: z.string(),
              email: z.string().email(),
              phone: z.string(),
              bankDetails: bankDetailsSchema.optional(),
            })
          ),
        })
      )
      .optional(),
  }),

  update: z.object({
    venueName: z.string().optional(),
    venueType: z.enum(["banquet", "lawn", "convention_center"]).optional(),
    capacity: z
      .object({
        min: z.number().positive().optional(),
        max: z.number().positive().optional(),
      })
      .optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
      })
      .optional(),
    bookingPreferences: z
      .object({
        timings: z.object({
          morning: z.object({ start: z.string(), end: z.string() }),
          evening: z.object({ start: z.string(), end: z.string() }),
          fullDay: z.object({ start: z.string(), end: z.string() }),
        }),
        notes: z.string().nullable().optional(),
      })
      .optional(),
    media: z
      .object({
        coverImageUrl: urlString.nullable().optional(),
      })
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
    foodPackages: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          price: z.number(),
          priceType: z.enum(["flat", "per_guest"]),
          inclusions: z.array(z.string()),
        })
      )
      .optional(),
    cateringServiceVendor: z
      .array(
        z.object({
          name: z.string(),
          email: z.string().email(),
          phone: z.string(),
          bankDetails: bankDetailsSchema.optional(),
        })
      )
      .optional(),
    services: z
      .array(
        z.object({
          service: z.string(),
          vendors: z.array(
            z.object({
              name: z.string(),
              email: z.string().email(),
              phone: z.string(),
              bankDetails: bankDetailsSchema.optional(),
            })
          ),
        })
      )
      .optional(),
  }),
};


export type UserRegisterInput = z.infer<typeof userValidationSchemas.register>;
export type UserLoginInput = z.infer<typeof userValidationSchemas.login>;
export type UserUpdateInput = z.infer<typeof userValidationSchemas.update>;
export type BusinessCreateInput = z.infer<
  typeof businessValidationSchemas.create
>;
export type BusinessUpdateInput = z.infer<
  typeof businessValidationSchemas.update
>;
export type VenueCreateInput = z.infer<typeof venueValidationSchemas.create>;
export type VenueUpdateInput = z.infer<typeof venueValidationSchemas.update>;
