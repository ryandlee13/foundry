import { describe, expect, it } from "vitest";
import { getAddableRoles, resolveActiveRole } from "../activeRole";

describe("resolveActiveRole", () => {
  it("returns null when the account holds no roles", () => {
    expect(resolveActiveRole([], "organizer")).toBeNull();
  });

  it("honors a stored role the account still holds", () => {
    expect(resolveActiveRole(["organizer", "vendor"], "vendor")).toBe("vendor");
  });

  it("falls back when the stored role was removed from the account", () => {
    expect(resolveActiveRole(["venue_operator"], "vendor")).toBe("venue_operator");
  });

  it("ignores an unparseable stored value", () => {
    expect(resolveActiveRole(["vendor"], "not-a-role")).toBe("vendor");
  });

  it("prefers organizer over other roles when nothing is stored", () => {
    expect(resolveActiveRole(["vendor", "venue_operator", "organizer"], null)).toBe("organizer");
  });

  it("never auto-selects admin when a usable role exists", () => {
    expect(resolveActiveRole(["admin", "vendor"], null)).toBe("vendor");
  });

  it("falls back to admin only when it is the sole role", () => {
    expect(resolveActiveRole(["admin"], null)).toBe("admin");
  });
});

describe("getAddableRoles", () => {
  it("offers the roles the account doesn't hold yet", () => {
    expect(getAddableRoles(["organizer"])).toEqual(["venue_operator", "vendor"]);
  });

  it("never offers admin, which is granted manually", () => {
    expect(getAddableRoles([])).not.toContain("admin");
  });

  it("returns nothing once all self-serve roles are held", () => {
    expect(getAddableRoles(["organizer", "venue_operator", "vendor"])).toEqual([]);
  });
});
