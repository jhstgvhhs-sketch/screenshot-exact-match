import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Ctx = { user: User | null; isAdmin: boolean; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let identity: string | null | undefined;
    const load = async (u: User | null, expected: number) => {
      if (!active || expected !== revision) return;
      let authorized = false;
      try {
        if (u) {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id)
            .eq("role", "admin")
            .maybeSingle();
          authorized = !error && !!data;
        }
      } catch {
        authorized = false;
      }
      if (!active || expected !== revision) return;
      setIsAdmin(authorized);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        const expected = ++revision;
        const nextUser = event === "SIGNED_OUT" ? null : (session?.user ?? null);
        const nextIdentity = nextUser?.id ?? null;
        // Repeated sign-in/refresh events for the same account must not unmount forms.
        // Still check the role on the server; clear privileges immediately on account changes.
        if (identity !== nextIdentity) {
          setIsAdmin(false);
          setLoading(true);
        }
        identity = nextIdentity;
        setUser(nextUser);
        setTimeout(() => void load(nextUser, expected), 0);
      }
    });
    return () => {
      active = false;
      revision++;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthCtx.Provider value={{ user, isAdmin, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
