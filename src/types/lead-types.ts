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
  totalBasePrice?: number
  totalAddonPrice?: number
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

export interface IGSTCalculation {
  enabled: boolean;
  food: {
    rate: 5 | 18;
    taxableAmount: number;
    gstAmount: number;
  };
  services: {
    rate: 5 | 18;
    taxableAmount: number;
    gstAmount: number;
  };
  totalGST: number;
  grandTotal: number;
}

export interface ILead extends Document {
  _id: Types.ObjectId;
  venueId: Types.ObjectId;
  clientName: string;
  contactNo: string;
  email: string;
  occasionType: string;
  numberOfGuests: number;
  leadStatus: "cold" | "warm" | "hot";
  eventStartDateTime: Date;
  eventEndDateTime: Date;
  slotType: "setup" | "event" | "cleanup" | "full_day";
  package?: {
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_guest";
  };
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
  selectedMenu?: ISelectedMenuSection[];
  notes?: string;
  gstCalculation?: IGSTCalculation;
  remarks?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating a new lead
export interface CreateLeadDTO {
  venueId: Types.ObjectId;
  clientName: string;
  contactNo: string;
  email: string;
  occasionType: string;
  numberOfGuests: number;
  leadStatus?: "cold" | "warm" | "hot";
  eventStartDateTime: Date;
  eventEndDateTime: Date;
  foodPackage?: IFoodPackageSnapshot;
  slotType: "setup" | "event" | "cleanup" | "full_day";
  package?: {
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_guest";
  };
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
  notes?: string;
  gstCalculation?: IGSTCalculation;
  createdBy?: Types.ObjectId;
}

// DTO for updating a lead
export interface UpdateLeadDTO {
  clientName?: string;
  contactNo?: string;
  email?: string;
  occasionType?: string;
  eventStartDateTime?: Date;
  eventEndDateTime?: Date;
  slotType?: "setup" | "event" | "cleanup" | "full_day";
  numberOfGuests?: number;
  leadStatus?: "cold" | "warm" | "hot";
  foodPackage?: IFoodPackageSnapshot;
  package?: {
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_guest";
  };
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
  notes?: string;
  gstCalculation?: IGSTCalculation;
  updatedBy?: Types.ObjectId;
}

// Query filters for fetching leads
export interface LeadQueryFilters {
  venueId?: Types.ObjectId;
  leadStatus?: "cold" | "warm" | "hot";
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  limit?: number;
  skip?: number;
  page?: number;
}

// Response for paginated leads
export interface LeadListResponse {
  leads: ILead[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// Lead statistics response
export interface LeadStatsResponse {
  total: number;
  cold: number;
  warm: number;
  hot: number;
  upcomingEvents: number;
}

// Business lead statistics response
export interface BusinessLeadStatsResponse extends LeadStatsResponse {
  byVenue: Array<{
    venueId: Types.ObjectId;
    venueName: string;
    count: number;
  }>;
}

// User info for populated fields
export interface IUserInfo {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}

// Lead with populated fields
export interface ILeadPopulated extends Omit<ILead, "venueId" | "businessId" | "createdBy" | "updatedBy"> {
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
  businessId: {
    _id: Types.ObjectId;
    businessName: string;
  };
  createdBy?: IUserInfo;
  updatedBy?: IUserInfo;
}
