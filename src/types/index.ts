import { Document, Types } from "mongoose";

export interface IUser extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
}

export interface IBusiness extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerName: string;
  businessName: string;
  contact: { phone: string; email: string };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  website?: string | null;
  socials?: { name: string; url: string }[];
  branding: { logoUrl?: string | null };
  qrCode?: string | null;

  status: "inactive" | "active";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
}

// Food Menu Interfaces
export interface IFoodMenuItem {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  isAvailable: boolean;
  priceAdjustment?: number;
}

export interface IFoodMenuSection {
  _id?: Types.ObjectId
  sectionName: string
  selectionType: 'free' | 'limit' | 'all_included'
  maxSelectable?: number
  defaultPrice?: number
  items: IFoodMenuItem[]
}

export interface IVenue extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  venueName: string;
  venueType: "banquet" | "lawn" | "convention_center";
  capacity: {
    min: number;
    max: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  media: {
    coverImageUrl?: string | null;
  };
  foodPackages?: Array<{
    name: string;
    description: string;
    price: number;
    priceType: "flat" | "per_guest";
    inclusions?: string[];
    menuSections?: Array<{
      sectionName: string;
      selectionType: "limit" | "all_included";
      maxSelectable?: number;
      defaultPrice?: number;
    }>;
  }>;
  foodMenu?: IFoodMenuSection[];
  cateringServiceVendor?: Array<{
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
  }>;
  services?: Array<{
    service: string;
    vendors: Array<{
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
    }>;
  }>;
  bookingPreferences?: {
    timings: {
      morning: {
        start: string;
        end: string;

        evening: {
          start: string;
          end: string;
        };
        fullDay: {
          start: string;
          end: string;
        };
      };
    };
    notes: string;
  };

  status: "active" | "inactive";
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserBusinessRole extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessId: Types.ObjectId;
  venueId?: Types.ObjectId; // Optional - for venue-specific assignments
  role: "developer" | "owner" | "manager";
  permissions: string[];
  scope: "business" | "venue"; // business = all venues, venue = specific venue
  assignedBy?: Types.ObjectId; // Who assigned this role
  createdAt: Date;
  updatedAt: Date;
}

export interface IJWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
  role?: "developer" | "owner" | "manager" | "user";
}

export interface OwnerBusinessFilters {
  ownerId: string;
  includeVenues?: boolean;
  businessFields?: string;
  businessStatus?: string;
  venueStatus?: string;
  venueFields?: string;
  limit?: number;
  skip?: number;
}

export interface BusinessWithVenues extends IBusiness {
  venues?: IVenue[];
  venueCount?: number;
}

export interface OwnerBusinessResponse {
  ownerId: string;
  businesses: BusinessWithVenues[];
  totalBusinesses: number;
  totalVenues: number;
  summary: {
    activeBusinesses: number;
    inactiveBusinesses: number;
    totalVenues: number;
  };
} 