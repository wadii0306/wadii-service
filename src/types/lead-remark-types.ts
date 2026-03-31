import { Document, Types } from "mongoose";
import { ILeadActivity } from "../models/LeadRemark";

// DTO for creating a new activity
export interface CreateActivityDTO {
  leadId: Types.ObjectId;
  header: string;
  description: string;
  status?: "pending" | "completed" | "cancelled";
  outcome?: "interested" | "not_interested" | "follow_up_needed" | "converted" | "lost";
  followUpDate?: Date;
}

// DTO for updating an activity
export interface UpdateActivityDTO {
  header?: string;
  description?: string;
  status?: "pending" | "completed" | "cancelled";
  outcome?: "interested" | "not_interested" | "follow_up_needed" | "converted" | "lost";
  followUpDate?: Date;
}

// Query filters for fetching activities
export interface ActivityQueryFilters {
  status?: "pending" | "completed" | "cancelled";
  limit?: number;
  skip?: number;
}

// Response for paginated activities
export interface ActivityListResponse {
  activities: ILeadActivity[];
  total: number;
  limit?: number;
  skip?: number;
}

// Activity statistics response
export interface ActivityStatsResponse {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  upcomingFollowUps: number;
}

// Activity with populated fields
export interface ILeadActivityPopulated extends Omit<ILeadActivity, "leadId" | "createdBy" | "updatedBy"> {
  leadId: {
    _id: Types.ObjectId;
    clientName: string;
    email: string;
    contactNo: string;
  };
  createdBy?: {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
  };
  updatedBy?: {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// User info for populated fields
export interface IUserInfo {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}

// Lead info for populated fields
export interface ILeadInfo {
  _id: Types.ObjectId;
  clientName: string;
  email: string;
  contactNo: string;
}