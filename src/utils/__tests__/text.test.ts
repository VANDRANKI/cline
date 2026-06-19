import { describe, it, expect } from "vitest";
import { truncate, approximateTokenCount, escapeRegex } from "../text";

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    const result = truncate("hello world", 8);
    expect(result).toBe("hello w…");
    expect(result.length).toBe(8);
  });

  it("uses custom ellipsis", () => {
    expect(truncate("hello world", 8, "...")).toBe("hello...");
  });
});

describe("approximateTokenCount", () => {
  it("returns 0 for empty string", () => {
    expect(approximateTokenCount("")).toBe(0);
  });

  it("returns ceiling of length divided by 4", () => {
    expect(approximateTokenCount("abcde")).toBe(2);
  });
});

describe("escapeRegex", () => {
  it("escapes dots and asterisks", () => {
    expect(escapeRegex("1.0*")).toBe("1\\.0\\*");
  });

  it("escapes parentheses", () => {
    expect(escapeRegex("(test)")).toBe("\\(test\\)");
  });
});
