// Shared validation helpers for input sanitization and security

export const REPORT_REASONS = [
  "spam",
  "prohibited_item",
  "misleading",
  "scam",
  "duplicate",
  "other",
] as const;

export const DISPUTE_REASONS = [
  "deposit_not_returned",
  "false_damage_claim",
  "item_not_as_described",
  "other",
] as const;

export const RENTAL_PHOTO_TYPES = ["check_in", "check_out"] as const;

export const LISTING_CONDITIONS = [
  "new",
  "like_new",
  "excellent",
  "good",
  "fair",
  "well_worn",
] as const;

export const REVIEW_ROLES = ["renter", "owner"] as const;

export const MAX_PRICE = 1_000_000;

export function parsePositiveNumber(
  value: unknown,
  fieldName: string,
  maxLimit?: number
): number {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  if (maxLimit !== undefined && num > maxLimit) {
    throw new Error(`${fieldName} must not exceed ${maxLimit}`);
  }
  return num;
}

export function parseNonNegativeNumberOrNull(
  value: unknown,
  fieldName: string,
  maxLimit?: number
): number | null {
  if (!value || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  if (maxLimit !== undefined && num > maxLimit) {
    throw new Error(`${fieldName} must not exceed ${maxLimit}`);
  }
  return num;
}

export function parseIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): number {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num) || !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be a whole number`);
  }
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

export function parseEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T {
  const str = String(value);
  if (!allowedValues.includes(str as T)) {
    throw new Error(
      `Invalid ${fieldName}. Allowed values: ${allowedValues.join(", ")}`
    );
  }
  return str as T;
}

export function calculateRentalFee(
  days: number,
  pricePerDay: number | null,
  pricePerWeek: number | null
): number {
  if (pricePerDay) {
    return pricePerDay * days;
  } else if (pricePerWeek) {
    return pricePerWeek * Math.ceil(days / 7);
  }
  return 0;
}

export function calculatePlatformSplit(
  totalPrice: number,
  depositAmount: number
): { rentalFee: number; platformFee: number; ownerPayout: number } {
  const rentalFee = totalPrice - depositAmount;
  const platformFee = Math.round(rentalFee * 0.10 * 100) / 100;
  const ownerPayout = rentalFee - platformFee;
  return { rentalFee, platformFee, ownerPayout };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
