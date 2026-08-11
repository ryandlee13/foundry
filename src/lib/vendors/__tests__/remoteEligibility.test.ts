import { describe, expect, it } from "vitest";
import { canOfferRemoteOnly, getRemoteBlockingSkillNames, reconcileRemoteOnly } from "../remoteEligibility";

describe("canOfferRemoteOnly", () => {
  it("allows remote-only when every skill is remote-eligible", () => {
    expect(canOfferRemoteOnly(["graphic_designer", "content_creator"])).toBe(true);
  });

  it("blocks remote-only when any skill is not remote-eligible", () => {
    expect(canOfferRemoteOnly(["dj", "graphic_designer"])).toBe(false);
  });

  it("blocks remote-only for an on-site-only skill like DJ", () => {
    expect(canOfferRemoteOnly(["dj"])).toBe(false);
  });

  it("blocks remote-only when no skills are selected", () => {
    expect(canOfferRemoteOnly([])).toBe(false);
  });
});

describe("getRemoteBlockingSkillNames", () => {
  it("returns names of skills that block remote-only", () => {
    expect(getRemoteBlockingSkillNames(["dj", "graphic_designer", "bartender"]).sort()).toEqual(["Bartender", "DJ"]);
  });

  it("returns an empty array when nothing blocks", () => {
    expect(getRemoteBlockingSkillNames(["graphic_designer"])).toEqual([]);
  });
});

describe("reconcileRemoteOnly", () => {
  it("keeps remoteOnly true when it's still valid", () => {
    expect(reconcileRemoteOnly(["graphic_designer"], true)).toBe(true);
  });

  it("turns remoteOnly off when a non-eligible skill is added", () => {
    expect(reconcileRemoteOnly(["graphic_designer", "dj"], true)).toBe(false);
  });

  it("leaves remoteOnly false untouched", () => {
    expect(reconcileRemoteOnly(["dj"], false)).toBe(false);
  });
});
