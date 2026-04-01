import { describe, it, expect } from "vitest";
import { calculateRentalFee, calculatePlatformSplit } from "@/lib/validation";

describe("calculateRentalFee", () => {
  it("calculates daily pricing", () => {
    expect(calculateRentalFee(3, 10, null)).toBe(30);
    expect(calculateRentalFee(1, 25, null)).toBe(25);
    expect(calculateRentalFee(7, 15, null)).toBe(105);
  });

  it("calculates weekly pricing with ceiling", () => {
    // 10 days = ceil(10/7) = 2 weeks
    expect(calculateRentalFee(10, null, 50)).toBe(100);
    // 7 days = ceil(7/7) = 1 week
    expect(calculateRentalFee(7, null, 50)).toBe(50);
    // 8 days = ceil(8/7) = 2 weeks
    expect(calculateRentalFee(8, null, 50)).toBe(100);
    // 1 day = ceil(1/7) = 1 week
    expect(calculateRentalFee(1, null, 50)).toBe(50);
  });

  it("prefers daily pricing when both are set", () => {
    expect(calculateRentalFee(7, 10, 50)).toBe(70); // 7 * 10, not 1 * 50
  });

  it("returns zero when no pricing is set", () => {
    expect(calculateRentalFee(5, null, null)).toBe(0);
  });

  it("handles fractional prices", () => {
    expect(calculateRentalFee(3, 9.99, null)).toBeCloseTo(29.97);
  });
});

describe("calculatePlatformSplit", () => {
  it("calculates 90/10 split correctly", () => {
    const result = calculatePlatformSplit(110, 10);
    expect(result.rentalFee).toBe(100);
    expect(result.platformFee).toBe(10);
    expect(result.ownerPayout).toBe(90);
  });

  it("handles zero deposit", () => {
    const result = calculatePlatformSplit(50, 0);
    expect(result.rentalFee).toBe(50);
    expect(result.platformFee).toBe(5);
    expect(result.ownerPayout).toBe(45);
  });

  it("rounds platform fee to cents", () => {
    const result = calculatePlatformSplit(33, 3);
    expect(result.rentalFee).toBe(30);
    expect(result.platformFee).toBe(3);
    expect(result.ownerPayout).toBe(27);
  });

  it("handles odd amounts with proper rounding", () => {
    // $17 rental fee → 10% = $1.70
    const result = calculatePlatformSplit(17, 0);
    expect(result.platformFee).toBe(1.7);
    expect(result.ownerPayout).toBe(15.3);
  });

  it("parts always sum to rental fee", () => {
    const amounts = [100, 49.99, 33, 77.77, 1];
    for (const total of amounts) {
      const result = calculatePlatformSplit(total, 0);
      expect(result.platformFee + result.ownerPayout).toBeCloseTo(result.rentalFee);
    }
  });
});
