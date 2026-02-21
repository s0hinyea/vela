/**
 * useAuth — Supabase auth state hook.
 * Provides user, session, loading state, and auth actions.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createProfile: (caregiverName: string, caregiverPin: string, seniorName?: string) => Promise<{ error: string | null }>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, user: null };
    return { error: null, user: data.user };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const createProfile = useCallback(
    async (caregiverName: string, caregiverPin: string, seniorName?: string) => {
      if (!user) return { error: "Not authenticated" };

      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        caregiver_name: caregiverName,
        caregiver_pin: caregiverPin,
        senior_name: seniorName ?? null,
      });

      if (error) return { error: error.message };
      return { error: null };
    },
    [user]
  );

  return { user, session, loading, signUp, signIn, signOut, createProfile };
}
