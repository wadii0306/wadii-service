import { Router } from "express";
import { LeadActivityController } from "../controllers/leadRemarkController";
import { authMiddleware } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import {
  createActivitySchema,
  updateActivitySchema,
  activityIdSchema,
  leadIdSchema,
  activityStatusSchema,
  leadActivitiesQuerySchema,
  upcomingFollowUpsQuerySchema,
} from "../validators/leadRemark-validator";

const router = Router();

/**
 * @route   POST /api/lead-remarks
 * @desc    Create a new lead remark/activity
 * @access  Private
 */
router.post(
  "/",
  authMiddleware,
  validateRequest({ body: createActivitySchema }),
  LeadActivityController.createActivity
);

/**
 * @route   GET /api/lead-remarks/:activityId
 * @desc    Get lead remark/activity by ID
 * @access  Private
 */
router.get(
  "/:activityId",
  authMiddleware,
  validateRequest({ params: activityIdSchema }),
  LeadActivityController.getActivityById
);

/**
 * @route   GET /api/lead-remarks/lead/:leadId
 * @desc    Get all activities for a specific lead
 * @access  Private
 */
router.get(
  "/lead/:leadId",
  authMiddleware,
  validateRequest({ params: leadIdSchema, query: leadActivitiesQuerySchema }),
  LeadActivityController.getLeadActivities
);

/**
 * @route   PUT /api/lead-remarks/:activityId
 * @desc    Update lead remark/activity by ID
 * @access  Private
 */
router.put(
  "/:activityId",
  authMiddleware,
  validateRequest({ params: activityIdSchema, body: updateActivitySchema }),
  LeadActivityController.updateActivity
);

/**
 * @route   DELETE /api/lead-remarks/:activityId
 * @desc    Delete lead remark/activity by ID
 * @access  Private
 */
router.delete(
  "/:activityId",
  authMiddleware,
  validateRequest({ params: activityIdSchema }),
  LeadActivityController.deleteActivity
);

/**
 * @route   PATCH /api/lead-remarks/:activityId/status
 * @desc    Update activity status
 * @access  Private
 */
router.patch(
  "/:activityId/status",
  authMiddleware,
  validateRequest({ params: activityIdSchema, body: activityStatusSchema }),
  LeadActivityController.updateActivityStatus
);

/**
 * @route   GET /api/lead-remarks/follow-ups/upcoming
 * @desc    Get upcoming follow-ups
 * @access  Private
 */
router.get(
  "/follow-ups/upcoming",
  authMiddleware,
  validateRequest({ query: upcomingFollowUpsQuerySchema }),
  LeadActivityController.getUpcomingFollowUps
);

export default router;