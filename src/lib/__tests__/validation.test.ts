import { describe, it, expect } from "vitest";
import {
  parsePositiveNumber,
  parseNonNegativeNumberOrNull,
  parseIntegerInRange,
  parseEnum,
  escapeHtml,
  REPORT_REASONS,
} from "@/lib/validation";

describe("parsePositiveNumber", () => {
  it("parses valid positive numbers", () => {
    expect(parsePositiveNumber("50", "test")).toBe(50);
    expect(parsePositiveNumber("0.5", "test")).toBe(0.5);
    expect(parsePositiveNumber(100, "test")).toBe(100);
  });

  it("rejects zero", () => {
    expect(() => parsePositiveNumber("0", "Price")).toThrow("greater than zero");
  });

  it("rejects negative numbers", () => {
    expect(() => parsePositiveNumber("-1", "Price")).toThrow("greater than zero");
  });

  it("rejects NaN", () => {
    expect(() => parsePositiveNumber("abc", "Price")).toThrow("valid number");
    expect(() => parsePositiveNumber(NaN, "Price")).toThrow("valid number");
  });

  it("rejects empty string (coerces to 0)", () => {
    expect(() => parsePositiveNumber("", "Price")).toThrow("greater than zero");
  });

  it("rejects Infinity", () => {
    expect(() => parsePositiveNumber("Infinity", "Price")).toThrow("valid number");
    expect(() => parsePositiveNumber(Infinity, "Price")).toThrow("valid number");
  });

  it("enforces max limit", () => {
    expect(parsePositiveNumber("999999", "Price", 1_000_000)).toBe(999999);
    expect(() => parsePositiveNumber("1000001", "Price", 1_000_000)).toThrow(
      "must not exceed"
    );
  });
});

describe("parseNonNegativeNumberOrNull", () => {
  it("returns null for falsy values", () => {
    expect(parseNonNegativeNumberOrNull("", "test")).toBeNull();
    expect(parseNonNegativeNumberOrNull(null, "test")).toBeNull();
    expect(parseNonNegativeNumberOrNull(undefined, "test")).toBeNull();
  });

  it("allows zero", () => {
    expect(parseNonNegativeNumberOrNull("0", "test")).toBe(0);
  });

  it("parses valid numbers", () => {
    expect(parseNonNegativeNumberOrNull("100", "test")).toBe(100);
    expect(parseNonNegativeNumberOrNull("0.99", "test")).toBe(0.99);
  });

  it("rejects negative numbers", () => {
    expect(() => parseNonNegativeNumberOrNull("-1", "Deposit")).toThrow("cannot be negative");
  });

  it("rejects NaN and Infinity", () => {
    expect(() => parseNonNegativeNumberOrNull("abc", "Deposit")).toThrow("valid number");
    expect(() => parseNonNegativeNumberOrNull("Infinity", "Deposit")).toThrow("valid number");
  });

  it("enforces max limit", () => {
    expect(() => parseNonNegativeNumberOrNull("2000000", "Deposit", 1_000_000)).toThrow(
      "must not exceed"
    );
  });
});

describe("parseIntegerInRange", () => {
  it("parses valid integers in range", () => {
    expect(parseIntegerInRange("3", 1, 5, "Rating")).toBe(3);
    expect(parseIntegerInRange("1", 1, 5, "Rating")).toBe(1);
    expect(parseIntegerInRange("5", 1, 5, "Rating")).toBe(5);
  });

  it("rejects non-integers", () => {
    expect(() => parseIntegerInRange("1.5", 1, 5, "Rating")).toThrow("whole number");
    expect(() => parseIntegerInRange("2.9", 1, 5, "Rating")).toThrow("whole number");
  });

  it("rejects out of range", () => {
    expect(() => parseIntegerInRange("0", 1, 5, "Rating")).toThrow("between 1 and 5");
    expect(() => parseIntegerInRange("6", 1, 5, "Rating")).toThrow("between 1 and 5");
  });

  it("rejects non-numeric input", () => {
    expect(() => parseIntegerInRange("abc", 1, 5, "Rating")).toThrow("whole number");
  });
});

describe("parseEnum", () => {
  it("accepts valid enum values", () => {
    expect(parseEnum("spam", REPORT_REASONS, "reason")).toBe("spam");
    expect(parseEnum("scam", REPORT_REASONS, "reason")).toBe("scam");
    expect(parseEnum("other", REPORT_REASONS, "reason")).toBe("other");
  });

  it("rejects invalid values", () => {
    expect(() => parseEnum("invalid", REPORT_REASONS, "reason")).toThrow("Invalid reason");
    expect(() => parseEnum("", REPORT_REASONS, "reason")).toThrow("Invalid reason");
    expect(() => parseEnum("123", REPORT_REASONS, "reason")).toThrow("Invalid reason");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes quotes and ampersands", () => {
    expect(escapeHtml('"hello" & \'world\'')).toBe(
      "&quot;hello&quot; &amp; &#39;world&#39;"
    );
  });

  it("passes clean strings through unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });
});
