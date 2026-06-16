import { describe, it, expect } from "vitest";
import { formatDuration } from "./duration";

describe("formatDuration", () => {
  it("formats milliseconds as HH:MM:SS", () => {
    expect(formatDuration(95_000)).toBe("00:01:35");
  });

  it("pads single-digit components with zeros", () => {
    expect(formatDuration(3_661_000)).toBe("01:01:01");
  });

  it("truncates sub-second precision", () => {
    expect(formatDuration(1_999)).toBe("00:00:01");
  });

  it("treats negative values as zero", () => {
    expect(formatDuration(-1_000)).toBe("00:00:00");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });
});
