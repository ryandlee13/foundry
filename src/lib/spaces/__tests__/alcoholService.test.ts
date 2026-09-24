import { describe, expect, it } from "vitest";
import { describeAlcoholService } from "../alcoholService";
import type { AmenityKey } from "@/lib/types/spaces";

function describe_(alcoholAllowed: boolean, amenities: AmenityKey[]) {
  return describeAlcoholService({ rules: { alcoholAllowed }, amenities });
}

describe("describeAlcoholService", () => {
  it("says so plainly when alcohol isn't permitted", () => {
    expect(describe_(false, ["bar", "bartenders_available"]).label).toBe("No alcohol permitted");
  });

  it("tells a planner they don't need bartenders when the venue provides them", () => {
    const service = describe_(true, ["bar", "bartenders_available"]);
    expect(service.label).toBe("Bar on site, bartenders provided (21+)");
    expect(service.detail).toContain("don't need to hire bartenders");
  });

  it("flags a bar with no staff as a bartender you still have to hire", () => {
    const service = describe_(true, ["bar"]);
    expect(service.label).toContain("bring your own bartender");
    expect(service.detail).toContain("hire bartenders");
  });

  it("distinguishes BYOB-with-staff from BYOB-with-nothing", () => {
    expect(describe_(true, ["bartenders_available"]).label).toBe("BYOB, bartenders provided (21+)");
    expect(describe_(true, []).label).toBe("BYOB, no bar on site (21+)");
  });

  it("never says only 'alcohol allowed' — every permitted case names the setup", () => {
    for (const amenities of [[], ["bar"], ["bartenders_available"], ["bar", "bartenders_available"]]) {
      const { label } = describe_(true, amenities as AmenityKey[]);
      expect(label).toMatch(/BYOB|Bar on site/);
    }
  });
});
