import { describe, it, expect } from "vitest";
import { tokenizeSearchQuery } from "@/lib/search-utils";

describe("tokenizeSearchQuery", () => {
  it("tokenizes normal search terms", () => {
    expect(tokenizeSearchQuery("power drill")).toEqual(['"power"*', '"drill"*']);
  });

  it("handles single word", () => {
    expect(tokenizeSearchQuery("camera")).toEqual(['"camera"*']);
  });

  it("strips special characters", () => {
    expect(tokenizeSearchQuery("pow'er <drill>")).toEqual(['"power"*', '"drill"*']);
    expect(tokenizeSearchQuery('test"injection')).toEqual(['"testinjection"*']);
  });

  it("strips FTS5 operators", () => {
    expect(tokenizeSearchQuery("power + drill")).toEqual(['"power"*', '"drill"*']);
    expect(tokenizeSearchQuery("NOT drill")).toEqual(['"NOT"*', '"drill"*']);
    expect(tokenizeSearchQuery("a:b")).toEqual(['"ab"*']);
  });

  it("filters out pure special character tokens", () => {
    expect(tokenizeSearchQuery("+++")).toEqual([]);
    expect(tokenizeSearchQuery("power +++ drill")).toEqual(['"power"*', '"drill"*']);
  });

  it("returns empty for empty/whitespace input", () => {
    expect(tokenizeSearchQuery("")).toEqual([]);
    expect(tokenizeSearchQuery("   ")).toEqual([]);
  });

  it("handles multiple spaces between words", () => {
    expect(tokenizeSearchQuery("power    drill")).toEqual(['"power"*', '"drill"*']);
  });
});
