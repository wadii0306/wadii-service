import { Request, Response } from "express";
import {
  BusinessService,
  ICreateBusinessData,
} from "../services/businessService";

type Params = { businessId: string };
type Query = Record<string, unknown>;
type Body = ICreateBusinessData;

export class BusinessController {
  static async createBusiness(
    req: Request<Params, any, Body, Query>,
    res: Response
  ) {
    try {
      console.log("BusinessController.createBusiness - REQ BODY OWNER:", req.body.ownerId);
      console.log("BusinessController.createBusiness - REQ USER:", req.user?.userId);
      
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const business = await BusinessService.createBusiness(
        req.body,
        req.user.userId
      );


      res.status(201).json({
        success: true,
        message: "Business created successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAllBusinesses(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const businesses = await BusinessService.getAllBusinesses(
        req.user.userId,
        req.userRole, // added by auth middleware
        req.query ?? {}
      );

      res.status(200).json({
        success: true,
        message: "Businesses retrieved successfully",
        data: businesses,
        total: businesses.length,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getBusinessById(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;
      const business = await BusinessService.getBusinessById(
        businessId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business retrieved successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateBusiness(
    req: Request<Params, any, Body, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;

      const business = await BusinessService.updateBusiness(
        businessId,
        req.body, // BusinessService accepts Partial<ICreateBusinessData>
        req.user.userId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business updated successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteBusiness(
    req: Request<Params, any, any, Query>,
    res: Response
  ) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { businessId } = req.params;

      const business = await BusinessService.deleteBusiness(
        businessId,
        req.user.userId,
        req.user.userId,
        req.userRole
      );

      if (!business) {
        res.status(404).json({ success: false, message: "Business not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Business deleted successfully",
        data: business,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
