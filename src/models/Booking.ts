import mongoose, { Schema, Document, Query } from "mongoose";
import { IBooking } from "../types/booking-types";

// Define query helpers interface
interface BookingQueryHelpers {
  excludeDeleted(): Query<any, IBooking, BookingQueryHelpers> & BookingQueryHelpers;
  onlyDeleted(): Query<any, IBooking, BookingQueryHelpers> & BookingQueryHelpers;
}

 
const FoodItemSchema = new Schema(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      required: false, // null for custom items
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
)

const FoodPackageSectionSchema = new Schema(
  {
    sectionName: {
      type: String,
      required: true,
      trim: true,
    },
    selectionType: {
      type: String,
      enum: ["free", "limit", "all_included"],
      required: true,
    },
    maxSelectable: {
      type: Number,
      required: false,
      min: 1,
    },
    defaultPrice: {
      type: Number,
      required: false,
      min: 0,
    },
    items: {
      type: [FoodItemSchema],
      default: [],
    },
    sectionTotalPerPerson: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const FoodPackageSchema = new Schema(
  {
    sourcePackageId: {
      type: Schema.Types.ObjectId,
      required: false, // venue template reference (optional)
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isCustomised: {
      type: Boolean,
      default: false,
    },
    inclusions: {
      type: [String],
      default: [],
      required: false,
    },

    sections: {
      type: [FoodPackageSectionSchema],
      required: true,
    },
    defaultPrice: {
      type: Number,
      required: false,
      min: 0,
    },
    totalPricePerPerson: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const GSTCalculationSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
      required: true,
    },
    food: {
      rate: {
        type: Number,
        enum: [0, 5, 18],
        default: 5,
        required: true,
      },
      taxableAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      gstAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
    },
    services: {
      rate: {
        type: Number,
        enum: [0, 5, 18],
        default: 18,
        required: true,
      },
      taxableAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      gstAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
    },
    totalGST: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const bookingSchema = new Schema<
  IBooking,
  mongoose.Model<IBooking, BookingQueryHelpers>,
  {},
  BookingQueryHelpers
>(
  {
    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNo: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    occasionType: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    foodPackage: {
      type: FoodPackageSchema,
      required: false,
    },
    //   type: {
    //     name: {
    //       type: String,
    //       required: true,
    //       trim: true,
    //     },
    //     description: {
    //       type: String,
    //       required: false,
    //     },
    //     price: {
    //       type: Number,
    //       required: true,
    //       min: 0,
    //     },
    //     priceType: {
    //       type: String,
    //       enum: ["flat", "per_guest"],
    //       required: true,
    //     },
    //     inclusions: {
    //       type: [String],
    //       default: [],
    //       required: false,
    //     },
    //     selectedMenu: [
    //       {
    //         sectionName: {
    //           type: String,
    //           required: true,
    //           trim: true,
    //         },
    //         selectionType: {
    //           type: String,
    //           enum: ["free", "limit", "all_included"],
    //           required: true,
    //         },
    //         selectedItems: [
    //           {
    //             name: {
    //               type: String,
    //               required: true,
    //               trim: true,
    //             },
    //             description: {
    //               type: String,
    //               trim: true,
    //             },
    //             priceAdjustment: {
    //               type: Number,
    //               default: 0,
    //             },
    //             _id: false,
    //           },
    //         ],
    //         _id: false,
    //       },
    //     ],
    //     _id: false,
    //   },
    //   required: false,
    // },
    cateringServiceVendor: {
      type: {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        phone: {
          type: String,
          required: true,
          trim: true,
        },
        bankDetails: {
          type: {
            accountNumber: {
              type: String,
              required: false,
              trim: true,
            },
            accountHolderName: {
              type: String,
              required: false,
              trim: true,
            },
            ifscCode: {
              type: String,
              required: false,
              trim: true,
            },
            bankName: {
              type: String,
              required: false,
              trim: true,
            },
            branchName: {
              type: String,
              required: false,
              trim: true,
            },
            upiId: {
              type: String,
              required: false,
              trim: true,
            },
          },
          required: false,
        },
      },
      required: false,
    },
    services: [
      {
        service: {
          type: String,
          required: true,
          trim: true,
        },
        vendor: {
          type: {
            name: {
              type: String,
              required: false,
              trim: true,
            },
            email: {
              type: String,
              required: false,
              trim: true,
              lowercase: true,
            },
            phone: {
              type: String,
              required: false,
              trim: true,
            },
            bankDetails: {
              type: {
                accountNumber: {
                  type: String,
                  required: false,
                  trim: true,
                },
                accountHolderName: {
                  type: String,
                  required: false,
                  trim: true,
                },
                ifscCode: {
                  type: String,
                  required: false,
                  trim: true,
                },
                bankName: {
                  type: String,
                  required: false,
                  trim: true,
                },
                branchName: {
                  type: String,
                  required: false,
                  trim: true,
                },
                upiId: {
                  type: String,
                  required: false,
                  trim: true,
                },
              },
              required: false,
            },
          },
          required: false,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
      },
    ],
    eventStartDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    eventEndDateTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: any, value: Date): boolean {
          // Skip validation if eventStartDateTime is not set (during partial updates)
          if (!this.eventStartDateTime) {
            return true;
          }
          return value > this.eventStartDateTime;
        },
        message: "End datetime must be after start datetime",
      },
    },
    slotType: {
      type: String,
      enum: ["setup", "event", "cleanup", "full_day"],
      default: "event",
    },
    // Payment Details (Summary only - actual transactions in Transaction model)
    payment: {
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      advanceAmount: {
        type: Number,
        default: 0,
        min: 0,
        // This is calculated from Transaction model, maintained for backward compatibility
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "partially_paid", "paid"],
        default: "unpaid",
        // This is calculated from Transaction model
      },
      paymentMode: {
        type: String,
        enum: ["cash", "card", "upi", "bank_transfer", "cheque", "other"],
        required: true,
        // This represents the primary/default payment mode
      },
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      note: {
        type: String,
      },
    },
    notes: {
      type: String,
      default: "",
    },
    internalNotes: {
      type: String,
      default: "",
    },
    gstCalculation: {
      type: GSTCalculationSchema,
      required: false,
    },
    // Tracking (Booking-specific)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    // Soft Delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
bookingSchema.index({ venueId: 1 });
bookingSchema.index({ leadId: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ contactNo: 1 });
bookingSchema.index({ eventStartDateTime: 1 });
bookingSchema.index({ eventEndDateTime: 1 });
bookingSchema.index({ "payment.paymentStatus": 1 });

// Compound indexes for common queries
bookingSchema.index({ venueId: 1, bookingStatus: 1 });
bookingSchema.index({ venueId: 1, eventStartDateTime: 1 });
bookingSchema.index({ venueId: 1, "payment.paymentStatus": 1 });
bookingSchema.index({ isDeleted: 1, createdAt: -1 });
bookingSchema.index({ venueId: 1, isDeleted: 1 });

// Query helper to exclude deleted bookings by default
bookingSchema.query.excludeDeleted = function(this: Query<any, IBooking, BookingQueryHelpers> & BookingQueryHelpers) {
  return this.where({ isDeleted: false });
};

// Query helper to include only deleted bookings
bookingSchema.query.onlyDeleted = function(this: Query<any, IBooking, BookingQueryHelpers> & BookingQueryHelpers) {
  return this.where({ isDeleted: true });
};

// Pre-save hook for payment status
bookingSchema.pre("save", function (next) {
  if (this.payment) {
    if (this.payment.advanceAmount >= this.payment.totalAmount) {
      this.payment.paymentStatus = "paid";
    } else if (this.payment.advanceAmount > 0) {
      this.payment.paymentStatus = "partially_paid";
    } else {
      this.payment.paymentStatus = "unpaid";
    }
  }
  next();
});

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
