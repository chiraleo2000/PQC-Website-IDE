import { describe, expect, it } from "vitest";
import { asPropString, asRequiredId } from "./propString";

describe("propString", () => {
  it("asPropString returns strings or fallback", () => {
    expect(asPropString("ok")).toBe("ok");
    expect(asPropString(42, "fb")).toBe("fb");
    expect(asPropString(undefined)).toBe("");
  });

  it("asRequiredId accepts non-empty strings only", () => {
    expect(asRequiredId("id-1")).toBe("id-1");
    expect(asRequiredId("")).toBeNull();
    expect(asRequiredId(null)).toBeNull();
    expect(asRequiredId(3)).toBeNull();
  });
});
