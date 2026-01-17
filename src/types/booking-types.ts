// types/booking-types.ts
import { Document, Types } from "mongoose";


export interface IFoodPackageItem {
  menuItemId?: Types.ObjectId;
  name: string;
  description?: string;
  pricePerPerson: number;
  isCustom: boolean;
}

export interface IFoodPackageSection {
  sectionName: string;
  selectionType: "free" | "limit" | "all_included";
  maxSelectable?: number;
  defaultPrice?: number;
  items: IFoodPackageItem[];
  sectionTotalPerPerson: number;
}

export interface IFoodPackageSnapshot {
  sourcePackageId?: Types.ObjectId
  name: string
  isCustomised: boolean
  inclusions?: string[]
  sections: IFoodPackageSection[]
  defaultPrice?: number
  totalPricePerPerson: number
}

export interface ISelectedMenuItem {
  name: string;
  description?: string;
  priceAdjustment?: number;
}

export interface ISelectedMenuSection {
  sectionName: string;
  selectionType: "free" | "limit" | "all_included";
  selectedItems: ISelectedMenuItem[];
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  venueId: Types.ObjectId;
  leadId?: Types.ObjectId | null;
  clientName: string;
  contactNo: string;
  email: string;
  occasionType: string;
  numberOfGuests: number;
  bookingStatus: "pending" | "confirmed" | "cancelled" | "completed";
  eventStartDateTime: Date;
  eventEndDateTime: Date;
  slotType: "setup" | "event" | "cleanup" | "full_day";
  foodPackage?: IFoodPackageSnapshot;
  foodCostTotal: number;

  cateringServiceVendor?: {
    name: string;
    email: string;
    phone: string;
    bankDetails?: {
      accountNumber?: string;
      accountHolderName?: string;
      ifscCode?: string;
      bankName?: string;
      branchName?: string;
      upiId?: string;
    };
  };
  services?: Array<{
    service: string;
    vendor?: {
      name?: string;
      email?: string;
      phone?: string;
      bankDetails?: {
        accountNumber?: string;
        accountHolderName?: string;
        ifscCode?: string;
        bankName?: string;
        branchName?: string;
        upiId?: string;
      };
    };
    price: number;
  }>;
  // Payment Details (Booking-specific)
  payment: {
    totalAmount: number;
    advanceAmount: number;
    paymentStatus: "unpaid" | "partially_paid" | "paid";
    paymentMode: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
  };
  discount: {
    amount: number;
    note?: string;
  };
  notes?: string;
  internalNotes?: string;
  // Tracking (Booking-specific)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string;
  // Soft Delete fields
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating a new booking
export interface CreateBookingDTO {
  venueId: Types.ObjectId;
  leadId?: Types.ObjectId | null;
  clientName: string;
  contactNo: string;
  email: string;
  occasionType: string;
  numberOfGuests: number;
  bookingStatus?: "pending" | "confirmed" | "cancelled" | "completed";
  eventStartDateTime: Date;
  eventEndDateTime: Date;
  slotType: "setup" | "event" | "cleanup" | "full_day";
  foodPackage?: IFoodPackageSnapshot;
  cateringServiceVendor?: {
    name: string;
    email: string;
    phone: string;
    bankDetails?: {
      accountNumber?: string;
      accountHolderName?: string;
      ifscCode?: string;
      bankName?: string;
      branchName?: string;
      upiId?: string;
    };
  };
  services?: Array<{
    service: string;
    vendor?: {
      name?: string;
      email?: string;
      phone?: string;
      bankDetails?: {
        accountNumber?: string;
        accountHolderName?: string;
        ifscCode?: string;
        bankName?: string;
        branchName?: string;
        upiId?: string;
      };
    };
    price: number;
  }>;
  payment: {
    totalAmount: number;
    advanceAmount: number;
    paymentStatus?: "unpaid" | "partially_paid" | "paid";
    paymentMode: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
  };
  discount?: {
    amount: number;
    note?: string;
  };
  notes?: string;
  internalNotes?: string;
  createdBy?: Types.ObjectId;
}

// DTO for updating a booking
export interface UpdateBookingDTO {
  clientName?: string;
  contactNo?: string;
  email?: string;
  occasionType?: string;
  foodCostTotal: number;
  eventStartDateTime?: Date;
  eventEndDateTime?: Date;
  slotType?: "setup" | "event" | "cleanup" | "full_day";
  numberOfGuests?: number;
  bookingStatus?: "pending" | "confirmed" | "cancelled" | "completed";
  foodPackage?: IFoodPackageSnapshot;
  cateringServiceVendor?: {
    name: string;
    email: string;
    phone: string;
    bankDetails?: {
      accountNumber?: string;
      accountHolderName?: string;
      ifscCode?: string;
      bankName?: string;
      branchName?: string;
      upiId?: string;
    };
  };
  services?: Array<{
    service: string;
    vendor?: {
      name?: string;
      email?: string;
      phone?: string;
      bankDetails?: {
        accountNumber?: string;
        accountHolderName?: string;
        ifscCode?: string;
        bankName?: string;
        branchName?: string;
        upiId?: string;
      };
    };
    price: number;
  }>;
  payment?: {
    totalAmount?: number;
    advanceAmount?: number;
    paymentStatus?: "unpaid" | "partially_paid" | "paid";
    paymentMode?:
      | "cash"
      | "card"
      | "upi"
      | "bank_transfer"
      | "cheque"
      | "other";
  };
  discount?: {
    amount?: number;
    note?: string;
  };
  notes?: string;
  internalNotes?: string;
  updatedBy?: Types.ObjectId;
}

// Query filters for fetching bookings
export interface BookingQueryFilters {
  venueId?: Types.ObjectId;
  bookingStatus?: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus?: "unpaid" | "partially_paid" | "paid";
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  limit?: number;
  skip?: number;
  page?: number;
}

// Response for paginated bookings
export interface BookingListResponse {
  bookings: IBooking[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// Booking statistics response
export interface BookingStatsResponse {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  upcomingEvents: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
}

// Business booking statistics response
export interface BusinessBookingStatsResponse extends BookingStatsResponse {
  byVenue: Array<{
    venueId: Types.ObjectId;
    venueName: string;
    count: number;
    revenue: number;
  }>;
}

// User info for populated fields
export interface IUserInfo {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}

// Booking with populated fields
export interface IBookingPopulated extends Omit<IBooking, "venueId" | "leadId" | "createdBy" | "updatedBy"> {
  venueId: {
    _id: Types.ObjectId;
    venueName: string;
    venueType: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      pincode: string;
    };
  };
  leadId?: {
    _id: Types.ObjectId;
    clientName: string;
    leadStatus: string;
  };
  createdBy?: IUserInfo;
  updatedBy?: IUserInfo;
}
