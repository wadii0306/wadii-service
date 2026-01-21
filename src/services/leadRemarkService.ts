import { LeadActivity } from "../models/LeadRemark";
import { ILeadActivity } from "../models/LeadRemark";
import { oid } from "../utils/helper";

export class LeadActivityService {
  /**
   * Create a new activity
   */
  async createActivity(activityData: Partial<ILeadActivity>): Promise<ILeadActivity> {
    try {
      const activity = new LeadActivity(activityData);
      await activity.save();

      await activity.populate([
        { path: 'leadId', select: 'clientName email contactNo' },
        { path: 'createdBy', select: '_id email firstName lastName' },
        { path: 'updatedBy', select: '_id email firstName lastName' },
      ]);

      return activity;
    } catch (error: any) {
      throw new Error(`Error creating activity: ${error.message}`);
    }
  }

  /**
   * Get activity by ID
   */
  async getActivityById(activityId: string): Promise<ILeadActivity | null> {
    try {
      const activity = await LeadActivity.findById(oid(activityId))
        .populate("leadId", "clientName email contactNo")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");
      
      return activity;
    } catch (error: any) {
      throw new Error(`Error fetching activity: ${error.message}`);
    }
  }

  /**
   * Get all activities for a specific lead
   */
  async getLeadActivities(
    leadId: string,
    filters?: {
      status?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ activities: ILeadActivity[]; total: number }> {
    try {
      const query: any = { leadId: oid(leadId) };

      if (filters?.status) {
        query.status = filters.status;
      }

      const total = await LeadActivity.countDocuments(query);
      const activities = await LeadActivity.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.skip || 0)
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return { activities, total };
    } catch (error: any) {
      throw new Error(`Error fetching lead activities: ${error.message}`);
    }
  }

  /**
   * Update activity
   */
  async updateActivity(
    activityId: string,
    updateData: Partial<ILeadActivity>
  ): Promise<ILeadActivity | null> {
    try {
      const activity = await LeadActivity.findByIdAndUpdate(
        activityId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("leadId", "clientName email contactNo")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return activity;
    } catch (error: any) {
      throw new Error(`Error updating activity: ${error.message}`);
    }
  }

  /**
   * Update activity status only
   */
  async updateActivityStatus(
    activityId: string,
    status: "pending" | "completed" | "cancelled",
    updatedBy?: string
  ): Promise<ILeadActivity | null> {
    try {
      const activity = await LeadActivity.findByIdAndUpdate(
        activityId,
        { status, updatedBy, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("leadId", "clientName email contactNo")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return activity;
    } catch (error: any) {
      throw new Error(`Error updating activity status: ${error.message}`);
    }
  }

  /**
   * Delete activity
   */
  async deleteActivity(activityId: string): Promise<boolean> {
    try {
      const result = await LeadActivity.findByIdAndDelete(activityId);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting activity: ${error.message}`);
    }
  }

  /**
   * Get upcoming follow-ups (for dashboard/reminders)
   */
  async getUpcomingFollowUps(days: number = 7): Promise<ILeadActivity[]> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + days);

      const activities = await LeadActivity.find({
        status: "pending",
        followUpDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .sort({ followUpDate: 1 })
        .populate("leadId", "clientName email contactNo")
        .populate("createdBy", "_id email firstName lastName")
        .limit(50);

      return activities;
    } catch (error: any) {
      throw new Error(`Error fetching upcoming follow-ups: ${error.message}`);
    }
  }

  /**
   * Get activities by user (created by)
   */
  async getActivitiesByUser(
    userId: string,
    filters?: {
      status?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ activities: ILeadActivity[]; total: number }> {
    try {
      const query: any = { createdBy: oid(userId) };

      if (filters?.status) {
        query.status = filters.status;
      }

      const total = await LeadActivity.countDocuments(query);
      const activities = await LeadActivity.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.skip || 0)
        .populate("leadId", "clientName email contactNo")
        .populate("createdBy", "_id email firstName lastName");

      return { activities, total };
    } catch (error: any) {
      throw new Error(`Error fetching user activities: ${error.message}`);
    }
  }
}

export default new LeadActivityService();