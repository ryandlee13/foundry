import type { AppRole } from "@/lib/types/roles";
import type { Account } from "./types";

/**
 * Browser-local "accounts" — a prototype stand-in for real Supabase Auth.
 * Nothing here is secure: no password is ever persisted, there is no server
 * to verify anything against, and data lives only in this browser (cleared
 * by clearing site data, never synced across devices). This exists so the
 * venue-listing and booking flows have a real account/ownership concept to
 * build against ahead of Phase 1 (database) + Phase 2 (auth) landing for
 * real. See docs/IMPLEMENTATION_PLAN.md for the migration path.
 */

const ACCOUNTS_KEY = "foundry.auth.accounts";
const SESSION_KEY = "foundry.auth.sessionAccountId";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccounts(): Account[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function findAccountByEmail(email: string): Account | undefined {
  const normalized = email.trim().toLowerCase();
  return getAccounts().find((account) => account.email.toLowerCase() === normalized);
}

export function findAccountById(id: string): Account | undefined {
  return getAccounts().find((account) => account.id === id);
}

export function createAccount(input: {
  name: string;
  email: string;
  role: AppRole;
}): Account {
  if (findAccountByEmail(input.email)) {
    throw new Error("An account with this email already exists.");
  }

  const account: Account = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    roles: [input.role],
    createdAt: new Date().toISOString(),
  };

  saveAccounts([...getAccounts(), account]);
  return account;
}

export function addRoleToAccount(accountId: string, role: AppRole): Account | undefined {
  const accounts = getAccounts();
  const index = accounts.findIndex((account) => account.id === accountId);
  if (index === -1) return undefined;

  if (accounts[index].roles.includes(role)) return accounts[index];

  const updated: Account = { ...accounts[index], roles: [...accounts[index].roles, role] };
  const next = [...accounts];
  next[index] = updated;
  saveAccounts(next);
  return updated;
}

export function getSessionAccountId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSessionAccountId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) {
    window.localStorage.setItem(SESSION_KEY, id);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}
