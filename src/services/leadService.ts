import { Lead } from "../models/Lead";
import { ILead } from "../types/lead-types";
import { oid, recalcFoodPackage, calculateTotalsWithGST } from "../utils/helper";
import BlackoutDayService from "./blackoutDayService";

export class LeadService {
  /**
   * Create a new lead
   */
  async createLead(leadData: Partial<ILead>): Promise<ILead> {
    try {
      if (
        leadData.venueId &&
        leadData.eventStartDateTime &&
        leadData.eventEndDateTime
      ) {
        const conflictResult = await BlackoutDayService.checkBlackoutConflict(
          leadData.venueId.toString(),
          leadData.eventStartDateTime,
          leadData.eventEndDateTime
        )

        if (conflictResult.hasConflict) {
          const conflictDates = conflictResult.conflictingDays
            ?.map(
              (bd) =>
                `${bd.title} (${new Date(
                  bd.startDate
                ).toLocaleDateString()} - ${new Date(
                  bd.endDate
                ).toLocaleDateString()})`
            )
            .join(', ')
          throw new Error(
            `Cannot create lead. The selected dates conflict with blackout days: ${conflictDates}`
          )
        }
      }

      // NEW: Always create foodPackage for consistency
      if (!leadData.foodPackage) {
        // Create foodPackage from simple package or empty structure
        if (leadData.package) {
          // User selected simple package - convert to foodPackage structure
          let venuePackageConfig = null;
          if (leadData.venueId) {
            const { Venue } = await import("../models/Venue");
            const venue = await Venue.findById(leadData.venueId).lean();
            if (venue?.foodPackages) {
              venuePackageConfig = venue.foodPackages.find(
                (pkg: any) =>
                  pkg._id?.toString() ===
                  leadData.package._id?.toString()
              );
            }
          }
          
          if (venuePackageConfig) {
            leadData.foodPackage = {
              sourcePackageId: undefined, // Subdocuments don't have _id
              name: venuePackageConfig.name,
              isCustomised: false,
              sections: [],
              defaultPrice: venuePackageConfig.price || 0,
              totalPricePerPerson: venuePackageConfig.price || 0,
              inclusions: venuePackageConfig.inclusions || []
            };
          }
        } else {
          // No package selected - use venue's default package or create empty
          let defaultPackageConfig = null;
          if (leadData.venueId) {
            const { Venue } = await import("../models/Venue");
            const venue = await Venue.findById(leadData.venueId).lean();
            if (venue?.foodPackages && venue.foodPackages.length > 0) {
              // Use the first package as default
              defaultPackageConfig = venue.foodPackages[0];
            }
          }
          
          if (defaultPackageConfig) {
            leadData.foodPackage = {
              sourcePackageId: undefined, // Subdocuments don't have _id
              name: defaultPackageConfig.name,
              isCustomised: false,
              sections: [],
              defaultPrice: defaultPackageConfig.price || 0,
              totalPricePerPerson: defaultPackageConfig.price || 0,
              inclusions: defaultPackageConfig.inclusions || []
            };
          } else {
            // No packages available - create empty foodPackage
            leadData.foodPackage = {
              sourcePackageId: undefined,
              name: "No Package",
              isCustomised: false,
              sections: [],
              defaultPrice: 0,
              totalPricePerPerson: 0,
              inclusions: []
            };
          }
        }
      }

      // if (leadData.foodPackage) {
      //   // Fetch venue package configuration if sourcePackageId is provided
      //   let venuePackageConfig = null;
      //   if (leadData.foodPackage.sourcePackageId && leadData.venueId) {
      //     const { Venue } = await import("../models/Venue");
      //     const venue = await Venue.findById(leadData.venueId).lean();
      //     if (venue?.foodPackages) {
      //       venuePackageConfig = venue.foodPackages.find(
      //         (pkg: any) =>
      //           pkg._id?.toString() ===
      //           leadData?.foodPackage?.sourcePackageId?.toString()
      //       )
      //     }
      //   }

      //   // Only recalculate if totalPricePerPerson is not already set (preserve user edits)
      //   if (!leadData.foodPackage.totalPricePerPerson) {
      //     leadData.foodPackage = recalcFoodPackage(
      //       leadData.foodPackage,
      //       venuePackageConfig
      //     );
      //   }
      // }

      // Extract remarks from lead data before creating Lead
      const { remarks, ...pureLeadData } = leadData as any;
      const remarksData = remarks;

      // Calculate GST if foodPackage and services are present and GST is enabled
      if (pureLeadData.foodPackage && pureLeadData.gstCalculation?.enabled) {
        const totalsWithGST = calculateTotalsWithGST({
          foodPackage: pureLeadData.foodPackage,
          numberOfGuests: pureLeadData.numberOfGuests || 0,
          services: pureLeadData.services || [],
          foodGSTRate: pureLeadData.gstCalculation.food?.rate || 5,
          servicesGSTRate: pureLeadData.gstCalculation.services?.rate || 18,
        });

        // Update GST calculation with actual calculated values
        pureLeadData.gstCalculation = {
          enabled: true,
          food: totalsWithGST.gst.food,
          services: totalsWithGST.gst.services,
          totalGST: totalsWithGST.gst.totalGST,
          grandTotal: totalsWithGST.gst.grandTotal,
        };
      }

      const lead = new Lead(pureLeadData)
      await lead.save()

      // Create lead remarks if provided
      let createdRemarks = [];
      if (remarksData && Array.isArray(remarksData) && remarksData.length > 0) {
        const { LeadActivity } = await import("../models/LeadRemark");
        
        const remarksToCreate = remarksData.map((remark: any) => ({
          leadId: lead._id,
          header: remark.header,
          description: remark.description,
          status: remark.status || 'pending',
          outcome: remark.outcome,
          followUpDate: remark.followUpDate ? new Date(remark.followUpDate) : undefined,
          createdBy: pureLeadData.createdBy
        }));

        createdRemarks = await LeadActivity.insertMany(remarksToCreate);
        
        // Update lead with remark references
        lead.remarks = createdRemarks.map(remark => remark._id);
        await lead.save();
      }

      await lead.populate([
        { path: 'venueId', select: ' venueType address' },
        { path: 'createdBy', select: '_id email firstName lastName' },
        { path: 'updatedBy', select: '_id email firstName lastName' },
        { path: 'remarks', populate: { path: 'createdBy', select: '_id email firstName lastName' } }
      ])

      return lead
    } catch (error: any) {
      throw new Error(`Error creating lead: ${error.message}`);
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: string): Promise<ILead | null> {
    try {
      const lead = await Lead.findById(oid(leadId))
        .populate("venueId", "venueName venueType address")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName")
        .populate("remarks", "header description status outcome followUpDate createdAt");
      return lead;
    } catch (error: any) {
      throw new Error(`Error fetching lead: ${error.message}`);
    }
  }

  /**
   * Get all leads for a specific venue
   */
  async getLeadsByVenue(
    venueId: string,
    filters?: {
      leadStatus?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ leads: ILead[]; total: number }> {
    try {
      const query: any = { venueId };

      if (filters?.leadStatus) {
        query.leadStatus = filters.leadStatus;
      }

      if (filters?.startDate || filters?.endDate) {
        query["eventStartDateTime"] = {};
        if (filters.startDate) {
          query["eventStartDateTime"].$gte = filters.startDate;
        }
        if (filters.endDate) {
          query["eventStartDateTime"].$lte = filters.endDate;
        }
      }

      const total = await Lead.countDocuments(query);
      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.skip || 0)
        .populate("foodPackage")
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      // Ensure all leads have foodPackage structure
      for (const lead of leads) {
        if (!lead.foodPackage) {
          // Try to get venue's default package
          let defaultPackageConfig = null;
          if (lead.venueId) {
            const { Venue } = await import("../models/Venue");
            const venue = await Venue.findById(lead.venueId).lean();
            if (venue?.foodPackages && venue.foodPackages.length > 0) {
              // Use the first package as default
              defaultPackageConfig = venue.foodPackages[0];
            }
          }
          
          if (defaultPackageConfig) {
            lead.foodPackage = {
              sourcePackageId: undefined, // Subdocuments don't have _id
              name: defaultPackageConfig.name,
              isCustomised: false,
              sections: [],
              defaultPrice: defaultPackageConfig.price || 0,
              totalPricePerPerson: defaultPackageConfig.price || 0,
              inclusions: defaultPackageConfig.inclusions || []
            };
          } else {
            // No packages available - create empty foodPackage
            lead.foodPackage = {
              sourcePackageId: undefined,
              name: "No Package",
              isCustomised: false,
              sections: [],
              defaultPrice: 0,
              totalPricePerPerson: 0,
              inclusions: []
            };
          }
        }
      }

      console.log(
        `Fetched ${leads.length} leads for venue ${venueId} with filters:`,
        filters
      );
      console.log(`Total leads : ${leads}`);

      return { leads, total };
    } catch (error: any) {
      throw new Error(`Error fetching leads by venue: ${error.message}`);
    }
  }

  /**
   * Get all leads for a business
   */
  async getLeadsByBusiness(
    businessId: string,
    filters?: {
      venueId?: string;
      leadStatus?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ leads: ILead[]; total: number }> {
    try {
      const query: any = { businessId };

      if (filters?.venueId) {
        query.venueId = filters.venueId;
      }

      if (filters?.leadStatus) {
        query.leadStatus = filters.leadStatus;
      }

      if (filters?.startDate || filters?.endDate) {
        query["eventStartDateTime"] = {};
        if (filters.startDate) {
          query["eventStartDateTime"].$gte = filters.startDate;
        }
        if (filters.endDate) {
          query["eventStartDateTime"].$lte = filters.endDate;
        }
      }

      const total = await Lead.countDocuments(query);
      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.skip || 0)
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return { leads, total };
    } catch (error: any) {
      throw new Error(`Error fetching leads by business: ${error.message}`);
    }
  }

  /**
   * Update lead
   */
  async updateLead(
    leadId: string,
    updateData: Partial<ILead>
  ): Promise<ILead | null> {
    try {
      // Fetch current lead once at the beginning for potential GST calculation
      let currentLead: any = null;
      
      if (updateData.foodPackage) {
        // Fetch current lead to get existing foodPackage data
        currentLead = await Lead.findById(leadId).lean();
        
        // Only recalculate if totalPricePerPerson is not already set (preserve user edits)
        if (!updateData.foodPackage.totalPricePerPerson) {
          // Fetch venue package configuration if sourcePackageId is provided
          let venuePackageConfig = null;
          if (updateData.foodPackage.sourcePackageId) {
            if (currentLead?.venueId) {
              const { Venue } = await import("../models/Venue");
              const venue = await Venue.findById(currentLead.venueId).lean();
              if (venue?.foodPackages) {
                venuePackageConfig = venue.foodPackages.find(
                  (pkg: any) =>
                    pkg._id?.toString() ===
                    updateData?.foodPackage?.sourcePackageId?.toString()
                );
              }
            }
          }

          updateData.foodPackage = recalcFoodPackage(
            updateData.foodPackage,
            venuePackageConfig
          );
        }

        // FIX 1: Preserve defaultPrice from existing package or venue config
        if (currentLead?.foodPackage?.defaultPrice && !updateData.foodPackage?.defaultPrice) {
          if (updateData.foodPackage) {
            updateData.foodPackage.defaultPrice = currentLead.foodPackage.defaultPrice;
          }
        } else if (!updateData.foodPackage?.defaultPrice && updateData.foodPackage?.sourcePackageId) {
          // Fetch from venue config if no existing defaultPrice
          let venuePackageConfig = null;
          if (currentLead?.venueId) {
            const { Venue } = await import("../models/Venue");
            const venue = await Venue.findById(currentLead.venueId).lean();
            if (venue?.foodPackages) {
              venuePackageConfig = venue.foodPackages.find(
                (pkg: any) =>
                  pkg._id?.toString() ===
                  updateData?.foodPackage?.sourcePackageId?.toString()
              );
            }
          }
          if (updateData.foodPackage) {
            updateData.foodPackage.defaultPrice = venuePackageConfig?.price || updateData.foodPackage.defaultPrice;
          }
        }

        // FIX 2: Force isCustomised to true when foodPackage is modified
        if (updateData.foodPackage) {
          updateData.foodPackage.isCustomised = true;
        }

        // FIX 3: Ensure immutable snapshot structure
        if (updateData.foodPackage?.totalPricePerPerson && updateData.foodPackage?.defaultPrice) {
          updateData.foodPackage.totalBasePrice = updateData.foodPackage.defaultPrice;
          updateData.foodPackage.totalAddonPrice = updateData.foodPackage.totalPricePerPerson - updateData.foodPackage.defaultPrice;
        }
      }

      // Calculate GST if GST is enabled in updateData or if foodPackage/services/numberOfGuests are updated
      if (updateData.gstCalculation?.enabled || (updateData.foodPackage || updateData.services || updateData.numberOfGuests)) {
        // Get current lead data if we need it for GST calculation (use existing currentLead if available)
        if (!currentLead) {
          currentLead = await Lead.findById(leadId).lean();
        }
        
        const foodPackage = updateData.foodPackage || currentLead?.foodPackage;
        const services = updateData.services || currentLead?.services || [];
        const numberOfGuests = updateData.numberOfGuests || currentLead?.numberOfGuests || 0;
        
        if (foodPackage && (updateData.gstCalculation?.enabled || currentLead?.gstCalculation?.enabled)) {
          const totalsWithGST = calculateTotalsWithGST({
            foodPackage,
            numberOfGuests,
            services,
            foodGSTRate: updateData.gstCalculation?.food?.rate || currentLead?.gstCalculation?.food?.rate || 5,
            servicesGSTRate: updateData.gstCalculation?.services?.rate || currentLead?.gstCalculation?.services?.rate || 18,
          });

          // Update GST calculation with actual calculated values
          updateData.gstCalculation = {
            enabled: true,
            food: totalsWithGST.gst.food,
            services: totalsWithGST.gst.services,
            totalGST: totalsWithGST.gst.totalGST,
            grandTotal: totalsWithGST.gst.grandTotal,
          };
        }
      }

      const lead = await Lead.findByIdAndUpdate(
        leadId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return lead;
    } catch (error: any) {
      throw new Error(`Error updating lead: ${error.message}`);
    }
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(
    leadId: string,
    status: "cold" | "warm" | "hot",
    updatedBy?: string
  ): Promise<ILead | null> {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        { leadStatus: status, updatedBy, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return lead;
    } catch (error: any) {
      throw new Error(`Error updating lead status: ${error.message}`);
    }
  }

  /**
   * Delete lead (soft delete by marking as inactive or hard delete)
   */
  async deleteLead(leadId: string): Promise<boolean> {
    try {
      const result = await Lead.findByIdAndDelete(leadId);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting lead: ${error.message}`);
    }
  }

  /**
   * Search leads by client name, email, or contact
   */
  async searchLeads(
    searchTerm: string,
    venueId?: string,
    businessId?: string
  ): Promise<ILead[]> {
    try {
      const query: any = {
        $or: [
          { clientName: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
          { contactNo: { $regex: searchTerm, $options: "i" } },
        ],
      };

      if (venueId) {
        query.venueId = venueId;
      }

      if (businessId) {
        query.businessId = businessId;
      }

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return leads;
    } catch (error: any) {
      throw new Error(`Error searching leads: ${error.message}`);
    }
  }

  /**
   * Get leads by occasion date range
   */
  async getLeadsByDateRange(
    startDate: Date,
    endDate: Date,
    venueId?: string,
    businessId?: string
  ): Promise<ILead[]> {
    try {
      const query: any = {
        eventStartDateTime: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (venueId) {
        query.venueId = venueId;
      }

      if (businessId) {
        query.businessId = businessId;
      }

      const leads = await Lead.find(query)
        .sort({ eventStartDateTime: 1 })
        .populate("venueId", "venueName venueType")
        .populate("createdBy", "_id email firstName lastName")
        .populate("updatedBy", "_id email firstName lastName");

      return leads;
    } catch (error: any) {
      throw new Error(`Error fetching leads by date range: ${error.message}`);
    }
  }

  /**
   * Get lead statistics for a venue
   */
  async getVenueLeadStats(venueId: string): Promise<{
    total: number;
    cold: number;
    warm: number;
    hot: number;
    upcomingEvents: number;
  }> {
    try {
      const total = await Lead.countDocuments({ venueId });
      const cold = await Lead.countDocuments({ venueId, leadStatus: "cold" });
      const warm = await Lead.countDocuments({ venueId, leadStatus: "warm" });
      const hot = await Lead.countDocuments({ venueId, leadStatus: "hot" });
      const upcomingEvents = await Lead.countDocuments({
        venueId,
        eventStartDateTime: { $gte: new Date() },
      });

      return { total, cold, warm, hot, upcomingEvents };
    } catch (error: any) {
      throw new Error(`Error fetching lead statistics: ${error.message}`);
    }
  }

  /**
   * Bulk update lead statuses
   */
  async bulkUpdateLeadStatus(
    leadIds: string[],
    status: "cold" | "warm" | "hot",
    updatedBy?: string
  ): Promise<number> {
    try {
      const result = await Lead.updateMany(
        { _id: { $in: leadIds } },
        { leadStatus: status, updatedBy, updatedAt: new Date() }
      );

      return result.modifiedCount;
    } catch (error: any) {
      throw new Error(`Error bulk updating lead status: ${error.message}`);
    }
  }
}

export default new LeadService();
