import { Document, Types } from "mongoose";

// Admin note interface for internal admin notes
export interface IAdminNote {
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

// Main contact interface for database storage
export interface IWebsiteContact extends Document {
  _id: Types.ObjectId;
  fullName: string;
  banquetName: string;
  email: string;
  phone: string;
  city: string;
  venueType?: string;
  message?: string;
  status?: "new" | "contacted" | "converted" | "closed";
  priority?: "low" | "medium" | "high";

  adminNotes?: IAdminNote[];
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating new contact submission (from website form)
export interface CreateWebsiteContactDTO {
  fullName: string;
  banquetName: string;
  email: string;
  phone: string;
  city: string;
  venueType?: string;
  message?: string;
}

// DTO for updating existing contact (admin use)
export interface UpdateWebsiteContactDTO {
  fullName?: string;
  banquetName?: string;
  email?: string;
  phone?: string;
  city?: string;
  venueType?: string;
  message?: string;
  status?: "new" | "contacted" | "converted" | "closed";
  priority?: "low" | "medium" | "high";
  adminNotes?: IAdminNote[];
}

// Query filters for getting contacts
export interface WebsiteContactQueryFilters {
  status?: "new" | "contacted" | "converted" | "closed";
  priority?: "low" | "medium" | "high";
  city?: string;
  venueType?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "fullName" | "priority";
  sortOrder?: "asc" | "desc";
}

// Statistics interface for dashboard
export interface WebsiteContactStats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  closed: number;
  thisMonth: number;
  lastMonth: number;
}

// Form validation error interface (matches frontend ErrorState)
export interface ContactFormErrors {
  fullName?: string;
  banquetName?: string;
  email?: string;
  phone?: string;
  city?: string;
}

// API response interfaces
export interface ContactSubmissionResponse {
  success: boolean;
  message: string;
  data?: IWebsiteContact;
  errors?: string[];
}

export interface ContactListResponse {
  success: boolean;
  message: string;
  data: {
    contacts: IWebsiteContact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContactStatsResponse {
  success: boolean;
  message: string;
  data: WebsiteContactStats;
}