import { describe, expect, it } from "vitest";
import { SECTION_PRESETS, createSectionPreset } from "./presets.js";

describe("section presets", () => {
  it("defines hero nav footer form", () => {
    expect(SECTION_PRESETS.map((p) => p.id)).toEqual(["hero", "nav", "footer", "form"]);
  });

  it("builds non-empty trees", () => {
    for (const preset of SECTION_PRESETS) {
      const node = createSectionPreset(preset.id);
      expect(node.children.length).toBeGreaterThan(0);
      expect(node.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });
});
