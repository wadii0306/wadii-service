import { Request, Response } from "express";
import LeadActivityService from "../services/leadRemarkService";
import { CreateActivityDTO, UpdateActivityDTO, ActivityQueryFilters } from "../types/lead-remark-types";
import { oid } from "../utils/helper";

type CreateActivityReq = Request<{}, any, CreateActivityDTO>;
type UpdateActivityReq = Request<{ activityId: string }, any, UpdateActivityDTO>;
type GetActivityReq = Request<{ activityId: string }>;
type GetLeadActivitiesReq = Request<{ leadId: string }, any, any, ActivityQueryFilters>;

export class LeadActivityController {
  /**
   * Create a new activity for a lead
   */
  static async createActivity(req: CreateActivityReq, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const activityData = {
        ...req.body,
        createdBy: oid(req.user.userId),
      };

      const activity = await LeadActivityService.createActivity(activityData);

      res.status(201).json({
        success: true,
        message: "Activity created successfully",
        data: activity,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get activity by ID
   */
  static async getActivityById(req: GetActivityReq, res: Response): Promise<void> {
    try {
      const { activityId } = req.params;

      const activity = await LeadActivityService.getActivityById(activityId);

      if (!activity) {
        res.status(404).json({ success: false, message: "Activity not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all activities for a specific lead
   */
  static async getLeadActivities(
    req: GetLeadActivitiesReq,
    res: Response
  ): Promise<void> {
    try {
      const { leadId } = req.params;
      const filters: ActivityQueryFilters = {
        status: req.query.status as any,
        limit: req.query.limit ? parseInt(req.query.limit as unknown as string) : 50,
        skip: req.query.skip ? parseInt(req.query.skip as unknown as string) : 0,
      };

      const result = await LeadActivityService.getLeadActivities(leadId, filters);

      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          limit: filters.limit,
          skip: filters.skip,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update activity
   */
  static async updateActivity(req: UpdateActivityReq, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { activityId } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: oid(req.user.userId),
      };

      const activity = await LeadActivityService.updateActivity(activityId, updateData);

      if (!activity) {
        res.status(404).json({ success: false, message: "Activity not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Activity updated successfully",
        data: activity,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete activity
   */
  static async deleteActivity(req: Request<{ activityId: string }>, res: Response): Promise<void> {
    try {
      const { activityId } = req.params;

      const deleted = await LeadActivityService.deleteActivity(activityId);

      if (!deleted) {
        res.status(404).json({ success: false, message: "Activity not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Activity deleted successfully",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get upcoming follow-ups (for dashboard/reminders)
   */
  static async getUpcomingFollowUps(req: Request<{}, any, any, { days?: string }>, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 7; // Default 7 days

      const activities = await LeadActivityService.getUpcomingFollowUps(days);

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update activity status
   */
  static async updateActivityStatus(
    req: Request<{ activityId: string }, any, { status: "pending" | "completed" | "cancelled" }>,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { activityId } = req.params;
      const { status } = req.body;

      const activity = await LeadActivityService.updateActivityStatus(
        activityId,
        status,
        req.user.userId
      );

      if (!activity) {
        res.status(404).json({ success: false, message: "Activity not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Activity status updated successfully",
        data: activity,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}