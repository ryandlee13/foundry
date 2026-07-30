import type { AppRole } from "@/lib/types/roles";

export interface Account {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
  createdAt: string;
}
