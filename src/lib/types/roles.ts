/**
 * Mirrors the `app_role` enum proposed in docs/DATABASE.md (`profile_roles.role`).
 * A single account may hold more than one of these roles at once.
 */
export type AppRole = "organizer" | "venue_operator" | "vendor" | "admin";

export const APP_ROLES: readonly AppRole[] = [
  "organizer",
  "venue_operator",
  "vendor",
  "admin",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  organizer: "Organizer",
  venue_operator: "Venue Operator",
  vendor: "Vendor",
  admin: "Admin",
};
