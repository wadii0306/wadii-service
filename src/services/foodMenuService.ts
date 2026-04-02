// src/services/foodMenuService.ts
import { Types } from "mongoose";
import { Venue } from "../models/Venue";
import { UserBusinessRole } from "../models/UserBusinessRole";
import { IFoodMenuSection, IFoodMenuItem } from "../types";

export type RoleSnapshot = {
  role: "developer" | "owner" | "manager" | "admin" | "marketing";
  permissions?: string[];
};

const PERMS = {
  VENUE_READ: "venue.read",
  VENUE_UPDATE: "venue.update",
} as const;

const oid = (id: string | Types.ObjectId) =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

const hasPerm = (role?: RoleSnapshot, perm?: string) => {
  if (!role) return false;
  if (role.role === "developer") return true;
  if (!perm) return false;
  return Array.isArray(role.permissions) && role.permissions.includes(perm);
};

export class FoodMenuService {
  /**
   * Create a new food menu section
   */
  static async createSection(
    venueId: string,
    sectionData: {
      sectionName: string;
      selectionType: "free" | "limit" | "all_included";
      maxSelectable?: number;
      items: IFoodMenuItem[];
    },
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu) {
      venue.foodMenu = [];
    }

    // Check if section name already exists
    const sectionExists = venue.foodMenu.find(
      (s) => s.sectionName.toLowerCase() === sectionData.sectionName.toLowerCase()
    );
    if (sectionExists) {
      throw new Error("Section with this name already exists");
    }

    // Add new section
    venue.foodMenu.push(sectionData as any);
    venue.updatedBy = updatedBy;
    await venue.save();

    return venue;
  }

  /**
   * Update a food menu section
   */
  static async updateSection(
    venueId: string,
    sectionId: string,
    updateData: {
      sectionName?: string;
      selectionType?: "free" | "limit" | "all_included";
      maxSelectable?: number;
      defaultPrice?: number;
      items?: IFoodMenuItem[];
    },
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Find section by ID
    const sectionIndex = venue.foodMenu.findIndex(
      (s: any) => s._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      throw new Error("Section not found");
    }

    // Check if new section name already exists (excluding current section)
    if (updateData.sectionName) {
      const nameExists = venue.foodMenu.find(
        (s: any, idx: number) =>
          s.sectionName.toLowerCase() === updateData.sectionName!.toLowerCase() &&
          idx !== sectionIndex
      );
      if (nameExists) {
        throw new Error("Section with this name already exists");
      }
    }

    // Update section fields
    if (updateData.sectionName !== undefined) {
      venue.foodMenu[sectionIndex].sectionName = updateData.sectionName;
    }
    if (updateData.selectionType !== undefined) {
      venue.foodMenu[sectionIndex].selectionType = updateData.selectionType;
    }
    if (updateData.maxSelectable !== undefined) {
      venue.foodMenu[sectionIndex].maxSelectable = updateData.maxSelectable;
    }
    if (updateData.defaultPrice !== undefined) {
      venue.foodMenu[sectionIndex].defaultPrice = updateData.defaultPrice;
    }
    if (updateData.items !== undefined) {
      venue.foodMenu[sectionIndex].items = updateData.items;
    }

    venue.updatedBy = updatedBy;
    venue.markModified("foodMenu");
    await venue.save();

    return venue;
  }

  /**
   * Delete a food menu section
   */
  static async deleteSection(
    venueId: string,
    sectionId: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Find section index
    const sectionIndex = venue.foodMenu.findIndex(
      (s: any) => s._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      throw new Error("Section not found");
    }

    // Get the section name before removing it
    const sectionName = venue.foodMenu[sectionIndex].sectionName;

    // Remove section from foodMenu
    venue.foodMenu.splice(sectionIndex, 1);

    // Remove references to this section from all food packages
    if (venue.foodPackages && venue.foodPackages.length > 0) {
      venue.foodPackages.forEach(pkg => {
        if (pkg.menuSections && pkg.menuSections.length > 0) {
          pkg.menuSections = pkg.menuSections.filter(
            (ms: any) => ms.sectionName !== sectionName
          );
        }
      });
      venue.markModified("foodPackages");
    }

    venue.updatedBy = updatedBy;
    venue.markModified("foodMenu");
    await venue.save();

    return venue;
  }

  /**
   * Add item to a section
   */
  static async addItemToSection(
    venueId: string,
    sectionId: string,
    itemData: IFoodMenuItem,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Find section
    const sectionIndex = venue.foodMenu.findIndex(
      (s: any) => s._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      throw new Error("Section not found");
    }

    const section = venue.foodMenu[sectionIndex];

    // Check if item name already exists in this section
    const itemExists = section.items.find(
      (item: any) => item.name.toLowerCase() === itemData.name.toLowerCase()
    );
    if (itemExists) {
      throw new Error("Item with this name already exists in this section");
    }

    // Add item to section
    section.items.push(itemData);
    venue.updatedBy = updatedBy;
    venue.markModified("foodMenu");
    await venue.save();

    return venue;
  }

  /**
   * Update an item in a section
   */
  static async updateItem(
    venueId: string,
    sectionId: string,
    itemId: string,
    updateData: Partial<IFoodMenuItem>,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Find section
    const sectionIndex = venue.foodMenu.findIndex(
      (s: any) => s._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      throw new Error("Section not found");
    }

    const section = venue.foodMenu[sectionIndex];

    // Find item
    const itemIndex = section.items.findIndex(
      (item: any) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in section");
    }

    // Check if new item name already exists (excluding current item)
    if (updateData.name) {
      const nameExists = section.items.find(
        (item: any, idx: number) =>
          item.name.toLowerCase() === updateData.name!.toLowerCase() &&
          idx !== itemIndex
      );
      if (nameExists) {
        throw new Error("Item with this name already exists in this section");
      }
    }

    // Update item fields
    if (updateData.name !== undefined) {
      section.items[itemIndex].name = updateData.name;
    }
    if (updateData.description !== undefined) {
      section.items[itemIndex].description = updateData.description;
    }
    if (updateData.isAvailable !== undefined) {
      section.items[itemIndex].isAvailable = updateData.isAvailable;
    }

    venue.updatedBy = updatedBy;
    venue.markModified("foodMenu");
    await venue.save();

    return venue;
  }

  /**
   * Delete an item from a section
   */
  static async deleteItem(
    venueId: string,
    sectionId: string,
    itemId: string,
    updatedBy: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) });
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_UPDATE)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [
          { role: "owner" },
          { permissions: { $in: [PERMS.VENUE_UPDATE] } },
        ],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Find section
    const sectionIndex = venue.foodMenu.findIndex(
      (s: any) => s._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      throw new Error("Section not found");
    }

    const section = venue.foodMenu[sectionIndex];

    // Find item index
    const itemIndex = section.items.findIndex(
      (item: any) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in section");
    }

    // Remove item
    section.items.splice(itemIndex, 1);
    venue.updatedBy = updatedBy;
    venue.markModified("foodMenu");
    await venue.save();

    return venue;
  }

  /**
   * Get all food menu sections for a venue
   */
  static async getFoodMenu(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean();
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: "owner" }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    return venue.foodMenu || [];
  }

  /**
   * Get a specific food menu section
   */
  static async getSection(
    venueId: string,
    sectionId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean();
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: "owner" }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    const section = venue.foodMenu.find((s: any) => s._id.toString() === sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    return section;
  }

  /**
   * Get default prices from food menu sections and map them to individual items
   */
  static async getDefaultPrice(
    venueId: string,
    userId: string,
    userRole?: RoleSnapshot
  ) {
    const venue = await Venue.findOne({ _id: oid(venueId) }).lean();
    if (!venue) throw new Error("Venue not found");

    // Permission check
    if (!hasPerm(userRole, PERMS.VENUE_READ)) {
      const hasAccess = await UserBusinessRole.findOne({
        userId: oid(userId),
        businessId: venue.businessId,
        $or: [{ role: "owner" }, { permissions: { $in: [PERMS.VENUE_READ] } }],
      }).lean();
      if (!hasAccess) throw new Error("Permission denied");
    }

    if (!venue.foodMenu || venue.foodMenu.length === 0) {
      throw new Error("No food menu sections found");
    }

    // Map section's defaultPrice to individual items as itemPricePerPerson
    const sectionsWithPrices = venue.foodMenu.map((section: any) => {
      const defaultPrice = section.defaultPrice || 0;

      // Map the default price to each item as itemPricePerPerson
      const itemsWithPrice = section.items.map((item: any) => ({
        ...item,
        itemPricePerPerson: defaultPrice,
      }));

      return {
        ...section,
        defaultPrice: defaultPrice,
        items: itemsWithPrice,
      };
    });

    return sectionsWithPrices;
  }
}
