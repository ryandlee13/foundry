"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authStorage from "@/lib/auth/storage";
import type { Account } from "@/lib/auth/types";
import type { AppRole } from "@/lib/types/roles";

interface AuthContextValue {
  user: Account | null;
  /** True until the initial localStorage session lookup completes. */
  isLoading: boolean;
  signUp: (input: { name: string; email: string; role: AppRole }) => Account;
  signIn: (email: string) => Account;
  signOut: () => void;
  addRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Deliberately deferred to an effect (not a lazy useState initializer):
    // reading localStorage during the initial render would return different
    // values on the server (none) vs. the client (a real session), causing
    // a hydration mismatch. Rendering the same "loading" state on both,
    // then updating client-side after mount, is the hydration-safe pattern.
    const sessionId = authStorage.getSessionAccountId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(sessionId ? (authStorage.findAccountById(sessionId) ?? null) : null);
    setIsLoading(false);
  }, []);

  const signUp = useCallback((input: { name: string; email: string; role: AppRole }) => {
    const account = authStorage.createAccount(input);
    authStorage.setSessionAccountId(account.id);
    setUser(account);
    return account;
  }, []);

  const signIn = useCallback((email: string) => {
    const account = authStorage.findAccountByEmail(email);
    if (!account) {
      throw new Error("No account found with that email — try creating one instead.");
    }
    authStorage.setSessionAccountId(account.id);
    setUser(account);
    return account;
  }, []);

  const signOut = useCallback(() => {
    authStorage.setSessionAccountId(null);
    setUser(null);
  }, []);

  const addRole = useCallback((role: AppRole) => {
    setUser((current) => {
      if (!current) return current;
      return authStorage.addRoleToAccount(current.id, role) ?? current;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut, addRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
