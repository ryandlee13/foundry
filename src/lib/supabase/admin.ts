import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * SECURITY: only import this from server-only code paths that have already
 * performed their own explicit authorization check (e.g. admin approval
 * actions, signed-URL generation, cross-row transactional writes). Never
 * import this file from a Client Component. The `server-only` import above
 * turns an accidental client bundle into a build error.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. See .env.example."
    );
  }

  return createSupabaseClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
