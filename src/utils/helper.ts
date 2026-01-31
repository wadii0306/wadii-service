import { Types } from "mongoose";

export const oid = (id: string | Types.ObjectId) =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

export function parseNumberParam(
  value: string | undefined,
  fallback: number
): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
/**
 * Recalculate food package pricing based on section items and maxSelectable limits
 *
 * Pricing logic:
 * - For sections with maxSelectable limit:
 *   - First item (up to maxSelectable): Uses defaultPrice (usually 0 or base price)
 *   - Additional items beyond maxSelectable: Adds item's pricePerPerson to section total
 * - For sections without limit (all_included, free):
 *   - Sums all item prices
 *
 * @param pkg - The food package with sections and items
 * @param venuePackageConfig - Optional venue package configuration with menuSections containing maxSelectable and defaultPrice
 * @returns Updated package with calculated section totals and totalPricePerPerson
 */
export function recalcFoodPackage(pkg: any, venuePackageConfig?: any) {
  let sectionTotals = 0;
  const basePackagePrice = venuePackageConfig?.price || 0;

  // Create a map of section configurations from venue package for easy lookup
  const sectionConfigMap = new Map();
  if (venuePackageConfig?.menuSections) {
    venuePackageConfig.menuSections.forEach((menuSection: any) => {
      sectionConfigMap.set(menuSection.sectionName, menuSection);
    });
  }

  pkg.sections.forEach((section: any) => {
    const sectionConfig = sectionConfigMap.get(section.sectionName);
    const maxSelectable = section.maxSelectable || sectionConfig?.maxSelectable;
    const defaultPrice = section.defaultPrice ?? sectionConfig?.defaultPrice ?? 0;
    const selectionType = section.selectionType;

    let sectionTotal = 0;

    if (selectionType === "limit" && maxSelectable && section.items.length > 0) {
      // For sections with selection limits:
      // - First 'maxSelectable' items are included at defaultPrice
      // - Additional items add their pricePerPerson to the section total

      // Base price for included items
      sectionTotal = defaultPrice;

      // Add price for extra items beyond the limit
      if (section.items.length > maxSelectable) {
        const extraItems = section.items.slice(maxSelectable);
        const extraItemsPrice = extraItems.reduce(
          (sum: number, item: any) => sum + (item.pricePerPerson || 0),
          0
        );
        sectionTotal += extraItemsPrice;
      }
    } else if (selectionType === "all_included") {
      // For all_included sections, typically use defaultPrice regardless of items
      sectionTotal = defaultPrice;
    } else {
      // For "free" or sections without limits, sum all item prices
      sectionTotal = section.items.reduce(
        (sum: number, item: any) => sum + (item.pricePerPerson || 0),
        0
      );
    }

    section.sectionTotalPerPerson = sectionTotal;
    sectionTotals += sectionTotal;
  });

  // Total price = base package price + all section totals
  pkg.totalPricePerPerson = basePackagePrice + sectionTotals;

  return pkg;
}
export function calculateFoodCost(foodPackage: any, guests: number) {
  const foodPerPerson = foodPackage.totalPricePerPerson;
  return foodPerPerson * guests;
}

export function calculateTotals({
  foodPackage,
  numberOfGuests,
  services = [],
}: {
  foodPackage: any;
  numberOfGuests: number;
  services?: any[];
}) {
  const foodCostTotal = foodPackage.totalPricePerPerson * numberOfGuests;
  const servicesTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);

  return {
    foodCostTotal,
    servicesTotal,
    totalAmount: foodCostTotal + servicesTotal,
  };
}

/**
 * Validate food package sections against venue package configuration
 * Checks if selected items exceed maxSelectable limits
 *
 * @param foodPackage - The food package from lead/booking
 * @param venuePackageConfig - Venue's food package configuration
 * @returns Object with isValid flag and array of validation errors
 */
export function validateFoodPackageLimits(
  foodPackage: any,
  venuePackageConfig: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!foodPackage?.sections || !venuePackageConfig?.menuSections) {
    return { isValid: true, errors: [] };
  }

  // Create a map of section configurations from venue package
  const sectionConfigMap = new Map();
  venuePackageConfig.menuSections.forEach((menuSection: any) => {
    sectionConfigMap.set(menuSection.sectionName, menuSection);
  });

  foodPackage.sections.forEach((section: any) => {
    const sectionConfig = sectionConfigMap.get(section.sectionName);

    if (!sectionConfig) {
      errors.push(
        `Section "${section.sectionName}" is not available in package "${venuePackageConfig.name}"`
      );
      return;
    }

    // Check maxSelectable limit for "limit" type sections
    if (section.selectionType === "limit" && sectionConfig.maxSelectable) {
      if (section.items.length > sectionConfig.maxSelectable) {
        errors.push(
          `Section "${section.sectionName}" allows maximum ${sectionConfig.maxSelectable} item(s), but ${section.items.length} were selected`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate GST for food and services separately
 * 
 * @param foodCostTotal - Total cost of food package
 * @param servicesTotal - Total cost of additional services
 * @param foodGSTRate - GST rate for food (5% or 18%)
 * @param servicesGSTRate - GST rate for services (5% or 18%)
 * @returns GST calculation breakdown matching schema
 */
export function calculateGST({
  foodCostTotal,
  servicesTotal,
  foodGSTRate = 5,
  servicesGSTRate = 18,
}: {
  foodCostTotal: number;
  servicesTotal: number;
  foodGSTRate?: 5 | 18;
  servicesGSTRate?: 5 | 18;
}) {
  const foodGSTAmount = (foodCostTotal * foodGSTRate) / 100;
  const servicesGSTAmount = (servicesTotal * servicesGSTRate) / 100;

  const totalGST = foodGSTAmount + servicesGSTAmount;
  const subtotal = foodCostTotal + servicesTotal;
  const grandTotal = subtotal + totalGST;

  return {
    enabled: true,

    food: {
      rate: foodGSTRate,
      taxableAmount: Math.round(foodCostTotal * 100) / 100,
      gstAmount: Math.round(foodGSTAmount * 100) / 100,
    },

    services: {
      rate: servicesGSTRate,
      taxableAmount: Math.round(servicesTotal * 100) / 100,
      gstAmount: Math.round(servicesGSTAmount * 100) / 100,
    },

    totalGST: Math.round(totalGST * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

/**
 * Calculate totals with GST (new function - doesn't break existing calculateTotals)
 * 
 * @param foodPackage - Food package with pricing
 * @param numberOfGuests - Number of guests
 * @param services - Additional services array
 * @param foodGSTRate - GST rate for food (5% or 18%)
 * @param servicesGSTRate - GST rate for services (5% or 18%)
 * @returns Totals breakdown with GST calculation
 */
export function calculateTotalsWithGST({
  foodPackage,
  numberOfGuests,
  services = [],
  foodGSTRate = 5,
  servicesGSTRate = 18,
}: {
  foodPackage: any;
  numberOfGuests: number;
  services?: any[];
  foodGSTRate?: 5 | 18;
  servicesGSTRate?: 5 | 18;
}) {
  const foodCostTotal = foodPackage.totalPricePerPerson * numberOfGuests;
  const servicesTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);

  const gst = calculateGST({
    foodCostTotal,
    servicesTotal,
    foodGSTRate,
    servicesGSTRate,
  });

  return {
    foodCostTotal: Math.round(foodCostTotal * 100) / 100,
    servicesTotal: Math.round(servicesTotal * 100) / 100,
    gst,
  };
}
