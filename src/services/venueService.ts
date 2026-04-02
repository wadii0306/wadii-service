// src/services/venueService.ts
import { Types } from "mongoose";
import { Venue } from "../models/Venue";
import { Business } from "../models/Business";
import { UserBusinessRole } from "../models/UserBusinessRole";
import { IVenue } from "../types";
import { logger } from "../utils/logger";

interface IVendor {
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
}

interface IFoodPackage {
  name: string
  description: string
  price: number
  priceType: 'flat' | 'per_guest'
  inclusions?: string[]
  menuSections?: Array<{
    sectionName: string
    selectionType: 'limit' | 'all_included'
    maxSelectable?: number
  }>
}

interface IService {
  service: string;
  vendors: IVendor[];
}

export interface ICreateVenueData {
  businessId: string
  venueName: string
  venueType: 'banquet' | 'lawn' | 'convention_center'
  capacity: { min: number; max: number }
  address: {
    street: string
    city: string
    state: string
    country: string
    pincode: string
  }
  bookingPreferences?: {
    timings?: {
      morning?: {
        start?: string
        end?: string
      }
      evening?: {
        start?: string
        end?: string
      }
      fullDay?: {
        start?: string
        end?: string
      }
    }
    notes?: string | null
  }

  media: { coverImageUrl?: string | null }
  status: 'active' | 'inactive'
  foodPackages?: Array<{
    name: string
    description: string
    price: number
    priceType: 'flat' | 'per_guest'
    inclusions?: string[]
    menuSections?: Array<{
      sectionName: string
      selectionType: 'limit' | 'all_included'
      maxSelectable?: number
    }>
  }>
  foodMenu?: Array<{
    sectionName: string
    selectionType: 'free' | 'limit' | 'all_included'
    maxSelectable?: number
    items: Array<{
      name: string
      description?: string
      isAvailable?: boolean
      priceAdjustment?: number
    }>
  }>
  cateringServiceVendor?: Array<{
    name: string
    email: string
    phone: string
    bankDetails?: {
      accountNumber?: string
      accountHolderName?: string
      ifscCode?: string
      bankName?: string
      branchName?: string
      upiId?: string
    }
  }>
  services?: Array<{
    service: string
    vendors: Array<{
      name: string
      email: string
      phone: string
      bankDetails?: {
        accountNumber?: string
        accountHolderName?: string
        ifscCode?: string
        bankName?: string
        branchName?: string
        upiId?: string
      }
    }>
  }>
  createdAt: Date
  updatedAt: Date
  createdBy?: Types.ObjectId | string
  updatedBy?: Types.ObjectId | string
}

export interface ICreateVendorForService {
  services: IService[];
}

export type RoleSnapshot = {
  role: "developer" | "owner" | "manager" | "admin" | "marketing";
  permissions?: string[];
};

const PERMS = {
  VENUE_CREATE: "venue.create",
  VENUE_READ: "venue.read",
  VENUE_UPDATE: "venue.update",
  VENUE_DELETE: "venue.delete",
} as const;

const oid = (id: string | Types.ObjectId) =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

const hasPerm = (role?: RoleSnapshot, perm?: string) => {
  if (!role) return false;
  if (role.role === "developer") return true;
  if (!perm) return false;
  return Array.isArray(role.permissions) && role.permissions.includes(perm);
};

export class VenueService {
  /**
   * Create a new venue
   */
  static async createVenue(
    venueData: ICreateVenueData,
    createdBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IVenue> {
    console.log({
      timestamp: new Date().toISOString(),
      action: 'CREATE_VENUE_INIT',
      requestedBy: createdBy,
      userId,
      businessId: venueData.businessId,
      venueName: venueData.venueName,
    })

    try {
      // ===== VALIDATION PHASE =====
      console.log('[VALIDATION] Checking if business exists...')
      const business = await Business.findOne({
        _id: oid(venueData.businessId),
        isDeleted: false,
      }).lean()

      if (!business) {
        console.error('[VALIDATION] Business not found', {
          businessId: venueData.businessId,
        })
        throw new Error('Business not found')
      }

      console.log('[VALIDATION]  Business found:', {
        businessId: business._id,
        businessName: business.businessName,
      })

      // ===== AUTHORIZATION PHASE =====
      console.log('[AUTH] Checking permissions for venue creation...')
      const hasPermission = hasPerm(userRole, PERMS.VENUE_CREATE)
      if (!hasPermission) {
        console.log(
          '[AUTH] User lacks global VENUE_CREATE permission. Checking scoped roles...'
        )

        const hasAccess = await UserBusinessRole.findOne({
          userId: oid(userId),
          businessId: oid(venueData.businessId),
          $or: [
            { role: 'owner' },
            { permissions: { $in: [PERMS.VENUE_CREATE] } },
          ],
        }).lean()

        if (!hasAccess) {
          console.error('[AUTH] Permission denied for user', {
            userId,
            businessId: venueData.businessId,
          })
          throw new Error('Permission denied')
        }

        console.log('[AUTH]  Scoped access granted via business role:', {
          role: hasAccess.role,
          permissions: hasAccess.permissions,
        })
      } else {
        console.log('[AUTH]  Global VENUE_CREATE permission granted.')
      }

      // ===== DATA PREPARATION PHASE =====
      console.log('[DATA] Preparing venue document...')
      const venue = new Venue({
        businessId: oid(venueData.businessId),
        venueName: venueData.venueName,
        venueType: venueData.venueType,
        capacity: venueData.capacity,
        address: venueData.address,
        media: venueData.media,
        foodPackages: venueData.foodPackages || [],
        foodMenu: venueData.foodMenu || [],
        cateringServiceVendor: venueData.cateringServiceVendor || [],
        bookingPreferences: venueData.bookingPreferences,
        services: venueData.services || [],
        status: venueData.status ?? 'active',
        createdBy,
      })

      console.log('[DATA] Venue object constructed successfully', {
        venueName: venue.venueName,
        type: venue.venueType,
        capacity: venue.capacity,
        status: venue.status,
      })

      // ===== DATABASE SAVE PHASE =====
      console.log('[DB] Saving venue to database...')
      await venue.save()
      console.log('[DB]  Venue saved successfully', { venueId: venue._id })

      console.log('========== VENUE CREATION COMPLETE ==========')
      return venue
    } catch (err: any) {
      console.error('========== VENUE CREATION FAILED ==========', {
        timestamp: new Date().toISOString(),
        errorMessage: err.message,
        stack: err.stack?.split('\n')[0],
      })
      throw err // Rethrow for API error handling
    }
  }

  /**
   * Get all venues for a business
   */
  static async getVenuesByBusiness(
    businessId: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IVenue[]> {
    // Access/read check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: oid(businessId),
      }).lean()
      if (!hasAccess) throw new Error('Access denied to this business')
    }

    return Venue.find({ businessId: oid(businessId) })
      .sort({ createdAt: -1 })
      .lean()
  }

  /**
   * Get venue by ID
   */
  static async getVenueById(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IVenue | null> {
    const venue = await Venue.findById(oid(venueId)).lean()
    if (!venue) return null

    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: oid((venue as any).businessId),
      }).lean()
      if (!hasAccess) throw new Error('Access denied')
    }

    // If you need a Mongoose doc instead of lean object, remove .lean() above and return the doc.
    return venue as unknown as IVenue
  }

  /**
   * Update venue
   */
  static async updateVenue(
    venueId: string,
    updateData: Partial<ICreateVenueData>,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<IVenue | null> {
    const existing = await Venue.findById(oid(venueId)).lean()
    if (!existing) throw new Error('Venue not found')

    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: oid((existing as any).businessId),
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    const update: any = { ...updateData, updatedBy }
    if (update.businessId) update.businessId = oid(update.businessId)

    return Venue.findOneAndUpdate({ _id: oid(venueId) }, update, {
      new: true,
      runValidators: true,
    })
  }

  /**
   * Delete venue
   */
  static async deleteVenue(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ): Promise<boolean> {
    const existing = await Venue.findById(oid(venueId)).lean()
    if (!existing) throw new Error('Venue not found')

    if (!hasPerm(userRole, PERMS.VENUE_DELETE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: oid((existing as any).businessId),
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_DELETE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    await Venue.findByIdAndDelete(oid(venueId))
    return true
  }

  /**
   * Create a new service
   */
  static async createService(
    venueId: string,
    serviceName: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.services) {
      venue.services = []
    }

    // Check if service already exists
    const serviceExists = venue.services.find((s) => s.service === serviceName)
    if (serviceExists) {
      throw new Error('Service already exists for this venue')
    }

    // Create new service with empty vendors array
    venue.services.push({
      service: serviceName,
      vendors: [],
    })

    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Remove a service completely
   */
  static async removeService(
    venueId: string,
    serviceName: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.services || venue.services.length === 0) {
      throw new Error('No services found for this venue')
    }

    const serviceIndex = venue.services.findIndex(
      (s) => s.service === serviceName
    )
    if (serviceIndex === -1) {
      throw new Error('Service not found')
    }

    venue.services.splice(serviceIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * List all services
   */
  static async listServices(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean()
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: 'owner' }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    return venue.services || []
  }

  /**
   * Add a vendor to a specific service
   */

  static async addServiceVendor(
    venueId: string,
    serviceName: string,
    vendorData: IVendor,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    // Find or create service
    if (!venue.services) {
      venue.services = []
    }

    const serviceIndex = venue.services.findIndex(
      (s) => s.service === serviceName
    )

    if (serviceIndex === -1) {
      // Create new service
      venue.services.push({
        service: serviceName,
        vendors: [vendorData],
      })
    } else {
      // Add vendor to existing service
      venue.services[serviceIndex].vendors.push(vendorData)
    }

    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Remove a vendor from a specific service
   */
  static async removeServiceVendor(
    venueId: string,
    serviceName: string,
    vendorEmail: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    const service = venue.services?.find((s) => s.service === serviceName)
    if (!service) throw new Error('Service not found')

    const vendorIndex = service.vendors.findIndex(
      (v) => v.email === vendorEmail
    )
    if (vendorIndex === -1) throw new Error('Vendor not found in service')

    service.vendors.splice(vendorIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * List all vendors for a specific service
   */
  static async listServiceVendors(
    venueId: string,
    serviceName: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean()
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: 'owner' }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    const service = venue.services?.find((s) => s.service === serviceName)
    if (!service) throw new Error('Service not found')

    return service.vendors
  }

  /**
   * Add a food package
   */
  static async addFoodPackage(
    venueId: string,
    packageData: IFoodPackage,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.foodPackages) venue.foodPackages = []
    venue.foodPackages.push(packageData)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Remove a food package by ID
   */
  static async removeFoodPackage(
    venueId: string,
    packageId: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    const packageIndex = venue.foodPackages?.findIndex(
      (p: any) => p._id.toString() === packageId
    )
    if (packageIndex === -1 || packageIndex === undefined) {
      throw new Error('Food package not found')
    }

    venue.foodPackages!.splice(packageIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * List all food packages
   */
  static async listFoodPackages(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean()
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: 'owner' }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    return venue.foodPackages || []
  }

  /**
   * Add a catering service vendor
   */
  static async addCateringVendor(
    venueId: string,
    vendorData: IVendor,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    console.log('========== ADD CATERING VENDOR START ==========')
    console.log({
      timestamp: new Date().toISOString(),
      action: 'ADD_CATERING_VENDOR_INIT',
      venueId,
      vendorData,
      userId,
    })

    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) {
      console.error('[VALIDATION] Venue not found', { venueId })
      throw new Error('Venue not found')
    }

    console.log('[VALIDATION]  Venue found:', {
      venueId: venue._id,
      venueName: venue.venueName,
      currentCateringVendors: venue.cateringServiceVendor?.length || 0,
    })

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      console.log('[AUTH] Checking scoped permissions...')
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) {
        console.error('[AUTH] Permission denied', { userId, venueId })
        throw new Error('Permission denied')
      }
      console.log('[AUTH]  Scoped permission granted')
    } else {
      console.log('[AUTH]  Global VENUE_UPDATE permission granted')
    }

    if (!venue.cateringServiceVendor) venue.cateringServiceVendor = []

    console.log('[DATA] Vendor data being added:', {
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone,
      hasBankDetails: !!vendorData.bankDetails,
      bankDetails: vendorData.bankDetails,
    })

    venue.cateringServiceVendor.push(vendorData)
    venue.updatedBy = updatedBy
    venue.markModified('cateringServiceVendor')

    console.log('[DB] Saving venue with new catering vendor...')
    await venue.save()
    console.log('[DB]  Venue saved successfully')

    // Fetch the updated venue to ensure all fields are populated
    console.log('[DB] Fetching updated venue...')
    const updatedVenue = await Venue.findById(oid(venueId))

    if (updatedVenue) {
      const addedVendor =
        updatedVenue.cateringServiceVendor?.[
          updatedVenue.cateringServiceVendor.length - 1
        ]
      console.log('[RESPONSE] Last added vendor:', {
        name: addedVendor?.name,
        email: addedVendor?.email,
        phone: addedVendor?.phone,
        hasBankDetails: !!addedVendor?.bankDetails,
        bankDetails: addedVendor?.bankDetails,
      })
      console.log(
        '[RESPONSE] Total catering vendors:',
        updatedVenue.cateringServiceVendor?.length || 0
      )
    }

    console.log('========== ADD CATERING VENDOR COMPLETE ==========')
    return updatedVenue
  }

  /**
   * Remove a catering service vendor by email
   */
  static async removeCateringVendor(
    venueId: string,
    vendorEmail: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    const vendorIndex = venue.cateringServiceVendor?.findIndex(
      (v) => v.email === vendorEmail
    )
    if (vendorIndex === -1 || vendorIndex === undefined) {
      throw new Error('Catering vendor not found')
    }

    venue.cateringServiceVendor!.splice(vendorIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * List all catering service vendors
   */
  static async listCateringVendors(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean()
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: 'owner' }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    return venue.cateringServiceVendor || []
  }

  /**
   * Get all venues (restricted unless superadmin/developer)
   */
  public static async getAllVenues(
    userId: string,
    userRole?: RoleSnapshot,
    filters: Record<string, unknown> = {}
  ): Promise<(IVenue & { businessName: string | null })[]> {
    const query: any = { ...filters }

    const venues = await Venue.find().limit(3)
    logger.info(venues.length)

    try {
      logger.info(
        {
          userId,
          role: userRole?.role || 'unknown',
          filters,
        },
        '[VenueService] Fetching all venues'
      )

      //  Developer or Super Admin → return all venues with business info
      if (['developer', 'superadmin'].includes(userRole?.role || '')) {
        logger.debug('[VenueService] Developer or superadmin access detected')

        const venues = await Venue.aggregate([
          { $match: query },
          {
            $lookup: {
              from: 'businesses',
              localField: 'businessId',
              foreignField: '_id',
              as: 'business',
            },
          },
          {
            $addFields: {
              businessName: { $arrayElemAt: ['$business.businessName', 0] },
            },
          },
          { $project: { business: 0 } },
          { $sort: { createdAt: -1 } },
        ])

        logger.info(
          {
            count: venues.length,
          },
          '[VenueService] Venues fetched successfully (developer mode)'
        )

        return venues
      }

      //  Normal users: get businesses they are assigned to
      logger.debug(
        '[VenueService] Non-developer role, fetching assigned businesses'
      )

      const roles = await UserBusinessRole.find({
        userId: new Types.ObjectId(userId),
      })
        .select('businessId')
        .lean()

      const businessIds = roles.map((r) => r.businessId)

      if (businessIds.length === 0) {
        logger.warn(
          { userId },
          '[VenueService] No assigned businesses found for user'
        )
        return []
      }

      query.businessId = { $in: businessIds }

      const venues = await Venue.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'businesses',
            localField: 'businessId',
            foreignField: '_id',
            as: 'business',
          },
        },
        {
          $addFields: {
            businessName: { $arrayElemAt: ['$business.businessName', 0] },
          },
        },
        { $project: { business: 0 } },
        { $sort: { createdAt: -1 } },
      ])

      logger.info(
        {
          userId,
          count: venues.length,
        },
        '[VenueService] Venues fetched successfully (restricted)'
      )

      return venues
    } catch (error: any) {
      logger.error(
        {
          userId,
          error: error.message,
          stack: error.stack,
        },
        '[VenueService] Error fetching venues'
      )
      throw new Error('Failed to fetch venues')
    }
  }

  /**
   * Update a food package
   */
  static async updateFoodPackage(
    venueId: string,
    packageId: string,
    packageData: Partial<IFoodPackage>,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.foodPackages || venue.foodPackages.length === 0) {
      throw new Error('No food packages found')
    }

    // Find the package index
    const packageIndex = venue.foodPackages.findIndex(
      (pkg: any) => pkg._id.toString() === packageId
    )

    if (packageIndex === -1) {
      throw new Error('Food package not found')
    }

    // Update only provided fields
    if (packageData.name !== undefined) {
      venue.foodPackages[packageIndex].name = packageData.name
    }
    if (packageData.description !== undefined) {
      venue.foodPackages[packageIndex].description = packageData.description
    }
    if (packageData.price !== undefined) {
      venue.foodPackages[packageIndex].price = packageData.price
    }
    if (packageData.priceType !== undefined) {
      venue.foodPackages[packageIndex].priceType = packageData.priceType
    }
    if (packageData.inclusions !== undefined) {
      venue.foodPackages[packageIndex].inclusions = packageData.inclusions
    }
    if (packageData.menuSections !== undefined) {
      venue.foodPackages[packageIndex].menuSections = packageData.menuSections
    }

    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Delete a food package
   */
  static async deleteFoodPackage(
    venueId: string,
    packageId: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.foodPackages || venue.foodPackages.length === 0) {
      throw new Error('No food packages found')
    }

    // Find the package index
    const packageIndex = venue.foodPackages.findIndex(
      (pkg: any) => pkg._id.toString() === packageId
    )

    if (packageIndex === -1) {
      throw new Error('Food package not found')
    }

    // Remove the package
    venue.foodPackages.splice(packageIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Update a service
   */
  static async updateService(
    venueId: string,
    serviceId: string,
    serviceName: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.services || venue.services.length === 0) {
      throw new Error('No services found')
    }

    // Find the service index
    const serviceIndex = venue.services.findIndex(
      (s: any) => s._id.toString() === serviceId
    )

    if (serviceIndex === -1) {
      throw new Error('Service not found')
    }

    // Check if new service name already exists (excluding current service)
    const serviceExists = venue.services.find(
      (s: any, idx: number) => s.service === serviceName && idx !== serviceIndex
    )
    if (serviceExists) {
      throw new Error('Service name already exists for this venue')
    }

    // Update service name
    venue.services[serviceIndex].service = serviceName
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }

  /**
   * Delete a service
   */
  static async deleteService(
    venueId: string,
    serviceId: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) })
    if (!venue) throw new Error('Venue not found')

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: 'owner' },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean()
      if (!hasAccess) throw new Error('Permission denied')
    }

    if (!venue.services || venue.services.length === 0) {
      throw new Error('No services found')
    }

    // Find the service index
    const serviceIndex = venue.services.findIndex(
      (s: any) => s._id.toString() === serviceId
    )

    if (serviceIndex === -1) {
      throw new Error('Service not found')
    }

    // Remove the service
    venue.services.splice(serviceIndex, 1)
    venue.updatedBy = updatedBy
    await venue.save()
    return venue
  }
}


